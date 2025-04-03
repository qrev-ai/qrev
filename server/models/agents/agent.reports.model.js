import mongoose from "mongoose";

const Schema = mongoose.Schema;

const AgentReportsSchema = new Schema({
    _id: String,
    account: { type: Schema.Types.ObjectId, ref: "account" },
    owner: { type: Schema.Types.ObjectId, ref: "User" },
    agent: { type: String, ref: "agent" },

    company_id: { type: String, ref: "agent.artifact" },
    company_name: { type: String },

    topic_title: { type: String },
    topic_description: { type: String },

    summary: [],
    sources: [],
    /*
     * Added "queries" on 3rd Apr 2025.
     * this will store the search queries used to generate the report.
     * This is not used or shown anywhere. It is just for internal reference.
     */
    queries: [],

    created_on: { type: Date, default: Date.now },
    updated_on: { type: Date, default: Date.now },
});

export const AgentReports = mongoose.model(
    "agent.reports",
    AgentReportsSchema,
    "agent.reports"
);
