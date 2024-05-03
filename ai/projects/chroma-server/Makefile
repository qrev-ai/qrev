## AWS variables
CLUSTER_NAME?=chatbot-cluster
SERVICE_NAME?=chromadb-service
TASK_NAME?=chromadb-task-definition
REGION=us-east-1
ECR?=354444817070.dkr.ecr.us-east-1.amazonaws.com

## Docker Variables
LOCAL_IMAGE?=docker.io/library/chroma_db_loader
LOCAL_TAG?=latest
NAME?=chromadb
REMOTE_IMAGE?=${ECR}/${NAME}
REMOTE_TAG?=${LOCAL_TAG}

## Server variables, for curl commands
PORT=8000
IP_P?=localhost:${PORT} ## IP and Port. Default to localhost for local testing
IP_P=chromadb-load-balancer-735223093.us-east-1.elb.amazonaws.com:${PORT}

## AWS
authenticate::
	aws ecr get-login-password --region ${REGION} | docker login --username AWS --password-stdin ${ECR}

deploy_service:: authenticate
	@# this will update the task and service with a blue green deployment
	ecs deploy ${CLUSTER_NAME} ${SERVICE_NAME}

## Docker Commands

build:: docker_make_temp_dir
	DOCKER_DEFAULT_PLATFORM=linux/amd64 docker compose build

enter::
	docker run --memory="4g" -i -p ${PORT}:${PORT} -t ${LOCAL_IMAGE} /bin/bash

buildenter:: build enter
	@#

up:: docker_make_temp_dir
	DOCKER_DEFAULT_PLATFORM=linux/amd64 docker compose up --build

push:: authenticate
	docker tag ${LOCAL_IMAGE}:${LOCAL_TAG} ${REMOTE_IMAGE}:${REMOTE_TAG}
	docker push ${REMOTE_IMAGE}:${REMOTE_TAG}

docker_make_temp_dir::
	sh scripts/stage_docker.sh


## Tests
heartbeat::
	curl -f http://${IP_P}/api/v1/collections


format:	## Run code autoformatters (black).
	pre-commit install
	git ls-files | xargs pre-commit run black --files
