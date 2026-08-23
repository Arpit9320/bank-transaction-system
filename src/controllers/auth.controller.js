const userModel = require("../models/user.model")
const jwt = require("jsonwebtoken")


/**
 * 
 * - user register controller 
 * - POST: /api/auth/register
 */
async function userRegisterController(req, res){

    const {email, password, name} = req.body

    const isExists = await userModel.findOne({
        email
    })

    if(isExists){
        return res.status(422).json({
            message: "User already exists with this email",
            status: "Failed"
        })
    }


    const user = await userModel.create({
        email, password, name
    })

    const token = await jwt.sign({userId: user._id}, process.env.JWT_SECRET, {expiresIn: "3d"})

    res.cookie("token", token)

    res.status(201).json({
        message: "User registered successfully",
        user:{
            _id: user._id,
            name: user.name,
            email: user.email
        }
    })

}



/**
 * 
 *  - user login controller
 *  - POST: /api/auth/login 
 */
async function userLogInController(req, res) {
    
    const {email, password, name} = req.body

    const user = await userModel.findOne({
        $or:[
            {name},
            {email}
        ]
    }).select("+password")

    if(!user){
        return res.status(401).json({
            message: "Invalid credentails"
        })
    }


    const isPasswordValid = await user.comparePassword(password)

    if(!isPasswordValid){
        return res.status(401).json({
            message: "Wrong Password"
        })
    }

    const token = jwt.sign({userId: user._id}, process.env.JWT_SECRET, {expiresIn: "3d"})

    res.cookie("token", token)

    res.status(200).json({
        message: "Login Successfull",
        user: {
            _id: user._id,
            name: user.name,
            email: user.email
        }
    })  

}

module.exports = {
    userRegisterController,
    userLogInController
}