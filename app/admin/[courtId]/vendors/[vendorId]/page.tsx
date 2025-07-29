"use client"

import { useState, useEffect } from "react"
import { use } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Save, Upload, MapPin, Clock, DollarSign, Settings, User, Plus } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"

interface Vendor {
  id: string
  stallName: string
  vendorName: string
  contactEmail: string
  contactPhone: string
  stallLocation?: string
  logoUrl?: string
  bannerUrl?: string
  cuisineType?: string
  description?: string
  status: "active" | "inactive" | "maintenance" | "suspended"
  isOnline: boolean
  rating?: number
  totalRatings?: number
  maxConcurrentOrders: number
  maxOrdersPerHour: number
  averagePreparationTime: number
  operatingHours: {
    [key: string]: { open: string; close: string; closed: boolean }
  }
  breakTimes: Array<{ start: string; end: string; description?: string }>
  bankAccountNumber?: string
  bankIfscCode?: string
  bankAccountHolderName?: string
  bankName?: string
  panNumber?: string
  gstin?: string
  razorpayAccountId?: string
  payoutSettings: {
    autoPayoutEnabled: boolean
    payoutFrequency: "daily" | "weekly" | "manual"
    minimumPayoutAmount: number
  }
}

export default function VendorEditPage({ 
  params,
  searchParams
}: { 
  params: Promise<{ courtId: string; vendorId: string }>
  searchParams: Promise<{ mode?: "view" | "edit" }>
}) {
  const [vendor, setVendor] = useState<Vendor | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [creatingRazorpayAccount, setCreatingRazorpayAccount] = useState(false)
  const [fetchingRazorpayAccount, setFetchingRazorpayAccount] = useState(false)
  const [razorpayAccountInfo, setRazorpayAccountInfo] = useState<any>(null)
  const { toast } = useToast()
  const { token } = useAuth()
  const { courtId, vendorId } = use(params)
  const { mode } = use(searchParams)
  const [editMode, setEditMode] = useState(mode === "edit")

  useEffect(() => {
    fetchVendor()
  }, [])

  // Function to fetch Razorpay account by email
  const fetchRazorpayAccountByEmail = async (email: string) => {
    if (!email || fetchingRazorpayAccount) return

    setFetchingRazorpayAccount(true)
    try {
      console.log(`Searching for Razorpay account with email: ${email}`)
      
      const response = await fetch('/api/razorpay/accounts/list', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch Razorpay accounts')
      }

      const result = await response.json()
      
      if (result.success && result.accounts) {
        // Find account with matching email
        const matchingAccount = result.accounts.find((account: any) => 
          account.email?.toLowerCase() === email.toLowerCase()
        )

        if (matchingAccount) {
          console.log(`Found Razorpay account:`, matchingAccount)
          setRazorpayAccountInfo(matchingAccount)
          
          // Auto-update vendor with found account ID
          if (!vendor?.razorpayAccountId && vendor) {
            await autoUpdateVendorWithRazorpayAccount(matchingAccount.id)
          }
          
          return matchingAccount
        } else {
          console.log(`No Razorpay account found for email: ${email}`)
          setRazorpayAccountInfo(null)
        }
      }
    } catch (error) {
      console.error('Error fetching Razorpay account:', error)
      setRazorpayAccountInfo(null)
    } finally {
      setFetchingRazorpayAccount(false)
    }
  }

  // Function to automatically update vendor with Razorpay account ID
  const autoUpdateVendorWithRazorpayAccount = async (accountId: string) => {
    if (!vendor) return

    try {
      console.log(`Auto-updating vendor with Razorpay account ID: ${accountId}`)
      
      const updatedVendor = {
        ...vendor,
        razorpayAccountId: accountId
      }

      const response = await fetch(`/api/courts/${courtId}/vendors/${vendorId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updatedVendor),
      })
      
      const result = await response.json()

      if (result.success) {
        setVendor(updatedVendor)
        toast({
          title: "Success",
          description: "Vendor automatically linked to existing Razorpay account!",
          variant: "default",
        })
        
        // Also update banking details if they exist
        await handleUpdateRazorpayBankingDetails(updatedVendor)
      }
    } catch (error) {
      console.error('Error auto-updating vendor:', error)
    }
  }

  const fetchVendor = async () => {
    try {
      const response = await fetch(`/api/courts/${courtId}/vendors/${vendorId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const result = await response.json()

      if (result.success) {
        console.log("Vendor data loaded:", result.data)
        console.log("Logo URL:", result.data.logoUrl)
        console.log("Banner URL:", result.data.bannerUrl)
        setVendor(result.data)
        
        // Auto-fetch Razorpay account if vendor has contact email
        if (result.data.contactEmail) {
          await fetchRazorpayAccountByEmail(result.data.contactEmail)
        }
      } else {
        throw new Error(result.message)
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load vendor details",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!vendor) return

    setSaving(true)
    try {
      const response = await fetch(`/api/courts/${courtId}/vendors/${vendorId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(vendor),
      })
      const result = await response.json()

      if (result.success) {
        toast({
          title: "Success",
          description: "Vendor updated successfully",
        })
        
        // Auto-update Razorpay banking details if account exists
        await handleUpdateRazorpayBankingDetails(vendor)
        
      } else {
        throw new Error(result.message)
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update vendor",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleCreateRazorpayAccount = async () => {
    if (!vendor) return

    // Validate required fields for Razorpay account creation
    const requiredFields = [
      { field: vendor.contactEmail, name: "Contact Email" },
      { field: vendor.contactPhone, name: "Contact Phone" },
      { field: vendor.vendorName, name: "Vendor Name" },
      { field: vendor.stallName, name: "Stall Name" },
      { field: vendor.panNumber, name: "PAN Number" },
      { field: vendor.bankAccountHolderName, name: "Account Holder Name" },
      { field: vendor.bankAccountNumber, name: "Bank Account Number" },
      { field: vendor.bankIfscCode, name: "IFSC Code" }
    ]

    const missingFields = requiredFields.filter(({ field }) => !field?.trim())
    
    if (missingFields.length > 0) {
      toast({
        title: "Missing Required Information",
        description: `Please fill in the following fields: ${missingFields.map(({ name }) => name).join(", ")}`,
        variant: "destructive",
      })
      return
    }

    setCreatingRazorpayAccount(true)
    try {
      const accountData = {
        email: vendor.contactEmail,
        phone: vendor.contactPhone,
        legal_business_name: vendor.stallName,
        business_type: 'not_yet_registered', // Start with not_yet_registered to avoid validation conflicts
        contact_name: vendor.vendorName,
        profile: {
          category: 'food',
          subcategory: 'restaurant',
          addresses: {
            registered: {
              street1: vendor.stallLocation || 'Food Court',
              city: 'Sohna', // Use valid city names
              state: 'Haryana', // Use valid state names  
              postal_code: '122103', // Use valid postal codes
              country: 'IN'
            }
          }
        },
        vendorId: vendor.id,
        courtId: courtId
        // Note: banking details and legal info will be added after account creation
      }

      const response = await fetch('/api/razorpay/accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(accountData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create account')
      }

      const result = await response.json()

      if (result.success && result.account) {
        // Update vendor with the new Razorpay account ID
        const updatedVendor = {
          ...vendor,
          razorpayAccountId: result.account.id
        }

        // Save the updated vendor to the database
        const saveResponse = await fetch(`/api/courts/${courtId}/vendors/${vendorId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(updatedVendor),
        })
        const saveResult = await saveResponse.json()

        if (saveResult.success) {
          setVendor(updatedVendor)
          
          // Automatically update banking details after account creation
          await handleUpdateRazorpayBankingDetails(updatedVendor)
          
          toast({
            title: "Success",
            description: "Razorpay partner account created successfully! Banking details are being updated.",
          })
        } else {
          throw new Error("Failed to save Razorpay account ID to vendor")
        }
      } else {
        throw new Error(result.error || "Failed to create Razorpay account")
      }
    } catch (error: any) {
      console.error("Create Razorpay account error:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to create Razorpay partner account",
        variant: "destructive",
      })
    } finally {
      setCreatingRazorpayAccount(false)
    }
  }

  // Auto-update Razorpay banking details when fields change
  const handleUpdateRazorpayBankingDetails = async (updatedVendor: any) => {
    // Only update if vendor has a Razorpay account and banking details are complete
    if (!updatedVendor.razorpayAccountId || 
        !updatedVendor.bankAccountNumber || 
        !updatedVendor.bankIfscCode || 
        !updatedVendor.bankAccountHolderName) {
      return
    }

    try {
      console.log("Auto-updating Razorpay banking details...")
      
      const bankingData = {
        bank_account: {
          account_number: updatedVendor.bankAccountNumber,
          ifsc_code: updatedVendor.bankIfscCode,
          beneficiary_name: updatedVendor.bankAccountHolderName
        },
        business_type: "individual", // Use individual for accounts with PAN
        legal_info: {
          pan: updatedVendor.panNumber,
          ...(updatedVendor.gstin && { gst: updatedVendor.gstin })
        }
      }

      const response = await fetch(`/api/razorpay/accounts/${updatedVendor.razorpayAccountId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(bankingData)
      })

      if (response.ok) {
        const result = await response.json()
        console.log("Razorpay banking details updated successfully:", result)
        toast({
          title: "Success",
          description: "Banking details updated in Razorpay account",
          variant: "default",
        })
      } else {
        console.log("Failed to update Razorpay banking details, will retry later")
      }
    } catch (error) {
      console.error("Error updating Razorpay banking details:", error)
      // Don't show error toast for auto-updates, just log it
    }
  }

  const handleImageUpload = async (file: File, type: "logo" | "banner") => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("upload_preset", "vendor_logos")

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })
      const result = await response.json()

      if (result.success) {
        console.log("Upload result:", result)
        const imageUrl = result.data?.url || result.url
        console.log("Setting image URL:", imageUrl)
        
        setVendor(prev => prev ? {
          ...prev,
          [type === "logo" ? "logoUrl" : "bannerUrl"]: imageUrl
        } : null)
        
        toast({
          title: "Success",
          description: `${type === "logo" ? "Logo" : "Banner"} uploaded successfully`,
        })
      } else {
        throw new Error(result.message)
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to upload ${type}`,
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const updateVendorField = (field: keyof Vendor, value: any) => {
    setVendor(prev => prev ? { ...prev, [field]: value } : null)
  }

  const updateOperatingHours = (day: string, field: "open" | "close" | "closed", value: string | boolean) => {
    setVendor(prev => prev ? {
      ...prev,
      operatingHours: {
        ...prev.operatingHours,
        [day]: {
          ...prev.operatingHours[day],
          [field]: value
        }
      }
    } : null)
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading vendor details...</div>
  }

  if (!vendor) {
    return <div className="flex items-center justify-center h-64">Vendor not found</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/admin/${courtId}/vendors`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-100">{vendor.stallName}</h1>
            <p className="text-gray-400">{vendor.vendorName}</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <Badge variant={vendor.status === "active" ? "default" : "secondary"}>
            {vendor.status}
          </Badge>
          {vendor.isOnline && <div className="w-2 h-2 bg-green-500 rounded-full" />}
          <Button
            variant="outline"
            onClick={() => setEditMode(!editMode)}
          >
            {editMode ? "Cancel" : "Edit"}
          </Button>
          {editMode && (
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="basic" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="basic">
            <User className="h-4 w-4 mr-2" />
            Basic Info
          </TabsTrigger>
          <TabsTrigger value="location">
            <MapPin className="h-4 w-4 mr-2" />
            Location
          </TabsTrigger>
          <TabsTrigger value="hours">
            <Clock className="h-4 w-4 mr-2" />
            Hours
          </TabsTrigger>
          <TabsTrigger value="payments">
            <DollarSign className="h-4 w-4 mr-2" />
            Payments
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="images">
            <Upload className="h-4 w-4 mr-2" />
            Images
          </TabsTrigger>
        </TabsList>

        {/* Basic Information Tab */}
        <TabsContent value="basic">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Update vendor's basic details and contact information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="stallName">Stall Name</Label>
                  <Input
                    id="stallName"
                    value={vendor.stallName}
                    onChange={(e) => updateVendorField("stallName", e.target.value)}
                    disabled={!editMode}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vendorName">Vendor Name</Label>
                  <Input
                    id="vendorName"
                    value={vendor.vendorName}
                    onChange={(e) => updateVendorField("vendorName", e.target.value)}
                    disabled={!editMode}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Contact Email</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={vendor.contactEmail}
                    onChange={(e) => updateVendorField("contactEmail", e.target.value)}
                    disabled={!editMode}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactPhone">Contact Phone</Label>
                  <Input
                    id="contactPhone"
                    value={vendor.contactPhone}
                    onChange={(e) => updateVendorField("contactPhone", e.target.value)}
                    disabled={!editMode}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cuisineType">Cuisine Type</Label>
                  <Input
                    id="cuisineType"
                    value={vendor.cuisineType || ""}
                    onChange={(e) => updateVendorField("cuisineType", e.target.value)}
                    placeholder="e.g., Indian, Chinese, Italian"
                    disabled={!editMode}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={vendor.status}
                    onValueChange={(value) => updateVendorField("status", value)}
                    disabled={!editMode}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={vendor.description || ""}
                  onChange={(e) => updateVendorField("description", e.target.value)}
                  placeholder="Brief description of the stall..."
                  rows={3}
                  disabled={!editMode}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="isOnline"
                  checked={vendor.isOnline}
                  onCheckedChange={(checked) => updateVendorField("isOnline", checked)}
                  disabled={!editMode}
                />
                <Label htmlFor="isOnline">Currently Online</Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Location Tab */}
        <TabsContent value="location">
          <Card>
            <CardHeader>
              <CardTitle>Location Information</CardTitle>
              <CardDescription>Set stall location and physical details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="stallLocation">Stall Location</Label>
                <Input
                  id="stallLocation"
                  value={vendor.stallLocation || ""}
                  onChange={(e) => updateVendorField("stallLocation", e.target.value)}
                  placeholder="e.g., Ground Floor, Near Main Entrance"
                  disabled={!editMode}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Operating Hours Tab */}
        <TabsContent value="hours">
          <Card>
            <CardHeader>
              <CardTitle>Operating Hours</CardTitle>
              <CardDescription>Configure daily operating hours and break times</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(vendor.operatingHours).map(([day, hours]) => (
                <div key={day} className="flex items-center space-x-4 p-4 border rounded-lg">
                  <div className="w-24">
                    <Label className="capitalize font-medium">{day}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={!hours.closed}
                      onCheckedChange={(checked) => updateOperatingHours(day, "closed", !checked)}
                      disabled={!editMode}
                    />
                    <Label className="text-sm">Open</Label>
                  </div>
                  {!hours.closed && (
                    <>
                      <div className="flex items-center space-x-2">
                        <Label className="text-sm">From</Label>
                        <Input
                          type="time"
                          value={hours.open}
                          onChange={(e) => updateOperatingHours(day, "open", e.target.value)}
                          className="w-24"
                          disabled={!editMode}
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Label className="text-sm">To</Label>
                        <Input
                          type="time"
                          value={hours.close}
                          onChange={(e) => updateOperatingHours(day, "close", e.target.value)}
                          className="w-24"
                          disabled={!editMode}
                        />
                      </div>
                    </>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Payment & Banking Details</CardTitle>
              <CardDescription>Configure payout and banking information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bankAccountNumber">Account Number</Label>
                  <Input
                    id="bankAccountNumber"
                    value={vendor.bankAccountNumber || ""}
                    onChange={(e) => updateVendorField("bankAccountNumber", e.target.value)}
                    placeholder="Enter bank account number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bankIfscCode">IFSC Code</Label>
                  <Input
                    id="bankIfscCode"
                    value={vendor.bankIfscCode || ""}
                    onChange={(e) => updateVendorField("bankIfscCode", e.target.value)}
                    placeholder="Enter IFSC code"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bankAccountHolderName">Account Holder Name</Label>
                  <Input
                    id="bankAccountHolderName"
                    value={vendor.bankAccountHolderName || ""}
                    onChange={(e) => updateVendorField("bankAccountHolderName", e.target.value)}
                    placeholder="Enter account holder name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bankName">Bank Name</Label>
                  <Input
                    id="bankName"
                    value={vendor.bankName || ""}
                    onChange={(e) => updateVendorField("bankName", e.target.value)}
                    placeholder="Enter bank name"
                  />
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <h4 className="font-medium">Legal Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="panNumber">PAN Number</Label>
                    <Input
                      id="panNumber"
                      value={vendor.panNumber || ""}
                      onChange={(e) => updateVendorField("panNumber", e.target.value.toUpperCase())}
                      placeholder="e.g., AAAAA9999A"
                      maxLength={10}
                      disabled={!editMode}
                    />
                    <p className="text-xs text-gray-500">Required for Razorpay payments</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gstin">GSTIN (Optional)</Label>
                    <Input
                      id="gstin"
                      value={vendor.gstin || ""}
                      onChange={(e) => updateVendorField("gstin", e.target.value.toUpperCase())}
                      placeholder="e.g., 18AABCU9603R1ZM"
                      maxLength={15}
                      disabled={!editMode}
                    />
                    <p className="text-xs text-gray-500">Goods and Services Tax Identification Number</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Razorpay Account</h4>
                  <div className="flex items-center space-x-2">
                    {fetchingRazorpayAccount && (
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-blue-600 rounded-full"></div>
                        <span>Checking for existing account...</span>
                      </div>
                    )}
                    {razorpayAccountInfo && !vendor.razorpayAccountId && (
                      <div className="flex items-center space-x-2 text-sm text-green-600">
                        <span>✓ Found existing account</span>
                      </div>
                    )}
                    {!vendor.razorpayAccountId && !razorpayAccountInfo && !fetchingRazorpayAccount && editMode && (
                      <Button 
                        variant="default" 
                        size="sm"
                        onClick={handleCreateRazorpayAccount}
                        disabled={creatingRazorpayAccount}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        {creatingRazorpayAccount ? "Creating..." : "Create Partner Account"}
                      </Button>
                    )}
                    {vendor.razorpayAccountId && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => window.open(`/api/courts/${courtId}/vendors/${vendor.id}/razorpay`, '_blank')}
                      >
                        View Details
                      </Button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label>Account ID</Label>
                    <div className="relative">
                      <Input
                        value={
                          vendor.razorpayAccountId || 
                          (razorpayAccountInfo ? razorpayAccountInfo.id : "Not linked")
                        }
                        disabled
                        className={`bg-gray-50 ${razorpayAccountInfo && !vendor.razorpayAccountId ? 'border-green-300 bg-green-50' : ''}`}
                      />
                      {razorpayAccountInfo && !vendor.razorpayAccountId && (
                        <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                          <span className="text-green-600 text-sm">✓ Auto-linking...</span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      {vendor.razorpayAccountId 
                        ? "This vendor is linked to a Razorpay Route account for payments" 
                        : razorpayAccountInfo
                        ? `Found existing Razorpay account (${razorpayAccountInfo.email}). Auto-linking in progress...`
                        : "No Razorpay account found. Click 'Create Partner Account' to set up automatic payment routing."
                      }
                    </p>
                    {razorpayAccountInfo && (
                      <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <h5 className="text-sm font-medium text-blue-800 mb-2">Account Information</h5>
                        <div className="text-xs text-blue-700 space-y-1">
                          <div><span className="font-medium">Email:</span> {razorpayAccountInfo.email}</div>
                          <div><span className="font-medium">Business Name:</span> {razorpayAccountInfo.legal_business_name}</div>
                          <div><span className="font-medium">Status:</span> {razorpayAccountInfo.status}</div>
                          <div><span className="font-medium">Type:</span> {razorpayAccountInfo.business_type}</div>
                          {razorpayAccountInfo.created_at && (
                            <div><span className="font-medium">Created:</span> {new Date(razorpayAccountInfo.created_at * 1000).toLocaleDateString()}</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <h4 className="font-medium">Payout Settings</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={vendor.payoutSettings.autoPayoutEnabled}
                      onCheckedChange={(checked) => 
                        updateVendorField("payoutSettings", {
                          ...vendor.payoutSettings,
                          autoPayoutEnabled: checked
                        })
                      }
                      disabled={!editMode}
                    />
                    <Label>Auto Payout Enabled</Label>
                  </div>
                  <div className="space-y-2">
                    <Label>Payout Frequency</Label>
                    <Select
                      value={vendor.payoutSettings.payoutFrequency}
                      onValueChange={(value) => 
                        updateVendorField("payoutSettings", {
                          ...vendor.payoutSettings,
                          payoutFrequency: value as "daily" | "weekly" | "manual"
                        })
                      }
                      disabled={!editMode}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="manual">Manual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Minimum Payout Amount (₹)</Label>
                    <Input
                      type="number"
                      value={vendor.payoutSettings.minimumPayoutAmount}
                      onChange={(e) => 
                        updateVendorField("payoutSettings", {
                          ...vendor.payoutSettings,
                          minimumPayoutAmount: Number(e.target.value)
                        })
                      }
                      disabled={!editMode}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Operational Settings</CardTitle>
              <CardDescription>Configure order limits and preparation times</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxConcurrentOrders">Max Concurrent Orders</Label>
                  <Input
                    id="maxConcurrentOrders"
                    type="number"
                    value={vendor.maxConcurrentOrders}
                    onChange={(e) => updateVendorField("maxConcurrentOrders", Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxOrdersPerHour">Max Orders Per Hour</Label>
                  <Input
                    id="maxOrdersPerHour"
                    type="number"
                    value={vendor.maxOrdersPerHour}
                    onChange={(e) => updateVendorField("maxOrdersPerHour", Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="averagePreparationTime">Avg Prep Time (minutes)</Label>
                  <Input
                    id="averagePreparationTime"
                    type="number"
                    value={vendor.averagePreparationTime}
                    onChange={(e) => updateVendorField("averagePreparationTime", Number(e.target.value))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                <div className="space-y-2">
                  <Label>Rating</Label>
                  <div className="text-2xl font-bold">
                    {typeof vendor.rating === 'number' && !isNaN(vendor.rating) 
                      ? vendor.rating.toFixed(1) 
                      : '0.0'
                    }
                  </div>
                  <p className="text-sm text-gray-600">Based on {vendor.totalRatings || 0} reviews</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Images Tab */}
        <TabsContent value="images">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Logo</CardTitle>
                <CardDescription>Upload or update vendor logo</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {vendor.logoUrl ? (
                  <div className="relative w-32 h-32 mx-auto">
                    <img
                      src={vendor.logoUrl}
                      alt="Vendor Logo"
                      className="w-full h-full object-cover rounded-lg border"
                      onError={(e) => {
                        console.error("Logo image failed to load:", vendor.logoUrl)
                        e.currentTarget.style.display = 'none'
                      }}
                      onLoad={() => console.log("Logo image loaded successfully:", vendor.logoUrl)}
                    />
                  </div>
                ) : (
                  <div className="w-32 h-32 mx-auto bg-gray-100 rounded-lg flex items-center justify-center">
                    <Upload className="h-8 w-8 text-gray-400" />
                  </div>
                )}
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleImageUpload(file, "logo")
                  }}
                  disabled={uploading || !editMode}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Banner</CardTitle>
                <CardDescription>Upload or update vendor banner</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {vendor.bannerUrl ? (
                  <div className="relative w-full h-32">
                    <img
                      src={vendor.bannerUrl}
                      alt="Vendor Banner"
                      className="w-full h-full object-cover rounded-lg border"
                      onError={(e) => {
                        console.error("Banner image failed to load:", vendor.bannerUrl)
                        e.currentTarget.style.display = 'none'
                      }}
                      onLoad={() => console.log("Banner image loaded successfully:", vendor.bannerUrl)}
                    />
                  </div>
                ) : (
                  <div className="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Upload className="h-8 w-8 text-gray-400" />
                  </div>
                )}
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleImageUpload(file, "banner")
                  }}
                  disabled={uploading || !editMode}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
