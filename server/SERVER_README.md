# Welcome to the Server side documention guide 

## Integrations

QRev supports a few Integrations, which will expand over time. 

####  GOOGLE: Creating Google Credentials for Signing in to QRev

1. Open [Google API Console](https://console.cloud.google.com/apis/dashboard). If you don't have a project in your Google Cloud subscription, you'll need to create one before proceeding further. Under Dashboard pane, select Enable APIS and Services.
2. Under Scopes, select the scope with scope value `https://www.googleapis.com/auth/gmail.send` and `https://www.googleapis.com/auth/gmail.readonly`.
3. In the third page (Test Users), add the Google account(s) you'll be using. Make sure the details are correct on the last page of the wizard and your consent screen will be configured.
4. Under `Credentials` section, create a `OAuth Client ID` credential with `Web Application` as the application type. Then add the following as the redirect URI: `<SERVER_URL_PATH>/api/google/auth/code/to/tokens`. If you are running on your local machine then `SERVER_URL_PATH` will be `http://localhost:8080`.
5. Now, copy the client ID and client secret and store it under `.env` as fields `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` respectively.

#### Zoom Integration

1. Open [Zoom Marketplace](https://marketplace.zoom.us/) and sign in with your Zoom account.
2. Under `Develop` build a `User-managed app` of `OAuth` type.
3. Make sure to de-select the option to publish the app on the Zoom App Marketplace.
4. Set the Redirect URL as `<SERVER_URL_PATH>/api/zoom/redirect` under `Production` (also add this URL under `OAuth Allow Lists`). If you are running on your local machine then `SERVER_URL_PATH` will be `http://localhost:8080`.
5. Now copy the Client ID and Client Secret for Production to your `.env` file as fields: `ZOOM_CLIENT_ID` and `ZOOM_CLIENT_SECRET`. Also, copy the Secret Token and Verification Token as fields: `ZOOM_SECRET_TOKEN` and `ZOOM_VERIFICATION_TOKEN`. These values will be useful to verify the event notifications sent by Zoom.

#### HubSpot Integration

1. Open [HubSpot Developer](https://developer.hubspot.com/) and sign into your account and then create a app.
2. Now copy the App ID, Client ID and Client Secret to your `.env` file as fields: `HUBSPOT_APP_ID`, `HUBSPOT_CLIENT_ID` and `HUBSPOT_CLIENT_SECRET`.
3. Set the Redirect URL for OAuth as `<SERVER_URL_PATH>/api/hubspot/redirect`.

#### Sendgrid Integration for Error Reporting (Optional)

> We currently use Sendgrid for error reporting whenever en error occurs in the backend server. So this is optional if you do not want to enable error reporting.

1. Create a SendGrid account (https://signup.sendgrid.com/)
2. Go to Settings -> API keys and create an API key.
3. Go to Settings -> Sender Authentication and verify a single sender.
4. Create a dynamic template with fields: `transaction_id`, `location`, `message`, `subject` and `message`.
5. Along with the API key, copy the dynamic template id that you just created into `.env` file as fields: `SENDGRID_API_KEY` and `SENDGRID_REPORT_ERROR_TEMPLATE_ID`. Also, set the `REPORT_FROM_EMAIL` field to the email that you verified in Step 3 in the `.env` file.
6. Add the two emails that you want to send the error messages as fields `PRIMARY_REPORT_EMAIL` and `SECONDARY_REPORT_EMAIL` in `.env` file.

## API Documentation

To help you understand the general purpose of the different types of APIs found in the'server/apis' folder, the following sections will provide detailed descriptions of them.

### [Google Auth](https://github.com/qrev-ai/qrev/tree/main/server/apis/google)

When the user opens the QRev app, they will be prompted to sign in with their Google account. This API is responsible for handling the OAuth flow and generating the access token and refresh token for the user.

### [Authentication](https://github.com/qrev-ai/qrev/tree/main/server/apis/auth)

These APIs is responsible for generating the access token and refresh token for the user after they have successfully signed in with their Google account. The access token is used to authenticate the user for the duration of the session, while the refresh token is used to generate a new access token when the current one expires.

### [User](https://github.com/qrev-ai/qrev/tree/main/server/apis/user)

User is the entity that interacts with the QRev app. User must belong to an account to be able to use the app. All resources in the app are associated with an account.
After authenticating the user, these APIs is responsible for handling all user-related operations, such as fetching the user's profile and fetching the different accounts associated with the user.

### [Account](https://github.com/qrev-ai/qrev/tree/main/server/apis/account)

Account is the entity that represents a organization. An account can have one or more users associated with it. All resources in QRev are associated with an account. Account is the top-level entity in the app which provides a workspace for the users to collaborate.

These APIs is responsible for handling all account-related operations, such as fetching the account details, creating a new account (if the user does not have one), inviting a user to an account, and removing a user from an account.

### [Team](https://github.com/qrev-ai/qrev/tree/main/server/apis/team)

Team is the entity that represents a group of users within an account. A team can have one or more users associated with it. Team is a sub-entity of an account which helps in organizing the users within an account. A user can be part of zero or more teams within an account.

These APIs is responsible for handling all team-related operations, such as fetching the team details, creating a new team, adding a user to a team, and removing a user from a team.

### [Integration](https://github.com/qrev-ai/qrev/tree/main/server/apis/integration)

Integration is the entity that represents a third-party service that can be integrated with QRev. There are 2 types of integrations available in QRev: User-level integration (Zoom) and Account-level integration (HubSpot). Currently, QRev only supports Zoom and HubSpot integrations. As of yet, we do not interact with these integrations directly, but we plan to do so in the future.

These APIs is responsible for handling all integration-related operations, such as handling the OAuth flow for the integrations and checking the status of the integration.

### [CRM](https://github.com/qrev-ai/qrev/tree/main/server/apis/crm)

CRM is the entity that represents a Customer Relationship Management system. QRev currently supports People (or Contact) entity in CRM. We plan to support Companies entity in CRM pretty soon.

These APIs is responsible for handling all CRM-related operations, such as fetching the people details and updating the people details.

### [QAI bot](https://github.com/qrev-ai/qrev/tree/main/server/apis/qai)

QAI bot is the entity that represents the AI bot in QRev. The AI bot is responsible for handling the user's queries about campaigns and start executing the campaigns created by QAI bot on the user's behalf.

These APIs is responsible for handling all QAI bot-related operations, such as creating a new conversation with the AI bot, fetching the conversation details, and sending a message to the AI bot.

### [Campaign Sequence](https://github.com/qrev-ai/qrev/tree/main/server/apis/campaign)

Campaign Sequence is the entity that represents a marketing campaign in QRev. A campaign sequence is a series of steps that are executed in a specific order to send messages to prospects that are part of the sequence.

These APIs is responsible for handling all campaign sequence-related operations, such as fetching all the existing campaign sequences and their performance metrics.


## Campaign Sequence Workflow using QAI bot

### Things involved in the workflow:
1. User: User is a human who is logged in to QRev who wants to generate campaign
2. Frontend Server: User communicates to QRev through the Frontend server.
    1. QAI bot: A text based AI agent in Frontend Server that user can communicate with, to create campaigns for them.
3. Backend Server: The Backend Server handle user requests sent by the Frontend server. It wll verify the user's access token for authenticaation purposes.
4. AI server: AI server uses LLMs to handle user query through requests sent by the Backend Server.

### Workflow:
1. User asks a query to create a campaign with QAi (the user will alsoupload CSV)
2. The Frontend Server calls the Backend server API with the access token of the user.
3. The Backend Server verifies the user's access token and if it succeeds then it will forward the request to the AI server.
4. The AI server will performm the following things:
   1. Parse the user query to a list of actions to be done 
   2. Generate a new sequence ID and store the prospect list in a Mongo collection. 
   3. AI server will asynchronously generate a message subject and message body for each prospect and store it in the Mongo collection and it will call a backend API notifying that message generation is complete.
   4. Return back the list of actions in the response.
5. After recieving response from AI server, it performs the following actions:
   1. Detect the sequence ID in the list of actions present in the response of AI server.
   2. Create/update People in the CRM.
   3. Create the sequence, sequence step, and sequence prospects.
   4. Return the list of actions back to the Frontend.
6. Frontend server will show the UI for list of actions to the user.
7. Once the user clicks on the "Send" button, the Backend Server will start assigning a time at which messages will be sent for each prospect in the sequence.