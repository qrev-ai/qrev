<h1 align="center"> Welcome to QRev 👋</h1> 

<p align="center">
  <em>🤖 AI Agents to scale your Sales org infinitely; Open Source alternative to Salesforce 🤖   </em>
</p>

<h3 align="center">
	<a href="https://qrev.ai?utm_medium=community&utm_source=github&utm_campaign=qrev%20repo">Website</a>
	<span> | </span>
	<a href="https://join.slack.com/t/qrev/shared_invite/zt-2gsc6omvb-L5bLaBubluDEdK5ZB133dg">Community Slack</a>
</h3>

<div style="text-align: center;">
  <img
    width="1028"  
	style="display: block; margin-left: auto; margin-right: auto;"
    class="block dark:hidden"
    src="/images/Qai-Structure.png"
    alt="Architecture"
  />
</div>

<p align="center">
    <img alt="Node version" src="https://img.shields.io/static/v1?label=node&message=%20%3E=18%2E18&logo=node.js&color=2334D058" />
      <img src="https://img.shields.io/badge/lang-English-blue.svg" alt="English">
</p>

If Salesforce were built today, starting with AI, it would be built with AI Agents at the foundation. 

But Salesforce is too expensive, and hard to customise. 

> NOTE: QRev is under active development, and we are releasing an early version so that a strong Agentic foundation can be set with ideas from contributors like you. This repository will be updated regularly with changes and new releases.

## Digital Workers for each Sales Role or Superagent (a.k.a Qai )? 🤔

Sales orgs have people like SDR's, BDR's, Account Execs, Head of Sales etc. 

The question we ask ourselves constantly is whether we should mimic the real world and have Digital Worker equivalents 
within the app ? or Have one superagent that co-ordinates with other software agents internally. 

We are starting with the latter approach. We think based on the users role and role based permissions, Qai will be able 
to do different things. It will also simplify the requirement of remembering names of Digial workers like Qai 
just for the sake of seeming cool. But internally, there will be an army of digial workers / agents doing their job anyways. 

Open to ideas. 

## 🚀 Tech Stack

- ✅ **Framework**: [Typescript for frontend](https://www.typescriptlang.org/) & [NodeJS for backend](https://nodejs.org/en)
- ✅ **App Server Database**: [MongoDB](https://www.mongodb.com/).
- ✅ **Vector Database**: [ChromaDB](https://www.trychroma.com/).
- ✅ **AI Server Database**: [SQLite](https://www.sqlite.org/).
- ✅ **LLM Tooling**: [Langchain](https://github.com/hwchase17/langchain).

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

  > Please refer to the [sample People CSV file](https://github.com/qrev-ai/qrev/blob/main/qai_csv_sample.csv) for the structure of the CSV file that the user can upload to the QAI bot for generating campaigns.

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

3. Set up the `.env` file via following commands

    - Copy the example environment file:
      ```
      cp .env.example .env
      ```
    
    - Add your Google client id for the variable `REACT_APP_GOOGLE_CLIENT_ID`

    - Add your app backend server host url for `REACT_APP_BASE_API_URL`

    - Add your app backend server host url for `REACT_APP_BACKEND_HOST_URL`

    **Note**: Please make sure there is no `/` at the end of the URL environment values.

4. **To prevent any formatting issues in the code files, run the following**
```bash
git config --global core.autocrlf true
```

5. **Run the client** 

```bash  
npm start  
```

## Getting Started with the QRev AI Code
Please refer the [Server README](https://github.com/qrev-ai/qrev/tree/main/ai/README.md)

### Integrations

QRev supports a few Integrations, which will expand over time

Please refer the [Server README](https://github.com/qrev-ai/qrev/tree/main/server/SERVER_README.md)

<!-- CONTRIBUTORS -->

### Contributors

<a href="https://github.com/qrev-ai/qrev/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=qrev-ai/qrev" />
</a>
