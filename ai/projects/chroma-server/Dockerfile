# syntax=docker/dockerfile:1

FROM ghcr.io/chroma-core/chroma:0.4.22

# Token Credentials
ARG CHROMA_SERVER_AUTH_CREDENTIALS
ENV \
    ## Chroma
    ANONYMIZED_TELEMETRY=False \
    # Setup token Authentication
    CHROMA_SERVER_AUTH_CREDENTIALS_PROVIDER="chromadb.auth.token.TokenConfigServerAuthCredentialsProvider" \
    CHROMA_SERVER_AUTH_PROVIDER="chromadb.auth.token.TokenAuthServerProvider" \
    CHROMA_SERVER_AUTH_CREDENTIALS="${CHROMA_SERVER_AUTH_CREDENTIALS}" \
    ## python
    PYTHONUNBUFFERED=1 \
    ## pip
    PIP_DISABLE_PIP_VERSION_CHECK=on \
    PIP_DEFAULT_TIMEOUT=100 \
    ## Poetry
    # https://python-poetry.org/docs/configuration/#using-environment-variables
    # do not ask any interactive question
    POETRY_NO_INTERACTION=1 \
    # never create virtual environment automatically, only use env prepared by us
    POETRY_VIRTUALENVS_CREATE=false 

WORKDIR /app
RUN apt-get update && apt-get install -y curl tmux vim
RUN pip install --upgrade pip setuptools wheel poetry 

# Poetry
# RUN curl -sSL https://install.python-poetry.org | python3 -
RUN poetry config virtualenvs.create false

# install runtime deps - uses $POETRY_VIRTUALENVS_IN_PROJECT internally
COPY docker_staging/pyproject.toml ./pyproject.toml
RUN poetry install --no-root 
# RUN /root/.local/bin/poetry install --no-root --only main

# Pip cache
RUN pip install pyyaml

## Config files
COPY docker_staging/.config /root/.config
COPY docker_staging/.aws /root/.aws

## copy chroma cache if exists
RUN mkdir -p /root/.cache 
COPY docker_staging/.cache/chroma* /root/.cache/chroma

# COPY docker_staging/requirements.txt ./
# RUN pip install -r requirements.txt
COPY src/* ./
COPY scripts/* ./

RUN poetry install  

EXPOSE 8000

RUN sh pre_run.sh
CMD ["sh", "run_server.sh"]
