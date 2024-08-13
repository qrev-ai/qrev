import mongoose from "mongoose";

const Schema = mongoose.Schema;

const CampaignEmailUnsubscribeListSchema = new Schema({
    sequence_prospect_message: {
        type: String,
        ref: "sequence.prospect.message_schedule",
    },
    account: { type: Schema.Types.ObjectId, ref: "account" },
    contact: { type: Schema.Types.ObjectId, ref: "contact" },

    // * We will store the email of the prospect separately here even if we store contact id in contact field
    // * WHY: If the contact gets updated to new email or deleted, we can still track the email of the prospect
    prospect_email: {
        type: String,
        lowercase: true,
        trim: true,
    },

    sender: { type: Schema.Types.ObjectId, ref: "User" },

    created_on: { type: Date, default: Date.now },
    updated_on: { type: Date, default: Date.now },
});

export const CampaignEmailUnsubscribeList = mongoose.model(
    "campaign.email.unsubscribe.list",
    CampaignEmailUnsubscribeListSchema,
    "campaign.email.unsubscribe.list"
);
