import { NextResponse } from "next/server"
import { authenticateToken } from "@/middleware/auth"

// GET - Fetch Razorpay Route Account details
export async function GET(request, { params }) {
  try {
    const authResult = await authenticateToken(request)
    if (authResult instanceof NextResponse) return authResult

    const { user } = authResult
    // Only admin can fetch Razorpay account details
    if (user.role !== "admin") {
      return NextResponse.json({ success: false, message: "Admin access required" }, { status: 403 })
    }

    const { accountId } = await params

    if (!accountId) {
      return NextResponse.json({
        success: false,
        message: "Account ID is required"
      }, { status: 400 })
    }

    console.log(`Fetching Razorpay account details for: ${accountId}`)

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
        error: responseData.error?.description || 'Failed to fetch Razorpay account',
        errorCode: responseData.error?.code,
        errorDetails: responseData.error
      }, { status: response.status })
    }

    return NextResponse.json({
      success: true,
      account: responseData
    })

  } catch (error) {
    console.error("Fetch route account error:", error)
    return NextResponse.json({
      success: false,
      error: error.message || "Internal server error"
    }, { status: 500 })
  }
}

// PUT - Update Razorpay Route Account
export async function PUT(request, { params }) {
  try {
    const authResult = await authenticateToken(request)
    if (authResult instanceof NextResponse) return authResult

    const { user } = authResult
    // Only admin can update Razorpay accounts
    if (user.role !== "admin") {
      return NextResponse.json({ success: false, message: "Admin access required" }, { status: 403 })
    }

    const { accountId } = await params
    const updateData = await request.json()

    if (!accountId) {
      return NextResponse.json({
        success: false,
        message: "Account ID is required"
      }, { status: 400 })
    }

    console.log(`Updating Razorpay account ${accountId}`)
    console.log("Update data received:", JSON.stringify(updateData, null, 2))

    // Helper function to get valid Indian state name for Razorpay
    const getValidStateName = (stateName) => {
      if (!stateName || stateName === "Unknown") return "Haryana"
      
      const stateMap = {
        "karnataka": "Karnataka",
        "KARNATAKA": "Karnataka",
        "tamil nadu": "Tamil Nadu",
        "TAMIL NADU": "Tamil Nadu",
        "maharashtra": "Maharashtra",
        "MAHARASHTRA": "Maharashtra",
        "delhi": "Delhi",
        "DELHI": "Delhi",
        "west bengal": "West Bengal",
        "WEST BENGAL": "West Bengal",
        "uttar pradesh": "Uttar Pradesh",
        "UTTAR PRADESH": "Uttar Pradesh",
        "rajasthan": "Rajasthan",
        "RAJASTHAN": "Rajasthan",
        "gujarat": "Gujarat",
        "GUJARAT": "Gujarat",
        "kerala": "Kerala",
        "KERALA": "Kerala",
        "andhra pradesh": "Andhra Pradesh",
        "ANDHRA PRADESH": "Andhra Pradesh",
        "telangana": "Telangana",
        "TELANGANA": "Telangana"
      }
      
      return stateMap[stateName.toLowerCase()] || stateName
    }

    // Build update payload based on provided data
    const accountUpdateData = {}

    // Handle business type update
    if (updateData.business_type) {
      accountUpdateData.business_type = updateData.business_type
    }

    // Handle legal info (PAN/GST)
    if (updateData.legal_info) {
      accountUpdateData.legal_info = updateData.legal_info
    }

    // Handle bank account details
    if (updateData.bank_account) {
      accountUpdateData.bank_account = updateData.bank_account
    }

    // Handle profile updates with address validation
    if (updateData.profile) {
      accountUpdateData.profile = { ...updateData.profile }
      
      // Validate and fix address data
      if (accountUpdateData.profile.addresses?.registered) {
        const addr = accountUpdateData.profile.addresses.registered
        if (addr.state) {
          addr.state = getValidStateName(addr.state)
        }
        if (addr.city === "Unknown") {
          addr.city = "Sohna"
        }
        if (addr.postal_code === "000000") {
          addr.postal_code = "122103"
        }
      }
    }

    // Handle business name updates
    if (updateData.legal_business_name) {
      accountUpdateData.legal_business_name = updateData.legal_business_name
    }

    console.log("Processed update data being sent to Razorpay:", JSON.stringify(accountUpdateData, null, 2))

    const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64')
    
    const response = await fetch(`https://api.razorpay.com/v2/accounts/${accountId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(accountUpdateData)
    })

    const responseData = await response.json()
    
    console.log("Razorpay UPDATE Response Status:", response.status)
    console.log("Razorpay UPDATE Response Data:", JSON.stringify(responseData, null, 2))

    if (!response.ok) {
      console.error("Razorpay API Error:", responseData)
      return NextResponse.json({
        success: false,
        error: responseData.error?.description || 'Failed to update Razorpay account',
        errorCode: responseData.error?.code,
        errorDetails: responseData.error
      }, { status: response.status })
    }

    return NextResponse.json({
      success: true,
      account: responseData,
      message: "Account updated successfully"
    })

  } catch (error) {
    console.error("Update route account error:", error)
    return NextResponse.json({
      success: false,
      error: error.message || "Internal server error"
    }, { status: 500 })
  }
}
