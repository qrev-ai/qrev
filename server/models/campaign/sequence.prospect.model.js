import mongoose from "mongoose";

const Schema = mongoose.Schema;

const SequenceProspectSchema = new Schema({
    _id: String,
    sequence: { type: String, ref: "sequence" },
    account: { type: Schema.Types.ObjectId, ref: "account" },
    contact: { type: Schema.Types.ObjectId, ref: "contact" },

    prospect_email: {
        type: String,
        lowercase: true,
        trim: true,
    },
    prospect_timezone: String,
    prospect_name: String,
    prospect_phone: String,

    status: String,

    created_on: { type: Date, default: Date.now },
    updated_on: { type: Date, default: Date.now },
});

export const SequenceProspect = mongoose.model(
    "sequence.prospect",
    SequenceProspectSchema,
    "sequence.prospect"
);
