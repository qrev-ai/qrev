// this collection is created so that AI server can store prospects in this collection and then we can store the response here and then this (node js backend server) will create appropriate records in sequence collections

import mongoose from "mongoose";

const Schema = mongoose.Schema;

// * This is the new version of IntermediateProspectMessage

const AIServerGeneratedEmailSchema = new Schema({
    sequence_id: String,
    prospect_name: String,
    prospect_email: {
        type: String,
        lowercase: true,
        trim: true,
    },

    /*
     * Structure: [{subject: string, body: string}]
     */
    generated_messages: [],

    /*
     * Added to_be_deleted on 14th Jan 2025.
     * So that we can delete the object later.
     * AI server communicates with backend server using this collection to return list of prospect details and messages.
     * After this communication is complete, we can delete the object from this collection. SO adding this flag
     * Structure: { status: true, created_on: Date obj }
     */
    to_be_deleted: {},

    created_on: { type: Date, default: Date.now },
    updated_on: { type: Date, default: Date.now },
});

export const AIServerGeneratedEmail = mongoose.model(
    "personalized.message.generation",
    AIServerGeneratedEmailSchema,
    "personalized.message.generation"
);
