import { NextResponse } from "next/server"
import { Vendor, User } from "@/models"
import bcrypt from "bcryptjs"

export async function POST(request, { params }) {
  try {
    const { vendorId } = params
    const { email, password, fullName, onboardingData } = await request.json()

    // Find vendor
    const vendor = await Vendor.findByPk(vendorId)
    if (!vendor) {
      return NextResponse.json({ success: false, message: "Vendor not found" }, { status: 404 })
    }

    // Create user account for vendor if not exists
    let user = await User.findOne({ where: { email: email.toLowerCase(), courtId: vendor.courtId } })

    if (!user) {
      const hashedPassword = await bcrypt.hash(password, 12)
      user = await User.create({
        courtId: vendor.courtId,
        email: email.toLowerCase(),
        password: hashedPassword,
        fullName,
        role: "vendor",
        status: "active",
        emailVerified: true,
      })
    }

    // Link vendor to user
    await vendor.update({
      userId: user.id,
      status: "active",
      ...onboardingData,
    })

    return NextResponse.json({
      success: true,
      message: "Vendor onboarding completed successfully",
      data: { vendor, user: { ...user.toJSON(), password: undefined } },
    })
  } catch (error) {
    console.error("Vendor onboarding error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
