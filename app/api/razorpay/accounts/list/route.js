import { NextResponse } from "next/server"
import { authenticateToken } from "@/middleware/auth"

// GET - List all Razorpay Route Accounts (with pagination)
export async function GET(request) {
  try {
    const authResult = await authenticateToken(request)
    if (authResult instanceof NextResponse) return authResult

    const { user } = authResult
    // Only admin can list Razorpay accounts
    if (user.role !== "admin") {
      return NextResponse.json({ success: false, message: "Admin access required" }, { status: 403 })
    }

    const url = new URL(request.url)
    const count = url.searchParams.get('count') || '10'
    const skip = url.searchParams.get('skip') || '0'

    console.log(`Listing Razorpay accounts with count: ${count}, skip: ${skip}`)

    const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64')
    
    const response = await fetch(`https://api.razorpay.com/v2/accounts?count=${count}&skip=${skip}`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      }
    })

    const responseData = await response.json()

    if (!response.ok) {
      console.error("Razorpay API Error:", responseData)
      return NextResponse.json({
        success: false,
        error: responseData.error?.description || 'Failed to list Razorpay accounts',
        errorCode: responseData.error?.code,
        errorDetails: responseData.error
      }, { status: response.status })
    }

    return NextResponse.json({
      success: true,
      accounts: responseData.items || [],
      count: responseData.count || 0,
      has_more: responseData.has_more || false
    })

  } catch (error) {
    console.error("List accounts error:", error)
    return NextResponse.json({
      success: false,
      error: error.message || "Internal server error"
    }, { status: 500 })
  }
}
