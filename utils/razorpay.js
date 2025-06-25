const Razorpay = require("razorpay")

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
})

const createOrder = async (amount, currency = "INR", receipt, notes = {}) => {
  try {
    const options = {
      amount: Math.round(amount * 100), // Convert to paise
      currency,
      receipt,
      notes,
    }

    const order = await razorpay.orders.create(options)
    return { success: true, order }
  } catch (error) {
    console.error("Razorpay create order error:", error)
    return { success: false, error: error.message }
  }
}

const verifyPayment = (razorpayOrderId, razorpayPaymentId, razorpaySignature) => {
  try {
    const crypto = require("crypto")
    const body = razorpayOrderId + "|" + razorpayPaymentId
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex")

    return expectedSignature === razorpaySignature
  } catch (error) {
    console.error("Payment verification error:", error)
    return false
  }
}

const createFundAccount = async (contactId, accountDetails) => {
  try {
    const fundAccount = await razorpay.fundAccount.create({
      contact_id: contactId,
      account_type: "bank_account",
      bank_account: {
        name: accountDetails.accountHolderName,
        ifsc: accountDetails.ifscCode,
        account_number: accountDetails.accountNumber,
      },
    })

    return { success: true, fundAccount }
  } catch (error) {
    console.error("Create fund account error:", error)
    return { success: false, error: error.message }
  }
}

const createContact = async (name, email, contact, type = "vendor") => {
  try {
    const contactData = await razorpay.contacts.create({
      name,
      email,
      contact,
      type,
    })

    return { success: true, contact: contactData }
  } catch (error) {
    console.error("Create contact error:", error)
    return { success: false, error: error.message }
  }
}

const createPayout = async (fundAccountId, amount, currency = "INR", mode = "IMPS", purpose = "payout") => {
  try {
    const payout = await razorpay.payouts.create({
      account_number: process.env.RAZORPAY_ACCOUNT_NUMBER,
      fund_account_id: fundAccountId,
      amount: Math.round(amount * 100), // Convert to paise
      currency,
      mode,
      purpose,
    })

    return { success: true, payout }
  } catch (error) {
    console.error("Create payout error:", error)
    return { success: false, error: error.message }
  }
}

module.exports = {
  razorpay,
  createOrder,
  verifyPayment,
  createFundAccount,
  createContact,
  createPayout,
}
