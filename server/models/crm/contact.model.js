import mongoose from "mongoose";

const Schema = mongoose.Schema;

const ContactSchema = new Schema({
    account: { type: Schema.Types.ObjectId, ref: "account" },
    email: {
        type: String,
        lowercase: true,
        trim: true,
    },
    phone_number: {
        type: String,
        trim: true,
    },
    first_name: {
        type: String,
        trim: true,
    },
    last_name: {
        type: String,
        trim: true,
    },
    company_name: {
        type: String,
        trim: true,
    },
    company_url: {
        type: String,
        trim: true,
    },
    job_title: {
        type: String,
        trim: true,
    },
    linkedin_url: {
        type: String,
        trim: true,
    },
    timezone: {
        type: String,
        trim: true,
    },

    analytic_sessions: [],

    latest_source: {
        type: String,
        trim: true,
    },
    latest_source_drill_down_1: {
        type: String,
        trim: true,
    },
    latest_source_drill_down_2: {
        type: String,
        trim: true,
    },
    original_source: {
        type: String,
        trim: true,
    },
    original_source_drill_down_1: {
        type: String,
        trim: true,
    },
    original_source_drill_down_2: {
        type: String,
        trim: true,
    },

    last_contacted_on: { type: Date },

    created_on: { type: Date, default: Date.now },
    updated_on: { type: Date, default: Date.now },
});

export const Contact = mongoose.model("contact", ContactSchema);
