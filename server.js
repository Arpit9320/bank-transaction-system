require("dotenv").config()
const app = require("./src/app")
const connectDB = require("./src/config/db")

connectDB()

const PORT = process.env.PORT || 3000;

app.listen(3000, ()=>{
    console.log(`Server is running on port ${PORT}`)
})