import { NextResponse } from "next/server"
import { authenticateToken } from "@/middleware/auth"

// In-memory cart storage (in production, use Redis or database)
const userCarts = new Map()

export async function PATCH(request, { params }) {
  try {
    const authResult = await authenticateToken(request)
    if (authResult instanceof NextResponse) return authResult

    const { itemId } = params
    const { quantity } = await request.json()

    const cart = userCarts.get(request.user.id) || { items: [], total: 0 }

    const itemIndex = cart.items.findIndex((item) => item.menuItemId === itemId)
    if (itemIndex === -1) {
      return NextResponse.json({ success: false, message: "Item not found in cart" }, { status: 404 })
    }

    if (quantity <= 0) {
      cart.items.splice(itemIndex, 1)
    } else {
      cart.items[itemIndex].quantity = quantity
      cart.items[itemIndex].subtotal = quantity * cart.items[itemIndex].price
    }

    // Recalculate total
    cart.total = cart.items.reduce((sum, item) => sum + item.subtotal, 0)

    userCarts.set(request.user.id, cart)

    return NextResponse.json({
      success: true,
      message: "Cart updated",
      data: { cart },
    })
  } catch (error) {
    console.error("Update cart error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const authResult = await authenticateToken(request)
    if (authResult instanceof NextResponse) return authResult

    const { itemId } = params

    const cart = userCarts.get(request.user.id) || { items: [], total: 0 }

    cart.items = cart.items.filter((item) => item.menuItemId !== itemId)
    cart.total = cart.items.reduce((sum, item) => sum + item.subtotal, 0)

    userCarts.set(request.user.id, cart)

    return NextResponse.json({
      success: true,
      message: "Item removed from cart",
      data: { cart },
    })
  } catch (error) {
    console.error("Remove from cart error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
