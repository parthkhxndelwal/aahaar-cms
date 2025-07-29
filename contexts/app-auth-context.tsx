"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"

interface AppUser {
  id: string
  email?: string
  phone?: string
  fullName: string
  role: "user"
  courtId: string
  court?: {
    courtId: string
    instituteName: string
  }
}

interface AppAuthContextType {
  user: AppUser | null
  token: string | null
  login: (token: string, user: AppUser) => void
  logout: () => void
  loading: boolean
  isAuthenticated: boolean
}

const AppAuthContext = createContext<AppAuthContextType | undefined>(undefined)

export function AppAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Check for stored auth data on mount with app-specific keys
    const storedToken = localStorage.getItem("app_auth_token")
    const storedUser = localStorage.getItem("app_auth_user")

    console.log('🔍 [AppAuth] Checking stored auth:', { hasToken: !!storedToken, hasUser: !!storedUser })

    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser)
        console.log('🔍 [AppAuth] Parsed user:', { role: parsedUser.role, id: parsedUser.id })
        
        if (parsedUser.role === "user") {
          setToken(storedToken)
          setUser(parsedUser)
          console.log('✅ [AppAuth] Auth restored from localStorage')
        } else {
          // Clear invalid role data
          console.log('❌ [AppAuth] Invalid role, clearing data')
          localStorage.removeItem("app_auth_token")
          localStorage.removeItem("app_auth_user")
        }
      } catch (error) {
        console.error("❌ [AppAuth] Error parsing stored app user data:", error)
        localStorage.removeItem("app_auth_token")
        localStorage.removeItem("app_auth_user")
      }
    } else {
      console.log('ℹ️ [AppAuth] No stored auth data found')
    }

    setLoading(false)
    console.log('🔍 [AppAuth] Initial auth check complete')
  }, [])

  const login = (newToken: string, newUser: AppUser) => {
    if (newUser.role !== "user") {
      console.error("❌ [AppAuth] Invalid user role for app context:", newUser.role)
      return
    }
    
    console.log('✅ [AppAuth] Logging in user:', { id: newUser.id, role: newUser.role })
    setToken(newToken)
    setUser(newUser)
    localStorage.setItem("app_auth_token", newToken)
    localStorage.setItem("app_auth_user", JSON.stringify(newUser))
  }

  const logout = () => {
    console.log('🚪 [AppAuth] Logging out user')
    setToken(null)
    setUser(null)
    localStorage.removeItem("app_auth_token")
    localStorage.removeItem("app_auth_user")
    // Don't redirect to root, let the calling component handle navigation
  }

  const value = {
    user,
    token,
    login,
    logout,
    loading,
    isAuthenticated: !!user && !!token,
  }

  return <AppAuthContext.Provider value={value}>{children}</AppAuthContext.Provider>
}

export function useAppAuth() {
  const context = useContext(AppAuthContext)
  if (context === undefined) {
    throw new Error("useAppAuth must be used within an AppAuthProvider")
  }
  return context
}
