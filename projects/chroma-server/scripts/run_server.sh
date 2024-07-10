#!/bin/bash
echo "Rebuilding hnsw to ensure architecture compatibility"
pip install --force-reinstall --no-cache-dir chroma-hnswlib
export IS_PERSISTENT=1
export PERSIST_DIRECTORY=/.chroma
uvicorn chromadb.app:app --workers 1 --host 0.0.0.0 --port 8000 --proxy-headers --reload &
PID=$!
# uvicorn chromadb.app:app --workers 1 --host 0.0.0.0 --port 8000 --proxy-headers --log-config log_config.yml &
sleep 15
python import.py &

wait $PID ## Wait for server to complete