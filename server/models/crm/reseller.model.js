import mongoose from "mongoose";

const Schema = mongoose.Schema;

const ResellerSchema = new Schema({
    account: { type: Schema.Types.ObjectId, ref: "account" },

    first_name: { type: String, required: true },
    last_name: { type: String, required: true },
    email: { type: String, required: true },
    phone_number: { type: String },
    status: {
        type: String,
        enum: ["active", "inactive", "suspended"],
        default: "active",
    },
    score: { type: Number, min: 0, max: 100, default: 0 },
    certified: { type: Boolean, default: false },
    response_time: { type: Number, default: 0 }, // Average response time in minutes
    conversion: { type: Number, default: 0 }, // Conversion rate in percentage
    satisfaction: { type: Number, min: 0, max: 100, default: 0 }, // Customer satisfaction score
    company: { type: String },
    address: { type: String },
    city: { type: String },
    state: { type: String },
    postal_code: { type: String },
    country: { type: String },

    created_on: { type: Date, default: Date.now },
    updated_on: { type: Date, default: Date.now },
});

export const Reseller = mongoose.model(
    "crm.reseller",
    ResellerSchema,
    "crm.reseller"
);
