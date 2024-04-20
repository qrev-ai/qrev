import mongoose from "mongoose";

const Schema = mongoose.Schema;

const SequenceSchema = new Schema({
    _id: String,
    name: String,
    account: { type: Schema.Types.ObjectId, ref: "account" },
    created_by: { type: Schema.Types.ObjectId, ref: "User" },

    conversation: { type: String, ref: "qai.conversation" },
    uploaded_file_name: String,

    created_on: { type: Date, default: Date.now },
    updated_on: { type: Date, default: Date.now },
});

export const SequenceModel = mongoose.model(
    "sequence",
    SequenceSchema,
    "sequence"
);
