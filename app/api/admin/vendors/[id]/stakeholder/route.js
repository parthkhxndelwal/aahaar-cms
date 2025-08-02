import { NextResponse } from 'next/server'
import db from '@/models'

export async function POST(request, { params }) {
  try {
    const { id: vendorId } = await params
    const body = await request.json()

    console.log('📤 Creating stakeholder for vendor:', vendorId)
    console.log('📋 Stakeholder data:', body)

    // Find the vendor
    const vendor = await db.Vendor.findByPk(vendorId)
    if (!vendor) {
      return NextResponse.json({ 
        success: false, 
        message: 'Vendor not found' 
      }, { status: 404 })
    }

    // Check if vendor has a Razorpay account
    if (!vendor.razorpayAccountId) {
      return NextResponse.json({ 
        success: false, 
        message: 'Vendor must have a Razorpay account before adding stakeholders' 
      }, { status: 400 })
    }

    // Validate PAN format for Razorpay stakeholder requirements
    // Regex: 5 letters + 4 digits + 1 letter, with 4th character must be 'P'
    const stakeholderPanRegex = /^[a-zA-Z]{3}P[a-zA-Z]{1}\d{4}[a-zA-Z]{1}$/
    let cleanPan = body.kyc.pan.replace(/\s+/g, '').toUpperCase()
    
    if (!stakeholderPanRegex.test(cleanPan)) {
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid PAN format for stakeholder. PAN should be in format: XXXPX1234X where 4th character must be P (e.g., AVOPB1111K)' 
      }, { status: 400 })
    }

    // For development/testing, use a valid test PAN that meets stakeholder requirements
    if (process.env.NODE_ENV === 'development' || process.env.RAZORPAY_ENV === 'test') {
      // Use a valid stakeholder PAN format with 'P' as 4th character
      cleanPan = 'AVOPB1111K' // Follows the required format with P as 4th character
      console.log('🧪 Using test stakeholder PAN for development:', cleanPan)
    }

    // Prepare stakeholder data for Razorpay API - match their exact format
    const stakeholderData = {
      name: body.name,
      email: body.email,
      addresses: body.addresses,
      kyc: {
        pan: cleanPan
      },
      notes: body.notes || {}
    }

    // Store the full data in notes for our own tracking
    // Note: Razorpay notes only accept string values, so we need to serialize complex objects
    stakeholderData.notes = {
      ...stakeholderData.notes,
      percentage_ownership: String(body.percentage_ownership),
      relationship_director: String(body.relationship?.director || false),
      relationship_executive: String(body.relationship?.executive || false),
      phone_primary: String(body.phone?.primary || ''),
      phone_secondary: String(body.phone?.secondary || ''),
      original_pan: String(body.kyc.pan) // Store original PAN for reference
    }

    console.log('🔄 Calling Razorpay API to create stakeholder...')
    console.log('📋 Full stakeholder payload being sent to Razorpay:', JSON.stringify(stakeholderData, null, 2))

    // Create stakeholder via Razorpay API
    const razorpayAuth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64')
    
    const razorpayResponse = await fetch(`https://api.razorpay.com/v2/accounts/${vendor.razorpayAccountId}/stakeholders`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${razorpayAuth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(stakeholderData)
    })

    const razorpayResult = await razorpayResponse.json()

    if (!razorpayResponse.ok) {
      console.error('❌ Razorpay API error:', razorpayResult)
      return NextResponse.json({ 
        success: false, 
        message: razorpayResult.error?.description || 'Failed to create stakeholder with Razorpay' 
      }, { status: 400 })
    }

    console.log('✅ Stakeholder created successfully with Razorpay:', razorpayResult.id)

    // Request product configuration from Razorpay
    console.log('🔄 Requesting product configuration from Razorpay...')
    
    const productConfigPayload = {
      product_name: "route",
      tnc_accepted: true
    }

    const productConfigResponse = await fetch(`https://api.razorpay.com/v2/accounts/${vendor.razorpayAccountId}/products`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${razorpayAuth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(productConfigPayload)
    })

    const productConfigResult = await productConfigResponse.json()

    if (!productConfigResponse.ok) {
      console.error('❌ Razorpay product configuration error:', productConfigResult)
      // Log the error but don't fail the stakeholder creation
      console.log('⚠️ Product configuration failed, but stakeholder was created successfully')
    } else {
      console.log('✅ Product configuration requested successfully:', productConfigResult.id)
      console.log('📊 Product activation status:', productConfigResult.activation_status)
      console.log('📋 Product requirements:', productConfigResult.requirements)
    }

    // Update vendor with stakeholder information and product configuration
    const updatedVendor = await vendor.update({
      metadata: {
        ...vendor.metadata,
        stakeholderId: razorpayResult.id,
        stakeholderData: stakeholderData,
        stakeholderCreated: true,
        productConfiguration: productConfigResponse.ok ? {
          productId: productConfigResult.id,
          productName: productConfigResult.product_name,
          activationStatus: productConfigResult.activation_status,
          requirements: productConfigResult.requirements,
          requestedAt: productConfigResult.requested_at,
          activeConfiguration: productConfigResult.active_configuration,
          requestedConfiguration: productConfigResult.requested_configuration,
          tnc: productConfigResult.tnc
        } : null,
        productConfigurationRequested: productConfigResponse.ok,
        productConfigurationError: !productConfigResponse.ok ? productConfigResult : null
      }
    })

    if (!updatedVendor) {
      console.error('❌ Failed to update vendor with stakeholder information')
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to update vendor with stakeholder information' 
      }, { status: 500 })
    }

    console.log('✅ Vendor updated with stakeholder information')

    // Prepare response data
    const responseData = {
      stakeholder: razorpayResult,
      vendor: updatedVendor
    }

    // Add product configuration info if available
    if (productConfigResponse.ok) {
      responseData.productConfiguration = {
        productId: productConfigResult.id,
        productName: productConfigResult.product_name,
        activationStatus: productConfigResult.activation_status,
        requirements: productConfigResult.requirements,
        message: 'Product configuration requested successfully'
      }
    } else {
      responseData.productConfiguration = {
        error: 'Product configuration request failed',
        details: productConfigResult
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Stakeholder created successfully',
      data: responseData
    })

  } catch (error) {
    console.error('❌ Stakeholder creation error:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error while creating stakeholder'
    }, { status: 500 })
  }
}

export async function GET(request, { params }) {
  try {
    const { id: vendorId } = await params

    // Find the vendor
    const vendor = await db.Vendor.findByPk(vendorId)
    if (!vendor) {
      return NextResponse.json({ 
        success: false, 
        message: 'Vendor not found' 
      }, { status: 404 })
    }

    // Check if vendor has stakeholder information
    if (!vendor.metadata?.stakeholderId) {
      return NextResponse.json({ 
        success: false, 
        message: 'No stakeholder found for this vendor' 
      }, { status: 404 })
    }

    // Get stakeholder details from Razorpay
    const razorpayAuth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64')
    
    const razorpayResponse = await fetch(`https://api.razorpay.com/v2/accounts/${vendor.razorpayAccountId}/stakeholders/${vendor.metadata.stakeholderId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${razorpayAuth}`,
        'Content-Type': 'application/json',
      }
    })

    if (!razorpayResponse.ok) {
      console.error('❌ Failed to fetch stakeholder from Razorpay')
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to fetch stakeholder details' 
      }, { status: 400 })
    }

    const stakeholderData = await razorpayResponse.json()

    return NextResponse.json({
      success: true,
      data: {
        stakeholder: stakeholderData,
        vendor: vendor
      }
    })

  } catch (error) {
    console.error('❌ Error fetching stakeholder:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error while fetching stakeholder'
    }, { status: 500 })
  }
}
