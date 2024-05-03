from dataclasses import dataclass

import ftfy
from bs4 import BeautifulSoup
import re
from .processors import Processor
from markdownify import markdownify as md

@dataclass
class TextWriter(Processor):
    file_name: str = None
    body_width: int = None

    def process(self, soup: BeautifulSoup, typ:int=True) -> BeautifulSoup:
        with open(self.file_name, "w") as fp:
            html = ftfy.fix_text(str(soup.prettify()))
            if typ==0:
                new_str = md(html)
            elif typ==1:
                import html2text
                h = html2text.HTML2Text(bodywidth=self.body_width)
                new_str = h.handle(html)
            else:
                from markdown2 import Markdown
                markdowner = Markdown()

            # new_str = md(html, strip=[])
        
            # new_str = re.sub(r'\n\s*\n', r'\n\n', new_str, flags=re.M)
            # new_str = re.sub(r'\n+', '\n', new_str).strip()

            fp.write(new_str)

        return soup
