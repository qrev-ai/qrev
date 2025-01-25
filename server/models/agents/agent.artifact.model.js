import mongoose from "mongoose";
import { SUPPORTED_ARTIFACT_TYPES_ARRAY } from "../../config/qrev_crm/artifact.config";

const Schema = mongoose.Schema;

const AgentArtifactSchema = new Schema({
    _id: String,
    account: { type: Schema.Types.ObjectId, ref: "account" },
    owner: { type: Schema.Types.ObjectId, ref: "User" },
    type: {
        type: String,
        required: true,
        enum: SUPPORTED_ARTIFACT_TYPES_ARRAY,
    },
    agent: { type: String, ref: "agent" },
    properties: {},
    /*
    will have like below:
    {
        confidence_score: { type: Number, default: 0 },
        analysis_reasons: ["...."],
    }
    */
    analysis_result: {},
    /*
    review_status: { status: "pending", updated_on: Date value }
    */
    review_status: {},

    created_on: { type: Date, default: Date.now },
    updated_on: { type: Date, default: Date.now },
});

export const AgentArtifact = mongoose.model(
    "agent.artifact",
    AgentArtifactSchema,
    "agent.artifact"
);
