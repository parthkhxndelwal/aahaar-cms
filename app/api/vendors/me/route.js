import { NextResponse } from "next/server"
import { Vendor } from "@/models"
import { authenticateToken } from "@/middleware/auth"

export async function GET(request) {
  try {
    const authResult = await authenticateToken(request)
    if (authResult instanceof NextResponse) return authResult

    const { user } = authResult

    if (user.role !== "vendor") {
      return NextResponse.json({ success: false, message: "Access denied" }, { status: 403 })
    }

    // Find vendor associated with this user
    const vendor = await Vendor.findOne({
      where: { userId: user.id },
      attributes: ['id', 'stallName', 'vendorName', 'courtId', 'status']
    })

    if (!vendor) {
      return NextResponse.json({ success: false, message: "Vendor not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: {
        vendor: vendor
      },
    })
  } catch (error) {
    console.error("Get vendor info error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
