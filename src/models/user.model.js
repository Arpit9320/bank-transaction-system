const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")


const userSchema = new mongoose.Schema({

    email:{
        type: String,
        required: [true, "Email is required for creating an account"],
        trim: true,
        lowercase: true,
        match: [/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
            "Invalid email address"
        ],
        unique: [true, "Email already exists"]
    },
    name:{
        type: String,
        required: [true, "Name is required for creating an account"]
    },
    password:{
        type: String,
        required: [true, "Password is required for creating an account"],
        minlength: [8, "Password Should contain more than 6 characters"],
        match: [/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,20}$/,
            "Password must be 8–20 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character (e.g. @, #, !, $)."
        ],
        select: false
    }
},{
    timestamps: true
})


userSchema.pre("save", async function (next) {
    
    if (!this.isModified("password")) {
        return next()
    }

    const hash = await bcrypt.hash(this.password, 10)
    this.password = hash


    return next()

})

userSchema.methods.comparePassword = async function (password) {
    
    return await bcrypt.compare(password, this.password)

}


const userModel = mongoose.model("user", userSchema)

module.exports = userModel

