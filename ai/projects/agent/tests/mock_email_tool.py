from collections import defaultdict
from typing import Callable, Optional

from qai.agent.agents.email_agent import (
    EmailAgent,
    EmailModel,
    EmailToolSpec,
    OnAllEmailsCompletedEvent,
)
from pi_blink import blink, EventPriority

## Global dict, sequence_dict, to track the number of times the functions are called
sequence_dict: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))


class MockEmailToolSpec(EmailToolSpec):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    def draft_email(
        self,
        to_person: dict,
        to_company: dict,
        prompt: str | None = None,
        callback: Callable | None = None,
    ) -> EmailModel:

        subject = f"Subject: Meeting with {to_person['name']} at {to_company['name']}"
        body = f"Body: Meeting with {to_person['name']} at {to_company['name']}"
        body += f"Prompt: {prompt}\n"
        body += f"Callback: {callback}\n"
        email = EmailModel(
            subject=subject,
            body_list=body.split("\n"),
            email=to_person.get("email"),
            name=to_person.get("name"),
            phone=to_person.get("phone"),
        )

        if callback:
            callback(email)
        return email


class MockEmailAgent(EmailAgent):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    @staticmethod
    def on_email_complete(sequence_id, email: EmailModel) -> None:
        print(f"MockEmailAgent: on_email_complete: {sequence_id}, {email}")
        sequence_dict[sequence_id]["on_email_complete"] += 1

    @staticmethod
    @blink.listener(OnAllEmailsCompletedEvent, priority=EventPriority.EARLY)
    def on_all_emails_complete(event: OnAllEmailsCompletedEvent) -> None:
        # event.cancel = True
        sequence_id = event.sequence_id
        successes = event.successes
        errors = event.errors
        print(f"MockEmailAgent: on_all_emails_complete: {sequence_id}, {successes}, {errors}")
        sequence_dict[sequence_id]["on_all_emails_complete"] += 1
