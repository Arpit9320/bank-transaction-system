const express = require("express")
const cookieParser = require("cookie-parser")


const app = express()
app.use(express.json())
app.use(cookieParser())

/**
 * -Routes required
 */
const authRouter = require("../src/routes/auth.routes")
const accountRouter = require("../src/routes/account.routes")
const transactionRouter = require("../src/routes/transaction.routes")


/**
 * - Use Routes
 */

app.get("/", (req, res)=>{
    res.send("LedgerFlow Service is Up and Running")
})

app.use("/api/auth", authRouter)
app.use("/api/accounts", accountRouter)
app.use("/api/transaction", transactionRouter)

module.exports = app