const userModel = require("../models/user.model")
const jwt = require("jsonwebtoken")
const tokenBlackListModel = require("../models/blacklist.model")




async function authMiddleware(req, res, next) {
    
    const token = req.cookies.token || req.headers.authorization?.split(" ")[1]


    if(!token){
        return res.status(401).json({
            message: "Please Login to continue"
        })
    }

    const isBlacklisted = await tokenBlackListModel.findOne({ token })

    if (isBlacklisted) {
        return res.status(401).json({
            message: "Unauthorized access, token is invalid"
        })
    }

    try {
        
        const decoded = await jwt.verify(token, process.env.JWT_SECRET)
    
        if(!decoded){
            return res.status(401).json({
                message: "Unauthorized"
            })
        }

        const user = await userModel.findById(decoded.userId)
    
        req.user = user
        return next()

    } catch (error) {
        console.log("Error while authenticating", error)
        return res.status(401).json({
            message: "Cannot authenticate, Please try again"
        })
    }

}

async function authSystemUserMiddleware(req, res, next) {

    const token = req.cookies.token || req.headers.authorization?.split(" ")[1]

    if(!token){
        return res.status(401).json({
            message: "Please Login to continue"
        })
    }

    const isBlacklisted = await tokenBlackListModel.findOne({ token })

    if (isBlacklisted) {
        return res.status(401).json({
            message: "Unauthorized access, token is invalid"
        })
    }

    try {
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
    
        if(!decoded){
            return res.status(401).json({
                message: "Unauthorized"
            })
        }
    
        const user = await userModel.findById(decoded.userId).select("+systemUser")
        if(!user.systemUser){
            return res.status(403).json({
                message: "Forbidden access, not a system user"
            })
        }
    
        req.user = user
        return next()


    } catch (error) {
        console.log("Error while authenticating", error)
        return res.status(401).json({
            message: "Cannot authenticate, Please try again"
        })
    }

    
}


module.exports = {
    authMiddleware,
    authSystemUserMiddleware
}