const accountModel = require("../models/account.model")


async function createAccountController(req, res) {
    
    const user = req.user

    const account = await accountModel.create({
        user: user._id
    })

    res.status(201).json({
        account
    })

}


async function getUserAccountController(req, res){

    const accounts = await accountModel.find({
        user: req.user._id
    })

    if(accounts.length === 0){
        return res.status(401).json({
            message: "User does not have any account"
        })
    }

    return res.status(200).json({
        message: "Associated accounts fetched successfully",
        accounts
    })

}

async function getUserAccountBalance(req, res) {
    
    const accountId = req.params.accountId


    const account = await accountModel.findOne({
        _id: accountId,
        user: req.user._id
    })

    if(!account){
        return res.status(401).json({
            message: "Account not found"
        })
    }

    const balance = await account.getBalance()

    res.status(200).json({
        accountId,
        balance
    })

}


module.exports = {
    createAccountController,
    getUserAccountController,
    getUserAccountBalance
}