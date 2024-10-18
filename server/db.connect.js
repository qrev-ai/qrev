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

export function connectToQRevAnalyticsMongoDb() {
    // * We store analytics regarding prospects in a different db because this data maybe huge and we don't want to mix it with other data
    // * You can set this to same as MONGO_DB_URL if you don't want to create a new db cluster
    let url = process.env.QREV_MONGO_DB_2_URL;
    const QRevMongoConnection = mongoose.createConnection(url);
    QRevMongoConnection.on("error", (error) => {
        logger.error(`Error connecting to QRev Analytics db cluster: `, error);
    });

    QRevMongoConnection.on("disconnected", () => {
        logger.info(`QRev Analytics db cluster disconnected`);
    });

    QRevMongoConnection.on("connected", () => {
        logger.info(`Successfully connected to QRev Analytics db cluster`);
    });

    return QRevMongoConnection;
}
