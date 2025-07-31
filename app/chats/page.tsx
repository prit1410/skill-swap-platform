"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Send } from "lucide-react"
import { getUsers, addMessage, getChatMessagesRealtime, createChat } from "@/lib/firestore"
import { useAuth } from "@/lib/auth-context"

export default function ChatsPage() {
  const { user, logout, loading } = useAuth()
  interface ChatUser {
    id: string
    name: string
    email?: string
    avatar?: string
    skillsOffered?: string[]
    skillsWanted?: string[]
  }

  const [users, setUsers] = useState<ChatUser[]>([])
  const [activeChat, setActiveChat] = useState<{
    chatId: string
    otherUserId: string
    otherUserName: string
    otherUserAvatar: string
  } | null>(null)
  const [isLoadingUsers, setIsLoadingUsers] = useState(true)
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState<{
    id: string
    text: string
    senderId: string
    timestamp: any
  }[]>([])

  const router = useRouter()
  
  useEffect(() => {
    const fetchAcceptedUsers = async () => {
      try {
        setIsLoadingUsers(true)
        if (!user || !user.uid) {
          setUsers([])
          setIsLoadingUsers(false)
          return
        }
        // Query swapRequests where fromUserId === user.uid OR toUserId === user.uid and status === 'accepted'
        const { getDocs, collection, query, where, or } = await import("firebase/firestore")
        const { db } = await import("@/lib/firebase")
        // Get requests sent by me and accepted
        const sentQ = query(
          collection(db, "swapRequests"),
          where("fromUserId", "==", user.uid),
          where("status", "==", "accepted")
        )
        // Get requests received by me and accepted
        const receivedQ = query(
          collection(db, "swapRequests"),
          where("toUserId", "==", user.uid),
          where("status", "==", "accepted")
        )
        const [sentSnap, receivedSnap] = await Promise.all([getDocs(sentQ), getDocs(receivedQ)])
        const sentAccepted = sentSnap.docs.map(doc => doc.data())
        const receivedAccepted = receivedSnap.docs.map(doc => doc.data())
        // Get unique user IDs: toUserIds from sent, fromUserIds from received
        const toUserIds = sentAccepted.map(r => r.toUserId)
        const fromUserIds = receivedAccepted.map(r => r.fromUserId)
        const allUserIds = [...new Set([...toUserIds, ...fromUserIds])]
        // Fetch user profiles for each userId
        const userProfiles = await Promise.all(
          allUserIds.map(async (uid) => {
            const { getUserById } = await import("@/lib/firestore")
            const res = await getUserById(uid)
            if (res.success && res.user) {
              return {
                id: res.user.id,
                name: res.user.name,
                email: res.user.email,
                avatar: res.user.avatar || '/placeholder.svg'
              } as ChatUser
            }
            return undefined
          })
        )
        const filteredUsers: ChatUser[] = userProfiles.filter((u): u is ChatUser => !!u)
        setUsers(filteredUsers)
        // Handle direct chat opening from URL
        const params = new URLSearchParams(window.location.search)
        const userIdFromUrl = params.get('userId')
        if (userIdFromUrl) {
          const userToChat = filteredUsers.find(u => u && u.id === userIdFromUrl)
          if (userToChat) {
            const chatUser = {
              id: userToChat.id,
              name: userToChat.name,
              avatar: userToChat.avatar
            }
            handleOpenChatWithUser(chatUser)
          } else {
            console.error("User not found")
          }
        }
      } catch (error) {
        console.error("Error fetching accepted users:", error)
      } finally {
        setIsLoadingUsers(false)
      }
    }

    if (!loading && !user) {
      router.push('/auth')
    } else if (user?.uid) {
      fetchAcceptedUsers()
    }
  }, [user?.uid, loading, router])

  useEffect(() => {
    if (activeChat?.chatId) {
      const unsubscribe = getChatMessagesRealtime(activeChat.chatId, (newMessages) => {
        setMessages(newMessages)
      })

      return () => unsubscribe()
    }
  }, [activeChat])

  const handleOpenChatWithUser = async (otherUser: { id: string; name: string; avatar?: string }) => {
    if (!user?.uid) {
      console.error("User is not authenticated.")
      return
    }

    try {
      // Pass null as swapRequestId for direct chats
      const chatResult = await createChat(null, user.uid, otherUser.id)
      if (chatResult.success && chatResult.id) {
        setActiveChat({
          chatId: chatResult.id,
          otherUserId: otherUser.id,
          otherUserName: otherUser.name,
          otherUserAvatar: otherUser.avatar || "/placeholder.svg",
        })
      } else {
        console.error("Failed to open chat:", chatResult.error)
      }
    } catch (error) {
      console.error("Error opening chat:", error)
    }
  }

  const handleCloseChat = () => {
    setActiveChat(null)
    setMessages([])
  }

  const handleSendMessage = async () => {
    if (activeChat?.chatId && user?.uid && message.trim()) {
      try {
        console.log(`handleSendMessage: Sending message to chat ${activeChat.chatId}. Sender: ${user.uid}, Message: "${message}"`)
        const result = await addMessage(activeChat.chatId, user.uid, message.trim())
        if (result.success) {
          console.log("handleSendMessage: Message sent successfully.")
          setMessage("") // Clear the input field after sending
        } else {
          console.error("handleSendMessage: Failed to send message:", result.error)
        }
      } catch (error) {
        console.error("handleSendMessage: Error occurred while sending message:", error)
      }
    } else {
      console.warn("handleSendMessage: Missing chatId, senderId, or message content.")
    }
  }

  const getInitials = (name: string | undefined | null) => {
    if (!name) return "U"
    const parts = name.split(" ")
    if (parts.length > 1) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return name[0]?.toUpperCase() || "U"
  }

  if (!user) {
    return <p>Please log in to view chats.</p>
  }

  return (
    <div className="min-h-screen flex">
      {/* Left column: User list */}
      <div className="w-1/3 border-r bg-gray-100">
        <div className="p-4">
          <h2 className="text-xl font-bold mb-4">Chats</h2>
          {isLoadingUsers ? (
            <p>Loading users...</p>
          ) : (
            <ul className="space-y-4">
              {users.map((chatUser) => (
                <li
                  key={chatUser.id}
                  className="flex items-center space-x-3 cursor-pointer p-2 hover:bg-gray-200 rounded-lg"
                  onClick={() => handleOpenChatWithUser({
                    id: chatUser.id,
                    name: chatUser.name,
                    avatar: chatUser.avatar
                  })}
                >
                  <Avatar>
                    <AvatarImage src={chatUser.avatar || "/placeholder.svg"} alt={chatUser.name} />
                    <AvatarFallback>{getInitials(chatUser.name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-gray-800">{chatUser.name}</p>
                    {chatUser.email && <p className="text-sm text-gray-600">{chatUser.email}</p>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Right column: Chat area */}
      <div className="w-2/3 bg-white flex flex-col h-screen">
        {activeChat ? (
          <div className="flex flex-col h-full">
            {/* Chat header */}
            <div className="flex items-center justify-between p-4 border-b bg-gray-50">
              <div className="flex items-center space-x-3">
                <Avatar>
                  <AvatarImage src={activeChat.otherUserAvatar} alt={activeChat.otherUserName} />
                  <AvatarFallback>{getInitials(activeChat.otherUserName)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-gray-800">{activeChat.otherUserName}</p>
                  <p className="text-sm text-gray-600">Chatting now</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleCloseChat}>
                Close
              </Button>
            </div>

            {/* Chat messages */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-100">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-600">No messages yet. Start the conversation!</p>
                </div>
              ) : 
                messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`mb-4 ${msg.senderId === user?.uid ? "text-right" : "text-left"}`}
                  >
                    <p
                      className={`inline-block p-3 rounded-lg shadow-md ${
                        msg.senderId === user?.uid ? "bg-blue-500 text-white" : "bg-white"
                      }`}
                    >
                      {msg.text}
                    </p>
                  </div>
                ))
              }
            </div>

            {/* Chat input */}
            <div className="p-4 border-t bg-gray-50 flex items-center space-x-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {message.trim() && (
                <Button onClick={handleSendMessage} variant="default">
                  <Send className="h-5 w-5" />
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-600">Select a user to start chatting</p>
          </div>
        )}
      </div>
    </div>
  )
}
