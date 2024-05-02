default_email_examples = [
    "Hi Matt I've noticed you’re using multiple tools like Chili Piper and Drift in hireEZ sales stack. I’m the co-founder of QRev, a platform that automates lead routing and an AI chatbot for a complete view of your leads in one place. We are charge a fraction of what you're currently paying. Worth a chat?",
]

break_into_steps = {
    "messages": [
        {
            "role": "system",
            "content": "Don't make assumptions about what values to plug into functions. Ask for clarification if a user request is ambiguous.",
        }
    ],
    "tools": [
        {
            "type": "function",
            "function": {
                "name": "break_into_steps",
                "description": "separate the text into a list of logical execution steps for a business user. The steps should be in the order of execution. Non business steps should be classified as extraneous.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "steps": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "sentence": {
                                        "type": "string",
                                        "description": "A revised sentence that can be used for the step",
                                    },
                                    "category": {
                                        "type": "string",
                                        "enum": [
                                            "company_list",
                                            "company_filter",
                                            "company_more_info",
                                            "people_list",
                                            "people_filter",
                                            "people_more_info",
                                            "action_email",
                                            "action_sms",
                                            "action_call",
                                            "action_reminder" "action_graph_results",
                                            "action_table_results",
                                            "more_info",
                                            "extraneous",
                                        ],
                                        "description": "A category for the sentence",
                                    },
                                },
                            },
                            "description": "The sentence that describes the step",
                        },
                    },
                    "required": ["steps"],
                },
            },
        },
    ],
}
