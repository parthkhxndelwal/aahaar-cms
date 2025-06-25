"use client"

import type React from "react"

import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { VendorSidebar } from "@/components/vendor/vendor-sidebar"
import { VendorHeader } from "@/components/vendor/vendor-header"

export default function VendorLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { courtId: string }
}) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && (!user || user.role !== "vendor" || user.courtId !== params.courtId)) {
      router.push("/vendor/login")
    }
  }, [user, loading, params.courtId, router])

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (!user || user.role !== "vendor") {
    return null
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <VendorSidebar courtId={params.courtId} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <VendorHeader />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-6">{children}</main>
      </div>
    </div>
  )
}
