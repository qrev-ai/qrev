import mongoose from "mongoose";

const Schema = mongoose.Schema;

const CompanySchema = new Schema({
    account: { type: Schema.Types.ObjectId, ref: "account" },

    name: { type: String, required: true },
    domain: { type: String },
    region: { type: String },
    certifications: { type: [String] },
    contact_person_name: { type: String },
    contact_person_email: { type: String },
    service_zip_codes: { type: [String] },
    industry: { type: String },
    website: { type: String },
    phone_number: { type: String },
    employees_count: { type: Number },
    annual_revenue: { type: Number },
    annual_revenue_currency: { type: String },
    status: {
        type: String,
        enum: ["active", "inactive"],
        default: "active",
    },
    address: { type: String },
    city: { type: String },
    state: { type: String },
    postal_code: { type: String },
    country: { type: String },
    description: { type: String },

    is_deleted: { type: Boolean, default: false },
    created_on: { type: Date, default: Date.now },
    updated_on: { type: Date, default: Date.now },
});

export const Company = mongoose.model(
    "crm.company",
    CompanySchema,
    "crm.company"
);
