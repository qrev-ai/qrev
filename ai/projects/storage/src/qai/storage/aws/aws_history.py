import json
import os
from collections import defaultdict
from dataclasses import dataclass, field

import boto3
from pi_log import logs
from qai.storage import cfg

log = logs.getLogger(__name__)

s3 = boto3.client("s3")

bucket = boto3.resource("s3").Bucket(os.getenv("AWS_BUCKET_NAME"))


def load_s3(key):
    return bucket.Object(key=key).get()["Body"].read().decode("utf-8")


def load_s3_json(key):
    return json.loads(load_s3(key))


class AWSCompanyIds:
    def __init__(self):
        self.website_2_id = load_s3_json(key=cfg.aws.company_ids_file)

        self.id_2_website = {v: k for k, v in self.website_2_id.items()}


@dataclass
class AWSHistory:
    company_id: str
    history: dict[str, list[dict[str, str]]] = field(
        default_factory=dict
    )  # user id to list of messages
    seen: set[str] = None

    def _make_file_name(self, user_id: str) -> str:
        file_name = cfg.aws.history_file
        file_name = file_name.replace("<company_id>", self.company_id)
        file_name = file_name.replace("<user_id>", user_id)
        return file_name

    def get_history(self, user_id: str, ignore_warnings: bool = False) -> list[dict[str, str]]:
        if self.history is None:
            self.history = defaultdict(list)
        if user_id in self.history:
            return self.history[user_id]
        file_name = self._make_file_name(user_id=user_id)
        try:
            self.history[user_id] = load_s3_json(key=file_name)
        except Exception as e:
            if not ignore_warnings:
                log.error(f"Failing to load history for {self.company_id}, {user_id}")
                log.error(e)
            self.history[user_id] = []
        return self.history[user_id]

    def __post_init__(self):
        if not self.company_id:
            raise ValueError("Must provide company id")

    def add_history(
        self, user_id: str, messages: dict[str, str] | list[dict[str, str]], ignore_duplicates=True
    ):
        if isinstance(messages, dict):
            messages = [messages]
        if user_id not in self.history:
            self.history[user_id] = []
        if ignore_duplicates:
            if len(self.history[user_id]) > 0:
                last_message = self.history[user_id][-1]
                if last_message == messages[0]:
                    return
        self.history[user_id].extend(messages)
        self.history[user_id] = self.history[user_id][-100:]

    def save(self, user_id: str):
        file_name = self._make_file_name(user_id=user_id)
        hist = self.history[user_id]
        s3.put_object(Body=json.dumps(hist), Bucket=bucket.name, Key=file_name)

    def delete(self, user_id: str, ignore_missing: bool = True):
        file_name = self._make_file_name(user_id=user_id)
        if ignore_missing:
            try:
                s3.delete_object(Bucket=bucket.name, Key=file_name)
            except:
                pass
        else:
            s3.delete_object(Bucket=bucket.name, Key=file_name)

    def exists(self, user_id: str) -> bool:
        file_name = self._make_file_name(user_id=user_id)
        try:
            load_s3(key=file_name)
            return True
        except:
            return False
