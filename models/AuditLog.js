module.exports = (sequelize, DataTypes) => {
  const AuditLog = sequelize.define(
    "AuditLog",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
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
        allowNull: true,
        references: {
          model: "users",
          key: "id",
        },
      },
      action: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: [2, 100],
        },
      },
      entityType: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: [2, 50],
        },
      },
      entityId: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      oldValues: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      newValues: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      ipAddress: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      userAgent: {
        type: DataTypes.TEXT,
        allowNull: true,
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
    },
    {
      tableName: "audit_logs",
      updatedAt: false,
      indexes: [
        {
          fields: ["courtId", "createdAt"],
        },
        {
          fields: ["userId"],
        },
        {
          fields: ["action"],
        },
        {
          fields: ["entityType", "entityId"],
        },
      ],
    },
  )

  return AuditLog
}
