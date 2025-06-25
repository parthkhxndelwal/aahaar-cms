import { NextResponse } from "next/server"
import { Order, Payment, Vendor, User } from "@/models"
import { authenticateToken } from "@/middleware/auth"
import { Op, Sequelize } from "sequelize"

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
  host: process.env.DB_HOST,
  dialect: "mysql",
})

export async function GET(request, { params }) {
  try {
    const authResult = await authenticateToken(request)
    if (authResult instanceof NextResponse) return authResult

    const { courtId } = params
    const { searchParams } = new URL(request.url)
    const period = searchParams.get("period") || "7d" // 7d, 30d, 90d

    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()

    switch (period) {
      case "7d":
        startDate.setDate(endDate.getDate() - 7)
        break
      case "30d":
        startDate.setDate(endDate.getDate() - 30)
        break
      case "90d":
        startDate.setDate(endDate.getDate() - 90)
        break
    }

    // Get total orders
    const totalOrders = await Order.count({
      where: {
        courtId,
        createdAt: { [Op.between]: [startDate, endDate] },
      },
    })

    // Get total revenue
    const revenueResult = await Payment.findOne({
      attributes: [[sequelize.fn("SUM", sequelize.col("amount")), "totalRevenue"]],
      include: [
        {
          model: Order,
          as: "order",
          where: {
            courtId,
            createdAt: { [Op.between]: [startDate, endDate] },
          },
          attributes: [],
        },
      ],
      where: { status: "completed" },
    })

    const totalRevenue = revenueResult?.dataValues?.totalRevenue || 0

    // Get active vendors count
    const activeVendors = await Vendor.count({
      where: { courtId, status: "active" },
    })

    // Get registered users count
    const totalUsers = await User.count({
      where: { courtId, role: "user" },
    })

    // Get top vendors by order count
    const topVendors = await Vendor.findAll({
      where: { courtId },
      include: [
        {
          model: Order,
          as: "orders",
          where: {
            createdAt: { [Op.between]: [startDate, endDate] },
          },
          attributes: [],
        },
      ],
      attributes: ["id", "stallName", "vendorName", [sequelize.fn("COUNT", sequelize.col("orders.id")), "orderCount"]],
      group: ["Vendor.id"],
      order: [[sequelize.literal("orderCount"), "DESC"]],
      limit: 5,
    })

    // Get order status distribution
    const orderStatusStats = await Order.findAll({
      where: {
        courtId,
        createdAt: { [Op.between]: [startDate, endDate] },
      },
      attributes: ["status", [sequelize.fn("COUNT", sequelize.col("id")), "count"]],
      group: ["status"],
    })

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalOrders,
          totalRevenue: Number.parseFloat(totalRevenue),
          activeVendors,
          totalUsers,
        },
        topVendors,
        orderStatusStats,
        period,
      },
    })
  } catch (error) {
    console.error("Dashboard analytics error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
