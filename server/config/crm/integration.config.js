export const IntegrationActivityTypes = {
    booking: {
        create_contact: "book-create-contact",
        create_meeting: "book-create-meeting",
        existing_contact: "book-is-existing-contact",
    },
    submission: {
        contact_id: "submission-contact-id",
        is_new_lead: "submission-is-new-lead",
        company_id: "submission-company-id",
    },
    campaign_sequence_step_message: {
        contact_id: "cssm-contact-id",
        is_new_lead: "cssm-is-new-lead",
        email_activity_id: "cssm-email-activity-id",
    },
};
