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
};
