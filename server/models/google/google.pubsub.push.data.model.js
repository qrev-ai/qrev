import mongoose from "mongoose";

const Schema = mongoose.Schema;

const GooglePubSubPushDataSchema = new Schema({
    email: {
        type: String,
        trim: true,
        lowercase: true,
    },

    history_id: String,
    expiration_date: { type: Date },

    /*
     * Added "history_id_backup"
     * the last 20 history ids (along with date, pubsub message id, pubsub publish time) will be stored here
     */
    history_id_backup: [],

    connected_to_account_ids: [String],
    created_on: { type: Date, default: Date.now },
    updated_on: { type: Date, default: Date.now },
});

export const GooglePubSubPushData = mongoose.model(
    "google.pubsub.push.data",
    GooglePubSubPushDataSchema
);
