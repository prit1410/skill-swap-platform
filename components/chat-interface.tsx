"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Send, ArrowLeft } from "lucide-react"
import { addMessage, getChatMessagesRealtime } from "@/lib/firestore"
import { useAuth } from "@/lib/auth-context"

interface ChatInterfaceProps {
  chatId: string
  otherUserId: string
  otherUserName: string
  otherUserAvatar: string
  onClose: () => void
}

interface Message {
  id: string
  senderId: string
  text: string
  timestamp: Date
}

export default function ChatInterface({
  chatId,
  otherUserId,
  otherUserName,
  otherUserAvatar,
  onClose,
}: ChatInterfaceProps) {
  const { user, userProfile } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!chatId) return

    console.log(`ChatInterface: Setting up real-time listener for chat ${chatId}`)
    const unsubscribe = getChatMessagesRealtime(chatId, (fetchedMessages) => {
      setMessages(fetchedMessages)
    })

    return () => {
      console.log(`ChatInterface: Unsubscribing from chat listener for ${chatId}`)
      unsubscribe()
    }
  }, [chatId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSendMessage = async () => {
    if (!user || !newMessage.trim() || !chatId) {
      console.warn("ChatInterface: Cannot send message. User, message, or chat ID missing.")
      return
    }

    console.log(
      `ChatInterface: Attempting to send message. User UID: ${user.uid}, Chat ID: ${chatId}, Message: "${newMessage}"`,
    )
    const result = await addMessage(chatId, user.uid, newMessage.trim())
    if (result.success) {
      setNewMessage("")
      console.log("ChatInterface: Message sent successfully.")
    } else {
      console.error("ChatInterface: Failed to send message:", result.error)
      // Optionally show an error to the user
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

  return (
    <Card className="w-full h-[calc(100vh-160px)] flex flex-col shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 border-b">
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="icon" onClick={onClose} className="mr-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Avatar>
            <AvatarImage src={otherUserAvatar || "/placeholder.svg"} alt={otherUserName} />
            <AvatarFallback>{getInitials(otherUserName)}</AvatarFallback>
          </Avatar>
          <CardTitle className="text-lg">{otherUserName}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">Start a conversation!</div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.senderId === user?.uid ? "justify-end" : "justify-start"}`}
            >
              <div className={`flex items-end gap-2 ${message.senderId === user?.uid ? "flex-row-reverse" : ""}`}>
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={
                      message.senderId === user?.uid
                        ? userProfile?.avatar || "/placeholder.svg"
                        : otherUserAvatar || "/placeholder.svg"
                    }
                    alt={message.senderId === user?.uid ? userProfile?.name : otherUserName}
                  />
                  <AvatarFallback>
                    {getInitials(message.senderId === user?.uid ? userProfile?.name : otherUserName)}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={
                    `p-3 rounded-lg max-w-[70%] ` +
                    (message.senderId === user?.uid
                      ? "bg-blue-500 text-white rounded-br-none"
                      : "bg-gray-200 text-gray-800 rounded-bl-none")
                  }
                >
                  <p className="text-sm">{message.text}</p>
                  <span className="text-xs opacity-75 mt-1 block">
                    {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </CardContent>
      <CardFooter className="p-4 border-t">
        <div className="flex w-full space-x-2">
          <Input
            placeholder="Type your message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            className="flex-1"
            disabled={!user}
          />
          <Button onClick={handleSendMessage} disabled={!user || !newMessage.trim()}>
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}
