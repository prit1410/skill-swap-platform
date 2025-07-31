"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Shield, Clock, CheckCircle, XCircle, Users, MessageSquare } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { getSwapRequestsRealtime, updateSwapRequestStatus } from "@/lib/firestore" // Use getSwapRequestsRealtime
import { useRouter } from "next/navigation"
import { collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"

export default function RequestsPage() {
  // Define the type for requests
  interface Request {
    id: string
    fromUserId: string
    toUserId: string
    skillWanted: string
    message: string
    status: string
    updatedAt: Date
    partner?: {
      name: string
      avatar: string
    }
  }

  // Define the type for users
  interface User {
    id: string
    name: string
    email: string
    avatar?: string
  }

  const { user, loading, logout, userProfile } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("received")
  const [requests, setRequests] = useState<{
    received: Request[]
    sent: Request[]
    completed: Request[]
  }>({ received: [], sent: [], completed: [] })
  const [isLoadingRequests, setIsLoadingRequests] = useState(true)

  useEffect(() => {
    if (!loading && !user) {
      console.log("RequestsPage: Not authenticated, redirecting to /auth")
      router.push("/auth") // Redirect if not authenticated
      return
    }

    if (!user) {
      console.log("RequestsPage: User is null, setting isLoadingRequests to false.")
      setIsLoadingRequests(false) // No user, no requests to load
      return
    }

    console.log("RequestsPage: User authenticated, starting real-time listener for requests.")
    setIsLoadingRequests(true)
    // Use the real-time listener
    const unsubscribe = getSwapRequestsRealtime(user.uid, (data) => {
      console.log("RequestsPage: Received real-time data:", data)
      setRequests({
        received: data.received || [],
        sent: data.sent || [],
        completed: data.completed || [],
      })
      setIsLoadingRequests(false)
    })

    return () => {
      console.log("RequestsPage: Unsubscribing from real-time listener.")
      unsubscribe() // Unsubscribe on component unmount
    }
  }, [user, loading, router]) // Dependencies: user, loading, router

  const handleUpdateStatus = async (requestId: string, status: string, requestToUserId: string) => {
    console.log(`RequestsPage: Current authenticated user UID: ${user?.uid}`) // NEW LOG
    console.log(`RequestsPage: User ${user?.uid} attempting to update request ${requestId} to status ${status}`)
    console.log(`RequestsPage: Request's toUserId (recipient): ${requestToUserId}`)
    if (user?.uid !== requestToUserId && status === "accepted") {
      console.warn("RequestsPage: Current user is not the recipient of this request. Cannot accept.")
      // Optionally show an error to the user
      return
    }
    const result = await updateSwapRequestStatus(requestId, status)
    if (!result.success) {
      console.error("RequestsPage: Failed to update request status:", result.error)
    }
    // No need to manually re-fetch here, onSnapshot will handle the UI update
  }

  const handleLogout = async () => {
    console.log("RequestsPage: Logging out.")
    await logout()
    router.push("/") // Redirect to home after logout
  }

  const getInitials = (name: string | undefined | null) => {
    if (!name) return "U"
    const parts = name.split(" ")
    if (parts.length > 1) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return name[0]?.toUpperCase() || "U"
  }

  if (loading || isLoadingRequests) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading requests...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect to auth
  }

  function handleOpenChatWithUser(user: User): void {
    throw new Error("Function not implemented.")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Skill Exchange Requests</h2>
          <p className="text-gray-600">Manage your incoming and outgoing skill exchange requests</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="received">Received ({requests.received.length})</TabsTrigger>
            <TabsTrigger value="sent">Sent ({requests.sent.length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({requests.completed.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="received" className="space-y-4">
            {requests.received.length === 0 ? (
              <p className="text-center text-gray-600 py-10">No received requests.</p>
            ) : (
              requests.received.map((request: any) => (
                <Card key={request.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <Link href={`/profile/${request.fromUserId}`} className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarImage src={request.from?.avatar || "/placeholder.svg"} alt={request.from?.name} />
                          <AvatarFallback>{getInitials(request.from?.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-lg">{request.from?.name}</CardTitle>
                          <CardDescription className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            {new Date(request.createdAt).toLocaleString()}
                          </CardDescription>
                        </div>
                      </Link>
                      <Badge variant="secondary" className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        Pending
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-600 mb-2">Wants to learn:</p>
                        <Badge variant="outline">{request.skillWanted}</Badge>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-2">Offers in return:</p>
                        <div className="flex flex-wrap gap-1">
                          {request.from?.skillsOffered?.map((skill: string, index: number) => (
                            <Badge key={index} variant="default" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-2">Message:</p>
                        <p className="text-sm bg-gray-50 p-3 rounded-lg">{request.message}</p>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          onClick={() => handleUpdateStatus(request.id, "accepted", request.toUserId)}
                          className="flex-1"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Accept
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleUpdateStatus(request.id, "rejected", request.toUserId)}
                          className="flex-1"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Decline
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="sent" className="space-y-4">
            {requests.sent.length === 0 ? (
              <p className="text-center text-gray-600 py-10">No sent requests.</p>
            ) : (
              requests.sent.map((request: any) => (
                <Card key={request.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <Link href={`/profile/${request.toUserId}`} className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarImage src={request.to?.avatar || "/placeholder.svg"} alt={request.to?.name} />
                          <AvatarFallback>{getInitials(request.to?.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-lg">{request.to?.name}</CardTitle>
                          <CardDescription className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            {new Date(request.createdAt).toLocaleString()}
                          </CardDescription>
                        </div>
                      </Link>
                      <Badge
                        variant={request.status === "accepted" ? "default" : "secondary"}
                        className="flex items-center"
                      >
                        {request.status === "accepted" ? (
                          <CheckCircle className="h-3 w-3 mr-1" />
                        ) : (
                          <Clock className="h-3 w-3 mr-1" />
                        )}
                        {request.status === "accepted" ? "Accepted" : "Pending"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-600 mb-2">You want to learn:</p>
                        <Badge variant="outline">{request.skillWanted}</Badge>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-2">Your message:</p>
                        <p className="text-sm bg-gray-50 p-3 rounded-lg">{request.message}</p>
                      </div>
                      <div className="flex space-x-2">
                        {request.status === "pending" && (
                          <Button
                            variant="outline"
                            onClick={() => handleUpdateStatus(request.id, "cancelled", request.toUserId)}
                            className="flex-1"
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Cancel Request
                          </Button>
                        )}
                        {request.status === "accepted" && (
                          <Button
                            onClick={() => handleUpdateStatus(request.id, "completed", request.toUserId)}
                            className="flex-1"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Mark as Completed
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {requests.completed.length === 0 ? (
              <p className="text-center text-gray-600 py-10">No completed requests.</p>
            ) : (
              requests.completed.map((request: any) => (
                <Card key={request.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <Link
                        href={`/profile/${request.fromUserId === user?.uid ? request.toUserId : request.fromUserId}`}
                        className="flex items-center space-x-3"
                      >
                        <Avatar>
                          <AvatarImage
                            src={request.partner?.avatar || "/placeholder.svg"}
                            alt={request.partner?.name}
                          />
                          <AvatarFallback>{getInitials(request.partner?.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-lg">{request.partner?.name}</CardTitle>
                          <CardDescription>
                            Completed {new Date(request.updatedAt).toLocaleString()}
                          </CardDescription>
                        </div>
                      </Link>
                      <Badge variant="default" className="flex items-center">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Completed
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-600 mb-2">Skills exchanged:</p>
                        <Badge variant="outline">{request.skillWanted}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
