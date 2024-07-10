from qai.agent.agents.email_agent import (
    EmailAgent,
    EmailModel,
    EmailToolSpec,
    OnAllEmailsCompletedEvent,
)

from qai.agent import listener

@listener(OnAllEmailsCompletedEvent)
def handle(event):
    print(f"!!!!!!!!!!! handle: {event}")