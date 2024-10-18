from abc import abstractmethod
from dataclasses import dataclass, field
from typing import Optional

from qai.schema import Company, Person
from qai.schema.models.outreach.email import Email, EmailGeneratorSettings


@dataclass
class EmailGenerator:
    to_person: Person
    from_person: Person
    to_company: Optional[Company] = None
    from_company: Optional[Company] = None

    settings: EmailGeneratorSettings = field(default_factory=EmailGeneratorSettings)

    @abstractmethod
    def generate_email(
        self,
        max_iterations: Optional[int] = None,
        email_body_mimetype: Optional[str] = "text/html",
        email_step: Optional[int] = None,
    ) -> Email: ...
