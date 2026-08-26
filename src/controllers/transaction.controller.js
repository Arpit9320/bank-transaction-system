const transactionModel = require("../models/transaction.model")
const ledgerModel = require("../models/ledger.model")
const emailService = require("../services/email.service")
const accountModel = require("../models/account.model")
const mongoose = require("mongoose")


/**
 * Create new transaction
 **  The 10-Step Transfer flow:
        * 1. Validate request
        * 2. Check account status
        * 3. Validate idempotency Key
        * 4. Derive sender balance from ledger
        * 5. create transaction (PENDING)
        * 6. create DEBIT ledger entry
        * 7. create CREDIT ledger entry
        * 8. Mark transaction completed
        * 9. commit MongoDB session
        * 10. send email notification 
 */

async function createTransaction(req, res) {
    

    /**
     * 1. Validate request
     */
    const {fromAccount, toAccount, amount, idempotencyKey} = req.body

    if(!fromAccount || !toAccount || !amount ||!idempotencyKey){
        return res.status(400).json({
            message: "fromAccount, toAccount, amount and idempotencyKey are required"
        })
    }

    if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
        return res.status(400).json({
            message: "Amount must be a valid number greater than zero"
        })
    }

    if (!mongoose.Types.ObjectId.isValid(fromAccount)) {
        return res.status(400).json({
            message: "Invalid fromAccount"
        })
    }


    if (!mongoose.Types.ObjectId.isValid(toAccount)) {
        return res.status(400).json({
            message: "Invalid toAccount"
        })
    }

    const fromUserAccount = await accountModel.findOne({
        _id: fromAccount
    })

    if(!fromUserAccount){
        return res.status(400).json({
            message: "Sender Account does not exists"
        })
    }

    const toUserAccount = await accountModel.findOne({
        _id: toAccount
    })

    if(!toUserAccount){
        return res.status(400).json({
            message: "Receiver's Account does not exists"
        })
    }


    /**
     * 2. Check account status
    */


    if(fromUserAccount.status !== "ACTIVE" || toUserAccount.status !== "ACTIVE"){
        return res.status(400).json({
            message: "Both fromAccount and toAccount status must be ACTIVE to process a transaction"
        })
    }


    /**
     * 3. Validate idempotency Key
     */

    const isTransactionAlreadyExists = await transactionModel.findOne({
        idempotencyKey
    })

    if(isTransactionAlreadyExists){
        if(isTransactionAlreadyExists.status === "COMPLETED"){
            return res.status(200).json({
                message: "Transaction already processed",
                transction: isTransactionAlreadyExists
            })
        }

        if(isTransactionAlreadyExists.status === "PENDING"){
            return res.status(200).json({
                message: "Transaction is in process"
            })
        }

        if(isTransactionAlreadyExists.status === "FAILED"){
            return res.status(500).json({
                message: "Transaction Failed, Please try again"
            })
        }

        if(isTransactionAlreadyExists.status === "REVERSED"){
            return res.status(400).json({
                message: "Transaction was reversed. Please try again"
            })
        }

    }


    /**
     * 4. Derive sender balance from ledger
     */

    const balance = await fromUserAccount.getBalance()

    if(balance < amount){
        return res.status(400).json({
            message: `Insufficient Balance. Current Balance is ${balance}`
        })
    }


    /**
     * 5. create transaction (PENDING)
     */

    let transaction
    let session
    
    try{

        session = await mongoose.startSession()
        session.startTransaction()

        transaction = (await transactionModel.create([{
            fromAccount,
            toAccount,
            amount,
            idempotencyKey,
            status: "PENDING"
        }], {session}))[0]

        await ledgerModel.create([{
            account: fromAccount,
            amount,
            transaction: transaction._id,
            type: "DEBIT"
        }], {session})

        await (() => {
            return new Promise((resolve) => setTimeout(resolve, 15 * 1000));
        })()

        await ledgerModel.create([{
            account: toAccount,
            amount,
            transaction: transaction._id,
            type: "CREDIT"
        }], {session})

        await transactionModel.findOneAndUpdate(
            {_id: transaction._id},
            {status: "COMPLETED"},
            {session}
        )


        await session.commitTransaction()
    
    }catch(error){
        await session.abortTransaction()
    
        await emailService.sendTransactionFailureEmail(req.user.email, req.user.name, amount, toAccount)
        
        console.log("Error", error)

        return res.status(500).json({
            message: "Transaction failed due to internal error",
        })
        

    }finally{
        if (session) {
            await session.endSession()
        }
    }


    /**
     * 10. send email notification
     */

    await emailService.sendTransactionEmail(req.user.email, req.user.name, amount, toAccount)

    res.status(201).json({
        message: "Transaction Completed Successfully!",
        transaction
    })

}


async function createInitialFundTransaction(req, res) {
    
    const {toAccount, amount, idempotencyKey} = req.body

    if(!toAccount || !amount || !idempotencyKey){
        return res.status(400).json({
            message: "toAccount, amount and idempotencyKey are required"
        })
    }

    if (!mongoose.Types.ObjectId.isValid(toAccount)) {
        return res.status(400).json({
            message: "Invalid toAccount"
        })
    }

    if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
        return res.status(400).json({
            message: "Amount must be a valid number greater than zero"
        })
    }

    const toUserAccount = await accountModel.findOne({
        _id: toAccount
    })

    if(!toUserAccount){
        return res.status(400).json({
            message: "Receiver's account does not exists"
        })
    }

    const fromUserAccount = await accountModel.findOne({
        user: req.user._id
    })

    if(!fromUserAccount){
        return res.status(400).json({
            message: "System Account does not exists"
        })
    }

    const isTransactionAlreadyExists = await transactionModel.findOne({
        idempotencyKey
    })

    if(isTransactionAlreadyExists){
        if(isTransactionAlreadyExists.status === "COMPLETED"){
            return res.status(200).json({
                message: "Transaction already processed",
                transaction: isTransactionAlreadyExists
            })
        }

        if(isTransactionAlreadyExists.status === "PENDING"){
            return res.status(200).json({
                message: "Transaction is in process"
            })
        }

        if(isTransactionAlreadyExists.status === "FAILED"){
            return res.status(500).json({
                message: "Transaction Failed, Please try again"
            })
        }

        if(isTransactionAlreadyExists.status === "REVERSED"){
            return res.status(400).json({
                message: "Transaction was reversed. Please try again"
            })
        }

    }

    let session
    let transaction

    try {
        
        session = await mongoose.startSession()
        session.startTransaction()
    
        transaction = new transactionModel({
            fromAccount: fromUserAccount._id,
            toAccount,
            amount,
            idempotencyKey,
            status: "PENDING"
        })
    
    
        await ledgerModel.create([{
            account: fromUserAccount._id,
            amount,
            transaction: transaction._id,
            type: "DEBIT"
        }], {session})
        
    
        await ledgerModel.create([{
            account: toAccount,
            amount,
            transaction: transaction._id,
            type: "CREDIT"
        }], {session})
    
    
        transaction.status = "COMPLETED"
        await transaction.save({session})
        
        
        await session.commitTransaction()

    } catch (error) {
        await session.abortTransaction()
        
        console.log("Error", error)

        return res.status(500).json({
            message: "Transaction failed due to internal error",
        })
        

    }finally{
        if (session) {
            await session.endSession()
        }
    }


    return res.status(201).json({
        message: "Initial fund transaction completed successfully",
        transaction
    })

}

module.exports = {
    createTransaction,
    createInitialFundTransaction
}