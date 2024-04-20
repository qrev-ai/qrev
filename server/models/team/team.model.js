import mongoose from "mongoose";

const Schema = mongoose.Schema;

/*
 * Created on 14th October 2023, by Sanjay
 */

const TeamSchema = new Schema({
    account: { type: Schema.Types.ObjectId, ref: "account" },

    name: { type: String, required: true },

    created_by: { type: Schema.Types.ObjectId, ref: "User" },

    created_on: { type: Date, default: Date.now },
    updated_on: { type: Date, default: Date.now },
});

export const TeamModel = mongoose.model("team", TeamSchema);
