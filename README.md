# qrev

QRev is an Open Source alternative to Salesforce. If Salesforce were built today, 
starting with AI, it would be built with AI Agents at the foundation. 

> NOTE: QRev is under active development, and we are releasing an early version so that a strong Agentic foundation can be set. This repository will be updated regularly with changes and new releases.

## Prerequisites :point_down:

Before you get started, please make sure you have the following installed:

- An editor of your choice. For example, [Visual Studio Code (VS Code)](https://code.visualstudio.com/download)
- [Node.js](https://nodejs.org/en/download)
- [Git](https://git-scm.com/downloads)

## Getting started :rocket:

There's 3 main components to running the code 

- 🎨 [Client App](https://github.com/qrev-ai/qrev/tree/main/client)
- 🗂️ [App Server](https://github.com/qrev-ai/qrev/tree/main/server) 
- 🤖 [AI Server](https://github.com/qrev-ai/qrev/tree/main/ai) 

## Getting Started with the QRev App Server

To get a local copy up and running, please follow these simple steps.

### Prerequisites

Here is what you need to be able to run QRev.

-   Node.js (Version: >=18.18.0)
-   Mongo (Version: >=5.x)

    > If you want to enable any of the available integrations, you will have to obtain credentials for each one. More details on this can be found below under the [integrations section](#integrations).

### Setup

1. Clone the GitHub repo

    ```sh
    git clone https://github.com/qrev-ai/qrev.git
    ```

2. Go to the `server` folder

    ```sh
    cd server
    ```

3. Setup Node
   If your Node version does not meet the project's requirements as instructed by the docs, "nvm" (Node Version Manager) allows using Node at the version required by the project:

    ```sh
    nvm install v18.18.0
    ```

    ```sh
    nvm use 18.18.0
    ```

    > You can install nvm from [here](https://github.com/nvm-sh/nvm).

4. Install the packages with `npm`

    ```sh
    npm ci
    ```

    > `npm ci` makes sure that the versions of the packages installed will be from `package-lock.json`, this will make sure the right version of packages are installed.

5. Set up your `.env` file

    - Duplicate `.env.example` to `.env`
    - Use `openssl rand -base64 32` to generate a key and add this under `REFRESH_TOKEN_JWT_SECRET` in the `.env` file.
    - Use `openssl rand -base64 32` to generate a key and add this under `ACCESS_TOKEN_JWT_SECRET` in the `.env` file.
    - Use `openssl rand -base64 32` to generate a key and add this under `AI_BOT_SERVER_TOKEN` in the `.env` file and make sure the AI server uses the same token as well.

6. If you haven't already configured MongoDB and got the MONGO_DB_URL, then follow the steps [here](https://www.mongodb.com/docs/v3.0/tutorial/install-mongodb-on-ubuntu/) to install Mongo DB locally.

7. Run the below command to start the server:
    ```sh
    npm start
    ```

## Getting Started with the QRev App Client 

Make sure you have the right [Environment variables](https://github.com/qrev-ai/qrev/tree/main/client/.env.example)

These are referenced in the [Client Code](https://github.com/qrev-ai/qrev/tree/main/client/src/config/credential.js)

### Setup 

1. **Go to the `client` folder**
```bash
cd client 
```

2. **Install libraries**

```bash 
npm install
```

3. **Run the client** 

```bash  
npm start  
```

### Integrations

QRev supports a few Integrations, which will expand over time

Please refer the [Integrations README](https://github.com/qrev-ai/qrev/tree/main/server/INTEGRATIONS_README.md)
