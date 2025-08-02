"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Loader2, CheckCircle, AlertCircle, CreditCard, Building2, User, MapPin } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"

interface AccountCreationStepProps {
  vendorData: any
  updateVendorData: (data: any) => void
  onNext: (data: any) => void
  onBack: () => void
  loading: boolean
  courtId: string
  vendorId?: string
}

interface RazorpayAccount {
  id: string
  entity: string
  type: string
  status: string
  email: string
  phone: string
  legal_business_name: string
  business_type: string
  contact_name: string
  profile: {
    category: string
    subcategory: string
    addresses: {
      registered: {
        street1: string
        street2?: string
        city: string
        state: string
        postal_code: string
        country: string
      }
    }
  }
  legal_info: {
    pan: string
    gst?: string
  }
  brand: {
    color?: string
  }
  notes: any
  created_at: number
}

export default function AccountCreationStep({
  vendorData,
  updateVendorData,
  onNext,
  onBack,
  loading,
  courtId,
  vendorId,
}: AccountCreationStepProps) {
  const [creatingAccount, setCreatingAccount] = useState(false)
  const [accountCreated, setAccountCreated] = useState(false)
  const [accountData, setAccountData] = useState<RazorpayAccount | null>(null)
  const [error, setError] = useState<string>("")
  const [isLinkedAccount, setIsLinkedAccount] = useState(false)

  // Debug logging for account creation initialization
  useEffect(() => {
    console.log('💳 Account Creation Step initialized with:', {
      vendorId,
      razorpayAccountId: vendorData.razorpayAccountId,
      accountCreated,
      isLinkedAccount
    })
  }, [])

  // Automatically start account creation when component loads
  useEffect(() => {
    if (vendorId && !accountCreated && !creatingAccount) {
      console.log('🚀 Auto-starting Razorpay account creation for vendor:', vendorId)
      createRazorpayAccount()
    }
  }, [vendorId, accountCreated, creatingAccount])

  const createRazorpayAccount = async () => {
    if (!vendorId) return

    setCreatingAccount(true)
    setError("")

    try {
      const response = await fetch(`/api/admin/vendors/${vendorId}/razorpay-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessType: vendorData.metadata?.businessType || vendorData.businessType,
          panDocFileId: vendorData.metadata?.panDocFileId || vendorData.panDocFileId,
          stallAddress: vendorData.stallLocation
        }),
      })

      const result = await response.json()

      if (result.success) {
        setAccountData(result.data.account)
        setAccountCreated(true)
        
        // Update local state
        const updatedData = {
          razorpayAccountId: result.data.account.id,
          metadata: {
            ...vendorData.metadata,
            razorpayAccountData: result.data.account,
            onboardingCompleted: true,
          }
        }
        updateVendorData(updatedData)
        
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
            console.error('Failed to persist Razorpay account ID to backend:', updateResult.message)
          } else {
            console.log('✅ Razorpay account ID successfully persisted to backend')
          }
        } catch (updateError) {
          console.error('Error persisting Razorpay account ID to backend:', updateError)
        }
      } else {
        setError(result.message || "Failed to create Razorpay account")
      }
    } catch (error) {
      console.error("Account creation error:", error)
      setError("Network error. Please check your connection and try again.")
    } finally {
      setCreatingAccount(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'created':
        return 'bg-neutral-100 text-neutral-800'
      case 'under_review':
        return 'bg-yellow-100 text-yellow-800'
      case 'activated':
        return 'bg-green-100 text-green-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (creatingAccount) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Spinner size={48} variant="dark" />
        <h3 className="text-lg font-semibold">Creating your Razorpay account...</h3>
        <p className="text-muted-foreground text-center max-w-md">
          We're setting up your payment processing account. This may take a few moments.
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Account Creation Failed:</strong> {error}
          </AlertDescription>
        </Alert>

        <div className="flex justify-between">
          <Button variant="outline" onClick={onBack}>
            Back to Previous Step
          </Button>
          <Button onClick={createRazorpayAccount} disabled={creatingAccount}>
            {creatingAccount ? (
              <>
                <Spinner size={16} variant="white" className="mr-2" />
                Retrying...
              </>
            ) : (
              "Try Again"
            )}
          </Button>
        </div>
      </div>
    )
  }

  if (!accountCreated || !accountData) {
    // Account is being created or not yet created, show loading state
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Spinner size={48} variant="dark" />
        <h3 className="text-lg font-semibold">Creating your Razorpay account...</h3>
        <p className="text-muted-foreground text-center max-w-md">
          We're setting up your payment processing account. This may take a few moments.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Only show success message if account was just created or linked, not if it was pre-existing */}
      {(accountCreated && !vendorData.razorpayAccountId) && (
        <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            <strong>Success!</strong> Your Razorpay merchant account has been {isLinkedAccount ? 'linked' : 'created'} successfully.
          </AlertDescription>
        </Alert>
      )}

      {/* Key Identifying Fields Card */}
      <Card className="border-neutral-200 dark:border-neutral-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
            <User className="h-5 w-5" />
            Key Account Identifiers
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            These fields uniquely identify this Razorpay account. Change any of these to create a different account.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
              <h4 className="font-medium text-sm text-neutral-800 dark:text-neutral-200 mb-1">Email Address</h4>
              <p className="text-sm font-mono">{vendorData.contactEmail}</p>
            </div>
            <div className="p-3 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
              <h4 className="font-medium text-sm text-neutral-800 dark:text-neutral-200 mb-1">Phone Number</h4>
              <p className="text-sm font-mono">{vendorData.contactPhone}</p>
            </div>
            <div className="p-3 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
              <h4 className="font-medium text-sm text-neutral-800 dark:text-neutral-200 mb-1">PAN Number</h4>
              <p className="text-sm font-mono">{vendorData.panNumber}</p>
            </div>
            <div className="p-3 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
              <h4 className="font-medium text-sm text-neutral-800 dark:text-neutral-200 mb-1">Business Name</h4>
              <p className="text-sm">{vendorData.stallName}</p>
            </div>
            {vendorData.gstin && (
              <div className="p-3 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
                <h4 className="font-medium text-sm text-neutral-800 dark:text-neutral-200 mb-1">GSTIN</h4>
                <p className="text-sm font-mono">{vendorData.gstin}</p>
              </div>
            )}
            <div className="p-3 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
              <h4 className="font-medium text-sm text-neutral-800 dark:text-neutral-200 mb-1">Business Type</h4>
              <p className="text-sm capitalize">{vendorData.metadata?.businessType || vendorData.businessType}</p>
            </div>
          </div>
          <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              <strong>Note:</strong> If you need to create a different account, modify the email, phone, PAN number, or business name in the previous steps, then return here.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Razorpay Account Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-1">Account ID</h4>
              <p className="font-mono text-sm bg-muted p-2 rounded">{accountData.id}</p>
            </div>
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-1">Status</h4>
              <Badge className={getStatusColor(accountData.status)}>
                {accountData.status?.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-1">Account Type</h4>
              <p className="capitalize">{accountData.type}</p>
            </div>
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-1">Created At</h4>
              <p className="text-sm">{formatDate(accountData.created_at)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Business Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-1">Legal Business Name</h4>
              <p>{accountData.legal_business_name}</p>
            </div>
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-1">Business Type</h4>
              <p className="capitalize">{accountData.business_type?.replace('_', ' ')}</p>
            </div>
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-1">Contact Name</h4>
              <p>{accountData.contact_name}</p>
            </div>
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-1">Category</h4>
              <p className="capitalize">{accountData.profile?.category}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Contact Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-1">Email</h4>
              <p>{accountData.email}</p>
            </div>
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-1">Phone</h4>
              <p>{accountData.phone}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {accountData.profile?.addresses?.registered && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Registered Address
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p>{accountData.profile.addresses.registered.street1}</p>
              {accountData.profile.addresses.registered.street2 && (
                <p>{accountData.profile.addresses.registered.street2}</p>
              )}
              <p>
                {accountData.profile.addresses.registered.city}, {accountData.profile.addresses.registered.state} - {accountData.profile.addresses.registered.postal_code}
              </p>
              <p>{accountData.profile.addresses.registered.country}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Legal Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-1">PAN</h4>
              <p className="font-mono">{accountData.legal_info?.pan}</p>
            </div>
            {accountData.legal_info?.gst && (
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-1">GST</h4>
                <p className="font-mono">{accountData.legal_info.gst}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Alert className="border-neutral-200 bg-neutral-50">
        <AlertCircle className="h-4 w-4 text-neutral-600" />
        <AlertDescription className="text-neutral-800">
          <strong>Next Steps:</strong> Your account is currently in "{accountData.status}" status. 
          Razorpay will review your documents and activate your account for receiving payments. 
          You'll receive email updates about the status.
        </AlertDescription>
      </Alert>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={() => {
          const dataToSend = { 
            razorpayAccountId: accountData?.id,
            razorpayAccountStatus: accountData?.status 
          }
          console.log('Sending data to onNext:', dataToSend)
          console.log('Account data status:', accountData?.status)
          onNext(dataToSend)
        }} className="gap-2">
          {isLinkedAccount ? "Proceed" : "Continue Setup"}
        </Button>
      </div>
    </div>
  )
}
