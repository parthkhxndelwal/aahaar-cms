"use client"

import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { AnimatedButton } from "@/components/ui/animated-button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { FloatingInput } from "@/components/ui/floating-input"
import { FloatingSelect } from "@/components/ui/floating-select"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useAdminAuth } from "@/contexts/admin-auth-context"
import { useRouter } from "next/navigation"
import { X } from "lucide-react"

export default function AdminAuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
    courtId: "",
  })
  const [registerData, setRegisterData] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    courtId: "",
    instituteName: "",
    instituteType: "college",
  })
  const [loading, setLoading] = useState(false)
  const [loginError, setLoginError] = useState("")
  const [registerError, setRegisterError] = useState("")
  const [showLoginError, setShowLoginError] = useState(false)
  const [showRegisterError, setShowRegisterError] = useState(false)
  const [validationErrors, setValidationErrors] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    courtId: "",
    instituteName: ""
  })
  const [loginValidationErrors, setLoginValidationErrors] = useState({
    email: "",
    courtId: ""
  })
  const { toast } = useToast()
  const { login } = useAdminAuth()
  const router = useRouter()

  // Validation functions
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email) return "Email is required"
    if (!emailRegex.test(email)) return "Please enter a valid email address"
    return ""
  }

  const validatePhone = (phone: string) => {
    const phoneRegex = /^[+]?[\d\s-()]{10,}$/
    if (!phone) return "Phone number is required"
    if (!phoneRegex.test(phone)) return "Please enter a valid phone number"
    return ""
  }

  const validatePassword = (password: string) => {
    if (!password) return "Password is required"
    if (password.length < 8) return "Password must be at least 8 characters long"
    if (!/(?=.*[a-z])/.test(password)) return "Password must contain at least one lowercase letter"
    if (!/(?=.*[A-Z])/.test(password)) return "Password must contain at least one uppercase letter"
    if (!/(?=.*\d)/.test(password)) return "Password must contain at least one number"
    return ""
  }

  const validateCourtId = (courtId: string) => {
    const courtIdRegex = /^[a-z0-9-]+$/
    if (!courtId) return "Court ID is required"
    if (courtId.length < 3) return "Court ID must be at least 3 characters long"
    if (!courtIdRegex.test(courtId)) return "Court ID can only contain lowercase letters, numbers, and hyphens"
    return ""
  }

  const validateField = (field: string, value: string) => {
    let error = ""
    switch (field) {
      case "fullName":
        error = !value ? "Full name is required" : value.length < 2 ? "Name must be at least 2 characters long" : ""
        break
      case "email":
        error = validateEmail(value)
        break
      case "phone":
        error = validatePhone(value)
        break
      case "password":
        error = validatePassword(value)
        break
      case "confirmPassword":
        error = !value ? "Please confirm your password" : value !== registerData.password ? "Passwords do not match" : ""
        break
      case "courtId":
        error = validateCourtId(value)
        break
      case "instituteName":
        error = !value ? "Institute name is required" : value.length < 2 ? "Institute name must be at least 2 characters long" : ""
        break
    }
    
    setValidationErrors(prev => ({ ...prev, [field]: error }))
    return error === ""
  }

  const validateLoginField = (field: string, value: string) => {
    let error = ""
    switch (field) {
      case "email":
        error = validateEmail(value)
        break
      case "courtId":
        error = validateCourtId(value)
        break
    }
    
    setLoginValidationErrors(prev => ({ ...prev, [field]: error }))
    return error === ""
  }

  const handleLoginDataChange = (field: string, value: string) => {
    setLoginData((prev) => ({ ...prev, [field]: value }))
    // Real-time validation
    setTimeout(() => validateLoginField(field, value), 300) // Debounce validation
  }

  // Two-stage error handling functions
  const showLoginErrorWithAnimation = (message: string) => {
    // If there's already an error, hide it first
    if (loginError) {
      hideLoginErrorWithAnimation()
      setTimeout(() => {
        setLoginError(message)
        setTimeout(() => {
          setShowLoginError(true)
        }, 150)
      }, 600) // Wait for hide animation to complete
    } else {
      setLoginError(message)
      setTimeout(() => {
        setShowLoginError(true)
      }, 150)
    }
  }

  const hideLoginErrorWithAnimation = () => {
    setShowLoginError(false) // First hide content
    setTimeout(() => {
      setLoginError("") // Then collapse space
    }, 300)
  }

  const showRegisterErrorWithAnimation = (message: string) => {
    // If there's already an error, hide it first
    if (registerError) {
      hideRegisterErrorWithAnimation()
      setTimeout(() => {
        setRegisterError(message)
        setTimeout(() => {
          setShowRegisterError(true)
        }, 150)
      }, 600) // Wait for hide animation to complete
    } else {
      setRegisterError(message)
      setTimeout(() => {
        setShowRegisterError(true)
      }, 150)
    }
  }

  const hideRegisterErrorWithAnimation = () => {
    setShowRegisterError(false) // First hide content
    setTimeout(() => {
      setRegisterError("") // Then collapse space
    }, 300)
  }

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate login fields
    const emailValid = validateLoginField("email", loginData.email)
    const courtIdValid = validateLoginField("courtId", loginData.courtId)
    
    if (!emailValid || !courtIdValid) {
      showLoginErrorWithAnimation("Please fix the validation errors below")
      return false
    }

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: loginData.email,
          password: loginData.password,
          courtId: loginData.courtId,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      }).then(res => res.json())
      
      if (response.success) {
        const { token, user } = response.data
        login(token, user)
        
        toast({
          title: "Success",
          description: "Logged in successfully!",
        })
        
        router.push(`/admin/${loginData.courtId}`)
        return true
      } else {
        showLoginErrorWithAnimation(response.message || "Invalid credentials. Please check your email, password, and court ID.")
        return false
      }
    } catch (error: any) {
      showLoginErrorWithAnimation("An error occurred during login. Please try again.")
      return false
    }
  }

  const handleLoginClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    return await handleLoginSubmit(e as any)
  }

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate all fields
    const fields = ['fullName', 'email', 'phone', 'password', 'confirmPassword', 'courtId', 'instituteName']
    let hasErrors = false
    
    fields.forEach(field => {
      const isValid = validateField(field, registerData[field as keyof typeof registerData])
      if (!isValid) hasErrors = true
    })

    // Check if passwords match
    if (registerData.password !== registerData.confirmPassword) {
      setValidationErrors(prev => ({ ...prev, confirmPassword: "Passwords do not match" }))
      hasErrors = true
    }

    if (hasErrors) {
      showRegisterErrorWithAnimation("Please resolve the errors")
      return false
    }

    setLoading(true)
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(registerData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        showRegisterErrorWithAnimation(errorData.message || "Registration failed")
        return false
      }

      const data = await response.json()

      localStorage.setItem("token", data.token)
      localStorage.setItem("user", JSON.stringify(data.user))

      toast({
        title: "Success",
        description: "Account created successfully! Welcome to Aahaar.",
      })

      router.push(`/admin/${registerData.courtId}/onboarding`)
      return true
    } catch (error: any) {
      showRegisterErrorWithAnimation("An error occurred during registration. Please try again.")
      return false
    } finally {
      setLoading(false)
    }
  }

  const handleRegisterClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    return await handleRegisterSubmit(e as any)
  }

  const switchMode = () => {
    setIsLogin(!isLogin)
    hideLoginErrorWithAnimation() // Clear login errors with animation
    hideRegisterErrorWithAnimation() // Clear register errors with animation
    setValidationErrors({
      fullName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      courtId: "",
      instituteName: ""
    })
    setLoginValidationErrors({
      email: "",
      courtId: ""
    })
  }

  const handleRegisterDataChange = (field: string, value: string) => {
    setRegisterData((prev) => ({ ...prev, [field]: value }))
    // Real-time validation
    setTimeout(() => validateField(field, value), 300) // Debounce validation
  }

  return (
    <div className="w-full">
      <AnimatePresence mode="wait" initial={false}>
        {isLogin ? (
          <motion.div
            key="login"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{
              duration: 0.4,
              ease: "easeOut",
              scale: { type: "spring", stiffness: 300, damping: 25 }
            }}
          >
            <motion.div
              transition={{ duration: 0.1, ease: "easeOut" }}
              className="max-w-md mx-auto"
            >
              <Card className="w-full overflow-hidden rounded-3xl bg-neutral-950/90">
                <CardHeader>
                  <CardTitle><span className="text-white">Admin Login</span></CardTitle>
                  <CardDescription>Access your food court management dashboard</CardDescription>
                </CardHeader>
                <CardContent>
                <form onSubmit={handleLoginSubmit} className="space-y-6" noValidate>
                  <FloatingInput
                    id="courtId"
                    type="text"
                    label="Court ID"
                    value={loginData.courtId}
                    onChange={(e) => handleLoginDataChange("courtId", e.target.value)}
                    error={loginValidationErrors.courtId}
                  />

                  <FloatingInput
                    id="email"
                    type="email"
                    label="Email"
                    value={loginData.email}
                    onChange={(e) => handleLoginDataChange("email", e.target.value)}
                    error={loginValidationErrors.email}
                  />

                  <FloatingInput
                    id="password"
                    type="password"
                    label="Password"
                    value={loginData.password}
                    onChange={(e) => setLoginData((prev) => ({ ...prev, password: e.target.value }))}
                  />

                  <AnimatePresence mode="wait">
                    {loginError && (
                      <motion.div
                        initial={{ height: 0, opacity: 0, scale: 0.95 }}
                        animate={{ height: "auto", opacity: 1, scale: 1 }}
                        exit={{ height: 0, opacity: 0, scale: 0.95 }}
                        transition={{ 
                          duration: 0.4,
                          ease: [0.4, 0.0, 0.2, 1],
                          height: { duration: 0.4 },
                          opacity: { duration: 0.3 },
                          scale: { duration: 0.3 }
                        }}
                        className="overflow-hidden"
                      >
                        <div className="p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md relative">
                          <div className="pr-8">
                            {loginError}
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              hideLoginErrorWithAnimation()
                            }}
                            className="absolute top-2 right-2 p-1 hover:bg-red-500/20 rounded-full transition-colors"
                            aria-label="Dismiss error"
                          >
                            <X size={16} className="text-red-400" />
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatedButton type="submit" className="w-full" onAsyncClick={handleLoginClick}>
                    Sign In
                  </AnimatedButton>
                </form>

                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-400">
                    Don't have an account?{" "}
                    <button 
                      onClick={switchMode}
                      className="text-blue-400 hover:underline transition-colors cursor-pointer"
                    >
                      Create one
                    </button>
                  </p>
                </div>
              </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="register"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{
              duration: 0.4,
              ease: "easeOut",
              scale: { type: "spring", stiffness: 300, damping: 25 }
            }}
          >
            <motion.div
              transition={{ duration: 0.1, ease: "easeOut" }}
            >
              <Card className="w-full overflow-hidden rounded-3xl bg-neutral-950/90">
                <CardHeader>
                  <CardTitle><span className="text-white">Create Admin Account</span></CardTitle>
                  <CardDescription>Set up your food court management system</CardDescription>
                </CardHeader>
                <CardContent>
                <form onSubmit={handleRegisterSubmit} className="space-y-6" noValidate>
                  {/* Row 1: Full Name and Email */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FloatingInput
                      id="fullName"
                      type="text"
                      label="Full Name"
                      value={registerData.fullName}
                      onChange={(e) => handleRegisterDataChange("fullName", e.target.value)}
                      error={validationErrors.fullName}
                    />

                    <FloatingInput
                      id="email"
                      type="email"
                      label="Email Address"
                      value={registerData.email}
                      onChange={(e) => handleRegisterDataChange("email", e.target.value)}
                      error={validationErrors.email}
                    />
                  </div>

                  {/* Row 2: Phone and Institute Name */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FloatingInput
                      id="phone"
                      type="tel"
                      label="Phone Number"
                      value={registerData.phone}
                      onChange={(e) => handleRegisterDataChange("phone", e.target.value)}
                      error={validationErrors.phone}
                    />

                    <FloatingInput
                      id="instituteName"
                      type="text"
                      label="Institute Name"
                      value={registerData.instituteName}
                      onChange={(e) => handleRegisterDataChange("instituteName", e.target.value)}
                      error={validationErrors.instituteName}
                    />
                  </div>

                  {/* Row 3: Court ID and Institute Type */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FloatingInput
                      id="courtId"
                      type="text"
                      label="Court ID (e.g. vbs-ghamroj)"
                      value={registerData.courtId}
                      onChange={(e) => handleRegisterDataChange("courtId", e.target.value.toLowerCase())}
                      error={validationErrors.courtId}
                    />

                    <FloatingSelect
                      label="Institute Type"
                      value={registerData.instituteType}
                      onValueChange={(value) => setRegisterData((prev) => ({ ...prev, instituteType: value }))}
                      options={[
                        { value: "school", label: "School" },
                        { value: "college", label: "College" },
                        { value: "office", label: "Office" },
                        { value: "hospital", label: "Hospital" },
                        { value: "other", label: "Other" }
                      ]}
                    />
                  </div>

                  {/* Row 4: Password and Confirm Password */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FloatingInput
                      id="password"
                      type="password"
                      label="Password"
                      value={registerData.password}
                      onChange={(e) => handleRegisterDataChange("password", e.target.value)}
                      error={validationErrors.password}
                    />

                    <FloatingInput
                      id="confirmPassword"
                      type="password"
                      label="Confirm Password"
                      value={registerData.confirmPassword}
                      onChange={(e) => handleRegisterDataChange("confirmPassword", e.target.value)}
                      error={validationErrors.confirmPassword}
                    />
                  </div>

                  <AnimatePresence mode="wait">
                    {registerError && (
                      <motion.div
                        initial={{ height: 0, opacity: 0, scale: 0.95 }}
                        animate={{ height: "auto", opacity: 1, scale: 1 }}
                        exit={{ height: 0, opacity: 0, scale: 0.95 }}
                        transition={{ 
                          duration: 0.4,
                          ease: [0.4, 0.0, 0.2, 1],
                          height: { duration: 0.4 },
                          opacity: { duration: 0.3 },
                          scale: { duration: 0.3 }
                        }}
                        className="overflow-hidden"
                      >
                        <div className="p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md relative">
                          <div className="pr-8">
                            {registerError}
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              hideRegisterErrorWithAnimation()
                            }}
                            className="absolute top-2 right-2 p-1 hover:bg-red-500/20 rounded-full transition-colors"
                            aria-label="Dismiss error"
                          >
                            <X size={16} className="text-red-400" />
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatedButton type="submit" className="w-full" onAsyncClick={handleRegisterClick}>
                    Create Account
                  </AnimatedButton>
                </form>

                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-400">
                    Already have an account?{" "}
                    <button 
                      onClick={switchMode}
                      className="text-blue-400 hover:underline transition-colors cursor-pointer"
                    >
                      Sign in
                    </button>
                  </p>
                </div>
              </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}