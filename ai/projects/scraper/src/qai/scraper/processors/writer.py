import os
from dataclasses import dataclass
from typing import Any
from qai.core import MetaFile, MetaDir

from qai.scraper.filters.meta import InstanceInfo

# from qai.scraper.scrapers.scraper import WebObj

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
    ) -> MetaDir:
        if self.out_folder is not None:
            webobj: MetaFile = instance_info.web_file
            meta = instance_info._meta

            group = meta.get_dir(self.out_folder, create=True)
            if self.file_name is None:
                self.file_name = group.path / webobj.path.name
            dn = os.path.dirname(self.file_name)
            os.makedirs(dn, exist_ok=True)
            if extension is not None:
                fn, __ = os.path.splitext(self.file_name)
                if extension.startswith("."):
                    extension = extension[1:]
                self.file_name = f"{fn}.{extension}"
            # print("Writing to", self.file_name, self.out_folder)
            # mf = MetaFile(
            #     path=self.file_name,metadata={"instance_info": instance_info}
            # )
            # mf.add_origin(webobj)

            # group.add_file(mf)
            # self.meta.add_file_meta(
            #     group=self.out_folder,
            #     values={
            #         "uri": webobj.uri,
            #         "file_name": os.path.basename(self.file_name),
            #         "source_uri": f"{{group:{webobj._group}}}/{webobj.uri}",
            #     },
            #     # write_to_file="w",
            # )
            # self.meta.save(overwrite=True)
            return group

    # def process(self, soup: BeautifulSoup, **kwargs) -> BeautifulSoup:
