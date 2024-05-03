import sqlite3
from urllib.request import pathname2url


def verify_db_connection(connection_str: str):
    ## Verify the database connection
    try:
        uri = connection_str.replace("sqlite:///", "")
        dburi = "file:{}?mode=rw".format(pathname2url(uri))
        sqlite3.connect(dburi, uri=True)
    except sqlite3.OperationalError:
        # handle missing database case
        raise
