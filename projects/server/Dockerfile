## This script is used to build the docker image for the qai-server project
# It assumes that it is run from the root of the qai directory
# Example:
# docker build -t qai-chat -f builds/qai-chat/Dockerfile .
# syntax=docker/dockerfile:1

FROM python:3.11-slim as base

ARG STAGEDIR=docker_staging-qai-server
ARG PROJECT_NAME=qai-server
ARG PROJECT_DIR=projects/server

ENV \
    # python
    PYTHONUNBUFFERED=1 \
    # pip
    PIP_DISABLE_PIP_VERSION_CHECK=on \
    PIP_DEFAULT_TIMEOUT=100 \
    \
    # Poetry
    # https://python-poetry.org/docs/configuration/#using-environment-variables
    # do not ask any interactive question
    POETRY_NO_INTERACTION=1 \
    # never create virtual environment automatically, only use env prepared by us
    POETRY_VIRTUALENVS_CREATE=false \
    # this is where our requirements + virtual environment will live
    VIRTUAL_ENV="/venv" 

WORKDIR /app
# prepend venv to path
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

# prepare virtual env
RUN python -m venv $VIRTUAL_ENV

ENV PYTHONPATH="/app"
EXPOSE 8081

RUN apt-get update && apt-get -y install coreutils build-essential curl git tmux vim
RUN echo 'alias ll="ls -lh"' >> ~/.bashrc
RUN \
    # --mount=type=cache,target=/root/.cache/pip \
    CFLAGS="-g0 -Wl,--strip-all -I/usr/include:/usr/local/include -L/usr/lib:/usr/local/lib" \
    pip install \
    --no-cache-dir \
    --compile \
    --upgrade pip setuptools wheel dynamic-pypi poetry gunicorn

FROM base as build
WORKDIR /app

## COPY files from the staging directory
COPY ${STAGEDIR}/.config /root/.config
COPY ${STAGEDIR}/.aws /root/.aws
COPY ${STAGEDIR}/nltk_data /root/nltk_data

RUN mkdir -p /root/.cache 


COPY projects ./projects
WORKDIR /app/projects/server

# COPY ${PROJECT_DIR}/pyproject.toml ${PROJECT_DIR}/poetry.lock ./
COPY ${STAGEDIR}/requirements.txt ./requirements.txt
RUN pip install -r requirements.txt
# RUN poetry install

COPY ${PROJECT_DIR}/scripts ${PROJECT_DIR}/src/qai ./
FROM base as final_app

WORKDIR /app
COPY --from=build /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=build $VIRTUAL_ENV $VIRTUAL_ENV

COPY --from=build /app/projects/server/scripts ./scripts
COPY --from=build /root/.config /root/.config
COPY --from=build /root/.aws /root/.aws
## Projects
COPY --from=build /app/projects/agent/src/qai ./qai
COPY --from=build /app/projects/ai/src/qai ./qai
COPY --from=build /app/projects/chat/src/qai ./qai
COPY --from=build /app/projects/core/src/qai ./qai
COPY --from=build /app/projects/server/src/qai ./qai
COPY --from=build /app/projects/storage/src/qai ./qai

# # COPY scripts/run_server.sh run_server.sh
CMD [ "sh", "scripts/run_server.sh"]
