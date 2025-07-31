"use client"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Shield, Bell } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useNotifications } from "@/hooks/use-notifications"

export default function ClientNav() {
  const { user, loading, logout, userProfile } = useAuth()
  const router = useRouter()
  const { notifications, unreadCount, markNotificationAsRead } = useNotifications(user?.uid)

  const getInitials = (name: string | undefined | null) => {
    if (!name) return "U"
    const parts = name.split(" ")
    if (parts.length > 1) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return name[0]?.toUpperCase() || "U"
  }

  const handleLogout = async () => {
    await logout()
    router.push("/")
  }

  return (
    <nav className="flex items-center space-x-4">
      {loading ? (
        <div className="h-8 w-20 animate-pulse bg-gray-200 rounded"></div>
      ) : user ? (
        <>
          <Link href="/profile/my-profile">
            <Button variant="ghost">My Profile</Button>
          </Link>
          <Link href="/requests">
            <Button variant="ghost">Requests</Button>
          </Link>
          <Link href="/chats">
            <Button variant="ghost">Chats</Button>
          </Link>
          {userProfile?.role === "admin" && (
            <Link href="/admin">
              <Button variant="ghost">
                <Shield className="h-4 w-4 mr-2" />
                Admin
              </Button>
            </Link>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full transform translate-x-1/2 -translate-y-1/2">
                    {unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {notifications.length === 0 ? (
                <DropdownMenuItem className="text-gray-500">No new notifications.</DropdownMenuItem>
              ) : (
                notifications.map((notification) => (
                  <DropdownMenuItem
                    key={notification.id}
                    className={`flex flex-col items-start space-y-1 ${!notification.read ? "bg-blue-50 font-medium" : ""}`}
                    onClick={() => markNotificationAsRead(notification.id)}
                  >
                    <div className="text-sm">{notification.message}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(notification.timestamp.toDate()).toLocaleString()}
                    </div>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={handleLogout}>Sign Out</Button>
          <Link href="/profile/my-profile">
            <Avatar>
              <AvatarImage src={userProfile?.avatar || "/placeholder.svg"} alt={userProfile?.name} />
              <AvatarFallback>{getInitials(userProfile?.name)}</AvatarFallback>
            </Avatar>
          </Link>
        </>
      ) : (
        <Link href="/auth">
          <Button>Sign In</Button>
        </Link>
      )}
    </nav>
  )
}
