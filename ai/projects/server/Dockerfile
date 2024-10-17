# syntax=docker/dockerfile:1

# Base image with common dependencies
FROM python:3.11-slim as base

ARG STAGEDIR=docker_staging-qai-server
ARG PROJECT_NAME=qai-server
ARG PROJECT_DIR=projects/server

ENV PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=on \
    PIP_DEFAULT_TIMEOUT=100 \
    POETRY_NO_INTERACTION=1 \
    POETRY_VIRTUALENVS_CREATE=false \
    VIRTUAL_ENV="/venv" \
    PATH="/venv/bin:$PATH" \
    PYTHONPATH="/app" \
    CFLAGS="-g0 -Wl,--strip-all -I/usr/include:/usr/local/include -L/usr/lib:/usr/local/lib"

WORKDIR /app

RUN python -m venv $VIRTUAL_ENV && \
    apt-get update && \
    apt-get -y install --no-install-recommends coreutils build-essential curl git tmux vim && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* && \
    echo 'alias ll="ls -lh"' >> ~/.bashrc && \
    pip install --no-cache-dir --upgrade pip setuptools wheel poetry gunicorn

# Build stage for common dependencies
FROM base as common-deps
COPY pyproject.toml poetry.lock ./
RUN --mount=type=cache,target=/root/.cache/pypoetry \
    poetry install --no-root

# Build stages for individual projects
FROM common-deps as project-agent
COPY projects/agent ./projects/agent
RUN --mount=type=cache,target=/root/.cache/pypoetry \
    cd projects/agent && poetry install

FROM common-deps as project-ai
COPY projects/ai ./projects/ai
RUN --mount=type=cache,target=/root/.cache/pypoetry \
    cd projects/ai && poetry install

FROM common-deps as project-chat
COPY projects/chat ./projects/chat
RUN --mount=type=cache,target=/root/.cache/pypoetry \
    cd projects/chat && poetry install

FROM common-deps as project-core
COPY projects/core ./projects/core
RUN --mount=type=cache,target=/root/.cache/pypoetry \
    cd projects/core && poetry install

FROM common-deps as project-server
COPY projects/server ./projects/server
RUN --mount=type=cache,target=/root/.cache/pypoetry \
    cd projects/server && poetry install

FROM common-deps as project-storage
COPY projects/storage ./projects/storage
RUN --mount=type=cache,target=/root/.cache/pypoetry \
    cd projects/storage && poetry install

# Final stage
FROM base as final

# Copy installed packages from individual project builds
COPY --from=project-agent /venv /venv
COPY --from=project-ai /venv /venv
COPY --from=project-chat /venv /venv
COPY --from=project-core /venv /venv
COPY --from=project-server /venv /venv
COPY --from=project-storage /venv /venv

# Copy project files
COPY projects ./projects

# Copy configuration files
COPY ${STAGEDIR}/.config /root/.config
COPY ${STAGEDIR}/.aws /root/.aws
COPY ${STAGEDIR}/nltk_data /root/nltk_data

WORKDIR /app/${PROJECT_DIR}

CMD ["sh", "scripts/run_server.sh"]