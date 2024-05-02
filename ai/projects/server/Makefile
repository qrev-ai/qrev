include .env
BUILD_TIME = $()
## AWS Variables

CLUSTER_NAME?=${CLUSTER_NAME}
SERVICE_NAME?=${SERVICE_NAME}
TASK_NAME?=${TASK_NAME}
ECR?=${ECR}
REGION=${REGION}

## Docker Variables
LOCAL_IMAGE?=docker.io/library/chatbot
LOCAL_TAG?=latest
NAME?=chatbot
REMOTE_IMAGE?=${ECR}/${NAME}
REMOTE_TAG?=${LOCAL_TAG}

### Docker build environment variables
export COMPOSE_DOCKER_CLI_BUILD=1
export DOCKER_BUILDKIT=1
export DOCKER_DEFAULT_PLATFORM=linux/amd64

IP?=${IP}
CHROMA_IP?=${CHROMA_IP}

SCRIPT_DIR:=$(shell dirname "$(realpath $(firstword $(MAKEFILE_LIST)))")
SCRIPT_DIR_NAME:=$(shell basename $(SCRIPT_DIR))

## AWS commands
deploy_task:: 
authenticate::
	aws ecr get-login-password --region ${REGION} | docker login --username AWS --password-stdin ${ECR}

deploy_task:: authenticate
	@# Only update the task
	ecs-deploy -d ${TASK_NAME} -i ${REMOTE_IMAGE}

deploy_service:: authenticate
	@# this will update the task and service with a blue green deployment
	# ecs-deploy ${CLUSTER_NAME} ${SERVICE_NAME} -i ${REMOTE_IMAGE} --use-latest-task-def 
	ecs deploy --sleep-time=20 --timeout=1500 chatbot-cluster chatbot-service

build:: 
	sh scripts/stage_docker.sh 
	docker compose -f compose.yml --verbose build 
	
buildenter:: build enter
	@# #do nothing

buildpush:: build push
	@# #do nothing

buildpush_deploy:: build push deploy_service
	@# #do nothing

enter::
	docker run --memory="4g" -i -p 8081:8081 -t ${LOCAL_IMAGE} /bin/bash

up:: 
	docker compose up --build

push:: authenticate
	docker tag ${LOCAL_IMAGE}:${LOCAL_TAG} ${REMOTE_IMAGE}:${REMOTE_TAG}
	docker push ${REMOTE_IMAGE}:${REMOTE_TAG}



## Testing Commands
heartbeat::
	curl -s -f http://${IP}:8081/heartbeat | jq .

LEVEL?=debug
loglevel::
	curl -H 'Content-Type: application/json' -d \
		'{"token" : "${TOKEN}"}' \
		http://${IP}:8081/set_loglevel/${LEVEL} | jq .

list_collections::
	curl -s -H 'Content-Type: application/json' http://${CHROMA_IP}:8000/api/v1/collections | jq .

config:: 
	curl  -H 'Content-Type: application/json' -d \
		'{ \
			"token": "${TOKEN}" \
		}' \
		http://${IP}:8081/config

CQUERY?="get me a list of companies in Alaska and send the head of sales a email"
campaign:: 
	set -o pipefail ; \
	curl -H 'Content-Type: application/json' -d \
		'{ \
			"company_id": "efeb8b38-7d7f-44c5-8ae8-e1121631340c", \
			"user_id": "1", \
			"query": ${CQUERY}, \
			"mock": 0, \
			"uploaded_data": [\
				{ "name": "John Doe", "email": "johndoe@gmail.com", "phone_number": "1234567890" }, \
				{ "name": "Vashun Doe", "email": "vashdoe@gmail.com", "phone_number": "1234567890" } \
				], \
			"sender_company": { \
				"name": "My company", \
				"website_url": "http://example.com", \
				"industry": " [Optional] industry of the company", \
				"_comment": "other params, as many as you want can be specified under sender_company" \
			}, \
			"sender_person": { \
				"name": "First and Last", \
				"email": "person@example.com email of the person", \
				"title": "job title of the person", \
				"_comment": "other params, as many as you want can be specified under sender_company" \
			}, \
			"verbose_return": 1, \
			"token": "" \
		}' \
		http://${IP}:8081/campaign | jq .


# Test Project
test:: 
	python -m unittest discover tests

# Build the project
.build:: 
	poetry install --with dev
	toml-sort pyproject.toml
	poetry build

# Publish the project
publish:: .build
	poetry publish

PROJECTS := $(notdir $(wildcard qai/*))

