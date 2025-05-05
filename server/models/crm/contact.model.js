import mongoose from "mongoose";

const Schema = mongoose.Schema;

const ContactSchema = new Schema({
    account: { type: Schema.Types.ObjectId, ref: "account" },

    first_name: { type: String, required: true },
    last_name: { type: String, required: true },
    email: { type: String, required: true },
    phone_number: { type: String },
    mobile_number: { type: String },
    job_title: { type: String },
    department: { type: String },
    status: {
        type: String,
        enum: ["active", "inactive", "lead"],
        default: "active",
    },
    reseller: { type: Schema.Types.ObjectId, ref: "reseller" },
    company: { type: Schema.Types.ObjectId, ref: "company" },
    address: { type: String },
    city: { type: String },
    state: { type: String },
    postal_code: { type: String },
    country: { type: String },
    notes: { type: String },

    created_on: { type: Date, default: Date.now },
    updated_on: { type: Date, default: Date.now },
});

export const Contact = mongoose.model("contact", ContactSchema);
