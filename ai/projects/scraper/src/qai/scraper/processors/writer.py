import os
from dataclasses import dataclass
from typing import Any

from qai.scraper.filters.meta import InstanceInfo
from qai.scraper.scrapers.scraper import WebObj

from .processors import Processor


@dataclass
class Writer(Processor):
    file_name: str = None
    out_folder: str = None

    def __post_init__(self):
        if self.meta is None:
            raise ValueError(
                "meta must be specified for Writer as there must be some place to write to"
            )

    def _append_and_modify_filename(
        self, extension: str = None, instance_info: InstanceInfo = None
    ):
        if self.out_folder is not None:
            webobj: WebObj = instance_info.web_file

            group = webobj._meta.get_group(self.out_folder, create=True)
            if self.file_name is None:
                self.file_name = os.path.join(group, webobj._uri)
            dn = os.path.dirname(self.file_name)
            os.makedirs(dn, exist_ok=True)
            if extension is not None:
                fn, __ = os.path.splitext(self.file_name)
                if extension.startswith("."):
                    extension = extension[1:]
                self.file_name = f"{fn}.{extension}"
            print("Writing to", self.file_name, self.out_folder)
            self.meta.add_file_meta(
                group=self.out_folder,
                values={
                    "_uri": webobj._uri,
                    "file_name": os.path.basename(self.file_name),
                    "source_uri": f"{{group:{webobj._group}}}/{webobj._uri}",
                },
                # write_to_file="w",
            )
            self.meta.save()

    # def process(self, soup: BeautifulSoup, **kwargs) -> BeautifulSoup:
