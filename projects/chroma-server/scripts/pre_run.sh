# #!/bin/bash
# echo "Rebuilding hnsw to ensure architecture compatibility"
# pip install --force-reinstall --no-cache-dir chroma-hnswlib
# export IS_PERSISTENT=1
# export PERSIST_DIRECTORY=/.chroma
# uvicorn chromadb.app:app --workers 1 --host 0.0.0.0 --port 8000 --proxy-headers  &
# PID=$!
# sleep 5
# python import.py

# kill -9 $PID ## Take down the server