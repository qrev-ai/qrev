export const CampaignDefaults = {
    sequence_steps_template: [
        {
            //We will support other types like WhatsApp, linkedin_connect_message in future
            type: "ai_generated_email",
            time_of_dispatch: {
                time_value: 1,
                time_unit: "day",
            },
        },
        {
            type: "ai_generated_email",
            time_of_dispatch: {
                time_value: 3,
                time_unit: "day",
            },
        },
        {
            type: "ai_generated_email",
            time_of_dispatch: {
                time_value: 6,
                time_unit: "day",
            },
        },
        {
            type: "ai_generated_email",
            time_of_dispatch: {
                time_value: 9,
                time_unit: "day",
            },
        },
    ],
    /*
     * Added resource_file_types on 31st August 2024
     * Context: When a new user signs up, we need them to upload certain documents so that we can understand their company better and suggest better personalized messages for their campaigns.
     * The list of documents that the user can upload is defined here.
     * NOTE: USer may type the ICP doc or say by voice. But we will nevertheless store it as file so that we have consistent on how we handle all documents.
     */
    resource_file_types: [
        "brand_doc",
        "pain_points_doc",
        "case_studies_doc",
        "icp_doc",
    ],
};
