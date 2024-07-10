# ## TODO: Fix with new qrev-email-verification
# import os
# from dataclasses import dataclass, field
# from enum import StrEnum
# from typing import Any, Optional

# from pydantic import Field
# from pydantic_settings import BaseSettings, SettingsConfigDict
# from qai.agent.db.email_verification_db import EmailVerificationDatabase
# from qai.agent.libs.services.email_verifying_service import EmailVerifyingService
# from qai.agent.libs.services.millionverifier_api import MillionVerifierService
# from qai.agent.libs.services.zerobounce_api import ZeroBounceService


# class EmailVerificationSettings(BaseSettings):
#     uri: str = ""
#     db: str = "verification"
#     collection: str = "email"
#     millionverifier : bool = True
#     zerobounce : bool = True
#     services : dict[str, str] = Field(default_factory=dict)

#     model_config = SettingsConfigDict(env_prefix="mongo_email_verification_")

#     def __init__(self, **kwargs):
#         super().__init__(**kwargs)
#         print(self.model_config)
#         prefix = self.model_config["env_prefix"].upper()
#         for k in os.environ:
#             print(k)
#         print(prefix)
#         ## go through all env variables that start with env_prefix
#         filtered = [k for k in os.environ if k.startswith(prefix)]
#         print("FILTERED", filtered)





# @dataclass
# class EmailVerification:
#     settings: EmailVerificationSettings = field(default_factory=EmailVerificationSettings)

#     def __init__(self, service_keys: Optional[dict[str, str]] = None, **kwargs):
#         s = self.settings
#         self.email_db = EmailVerificationDatabase(s.uri, database=s.db, collection=s.collection)
#         self.services: dict[str, EmailVerifyingService] = {}
#         if service_keys:
#             for service_name, api_key in service_keys.items():
#                 if service_name.lower() == "millionverifier":
#                     self.services[service_name] = MillionVerifierService(api_key=api_key)
#                 elif service_name.lower() == "zerobounce":
#                     self.services[service_name] = ZeroBounceService(api_key=api_key)
#         # else:

#     def check_email_verification(
#         self, email: str, service: Optional[str] = None, offline: bool = False
#     ) -> Optional[bool]:

#         s = "MillionVerifier"
#         if not service or service == s:
#             r1 = self.email_db.load(email, service=s, default=None)
#             if (r1 is None or not "resultcode" in r1) and not offline:
#                 milservice = self.services.get(s)
#                 r1 = milservice.verify_email(email)  ## r1["resultcode"] == 1
#                 self.email_db.add(email, s, **r1)
#             if service == s:
#                 if r1 is None:
#                     return None
#                 return r1.get("result")
#         s = "ZeroBounce"
#         if not service or service == s:
#             r2 = self.email_db.load(email, service=s, default=None)
#             if (r2 is None or not "status" in r2) and not offline:
#                 zeroservice = self.services.get(s)
#                 r2 = zeroservice.verify_email(email)

#                 self.email_db.add(email, s, **r2)
#             if service == s:
#                 if r2 is None:
#                     return None
#                 return r2.get("status")
#         r2good = r2["status"] in ("valid", "catch-all")
#         r1good = r1["result"] in ("ok", "catch_all")
#         return r1good and r2good
#         # return r1.get("resultcode") == 1 and r2.get("status") == "valid"
#         # is_verified = self.email_db.is_verified(email, default=None)
#         # if is_verified is not None:
#         #     return is_verified
#         # verified = []
#         # for service_name, service in self.services.items():
#         #     result = service.verify_email(email)
#         #     self.email_db.add(email, service_name, **result)
#         #     verified.append(result.get("verified"))
#         # if all(verified):
#         #     return True

#         raise ValueError(f"Unable to verify email: {email}")


# from pi_conf import load_config
# load_config("qrev-ai").to_env()
# s = EmailVerificationSettings()
# print(s)
# # e = EmailVerification(settings=s)
