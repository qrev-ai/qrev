import mongoose from "mongoose";

const Schema = mongoose.Schema;

const PipelineSchema = new Schema({
    account: { type: Schema.Types.ObjectId, ref: "account" },

    name: { type: String, required: true },
    display_order: { type: Number, default: 0 },
    is_default_pipeline: { type: Boolean, default: true },
    created_by: { type: Schema.Types.ObjectId, ref: "User" },

    is_deleted: { type: Boolean, default: false },
    created_on: { type: Date, default: Date.now },
    updated_on: { type: Date, default: Date.now },
});

export const Pipeline = mongoose.model(
    "crm.pipeline",
    PipelineSchema,
    "crm.pipeline"
);
