import { NextResponse } from "next/server"
import { User } from "@/models"
import { authenticateToken } from "@/middleware/auth"

export async function PATCH(request, { params }) {
  try {
    const authResult = await authenticateToken(request)
    if (authResult instanceof NextResponse) return authResult

    const { userId } = params
    const { status, role } = await request.json()

    if (request.user.role !== "admin") {
      return NextResponse.json({ success: false, message: "Admin access required" }, { status: 403 })
    }

    const user = await User.findOne({
      where: { id: userId, courtId: request.user.courtId },
    })

    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 })
    }

    const updateData = {}
    if (status) updateData.status = status
    if (role) updateData.role = role

    await user.update(updateData)

    return NextResponse.json({
      success: true,
      message: "User updated successfully",
      data: { user: { ...user.toJSON(), password: undefined } },
    })
  } catch (error) {
    console.error("Update user error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
