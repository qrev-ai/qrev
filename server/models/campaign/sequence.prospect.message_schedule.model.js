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

    has_message_been_replied: { type: Boolean, default: false },

    message_scheduled_time: Date,
    message_sent_time: Date,

    message_response: {},

    analytic_session_id: String,

    /*
     * Added 'is_under_execution' on 31st May 2024
     * This field is used to identify if the message is currently under execution
     * WHY: To avoid sending duplicate messages when the time taken to send a message is so much that Cron job runs again and considers the same message
     */
    is_under_execution: { type: Boolean, default: false },

    /*
     * Added 'integration_activities' on 4th June 2024
     * This field is used to store the integration activity ids for the message sent
     * For example: If the message is to be stored in Hubspot, then we will store below items:
     * [{"crm_type": "hubspot","type": "cssm-contact-id","value": "27032662029"},{"crm_type": "hubspot","type": "cssm-is-new-lead","value": true},{"crm_type": "hubspot","type": "cssm-email-activity-id","value": "53846094146"}]
     * WHY: In future, if we want to remove/update the message from Hubspot, we can get contact id and email activity id from here
     */
    integration_activities: [],

    /*
     * Added 'unsubscribe_activities' on 5th June 2024
     * This field is used to store the unsubscribe activities for the message sent
     * When user clicks on unsubscribe link, we will store the below activity here:
     * [{"type": "email_unsubscribe_clicked","time": "2024-06-05T06:00:00.000Z"}]
     * When user confirms the unsubscribe, we will store the below activity here:
     * [{"type": "email_unsubscribe_confirmed","time": "2024-06-05T06:00:00.000Z"}]
     */
    unsubscribe_activities: [],

    /*
     * Added 'replies_through_qrev' on 8th July 2024
     * This field is used to store the replies sent through Qrev (either automatically or manually sent by the user)
     * This will store item like below: [{reply_id, replied_on, type, message, message_response}]
     */
    replies: [],

    /*
     * Added "reply_to_user" on 9th Aug 2024.
     * reply_to_user will store the user id of email id to which the prospect can reply.
     * Example:
     *  * A company wants to send an email to the prospect from "noreply@dom1.com" and wants the prospect to reply to "ex@dom1.com".
     *  * In this case, the value of reply_to will be {user_id: ...}
     *  * If the prospect replies to the email, then the value of reply_to will be {user_id: ..., thread_id: ..., message_id: ..., replied_on: ...}
     */
    reply_to: {},

    created_on: { type: Date, default: Date.now },
    updated_on: { type: Date, default: Date.now },
});

export const SequenceProspectMessageSchedule = mongoose.model(
    "sequence.prospect.message_schedule",
    SequenceProspectMessageScheduleSchema,
    "sequence.prospect.message_schedule"
);
