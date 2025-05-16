import mongoose from "mongoose";

const Schema = mongoose.Schema;

const PipelineStageSchema = new Schema({
    account: { type: Schema.Types.ObjectId, ref: "account" },
    pipeline: { type: Schema.Types.ObjectId, ref: "crm.pipeline" },

    name: { type: String, required: true },
    display_order: { type: Number, default: 0 },
    probability: { type: Number, default: 0 },

    is_deleted: { type: Boolean, default: false },
    created_on: { type: Date, default: Date.now },
    updated_on: { type: Date, default: Date.now },
});

export const PipelineStage = mongoose.model(
    "crm.pipeline.stage",
    PipelineStageSchema,
    "crm.pipeline.stage"
);
