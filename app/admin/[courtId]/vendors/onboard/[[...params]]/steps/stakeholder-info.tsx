"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, User, MapPin, FileText, AlertCircle, CheckCircle } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"

interface StakeholderInfoStepProps {
  vendorData: any
  updateVendorData: (data: any) => void
  onNext: (data: any) => void
  onBack: () => void
  loading: boolean
  courtId: string
  vendorId?: string
}

interface StakeholderData {
  name: string
  email: string
  percentageOwnership: number
  relationship: {
    director: boolean
    executive: boolean
  }
  phone: {
    primary: string
    secondary?: string
  }
  addresses: {
    residential: {
      street: string
      city: string
      state: string
      postal_code: string
      country: string
    }
  }
  kyc: {
    pan: string
  }
  notes: {
    [key: string]: string
  }
}

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", 
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", 
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", 
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", 
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", 
  "Delhi", "Jammu and Kashmir", "Ladakh", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", 
  "Lakshadweep", "Puducherry"
]

export default function StakeholderInfoStep({
  vendorData,
  updateVendorData,
  onNext,
  onBack,
  loading,
  courtId,
  vendorId,
}: StakeholderInfoStepProps) {
  const [stakeholderData, setStakeholderData] = useState<StakeholderData>({
    name: "",
    email: "",
    percentageOwnership: 100,
    relationship: {
      director: true,
      executive: true
    },
    phone: {
      primary: "",
      secondary: ""
    },
    addresses: {
      residential: {
        street: "",
        city: "",
        state: "",
        postal_code: "",
        country: "IN"
      }
    },
    kyc: {
      pan: ""
    },
    notes: {}
  })

  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string>("")
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({})
  const [existingStakeholder, setExistingStakeholder] = useState<any>(null)
  const [loadingExistingData, setLoadingExistingData] = useState(false)
  const [viewMode, setViewMode] = useState(false)
  const [productConfigStatus, setProductConfigStatus] = useState<any>(null)
  const [currentProductConfig, setCurrentProductConfig] = useState<any>(null)
  const [loadingProductConfig, setLoadingProductConfig] = useState(false)
  const [updatingProductConfig, setUpdatingProductConfig] = useState(false)
  const [productConfigFormData, setProductConfigFormData] = useState<any>({})
  const [showProductConfigForm, setShowProductConfigForm] = useState(false)

  // Define fetchExistingStakeholder function first
  const fetchExistingStakeholder = async () => {
    if (!vendorId || !vendorData.metadata?.stakeholderId) {
      console.log('⚠️ Cannot fetch stakeholder: missing vendorId or stakeholderId', {
        vendorId,
        stakeholderId: vendorData.metadata?.stakeholderId
      })
      return
    }

    try {
      setLoadingExistingData(true)
      console.log('🔄 Fetching stakeholder data from API...')
      const response = await fetch(`/api/admin/vendors/${vendorId}/stakeholder`)
      const result = await response.json()

      if (result.success) {
        setExistingStakeholder(result.data.stakeholder)
        console.log('✅ Fetched existing stakeholder data:', result.data.stakeholder)
      } else {
        console.error('❌ Failed to fetch stakeholder data:', result.message)
      }
    } catch (error) {
      console.error('❌ Error fetching stakeholder data:', error)
    } finally {
      setLoadingExistingData(false)
    }
  }

  // Fetch current product configuration details
  const fetchProductConfiguration = async () => {
    if (!vendorId) {
      console.log('⚠️ Cannot fetch product configuration: missing vendorId')
      return
    }

    try {
      setLoadingProductConfig(true)
      console.log('🔄 Fetching product configuration details...')
      const response = await fetch(`/api/admin/vendors/${vendorId}/product-config`)
      const result = await response.json()

      if (result.success) {
        setCurrentProductConfig(result.data.currentConfig)
        console.log('✅ Fetched product configuration:', result.data.currentConfig)
        
        // Initialize form data with current values
        const config = result.data.currentConfig
        setProductConfigFormData({
          // Settlement details - prefer current config, fallback to vendor data
          'settlements.beneficiary_name': config.active_configuration?.settlements?.beneficiary_name || vendorData?.bankAccountHolderName || '',
          'settlements.account_number': config.active_configuration?.settlements?.account_number || vendorData?.bankAccountNumber || '',
          'settlements.ifsc_code': config.active_configuration?.settlements?.ifsc_code || vendorData?.bankIfscCode || '',
          
          // Contact and business info (typically handled at account level)
          'contact_name': '',
          'customer_facing_business_name': '',
          'name': '',
          'kyc.pan': '',
          
          // Address info
          'profile.address.operation.street1': '',
          'profile.address.operation.city': '',
          'profile.address.operation.postal_code': '',
          'profile.address.operation.state': '',
          
          // Email notifications
          'notifications.email': config.active_configuration?.notifications?.email?.join(', ') || '',
          
          // Checkout theme
          'checkout.theme_color': config.active_configuration?.checkout?.theme_color || '#FFFFFF',
          
          // Refund speed
          'refund.default_refund_speed': config.active_configuration?.refund?.default_refund_speed || 'normal'
        })
      } else {
        console.error('❌ Failed to fetch product configuration:', result.message)
      }
    } catch (error) {
      console.error('❌ Error fetching product configuration:', error)
    } finally {
      setLoadingProductConfig(false)
    }
  }

  // Update product configuration
  const updateProductConfiguration = async (formData: any) => {
    if (!vendorId) {
      setError("Vendor ID is required to update product configuration")
      return
    }

    setUpdatingProductConfig(true)
    setError("")

    try {
      // Get current requirements to determine what fields we can actually update
      const requiredFields = currentProductConfig?.requirements?.map((req: any) => req.field_reference) || []
      console.log('🔍 Required fields from Razorpay:', requiredFields)

      // Prepare update payload based only on required fields
      const updatePayload: any = {}

      // Handle settlements only if required
      const settlementFields = requiredFields.filter((field: string) => field.startsWith('settlements.'))
      if (settlementFields.length > 0) {
        updatePayload.settlements = {}
        if (settlementFields.includes('settlements.beneficiary_name') && formData['settlements.beneficiary_name']) {
          updatePayload.settlements.beneficiary_name = formData['settlements.beneficiary_name']
        }
        if (settlementFields.includes('settlements.account_number') && formData['settlements.account_number']) {
          updatePayload.settlements.account_number = formData['settlements.account_number']
        }
        if (settlementFields.includes('settlements.ifsc_code') && formData['settlements.ifsc_code']) {
          updatePayload.settlements.ifsc_code = formData['settlements.ifsc_code']
        }
      }

      // Handle notifications only if required
      if (requiredFields.some((field: string) => field.startsWith('notifications.')) && formData['notifications.email']) {
        updatePayload.notifications = {
          email: formData['notifications.email'].split(',').map((email: string) => email.trim()).filter(Boolean)
        }
      }

      // Handle checkout only if required
      if (requiredFields.some((field: string) => field.startsWith('checkout.')) && formData['checkout.theme_color']) {
        updatePayload.checkout = {
          theme_color: formData['checkout.theme_color']
        }
      }

      // Handle refund only if required
      if (requiredFields.some((field: string) => field.startsWith('refund.')) && formData['refund.default_refund_speed']) {
        updatePayload.refund = {
          default_refund_speed: formData['refund.default_refund_speed']
        }
      }

      // Handle contact and business fields (these typically go to account level, not product level)
      // We'll skip these for now as they usually need to be updated via account endpoints

      // Always add tnc_accepted if we're making any update
      if (Object.keys(updatePayload).length > 0) {
        updatePayload.tnc_accepted = true
        // Only add IP if specifically required
        if (requiredFields.includes('ip')) {
          updatePayload.ip = "127.0.0.1"
        }
      }

      if (Object.keys(updatePayload).length === 0) {
        setError("No valid fields to update based on current requirements")
        return
      }

      console.log('🔄 Updating product configuration with filtered payload:', updatePayload)

      const response = await fetch(`/api/admin/vendors/${vendorId}/product-config`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload)
      })

      const result = await response.json()

      if (result.success) {
        console.log('✅ Product configuration updated successfully')
        
        // Refresh product configuration data
        await fetchProductConfiguration()
        
        // Hide form and show success message
        setShowProductConfigForm(false)
        setError("")
      } else {
        console.error('❌ Failed to update product configuration:', result.message)
        setError(result.message || 'Failed to update product configuration')
      }
    } catch (error) {
      console.error('❌ Error updating product configuration:', error)
      setError('Internal error while updating product configuration')
    } finally {
      setUpdatingProductConfig(false)
    }
  }

  // Check for existing stakeholder on component mount - this runs first
  useEffect(() => {
    console.log('🔍 Checking for existing stakeholder on mount...')
    console.log('Full vendorData object:', vendorData)
    console.log('Vendor metadata:', vendorData?.metadata)
    console.log('VendorId:', vendorId)
    
    // Safety check - ensure vendorData exists
    if (!vendorData) {
      console.log('⚠️ vendorData is null/undefined, cannot check for existing stakeholder')
      return
    }
    
    // Check multiple conditions that indicate a stakeholder already exists
    const hasStakeholderId = vendorData?.metadata?.stakeholderId
    const hasStakeholderData = vendorData?.metadata?.stakeholderData
    const hasStakeholderCreated = vendorData?.metadata?.stakeholderCreated
    
    console.log('Stakeholder existence check:', {
      hasStakeholderId,
      hasStakeholderData,
      hasStakeholderCreated,
      stakeholderId: vendorData?.metadata?.stakeholderId,
      fullMetadata: vendorData?.metadata
    })
    
    if (hasStakeholderId || hasStakeholderCreated) {
      console.log('✅ Existing stakeholder detected! Setting view mode...')
      console.log('Setting: submitted=true, viewMode=true')
      setSubmitted(true)
      setViewMode(true)
      
      // If we have stakeholder data, populate it
      if (hasStakeholderData) {
        console.log('📋 Populating stakeholder data from metadata:', vendorData.metadata.stakeholderData)
        setStakeholderData(vendorData.metadata.stakeholderData)
      }
      
      // Fetch latest data from Razorpay
      fetchExistingStakeholder()
      
      // Fetch product configuration details if vendor has product config
      if (vendorData?.metadata?.productConfiguration?.productId) {
        fetchProductConfiguration()
      }
    } else {
      console.log('❌ No existing stakeholder found, showing creation form')
      console.log('Setting: submitted=false, viewMode=false')
      setViewMode(false)
      setSubmitted(false)
    }
    
    console.log('Final state after useEffect - viewMode:', viewMode, 'submitted:', submitted)
  }, [vendorData, vendorId]) // Run when vendorData or vendorId changes

  // Debug state changes
  useEffect(() => {
    console.log('📊 State updated - viewMode:', viewMode, 'submitted:', submitted)
  }, [viewMode, submitted])

  // Pre-fill with vendor data if available (only when creating new stakeholder)
  useEffect(() => {
    if (vendorData && !viewMode && !submitted) {
      console.log('📝 Pre-filling form with vendor data for new stakeholder creation')
      setStakeholderData(prev => ({
        ...prev,
        name: vendorData.vendorName || "",
        email: vendorData.contactEmail || "",
        phone: {
          primary: vendorData.contactPhone || "",
          secondary: ""
        },
        kyc: {
          pan: vendorData.panNumber || ""
        }
      }))
    }
  }, [vendorData, viewMode, submitted])

  const validateForm = () => {
    const errors: {[key: string]: string} = {}

    // Required fields validation
    if (!stakeholderData.name.trim()) {
      errors.name = "Stakeholder name is required"
    }

    if (!stakeholderData.email.trim()) {
      errors.email = "Email address is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(stakeholderData.email)) {
      errors.email = "Please enter a valid email address"
    }

    if (!stakeholderData.phone.primary.trim()) {
      errors.phone = "Primary phone number is required"
    } else if (!/^\+?[\d\s\-\(\)]{10,15}$/.test(stakeholderData.phone.primary)) {
      errors.phone = "Please enter a valid phone number"
    }

    if (stakeholderData.percentageOwnership <= 0 || stakeholderData.percentageOwnership > 100) {
      errors.ownership = "Ownership percentage must be between 0.01 and 100"
    }

    // Address validation
    if (!stakeholderData.addresses.residential.street.trim()) {
      errors.street = "Street address is required"
    }
    if (!stakeholderData.addresses.residential.city.trim()) {
      errors.city = "City is required"
    }
    if (!stakeholderData.addresses.residential.state.trim()) {
      errors.state = "State is required"
    }
    if (!stakeholderData.addresses.residential.postal_code.trim()) {
      errors.postalCode = "Postal code is required"
    } else if (!/^\d{6}$/.test(stakeholderData.addresses.residential.postal_code)) {
      errors.postalCode = "Please enter a valid 6-digit postal code"
    }

    // PAN validation for stakeholder (4th character must be 'P')
    if (!stakeholderData.kyc.pan.trim()) {
      errors.pan = "PAN number is required"
    } else if (!/^[A-Z]{3}P[A-Z]{1}[0-9]{4}[A-Z]{1}$/.test(stakeholderData.kyc.pan.toUpperCase())) {
      errors.pan = "Please enter a valid stakeholder PAN number (e.g., AVOPB1111K) - 4th character must be 'P'"
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleInputChange = (field: string, value: any) => {
    const keys = field.split('.')
    setStakeholderData(prev => {
      const updated = { ...prev }
      let current = updated as any
      
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]]
      }
      current[keys[keys.length - 1]] = value
      
      return updated
    })

    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: ""
      }))
    }
  }

  const handleSubmit = async () => {
    if (!validateForm()) {
      return
    }

    if (!vendorId) {
      setError("Vendor ID is required to create stakeholder")
      return
    }

    setSubmitting(true)
    setError("")

    try {
      // Prepare the stakeholder data for API
      const stakeholderPayload = {
        name: stakeholderData.name,
        email: stakeholderData.email,
        percentage_ownership: stakeholderData.percentageOwnership,
        relationship: stakeholderData.relationship,
        phone: {
          primary: stakeholderData.phone.primary,
          ...(stakeholderData.phone.secondary && { secondary: stakeholderData.phone.secondary })
        },
        addresses: stakeholderData.addresses,
        kyc: stakeholderData.kyc,
        notes: {
          created_by: "onboarding_flow",
          vendor_id: vendorId,
          court_id: courtId,
          ...stakeholderData.notes
        }
      }

      console.log('📤 Creating stakeholder with payload:', stakeholderPayload)

      const response = await fetch(`/api/admin/vendors/${vendorId}/stakeholder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(stakeholderPayload),
      })

      const result = await response.json()

      if (result.success) {
        console.log('✅ Stakeholder created successfully:', result.data)
        
        // Check if product configuration was also requested
        if (result.data.productConfiguration) {
          console.log('🏛️ Product configuration status:', result.data.productConfiguration)
          if (result.data.productConfiguration.productId) {
            console.log('✅ Product configuration requested successfully:', result.data.productConfiguration.productId)
            console.log('📊 Activation status:', result.data.productConfiguration.activationStatus)
            console.log('📋 Requirements:', result.data.productConfiguration.requirements)
          } else {
            console.log('⚠️ Product configuration request failed:', result.data.productConfiguration.error)
          }
        }
        
        // Update vendor data with stakeholder information and product config
        const updatedData = {
          metadata: {
            ...vendorData.metadata,
            stakeholderData: stakeholderData,
            stakeholderId: result.data.stakeholder.id,
            stakeholderCreated: true,
            // Include product configuration if available
            ...(result.data.productConfiguration && result.data.productConfiguration.productId && {
              productConfiguration: {
                productId: result.data.productConfiguration.productId,
                productName: result.data.productConfiguration.productName,
                activationStatus: result.data.productConfiguration.activationStatus,
                requirements: result.data.productConfiguration.requirements,
                requestedAt: Date.now(),
                message: result.data.productConfiguration.message
              },
              productConfigurationRequested: true
            })
          }
        }
        
        updateVendorData(updatedData)
        setSubmitted(true)
        
        // Set product configuration status for UI display
        if (result.data.productConfiguration) {
          setProductConfigStatus(result.data.productConfiguration)
          
          // Automatically update product configuration with bank details if there are requirements
          if (result.data.productConfiguration.requirements && 
              result.data.productConfiguration.requirements.length > 0 &&
              result.data.productConfiguration.productId) {
            
            console.log('🔄 Automatically updating product configuration with bank details...')
            
            try {
              const updateResponse = await fetch(`/api/admin/vendors/${vendorId}/product-config`, {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                }
              })
              
              if (updateResponse.ok) {
                const updateResult = await updateResponse.json()
                if (updateResult.success) {
                  console.log('✅ Product configuration automatically updated with bank details')
                  // Update the display status with the new configuration
                  setProductConfigStatus(updateResult.data.productConfiguration)
                } else {
                  console.log('⚠️ Could not automatically update product configuration:', updateResult.message)
                }
              } else {
                console.log('⚠️ Could not automatically update product configuration: HTTP', updateResponse.status)
              }
            } catch (autoUpdateError) {
              console.log('⚠️ Could not automatically update product configuration:', autoUpdateError)
              // Don't show error to user as this is an automatic attempt
            }
          }
        }
        
        // Also persist to backend immediately
        try {
          const updateResponse = await fetch(`/api/admin/vendors/${vendorId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...updatedData,
              courtId
            })
          })
          
          const updateResult = await updateResponse.json()
          if (!updateResult.success) {
            console.error('Failed to persist stakeholder data to backend:', updateResult.message)
          } else {
            console.log('✅ Stakeholder data successfully persisted to backend')
          }
        } catch (updateError) {
          console.error('Error persisting stakeholder data to backend:', updateError)
        }
        
      } else {
        setError(result.message || "Failed to create stakeholder")
      }
    } catch (error) {
      console.error("Stakeholder creation error:", error)
      setError("Network error. Please check your connection and try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (submitting) {
    console.log('🔄 Rendering: submitting state')
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Spinner size={48} variant="dark" />
        <h3 className="text-lg font-semibold">Creating Stakeholder Profile...</h3>
        <p className="text-muted-foreground text-center max-w-md">
          We're adding stakeholder information to your Razorpay account. This may take a few moments.
        </p>
      </div>
    )
  }

  // Display existing stakeholder information
  console.log('🎯 Render check - viewMode:', viewMode, 'submitted:', submitted)
  if (viewMode && submitted) {
    console.log('✅ Rendering: stakeholder view mode')
    const displayData = existingStakeholder || stakeholderData || vendorData.metadata?.stakeholderData
    
    return (
      <div className="space-y-6">
        <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            <strong>Stakeholder Already Configured!</strong> The stakeholder information has been successfully added to your Razorpay account.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 justify-between">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Stakeholder Information
              </div>
              <div className="flex gap-2">
                {loadingExistingData && <Spinner size={16} variant="dark" />}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={fetchExistingStakeholder}
                  disabled={loadingExistingData}
                >
                  Refresh Data
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setViewMode(false)}
                >
                  Edit
                </Button>
              </div>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {vendorData.metadata?.stakeholderId && (
                <span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                  Stakeholder ID: {vendorData.metadata.stakeholderId}
                </span>
              )}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingExistingData ? (
              <div className="flex items-center justify-center py-8">
                <Spinner size={32} variant="dark" />
                <span className="ml-2">Loading stakeholder details...</span>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Name</Label>
                      <p className="text-sm font-medium">{displayData?.name || vendorData?.vendorName || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                      <p className="text-sm">{displayData?.email || vendorData?.contactEmail || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">PAN Number</Label>
                      <p className="text-sm font-mono">{displayData?.kyc?.pan || existingStakeholder?.notes?.original_pan || vendorData?.panNumber || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Ownership Percentage</Label>
                      <p className="text-sm">{existingStakeholder?.notes?.percentage_ownership || displayData?.percentageOwnership || 'N/A'}%</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Primary Phone</Label>
                      <p className="text-sm">{existingStakeholder?.notes?.phone_primary || displayData?.phone?.primary || vendorData?.contactPhone || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Role</Label>
                      <div className="flex gap-2">
                        {(existingStakeholder?.notes?.relationship_director === 'true' || displayData?.relationship?.director) && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Director</span>
                        )}
                        {(existingStakeholder?.notes?.relationship_executive === 'true' || displayData?.relationship?.executive) && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Executive</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {displayData?.addresses?.residential && (
                  <div className="mt-6">
                    <Label className="text-sm font-medium text-muted-foreground">Residential Address</Label>
                    <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-md">
                      <p className="text-sm">
                        {displayData.addresses.residential.street}<br />
                        {displayData.addresses.residential.city}, {displayData.addresses.residential.state} {displayData.addresses.residential.postal_code}<br />
                        {displayData.addresses.residential.country}
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Product Configuration Status */}
        {(productConfigStatus || vendorData.metadata?.productConfiguration) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Route Product Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(() => {
                const config = productConfigStatus || vendorData.metadata?.productConfiguration
                const hasProductId = config?.productId
                
                if (hasProductId) {
                  return (
                    <>
                      <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
                        <CheckCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <AlertDescription className="text-blue-800 dark:text-blue-200">
                          <strong>Product Configuration Requested!</strong> Route product has been configured with Razorpay.
                        </AlertDescription>
                      </Alert>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Product ID</Label>
                          <p className="text-sm font-mono">{config.productId}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Product Name</Label>
                          <p className="text-sm">{config.productName || 'route'}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Activation Status</Label>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-1 rounded ${
                              config.activationStatus === 'activated' 
                                ? 'bg-green-100 text-green-800'
                                : config.activationStatus === 'under_review'
                                ? 'bg-yellow-100 text-yellow-800'
                                : config.activationStatus === 'needs_clarification'
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {config.activationStatus}
                            </span>
                          </div>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Requested At</Label>
                          <p className="text-sm">
                            {config.requestedAt 
                              ? new Date(config.requestedAt * 1000).toLocaleString()
                              : new Date().toLocaleString()
                            }
                          </p>
                        </div>
                      </div>

                      {config.requirements && config.requirements.length > 0 && (
                        <div className="mt-4">
                          <div className="flex items-center justify-between mb-2">
                            <Label className="text-sm font-medium text-muted-foreground">Requirements</Label>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs"
                              onClick={async () => {
                                try {
                                  setLoadingExistingData(true)
                                  console.log('🔄 Updating product configuration with bank details...')
                                  
                                  const response = await fetch(`/api/admin/vendors/${vendorId}/product-config`, {
                                    method: 'PATCH',
                                    headers: {
                                      'Content-Type': 'application/json',
                                    }
                                  })
                                  
                                  console.log('📊 Response status:', response.status, response.statusText)
                                  
                                  if (!response.ok) {
                                    const errorText = await response.text()
                                    console.error('❌ HTTP Error:', errorText)
                                    setError(`Failed to update product configuration: ${response.status} ${response.statusText}`)
                                    return
                                  }
                                  
                                  const result = await response.json()
                                  console.log('✅ Product configuration response:', result)
                                  
                                  if (result.success) {
                                    console.log('✅ Product configuration updated successfully')
                                    // Refresh the vendor data to get updated configuration
                                    window.location.reload()
                                  } else {
                                    console.error('❌ Failed to update product configuration:', result.message)
                                    setError(result.message)
                                  }
                                } catch (error) {
                                  console.error('❌ Error updating product configuration:', error)
                                  setError('Failed to update product configuration: ' + (error instanceof Error ? error.message : String(error)))
                                } finally {
                                  setLoadingExistingData(false)
                                }
                              }}
                              disabled={loadingExistingData}
                            >
                              {loadingExistingData ? (
                                <>
                                  <Spinner size={12} className="mr-2" />
                                  Updating...
                                </>
                              ) : (
                                'Retry Update'
                              )}
                            </Button>
                          </div>
                          <div className="space-y-2">
                            {config.requirements.map((req: any, index: number) => (
                              <div key={index} className="p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-md">
                                <div className="flex items-center gap-2">
                                  <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                                  <span className="text-sm font-medium">{req.field_reference}</span>
                                  <span className={`text-xs px-2 py-1 rounded ${
                                    req.status === 'required' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                                  }`}>
                                    {req.status}
                                  </span>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
                                  Reason: {req.reason_code}
                                </p>
                              </div>
                            ))}
                            <div className="text-xs text-muted-foreground mt-2">
                              💡 These requirements should be automatically resolved with your bank details. If not, click "Retry Update".
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )
                } else if (config?.error) {
                  return (
                    <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
                      <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                      <AlertDescription className="text-red-800 dark:text-red-200">
                        <strong>Product Configuration Failed:</strong> {config.error}
                      </AlertDescription>
                    </Alert>
                  )
                } else {
                  return (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Product configuration status unknown. Please contact support.
                      </AlertDescription>
                    </Alert>
                  )
                }
              })()}
            </CardContent>
          </Card>
        )}

        {/* Detailed Product Configuration Section */}
        {currentProductConfig && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Product Configuration Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Current Status */}
              <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <h4 className="font-semibold mb-2">Current Status</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Product ID:</span>
                    <span className="font-mono ml-2">{currentProductConfig.id}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>
                    <span className={`ml-2 px-2 py-1 rounded text-xs ${
                      currentProductConfig.activation_status === 'activated' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : currentProductConfig.activation_status === 'needs_clarification'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                    }`}>
                      {currentProductConfig.activation_status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Active Configuration */}
              {currentProductConfig.active_configuration && (
                <div className="space-y-4">
                  <h4 className="font-semibold">Active Configuration</h4>
                  
                  {/* Settlement Details */}
                  {currentProductConfig.active_configuration.settlements && (
                    <div className="p-3 border rounded-lg">
                      <h5 className="font-medium mb-2">Settlement Details</h5>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                        <div>
                          <span className="text-muted-foreground">Beneficiary:</span>
                          <span className="block font-mono">{currentProductConfig.active_configuration.settlements.beneficiary_name || 'Not set'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Account:</span>
                          <span className="block font-mono">{currentProductConfig.active_configuration.settlements.account_number || 'Not set'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">IFSC:</span>
                          <span className="block font-mono">{currentProductConfig.active_configuration.settlements.ifsc_code || 'Not set'}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Other Configuration Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Checkout Settings */}
                    {currentProductConfig.active_configuration.checkout && (
                      <div className="p-3 border rounded-lg">
                        <h5 className="font-medium mb-2">Checkout Settings</h5>
                        <div className="space-y-1 text-sm">
                          <div>Theme: <span className="font-mono">{currentProductConfig.active_configuration.checkout.theme_color}</span></div>
                          <div>Flash Checkout: {currentProductConfig.active_configuration.checkout.flash_checkout ? 'Enabled' : 'Disabled'}</div>
                        </div>
                      </div>
                    )}

                    {/* Notifications */}
                    {currentProductConfig.active_configuration.notifications && (
                      <div className="p-3 border rounded-lg">
                        <h5 className="font-medium mb-2">Notifications</h5>
                        <div className="space-y-1 text-sm">
                          <div>WhatsApp: {currentProductConfig.active_configuration.notifications.whatsapp ? 'Enabled' : 'Disabled'}</div>
                          <div>SMS: {currentProductConfig.active_configuration.notifications.sms ? 'Enabled' : 'Disabled'}</div>
                          <div>Email: {currentProductConfig.active_configuration.notifications.email?.join(', ') || 'None'}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Requirements Section */}
              {currentProductConfig.requirements && currentProductConfig.requirements.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-orange-600 dark:text-orange-400">
                      Outstanding Requirements ({currentProductConfig.requirements.length})
                    </h4>
                    <Button 
                      onClick={() => setShowProductConfigForm(!showProductConfigForm)}
                      variant="outline"
                      size="sm"
                    >
                      {showProductConfigForm ? 'Hide Form' : 'Update Configuration'}
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {currentProductConfig.requirements.map((req: any, index: number) => (
                      <div key={index} className="p-3 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium text-orange-800 dark:text-orange-200">
                              {req.field_reference}
                            </span>
                            <span className="ml-2 text-sm text-orange-600 dark:text-orange-400">
                              ({req.reason_code})
                            </span>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs ${
                            req.status === 'required' 
                              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                          }`}>
                            {req.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Product Configuration Update Form */}
                  {showProductConfigForm && (
                    <Card className="border-blue-200 dark:border-blue-800">
                      <CardHeader>
                        <CardTitle className="text-lg">Update Product Configuration</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <form onSubmit={(e) => {
                          e.preventDefault()
                          updateProductConfiguration(productConfigFormData)
                        }}>
                          
                          {/* Settlement Details - Only show if required */}
                          {currentProductConfig.requirements.some((req: any) => req.field_reference.startsWith('settlements.')) && (
                            <div className="space-y-4">
                              <h5 className="font-medium">Settlement Details</h5>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {currentProductConfig.requirements.some((req: any) => req.field_reference === 'settlements.beneficiary_name') && (
                                  <div>
                                    <Label htmlFor="beneficiary_name">Beneficiary Name *</Label>
                                    <Input
                                      id="beneficiary_name"
                                      value={productConfigFormData['settlements.beneficiary_name'] || ''}
                                      onChange={(e) => setProductConfigFormData((prev: any) => ({
                                        ...prev,
                                        'settlements.beneficiary_name': e.target.value
                                      }))}
                                      placeholder="Account holder name"
                                      required
                                    />
                                  </div>
                                )}
                                {currentProductConfig.requirements.some((req: any) => req.field_reference === 'settlements.account_number') && (
                                  <div>
                                    <Label htmlFor="account_number">Account Number *</Label>
                                    <Input
                                      id="account_number"
                                      value={productConfigFormData['settlements.account_number'] || ''}
                                      onChange={(e) => setProductConfigFormData((prev: any) => ({
                                        ...prev,
                                        'settlements.account_number': e.target.value
                                      }))}
                                      placeholder="Bank account number"
                                      required
                                    />
                                  </div>
                                )}
                                {currentProductConfig.requirements.some((req: any) => req.field_reference === 'settlements.ifsc_code') && (
                                  <div>
                                    <Label htmlFor="ifsc_code">IFSC Code *</Label>
                                    <Input
                                      id="ifsc_code"
                                      value={productConfigFormData['settlements.ifsc_code'] || ''}
                                      onChange={(e) => setProductConfigFormData((prev: any) => ({
                                        ...prev,
                                        'settlements.ifsc_code': e.target.value
                                      }))}
                                      placeholder="IFSC code"
                                      required
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Notifications - Only show if required */}
                          {currentProductConfig.requirements.some((req: any) => req.field_reference.startsWith('notifications.')) && (
                            <div className="space-y-4">
                              <h5 className="font-medium">Notification Settings</h5>
                              <div>
                                <Label htmlFor="email_notifications">Email Addresses (comma-separated) *</Label>
                                <Input
                                  id="email_notifications"
                                  value={productConfigFormData['notifications.email'] || ''}
                                  onChange={(e) => setProductConfigFormData((prev: any) => ({
                                    ...prev,
                                    'notifications.email': e.target.value
                                  }))}
                                  placeholder="email1@example.com, email2@example.com"
                                  required
                                />
                              </div>
                            </div>
                          )}

                          {/* Checkout Settings - Only show if required */}
                          {currentProductConfig.requirements.some((req: any) => req.field_reference.startsWith('checkout.')) && (
                            <div className="space-y-4">
                              <h5 className="font-medium">Checkout Settings</h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <Label htmlFor="theme_color">Theme Color</Label>
                                  <Input
                                    id="theme_color"
                                    type="color"
                                    value={productConfigFormData['checkout.theme_color'] || '#FFFFFF'}
                                    onChange={(e) => setProductConfigFormData((prev: any) => ({
                                      ...prev,
                                      'checkout.theme_color': e.target.value
                                    }))}
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Refund Settings - Only show if required */}
                          {currentProductConfig.requirements.some((req: any) => req.field_reference.startsWith('refund.')) && (
                            <div className="space-y-4">
                              <h5 className="font-medium">Refund Settings</h5>
                              <div>
                                <Label htmlFor="refund_speed">Default Refund Speed</Label>
                                <Select 
                                  value={productConfigFormData['refund.default_refund_speed'] || 'normal'}
                                  onValueChange={(value) => setProductConfigFormData((prev: any) => ({
                                    ...prev,
                                    'refund.default_refund_speed': value
                                  }))}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="normal">Normal</SelectItem>
                                    <SelectItem value="optimum">Optimum</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          )}

                          {/* Message for non-product level fields */}
                          {currentProductConfig.requirements.some((req: any) => 
                            req.field_reference.includes('contact_name') || 
                            req.field_reference.includes('customer_facing_business_name') ||
                            req.field_reference.includes('name') ||
                            req.field_reference.includes('kyc.pan') ||
                            req.field_reference.includes('profile.address')
                          ) && (
                            <Alert className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
                              <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                              <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                                <strong>Note:</strong> Some requirements (contact info, business details, address) need to be updated at the account level and cannot be modified through this product configuration form. These will need to be handled through Razorpay's dashboard or separate account APIs.
                              </AlertDescription>
                            </Alert>
                          )}

                          {/* Submit Button */}
                          <div className="flex justify-end gap-3">
                            <Button 
                              type="button" 
                              variant="outline" 
                              onClick={() => setShowProductConfigForm(false)}
                            >
                              Cancel
                            </Button>
                            <Button 
                              type="submit" 
                              disabled={updatingProductConfig}
                            >
                              {updatingProductConfig ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Updating...
                                </>
                              ) : (
                                'Update Configuration'
                              )}
                            </Button>
                          </div>

                        </form>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* Refresh Button */}
              <div className="flex justify-center">
                <Button 
                  onClick={fetchProductConfiguration}
                  disabled={loadingProductConfig}
                  variant="outline"
                  size="sm"
                >
                  {loadingProductConfig ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    'Refresh Configuration'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-between">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button onClick={() => onNext({ stakeholderId: vendorData.metadata?.stakeholderId })}>
            Continue to Final Configuration
          </Button>
        </div>
      </div>
    )
  }

  console.log('📝 Rendering: creation form - viewMode:', viewMode, 'submitted:', submitted)
  return (
    <div className="space-y-6">
      {submitted && (
        <div className="space-y-4">
          <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertDescription className="text-green-800 dark:text-green-200">
              <strong>Success!</strong> Stakeholder information has been added to your Razorpay account successfully.
            </AlertDescription>
          </Alert>
          
          {productConfigStatus && (
            <Alert className={`${
              productConfigStatus.productId 
                ? "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950"
                : "border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950"
            }`}>
              <FileText className={`h-4 w-4 ${
                productConfigStatus.productId 
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-yellow-600 dark:text-yellow-400"
              }`} />
              <AlertDescription className={`${
                productConfigStatus.productId 
                  ? "text-blue-800 dark:text-blue-200"
                  : "text-yellow-800 dark:text-yellow-200"
              }`}>
                {productConfigStatus.productId ? (
                  <>
                    <strong>Route Product Configured!</strong> Payment routing has been set up. 
                    Status: <span className="font-mono text-sm">{productConfigStatus.activationStatus}</span>
                    {productConfigStatus.requirements && productConfigStatus.requirements.length > 0 && (
                      <span className="block mt-1 text-sm">
                        Note: {productConfigStatus.requirements.length} additional requirement(s) may need to be fulfilled.
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <strong>Product Configuration Notice:</strong> {productConfigStatus.error || productConfigStatus.message}
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Error:</strong> {error}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Stakeholder Information
            {submitted && (
              <span className="text-sm font-normal text-green-600 ml-2">(✓ Already Created - Editing)</span>
            )}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Provide details about the primary stakeholder of this business. This information is required by Razorpay for KYC compliance.
            {submitted && (
              <span className="block mt-1 text-amber-600">
                Note: This stakeholder already exists. You can update the information if needed.
              </span>
            )}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stakeholder-name">Full Name (as per PAN card) *</Label>
              <Input
                id="stakeholder-name"
                value={stakeholderData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter full name"
                className={validationErrors.name ? "border-red-500" : ""}
              />
              {validationErrors.name && (
                <p className="text-sm text-red-600">{validationErrors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="stakeholder-email">Email Address *</Label>
              <Input
                id="stakeholder-email"
                type="email"
                value={stakeholderData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="Enter email address"
                className={validationErrors.email ? "border-red-500" : ""}
              />
              {validationErrors.email && (
                <p className="text-sm text-red-600">{validationErrors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="primary-phone">Primary Phone Number *</Label>
              <Input
                id="primary-phone"
                value={stakeholderData.phone.primary}
                onChange={(e) => handleInputChange('phone.primary', e.target.value)}
                placeholder="Enter primary phone number"
                className={validationErrors.phone ? "border-red-500" : ""}
              />
              {validationErrors.phone && (
                <p className="text-sm text-red-600">{validationErrors.phone}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="secondary-phone">Secondary Phone Number</Label>
              <Input
                id="secondary-phone"
                value={stakeholderData.phone.secondary}
                onChange={(e) => handleInputChange('phone.secondary', e.target.value)}
                placeholder="Enter secondary phone number (optional)"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ownership">Ownership Percentage *</Label>
              <Input
                id="ownership"
                type="number"
                min="0.01"
                max="100"
                step="0.01"
                value={stakeholderData.percentageOwnership}
                onChange={(e) => handleInputChange('percentageOwnership', parseFloat(e.target.value) || 0)}
                placeholder="Enter ownership percentage"
                className={validationErrors.ownership ? "border-red-500" : ""}
              />
              {validationErrors.ownership && (
                <p className="text-sm text-red-600">{validationErrors.ownership}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="pan">PAN Number (Stakeholder) *</Label>
              <Input
                id="pan"
                value={stakeholderData.kyc.pan}
                onChange={(e) => handleInputChange('kyc.pan', e.target.value.toUpperCase())}
                placeholder="Enter stakeholder PAN (e.g., AVOPB1111K) - 4th character must be 'P'"
                className={validationErrors.pan ? "border-red-500" : ""}
              />
              {validationErrors.pan && (
                <p className="text-sm text-red-600">{validationErrors.pan}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Note: Stakeholder PAN format requires the 4th character to be 'P' (e.g., AVOPB1111K)
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium">Relationship with Business</h4>
            <div className="flex gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="director"
                  checked={stakeholderData.relationship.director}
                  onCheckedChange={(checked) => handleInputChange('relationship.director', checked)}
                />
                <Label htmlFor="director">Director</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="executive"
                  checked={stakeholderData.relationship.executive}
                  onCheckedChange={(checked) => handleInputChange('relationship.executive', checked)}
                />
                <Label htmlFor="executive">Executive</Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Residential Address
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="street">Street Address *</Label>
            <Input
              id="street"
              value={stakeholderData.addresses.residential.street}
              onChange={(e) => handleInputChange('addresses.residential.street', e.target.value)}
              placeholder="Enter street address"
              className={validationErrors.street ? "border-red-500" : ""}
            />
            {validationErrors.street && (
              <p className="text-sm text-red-600">{validationErrors.street}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                value={stakeholderData.addresses.residential.city}
                onChange={(e) => handleInputChange('addresses.residential.city', e.target.value)}
                placeholder="Enter city"
                className={validationErrors.city ? "border-red-500" : ""}
              />
              {validationErrors.city && (
                <p className="text-sm text-red-600">{validationErrors.city}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">State *</Label>
              <Select
                value={stakeholderData.addresses.residential.state}
                onValueChange={(value) => handleInputChange('addresses.residential.state', value)}
              >
                <SelectTrigger className={validationErrors.state ? "border-red-500" : ""}>
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {INDIAN_STATES.map((state) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {validationErrors.state && (
                <p className="text-sm text-red-600">{validationErrors.state}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="postal-code">Postal Code *</Label>
              <Input
                id="postal-code"
                value={stakeholderData.addresses.residential.postal_code}
                onChange={(e) => handleInputChange('addresses.residential.postal_code', e.target.value)}
                placeholder="Enter 6-digit postal code"
                className={validationErrors.postalCode ? "border-red-500" : ""}
              />
              {validationErrors.postalCode && (
                <p className="text-sm text-red-600">{validationErrors.postalCode}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value="India"
                disabled
                className="bg-muted"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
        <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <AlertDescription className="text-blue-800 dark:text-blue-200">
          <strong>Note:</strong> This information is required by Razorpay for regulatory compliance and KYC verification. 
          Ensure all details match the stakeholder's official documents.
        </AlertDescription>
      </Alert>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} disabled={submitting}>
          Back
        </Button>
        {!submitted ? (
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <>
                <Spinner size={16} variant="white" className="mr-2" />
                Creating Stakeholder...
              </>
            ) : (
              "Create Stakeholder"
            )}
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setViewMode(true)
                setSubmitted(true)
              }}
            >
              View Details
            </Button>
            <Button onClick={() => onNext({ stakeholderId: vendorData.metadata?.stakeholderId })}>
              Continue to Final Configuration
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
