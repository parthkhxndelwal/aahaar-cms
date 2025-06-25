"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Plus, Minus, Trash2, Clock, CreditCard, Banknote, Loader2 } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { api } from "@/lib/api"

interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  imageUrl: string
  preparationTime: number
  vendor: {
    id: string
    stallName: string
  }
  customizations?: Record<string, any>
}

export default function CartPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const courtId = params.courtId as string

  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("online")
  const [specialInstructions, setSpecialInstructions] = useState("")
  const [customerName, setCustomerName] = useState(user?.fullName || "")
  const [customerPhone, setCustomerPhone] = useState(user?.phone || "")

  useEffect(() => {
    // Load cart from localStorage
    const savedCart = localStorage.getItem(`cart_${courtId}`)
    if (savedCart) {
      setCart(JSON.parse(savedCart))
    }
  }, [courtId])

  useEffect(() => {
    // Save cart to localStorage whenever it changes
    localStorage.setItem(`cart_${courtId}`, JSON.stringify(cart))
  }, [cart, courtId])

  const updateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity === 0) {
      removeItem(itemId)
      return
    }

    setCart((prev) => prev.map((item) => (item.id === itemId ? { ...item, quantity: newQuantity } : item)))
  }

  const removeItem = (itemId: string) => {
    setCart((prev) => prev.filter((item) => item.id !== itemId))
  }

  const clearCart = () => {
    setCart([])
  }

  const getSubtotal = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0)
  }

  const getTaxAmount = () => {
    return 0 // Configure as needed
  }

  const getTotal = () => {
    return getSubtotal() + getTaxAmount()
  }

  const getTotalPreparationTime = () => {
    return Math.max(...cart.map((item) => item.preparationTime))
  }

  const handlePlaceOrder = async () => {
    if (!user) {
      router.push(`/app/${courtId}/login`)
      return
    }

    if (cart.length === 0) {
      setError("Your cart is empty")
      return
    }

    if (!customerName || !customerPhone) {
      setError("Please provide your name and phone number")
      return
    }

    setLoading(true)
    setError("")

    try {
      // Group items by vendor
      const vendorGroups = cart.reduce(
        (groups, item) => {
          const vendorId = item.vendor.id
          if (!groups[vendorId]) {
            groups[vendorId] = []
          }
          groups[vendorId].push(item)
          return groups
        },
        {} as Record<string, CartItem[]>,
      )

      // Create separate orders for each vendor
      const orderPromises = Object.entries(vendorGroups).map(([vendorId, items]) => {
        return api.post(`/courts/${courtId}/orders`, {
          vendorId,
          items: items.map((item) => ({
            menuItemId: item.id,
            quantity: item.quantity,
            customizations: item.customizations || {},
            specialInstructions: "",
          })),
          customerName,
          customerPhone,
          paymentMethod,
          specialInstructions,
          type: "user_initiated",
        })
      })

      const responses = await Promise.all(orderPromises)

      // Check if all orders were created successfully
      const failedOrders = responses.filter((response) => !response.data.success)
      if (failedOrders.length > 0) {
        throw new Error("Some orders failed to create")
      }

      // Clear cart and redirect to orders page
      clearCart()
      router.push(`/app/${courtId}/orders`)
    } catch (error: any) {
      setError(error.response?.data?.message || "Failed to place order")
    } finally {
      setLoading(false)
    }
  }

  const goBack = () => {
    router.push(`/app/${courtId}`)
  }

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <Button variant="ghost" onClick={goBack} className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Menu
          </Button>

          <Card>
            <CardContent className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.5 6M7 13l-1.5-6m0 0h15M17 13v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Your cart is empty</h3>
              <p className="text-gray-600 mb-6">Add some delicious items from our menu</p>
              <Button onClick={goBack}>Browse Menu</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Button variant="ghost" onClick={goBack} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Menu
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Your Order</CardTitle>
                <Button variant="outline" size="sm" onClick={clearCart}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear Cart
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {cart.map((item) => (
                  <div key={item.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                    <img
                      src={item.imageUrl || "/placeholder.svg?height=80&width=80"}
                      alt={item.name}
                      className="w-16 h-16 object-cover rounded-md"
                    />
                    <div className="flex-1">
                      <h4 className="font-medium">{item.name}</h4>
                      <p className="text-sm text-gray-600">{item.vendor.stallName}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          {item.preparationTime}m
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm" onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <Button variant="outline" size="sm" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">₹{(item.price * item.quantity).toFixed(2)}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(item.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div className="space-y-6">
            {/* Customer Details */}
            <Card>
              <CardHeader>
                <CardTitle>Customer Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="customerName">Full Name</Label>
                  <Input
                    id="customerName"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Enter your full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerPhone">Phone Number</Label>
                  <Input
                    id="customerPhone"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Enter your phone number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="specialInstructions">Special Instructions (Optional)</Label>
                  <Textarea
                    id="specialInstructions"
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    placeholder="Any special requests..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Payment Method */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Method</CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="online" id="online" />
                    <Label htmlFor="online" className="flex items-center cursor-pointer">
                      <CreditCard className="h-4 w-4 mr-2" />
                      Online Payment
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="cod" id="cod" />
                    <Label htmlFor="cod" className="flex items-center cursor-pointer">
                      <Banknote className="h-4 w-4 mr-2" />
                      Cash on Delivery
                    </Label>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>₹{getSubtotal().toFixed(2)}</span>
                </div>
                {getTaxAmount() > 0 && (
                  <div className="flex justify-between">
                    <span>Tax</span>
                    <span>₹{getTaxAmount().toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t pt-3">
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span>₹{getTotal().toFixed(2)}</span>
                  </div>
                </div>
                <div className="text-sm text-gray-600 flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  Estimated time: {getTotalPreparationTime()} minutes
                </div>
              </CardContent>
            </Card>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handlePlaceOrder}
              className="w-full"
              size="lg"
              disabled={loading || !customerName || !customerPhone}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Place Order - ₹{getTotal().toFixed(2)}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
