import mongoose from "mongoose";

const Schema = mongoose.Schema;

/*
 * Created on 14th October 2023, by Sanjay
 * "Account" is the "Workspace" architecture for the application
 * User can be part of multiple Accounts and links,forms and other resources belong to a Account
 * Account is the top level entity in the application
 */

const AccountUserSchema = new Schema({
    account: { type: Schema.Types.ObjectId, ref: "account" },
    user: { type: Schema.Types.ObjectId, ref: "User" },
    /*
     * If the user is a super admin of the account, he has permission to do anything in the account
     * Except deleting other super admins and deleting the account
     * Only person who created the account (field "owner_user_id" in account model) has permissions to delete other super admins and delete the account
     */
    is_super_admin: Boolean,
    /*
     * when a user is invited to an account, the status of the invite is stored here
     * End user can accept or reject the invite
     */
    invite_status: {
        type: String,
        enum: ["pending", "accepted", "rejected"],
    },

    timezone: String,
    working_start_window_hour: String,
    working_end_window_hour: String,
    working_custom_hours: {},
    duration: Number,
    buffer_time: Number,
    conference_type: String,
    visible_for_days: String,

    created_on: { type: Date, default: Date.now },
    updated_on: { type: Date, default: Date.now },
});

export const AccountUser = mongoose.model("account.user", AccountUserSchema);
