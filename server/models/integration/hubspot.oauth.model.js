import mongoose from "mongoose";

const Schema = mongoose.Schema;
const hubspotOauthSchema = new Schema({
    email: {
        type: String,
        trim: true,
        lowercase: true,
    },
    hub_domain: String,
    provided_scopes: [],
    hub_id: String,
    app_id: String,
    hubspot_user_id: String,
    token_type: String,
    code: String,
    state: {
        type: String,
        unique: true,
    },
    scope: String,
    refresh_token: String,
    access_token: String,
    expiry: Number,
    is_connected_to_account: {
        type: Boolean,
        default: false,
    },
    account: { type: Schema.Types.ObjectId, ref: "account" },
    user: { type: Schema.Types.ObjectId, ref: "User" },
    created_on: { type: Date, default: Date.now },
});

export const HubspotOauth = mongoose.model("HubspotOauth", hubspotOauthSchema);
