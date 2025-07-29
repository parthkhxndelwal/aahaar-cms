import { NextResponse } from "next/server"
import crypto from "crypto"
import { Vendor } from "@/models"

// POST - Handle Razorpay Webhooks
export async function POST(request) {
  try {
    const body = await request.text()
    const signature = request.headers.get('x-razorpay-signature')
    
    if (!signature) {
      return NextResponse.json({
        success: false,
        message: "Missing webhook signature"
      }, { status: 400 })
    }

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(body)
      .digest('hex')

    if (expectedSignature !== signature) {
      console.error("Invalid webhook signature")
      return NextResponse.json({
        success: false,
        message: "Invalid signature"
      }, { status: 401 })
    }

    const event = JSON.parse(body)
    console.log("Received Razorpay webhook:", event.event, event.payload?.account?.entity?.id)

    // Handle different webhook events
    switch (event.event) {
      case 'account.activated':
        await handleAccountActivated(event.payload.account.entity)
        break
      
      case 'account.suspended':
        await handleAccountSuspended(event.payload.account.entity)
        break
      
      case 'account.funds_on_hold':
        await handleAccountFundsOnHold(event.payload.account.entity)
        break
      
      case 'account.funds_released':
        await handleAccountFundsReleased(event.payload.account.entity)
        break
      
      default:
        console.log("Unhandled webhook event:", event.event)
    }

    return NextResponse.json({
      success: true,
      message: "Webhook processed successfully"
    })

  } catch (error) {
    console.error("Webhook processing error:", error)
    return NextResponse.json({
      success: false,
      error: error.message || "Internal server error"
    }, { status: 500 })
  }
}

async function handleAccountActivated(account) {
  try {
    console.log(`Account activated: ${account.id}`)
    
    // Update vendor status to active if razorpay account is activated
    await Vendor.update(
      { 
        status: 'active',
        metadata: {
          razorpayAccountActivatedAt: new Date().toISOString()
        }
      },
      { 
        where: { razorpayAccountId: account.id }
      }
    )
    
    console.log(`Updated vendor status for Razorpay account: ${account.id}`)
  } catch (error) {
    console.error("Error handling account activation:", error)
  }
}

async function handleAccountSuspended(account) {
  try {
    console.log(`Account suspended: ${account.id}`)
    
    // Update vendor status to suspended
    await Vendor.update(
      { 
        status: 'suspended',
        metadata: {
          razorpayAccountSuspendedAt: new Date().toISOString(),
          suspensionReason: 'Razorpay account suspended'
        }
      },
      { 
        where: { razorpayAccountId: account.id }
      }
    )
    
    console.log(`Suspended vendor for Razorpay account: ${account.id}`)
  } catch (error) {
    console.error("Error handling account suspension:", error)
  }
}

async function handleAccountFundsOnHold(account) {
  try {
    console.log(`Account funds on hold: ${account.id}`)
    
    // Update vendor metadata to reflect funds on hold
    const vendor = await Vendor.findOne({ where: { razorpayAccountId: account.id } })
    if (vendor) {
      const updatedMetadata = {
        ...vendor.metadata,
        razorpayFundsOnHold: true,
        fundsOnHoldAt: new Date().toISOString()
      }
      
      await vendor.update({ metadata: updatedMetadata })
      console.log(`Updated funds on hold status for vendor: ${vendor.id}`)
    }
  } catch (error) {
    console.error("Error handling funds on hold:", error)
  }
}

async function handleAccountFundsReleased(account) {
  try {
    console.log(`Account funds released: ${account.id}`)
    
    // Update vendor metadata to reflect funds released
    const vendor = await Vendor.findOne({ where: { razorpayAccountId: account.id } })
    if (vendor) {
      const updatedMetadata = {
        ...vendor.metadata,
        razorpayFundsOnHold: false,
        fundsReleasedAt: new Date().toISOString()
      }
      
      await vendor.update({ metadata: updatedMetadata })
      console.log(`Updated funds released status for vendor: ${vendor.id}`)
    }
  } catch (error) {
    console.error("Error handling funds released:", error)
  }
}
