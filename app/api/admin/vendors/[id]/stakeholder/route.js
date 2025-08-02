import { NextResponse } from 'next/server'
import db from '@/models'

export async function POST(request, { params }) {
  try {
    const { vendorId } = await params
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

    // Prepare stakeholder data for Razorpay API
    const stakeholderData = {
      name: body.name,
      email: body.email,
      percentage_ownership: body.percentage_ownership,
      relationship: body.relationship,
      phone: body.phone,
      addresses: body.addresses,
      kyc: body.kyc,
      notes: body.notes || {}
    }

    console.log('🔄 Calling Razorpay API to create stakeholder...')

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

    // Update vendor with stakeholder information
    const updatedVendor = await vendor.update({
      metadata: {
        ...vendor.metadata,
        stakeholderId: razorpayResult.id,
        stakeholderData: stakeholderData,
        stakeholderCreated: true,
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

    return NextResponse.json({
      success: true,
      message: 'Stakeholder created successfully',
      data: {
        stakeholder: razorpayResult,
        vendor: updatedVendor
      }
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
    const { vendorId } = await params

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
