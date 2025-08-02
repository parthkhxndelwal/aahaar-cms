"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, CheckCircle, AlertCircle } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"

// Import step components
import BasicDetailsStep from "./steps/basic-details"
import PasswordCreationStep from "./steps/password-creation"
import StallSetupStep from "./steps/stall-setup"
import OperatingHoursStep from "./steps/operating-hours"
import BankDetailsStep from "./steps/bank-details"
import LegalComplianceStep from "./steps/legal-compliance"
import AccountCreationStep from "./steps/account-creation"
import StakeholderInfoStep from "./steps/stakeholder-info"
import FinalConfigurationStep from "./steps/final-configuration" 
import SuccessStep from "./steps/success"

interface VendorOnboardingData {
  id?: string
  userId?: string // User account ID
  // Basic Details
  stallName: string
  vendorName: string
  contactEmail: string
  contactPhone: string
  stallLocation: string
  cuisineType: string
  description: string
  
  // Stall Setup
  logoUrl: string
  bannerUrl?: string
  
  // Operating Hours
  operatingHours: {
    [key: string]: {
      open: string
      close: string
      closed: boolean
    }
  }
  
  // Bank Details
  bankAccountNumber: string
  bankIfscCode: string
  bankAccountHolderName: string
  bankName: string
  
  // Legal Compliance
  panNumber: string
  gstin: string
  businessType: string
  panDocFileId?: string
  
  // Configuration
  maxOrdersPerHour: number
  averagePreparationTime: number
  
  // Temporary data for onboarding
  tempPassword?: string
  
  // Onboarding tracking
  onboardingStep?: string
  onboardingStatus?: string
}

const STEPS = [
  { key: "basic", title: "Basic Details", component: BasicDetailsStep },
  { key: "password", title: "Password Creation", component: PasswordCreationStep },
  { key: "stall", title: "Stall Setup", component: StallSetupStep },
  { key: "hours", title: "Operating Hours", component: OperatingHoursStep },
  { key: "bank", title: "Bank Details", component: BankDetailsStep },
  { key: "legal", title: "Legal Compliance", component: LegalComplianceStep },
  { key: "account", title: "Account Creation", component: AccountCreationStep },
  { key: "stakeholder", title: "Stakeholder Information", component: StakeholderInfoStep },
  { key: "config", title: "Final Configuration", component: FinalConfigurationStep },
  { key: "success", title: "Success", component: SuccessStep },
]

export default function VendorOnboardingPage() {
  const params = useParams()
  const router = useRouter()
  
  const courtId = params.courtId as string
  const stepParam = params.params?.[0] || "basic"
  const vendorId = params.params?.[1] || null
  
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [vendorData, setVendorData] = useState<VendorOnboardingData>({
    stallName: "",
    vendorName: "",
    contactEmail: "",
    contactPhone: "",
    stallLocation: "",
    cuisineType: "",
    description: "",
    logoUrl: "",
    userId: "",
    operatingHours: {
      monday: { open: "09:00", close: "18:00", closed: false },
      tuesday: { open: "09:00", close: "18:00", closed: false },
      wednesday: { open: "09:00", close: "18:00", closed: false },
      thursday: { open: "09:00", close: "18:00", closed: false },
      friday: { open: "09:00", close: "18:00", closed: false },
      saturday: { open: "09:00", close: "18:00", closed: false },
      sunday: { open: "09:00", close: "18:00", closed: true },
    },
    bankAccountNumber: "",
    bankIfscCode: "",
    bankAccountHolderName: "",
    bankName: "",
    panNumber: "",
    gstin: "",
    businessType: "proprietorship",
    maxOrdersPerHour: 10,
    averagePreparationTime: 15,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [checkingIncompleteOnboarding, setCheckingIncompleteOnboarding] = useState(false)
  const [isNavigating, setIsNavigating] = useState(false)

  // Check for incomplete onboarding when starting new vendor registration
  useEffect(() => {
    if (!vendorId && stepParam === "basic") {
      checkForIncompleteOnboarding()
    }
  }, [vendorId, stepParam, courtId])

  const checkForIncompleteOnboarding = async () => {
    try {
      setCheckingIncompleteOnboarding(true)
      console.log('🔍 Checking for incomplete onboarding...')
      
      // Look for vendors with incomplete onboarding
      const response = await fetch(`/api/admin/vendors?courtId=${courtId}&limit=50`)
      const result = await response.json()
      
      if (result.success) {
        console.log(`Found ${result.data.vendors.length} vendors in court ${courtId}`)
        
        // Find vendors with incomplete onboarding
        const incompleteVendor = result.data.vendors.find((vendor: any) => {
          const hasIncompleteStatus = vendor.onboardingStatus === 'in_progress'
          const hasIncompleteMetadata = !vendor.metadata?.onboardingCompleted && vendor.metadata?.onboardingStep
          const hasNoRazorpayAccount = !vendor.razorpayAccountId && vendor.stallName
          const isNotCompleted = vendor.onboardingStatus !== 'completed' && vendor.onboardingStep !== 'completed'
          
          console.log(`Vendor ${vendor.stallName || vendor.id}:`, {
            onboardingStatus: vendor.onboardingStatus,
            onboardingStep: vendor.onboardingStep,
            hasIncompleteStatus,
            hasIncompleteMetadata,
            hasNoRazorpayAccount,
            isNotCompleted,
            isIncomplete: (hasIncompleteStatus || hasIncompleteMetadata || hasNoRazorpayAccount) && isNotCompleted
          })
          
          return (hasIncompleteStatus || hasIncompleteMetadata || hasNoRazorpayAccount) && isNotCompleted
        })
        
        if (incompleteVendor) {
          // Determine the next incomplete step
          const nextStep = getNextIncompleteStep(incompleteVendor)
          console.log(`📍 Found incomplete vendor ${incompleteVendor.stallName}, redirecting to step: ${nextStep}`)
          router.push(`/admin/${courtId}/vendors/onboard/${nextStep}/${incompleteVendor.id}`)
          return
        } else {
          console.log('✅ No incomplete vendors found')
        }
      }
    } catch (error) {
      console.error("Error checking incomplete onboarding:", error)
    } finally {
      setCheckingIncompleteOnboarding(false)
    }
  }

  // Function to determine the next step based on vendor data
  const getNextIncompleteStep = (vendor: any): string => {
    if (!vendor) return "basic"
    
    console.log('=== STEP DETECTION DEBUG ===')
    console.log('Vendor data:', {
      stallName: vendor.stallName,
      vendorName: vendor.vendorName,
      contactEmail: vendor.contactEmail,
      contactPhone: vendor.contactPhone,
      userId: vendor.userId,
      logoUrl: vendor.logoUrl,
      operatingHours: vendor.operatingHours,
      bankAccountNumber: vendor.bankAccountNumber,
      bankIfscCode: vendor.bankIfscCode,
      panNumber: vendor.panNumber,
      razorpayAccountId: vendor.razorpayAccountId,
      maxOrdersPerHour: vendor.maxOrdersPerHour,
      averagePreparationTime: vendor.averagePreparationTime,
      onboardingStep: vendor.onboardingStep,
      onboardingStatus: vendor.onboardingStatus
    })
    
    // Define the step order and their completion criteria
    const stepChecks = [
      { step: "basic", isComplete: !!(vendor.stallName && vendor.vendorName && vendor.contactEmail && vendor.contactPhone) },
      { step: "password", isComplete: !!vendor.userId }, // User account created
      { step: "stall", isComplete: !!vendor.logoUrl }, // Logo uploaded
      { step: "hours", isComplete: !!vendor.operatingHours }, // Operating hours set
      { step: "bank", isComplete: !!(vendor.bankAccountNumber && vendor.bankIfscCode) }, // Bank details
      { step: "legal", isComplete: !!vendor.panNumber }, // PAN number added
      { step: "account", isComplete: !!vendor.razorpayAccountId }, // Razorpay account created
      { step: "stakeholder", isComplete: !!(vendor.metadata?.stakeholderId || vendor.metadata?.stakeholderCreated) }, // Stakeholder info added
      { step: "config", isComplete: !!(vendor.maxOrdersPerHour && vendor.averagePreparationTime) }, // Config set
      { step: "success", isComplete: vendor.onboardingStatus === 'completed' || vendor.onboardingStep === 'completed' } // Fully completed
    ]
    
    console.log('Step completion status:')
    stepChecks.forEach(check => {
      console.log(`  ${check.step}: ${check.isComplete ? '✅ Complete' : '❌ Incomplete'}`)
    })
    
    // If vendor has onboardingStep field, prefer that over auto-detection for better UX
    if (vendor.onboardingStep && vendor.onboardingStep !== 'completed') {
      console.log(`Using onboardingStep field: ${vendor.onboardingStep}`)
      
      // Validate that the step indicated by onboardingStep is actually incomplete
      const stepIndex = stepChecks.findIndex(check => check.step === vendor.onboardingStep)
      if (stepIndex !== -1 && !stepChecks[stepIndex].isComplete) {
        console.log(`Confirmed: ${vendor.onboardingStep} is incomplete, using it`)
        return vendor.onboardingStep
      } else {
        console.log(`Warning: onboardingStep ${vendor.onboardingStep} appears complete, falling back to auto-detection`)
      }
    }
    
    // Find the first incomplete step
    for (const check of stepChecks) {
      if (!check.isComplete) {
        console.log(`Next incomplete step for ${vendor.stallName}: ${check.step}`)
        console.log('=== END STEP DETECTION DEBUG ===')
        return check.step
      }
    }
    
    // If all steps are complete, go to success
    console.log('All steps complete, going to success')
    console.log('=== END STEP DETECTION DEBUG ===')
    return "success"
  }

  // Find current step index based on URL param
  useEffect(() => {
    const stepIndex = STEPS.findIndex(step => step.key === stepParam)
    if (stepIndex !== -1) {
      setCurrentStepIndex(stepIndex)
      // Reset navigation state when step changes
      setIsNavigating(false)
    }
  }, [stepParam])

  // Check if current step access is unauthorized (for rendering guard)
  const isUnauthorizedAccess = () => {
    if (!vendorData.id || !vendorData.onboardingStep) return false
    
    const currentStepIndex = STEPS.findIndex(step => step.key === stepParam)
    const maxAllowedStepIndex = getMaxAllowedStepIndex()
    
    return currentStepIndex > maxAllowedStepIndex
  }

  // Validate URL access and redirect if user tries to access unauthorized step
  useEffect(() => {
    if (vendorData.id && vendorData.onboardingStep) {
      const currentStepIndex = STEPS.findIndex(step => step.key === stepParam)
      const maxAllowedStepIndex = getMaxAllowedStepIndex()
      
      // If user is trying to access a step beyond what they're allowed
      if (currentStepIndex > maxAllowedStepIndex) {
        console.log(`🚫 Access denied to step ${currentStepIndex}. Redirecting to step ${maxAllowedStepIndex}`)
        const allowedStep = STEPS[maxAllowedStepIndex]
        const redirectUrl = vendorData.id 
          ? `/admin/${courtId}/vendors/onboard/${allowedStep.key}/${vendorData.id}`
          : `/admin/${courtId}/vendors/onboard/${allowedStep.key}`
        
        router.replace(redirectUrl)
        return
      }
    }
  }, [vendorData, stepParam, courtId, router])

  // Load existing vendor data if editing
  useEffect(() => {
    if (vendorId) {
      loadVendorData()
    }
  }, [vendorId])

  const loadVendorData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/vendors/${vendorId}`)
      const result = await response.json()
      
      if (result.success) {
        console.log('📊 Loading vendor data from API:', {
          vendorId: result.data.vendor.id,
          userId: result.data.vendor.userId,
          stallName: result.data.vendor.stallName,
          onboardingStep: result.data.vendor.onboardingStep,
          onboardingStatus: result.data.vendor.onboardingStatus
        })
        
        setVendorData({
          id: result.data.vendor.id,
          userId: result.data.vendor.userId || "",
          stallName: result.data.vendor.stallName || "",
          vendorName: result.data.vendor.vendorName || "",
          contactEmail: result.data.vendor.contactEmail || "",
          contactPhone: result.data.vendor.contactPhone || "",
          stallLocation: result.data.vendor.stallLocation || "",
          cuisineType: result.data.vendor.cuisineType || "",
          description: result.data.vendor.description || "",
          logoUrl: result.data.vendor.logoUrl || "",
          bannerUrl: result.data.vendor.bannerUrl || "",
          operatingHours: result.data.vendor.operatingHours || vendorData.operatingHours,
          bankAccountNumber: result.data.vendor.bankAccountNumber || "",
          bankIfscCode: result.data.vendor.bankIfscCode || "",
          bankAccountHolderName: result.data.vendor.bankAccountHolderName || "",
          bankName: result.data.vendor.bankName || "",
          panNumber: result.data.vendor.panNumber || "",
          gstin: result.data.vendor.gstin || "",
          businessType: result.data.vendor.metadata?.businessType || "proprietorship",
          panDocFileId: result.data.vendor.metadata?.panDocFileId || "",
          maxOrdersPerHour: result.data.vendor.maxOrdersPerHour || 10,
          averagePreparationTime: result.data.vendor.averagePreparationTime || 15,
          onboardingStep: result.data.vendor.onboardingStep || "basic",
          onboardingStatus: result.data.vendor.onboardingStatus || "in_progress",
        })
      }
    } catch (error) {
      console.error("Failed to load vendor data:", error)
      setError("Failed to load vendor data")
    } finally {
      setLoading(false)
    }
  }

  const updateVendorData = useCallback((updates: Partial<VendorOnboardingData>) => {
    setVendorData(prev => ({ ...prev, ...updates }))
  }, [])

  // Calculate the maximum step index the user can navigate to
  const getMaxAllowedStepIndex = () => {
    const completedSteps = []
    
    console.log('🔍 Calculating max allowed step index with vendor data:', {
      stallName: vendorData.stallName,
      vendorName: vendorData.vendorName,
      contactEmail: vendorData.contactEmail,
      contactPhone: vendorData.contactPhone,
      userId: vendorData.userId,
      id: vendorData.id,
      logoUrl: vendorData.logoUrl
    })
    
    // Step 0: Basic Details
    if (vendorData.stallName && vendorData.vendorName && vendorData.contactEmail && vendorData.contactPhone) {
      completedSteps.push(0)
      console.log('✅ Step 0 (Basic Details) completed')
    } else {
      console.log('❌ Step 0 (Basic Details) incomplete')
    }
    
    // Step 1: Password Creation (can only be completed if basic details are done)
    if (completedSteps.includes(0) && vendorData.userId) {
      completedSteps.push(1)
      console.log('✅ Step 1 (Password Creation) completed - userId:', vendorData.userId)
    } else {
      console.log('❌ Step 1 (Password Creation) incomplete - userId:', vendorData.userId, 'basicComplete:', completedSteps.includes(0))
    }
    
    // Step 2: Stall Setup (can only be completed if password is done)
    if (completedSteps.includes(1) && vendorData.logoUrl) {
      completedSteps.push(2)
    }
    
    // Step 3: Operating Hours (can only be completed if stall setup is done)
    if (completedSteps.includes(2) && vendorData.operatingHours && Object.keys(vendorData.operatingHours).length > 0) {
      completedSteps.push(3)
    }
    
    // Step 4: Bank Details (can only be completed if operating hours are done)
    if (completedSteps.includes(3) && vendorData.bankAccountNumber && vendorData.bankIfscCode) {
      completedSteps.push(4)
    }
    
    // Step 5: Legal Compliance (can only be completed if bank details are done)
    if (completedSteps.includes(4) && vendorData.panNumber) {
      completedSteps.push(5)
    }
    
    // Step 6: Account Creation (can only be completed if legal compliance is done)
    if (completedSteps.includes(5)) {
      completedSteps.push(6)
    }
    
    // Step 7: Final Configuration (can only be completed if account creation is done)
    if (completedSteps.includes(6) && vendorData.maxOrdersPerHour && vendorData.averagePreparationTime) {
      completedSteps.push(7)
    }
    
    // Step 8: Success (can only be completed if final configuration is done)
    if (completedSteps.includes(7)) {
      completedSteps.push(8)
    }
    
    // Return the next step they need to complete (or current step if already at max)
    const maxCompletedStep = completedSteps.length > 0 ? Math.max(...completedSteps) : -1
    const maxAllowedStep = Math.min(maxCompletedStep + 1, STEPS.length - 1)
    
    console.log('📊 Step calculation result:', {
      completedSteps,
      maxCompletedStep,
      maxAllowedStep,
      stepName: STEPS[maxAllowedStep]?.key
    })
    
    return maxAllowedStep
  }

  // Check if a specific step is completed based on onboarding step progress
  const isStepCompleted = (stepIndex: number) => {
    if (!vendorData.onboardingStep) return false
    
    // Get the current onboarding step index
    const currentOnboardingStepIndex = STEPS.findIndex(step => step.key === vendorData.onboardingStep)
    
    // If onboarding is completed, all steps are completed
    if (vendorData.onboardingStatus === 'completed' || vendorData.onboardingStep === 'completed') {
      return true
    }
    
    // A step is completed if it's before the current onboarding step
    // This means the user has successfully completed and moved past this step
    return stepIndex < currentOnboardingStepIndex
  }

  const goToStep = (stepIndex: number) => {
    if (stepIndex < 0 || stepIndex >= STEPS.length) return
    
    // Check if the user is allowed to navigate to this step
    const maxAllowedStepIndex = getMaxAllowedStepIndex()
    console.log(`Attempting to navigate to step ${stepIndex}. Max allowed: ${maxAllowedStepIndex}`)
    console.log('Current vendor data for navigation check:', {
      stallName: vendorData.stallName,
      vendorName: vendorData.vendorName,
      contactEmail: vendorData.contactEmail,
      contactPhone: vendorData.contactPhone,
      id: vendorData.id,
      userId: vendorData.userId,
      logoUrl: vendorData.logoUrl,
      operatingHours: !!vendorData.operatingHours,
      bankAccountNumber: vendorData.bankAccountNumber,
      bankIfscCode: vendorData.bankIfscCode,
      panNumber: vendorData.panNumber,
      maxOrdersPerHour: vendorData.maxOrdersPerHour,
      averagePreparationTime: vendorData.averagePreparationTime,
      onboardingStep: vendorData.onboardingStep,
      onboardingStatus: vendorData.onboardingStatus
    })
    
    if (stepIndex > maxAllowedStepIndex) {
      console.log(`Cannot navigate to step ${stepIndex}. Maximum allowed step is ${maxAllowedStepIndex}`)
      return
    }
    
    const step = STEPS[stepIndex]
    const url = vendorData.id 
      ? `/admin/${courtId}/vendors/onboard/${step.key}/${vendorData.id}`
      : `/admin/${courtId}/vendors/onboard/${step.key}`
    
    console.log(`Navigating to: ${url}`)
    // Use replace instead of push to avoid intermediate page loads
    router.replace(url)
  }

  const saveVendorData = async (stepData: any) => {
    try {
      setLoading(true)
      
      // Sanitize stepData to remove any circular references or non-serializable data
      const sanitizeData = (obj: any): any => {
        if (obj === null || typeof obj !== 'object') {
          return obj
        }
        
        if (obj instanceof HTMLElement || obj instanceof Event) {
          return undefined // Remove DOM elements and events
        }
        
        if (Array.isArray(obj)) {
          return obj.map(sanitizeData).filter(item => item !== undefined)
        }
        
        const sanitized: any = {}
        for (const [key, value] of Object.entries(obj)) {
          try {
            const sanitizedValue = sanitizeData(value)
            if (sanitizedValue !== undefined) {
              sanitized[key] = sanitizedValue
            }
          } catch (error) {
            // Skip properties that can't be serialized
            console.warn(`Skipping non-serializable property: ${key}`)
          }
        }
        return sanitized
      }
      
      const cleanStepData = sanitizeData(stepData)
      console.log('Saving step data:', cleanStepData)
      console.log('Step data keys:', Object.keys(cleanStepData || {}))
      if (cleanStepData?.status) {
        console.log('⚠️ WARNING: Step data contains status field:', cleanStepData.status)
      }
      
      if (vendorData.id) {
        // Update existing vendor
        const response = await fetch(`/api/admin/vendors/${vendorData.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...cleanStepData,
            courtId,
          }),
        })
        
        const result = await response.json()
        console.log('Update vendor response:', result)
        if (!result.success) {
          setError(result.message || "Failed to update vendor")
          return { success: false, vendorId: null }
        }
        
        console.log('Vendor updated successfully')
        return { success: true, vendorId: vendorData.id }
      } else {
        // Create new vendor
        const response = await fetch(`/api/admin/vendors`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...cleanStepData,
            courtId,
          }),
        })
        
        const result = await response.json()
        if (result.success) {
          // Update local data with created vendor
          const newVendorId = result.data.vendor.id
          setVendorData(prev => ({ ...prev, id: newVendorId }))
          return { success: true, vendorId: newVendorId }
        } else {
          setError(result.message || "Failed to create vendor")
          return { success: false, vendorId: null }
        }
      }
    } catch (error) {
      console.error("Save vendor data error:", error)
      setError("Failed to save vendor data")
      return { success: false, vendorId: null }
    } finally {
      setLoading(false)
    }
  }

  const goToNextStep = async (stepData?: any) => {
    // Set navigation state to prevent any intermediate renders
    setIsNavigating(true)
    
    let currentVendorId = vendorData.id
    
    if (stepData) {
      // Add onboarding tracking information to the step data
      const currentStepKey = STEPS[currentStepIndex].key
      const nextStepIndex = currentStepIndex + 1
      const nextStepKey = nextStepIndex < STEPS.length ? STEPS[nextStepIndex].key : 'completed'
      
      // Special handling for the final step (config -> success)
      const isCompletingOnboarding = currentStepKey === 'config' && nextStepKey === 'success'
      
      const dataWithOnboardingInfo = {
        ...stepData,
        onboardingStep: isCompletingOnboarding ? 'completed' : nextStepKey,
        onboardingStatus: isCompletingOnboarding ? 'completed' : 'in_progress'
      }
      
      console.log(`Completing step "${currentStepKey}", setting onboardingStep to "${dataWithOnboardingInfo.onboardingStep}", status to "${dataWithOnboardingInfo.onboardingStatus}"`)
      
      const saveResult = await saveVendorData(dataWithOnboardingInfo)
      if (!saveResult.success) {
        setIsNavigating(false)
        return
      }
      
      // Use the vendor ID from the save result (important for new vendors)
      currentVendorId = saveResult.vendorId
    }
    
    // Navigate immediately with the navigation state still set
    const nextStepIndex = currentStepIndex + 1
    if (nextStepIndex < STEPS.length) {
      const step = STEPS[nextStepIndex]
      const url = currentVendorId 
        ? `/admin/${courtId}/vendors/onboard/${step.key}/${currentVendorId}`
        : `/admin/${courtId}/vendors/onboard/${step.key}`
      
      console.log(`Direct navigation to: ${url}`)
      router.replace(url)
    }
  }

  const goToPrevStep = () => {
    goToStep(currentStepIndex - 1)
  }

  const currentStep = STEPS[currentStepIndex]
  const CurrentStepComponent = currentStep.component
  
  // Calculate progress based on actually completed steps, not current step position
  const getCompletedStepsCount = () => {
    let completedCount = 0
    
    // Step 0: Basic Details
    if (vendorData.stallName && vendorData.vendorName && vendorData.contactEmail && vendorData.contactPhone) {
      completedCount++
    } else return completedCount
    
    // Step 1: Password Creation (User account created)
    if (vendorData.userId) {
      completedCount++
    } else return completedCount
    
    // Step 2: Stall Setup (Logo uploaded)
    if (vendorData.logoUrl) {
      completedCount++
    } else return completedCount
    
    // Step 3: Operating Hours
    if (vendorData.operatingHours && Object.keys(vendorData.operatingHours).length > 0) {
      completedCount++
    } else return completedCount
    
    // Step 4: Bank Details
    if (vendorData.bankAccountNumber && vendorData.bankIfscCode) {
      completedCount++
    } else return completedCount
    
    // Step 5: Legal Compliance (PAN number)
    if (vendorData.panNumber) {
      completedCount++
    } else return completedCount
    
    // Step 6: Account Creation (Razorpay account - we'll check this via API or assume completed if we reach config)
    if (vendorData.onboardingStep && 
        ['config', 'success'].includes(vendorData.onboardingStep)) {
      completedCount++
    } else if (vendorData.onboardingStatus === 'completed') {
      completedCount++
    } else if (vendorData.onboardingStep === 'account') {
      // If we're currently on the account step, don't count it as completed yet
      return completedCount
    } else return completedCount
    
    // Step 7: Final Configuration
    if (vendorData.maxOrdersPerHour && vendorData.averagePreparationTime) {
      completedCount++
    } else return completedCount
    
    // Step 8: Success (Fully completed)
    if (vendorData.onboardingStatus === 'completed') {
      completedCount++
    }
    
    return completedCount
  }
  
  const completedStepsCount = getCompletedStepsCount()
  const progressPercentage = (completedStepsCount / STEPS.length) * 100

  if (loading || checkingIncompleteOnboarding || isNavigating) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Spinner size={32} variant="dark" className="mx-auto mb-4" />
          <p className="text-muted-foreground">
            {checkingIncompleteOnboarding ? "Checking for incomplete onboarding..." : 
             isNavigating ? "Navigating to next step..." : 
             "Initialising... Please Wait"}
          </p>
        </div>
      </div>
    )
  }

  // Don't render if we're about to redirect due to unauthorized access
  if (isUnauthorizedAccess()) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Spinner size={32} variant="dark" className="mx-auto mb-4" />
          <p className="text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => router.push(`/admin/${courtId}/vendors`)}
          className="gap-2 dark:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl dark:text-neutral-200 font-bold">
            Vendor Onboarding
          </h1>
          <p className="text-muted-foreground">
            {vendorId ? "Continue vendor onboarding process" : "Complete all steps to register a new vendor"}
          </p>
        </div>
      </div>

      {/* Progress */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              Step {currentStepIndex + 1} of {STEPS.length}: {currentStep.title}
            </CardTitle>
            <Badge variant="outline">
              {Math.round(progressPercentage)}% Complete
            </Badge>
          </div>
          <Progress value={progressPercentage} className="mt-2" />
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {STEPS.map((step, index) => {
              const maxAllowedStepIndex = getMaxAllowedStepIndex()
              const isAccessible = index <= maxAllowedStepIndex
              const isCompleted = isStepCompleted(index)
              const isCurrent = index === currentStepIndex
              
              return (
                <Badge
                  key={step.key}
                  variant={isCurrent ? "default" : isCompleted ? "secondary" : "outline"}
                  className={`cursor-pointer transition-opacity ${
                    isCompleted ? "bg-green-100 text-green-800" : ""
                  } ${
                    !isAccessible ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                  onClick={() => isAccessible ? goToStep(index) : null}
                >
                  {isCompleted && <CheckCircle className="h-3 w-3 mr-1" />}
                  {step.title}
                </Badge>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Current Step Component */}
      <CurrentStepComponent
        vendorData={vendorData}
        updateVendorData={updateVendorData}
        courtId={courtId}
        vendorId={vendorId || undefined}
        onNext={goToNextStep}
        onBack={goToPrevStep}
        loading={loading}
      />
    </div>
  )
}
