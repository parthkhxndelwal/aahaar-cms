import { NextResponse } from "next/server"
import { createOrder } from "@/utils/razorpay"
import { Order, Payment } from "@/models"
import { authenticateTokenNextJS } from "@/middleware/auth"

export async function POST(request) {
  try {
    const authResult = await authenticateTokenNextJS(request)
    if (authResult.error) {
      return NextResponse.json({ success: false, message: authResult.error }, { status: authResult.status })
    }

    const { orderId } = await request.json()

    if (!orderId) {
      return NextResponse.json({ success: false, message: "Order ID is required" }, { status: 400 })
    }

    // Find the order
    const order = await Order.findByPk(orderId, {
      include: [{ model: Payment, as: "payment" }],
    })

    if (!order) {
      return NextResponse.json({ success: false, message: "Order not found" }, { status: 404 })
    }

    // Check if user has access to this order
    if (order.userId !== authResult.user.id && order.courtId !== authResult.courtId) {
      return NextResponse.json({ success: false, message: "Access denied" }, { status: 403 })
    }

    // Create Razorpay order
    const razorpayResult = await createOrder(order.totalAmount, "INR", order.orderNumber, {
      orderId: order.id,
      courtId: order.courtId,
      customerId: order.userId,
    })

    if (!razorpayResult.success) {
      return NextResponse.json({ success: false, message: "Failed to create payment order" }, { status: 500 })
    }

    // Update payment record
    await order.payment.update({
      razorpayOrderId: razorpayResult.order.id,
      status: "processing",
    })

    return NextResponse.json({
      success: true,
      data: {
        orderId: razorpayResult.order.id,
        amount: razorpayResult.order.amount,
        currency: razorpayResult.order.currency,
        key: process.env.RAZORPAY_KEY_ID,
      },
    })
  } catch (error) {
    console.error("Create Razorpay order error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
