import mongoose from "mongoose";

const Schema = mongoose.Schema;

function getRefreshTokenExpiry() {
    // If you change the refresh token expiry, make sure that created_on ttl index is updated in mongo cloud also on "Tokens" collection
    const days = process.env.REFRESH_TOKEN_EXPIRES_IN || "180d";
    let expirySeconds = null;
    if (days) {
        if (days.endsWith("d")) {
            expirySeconds = parseInt(days) * 24 * 60 * 60;
        } else if (days.endsWith("h")) {
            expirySeconds = parseInt(days) * 60 * 60;
        } else if (days.endsWith("m")) {
            expirySeconds = parseInt(days) * 60;
        } else if (days.endsWith("s")) {
            expirySeconds = parseInt(days);
        } else {
            throw `Invalid expiresInStr: ${days}`;
        }
    }
    return expirySeconds;
}

const TokensSchema = new Schema({
    user_id: {
        type: Schema.Types.ObjectId,
        ref: "User",
    },
    state: String,
    refresh_token: {
        type: String,
        unique: true,
    },
    access_token: {
        type: String,
    },
    account_type: String,
    created_on: {
        type: Date,
        default: Date.now,
    },
    updated_on: { type: Date, default: Date.now },
});
TokensSchema.index({ refresh_token: 1 }, { unique: true });
TokensSchema.index(
    { created_on: 1 },
    { expireAfterSeconds: getRefreshTokenExpiry() }
);
export const Tokens = mongoose.model("Token", TokensSchema);
