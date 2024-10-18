import { QRevAnalyticsMongoDbClient } from "../../server.js";
import mongoose from "mongoose";

export function getAnalyzedProspectsCollection() {
    const ProspectsCollection = QRevAnalyticsMongoDbClient.model(
        process.env.PROSPECTS_ANALYZED_COLLECTION_NAME,
        new mongoose.Schema({
            up_id: String,
            score: Number,
            reasoning: [],
            qrev_metadata: {},
        }),
        process.env.PROSPECTS_ANALYZED_COLLECTION_NAME
    );

    return ProspectsCollection;
}

export function getProspectsCollection() {
    const ProspectsCollection = QRevAnalyticsMongoDbClient.model(
        process.env.PROSPECTS_COLLECTION_NAME,
        new mongoose.Schema({
            up_id: String,
            first_name: String,
            last_name: String,
            business_email: String,
            linkedin_url: String,
            job_title: String,
            company_name: String,
        }),
        process.env.PROSPECTS_COLLECTION_NAME
    );

    return ProspectsCollection;
}
