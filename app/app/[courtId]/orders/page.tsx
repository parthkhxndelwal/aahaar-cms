"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Clock, CheckCircle, XCircle, Star, RefreshCw } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { api } from "@/lib/api"

interface Order {
  id: string
  orderNumber: string
  status: "pending" | "confirmed" | "preparing" | "ready" | "completed" | "cancelled"
  totalAmount: number
  createdAt: string
  estimatedPreparationTime: number
  vendor: {
    stallName: string
  }
  items: Array<{
    itemName: string
    quantity: number
    itemPrice: number
  }>
  payment: {
    paymentMethod: string
    status: string
  }
}

const statusConfig = {
  pending: { color: "bg-yellow-500", label: "Pending", icon: Clock },
  confirmed: { color: "bg-blue-500", label: "Confirmed", icon: CheckCircle },
  preparing: { color: "bg-orange-500", label: "Preparing", icon: RefreshCw },
  ready: { color: "bg-green-500", label: "Ready", icon: CheckCircle },
  completed: { color: "bg-gray-500", label: "Completed", icon: CheckCircle },
  cancelled: { color: "bg-red-500", label: "Cancelled", icon: XCircle },
}

export default function UserOrders() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const courtId = params.courtId as string

  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("active")

  useEffect(() => {
    if (user) {
      fetchOrders()
    }
  }, [user])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/users/orders?courtId=${courtId}`)
      if (response.data.success) {
        setOrders(response.data.data.orders)
      }
    } catch (error) {
      console.error("Error fetching orders:", error)
    } finally {
      setLoading(false)
    }
  }

  const goBack = () => {
    router.push(`/app/${courtId}`)
  }

  const activeOrders = orders.filter((order) => ["pending", "confirmed", "preparing", "ready"].includes(order.status))

  const pastOrders = orders.filter((order) => ["completed", "cancelled"].includes(order.status))

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const OrderCard = ({ order }: { order: Order }) => {
    const statusInfo = statusConfig[order.status]
    const StatusIcon = statusInfo.icon

    return (
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">#{order.orderNumber}</CardTitle>
              <p className="text-sm text-gray-600">{order.vendor.stallName}</p>
            </div>
            <Badge className={`${statusInfo.color} text-white`}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {statusInfo.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Order Items */}
            <div className="space-y-2">
              {order.items.map((item, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span>
                    {item.quantity}x {item.itemName}
                  </span>
                  <span>₹{(item.itemPrice * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>

            {/* Order Details */}
            <div className="border-t pt-3 space-y-2">
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>₹{order.totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Payment</span>
                <span className="capitalize">{order.payment.paymentMethod}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Ordered</span>
                <span>{formatDate(order.createdAt)}</span>
              </div>
              {order.status === "preparing" && (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Est. Ready Time</span>
                  <span>{order.estimatedPreparationTime} minutes</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-2 pt-2">
              {order.status === "completed" && (
                <Button variant="outline" size="sm">
                  <Star className="h-4 w-4 mr-1" />
                  Rate Order
                </Button>
              )}
              <Button variant="outline" size="sm">
                Reorder
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card>
          <CardContent className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Please log in</h3>
            <p className="text-gray-600 mb-6">You need to be logged in to view your orders</p>
            <Button onClick={() => router.push(`/app/${courtId}/login`)}>Login</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Button variant="ghost" onClick={goBack} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Menu
        </Button>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Your Orders</h1>
          <p className="text-gray-600">Track your current and past orders</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="active">Active Orders ({activeOrders.length})</TabsTrigger>
            <TabsTrigger value="past">Past Orders ({pastOrders.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-6">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading orders...</p>
              </div>
            ) : activeOrders.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <div className="text-gray-400 mb-4">
                    <Clock className="mx-auto h-12 w-12" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No active orders</h3>
                  <p className="text-gray-600 mb-6">Place an order to see it here</p>
                  <Button onClick={goBack}>Browse Menu</Button>
                </CardContent>
              </Card>
            ) : (
              <div>
                {activeOrders.map((order) => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="past" className="mt-6">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading orders...</p>
              </div>
            ) : pastOrders.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <div className="text-gray-400 mb-4">
                    <CheckCircle className="mx-auto h-12 w-12" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No past orders</h3>
                  <p className="text-gray-600">Your completed orders will appear here</p>
                </CardContent>
              </Card>
            ) : (
              <div>
                {pastOrders.map((order) => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
