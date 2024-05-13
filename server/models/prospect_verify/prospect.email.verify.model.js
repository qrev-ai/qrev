import mongoose from "mongoose";

const Schema = mongoose.Schema;

const ProspectEmailVerifySchema = new Schema({
    connected_to_account_ids: [String],

    email: {
        type: String,
        trim: true,
        lowercase: true,
        unique: true,
    },

    is_valid: Boolean,
    sub_status: String,
    is_free_email: Boolean,
    is_mx_found: Boolean,
    mx_record: String,
    smtp_provider: String,

    verifier_service: String,

    created_on: { type: Date, default: Date.now },
    updated_on: { type: Date, default: Date.now },
});

export const ProspectEmailVerifyModel = mongoose.model(
    "prospect.email.verify",
    ProspectEmailVerifySchema
);
