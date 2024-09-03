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

    /*
     * Added 'exclude_domains' on 30th July 2024
     * exclude_domains will store the domains which are not allowed to send the email.
     * structure: ["ex.com", "ex1.com"]
     */
    exclude_domains: [],

    /*
    * Added 'sequence_steps_template' on 30th July 2024
    * sequence_steps_template size will indicate the number of steps in the sequence.
    * Sample structure: 
    [
        { //We will support other types like WhatsApp, linkedin_connect_message in future
            "type": "ai_generated_email",
            "time_of_dispatch": {
                "time_value": 1,
                "time_unit": "day"
            }
        },
        {
            "type": "ai_generated_email",
            "time_of_dispatch": {
                "time_value": 3,
                "time_unit": "day"
            }
        },
        {
            "type": "ai_generated_email",
            "time_of_dispatch": {
                "time_value": 6,
                "time_unit": "day"
            }
        }
    ]
    */
    sequence_steps_template: [],

    /*
    * Added "message_schedule_window" on 2nd August 2024
    * message_schedule_window will store the time window in which the message can be sent.
    * Sample object: 
    {
        sun: [],
        mon: [{ start: "09:00", end: "17:00" }],
        tue: [{ start: "09:00", end: "17:00" }],
        wed: [{ start: "09:00", end: "17:00" }],
        thu: [{ start: "09:00", end: "17:00" }],
        fri: [{ start: "09:00", end: "17:00" }],
        sat: [],
    }
    */
    message_schedule_window: {},

    /*
     * Added "reply_to_user" on 9th Aug 2024.
     * reply_to_user will store the email id to which the prospect can reply.
     * Example:
     *  * A company wants to send an email to the prospect from "noreply@dom1.com" and wants the prospect to reply to "ex@dom1.com".
     *  * In this case, the value of reply_to_user will be the user id of "ex@dom1.com".
     */
    reply_to_user: { type: Schema.Types.ObjectId, ref: "User" },

    /*
     * Added "resource_documents" on 30th Aug 2024.
     * Context: When a new user logs in QRev for the first time, we need them to upload their brand document, pain points doc, ICP text/voice/doc etc.
     * resource_documents will store each of these documents which are uploaded by the user.
     * Sample structure:
     * [{
     *  name: "document_name",
     *  s3_link: "s3_link",
     *  added_on: "date_in_ISO_format"
     * }]
     */
    resource_documents: [],

    created_on: { type: Date, default: Date.now },
    updated_on: { type: Date, default: Date.now },
});

export const CampaignConfig = mongoose.model(
    "campaign.config",
    CampaignConfigSchema,
    "campaign.config"
);
