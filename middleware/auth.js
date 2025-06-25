const jwt = require("jsonwebtoken")
const { User, Court } = require("../models")

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"]
    const token = authHeader && authHeader.split(" ")[1]

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access token required",
      })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    // Fetch user with court information
    const user = await User.findByPk(decoded.userId, {
      include: [
        {
          model: Court,
          as: "court",
          attributes: ["courtId", "instituteName", "status"],
        },
      ],
    })

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid token - user not found",
      })
    }

    if (user.status !== "active") {
      return res.status(401).json({
        success: false,
        message: "User account is not active",
      })
    }

    if (user.court && user.court.status !== "active") {
      return res.status(401).json({
        success: false,
        message: "Court is not active",
      })
    }

    // Add user and court info to request
    req.user = user
    req.courtId = user.courtId

    next()
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      })
    }
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expired",
      })
    }

    console.error("Auth middleware error:", error)
    return res.status(500).json({
      success: false,
      message: "Authentication error",
    })
  }
}

// Next.js API Route compatible auth middleware
const authenticateTokenNextJS = async (request) => {
  try {
    const authHeader = request.headers.get("authorization")
    const token = authHeader && authHeader.split(" ")[1]

    if (!token) {
      return { error: "Access token required", status: 401 }
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    // Fetch user with court information
    const user = await User.findByPk(decoded.userId, {
      include: [
        {
          model: Court,
          as: "court",
          attributes: ["courtId", "instituteName", "status"],
        },
      ],
    })

    if (!user) {
      return { error: "Invalid token - user not found", status: 401 }
    }

    if (user.status !== "active") {
      return { error: "User account is not active", status: 401 }
    }

    if (user.court && user.court.status !== "active") {
      return { error: "Court is not active", status: 401 }
    }

    return { user, courtId: user.courtId }
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return { error: "Invalid token", status: 401 }
    }
    if (error.name === "TokenExpiredError") {
      return { error: "Token expired", status: 401 }
    }

    console.error("Auth middleware error:", error)
    return { error: "Authentication error", status: 500 }
  }
}

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      })
    }

    const userRole = req.user.role
    const allowedRoles = Array.isArray(roles) ? roles : [roles]

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${allowedRoles.join(" or ")}`,
      })
    }

    next()
  }
}

const requireCourtAccess = (req, res, next) => {
  const courtIdFromParams = req.params.courtId || req.query.courtId || req.body.courtId

  if (courtIdFromParams && courtIdFromParams !== req.courtId) {
    return res.status(403).json({
      success: false,
      message: "Access denied to this court",
    })
  }

  next()
}

module.exports = {
  authenticateToken,
  authenticateTokenNextJS,
  requireRole,
  requireCourtAccess,
}
