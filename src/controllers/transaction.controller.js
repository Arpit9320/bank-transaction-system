const transactionModel = require("../models/transaction.model")
const ledgerModel = require("../models/ledger.model")
const emailService = require("../services/email.service")
const accountModel = require("../models/account.model")
const mongoose = require("mongoose")


/**
 * Create new transaction
 **  The 10-Step Transfer flow:
        * 1. Validate request
        * 2. Validate idempotency Key
        * 3. Check account status
        * 4. Derive sender balance from ledger
        * 5. create transaction (PENDING)
        * 6. create DEBIT ledger entry
        * 7. create CREDIT ledger entry
        * 8. Mark transaction completed
        * 9. commit MongoDB session
        * 10. send email notification 
 */

async function createTranstion(req, res) {
    

    /**
     * 1. Validate request
     */
    const {fromAccount, toAccount, amount, idempotencyKey} = req.body

    if(!fromAccount || !toAccount || !amount ||!idempotencyKey){
        return res.status(400).json({
            message: "fromAccount, toAccount, amount and idempotencyKey are required"
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
     * 2. Validate idempotency Key
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

        if(isTransactionAlreadyExists.status === "Failed"){
            return res.status(500).json({
                message: "Transaction Failed, Please try again"
            })
        }

        if(isTransactionAlreadyExists.status === "REVERSED"){
            return res.status(500).json({
                message: "Transaction was reversed. Please try again"
            })
        }

    }


    /**
     * 3. Check account status
     */


    if(fromUserAccount.status !== "ACTIVE" || toUserAccount.status !== "ACTIVE"){
        return res.status(500).json({
            message: "Both fromAccount and toAccount status must be ACTIVE to process a transaction"
        })
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

    const session = await mongoose.startSession()
    session.startTransaction()

    const transaction = new transactionModel({
        fromAccount,
        toAccount,
        amount,
        idempotencyKey,
        status: "PENDING"
    })

    const debitLedgerEntry = await ledgerModel.create([{
        account: fromAccount,
        amount,
        transaction: transaction._id,
        type: "DEBIT"
    }], {session})

    const creditLedgerEntry = await ledgerModel.create([{
        account: toAccount,
        amount,
        transaction: transaction._id,
        type: "CREDIT"
    }], {session})

    transaction.status = "COMPLETED"
    await transaction.save({session})


    await session.commitTransaction(),
    session.endSession()


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

    const session = await mongoose.startSession()
    session.startTransaction()

    const transaction = new transactionModel({
        fromAccount: fromUserAccount._id,
        toAccount,
        amount,
        idempotencyKey,
        status: "PENDING"
    })

    const debitLedgerEntry = await ledgerModel.create([{
        account: fromUserAccount._id,
        amount,
        transaction: transaction._id,
        type: "DEBIT"
    }], {session})
    
    const creditLedgerEntry = await ledgerModel.create([{
        account: toAccount,
        amount,
        transaction: transaction._id,
        type: "CREDIT"
    }], {session})


    transaction.status = "COMPLETED"
    await transaction.save({session})
    
    
    await session.commitTransaction()
    session.endSession()


    return res.status(201).json({
        message: "Initial fund transaction completed successfully",
        transaction
    })

}

module.exports = {
    createTranstion,
    createInitialFundTransaction
}