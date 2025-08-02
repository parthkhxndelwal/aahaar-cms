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

  // Pre-fill with vendor data if available
  useEffect(() => {
    if (vendorData) {
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
  }, [vendorData])

  // Check if stakeholder already exists
  useEffect(() => {
    if (vendorData.metadata?.stakeholderData && vendorData.metadata?.stakeholderId) {
      console.log('💼 Stakeholder already exists, showing existing data')
      setStakeholderData(vendorData.metadata.stakeholderData)
      setSubmitted(true)
    }
  }, [vendorData])

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

    // PAN validation
    if (!stakeholderData.kyc.pan.trim()) {
      errors.pan = "PAN number is required"
    } else if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(stakeholderData.kyc.pan.toUpperCase())) {
      errors.pan = "Please enter a valid PAN number (e.g., ABCDE1234F)"
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
        
        // Update vendor data with stakeholder information
        const updatedData = {
          metadata: {
            ...vendorData.metadata,
            stakeholderData: stakeholderData,
            stakeholderId: result.data.stakeholder.id,
            stakeholderCreated: true,
          }
        }
        
        updateVendorData(updatedData)
        setSubmitted(true)
        
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

  return (
    <div className="space-y-6">
      {submitted && (
        <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            <strong>Success!</strong> Stakeholder information has been added to your Razorpay account successfully.
          </AlertDescription>
        </Alert>
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
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Provide details about the primary stakeholder of this business. This information is required by Razorpay for KYC compliance.
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
              <Label htmlFor="pan">PAN Number *</Label>
              <Input
                id="pan"
                value={stakeholderData.kyc.pan}
                onChange={(e) => handleInputChange('kyc.pan', e.target.value.toUpperCase())}
                placeholder="Enter PAN number (e.g., ABCDE1234F)"
                className={validationErrors.pan ? "border-red-500" : ""}
              />
              {validationErrors.pan && (
                <p className="text-sm text-red-600">{validationErrors.pan}</p>
              )}
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
          <Button onClick={() => onNext({ stakeholderId: vendorData.metadata?.stakeholderId })}>
            Continue to Final Configuration
          </Button>
        )}
      </div>
    </div>
  )
}
