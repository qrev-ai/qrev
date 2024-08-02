import glob
import os
import re
import traceback
from dataclasses import dataclass
from pathlib import Path
from typing import Any, ClassVar

from bs4 import BeautifulSoup
from pi_conf import Config
from pi_log import getLogger
from qai.core import Meta, MetaFile

from qai.scraper.processors.processor_factory import get_processor
from qai.scraper.processors.processors import Processor
# from qai.scraper.scrapers.meta import WebObj
from qai.scraper.utils.bs_utils import make_soup as bs_util_make_soup
from qai.scraper.utils.bs_utils import make_soup_from_file

from .meta import DirectoryInfo, InstanceInfo

log = getLogger(__name__)

DEFAULT_PARSER = "lxml"


class MultiFilter:
    def __init__(
        self,
        configs: list[str] | list[dict[str, Any]],
        meta: Meta = None,
    ):
        # for config in configs:
        #     if "subfolder" not in config.get("default_options", {}):
        #         raise ValueError("subfolder must be specified in config.default_options for MultiFilter")
        self.configs = []
        for config in configs:
            if isinstance(config, str):
                config = Config.from_str(config)
            else:
                config = Config.from_dict(config)
            self.configs.append(config)
        self.meta = meta

    def process_directory(self, in_folder: str = None, in_group: str = None):
        for config in self.configs:
            f = Filter(config, meta=self.meta)
            f.process_directory(in_folder=in_folder, in_group=in_group)


class Filter:
    process_file_count: ClassVar[int] = 0

    def __init__(
        self,
        config: str | dict[str, Any],
        meta: Meta = None,
        # subfolder: str = "",
    ):
        if isinstance(config, str):
            self.config = Config.from_str(config)
        else:
            self.config = Config.from_dict(config)
        self.meta = meta

        self.processer_configs = get_processor_config_map(config)
        self.default_ops: dict[str, Any] = config.get("default_options", {})
        self.default_pipeline = self.default_ops.get("pipeline")
        self._proc_name2config_map = {}
        for proc_config in config.get("processors", []):
            proc_name = proc_config.get("name")
            self._proc_name2config_map[proc_name] = proc_config
        self.default_parser = config.get("default_parser", DEFAULT_PARSER)

    # def _attach_instance_info(self, config: dict[str, Any], key: str, value) -> dict[str, Any]:
    #     if not "_instance_info_" in config:
    #         config["_instance_info_"] = {}
    #     config["_instance_info_"][key] = value

    def process_file(
        self,
        filename_or_webfile_name: MetaFile | str | Path,
        directory_info: DirectoryInfo = None,
    ) -> list[BeautifulSoup]:
        list_cfgs = self._get_matching_configs(filename_or_webfile_name)
        if not list_cfgs:
            return []

        log.debug(f"filter:process_file: {filename_or_webfile_name}")
        id = self.process_file_count
        self.process_file_count += 1
        if isinstance(filename_or_webfile_name, Path):
            filename_or_webfile_name = str(filename_or_webfile_name)
        if isinstance(filename_or_webfile_name, str):
            # if self.meta:
            #     uri = self.meta.relative_to(filename_or_webfile_name)
            # else:
            #     uri = filename_or_webfile_name
            filename_or_webfile_name = MetaFile(
                path=filename_or_webfile_name,
                # source_uri=filename_or_webfile_name,
                # _meta=self.meta,
            )
        webfile: MetaFile = filename_or_webfile_name
        soups = []
        instance_info = InstanceInfo(
            # _uri=webfile._uri,
            web_file=webfile,
            _meta=self.meta,
            directory_info=directory_info,
        )
        instance_info._meta = self.meta

        for i, cfg in enumerate(list_cfgs):
            instance_info.config = cfg
            instance_info.config_index = i
            # soup = self.filter_html_file(webfile.full_path(), cfg, instance_info=instance_info)
            soup = self.filter_html_file(webfile.path, cfg, instance_info=instance_info)
            soups.append(soup)
        return soups

    def process_soup(self, soup: BeautifulSoup):
        return self.filter_soup(soup)

    def _should_include(self, file_info: str | MetaFile, config: dict[str, Any]) -> bool:
        """
        Returns True if the file should be included,
        False if it should be excluded.
        """
        if (
            not "url_regex" in config
            and not "file_regex" in config
            and not "exclude_url_regex" in config
            and not "exclude_file_regex" in config
        ):
            ### Not specifying anything matches all files
            return True
        @dataclass
        class NameSource:
            uri: str
            source_uri: str

        if isinstance(file_info, (str, Path)):
            bn = os.path.basename(file_info)
            file_info = NameSource(uri=bn, source_uri=str(file_info))
        else:
            file_info = NameSource(uri=file_info.path, source_uri="")
        
        for typ in ["source_uri", "uri"]:
            to_match = getattr(file_info, typ)
            typp = {"source_uri": "url", "uri": "file"}[typ]

            include = f"{typp}_regex"
            exclude = f"exclude_{typp}_regex"
            if exclude in config:
                if re.match(config[exclude], to_match):
                    log.debug(f"Excluded {to_match} to {config[exclude]}")
                    return False
                else:
                    log.debug(f"Did not exclude {to_match} to {config[exclude]}")
            if include in config:
                if re.match(config[include], to_match):
                    log.debug(f"Matched {to_match} to {config[include]}")
                    return True
                else:
                    log.debug(f"Did not match {to_match} to {config[include]}")

        return False

    def process_directory(
        self, in_group: str = None, in_folder: str = None, directory_info: DirectoryInfo = None
    ):
        """
        Needs in_group or in_folder to be specified
        """
        if not in_group and not in_folder:
            raise ValueError("in_group or in_folder must be specified")
        if directory_info is None:
            directory_info = DirectoryInfo(_meta=self.meta, in_folder=str(in_folder))

        if in_group is None and in_folder:
            for f in glob.glob(f"{in_folder}/**"):
                log.debug(f"Filter:Processing {str(f)}")
                self.process_file(f, directory_info=directory_info)
        else:
            directory_info.in_folder = in_folder
            g = self.meta.get_dir(in_group)
            files = list(self.meta.get_files(in_group))
            for f in files:
                print(f"Filter:Processing {str(f)}, len={len(files)}")
                log.debug(f"Filter:Processing {str(f)}, len={len(files)}")
                self.process_file(f, directory_info=directory_info)

    def _subsitute_values(self, config: dict, filename: MetaFile) -> dict:
        for k, v in config.items():
            if isinstance(v, str):
                try:
                    v = v.replace("<filename>", filename.path)
                    v = v.replace("<basename>", filename.path.name)
                    # v = v.replace("<group>", self.subfolder)
                except:
                    pass
                config[k] = v
        return config

    def _get_matching_configs(self, file_name: MetaFile) -> list[dict[str, Any]]:
        ## If we have a list of configs, then we need to match the file_name to the regex
        if "pipeline" in self.config:
            configs = []
            for url_config in self.config.get("pipeline", []):
                if not self._should_include(file_name, url_config):
                    continue

                ### Not specifying anything matches all files
                base_config = self.default_ops.copy()
                base_config.update(url_config)
                configs.append(self._subsitute_values(base_config, filename=file_name))
            return configs
        ## If no configs are specified, then we just use the default config for all files
        base_config = self.default_ops.copy()
        return [self._subsitute_values(base_config, filename=file_name)]

    def _get_pipeline(self, processor_names: list[str], config: dict[str, Any]) -> list[Processor]:

        pipeline = []
        for proc_name in processor_names:
            base_config = config.copy()
            pconfig = self._proc_name2config_map.get(proc_name, {}).copy()
            base_config.update(pconfig)
            proc = get_processor(name=proc_name, config=base_config, meta=self.meta)
            pipeline.append(proc)
            log.debug(f"Adding processor {proc.name}")
        return pipeline

    def _make_processors(self, config: dict[str, Any]) -> list[Processor]:
        proc_names = config.get("pipeline", self.default_pipeline)
        if not proc_names:
            raise ValueError(f"No pipeline found for inside config")

        ### TODO: Need to handle multiple pipelines later
        if len(proc_names) > 0 and isinstance(proc_names[0], dict):
            proc_names = proc_names[0]
            proc_names = proc_names.get("pipeline", self.default_pipeline)
        return self._get_pipeline(processor_names=proc_names, config=config)

    def filter_html_file(
        self, html_file_or_fp: str, config: dict[str, Any], instance_info: dict[str, Any] = None
    ) -> BeautifulSoup:
        soup = make_soup_from_file(html_file_or_fp)
        return self.filter_soup(soup, config=config, instance_info=instance_info)

    def filter_html_string(self, html: str, config: dict[str, Any] = None) -> BeautifulSoup:
        return self.filter_soup(self.make_soup(html), config)

    def filter_soup(
        self, soup: BeautifulSoup, config: dict[str, Any] = None, instance_info=None
    ) -> BeautifulSoup:
        if config is None:
            config = self.config
        procs = self._make_processors(config)

        return self._filter_soup(soup, procs, config=config, instance_info=instance_info)

    def _filter_soup(
        self,
        soup: BeautifulSoup,
        procs: list[Processor] = None,
        config: dict[str, Any] = None,
        instance_info: InstanceInfo = None,
    ) -> BeautifulSoup:
        tags = config.get("tags")
        if tags and self.meta:
            if isinstance(tags, str):
                tags = [tags]
        for i, p in enumerate(procs):
            log.debug(f"    {i}, {p.name} nodes={len(soup())}")
            soup = p.process(soup, instance_info=instance_info)

        return soup

    def filter_url(self, url: str):
        f = self.meta.get_file(url)
        return self.filter_html_string(f)

    def filter_urls(self, urls: list[str]):
        for url in urls:
            self.filter_url(url)

    @staticmethod
    def make_soup(html_str_or_path_or_fp: str, default_parser: str = "lxml") -> BeautifulSoup:
        if isinstance(html_str_or_path_or_fp, MetaFile):
            html_str_or_path_or_fp = str(html_str_or_path_or_fp)
        return bs_util_make_soup(html_str_or_path_or_fp, default_parser=default_parser)


def get_processor_config_map(config: dict[str, Any]) -> dict[str, Any]:
    cfg = config.copy()
    d = {}
    for p in cfg.get("processors", []):
        name = p.get("name")
        d[name] = p
    return d
