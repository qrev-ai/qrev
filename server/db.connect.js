import mongoose from "mongoose";
import { logger } from "./logger.js";

export function dbConnect() {
    connectToMongoDb();
    mongoose.connection.on("error", (error) => {
        logger.error(`Error connecting to db cluster: `, error);
    });
    mongoose.connection.on("disconnected", connectToMongoDb);
}

function connectToMongoDb() {
    const mongoDbUrl = process.env.MONGO_DB_URL;
    if (!mongoDbUrl) {
        logger.error("MONGO_DB_URL not found in .env");
        process.exit(1);
    }

    mongoose
        .connect(mongoDbUrl)
        .then(() => {
            logger.info(`Successfully connected to mongo db cluster`);
        })
        .catch((error) => {
            logger.error(`Error connecting to db cluster: ` + error);
        });
}
