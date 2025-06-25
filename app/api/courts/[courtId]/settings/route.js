import { NextResponse } from "next/server"
import { CourtSettings } from "@/models"
import { authenticateToken } from "@/middleware/auth"

export async function GET(request, { params }) {
  try {
    const { courtId } = params

    const settings = await CourtSettings.findOne({
      where: { courtId },
    })

    return NextResponse.json({
      success: true,
      data: { settings },
    })
  } catch (error) {
    console.error("Get court settings error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request, { params }) {
  try {
    const authResult = await authenticateToken(request)
    if (authResult instanceof NextResponse) return authResult

    const { courtId } = params
    const updateData = await request.json()

    if (request.user.role !== "admin") {
      return NextResponse.json({ success: false, message: "Admin access required" }, { status: 403 })
    }

    const [settings] = await CourtSettings.upsert({
      courtId,
      ...updateData,
    })

    return NextResponse.json({
      success: true,
      message: "Settings updated successfully",
      data: { settings },
    })
  } catch (error) {
    console.error("Update court settings error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
