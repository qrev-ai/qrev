import mongoose from "mongoose";

const Schema = mongoose.Schema;
const googleOauthSchema = new Schema({
    email: {
        type: String,
        trim: true,
        lowercase: true,
    },
    google_user_id: String,
    name: String,
    code: String,
    id_token: String,
    state: {
        type: String,
        unique: true,
    },
    scope: String,
    refresh_token: String,
    access_token: String,
    expiry: Number,
    deleted: Boolean,
    created_on: { type: Date, default: Date.now },
    device_id: String,
    user_id: {
        type: Schema.Types.ObjectId,
        ref: "User",
    },
    device_type: {
        type: String,
        enum: ["android", "web", "ios", "desktop_mac", "desktop_win"],
    },
    // after user successfully logs in, QRev token will be assigned only once per login, hence this flag
    is_token_exchanged: Boolean,
});

export const GoogleOauth = mongoose.model("GoogleOauth", googleOauthSchema);
