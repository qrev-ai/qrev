import mongoose from "mongoose";
import { SUPPORTED_ARTIFACT_TYPES_ARRAY } from "../../config/qrev_crm/artifact.config.js";

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

    artifact_type: { type: String, enum: SUPPORTED_ARTIFACT_TYPES_ARRAY },

    is_sharing_enabled: { type: Boolean, default: false },

    /*
     * Added 'uploaded_file_s3_link' to store the S3 link of the uploaded file
     */
    uploaded_file_s3_link: { type: String },
});

export const Agent = mongoose.model("agent", AgentSchema, "agent");
