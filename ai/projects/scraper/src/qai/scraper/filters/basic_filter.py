# Basic Config
filter_cfg = """
[[pipeline]]
in_folder = "raw"
out_folder = "simplified"
categories = ["general"]
pipeline = ["Remove", "Simplify", "HtmlWriter", "MarkdownWriter"]

[[processors]]
name = "Remove"
header = true
footer = true
javascript = true
css = true
style = true
images = true
empty = true
meta = true
document = true
buttons = true
p_in_a = true
classes = ["home-header", "home-footer", "main-header", "main-footer"]

[[processors]]
name = "Simplify"
unwrap_a = false
sanitize = false

[[processors]]
name = "HtmlWriter"
out_folder = "simplified_html"

[[processors]]
name = "MarkdownWriter"
out_folder = "simplified_md"
"""
