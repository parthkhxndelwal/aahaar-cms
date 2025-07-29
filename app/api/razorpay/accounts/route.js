import { NextResponse } from "next/server"
import { authenticateToken } from "@/middleware/auth"
import { Vendor } from "@/models"

// POST - Create Razorpay Route Account
export async function POST(request) {
  try {
    // Helper function to get valid Indian state name for Razorpay
    const getValidStateName = (stateName) => {
      if (!stateName || stateName === "Unknown") return "Haryana"
      
      // Map common state variations to proper names
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

    const authResult = await authenticateToken(request)
    if (authResult instanceof NextResponse) return authResult

    const { user } = authResult
    // Only admin can create Razorpay accounts
    if (user.role !== "admin") {
      return NextResponse.json({ success: false, message: "Admin access required" }, { status: 403 })
    }

    const vendorData = await request.json()
    console.log("Received vendor data from frontend:", JSON.stringify(vendorData, null, 2))
    
    // Extract data from the frontend payload (which is already in Razorpay format)
    const {
      email,
      phone,
      legal_business_name,
      contact_name,
      vendorId,
      courtId,
      bank_account,
      profile,
      business_type,
      tnc_accepted
    } = vendorData

    // Extract nested fields
    const accountNumber = bank_account?.account_number
    const ifscCode = bank_account?.ifsc_code
    const accountHolderName = bank_account?.beneficiary_name

    // For PAN and GSTIN, we'll need to get these from the vendor record since they're not in the payload
    // For now, we'll make them optional or handle them separately

    // Validate required fields for account creation
    const requiredFields = { 
      email, 
      phone, 
      legal_business_name, 
      contact_name, 
      courtId
      // Note: vendorId is optional for account creation before vendor creation
    }
    console.log("Required fields validation:", JSON.stringify(requiredFields, null, 2))
    
    const missingFields = Object.entries(requiredFields).filter(([key, value]) => !value?.toString().trim())
    
    if (missingFields.length > 0) {
      console.log("Missing fields detected:", missingFields.map(([key]) => key))
      return NextResponse.json({
        success: false,
        message: `Missing required fields: ${missingFields.map(([key]) => key).join(", ")}`
      }, { status: 400 })
    }

    // Fetch vendor data to get PAN number and other details (if vendorId is provided)
    let vendor = null
    if (vendorId) {
      vendor = await Vendor.findByPk(vendorId)
      if (!vendor) {
        return NextResponse.json({
          success: false,
          message: "Vendor not found"
        }, { status: 404 })
      }

      if (!vendor.panNumber) {
        return NextResponse.json({
          success: false,
          message: "PAN number is required but not found in vendor record"
        }, { status: 400 })
      }
    }

    const timestamp = Date.now().toString().slice(-8)
    const vendorHash = vendorId ? vendorId.slice(0, 8) : email.slice(0, 8).replace('@', '')
    const shortReferenceId = `v${timestamp}${vendorHash}`.slice(0, 20)

    // Process address information
    const processedState = getValidStateName(profile?.addresses?.registered?.state)
    const processedCity = profile?.addresses?.registered?.city === "Unknown" ? "Sohna" : (profile?.addresses?.registered?.city || "Sohna")
    const processedPostalCode = profile?.addresses?.registered?.postal_code === "000000" ? "122103" : (profile?.addresses?.registered?.postal_code || "560001")
    
    console.log(`Address processing: Original state: "${profile?.addresses?.registered?.state}" -> Processed state: "${processedState}"`)
    console.log(`Business type: Using "not_yet_registered" initially${vendor ? `, will add PAN later: ${vendor.panNumber}` : ', PAN will be added after vendor creation'}`)
    if (vendor?.panNumber) {
      console.log(`PAN format check: Length=${vendor.panNumber.length}, Pattern=${/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(vendor.panNumber)}`)
    }

    // Use the data sent from frontend, but add PAN from vendor record
    const accountData = {
      email: email.toLowerCase(),
      phone,
      type: "route",
      reference_id: shortReferenceId,
      legal_business_name,
      business_type: "not_yet_registered", // Start with not_yet_registered, add business details later
      contact_name,
      profile: {
        category: "food",
        subcategory: "restaurant",
        addresses: {
          registered: {
            street1: profile?.addresses?.registered?.street1 || "Food Court",
            street2: `Court ID: ${courtId}`,
            city: processedCity,
            state: processedState,
            postal_code: processedPostalCode,
            country: "IN"
          }
        }
      }
      // Note: legal_info (PAN/GST), bank_account and tnc_accepted will be added later through account update process
      // Starting with basic account creation to avoid validation conflicts
    }

    console.log(`Creating Razorpay account with reference_id: ${shortReferenceId}`)
    if (vendor?.panNumber) {
      console.log(`PAN: ${vendor.panNumber}${vendor.gstin ? `, GSTIN: ${vendor.gstin}` : ''} (will be added later)`)
    } else {
      console.log("PAN and GSTIN will be added after vendor creation")
    }
    console.log("Account data being sent to Razorpay:", JSON.stringify(accountData, null, 2))
    console.log("Note: Legal info (PAN/GST) and bank account details will be added later through account update API")

    const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64')

    const response = await fetch('https://api.razorpay.com/v2/accounts', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(accountData)
    })

    const responseData = await response.json()
    
    console.log("Razorpay API Response Status:", response.status)
    console.log("Razorpay API Response Headers:", Object.fromEntries(response.headers.entries()))
    console.log("Razorpay API Response Data:", JSON.stringify(responseData, null, 2))

    if (!response.ok) {
      console.error("Razorpay API Error - Full Response:", responseData)
      return NextResponse.json({
        success: false,
        error: responseData.error?.description || 'Failed to create Razorpay account',
        errorCode: responseData.error?.code,
        errorDetails: responseData.error
      }, { status: response.status })
    }

    return NextResponse.json({
      success: true,
      account: responseData,
      referenceId: shortReferenceId,
      message: "Account created successfully. Bank account details can be added later.",
      nextSteps: {
        bankAccount: {
          accountNumber,
          ifscCode,
          accountHolderName
        }
      }
    })

  } catch (error) {
    console.error("Create route account error:", error)
    return NextResponse.json({
      success: false,
      error: error.message || "Internal server error"
    }, { status: 500 })
  }
}
