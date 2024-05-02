from enum import StrEnum
from typing import Self


class Step(StrEnum):
    create_campaign = "create_campaign"
    company_list = "company_list"
    company_filter = "company_filter"
    company_more_info = "company_more_info"
    people_list = "people_list"
    people_filter = "people_filter"
    people_more_info = "people_more_info"
    industry_list = "industry_list"
    industry_filter = "industry_filter"
    industry_more_info = "industry_more_info"
    action_email = "action_email"
    action_sms = "action_sms"
    action_call = "action_call"
    action_reminder = "action_reminder"
    action_graph_results = "action_graph_results"
    action_table_results = "action_table_results"
    more_info = "more_info"
    extraneous = "extraneous"

class Action(StrEnum):
    create_campaign = "create_campaign"
    database_query = "database_query"
    conversation = "conversation"
    goto_website_location = "goto_website_location"
    new_workflow = "new_workflow"
    activate_existing_workflow = "activate_existing_workflow"
    
    def __eq__(self, other: str | Self) -> bool:
        try:
            return super().__eq__(other)
        except:
            if str(self.value) == str(other):
                return True
            raise



print([str(a) for a in Action])
fn_break_into_steps = {
    "type": "function",
    "function": {
        "name": "break_into_steps",
        "description": (
            "Separate the text into a list of logical execution steps for a business user. "
            "The steps should be in the order of execution. "
            "Keep details such as quantities or numbers."
            "Non business steps should be classified as extraneous. "
            f"Categories should only be one of [{','.join([str(e) for e in Step])}]"
        ),
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
                                "description": (
                                    "A revised sentence that can be used for the steps, "
                                    "the revised sentence keeps details such as numbers."
                                ),
                            },
                            "category": {
                                "type": "string",
                                "enum": [str(e) for e in Step],
                                "description": "A category for the revised sentence. Describes whether the sentence is about companies, people, industries, or an action.",
                            },
                        },
                    },
                    "description": "The sentence that describes the step",
                },
            },
            "required": ["steps", "sentence", "category"],
        },
    },
}

fn_find_action = {
    "type": "function",
    "function": {
        "name": "find_action",
        "description": (("Determine the action that the user wants to take. Always respond with values for all parameters in this tool.")),
        "parameters": {
            "type": "object",
            "properties": {
                "sentence": {
                    "type": "string",
                    "description": "A revised sentence that is what the user wants to do.",
                },
                "category": {
                    "type": "string",
                    "enum": [str(e) for e in Action],
                    "description": "Which category the user action belongs to.",
                },
            },
            "required": ["sentence", "category"],
        },
    },
}


# break_into_steps = {
#     "steps": [
#         {
#             "category": "company_filter",
#             "sentence": "Find companies that use Chili Piper.",
#         },
#         {
#             "category": "company_filter",
#             "sentence": "Find companies that use Drift.",
#         },
#         {
#             "category": "company_filter",
#             "sentence": "Filter the companies to only include those that use "
#             "both Chili Piper and Drift.",
#         },
#         {
#             "category": "action_email",
#             "sentence": "Send an email to each of the filtered companies.",
#         },
#     ]
# }
