// this collection is created so that AI server can store prospects in this collection and then we can store the response here and then this (node js backend server) will create appropriate records in sequence collections

import mongoose from "mongoose";

const Schema = mongoose.Schema;

const IntermediateProspectMessageSchema = new Schema({
    sequence_id: String,
    sequence_step_id: String,
    prospect_email: {
        type: String,
        lowercase: true,
        trim: true,
    },

    message_subject: String,
    message_body: String,

    created_on: { type: Date, default: Date.now },
    updated_on: { type: Date, default: Date.now },
});

export const IntermediateProspectMessage = mongoose.model(
    "intermediate.prospect.message.data",
    IntermediateProspectMessageSchema,
    "intermediate.prospect.message.data"
);
