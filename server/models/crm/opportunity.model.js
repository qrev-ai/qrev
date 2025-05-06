import mongoose from "mongoose";

const Schema = mongoose.Schema;

const OpportunitySchema = new Schema({
    account: { type: Schema.Types.ObjectId, ref: "account" },

    name: { type: String, required: true },
    amount: { type: Number, default: 0 },
    stage: {
        type: String,
        enum: [
            "lead",
            "qualification",
            "proposal",
            "negotiation",
            "closed_won",
            "closed_lost",
        ],
        default: "lead",
    },
    close_date: { type: Date },
    probability: { type: Number, min: 0, max: 100, default: 0 },
    contact: { type: Schema.Types.ObjectId, ref: "contact" },
    company: { type: Schema.Types.ObjectId, ref: "company" },
    reseller: { type: Schema.Types.ObjectId, ref: "reseller" },
    description: { type: String },
    source: { type: String },
    priority: {
        type: String,
        enum: ["low", "medium", "high"],
        default: "medium",
    },
    next_step: { type: String },

    stage_history: [
        {
            stage: { type: String },
            changed_on: { type: Date, default: Date.now },
        },
    ],

    created_on: { type: Date, default: Date.now },
    updated_on: { type: Date, default: Date.now },
});

export const Opportunity = mongoose.model(
    "crm.opportunity",
    OpportunitySchema,
    "crm.opportunity"
);
