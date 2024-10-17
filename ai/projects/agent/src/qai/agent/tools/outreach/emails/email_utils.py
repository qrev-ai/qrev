import html
import re
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from bs4 import BeautifulSoup


def is_plain_text_email(content: str) -> bool:
    """
    Check if the given content is plain text.

    :param content: Either a full email string or just the email body
    :return: True if the content is plain text, False otherwise
    """
    # First, check for email headers
    headers, _, body = content.partition("\n\n")
    if "Content-Type:" in headers:
        return "text/plain" in headers.lower()

    # If no headers, or no Content-Type header, examine the content

    # Use BeautifulSoup with a stricter parser
    soup = BeautifulSoup(content, "html.parser")

    # Check for tell-tale signs of HTML structure
    if soup.find(["html", "body", "div", "p", "br", "table", "a"]):
        return False

    # Check for HTML-style comments
    if re.search(r"<!--.*?-->", content, re.DOTALL):
        return False

    # Check for multiple consecutive HTML-like tags
    if re.search(r"<[a-z]+>.*?</[a-z]+>", content, re.IGNORECASE | re.DOTALL):
        return False

    # Check for common HTML entities
    html_entities = ["&nbsp;", "&lt;", "&gt;", "&amp;", "&quot;"]
    if any(entity in content for entity in html_entities):
        return False

    # If we've made it this far, it's likely plain text
    return True


def convert_text_to_html(text_content: str) -> str:
    escaped_content = html.escape(text_content).replace("\n", "<br>")
    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
</head>
<body>
    <p>{escaped_content}</p>
</body>
</html>"""
    return html_content


def convert_text_to_html_email(subject: str, text_content: str) -> str:
    # Create the root message and set the subject
    msg_root = MIMEMultipart("alternative")
    msg_root["Subject"] = subject

    # Create the plain-text version of the message
    text_part = MIMEText(text_content, "plain")

    # Create the HTML version of the message
    html_content = f"""
    <html>
        <head></head>
        <body>
            <p>{html.escape(text_content).replace(chr(10), '<br />')}</p>
        </body>
    </html>
    """
    html_part = MIMEText(html_content, "html")

    # Attach both parts
    msg_root.attach(text_part)
    msg_root.attach(html_part)

    return msg_root.as_string()


def convert_html_to_plain_text(html_content: str) -> str:
    """
    Convert HTML content to plain text while preserving most of the original formatting.

    :param html_content: HTML content as a string
    :return: Plain text content
    """
    # Use BeautifulSoup to parse the HTML
    soup = BeautifulSoup(html_content, 'html.parser')

    # Remove script, style, and title elements
    for element in soup(["script", "style", "title"]):
        element.decompose()

    # Replace <br> tags with newlines and </p> tags with newlines
    for br in soup.find_all("br"):
        br.replace_with("\n")
    for p in soup.find_all("p"):
        p.append("\n")

    # Get text while preserving some structure
    text = soup.get_text()

    # Decode HTML entities
    text = html.unescape(text)

    # Replace multiple spaces with a single space
    text = re.sub(r' +', ' ', text)

    # Replace two or more newlines with a single newline
    text = re.sub(r'\n{2,}', '\n', text)

    # Remove spaces before newlines and after newlines
    text = re.sub(r' *\n *', '\n', text)

    return text.strip()