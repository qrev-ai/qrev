import mongoose from "mongoose";

const Schema = mongoose.Schema;

/*
 * Created on 14th October 2023, by Sanjay
 */

const TeamUserSchema = new Schema({
    team: { type: Schema.Types.ObjectId, ref: "team" },
    user: { type: Schema.Types.ObjectId, ref: "User" },
    account: { type: Schema.Types.ObjectId, ref: "account" },
    role: {
        type: String,
        enum: ["admin", "member"],
    },
    /*
     * Added "observer" on 14th October 2023, by Sanjay
     * Observer is a special role in the team
     * Observer can only view the team info, analytics, links, bookings etc.
     * But Observer will not be part of any scheduling, booking, meetings etc.
     */
    observer: {
        type: String,
        enum: ["yes", "no"],
    },

    created_on: { type: Date, default: Date.now },
    updated_on: { type: Date, default: Date.now },
});

export const TeamUser = mongoose.model("team.user", TeamUserSchema);
