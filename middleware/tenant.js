const { Court } = require("../models")

const validateCourtId = async (req, res, next) => {
  try {
    const courtId = req.params.courtId || req.query.courtId || req.body.courtId

    if (!courtId) {
      return res.status(400).json({
        success: false,
        message: "Court ID is required",
      })
    }

    const court = await Court.findOne({
      where: { courtId, status: "active" },
    })

    if (!court) {
      return res.status(404).json({
        success: false,
        message: "Court not found or inactive",
      })
    }

    req.court = court
    req.courtId = courtId
    next()
  } catch (error) {
    console.error("Court validation error:", error)
    return res.status(500).json({
      success: false,
      message: "Error validating court",
    })
  }
}

const addTenantScope = (req, res, next) => {
  // Add courtId to all database queries automatically
  const originalQuery = req.query
  req.query = {
    ...originalQuery,
    courtId: req.courtId,
  }

  next()
}

module.exports = {
  validateCourtId,
  addTenantScope,
}
