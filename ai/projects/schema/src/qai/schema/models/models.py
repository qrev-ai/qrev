from enum import StrEnum


class ProvenanceType(StrEnum):
    OTHER = "other"
    MANUAL = "manual"
    AI_GENERATED = "ai_generated"


class ExcludeReason(StrEnum):
    ADDRESS_INVALID = "address_invalid"
    DOMAIN_INVALID = "domain_invalid"
    DOMAIN_FILTERED = "domain_filtered"
    EMAIL_BOUNCED = "email_bounced"
    EMAIL_FILTERED = "email_filtered"
    EMAIL_INVALID = "email_invalid"
    EMAIL_DOMAIN_FILTERED = "email_domain_filtered"
    EMAIL_UNVERIFIABLE = "email_unverifiable"
    NO_ADDRESS = "no_address"
    NO_COMPANY = "no_company"
    NO_COMPANY_DOMAIN = "no_company_domain"
    NO_EMAIL = "no_email"
    NO_JOB_TITLE = "no_job_title"
    NO_NAME = "no_name"
    NO_PERSON = "no_person"
    NO_PHONE = "no_phone"
    NO_SOCIAL_MEDIA = "no_social_media"
    PHONE_INVALID = "phone_invalid"
    SOCIAL_MEDIA_INVALID = "social_media_invalid"
    TITLE_FILTERED = "title_filtered"
    COMPANY_NAME_MISMATCH = "company_name_mismatch"

    def __str__(self):
        return self.value

    def __repr__(self):
        return self.value


class OutreachType(StrEnum):
    OTHER = "other"
    EMAIL = "email"
    PHONE = "phone"
    SOCIAL_MEDIA = "social_media"
    MAIL = "mail"
    IN_PERSON = "in_person"
    WHATSAPP = "whatsapp"
    LINKEDIN = "linkedin"
    TWITTER = "twitter"
    FACEBOOK = "facebook"
    INSTAGRAM = "instagram"
    GITHUB = "github"
    ZOOM = "zoom"


class SexEnum(StrEnum):
    OTHER = "other"
    MALE = "male"
    FEMALE = "female"
    INTERSEX = "intersex"


class GenderEnum(StrEnum):
    OTHER = "other"
    MALE = "male"
    FEMALE = "female"
    NON_BINARY = "non-binary"
    GENDERQUEER = "genderqueer"
    AGENDER = "agender"
    GENDERFLUID = "genderfluid"
