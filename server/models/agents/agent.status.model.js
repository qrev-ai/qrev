import mongoose from "mongoose";

const Schema = mongoose.Schema;

const AgentStatusSchema = new Schema({
    _id: String,
    account: { type: Schema.Types.ObjectId, ref: "account" },
    agent: { type: String, ref: "agent", required: true },
    name: { type: String, required: true },
    state: {
        type: String,
        enum: ["started", "finished", "failed", "not_applicable"],
        required: true,
    },
    finished_on: { type: Date },
    message: { type: String },
    progress_percentage: {
        type: Number,
        min: 0,
        max: 100,
    },
    result_data: { type: Schema.Types.Mixed },
    error_message: { type: String },

    created_on: { type: Date, default: Date.now },
    updated_on: { type: Date, default: Date.now },
});

export const AgentStatus = mongoose.model(
    "agent.status",
    AgentStatusSchema,
    "agent.status"
);
