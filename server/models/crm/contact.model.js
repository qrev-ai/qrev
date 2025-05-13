import mongoose from "mongoose";

const Schema = mongoose.Schema;

const ContactSchema = new Schema({
    account: { type: Schema.Types.ObjectId, ref: "account" },

    first_name: { type: String, required: true },
    last_name: { type: String, required: true },
    email: { type: String, required: true },
    phone_number: { type: String },
    job_title: { type: String },
    department: { type: String },
    status: {
        type: String,
        enum: [
            "new",
            "qualified",
            "accepted",
            "assigned",
            "followed_up",
            "opportunity",
            "closed_won",
            "closed_lost",
        ],
        default: "new",
    },
    reseller: { type: Schema.Types.ObjectId, ref: "crm.reseller" },
    company: { type: Schema.Types.ObjectId, ref: "crm.company" },
    address: { type: String },
    city: { type: String },
    state: { type: String },
    postal_code: { type: String },
    country: { type: String },
    notes: { type: String },

    created_on: { type: Date, default: Date.now },
    updated_on: { type: Date, default: Date.now },
});

export const Contact = mongoose.model(
    "crm.contact",
    ContactSchema,
    "crm.contact"
);
