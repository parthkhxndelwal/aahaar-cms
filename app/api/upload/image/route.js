import { NextResponse } from "next/server"
import { authenticateToken } from "@/middleware/auth"
import { uploadImage } from "@/utils/cloudinary"

export async function POST(request) {
  try {
    const authResult = await authenticateToken(request)
    if (authResult instanceof NextResponse) return authResult

    const formData = await request.formData()
    const file = formData.get("file")
    const folder = formData.get("folder") || "aahaar"

    if (!file) {
      return NextResponse.json({ success: false, message: "No file provided" }, { status: 400 })
    }

    // Check file size (4MB limit)
    if (file.size > 4 * 1024 * 1024) {
      return NextResponse.json({ success: false, message: "File size exceeds 4MB limit" }, { status: 400 })
    }

    // Check file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, message: "Invalid file type. Only JPEG, PNG, and WebP are allowed" },
        { status: 400 },
      )
    }

    // Convert file to base64 for Cloudinary
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64 = `data:${file.type};base64,${buffer.toString("base64")}`

    // Upload to Cloudinary
    const result = await uploadImage(base64, folder)

    if (!result.success) {
      return NextResponse.json({ success: false, message: "Failed to upload image" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Image uploaded successfully",
      data: {
        url: result.url,
        publicId: result.publicId,
      },
    })
  } catch (error) {
    console.error("Image upload error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
