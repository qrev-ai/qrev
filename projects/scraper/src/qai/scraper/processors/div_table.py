from dataclasses import dataclass

import pandas as pd
from bs4 import BeautifulSoup

from qai.scraper.filters.meta import InstanceInfo
from qai.scraper.processors.processors import Processor
from qai.scraper.utils.bs_utils import html_strip



@dataclass
class DivTable(Processor):

    # container: str = None
    table: str = None
    columns: list[str] = None
    trs: list[str] = None
    column_headers: list[str] = None
    
    # has_header: bool = Truet

    def process(
        self, soup: BeautifulSoup, instance_info: InstanceInfo = None, **kwargs
    ) -> BeautifulSoup:
        table = soup.find("div", {"name": self.table})
        if not table:
            return soup
        data = {}
        headers = []
        column_headers = self.column_headers if self.column_headers else [None] * len(self.columns)
        for column, row, header in zip(self.columns, self.trs, column_headers):
            vals = []
            ## Find all divs with the name <container>
            container = table.find("div", {"name": column})
            if header:
                h = container.find("div", {"name": header}).extract()
                txt = html_strip(h.text)
                headers.append(txt)
            else:
                headers.append(column)

            ## Find all divs with the name <tr>
            trs = container.find_all("div", {"name": row})
            print(len(trs))
            # print(trs[0])
            for tr in trs:
                # print(tr)
                txt = html_strip(tr.text)
                vals.append(txt)
            data[column] = vals
        if not headers:
            headers = list(data.keys())
        df = pd.DataFrame(data=data)
        df.columns = headers
        print(df.to_html(index=False))
        ## replace the table with the new table
        table.replace_with(BeautifulSoup(df.to_html(index=False), "html.parser"))
        return soup
