import mongoose from "mongoose";

const Schema = mongoose.Schema;
const userSchema = new Schema({
    email: {
        type: String,
        trim: true,
        lowercase: true,
        unique: true,
    },
    created_on: { type: Date, default: Date.now },
    devices: [
        {
            id: String,
            token_expiry: Number,
            api_version: String,
            device_type: String,
            deleted: Boolean,
        },
    ],
    google_oauths: [
        {
            type: Schema.Types.ObjectId,
            ref: "GoogleOauth",
        },
    ],
    allowed_themes: Boolean,
    is_onboard_user_created: Boolean, // This is true if create-user is called on onboard server
    timezone: String,

    /*
     * Added below profile fields on 1st May 2023, by Sanjay
     * We have profile UI in settings, so when user enters these fields, it will be updated
     */
    profile_first_name: String,
    profile_last_name: String,
    profile_email: String,
    profile_phone_number: String,
    profile_pic_url: String,
    /*
     * Added "logged_in" on 14th October 2023, by Sanjay
     * This is true if user has successfully logged in to QRev atleast once
     * This is useful when a user tries to add a "email" to their account, if user has not logged in to QRev atleast once, then we will create new user and set this flag to false. But once they login to QRev, we will update this flag to true
     */
    logged_in: Boolean,
    /*
     * Added "auth_account_type" on 19th October 2023, by Sanjay
     * If the user, logs in with google, then this will be set as "google". Same for outlook.
     * Added just in case needed in future
     */
    auth_account_type: String,
});

export const User = mongoose.model("User", userSchema);
