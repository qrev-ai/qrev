import mongoose from "mongoose";
import { SOURCE_TYPES } from "../../../config/qrev_crm/analytic_sources.js";

const Schema = mongoose.Schema;

const OpportunitySchema = new Schema({
    account: { type: Schema.Types.ObjectId, ref: "account" },
    pipeline: { type: Schema.Types.ObjectId, ref: "crm.pipeline" },
    pipeline_stage: { type: Schema.Types.ObjectId, ref: "crm.pipeline.stage" },
    created_by: { type: Schema.Types.ObjectId, ref: "User" },
    owner: { type: Schema.Types.ObjectId, ref: "User" },
    contact: { type: Schema.Types.ObjectId, ref: "crm.contact" },
    company: { type: Schema.Types.ObjectId, ref: "crm.company" },

    name: { type: String, required: true },
    amount: { type: Number, default: 0 },
    close_date: { type: Date },
    type: { type: String, enum: ["new", "existing"] },
    priority: {
        type: String,
        enum: ["low", "medium", "high"],
        default: "medium",
    },
    description: { type: String },
    forecast_category: {
        type: String,
        enum: [
            "not_forecasted",
            "pipeline",
            "best_case",
            "commit",
            "closed_won",
        ],
        default: "not_forecasted",
    },
    forecast_probability: { type: Number, default: 0 },
    next_step: { type: String },
    original_traffic_source: {
        type: String,
        enum: SOURCE_TYPES,
    },
    latest_traffic_source: {
        type: String,
        enum: SOURCE_TYPES,
    },
    // products is array of product id and quantity
    products: [
        {
            product: { type: Schema.Types.ObjectId, ref: "crm.product" },
            quantity: { type: Number, default: 1 },
        },
    ],

    is_deleted: { type: Boolean, default: false },
    created_on: { type: Date, default: Date.now },
    updated_on: { type: Date, default: Date.now },
});

export const Opportunity = mongoose.model(
    "crm.opportunity",
    OpportunitySchema,
    "crm.opportunity"
);
