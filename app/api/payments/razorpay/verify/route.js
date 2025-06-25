import { NextResponse } from "next/server"
import { Order, Payment, AuditLog } from "@/models"
import { verifyPayment } from "@/utils/razorpay"
import { authenticateTokenNextJS } from "@/middleware/auth"

export async function POST(request) {
  try {
    const authResult = await authenticateTokenNextJS(request)
    if (authResult.error) {
      return NextResponse.json({ success: false, message: authResult.error }, { status: authResult.status })
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = await request.json()

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !orderId) {
      return NextResponse.json({ success: false, message: "Missing required payment details" }, { status: 400 })
    }

    // Verify payment signature
    const isValidSignature = verifyPayment(razorpay_order_id, razorpay_payment_id, razorpay_signature)

    if (!isValidSignature) {
      return NextResponse.json({ success: false, message: "Invalid payment signature" }, { status: 400 })
    }

    // Find the order and payment
    const order = await Order.findByPk(orderId, {
      include: [{ model: Payment, as: "payment" }],
    })

    if (!order) {
      return NextResponse.json({ success: false, message: "Order not found" }, { status: 404 })
    }

    // Update payment status
    await order.payment.update({
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      status: "completed",
      processedAt: new Date(),
    })

    // Update order status
    await order.update({
      paymentStatus: "paid",
      status: "confirmed",
      confirmedAt: new Date(),
      statusHistory: [
        ...order.statusHistory,
        {
          status: "confirmed",
          timestamp: new Date(),
          note: "Payment completed successfully",
        },
      ],
    })

    // Log audit
    await AuditLog.create({
      courtId: order.courtId,
      userId: authResult.user.id,
      action: "payment_completed",
      entityType: "order",
      entityId: order.id,
      newValues: {
        razorpayPaymentId: razorpay_payment_id,
        amount: order.totalAmount,
      },
    })

    // TODO: Send notification to vendor
    // TODO: Process vendor payout if applicable

    return NextResponse.json({
      success: true,
      message: "Payment verified successfully",
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
      },
    })
  } catch (error) {
    console.error("Payment verification error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
