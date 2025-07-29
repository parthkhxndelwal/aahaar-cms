"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"

interface VendorUser {
  id: string
  email?: string
  phone?: string
  fullName: string
  role: "vendor"
  courtId: string
  court?: {
    courtId: string
    instituteName: string
  }
  vendorProfile?: {
    id: string
    stallName: string
    stallLocation?: string
    isOnline: boolean
  }
}

interface VendorAuthContextType {
  user: VendorUser | null
  token: string | null
  login: (token: string, user: VendorUser) => void
  logout: () => void
  loading: boolean
  isAuthenticated: boolean
}

const VendorAuthContext = createContext<VendorAuthContextType | undefined>(undefined)

export function VendorAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<VendorUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Check for stored auth data on mount with vendor-specific keys
    const storedToken = localStorage.getItem("vendor_auth_token")
    const storedUser = localStorage.getItem("vendor_auth_user")

    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser)
        if (parsedUser.role === "vendor") {
          setToken(storedToken)
          setUser(parsedUser)
        } else {
          // Clear invalid role data
          localStorage.removeItem("vendor_auth_token")
          localStorage.removeItem("vendor_auth_user")
        }
      } catch (error) {
        console.error("Error parsing stored vendor user data:", error)
        localStorage.removeItem("vendor_auth_token")
        localStorage.removeItem("vendor_auth_user")
      }
    }

    setLoading(false)
  }, [])

  const login = (newToken: string, newUser: VendorUser) => {
    if (newUser.role !== "vendor") {
      console.error("Invalid user role for vendor context")
      return
    }
    
    setToken(newToken)
    setUser(newUser)
    localStorage.setItem("vendor_auth_token", newToken)
    localStorage.setItem("vendor_auth_user", JSON.stringify(newUser))
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem("vendor_auth_token")
    localStorage.removeItem("vendor_auth_user")
    router.push("/vendor/login")
  }

  const value = {
    user,
    token,
    login,
    logout,
    loading,
    isAuthenticated: !!user && !!token,
  }

  return <VendorAuthContext.Provider value={value}>{children}</VendorAuthContext.Provider>
}

export function useVendorAuth() {
  const context = useContext(VendorAuthContext)
  if (context === undefined) {
    throw new Error("useVendorAuth must be used within a VendorAuthProvider")
  }
  return context
}
