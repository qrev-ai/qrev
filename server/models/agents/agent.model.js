import mongoose from "mongoose";
import { SUPPORTED_ARTIFACT_TYPES_ARRAY } from "../../config/qrev_crm/artifact.config";

const Schema = mongoose.Schema;

const AgentSchema = new Schema({
    _id: String,

    account: { type: Schema.Types.ObjectId, ref: "account" },
    created_by: { type: Schema.Types.ObjectId, ref: "User" },

    name: { type: String, required: true },
    description: { type: String, required: true },
    type: { type: String, required: true },

    created_on: { type: Date, default: Date.now },
    updated_on: { type: Date, default: Date.now },
    is_archived: { type: Boolean, default: false },

    execution_result_review_status: {
        type: String,
        enum: ["seen", "not_seen"],
    },

    /*
     * Added on 28th Jan 2025
     * this is the status updates of the agent
     * it is an array of objects
     * each object contains the status, message, progress, and added_on
     * message and progress are optional
     */
    status_updates: [
        {
            status: { type: String, required: true },
            message: { type: String },
            progress: { type: Number },
            added_on: { type: Date, default: Date.now },
        },
    ],
    artifact_type: { type: String, enum: SUPPORTED_ARTIFACT_TYPES_ARRAY },
});

export const Agent = mongoose.model("agent", AgentSchema, "agent");
