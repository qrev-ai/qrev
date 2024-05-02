# QAI-Server

QAI-Server is a Docker-based application designed to be a web interface for other projects inside of QRev.

## Features

- Dockerized application for consistency and portability
- Campaign management
- Provides RESTful API endpoints for various tasks

## Requirements

- Python 3.11
- Docker
- Poetry

## Getting Started

Clone the Repository

```bash
git clone https://github.com/qrev-ai/qrev.git
```

Go to the project folder

```bash
cd qrev/ai/projects/server
```

## Setting up the .env file and config.toml file
For the .env file you can see the example placed in `examples/example.env`

### Build and Run with Docker

Ensure that Docker is installed and running. Then, use the provided Makefile to build and run the project:

1. **Build the Docker Image**

   ```bash
   make build
   ```

2. **Run the Application**

   ```bash
   make up
   ```

   The application should be running on [http://localhost:8081](http://localhost:8081).

### Run Unit Tests

Run the project's unit tests using the Makefile:

```bash
make test
```

## Makefile Commands

- `make test`: Run all unit tests.
- `make .build`: Build the project using Poetry.
- `make publish`: Publish the project after building it.
- `make heartbeat`: Check if the server is alive.
- `make loglevel`: Set the server's log level.
- `make list_collections`: List all collections from the Chroma API.
- `make campaign`: Send a campaign query to the server.

### AWS Commands

- `make authenticate`: Authenticate to the AWS ECR.
- `make deploy_service`: Deploy the service to an AWS ECS cluster.

