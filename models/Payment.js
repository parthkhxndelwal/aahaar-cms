module.exports = (sequelize, DataTypes) => {
  const Payment = sequelize.define(
    "Payment",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      orderId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "orders",
          key: "id",
        },
      },
      razorpayOrderId: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      razorpayPaymentId: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      razorpaySignature: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      paymentMethod: {
        type: DataTypes.ENUM("online", "cod"),
        allowNull: false,
        defaultValue: "online",
      },
      status: {
        type: DataTypes.ENUM("pending", "processing", "completed", "failed", "refunded"),
        allowNull: false,
        defaultValue: "pending",
      },
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
          min: 0,
        },
      },
      currency: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "INR",
      },
      gatewayResponse: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: {},
      },
      failureReason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      refundAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      refundReason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      vendorPayoutStatus: {
        type: DataTypes.ENUM("pending", "processing", "completed", "failed"),
        allowNull: false,
        defaultValue: "pending",
      },
      vendorPayoutAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      razorpayTransferId: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      platformFee: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      metadata: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: {},
      },
      processedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      refundedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      vendorPayoutAt: {
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
      tableName: "payments",
      indexes: [
        {
          unique: true,
          fields: ["orderId"],
        },
        {
          fields: ["razorpayOrderId"],
        },
        {
          fields: ["razorpayPaymentId"],
        },
        {
          fields: ["status"],
        },
        {
          fields: ["vendorPayoutStatus"],
        },
      ],
    },
  )

  return Payment
}
