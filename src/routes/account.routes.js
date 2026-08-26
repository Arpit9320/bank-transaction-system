const express = require("express")
const authMiddlware = require("../middlewares/auth.middleware")
const accountController = require("../controllers/account.controller")

const router = express.Router()


/**
 * - POST: /api/accounts/
 * - Create new account
 * - Protected Routes
 */

router.post("/", authMiddlware.authMiddleware, accountController.createAccountController)


/**
 * - GET: /api/accounts/
 * - Get all accounts of the logged-in user
 * - Protected Route
 */

router.get("/", authMiddlware.authMiddleware, accountController.getUserAccountController)

/**
 * GET /api/accounts/balance/:accountId
 */

router.get("/balance/:accountId", authMiddlware.authMiddleware, accountController.getUserAccountBalance)


module.exports = router