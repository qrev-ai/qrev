include .env
BUILD_TIME = $()

## Docker Variables, defined in the .env file
# LOCAL_IMAGE, REMOTE_IMAGE
LOCAL_TAG?=latest
REMOTE_TAG?=${LOCAL_TAG}
LOCAL_IMAGE_MEMORY?=4g

## AWS Variables, defined in the .env file 
# CLUSTER_NAME, SERVICE_NAME, TASK_NAME, ECR, REGION

### Docker build environment variables
export COMPOSE_DOCKER_CLI_BUILD=1
export DOCKER_BUILDKIT=1
export DOCKER_DEFAULT_PLATFORM=linux/amd64

# Server IP
IP?=${SERVER_IP}
CHROMA_IP?=${CHROMA_IP}

SCRIPT_DIR:=$(shell dirname "$(realpath $(firstword $(MAKEFILE_LIST)))")
SCRIPT_DIR_NAME:=$(shell basename $(SCRIPT_DIR))


## Test Project
test:: 
	pytest tests/*test_*.py

## Build the project
.build:: test
	poetry install --with dev
	toml-sort pyproject.toml
	poetry build

## Publish the project
publish:: .build
	poetry publish


## Testing the Server Commands
test_heartbeat::
	curl -s -f http://${IP}:8081/heartbeat | jq .

LEVEL?=debug
test_version::
	curl -H 'Content-Type: application/json' -d \
		'{"token" : "${TOKEN}"}' \
		http://${IP}:8081/system/version

LEVEL?=debug
test_loglevel::
	curl -H 'Content-Type: application/json' -d \
		'{"token" : "${TOKEN}"}' \
		http://${IP}:8081/set_loglevel/${LEVEL} | jq .

test_list_collections::
	curl -s -H 'Content-Type: application/json' http://${CHROMA_IP}:8000/api/v1/collections & jq .

CQUERY?="get me a list of companies in Alaska and send the head of sales a email"
test_campaign:: 
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
			"token": "${TOKEN}" \
		}' \
		http://${IP}:8081/campaign | jq .


## AWS commands
authenticate::
	aws ecr get-login-password --region ${REGION} | docker login --username AWS --password-stdin ${ECR}

deploy_service:: authenticate
	@# this will update the task and service with a blue green deployment
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
	docker run --memory="${LOCAL_IMAGE_MEMORY}" -i -p 8081:8081 -t ${LOCAL_IMAGE} /bin/bash

up:: 
	docker compose up --build

push:: authenticate
	docker tag ${LOCAL_IMAGE}:${LOCAL_TAG} ${REMOTE_IMAGE}:${REMOTE_TAG}
	docker push ${REMOTE_IMAGE}:${REMOTE_TAG}
