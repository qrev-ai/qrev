import mongoose from "mongoose";

const Schema = mongoose.Schema;

/*
 * Created on 14th October 2023, by Sanjay
 * "Account" is the "Workspace" architecture for the application
 * User can be part of multiple Accounts and links,forms and other resources belong to a Account
 * Account is the top level entity in the application
 */

const AccountSchema = new Schema({
    name: { type: String, required: true },
    /*
     * This is the domain of the account
     * For ex: if user harsh@scrut.io creates an account, the domain will be "scrut.io"
     */
    domain: { type: String },
    /*
     * This is the user id of the owner of the account i.e. the user who created the account
     */
    owner: { type: Schema.Types.ObjectId, ref: "User" },
    created_on: { type: Date, default: Date.now },
    updated_on: { type: Date, default: Date.now },
});

export const AccountModel = mongoose.model("account", AccountSchema);
