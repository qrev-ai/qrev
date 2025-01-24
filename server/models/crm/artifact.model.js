import mongoose from "mongoose";

const Schema = mongoose.Schema;

const ArtifactSchema = new Schema({
    _id: String,

    type: {
        type: String,
        required: true,
        enum: ["contact", "company", "list"],
    },
    parent_artifact_id: { type: String, ref: "artifact" },
    properties: {},

    created_on: { type: Date, default: Date.now },
    updated_on: { type: Date, default: Date.now },
});

export const Artifact = mongoose.model("artifact", ArtifactSchema, "artifact");
