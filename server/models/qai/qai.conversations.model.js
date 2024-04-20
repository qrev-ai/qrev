import mongoose from "mongoose";

const Schema = mongoose.Schema;

const QaiConversationSchema = new Schema({
    _id: String,
    account: { type: Schema.Types.ObjectId, ref: "account" },
    owner: { type: Schema.Types.ObjectId, ref: "User" },

    title: String,
    messages: [],

    created_on: { type: Date, default: Date.now },
    updated_on: { type: Date, default: Date.now },
});

export const QaiConversation = mongoose.model(
    "qai.conversation",
    QaiConversationSchema
);
