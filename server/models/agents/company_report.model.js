import mongoose from "mongoose";
import { SupportedCompanyReportTypes } from "../../config/agents/report.config.js";

const Schema = mongoose.Schema;

const CompanyReportSchema = new Schema({
    _id: String,
    account: { type: Schema.Types.ObjectId, ref: "account" },
    name: { type: String, required: true },
    description: { type: String },
    type: {
        type: String,
        enum: [...Object.values(SupportedCompanyReportTypes)],
        required: true,
    },
    created_on: { type: Date, default: Date.now },
    updated_on: { type: Date, default: Date.now },
});

export const CompanyReport = mongoose.model(
    "company.report",
    CompanyReportSchema,
    "company.report"
);
