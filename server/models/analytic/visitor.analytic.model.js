import mongoose from "mongoose";

const Schema = mongoose.Schema;

const VisitorAnalyticsSchema = new Schema({
    account: { type: Schema.Types.ObjectId, ref: "account" },
    session_id: String,
    app_type: String,
    app_id: String,
    sub_app_type: String, // new field added
    action_type: String,

    // booking_id: { type: String, ref: "book.slot" },
    // form_submission_id: { type: String, ref: "route.form.submission" },

    start_time: Number,
    end_time: Number,

    page_url: String,
    query_params: {},

    referrer_domain: String,
    user_location: {},
    user_ip_address: String,
    user_timezone: String,
    user_browser_type: String,
    user_browser_version: String,
    user_device_os_type: String, // new field added
    user_device_type: String, // new field added
    is_unique: Boolean, // new field added
    is_lead_qualified: Boolean, // new field added

    /*
     * Added "analytic_metadata" on 18th Jan 2024, by Sanjay
     * This is to store the metadata of the analytic. Also ysed in campaign app to store the metadata of the campaign message sent
     * For example, if app is "inbound_insight" and action is "page_visit", then it will store things like company_domain, company_domain_found,enrichment_details_found,enrichment_disabled,enrichment_type
     */
    analytic_metadata: {},
    /*
     * Added "company_domain" on 18th Jan 2024, by Sanjay
     * This is to store the company domain of the user for inbound_insight app
     */
    company_domain: String,

    sequence_prospect_message: {
        type: String,
        ref: "sequence.prospect.message_schedule",
    },
    sequence: { type: String, ref: "sequence" },
    sequence_step: { type: String, ref: "sequence.step" },
    sequence_prospect: { type: String, ref: "sequence.prospect" },
    contact: { type: String, ref: "contact" },

    created_on: { type: Date, default: Date.now },
    updated_on: { type: Date, default: Date.now },
});

export const VisitorAnalytics = mongoose.model(
    "visitor.analytic",
    VisitorAnalyticsSchema
);
