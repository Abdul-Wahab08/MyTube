import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const dbConnect = async () => {
    try {
        const dbConnection = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        console.log("MongoDb Connect SuccessFully!! DB Host: ", dbConnection.connection.host)
    } catch (error) {
        console.log("MongoDb Connection Failed! ", error)
        process.exit(1)
    }
}

export default dbConnect