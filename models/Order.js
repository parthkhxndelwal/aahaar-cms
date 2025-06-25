module.exports = (sequelize, DataTypes) => {
  const Order = sequelize.define(
    "Order",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      orderNumber: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      courtId: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
          model: "courts",
          key: "courtId",
        },
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: true, // Can be null for guest orders
        references: {
          model: "users",
          key: "id",
        },
      },
      vendorId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "vendors",
          key: "id",
        },
      },
      customerName: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: [2, 100],
        },
      },
      customerPhone: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          len: [10, 15],
        },
      },
      customerEmail: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          isEmail: true,
        },
      },
      type: {
        type: DataTypes.ENUM("user_initiated", "vendor_initiated"),
        allowNull: false,
        defaultValue: "user_initiated",
      },
      status: {
        type: DataTypes.ENUM("pending", "confirmed", "preparing", "ready", "completed", "cancelled"),
        allowNull: false,
        defaultValue: "pending",
      },
      paymentMethod: {
        type: DataTypes.ENUM("online", "cod"),
        allowNull: false,
        defaultValue: "online",
      },
      paymentStatus: {
        type: DataTypes.ENUM("pending", "paid", "failed", "refunded"),
        allowNull: false,
        defaultValue: "pending",
      },
      subtotal: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
          min: 0,
        },
      },
      taxAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      discountAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      totalAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
          min: 0,
        },
      },
      estimatedPreparationTime: {
        type: DataTypes.INTEGER, // in minutes
        allowNull: false,
        defaultValue: 15,
      },
      actualPreparationTime: {
        type: DataTypes.INTEGER, // in minutes
        allowNull: true,
      },
      specialInstructions: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      cancellationReason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      rating: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          min: 1,
          max: 5,
        },
      },
      feedback: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      qrCode: {
        type: DataTypes.TEXT,
        allowNull: true, // For vendor-initiated orders
      },
      razorpayOrderId: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      razorpayPaymentId: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      statusHistory: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
      },
      metadata: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: {},
      },
      confirmedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      preparingAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      readyAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      completedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      cancelledAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "orders",
      indexes: [
        {
          unique: true,
          fields: ["orderNumber"],
        },
        {
          fields: ["courtId", "status"],
        },
        {
          fields: ["userId"],
        },
        {
          fields: ["vendorId", "status"],
        },
        {
          fields: ["paymentStatus"],
        },
        {
          fields: ["createdAt"],
        },
      ],
    },
  )

  return Order
}
