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

    created_on: { type: Date, default: Date.now },
    updated_on: { type: Date, default: Date.now },
});

export const AgentReports = mongoose.model(
    "agent.reports",
    AgentReportsSchema,
    "agent.reports"
);
