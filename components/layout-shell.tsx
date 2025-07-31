"use client"

import React from "react"
import ClientNav from "@/components/client-nav"
import BottomNav from "@/components/bottom-nav"
import { Users } from "lucide-react"
import Link from "next/link"

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <div className="sticky top-0 z-40 bg-white shadow-sm border-b">
        {/* Top Navbar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/"><div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600 mr-2" />
              <h1 className="text-2xl font-bold text-gray-900">SkillSwap</h1>
            </div></Link>
            <div>
              <ClientNav />
            </div>
          </div>
        </div>
      </div>
      <main className="flex-1 pb-16">{children}</main>
      {/* Bottom Navigation removed as requested */}
    </div>
  )
}
