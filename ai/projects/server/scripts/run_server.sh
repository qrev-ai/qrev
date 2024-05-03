#!/bin/sh
echo $(pwd)
echo $(ls)
gunicorn --timeout 300 --bind 0.0.0.0:8081 qai.server.serve:app
