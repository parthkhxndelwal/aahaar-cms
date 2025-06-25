import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { User, Court, CourtSettings } from "@/models"

export async function POST(request) {
  try {
    const {
      email,
      password,
      fullName,
      phone,
      courtId,
      instituteName,
      instituteType = "college",
      role = "admin",
    } = await request.json()

    // Validation
    if (!email || !password || !fullName || !courtId || !instituteName) {
      return NextResponse.json(
        {
          success: false,
          message: "All required fields must be provided",
        },
        { status: 400 },
      )
    }

    // Validate courtId format (alphanumeric, hyphens, underscores only)
    if (!/^[a-zA-Z0-9-_]+$/.test(courtId)) {
      return NextResponse.json(
        {
          success: false,
          message: "Court ID can only contain letters, numbers, hyphens, and underscores",
        },
        { status: 400 },
      )
    }

    // Check if court ID is already taken
    const existingCourt = await Court.findOne({
      where: { courtId },
    })

    if (existingCourt) {
      return NextResponse.json(
        {
          success: false,
          message: "Court ID is already taken",
        },
        { status: 400 },
      )
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      where: {
        email: email.toLowerCase(),
      },
    })

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          message: "User with this email already exists",
        },
        { status: 400 },
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create court first
    const court = await Court.create({
      courtId,
      instituteName,
      instituteType,
      contactEmail: email.toLowerCase(),
      contactPhone: phone,
      status: "active",
      subscriptionPlan: "trial",
      subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days trial
    })

    // Create default court settings
    await CourtSettings.create({
      courtId,
      allowOnlinePayments: true,
      allowCOD: true,
      platformFeePercentage: 2.5,
      maxOrdersPerUser: 5,
      orderBufferTime: 5,
      minimumOrderAmount: 0,
      maximumOrderAmount: 5000,
      autoAcceptOrders: false,
      orderCancellationWindow: 5,
      themeSettings: {
        primaryColor: "#3B82F6",
        secondaryColor: "#10B981",
        accentColor: "#F59E0B",
      },
      notificationSettings: {
        emailNotifications: true,
        smsNotifications: false,
        pushNotifications: true,
      },
    })

    // Create admin user
    const user = await User.create({
      courtId,
      email: email.toLowerCase(),
      password: hashedPassword,
      fullName,
      phone,
      role,
      status: "active",
      emailVerified: true,
    })

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        courtId: user.courtId,
        role: user.role,
        email: user.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" },
    )

    return NextResponse.json(
      {
        success: true,
        message: "Registration successful",
        data: {
          token,
          user: {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            role: user.role,
            courtId: user.courtId,
            court: {
              courtId: court.courtId,
              instituteName: court.instituteName,
            },
          },
        },
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 },
    )
  }
}
