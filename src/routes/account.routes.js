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



module.exports = router