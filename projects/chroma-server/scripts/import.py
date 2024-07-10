import glob
import os
from threading import Event, Thread

import chromadb
from llama_chroma import ChromaType, EmbeddingName, import_website, make_client
from pi_conf import load_config
from s3_utils import download_all

cfg = load_config("chroma-server")
cfg.to_env()
bucket_name = "qrev-website-storage"
LOCAL_WEBDIR = os.path.expanduser("~/websites")

HOST = "localhost"
PORT = 8000


INITIAL_WAIT_TIME = 1
SUBSEQUENT_WAIT_TIME = 60 * 15  # 15 minutes
WEBSITE_PREFIX = "/websites/"
BUCKET_NAME = "qrev-website-storage"
SUBDIR = "simplified_md"
EMBED_MODEL = EmbeddingName.hf_bge_small_en_v1_5


def get_last(names: list[str]) -> str:
    col_list = sorted(names, key=lambda x: x, reverse=True)
    print("col_list=", col_list)
    return col_list[0]


def make_collection_name(company: str, time_path: str) -> str:
    company = os.path.basename(company)
    timestr = os.path.basename(time_path)
    return f"{company}.{SUBDIR}.{timestr}.{EMBED_MODEL.short_name()}"


def import_all(
    host: str = None, port: int = None, type: ChromaType = ChromaType.HTTP, webdir: str = None
):
    chroma_client = make_client(host, port, type)
    for company_path in glob.glob(f"{webdir}/*", recursive=False):
        company = os.path.basename(company_path)
        print(f"Importing Company={company}", flush=True)
        for time_path in glob.glob(f"{company_path}/*", recursive=False):
            print(f"   Time={time_path}", flush=True)
            col_name = make_collection_name(company, time_path)
            try:
                col: chromadb.Collection = chroma_client.get_collection(col_name)
                print(f"Collection {col_name} exists, skipping. count={col.count()}", flush=True)
                continue
            except:
                print(
                    "Collection does not exist and this is fine. Ignore previous error", flush=True
                )
            import_path = os.path.join(time_path, SUBDIR)
            import_website(chroma_client, company, import_path, col_name, embed_model=EMBED_MODEL)


class MyThread(Thread):
    def __init__(self, event, event2):
        Thread.__init__(self)
        self.stopped = event
        self.importing = event2

    def run(self):
        WAIT_TIME = INITIAL_WAIT_TIME
        print(f"################### Loading in {WAIT_TIME}", flush=True)
        while not self.stopped.wait(WAIT_TIME):
            WAIT_TIME = SUBSEQUENT_WAIT_TIME
            if self.importing.is_set():
                print("Already importing")
                continue
            try:
                print("Importing")
                # call a function
                self.importing.set()
                download_all(bucket_name, WEBSITE_PREFIX, LOCAL_WEBDIR)
                import_all(host=HOST, port=PORT, type=ChromaType.HTTP, webdir=LOCAL_WEBDIR)

                self.importing.clear()
            except Exception as e:
                print(f"Error importing", e, flush=True)


importingFlag = Event()
stopFlag = Event()
thread = MyThread(stopFlag, importingFlag)
thread.start()
thread.join()
# download_all(bucket_name, WEBSITE_PREFIX)
# import_all(type=ChromaType.Ephemeral, webdir=LOCAL_WEBDIR)
# this will stop the timer
# stopFlag.set()
