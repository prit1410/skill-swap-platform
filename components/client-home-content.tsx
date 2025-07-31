"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Search, MapPin, Star, MessageSquare } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { getUsers } from "@/lib/firestore"

export default function ClientHomeContent() {
  // Always call hooks at the top level
  const [isClient, setIsClient] = useState(false)
  const { user, userProfile } = useAuth()
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [filteredUsers, setFilteredUsers] = useState<any[]>([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(true)

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (!isClient) return
    const fetchUsers = async () => {
      setIsLoadingUsers(true)
      const result = await getUsers(searchTerm)
      if (result.success) {
        setFilteredUsers(result.users)
      } else {
        setFilteredUsers(result.users || [])
      }
      setIsLoadingUsers(false)
    }
    fetchUsers()
  }, [searchTerm, isClient])

  if (!isClient) {
    // Render a static skeleton or nothing on the server
    return (
      <section className="py-20 px-4 text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-5xl font-bold text-gray-900 mb-6">Exchange Skills, Build Community</h2>
          <p className="text-xl text-gray-600 mb-8">
            Connect with others to teach what you know and learn what you need. Join our community of skill sharers today!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <div className="h-12 w-32 bg-gray-200 rounded mb-2"></div>
            <div className="h-12 w-32 bg-gray-200 rounded mb-2"></div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <>
      {/* Hero Section */}
      <section className="py-20 px-4 text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-5xl font-bold text-gray-900 mb-6">Exchange Skills, Build Community</h2>
          <p className="text-xl text-gray-600 mb-8">
            Connect with others to teach what you know and learn what you need. Join our community of skill sharers today!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href={user ? "/profile/my-profile" : "/auth"}>
              <Button size="lg" className="px-8">
                Get Started
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="px-8 bg-transparent">
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Search Section */}
      <section className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="relative mb-8 flex flex-col sm:flex-row gap-4 items-center">
            <div className="flex-1 w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                type="text"
                placeholder="Search for skills (e.g., React, Python, Photography...)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 py-3 text-lg"
              />
            </div>
            <Button variant="outline" onClick={() => {
              setIsLoadingUsers(true);
              getUsers(searchTerm).then(result => {
                if (result.success) {
                  setFilteredUsers(result.users)
                } else {
                  setFilteredUsers(result.users || [])
                }
                setIsLoadingUsers(false)
              });
            }}>
              Refresh
            </Button>
          </div>
          {/* User Cards */}
          {isLoadingUsers ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 rounded-full bg-gray-200"></div>
                      <div>
                        <div className="h-4 w-32 bg-gray-200 rounded mb-2"></div>
                        <div className="h-3 w-48 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="h-4 w-24 bg-gray-200 rounded"></div>
                      <div className="flex flex-wrap gap-1">
                        <div className="h-6 w-16 bg-gray-200 rounded"></div>
                        <div className="h-6 w-20 bg-gray-200 rounded"></div>
                      </div>
                      <div className="h-4 w-24 bg-gray-200 rounded"></div>
                      <div className="flex flex-wrap gap-1">
                        <div className="h-6 w-16 bg-gray-200 rounded"></div>
                        <div className="h-6 w-20 bg-gray-200 rounded"></div>
                      </div>
                      <div className="flex items-center justify-between pt-2">
                        <div className="h-4 w-24 bg-gray-200 rounded"></div>
                        <div className="h-8 w-24 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center text-gray-600 py-10">No users found matching your search.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredUsers.map((user) => (
                <Card key={user.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <Link href={`/profile/${user.id}`} className="flex items-center space-x-3">
                      <Avatar>
                        <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
                        <AvatarFallback>
                          {user.name.split(" ").map((n: string) => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg">{user.name}</CardTitle>
                        <CardDescription className="flex items-center">
                          <MapPin className="h-4 w-4 mr-1" />
                          {user.location}
                        </CardDescription>
                      </div>
                    </Link>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-sm text-gray-700 mb-2">Offers:</h4>
                        <div className="flex flex-wrap gap-1">
                          {user.skillsOffered.map((skill: string, index: number) => (
                            <Badge key={index} variant="default" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-gray-700 mb-2">Wants:</h4>
                        <div className="flex flex-wrap gap-1">
                          {user.skillsWanted.map((skill: string, index: number) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center space-x-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-medium">{user.rating}</span>
                          <span className="text-sm text-gray-500">({user.completedSwaps} swaps)</span>
                        </div>
                        <Link href={`/profile/${user.id}`}>
                          <Button size="sm">
                            <MessageSquare className="h-4 w-4 mr-1" />
                            Connect
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  )
}
