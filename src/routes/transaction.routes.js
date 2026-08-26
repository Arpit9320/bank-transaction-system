const {Router} = require("express")
const transactionController = require("../controllers/transaction.controller")
const authMiddleware = require("../middlewares/auth.middleware")

const transactionRoutes = Router()


/**
 * - POST: /api/transaction/
 * - Create a new transaction
 */

transactionRoutes.post("/", authMiddleware.authMiddleware, transactionController.createTransaction)

/**
 * - POST /api/transaction/system/intial-fund
 * - Create initial fund transaction from system user 
 */

transactionRoutes.post("/system/intial-fund", authMiddleware.authSystemUserMiddleware, transactionController.createInitialFundTransaction)



module.exports = transactionRoutes