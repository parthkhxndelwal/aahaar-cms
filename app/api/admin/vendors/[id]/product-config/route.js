import { NextResponse } from 'next/server'
import db from '@/models'

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

    // Check if vendor has a Razorpay account
    if (!vendor.razorpayAccountId) {
      return NextResponse.json({ 
        success: false, 
        message: 'Vendor does not have a Razorpay account' 
      }, { status: 400 })
    }

    // Check if product configuration exists in metadata
    if (!vendor.metadata?.productConfiguration?.productId) {
      return NextResponse.json({ 
        success: false, 
        message: 'No product configuration found for this vendor' 
      }, { status: 404 })
    }

    // Get current product configuration from Razorpay
    const razorpayAuth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64')
    
    const razorpayResponse = await fetch(`https://api.razorpay.com/v2/accounts/${vendor.razorpayAccountId}/products/${vendor.metadata.productConfiguration.productId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${razorpayAuth}`,
        'Content-Type': 'application/json',
      }
    })

    if (!razorpayResponse.ok) {
      const errorData = await razorpayResponse.json()
      console.error('❌ Failed to fetch product configuration from Razorpay:', errorData)
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to fetch current product configuration from Razorpay',
        storedConfig: vendor.metadata.productConfiguration
      }, { status: 400 })
    }

    const currentProductConfig = await razorpayResponse.json()

    return NextResponse.json({
      success: true,
      data: {
        currentConfig: currentProductConfig,
        storedConfig: vendor.metadata.productConfiguration,
        vendor: {
          id: vendor.id,
          stallName: vendor.stallName,
          razorpayAccountId: vendor.razorpayAccountId
        }
      }
    })

  } catch (error) {
    console.error('❌ Error fetching product configuration:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error while fetching product configuration'
    }, { status: 500 })
  }
}

export async function POST(request, { params }) {
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

    // Check if vendor has a Razorpay account
    if (!vendor.razorpayAccountId) {
      return NextResponse.json({ 
        success: false, 
        message: 'Vendor does not have a Razorpay account' 
      }, { status: 400 })
    }

    // Request product configuration from Razorpay
    console.log('🔄 Manually requesting product configuration for vendor:', vendorId)
    
    const productConfigPayload = {
      product_name: "route",
      tnc_accepted: true
    }

    const razorpayAuth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64')
    
    const razorpayResponse = await fetch(`https://api.razorpay.com/v2/accounts/${vendor.razorpayAccountId}/products`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${razorpayAuth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(productConfigPayload)
    })

    const productConfigResult = await razorpayResponse.json()

    if (!razorpayResponse.ok) {
      console.error('❌ Razorpay product configuration error:', productConfigResult)
      return NextResponse.json({ 
        success: false, 
        message: productConfigResult.error?.description || 'Failed to request product configuration from Razorpay',
        details: productConfigResult
      }, { status: 400 })
    }

    console.log('✅ Product configuration requested successfully:', productConfigResult.id)

    // Update vendor metadata with product configuration
    const updatedVendor = await vendor.update({
      metadata: {
        ...vendor.metadata,
        productConfiguration: {
          productId: productConfigResult.id,
          productName: productConfigResult.product_name,
          activationStatus: productConfigResult.activation_status,
          requirements: productConfigResult.requirements,
          requestedAt: productConfigResult.requested_at,
          activeConfiguration: productConfigResult.active_configuration,
          requestedConfiguration: productConfigResult.requested_configuration,
          tnc: productConfigResult.tnc
        },
        productConfigurationRequested: true,
        productConfigurationError: null
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Product configuration requested successfully',
      data: {
        productConfiguration: productConfigResult,
        vendor: updatedVendor
      }
    })

  } catch (error) {
    console.error('❌ Error requesting product configuration:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error while requesting product configuration'
    }, { status: 500 })
  }
}

export async function PATCH(request, { params }) {
  try {
    const { id: vendorId } = await params
    
    // Safely parse request body
    let body = {}
    try {
      const requestText = await request.text()
      if (requestText.trim()) {
        body = JSON.parse(requestText)
      }
    } catch (parseError) {
      console.log('⚠️ Could not parse request body, using empty object:', parseError.message)
    }

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
        message: 'Vendor does not have a Razorpay account' 
      }, { status: 400 })
    }

    // Check if product configuration exists
    if (!vendor.metadata?.productConfiguration?.productId) {
      return NextResponse.json({ 
        success: false, 
        message: 'No product configuration found for this vendor' 
      }, { status: 404 })
    }

    // Prepare update configuration from request body or use default bank details
    let updateConfig = {}

    if (body && Object.keys(body).length > 0) {
      // Use custom configuration from request body
      updateConfig = body
      console.log('🔄 Updating product configuration with custom data:', updateConfig)
    } else {
      // Fallback to automatic bank details if no custom config provided
      if (!vendor.bankAccountHolderName || !vendor.bankAccountNumber || !vendor.bankIfscCode) {
        return NextResponse.json({ 
          success: false, 
          message: 'Bank details are required to update product configuration. Please complete the bank details step first.',
          missingFields: {
            bankAccountHolderName: !vendor.bankAccountHolderName,
            bankAccountNumber: !vendor.bankAccountNumber,
            bankIfscCode: !vendor.bankIfscCode
          }
        }, { status: 400 })
      }

      // Prepare settlement configuration using vendor's bank details
      updateConfig = {
        settlements: {
          beneficiary_name: vendor.bankAccountHolderName,
          account_number: parseInt(vendor.bankAccountNumber),
          ifsc_code: vendor.bankIfscCode
        }
      }
      console.log('🔄 Updating product configuration with bank details:', updateConfig)
    }

    // Update product configuration with Razorpay
    const razorpayAuth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64')
    
    const razorpayResponse = await fetch(`https://api.razorpay.com/v2/accounts/${vendor.razorpayAccountId}/products/${vendor.metadata.productConfiguration.productId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Basic ${razorpayAuth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateConfig)
    })

    const productConfigResult = await razorpayResponse.json()

    if (!razorpayResponse.ok) {
      console.error('❌ Failed to update product configuration:', productConfigResult)
      return NextResponse.json({ 
        success: false, 
        message: productConfigResult.error?.description || 'Failed to update product configuration',
        details: productConfigResult
      }, { status: 400 })
    }

    console.log('✅ Product configuration updated successfully')

    // Update vendor metadata with new configuration
    const updatedVendor = await vendor.update({
      metadata: {
        ...vendor.metadata,
        productConfiguration: {
          ...vendor.metadata.productConfiguration,
          activationStatus: productConfigResult.activation_status,
          requirements: productConfigResult.requirements,
          activeConfiguration: productConfigResult.active_configuration,
          requestedConfiguration: productConfigResult.requested_configuration,
          lastUpdated: Date.now()
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Product configuration updated with settlement details',
      data: {
        productConfiguration: productConfigResult,
        vendor: updatedVendor
      }
    })

  } catch (error) {
    console.error('❌ Error updating product configuration:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error while updating product configuration'
    }, { status: 500 })
  }
}