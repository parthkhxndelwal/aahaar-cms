module.exports = (sequelize, DataTypes) => {
  const CourtSettings = sequelize.define(
    "CourtSettings",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      courtId: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        references: {
          model: "courts",
          key: "courtId",
        },
      },
      allowOnlinePayments: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      allowCOD: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      maxOrdersPerUser: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 5,
      },
      orderBufferTime: {
        type: DataTypes.INTEGER, // in minutes
        allowNull: false,
        defaultValue: 5,
      },
      allowedEmailDomains: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
      },
      requireEmailVerification: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      requirePhoneVerification: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      platformFeePercentage: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 2.5,
      },
      minimumOrderAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      maximumOrderAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 5000.0,
      },
      autoAcceptOrders: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      orderCancellationWindow: {
        type: DataTypes.INTEGER, // in minutes
        allowNull: false,
        defaultValue: 5,
      },
      themeSettings: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: {
          primaryColor: "#3B82F6",
          secondaryColor: "#10B981",
          accentColor: "#F59E0B",
        },
      },
      notificationSettings: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: {
          emailNotifications: true,
          smsNotifications: false,
          pushNotifications: true,
        },
      },
      integrationSettings: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: {
          razorpayEnabled: true,
          cloudinaryEnabled: true,
        },
      },
      metadata: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: {},
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
      tableName: "court_settings",
      indexes: [
        {
          unique: true,
          fields: ["courtId"],
        },
      ],
    },
  )

  return CourtSettings
}
