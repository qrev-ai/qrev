import mongoose from "mongoose";

const Schema = mongoose.Schema;

const CampaignConfigSchema = new Schema({
    _id: String,

    account: { type: Schema.Types.ObjectId, ref: "account" },

    /*
     * email_senders will store the user id and email id of the user who will be sending the email.
     * structure: [{user_id: "user_id", email: "email_id"}]
     */
    email_senders: [],

    created_on: { type: Date, default: Date.now },
    updated_on: { type: Date, default: Date.now },
});

export const CampaignConfig = mongoose.model(
    "campaign.config",
    CampaignConfigSchema,
    "campaign.config"
);
