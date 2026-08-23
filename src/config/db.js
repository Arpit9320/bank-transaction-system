const mongoose = require("mongoose")

async function ConnectDB() {
    
    try {
        
        await mongoose.connect(process.env.MONGO_URI)

        console.log("Connected to DB")

    } catch (error) {
        console.log("Can't connect to DB", error)
        process.exit(1)
    }
}


module.exports = ConnectDB