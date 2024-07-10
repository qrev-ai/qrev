from dataclasses import dataclass, field

from qai.storage.aws.aws_history import AWSHistory


@dataclass
class History:
    chat_history: dict[str, "CompanyHistory"] = field(default_factory=dict)

    def get_history(self, company_id: str, user_id: str) -> list[dict[str, str]]:
        if company_id not in self.chat_history:
            self.chat_history[company_id] = CompanyHistory(company_id=company_id)
        company_history = self.chat_history[company_id]
        return company_history.get_history(user_id=user_id)

    def add_history(
        self,
        company_id: str,
        user_id: str,
        messages: dict[str, str] | list[dict[str, str]],
        save: bool = False,
        ignore_duplicates: bool = True,
    ):
        if company_id not in self.chat_history:
            self.chat_history[company_id] = CompanyHistory(company_id=company_id)
        company_history = self.chat_history[company_id]
        company_history.add_history(
            user_id=user_id, messages=messages, ignore_duplicates=ignore_duplicates
        )
        if save:
            company_history.save(user_id=user_id)

    def get_add_history(
        self,
        company_id: str,
        user_id: str,
        messages: dict[str, str] | list[dict[str, str]],
        save: bool = False,
        ignore_duplicates: bool = True,
    ) -> list[dict[str, str]]:
        self.add_history(
            company_id=company_id,
            user_id=user_id,
            messages=messages,
            save=save,
            ignore_duplicates=ignore_duplicates,
        )
        return self.get_history(company_id=company_id, user_id=user_id)


@dataclass
class CompanyHistory(AWSHistory):
    pass
