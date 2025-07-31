import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  onSnapshot, // Import onSnapshot
} from "firebase/firestore"
import { db } from "./firebase"

// Helper to create notifications
export const createNotification = async (notificationData: {
  userId: string
  message: string
  type: string
  relatedEntityId?: string
}) => {
  try {
    console.log("createNotification: Attempting to create notification with data:", notificationData)
    const docRef = await addDoc(collection(db, "notifications"), {
      ...notificationData,
      read: false,
      timestamp: Timestamp.now(),
    })
    console.log("createNotification: Notification created successfully with ID:", docRef.id)
    return { success: true }
  } catch (error) {
    console.error("createNotification: Error creating notification:", error)
    return { success: false, error }
  }
}

// User operations
export const createUser = async (
  userId: string,
  userData: {
    name: string
    firstName: string
    lastName: string
    email: string
    location?: string
    bio?: string
    skillsOffered: string[]
    skillsWanted: string[]
    avatar?: string
  },
) => {
  try {
    // Use setDoc with the user's UID as the document ID
    await setDoc(doc(db, "users", userId), {
      ...userData,
      rating: 0,
      completedSwaps: 0,
      isPublic: true,
      status: "active",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    })
    return { success: true, id: userId }
  } catch (error) {
    console.error("Error creating user:", error)
    return { success: false, error }
  }
}

export const getUsers = async (skillFilter?: string) => {
  try {
    const q = query(
      collection(db, "users"),
      where("isPublic", "==", true),
      where("status", "==", "active"),
      orderBy("createdAt", "desc"),
      limit(50),
    )

    const querySnapshot = await getDocs(q)
    let users = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(), // Corrected toDate() call
    }))

    // Filter by skill if provided (client-side filtering for array-contains)
    if (skillFilter) {
      users = users.filter((user: any) =>
        user.skillsOffered?.some((skill: string) => skill.toLowerCase().includes(skillFilter.toLowerCase())),
      )
    }

    return { success: true, users }
  } catch (error) {
    console.error("Error getting users:", error)
    // Return mock data if Firestore fails
    const mockUsers = [
      {
        id: "1",
        name: "Alice Johnson",
        email: "alice@example.com",
        location: "San Francisco, CA",
        avatar: "/placeholder.svg?height=40&width=40",
        skillsOffered: ["React", "JavaScript", "UI/UX Design"],
        skillsWanted: ["Python", "Machine Learning"],
        rating: 4.8,
        completedSwaps: 12,
        isPublic: true,
      },
      {
        id: "2",
        name: "Bob Smith",
        email: "bob@example.com",
        location: "New York, NY",
        avatar: "/placeholder.svg?height=40&width=40",
        skillsOffered: ["Python", "Data Science", "Machine Learning"],
        skillsWanted: ["React", "Frontend Development"],
        rating: 4.9,
        completedSwaps: 8,
        isPublic: true,
      },
    ]

    let users = mockUsers
    if (skillFilter) {
      users = users.filter((user) =>
        user.skillsOffered.some((skill) => skill.toLowerCase().includes(skillFilter.toLowerCase())),
      )
    }

    return { success: true, users }
  }
}

export const getUserById = async (userId: string) => {
  console.log(`getUserById: Attempting to fetch user with ID: ${userId}`)
  try {
    const docRef = doc(db, "users", userId)
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
      const data = docSnap.data()
      console.log(`getUserById: User ${userId} found.`)
      return {
        success: true,
        user: {
          id: docSnap.id,
          name: data.name || "", // Ensure name is always a string
          firstName: data.firstName || "",
          lastName: data.lastName || "",
          email: data.email || "",
          location: data.location || "",
          bio: data.bio || "",
          skillsOffered: data.skillsOffered || [], // Ensure arrays are initialized
          skillsWanted: data.skillsWanted || [],
          avatar: data.avatar || "",
          rating: data.rating || 0,
          completedSwaps: data.completedSwaps || 0,
          isPublic: data.isPublic !== undefined ? data.isPublic : true,
          status: data.status || "active",
          createdAt: data.createdAt?.toDate() || new Date(), // FIX: Call toDate() correctly
          updatedAt: data.updatedAt?.toDate() || new Date(),
        },
      }
    } else {
      console.warn(`getUserById: User with ID ${userId} not found in Firestore.`)
      return { success: false, error: "User not found" }
    }
  } catch (error) {
    console.error(`getUserById: Error getting user ${userId}:`, error)
    return { success: false, error }
  }
}

export const updateUser = async (userId: string, userData: any) => {
  try {
    const docRef = doc(db, "users", userId)
    await updateDoc(docRef, {
      ...userData,
      updatedAt: Timestamp.now(),
    })
    return { success: true }
  } catch (error) {
    console.error("Error updating user:", error)
    return { success: false, error }
  }
}

// Swap request operations
export const createSwapRequest = async (requestData: {
  fromUserId: string
  toUserId: string
  skillWanted: string
  message: string
}) => {
  try {
    const docRef = await addDoc(collection(db, "swapRequests"), {
      ...requestData,
      status: "pending",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    })

    // Fetch sender and receiver names for notification
    const fromUserRes = await getUserById(requestData.fromUserId)
    const toUserRes = await getUserById(requestData.toUserId)

    if (fromUserRes.success && toUserRes.success) {
      await createNotification({
        userId: requestData.toUserId,
        message: `${fromUserRes.user?.name || "Someone"} sent you a new skill swap request!`,
        type: "swap_request",
        relatedEntityId: docRef.id,
      })
    }

    return { success: true, id: docRef.id }
  } catch (error) {
    console.error("Error creating swap request:", error)
    return { success: false, error }
  }
}

export const getSwapRequestsRealtime = (
  userId: string,
  callback: (data: { received: any[]; sent: any[]; completed: any[] }) => void,
) => {
  if (!userId) {
    console.log("getSwapRequestsRealtime: No userId provided, returning empty data.")
    callback({ received: [], sent: [], completed: [] })
    return () => {} // Return a no-op unsubscribe
  }

  console.log(`getSwapRequestsRealtime: Setting up listeners for userId: ${userId}`)

  const receivedQuery = query(
    collection(db, "swapRequests"),
    where("toUserId", "==", userId),
    orderBy("createdAt", "desc"),
  )

  const sentQuery = query(
    collection(db, "swapRequests"),
    where("fromUserId", "==", userId),
    orderBy("createdAt", "desc"),
  )

  const unsubscribes: (() => void)[] = []
  let receivedRequests: any[] = []
  let sentRequests: any[] = []
  let receivedLoaded = false
  let sentLoaded = false

  const updateCombinedRequests = async () => {
    if (receivedLoaded && sentLoaded) {
      console.log("updateCombinedRequests: Both received and sent snapshots loaded. Processing...")
      const allRequests = [...receivedRequests, ...sentRequests]
      console.log("updateCombinedRequests: All raw requests combined:", allRequests.length, "documents")
      console.log("updateCombinedRequests: All raw requests combined:", allRequests)

      const userIdsToFetch = new Set<string>()
      allRequests.forEach((req) => {
        userIdsToFetch.add(req.fromUserId)
        userIdsToFetch.add(req.toUserId)
      })

      console.log("updateCombinedRequests: Fetching user profiles for IDs:", Array.from(userIdsToFetch))
      const userPromises = Array.from(userIdsToFetch).map((id) => getUserById(id))
      const userResults = await Promise.all(userPromises)
      const usersMap = new Map<string, any>()
      userResults.forEach((res) => {
        if (res.success) {
          if (res.user) {
            usersMap.set(res.user.id, res.user)
          }
        } else {
          console.warn(`updateCombinedRequests: Failed to fetch user profile for ID: ${res.error}`)
        }
      })
      console.log("updateCombinedRequests: Fetched users map:", usersMap)

      const enrichedRequests = allRequests.map((req) => {
        const fromUser = usersMap.get(req.fromUserId)
        const toUser = usersMap.get(req.toUserId)
        return {
          id: req.id, // Ensure ID is always present
          ...req,
          from: fromUser,
          to: toUser,
        }
      })
      console.log("updateCombinedRequests: Enriched requests:", enrichedRequests.length, "documents")
      console.log("updateCombinedRequests: Enriched requests before filtering:", enrichedRequests)

      const received = enrichedRequests.filter((req: any) => req.toUserId === userId && req.status === "pending")
      console.log("updateCombinedRequests: Filtered received requests:", received)
      const sent = enrichedRequests.filter(
        (req: any) => req.fromUserId === userId && (req.status === "pending" || req.status === "accepted"),
      )
      console.log("updateCombinedRequests: Filtered sent requests:", sent)
      // FIX: Ensure completed requests are also filtered by the current user's involvement
      const completed = enrichedRequests
        .filter((req: any) => (req.fromUserId === userId || req.toUserId === userId) && req.status === "completed")
        .map((req: any) => {
          const partner = req.fromUserId === userId ? req.to : req.from
          console.log(`getSwapRequestsRealtime: Completed request ${req.id} has chatId: ${req.chatId}`) // NEW LOG
          return {
            ...req,
            partner: partner,
            skillExchanged: `${req.skillWanted} ↔ ${partner?.skillsOffered?.[0] || "N/A"}`, // Adjust as needed
            completedDate: req.updatedAt,
            rating: 0, // Placeholder, actual rating would come from feedback collection
            feedback: "No feedback yet.", // Placeholder
          }
        })

      console.log("updateCombinedRequests: Filtered completed requests:", completed)
      console.log(
        "updateCombinedRequests: Final data for callback - Received:",
        received.length,
        "Sent:",
        sent.length,
        "Completed:",
        completed.length,
      )
      callback({
        received: received,
        sent: sent,
        completed: completed,
      })
    } else {
      console.log("updateCombinedRequests: Waiting for both received and sent snapshots to load.")
    }
  }

  const unsubscribeReceived = onSnapshot(
    receivedQuery,
    async (snapshot) => {
      console.log("onSnapshot (received): Received snapshot with", snapshot.docs.length, "documents.")
      receivedRequests = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(), // Corrected toDate() call
        updatedAt: doc.data().updatedAt?.toDate() || new Date(), // Corrected toDate() call
      }))
      console.log("onSnapshot (received): Raw received requests:", receivedRequests)
      receivedLoaded = true
      await updateCombinedRequests()
    },
    (error) => {
      console.error("Error listening to received swap requests:", error)
      callback({ received: [], sent: [], completed: [] }) // Provide empty arrays on error
    },
  )
  unsubscribes.push(unsubscribeReceived)

  const unsubscribeSent = onSnapshot(
    sentQuery,
    async (snapshot) => {
      console.log("onSnapshot (sent): Received snapshot with", snapshot.docs.length, "documents.")
      sentRequests = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(), // Corrected toDate() call
        updatedAt: doc.data().updatedAt?.toDate() || new Date(), // Corrected toDate() call
      }))
      console.log("onSnapshot (sent): Raw sent requests:", sentRequests)
      sentLoaded = true
      await updateCombinedRequests()
    },
    (error) => {
      console.error("Error listening to sent swap requests:", error)
      callback({ received: [], sent: [], completed: [] }) // Provide empty arrays on error
    },
  )
  unsubscribes.push(unsubscribeSent)

  return () => {
    console.log("Unsubscribing from swap requests listeners.")
    unsubscribes.forEach((unsub) => unsub())
  }
}

export const updateSwapRequestStatus = async (requestId: string, status: string) => {
  try {
    const requestRef = doc(db, "swapRequests", requestId)
    await updateDoc(requestRef, {
      status,
      updatedAt: Timestamp.now(),
    })

    const requestSnap = await getDoc(requestRef)
    if (requestSnap.exists()) {
      const requestData = requestSnap.data()
      const fromUserRes = await getUserById(requestData.fromUserId)
      const toUserRes = await getUserById(requestData.toUserId)

      let message = ""
      let notificationRecipientId = ""

      if (status === "accepted") {
        message = `${toUserRes.user?.name || "User"} accepted your skill swap request!`
        notificationRecipientId = requestData.fromUserId // Notify the sender

        // Ensure chatId is created and stored for accepted swap requests.
        if (!requestData.chatId) {
          const chatResult = await createChat(requestId, requestData.fromUserId, requestData.toUserId)
          if (chatResult.success) {
            await updateDoc(requestRef, {
              chatId: chatResult.id,
            })
          } else {
            console.error(`Failed to create chat for accepted request ${requestId}:`, chatResult.error)
          }
        }
      } else if (status === "rejected") {
        message = `${toUserRes.user?.name || "User"} declined your skill swap request.`
        notificationRecipientId = requestData.fromUserId // Notify the sender
      } else if (status === "cancelled") {
        message = `${fromUserRes.user?.name || "User"} cancelled their skill swap request.`
        notificationRecipientId = requestData.toUserId // Notify the recipient
      } else if (status === "completed") {
        message = `Your skill swap with ${fromUserRes.user?.name || "User"} is completed!`
        notificationRecipientId = requestData.fromUserId // Notify the original sender
        console.log(
          `updateSwapRequestStatus: Request ${requestId} marked as completed. Notifying user: ${notificationRecipientId}`,
        )
        // Ensure chatId exists for completed requests
        if (!requestData.chatId) {
          console.log(`updateSwapRequestStatus: No chatId found for completed request ${requestId}. Creating chat...`)
          const chatResult = await createChat(requestId, requestData.fromUserId, requestData.toUserId)
          if (chatResult.success) {
            await updateDoc(requestRef, {
              chatId: chatResult.id,
            })
            console.log(`updateSwapRequestStatus: Chat created and chatId ${chatResult.id} stored for completed request ${requestId}.`)
          } else {
            console.error(`updateSwapRequestStatus: Failed to create chat for completed request ${requestId}:`, chatResult.error)
          }
        }
      }
      if (message && notificationRecipientId) {
        await createNotification({
          userId: notificationRecipientId,
          message,
          type: "swap_request_status",
          relatedEntityId: requestId,
        })
      } else {
        console.warn("updateSwapRequestStatus: No notification message or recipient ID generated for status:", status)
      }
    } else {
      console.warn("updateSwapRequestStatus: Request document not found for ID:", requestId)
    }
    return { success: true }
  } catch (error) {
    console.error("Error updating swap request:", error)
    return { success: false, error }
  }
}

// Feedback operations
export const createFeedback = async (feedbackData: {
  swapRequestId: string
  fromUserId: string
  toUserId: string
  rating: number
  comment: string
}) => {
  try {
    const docRef = await addDoc(collection(db, "feedback"), {
      ...feedbackData,
      createdAt: Timestamp.now(),
    })
    return { success: true, id: docRef.id }
  } catch (error) {
    console.error("Error creating feedback:", error)
    return { success: false, error }
  }
}

export const getFeedbackForUser = async (userId: string) => {
  try {
    const q = query(
      collection(db, "feedback"),
      where("toUserId", "==", userId),
      orderBy("createdAt", "desc"),
      limit(10),
    )

    const querySnapshot = await getDocs(q)
    const feedback = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(), // Corrected toDate() call
    }))

    return { success: true, feedback }
  } catch (error) {
    console.error("Error getting feedback:", error)
    return { success: false, error }
  }
}

// Report operations
export const createReport = async (reportData: {
  reporterId: string
  reportedUserId: string
  reason: string
  description: string
}) => {
  try {
    const docRef = await addDoc(collection(db, "reports"), {
      ...reportData,
      status: "pending",
      createdAt: Timestamp.now(),
    })
    return { success: true, id: docRef.id }
  } catch (error) {
    console.error("Error creating report:", error)
    return { success: false, error }
  }
}

export const getReports = async () => {
  try {
    const q = query(collection(db, "reports"), orderBy("createdAt", "desc"), limit(50))

    const querySnapshot = await getDocs(q)
    const reports = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(), // Corrected toDate() call
    }))

    return { success: true, reports }
  } catch (error) {
    console.error("Error getting reports:", error)
    return { success: false, error }
  }
}

// Admin operations
export const banUser = async (userId: string, adminId: string) => {
  try {
    // Update user status
    const userRef = doc(db, "users", userId)
    await updateDoc(userRef, {
      status: "banned",
      updatedAt: Timestamp.now(),
    })

    // Log admin action
    await addDoc(collection(db, "adminActions"), {
      adminId,
      actionType: "ban_user",
      targetId: userId,
      details: "User banned by admin",
      createdAt: Timestamp.now(),
    })

    return { success: true }
  } catch (error) {
    console.error("Error banning user:", error)
    return { success: false, error }
  }
}

// NEW: Chat operations
export const createChat = async (swapRequestId: string | null, user1Id: string, user2Id: string) => {
  try {
    // Debug: Log authentication and participants
    console.log("createChat: user1Id:", user1Id, "user2Id:", user2Id)
    if (!user1Id || !user2Id) {
      console.error("createChat: Missing user IDs. user1Id:", user1Id, "user2Id:", user2Id)
      return { success: false, error: "Missing user IDs." }
    }
    // If swapRequestId is provided, check for existing chat
    if (swapRequestId) {
      console.log(`createChat: Checking if chat already exists for swap request ${swapRequestId}`)
      const chatQuery = query(collection(db, "chats"), where("swapRequestId", "==", swapRequestId))
      const chatSnapshot = await getDocs(chatQuery)
      if (!chatSnapshot.empty) {
        console.log(`createChat: Chat already exists for swap request ${swapRequestId}. Skipping creation.`)
        return { success: true, id: chatSnapshot.docs[0].id }
      }
    } else {
      // Check if a direct chat already exists between these users
      const chatQuery = query(
        collection(db, "chats"),
        where("participants", "array-contains", user1Id),
      )
      const chatSnapshot = await getDocs(chatQuery)
      const existingChat = chatSnapshot.docs.find(doc => {
        const data = doc.data()
        return data.participants.includes(user2Id) && !data.swapRequestId
      })
      if (existingChat) {
        console.log(`createChat: Direct chat already exists between users. Returning existing chat.`)
        return { success: true, id: existingChat.id }
      }
    }
    const chatData = {
      ...(swapRequestId ? { swapRequestId } : {}),
      participants: [user1Id, user2Id],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      lastMessageAt: Timestamp.now(),
    }
    // Debug: Log chatData and authentication
    console.log("createChat: Authenticated UID:", user1Id)
    console.log("createChat: chatData:", chatData)
    const docRef = await addDoc(collection(db, "chats"), chatData)
    console.log(`createChat: Chat created successfully with ID: ${docRef.id}`)
    return { success: true, id: docRef.id }
  } catch (error) {
    console.error(`createChat: Error creating chat for swap request ${swapRequestId}:`, error)
    return { success: false, error }
  }
}

export const addMessage = async (chatId: string, senderId: string, text: string) => {
  console.log(`addMessage: Attempting to add message to chat ${chatId}. Sender: ${senderId}, Text: "${text}"`)
  try {
    const chatDocRef = doc(db, "chats", chatId)
    const chatDocSnap = await getDoc(chatDocRef)

    if (!chatDocSnap.exists()) {
      console.error(`addMessage: Chat document with ID ${chatId} does not exist.`)
      return { success: false, error: "Chat not found." }
    }

    const chatData = chatDocSnap.data()
    const participants = chatData?.participants || []
    console.log(`addMessage: Chat ${chatId} participants:`, participants)
    console.log(`addMessage: Current sender UID: ${senderId}`)

    if (!participants.includes(senderId)) {
      console.error(`addMessage: Sender ${senderId} is NOT a participant in chat ${chatId}. Permissions will fail.`)
      return { success: false, error: "Sender is not a participant in this chat." }
    }

    await addDoc(collection(db, "chats", chatId, "messages"), {
      senderId,
      text,
      timestamp: Timestamp.now(),
    })
    // Update lastMessageAt on the parent chat document
    await updateDoc(chatDocRef, {
      lastMessageAt: Timestamp.now(),
    })
    console.log(`addMessage: Message added successfully to chat ${chatId}.`)
    return { success: true }
  } catch (error) {
    console.error("Error adding message:", error)
    return { success: false, error }
  }
}

export const getChatMessagesRealtime = (chatId: string, callback: (messages: any[]) => void) => {
  if (!chatId) {
    console.log("getChatMessagesRealtime: No chatId provided, returning empty messages.")
    callback([])
    return () => {}
  }

  console.log(`getChatMessagesRealtime: Setting up listener for chat ID: ${chatId}`)
  const q = query(collection(db, "chats", chatId, "messages"), orderBy("timestamp", "asc"))

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const messages = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date(),
      }))
      console.log(`getChatMessagesRealtime: Received ${messages.length} messages for chat ${chatId}.`)
      callback(messages)
    },
    (error) => {
      console.error("Error listening to chat messages:", error)
      callback([])
    },
  )

  return unsubscribe
}
