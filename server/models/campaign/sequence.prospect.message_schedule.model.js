import mongoose from "mongoose";

const Schema = mongoose.Schema;

const SequenceProspectMessageScheduleSchema = new Schema({
    _id: String,
    sequence: { type: String, ref: "sequence" },
    account: { type: Schema.Types.ObjectId, ref: "account" },
    contact: { type: Schema.Types.ObjectId, ref: "contact" },
    sequence_step: { type: String, ref: "sequence.step" },
    sequence_prospect: { type: String, ref: "sequence.prospect" },

    // booking_id: { type: String, ref: "book.slot" },

    is_message_generation_complete: { type: Boolean, default: false },

    sender: { type: Schema.Types.ObjectId, ref: "User" },
    sender_email: {
        type: String,
        lowercase: true,
        trim: true,
    },
    sender_account_type: String,

    prospect_email: {
        type: String,
        lowercase: true,
        trim: true,
    },
    prospect_timezone: String,

    message_type: String,
    message_subject: String,
    message_body: String,
    message_status: String,

    message_scheduled_time: Date,
    message_sent_time: Date,

    message_response: {},

    analytic_session_id: String,

    created_on: { type: Date, default: Date.now },
    updated_on: { type: Date, default: Date.now },
});

export const SequenceProspectMessageSchedule = mongoose.model(
    "sequence.prospect.message_schedule",
    SequenceProspectMessageScheduleSchema,
    "sequence.prospect.message_schedule"
);
