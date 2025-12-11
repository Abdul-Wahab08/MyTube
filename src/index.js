import dotenv from 'dotenv'
import dbConnect from './db/index.js'
import { app } from './app.js'

dotenv.config({ path: './.env' })

dbConnect()
    .then(() => {
        app.listen(process.env.PORT || 8000, () => {
            console.log(`⚙️  Server is running on Port ${process.env.PORT}`)
        })
        app.on("Error", (error) => {
            console.log(`Error: ${error}`)
        })
    })
    .catch((error) => {
        console.log(`MongoDb Connection Failed!! Error: ${error}`)
    })