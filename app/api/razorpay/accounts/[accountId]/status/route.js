import { NextResponse } from "next/server"
import { authenticateToken } from "@/middleware/auth"

// GET - Check Razorpay Account Status
export async function GET(request, { params }) {
  try {
    const authResult = await authenticateToken(request)
    if (authResult instanceof NextResponse) return authResult

    const { user } = authResult
    // Admin or vendor owner can check account status
    if (user.role !== "admin" && user.role !== "vendor") {
      return NextResponse.json({ success: false, message: "Access denied" }, { status: 403 })
    }

    const { accountId } = params

    if (!accountId) {
      return NextResponse.json({
        success: false,
        message: "Account ID is required"
      }, { status: 400 })
    }

    console.log(`Checking Razorpay account status for: ${accountId}`)

    const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64')
    
    const response = await fetch(`https://api.razorpay.com/v2/accounts/${accountId}`, {
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
        error: responseData.error?.description || 'Failed to fetch Razorpay account status',
        errorCode: responseData.error?.code,
        errorDetails: responseData.error
      }, { status: response.status })
    }

    // Return only status-related information
    const statusInfo = {
      id: responseData.id,
      reference_id: responseData.reference_id,
      status: responseData.status,
      sub_status: responseData.sub_status,
      created_at: responseData.created_at,
      activated_at: responseData.activated_at,
      legal_business_name: responseData.legal_business_name,
      business_type: responseData.business_type
    }

    return NextResponse.json({
      success: true,
      data: {
        account: statusInfo
      }
    })

  } catch (error) {
    console.error("Check account status error:", error)
    return NextResponse.json({
      success: false,
      error: error.message || "Internal server error"
    }, { status: 500 })
  }
}
