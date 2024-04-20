import mongoose from "mongoose";

const Schema = mongoose.Schema;
const ZoomOauthSchema = new Schema({
    email: {
        type: String,
        trim: true,
        lowercase: true,
    },

    code: String,
    state: {
        type: String,
        unique: true,
    },
    scope: String,
    refresh_token: String,
    access_token: String,
    expiry: Number,

    zoom_id: String,
    zoom_account_id: String,
    deauthorize: { type: Boolean, default: false },

    account: { type: Schema.Types.ObjectId, ref: "account" },
    user: { type: Schema.Types.ObjectId, ref: "User" },
    is_connected_to_account: { type: Boolean, default: false },

    created_on: { type: Date, default: Date.now },
    updated_on: { type: Date, default: Date.now },
});

export const ZoomOauth = mongoose.model("ZoomOauth", ZoomOauthSchema);
