import json
import tomllib as toml
from pathlib import Path
from typing import Optional

from pi_conf import ConfigDict, ConfigSettings
from pi_conf.config_settings import ConfigDict, ConfigSettings
from pydantic import BaseModel, Field, field_validator, model_validator

MIN_SCORE = 1
MAX_SCORE = 10


class Email(BaseModel):
    subject: str = Field(..., description="The generated subject line of the email")
    body: str = Field(..., description="The full text content of the generated email body")


class Rule(BaseModel):
    instruction: str = Field(..., description="The condition to evaluate in the email")
    importance: int = Field(
        default=5, description="How important this rule is", ge=MIN_SCORE, le=MAX_SCORE
    )
    name: Optional[str] = Field(default=None, description="An optional name for this rule")


class RuleBasedModel(BaseModel):
    rules: list[Rule] = Field(default_factory=list, description="The rules to use")
    rules_file: Optional[Path] = Field(default=None, description="File containing the rules")

    def model_post_init(self, __context):
        self._load_rules()

    def _load_rules(self):
        if self.rules_file:
            file_content = self.rules_file.read_text()
            file_extension = self.rules_file.suffix.lower()

            if file_extension == ".toml":
                rules_data = toml.loads(file_content)["rules"]
            elif file_extension == ".json":
                rules_data = json.loads(file_content)
            else:
                raise ValueError(f"Unsupported file format: {file_extension}. Use .toml or .json")

            self.rules = [Rule(**rule) for rule in rules_data]

    @field_validator("rules")
    @classmethod
    def validate_rules(cls, v, info):
        if not v and not info.data.get("rules_file"):
            raise ValueError("Either rules or rules_file must be provided")
        return v

    @field_validator("rules_file", mode="before")
    @classmethod
    def validate_rule_file_path(cls, v):
        if v is not None:
            v = Path(v).expanduser()
            if not v.exists():
                raise FileNotFoundError(f"File does not exist: {v}")
            if v.suffix.lower() not in [".toml", ".json"]:
                raise ValueError(
                    f"Unsupported file format: {v.suffix}. Use .toml or .json for rules_file"
                )
            return v
        return v

    @model_validator(mode="after")
    def final_validate(self):
        if not self.rules:
            raise ValueError("rules cannot be empty or None")
        return self


class Generation(RuleBasedModel):
    system_prompt: str = Field(
        default="", description="The system prompt to generate the email with"
    )
    system_prompt_file: Optional[Path] = Field(
        default=None, description="File containing the system prompt"
    )
    user_prompt: str = Field(default="", description="The user prompt to generate the email with")
    user_prompt_file: Optional[Path] = Field(
        default=None, description="File containing the user prompt"
    )
    model: Optional[str] = Field(default=None)

    def model_post_init(self, __context):
        super().model_post_init(__context)
        self._load_system_prompt()
        self._load_user_prompt()

    def _load_system_prompt(self):
        if self.system_prompt_file:
            with open(self.system_prompt_file, "r") as f:
                self.system_prompt = f.read().strip()

    def _load_user_prompt(self):
        if self.user_prompt_file:
            with open(self.user_prompt_file, "r") as f:
                self.user_prompt = f.read().strip()

    @field_validator("system_prompt_file", "user_prompt_file", mode="before")
    @classmethod
    def validate_prompt_file_path(cls, v):
        if v is not None:
            v = Path(v).expanduser()
            if not v.exists():
                raise FileNotFoundError(f"File does not exist: {v}")
            return v
        return v

    @field_validator("system_prompt")
    @classmethod
    def validate_system_prompt(cls, v, info):
        if not v and not info.data.get("system_prompt_file"):
            raise ValueError("Either system_prompt or system_prompt_file must be provided")
        return v

    @field_validator("user_prompt")
    @classmethod
    def validate_user_prompt(cls, v, info):
        if not v and not info.data.get("user_prompt_file"):
            raise ValueError("Either user_prompt or user_prompt_file must be provided")
        return v

    @model_validator(mode="after")
    def final_validate(self):
        if not self.system_prompt:
            raise ValueError("system_prompt cannot be empty or None")
        if not self.user_prompt:
            raise ValueError("user_prompt cannot be empty or None")
        return self


class Scoring(RuleBasedModel):
    pass  # All functionality is inherited from RuleBasedModel


class InheritableSettings(BaseModel):
    @property
    def inheritable_fields(self):
        return set(self.model_fields.keys())

    def inherit_from(self, parent: "InheritableSettings"):
        for field in self.inheritable_fields:
            if getattr(self, field) is None:
                setattr(self, field, getattr(parent, field))


class EmailSettings(InheritableSettings):
    overwrite_existing: Optional[bool] = Field(default=None)
    include_signature: Optional[bool] = None
    signature: Optional[str] = None
    generated_emails_directory: Optional[str] = Field(default=None)
    generated_intermediate_emails_directory: Optional[str] = Field(default=None)
    sender_person_file: Optional[str] = Field(default=None)
    sender_company_file: Optional[str] = Field(default=None)


class EmailGeneratorSettings(ConfigSettings):
    model: str = "claude-3-haiku-20240307"
    generation: Generation = Field(
        default_factory=lambda: Generation(), description="The rules to generate the email with"
    )
    scoring: Scoring = Field(
        default_factory=Scoring, description="The rules to evaluate the email against"
    )

    model_config = ConfigDict(
        toml_table_header="outreach.steps.email_generation",
    )
    email_settings: EmailSettings = Field(default_factory=EmailSettings)
    iterations: int = 3


class EmailFixedText(BaseModel):
    subject: str = Field(..., description="The fixed subject of the email")
    body: str = Field(..., description="The fixed text of the email")
    email_settings: EmailSettings = Field(default_factory=EmailSettings)


class Step(BaseModel):
    order: int = Field(..., description="The order of the step")
    name: Optional[str] = Field(default=None, description="The name of the step")
    email_generation: Optional[EmailGeneratorSettings] = Field(default=None)
    email_fixed_text: Optional[EmailFixedText] = Field(default=None)
    email_settings: EmailSettings = Field(default_factory=EmailSettings)

    def apply_email_settings_inheritance(self, outreach_settings: EmailSettings):
        self.email_settings.inherit_from(outreach_settings)
        if self.email_generation:
            self.email_generation.email_settings.inherit_from(self.email_settings)
        if self.email_fixed_text:
            self.email_fixed_text.email_settings.inherit_from(self.email_settings)


class Outreach(BaseModel):
    overwrite_existing: bool = False
    email_settings: EmailSettings = Field(default_factory=EmailSettings)
    steps: list[Step] = Field(default_factory=list)

    def __init__(self, **data):
        super().__init__(**data)
        self.apply_email_settings_inheritance()

    def apply_email_settings_inheritance(self):
        for step in self.steps:
            step.apply_email_settings_inheritance(self.email_settings)
