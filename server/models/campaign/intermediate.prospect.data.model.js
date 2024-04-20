// this collection is created so that AI server can store prospects in this collection and then we can store the response here and then this (node js backend server) will create appropriate records in sequence collections

import mongoose from "mongoose";

const Schema = mongoose.Schema;

const IntermediateProspectDataSchema = new Schema({
    sequence_id: String,
    prospect_email: {
        type: String,
        lowercase: true,
        trim: true,
    },
    prospect_timezone: String,
    prospect_name: String,
    prospect_phone: String,

    message_subject: String,
    message_body: String,
    is_message_generation_complete: { type: Boolean, default: false },

    created_on: { type: Date, default: Date.now },
    updated_on: { type: Date, default: Date.now },
});

export const IntermediateProspectData = mongoose.model(
    "intermediate.prospect.data",
    IntermediateProspectDataSchema,
    "intermediate.prospect.data"
);
