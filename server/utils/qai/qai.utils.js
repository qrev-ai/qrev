import axios from "axios";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { functionWrapper } from "../../std/wrappers.js";
import CustomError from "../../std/custom.error.js";
import { logger } from "../../logger.js";
import { QaiConversation } from "../../models/qai/qai.conversations.model.js";
import * as UserUtils from "../user/user.utils.js";
import * as CampaignUtils from "../campaign/campaign.utils.js";
import * as OpenAiUtils from "../ai/openai.utils.js";
import FormData from "form-data";

const fileName = "QAi Utils";

const NEW_CONVERSATION_TITLE = "New chat";

const StandardErrorResponse = {
    actions: [
        {
            action: "text",
            response: "Sorry, could not find any results",
        },
    ],
};

/*
! disabling previous version of converse function
async function _converse(
    {
        query,
        accountId,
        userId,
        uploadedData,
        conversationInfo,
        accountInfo,
        userInfo,
        campaignConfig,
        isDemoConversation,
    },
    { txid, logg, funcName }
) {
    logg.info(`started`);

    let url = process.env.AI_BOT_SERVER_URL;
    let token = process.env.AI_BOT_SERVER_TOKEN;
    let asyncUrl =
        process.env.SERVER_URL_PATH + "/api/campaign/update_sequence_messages";

    conversationInfo = formatConversationInfo({ conversationInfo }, { txid });
    let senderCompany = formatCompanyInfo({ accountInfo }, { txid });
    let senderPerson = formatUserInfo({ userInfo }, { txid });

    let [defaultConfigs, dConfigsErr] = await CampaignUtils.getCampaignDefaults(
        { accountId, setDefaultIfNotFound: true },
        { txid }
    );
    if (dConfigsErr) throw dConfigsErr;

    let data = {
        query,
        company_id: accountId,
        user_id: userId,
        token,
        asynchronous: asyncUrl,
        conversation: conversationInfo,
        sender_company: senderCompany,
        sender_person: senderPerson,
        default_configurations: defaultConfigs,
        is_demo_conversation: isDemoConversation ? true : false,
    };

    let fieldsFromConfigDoc = formatFieldsFromCampaignConfigDoc(
        { campaignConfig },
        { txid }
    );
    if (fieldsFromConfigDoc) {
        data = { ...data, ...fieldsFromConfigDoc };
    }

    logg.info(`inp-data: ${JSON.stringify(data)}`);
    if (uploadedData && uploadedData.values && uploadedData.values.length > 0) {
        data.uploaded_data = uploadedData.values;
    }
    const instance = axios.create();
    instance.defaults.timeout = 99000;
    let resp = await instance.post(url, data);
    logg.info(`resp: ` + JSON.stringify(resp.data));

    let botOutput = resp.data;
    if (botOutput && botOutput.actions && botOutput.actions.length) {
        let actions = botOutput.actions;
        for (const a of actions) {
            if (a.type === "email_sequence_draft") {
                if (!a.content && a.body) {
                    // Set title to simple text to provide a intro to the draft.
                    // Ideally this should be handled by the AI server (or bot server)
                    a.title = "Here is the campaign draft:";
                }
            }
        }
    }

    logg.info(`ended`);
    return [botOutput, null];
}
*/

/*
 * New version of converse function
 * This doesn't support entire workflow of Qai bot yet.
 * It just creates the campaign when user has uploaded csv
 * WHY: We are building new version AI server. We haven't added all the features yet. It doesnt have support of understanding user query and then create a campaign.
 */
async function _converse(
    {
        query,
        accountId,
        userId,
        uploadedData,
        uploadedCsvFilePath,
        conversationInfo,
        accountInfo,
        userInfo,
        campaignConfig,
        isDemoConversation,
        conversationId,
    },
    { txid, logg, funcName }
) {
    logg.info(`started`);

    let [actionsToBeDone, aiServerErr] = await callAiServerQueryInterpreterApi(
        { userQuery: query },
        { txid, logg, funcName }
    );
    if (aiServerErr) throw aiServerErr;

    let actionToBeDone = actionsToBeDone[0];
    if (actionToBeDone.action_type !== "generate_campaign") {
        throw new CustomError(
            `Expected action_type to be generate_campaign, but got ${actionToBeDone.action_type}`,
            fileName,
            funcName
        );
    }

    let aiServerToken = process.env.AI_BOT_SERVER_TOKEN;

    let senderCompany = formatCompanyInfo({ accountInfo }, { txid });
    let senderPerson = formatUserInfo({ userInfo }, { txid });

    let sequenceId = uuidv4();

    let asyncUrl =
        "/api/campaign/update_sequence_messages?type=sequence_step_personalized_messages&secretKey=" +
        aiServerToken +
        "&sequence_id=" +
        sequenceId;
    if (process.env.ENVIRONMENT_TYPE === "dev") {
        asyncUrl = "http://localhost:8080" + asyncUrl;
    } else {
        asyncUrl = process.env.SERVER_URL_PATH + asyncUrl;
    }

    let sequenceName = actionToBeDone.parameters.campaign_name;
    let steps = campaignConfig.sequence_steps_template.map((x) => {
        x.id = uuidv4();
        return x;
    });

    let sequenceDetails = {
        id: sequenceId,
        name: sequenceName,
        steps: steps,
    };

    let [campaignSetupResp, campaignSetupErr] =
        await CampaignUtils.setupCampaignFromQai(
            {
                sequenceDetails,
                accountId,
                userId,
                userQuery: query,
                conversationId,
                uploadedData,
            },
            { txid }
        );
    if (campaignSetupErr) throw campaignSetupErr;

    if (!(uploadedCsvFilePath && uploadedData)) {
        logg.info(`uploadedCsvFilePath or uploadedData not found`);
        let csvUploadErrResp = {
            actions: [
                {
                    action: "text",
                    response:
                        "Sorry, I was not able to understand the query. Please upload a CSV file to create a campaign.",
                },
            ],
        };
        return [csvUploadErrResp, null];
    }

    let linkedinJsessionId = process.env.LINKEDIN_JSESSION_ID;
    let linkedinLiAt = process.env.LINKEDIN_LI_AT;

    let brandDoc =
        campaignConfig && campaignConfig.brand_doc
            ? campaignConfig.brand_doc
            : {};
    let painPoints =
        campaignConfig && campaignConfig.pain_points
            ? campaignConfig.pain_points
            : [];

    let { requirementRules, messageTemplates, numSteps } =
        getCampaignRequirementsAndMessageTemplates(
            {
                accountId,
                sequenceSteps: steps,
            },
            { txid }
        );

    let aiServerApiBody = {
        async_url: asyncUrl,
        secret_key: aiServerToken,
        jobs: [
            {
                type: "email_validation",
                value: {
                    service_name: "million_verifier", // this is static, since this is the only one we are supporting currently
                    exclude_bad_email_id: true,
                    exclude_risky_email_id: true,
                },
            },
            {
                type: "linkedin_enrichment",
                value: {
                    jsession_id: linkedinJsessionId,
                    li_at: linkedinLiAt,
                },
            },
            {
                type: "message_generation",
                value: {
                    user_query: query,
                    sequence_id: sequenceId,
                    num_steps: numSteps,
                    sender_info: senderPerson,
                    sender_company: senderCompany,
                    brand_info: brandDoc,
                    pain_points: painPoints,
                    message_templates: messageTemplates,
                    requirements: requirementRules,
                },
            },
        ],
    };

    logg.info(`aiServerApiBody: ${JSON.stringify(aiServerApiBody)}`);
    let [resp, aiCallErr] = await callAiServerCampaignJobsApi(
        { jsonBody: aiServerApiBody, filePath: uploadedCsvFilePath },
        { txid }
    );
    if (aiCallErr) throw aiCallErr;

    let botResp = {
        actions: [
            {
                type: "list", // same as before
                title: "Here are the prospects that have been added to your campaign:",
                values: uploadedData,
            },
            {
                action: "text",
                response:
                    "QAi has successfully created your campaign as requested.",
            },
            {
                type: "email_sequence_draft",
                sequence: sequenceDetails,
            },
        ],
    };

    logg.info(`ended`);
    return [botResp, null];
}

export const converse = functionWrapper(fileName, "converse", _converse);

async function _callAiServerCampaignJobsApi(
    { jsonBody, filePath },
    { txid, logg, funcName }
) {
    logg.info(`started`);

    const aiServerPath = process.env.AI_BOT_SERVER_URL;
    if (!aiServerPath) {
        throw new CustomError(
            `AI_BOT_SERVER_URL is not set in environment variables`,
            fileName,
            funcName
        );
    }
    if (!filePath) {
        throw new CustomError(`filePath is required`, fileName, funcName);
    }
    if (!jsonBody) {
        throw new CustomError(`jsonBody is required`, fileName, funcName);
    }

    let aiServerUrl =
        aiServerPath +
        "/flaskapi/email_validation_enrichment_generation/upload";

    logg.info(`aiServerUrl: ${aiServerUrl}`);

    const formData = new FormData();

    // Add the file to form data
    formData.append("file", fs.createReadStream(filePath));

    // Add the JSON data
    formData.append("json_data", JSON.stringify(jsonBody));

    let headers = { headers: { ...formData.getHeaders() } };

    // Make the POST request
    const resp = await axios.post(aiServerUrl, formData, headers);
    logg.info(`resp: ${JSON.stringify(resp.data)}`);
    logg.info(`ended`);
    return [resp.data, null];
}
export const callAiServerCampaignJobsApi = functionWrapper(
    fileName,
    "callAiServerCampaignJobsApi",
    _callAiServerCampaignJobsApi
);

/*
    Response structure:
    [
        {
            "action_type": "generate_campaign",
            "parameters": {
                "campaign_name": "New campaign"
            }
        }
    ]

*/
async function _callAiServerQueryInterpreterApi(
    { userQuery, campaignCreationDatetime = new Date() },
    { txid, logg, funcName }
) {
    logg.info(`started`);

    let serverUrl =
        process.env.AI_BOT_SERVER_URL + "/flaskapi/query_interpreter";
    let token = process.env.AI_BOT_SERVER_TOKEN;
    let data = {
        user_query: userQuery,
        secret_key: token,
        campaign_creation_datetime: campaignCreationDatetime.toISOString(),
    };
    let resp = await axios.post(serverUrl, data);
    logg.info(`resp: ${JSON.stringify(resp.data)}`);
    let actions = resp.data.actions;
    logg.info(`ended`);
    return [actions, null];
}
export const callAiServerQueryInterpreterApi = functionWrapper(
    fileName,
    "callAiServerQueryInterpreterApi",
    _callAiServerQueryInterpreterApi
);

export function isCampaignCreatedInAIResponse(
    { botResp, accountId, userId },
    { txid }
) {
    const funcName = "isCampaignCreatedInAIResponse";
    const logg = logger.child({ txid, funcName });
    logg.info(`started`);

    let actions = botResp && botResp.actions ? botResp.actions : [];
    let sequence = null;
    for (const a of actions) {
        if (a.type === "email_sequence_draft") {
            sequence = a.sequence;
            if (sequence) {
                logg.info(`campaign action found`);
                break;
            }
        }
    }

    logg.info(`ended`);
    return sequence;
}

function formatConversationInfo({ conversationInfo }, { txid }) {
    const funcName = "formatConversationInfo";
    const logg = logger.child({ txid, funcName });
    logg.info(`started`);

    if (!conversationInfo) {
        logg.info(`conversationInfo not found. So returning null`);
        return null;
    }

    if (!conversationInfo._id) {
        logg.info(`conversationInfo._id not found. So returning null`);
        return null;
    }

    let result = {
        conversation_id: conversationInfo._id,
    };

    let messages = [];

    let conversationMessages = conversationInfo.messages || [];

    for (const cm of conversationMessages) {
        // role can be either "user" or "assistant"
        let role = "";
        let content = "";

        if (cm.type === "user") {
            role = "user";
            content = cm.value;
        } else {
            role = "assistant";
            let actions = cm.value && cm.value.actions ? cm.value.actions : [];

            for (const a of actions) {
                if (a.type === "text") {
                    logg.info(`a: ${JSON.stringify(a)}`);
                    content = a.response;
                    break;
                }
            }
        }

        if (!content) {
            continue;
        }

        let item = { role, content };

        messages.push(item);
    }

    result.messages = messages;

    logg.info(`ended`);
    return result;
}

function formatCompanyInfo({ accountInfo }, { txid }) {
    const funcName = "formatCompanyInfo";

    const logg = logger.child({ txid, funcName });

    logg.info(`started`);

    if (!accountInfo) {
        logg.info(`accountInfo not found. So returning null`);

        return null;
    }

    let name = accountInfo && accountInfo.name ? accountInfo.name : "";

    let domain = accountInfo && accountInfo.domain ? accountInfo.domain : "";

    let result = { name: "", description: "", website: "", industry: "" };

    if (name) {
        result.name = name;
    }
    if (domain) {
        result.website = domain;
    }

    logg.info(`ended`);

    return result;
}

function formatUserInfo({ userInfo }, { txid }) {
    const funcName = "formatUserInfo";

    const logg = logger.child({ txid, funcName });

    logg.info(`started`);

    if (!userInfo) {
        logg.info(`userInfo not found. So returning null`);

        return null;
    }

    let name = userInfo.name || "";

    let email = userInfo.email || "";

    if (!name && email) {
        //split email to get name

        let emailParts = email.split("@");

        if (emailParts.length > 0) {
            name = emailParts[0];
        }
    }

    let result = { name: "", email: "", title: "", company: "" };

    if (name) {
        result.name = name;
    }
    if (email) {
        result.email = email;
    }

    logg.info(`ended`);

    return result;
}

function formatFieldsFromCampaignConfigDoc({ campaignConfig }, { txid }) {
    const funcName = "formatFieldsFromCampaignConfigDoc";

    const logg = logger.child({ txid, funcName });

    logg.info(`started`);

    if (!campaignConfig) {
        logg.info(`campaignConfig not found. So not returning any fields`);
        return {};
    }

    let sequenceStepsTemplate =
        campaignConfig && campaignConfig.sequence_steps_template;
    let resourceDocuments = campaignConfig && campaignConfig.resource_documents;
    let excludeDomains = campaignConfig && campaignConfig.exclude_domains;

    let result = {
        default_configurations: {},
        sender_resource_documents: [],
    };
    if (sequenceStepsTemplate && sequenceStepsTemplate.length) {
        result.default_configurations.sequence_steps_template =
            sequenceStepsTemplate;
    }
    if (excludeDomains && excludeDomains.length) {
        result.default_configurations.exclude_domains = excludeDomains;
    }
    if (resourceDocuments && resourceDocuments.length) {
        result.sender_resource_documents = resourceDocuments;
    }

    logg.info(`ended`);
    return result;
}

async function _createConversation(
    { accountId, userId },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    let conversationDoc = {
        _id: uuidv4(),
        account: accountId,
        owner: userId,
        title: NEW_CONVERSATION_TITLE,
        messages: [],
    };

    let conversation = new QaiConversation(conversationDoc);
    let conversationResp = await conversation.save();
    logg.info(`conversationResp: ${JSON.stringify(conversationResp)}`);

    logg.info(`ended`);
    return [conversationDoc, null];
}

export const createConversation = functionWrapper(
    fileName,
    "_createConversation",
    _createConversation
);

async function _getConversations(
    { accountId, userId, sortByLatest },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    let conversations = null;
    let queryObj = {
        account: accountId,
        // owner: userId,
    };
    if (sortByLatest) {
        conversations = await QaiConversation.find(queryObj)
            .sort({ updated_on: -1 })
            .lean();
    } else {
        conversations = await QaiConversation.find(queryObj).lean();
    }
    logg.info(`conversations.length: ${conversations.length}`);

    logg.info(`ended`);
    return [conversations, null];
}

export const getConversations = functionWrapper(
    fileName,
    "getConversations",
    _getConversations
);

async function _getConversation(
    {
        accountId,
        userId,
        conversationId,
        getAccountAndUserInfo,
        updateTitleUsingAiIfNotDone = false,
    },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    let queryObj = { _id: conversationId, account: accountId };
    let conversation = null;
    if (getAccountAndUserInfo) {
        let conversationPromise = QaiConversation.findOne(queryObj)
            .populate("account")
            .lean();

        let userInfoPromise = UserUtils.getUserById({ id: userId }, { txid });

        let [conversationResp, userInfoResp] = await Promise.all([
            conversationPromise,
            userInfoPromise,
        ]);
        conversation = conversationResp;

        if (updateTitleUsingAiIfNotDone) {
            let [updateTitleResp, updateTitleErr] =
                await updateTitleUsingAiIfNotDone(
                    {
                        accountId,
                        userId,
                        conversationId,
                        conversation,
                    },
                    { txid, sendErrorMsg: true }
                );
            if (updateTitleErr) {
                throw updateTitleErr;
            }
        }

        let [userInfo, userInfoErr] = userInfoResp;
        if (userInfoErr) {
            throw userInfoErr;
        }

        let accountInfo = conversation.account;
        // remove the account field from the conversation object
        delete conversation.account;
        let conversationInfo = conversation;

        logg.info(`conversationInfo: ${JSON.stringify(conversationInfo)}`);
        logg.info(`accountInfo: ${JSON.stringify(accountInfo)}`);
        logg.info(`userInfo: ${JSON.stringify(userInfo)}`);

        logg.info(`ended`);
        return [{ conversationInfo, accountInfo, userInfo }, null];
    } else {
        conversation = await QaiConversation.findOne(queryObj).lean();
        logg.info(`conversation: ${JSON.stringify(conversation)}`);

        if (updateTitleUsingAiIfNotDone) {
            let [newTitle, updateTitleErr] =
                await updateTitleUsingAiSummaryIfNotDone(
                    {
                        accountId,
                        userId,
                        conversationId,
                        conversation,
                    },
                    { txid, sendErrorMsg: true }
                );
            if (updateTitleErr) {
                throw updateTitleErr;
            }
            if (newTitle) {
                conversation.title = newTitle;
            }
        }

        logg.info(`ended`);
        return [conversation, null];
    }
}

export const getConversation = functionWrapper(
    fileName,
    "_getConversation",
    _getConversation
);

async function _updateTitleUsingAiSummaryIfNotDone(
    { accountId, userId, conversationId, conversation },
    { txid, sendErrorMsg }
) {
    const funcName = "updateTitleUsingAiSummaryIfNotDone";
    const logg = logger.child({ txid, funcName });
    logg.info(`started`);

    let title = conversation && conversation.title ? conversation.title : "";

    if (title !== NEW_CONVERSATION_TITLE) {
        logg.info(
            `query is not "${NEW_CONVERSATION_TITLE}". So not updating title`
        );
        return [true, null];
    }

    let query =
        conversation && conversation.messages.length
            ? conversation.messages[0].value
            : "";

    if (!query) {
        logg.info(`query not found. So not updating title`);
        return [true, null];
    }

    logg.info(`query: ${query}`);
    let [summary, openAiError] = await OpenAiUtils.queryGpt40Mini(
        {
            query: `Summarize the following query for an AI bot in 6 words or less: \n${query}\n\n Do not add any full stop or other symbolsat the end of the summary.`,
        },
        { txid, sendErrorMsg: true }
    );

    let updateObj = {};
    if (openAiError) {
        logg.error(`Error in OpenAI: ${openAiError}`);
        logg.error(`so setting title to query`);
        updateObj.title = query;
    } else {
        updateObj.title = summary;
    }

    let conversationQuery = { _id: conversationId, account: accountId };
    let conversationResp = await QaiConversation.updateOne(
        conversationQuery,
        updateObj
    );
    logg.info(`conversationResp: ${JSON.stringify(conversationResp)}`);

    logg.info(`ended`);
    return [summary, null];
}

export const updateTitleUsingAiSummaryIfNotDone = functionWrapper(
    fileName,
    "updateTitleUsingAiSummaryIfNotDone",
    _updateTitleUsingAiSummaryIfNotDone
);

async function _addUserQueryToConversation(
    { query, accountId, userId, conversationId, uploadedData, conversation },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    let conversationQuery = { _id: conversationId, account: accountId };
    if (!conversation) {
        conversation = await QaiConversation.findOne(conversationQuery).lean();
        logg.info(`conversation: ${JSON.stringify(conversation)}`);
    }
    if (!conversation) {
        throw `Conversation not found for ${conversationId}`;
    }

    let messageId = uuidv4();
    let messageObj = {
        message_id: messageId,
        type: "user",
        value: query,
        created_on: new Date(),
        user: userId,
    };
    if (uploadedData && uploadedData.file_name) {
        messageObj.uploaded_file = uploadedData.file_name;
    }
    if (uploadedData && uploadedData.values) {
        messageObj.uploaded_data = uploadedData.values;
    }
    let updateObj = { $push: { messages: messageObj } };
    if (!conversation.messages || conversation.messages.length === 0) {
        // updateObj.$set = { title: query };
    }

    // also update the field `updated_on` in the conversation
    if (!updateObj.$set) {
        updateObj.$set = {};
    }
    updateObj.$set.updated_on = new Date();

    let conversationResp = await QaiConversation.updateOne(
        conversationQuery,
        updateObj
    );
    logg.info(`conversationResp: ${JSON.stringify(conversationResp)}`);

    logg.info(`ended`);
    return [messageId, null];
}

export const addUserQueryToConversation = functionWrapper(
    fileName,
    "_addUserQueryToConversation",
    _addUserQueryToConversation
);

async function _addQaiResponseToConversation(
    { response, accountId, userId, conversationId, isError, conversation },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    let conversationQuery = { _id: conversationId, account: accountId };
    if (!conversation) {
        conversation = await QaiConversation.findOne(conversationQuery).lean();
        logg.info(`conversation: ${JSON.stringify(conversation)}`);
    }

    if (!conversation) {
        throw `Conversation not found for ${conversationId}`;
    }

    let messageId = uuidv4();
    let messageObj = null;
    if (isError) {
        messageObj = {
            message_id: messageId,
            type: "bot",
            value: StandardErrorResponse,
            created_on: new Date(),
        };
    } else {
        messageObj = {
            message_id: messageId,
            type: "bot",
            value: response,
            created_on: new Date(),
        };
    }
    let updateObj = {
        $push: {
            messages: messageObj,
        },
    };

    // also update the field `updated_on` in the conversation
    if (!updateObj.$set) {
        updateObj.$set = {};
    }
    updateObj.$set.updated_on = new Date();

    let conversationResp = await QaiConversation.updateOne(
        conversationQuery,
        updateObj
    );
    logg.info(`conversationResp: ${JSON.stringify(conversationResp)}`);

    logg.info(`ended`);

    return [messageObj.value, null];
}

export const addQaiResponseToConversation = functionWrapper(
    fileName,
    "addQaiResponseToConversation",
    _addQaiResponseToConversation
);

async function _deleteConversation(
    { accountId, userId, conversationId },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    let conversationQuery = { _id: conversationId, account: accountId };
    let conversation = await QaiConversation.findOne(conversationQuery).lean();
    logg.info(`conversation: ${JSON.stringify(conversation)}`);
    if (!conversation) {
        throw `Conversation not found for ${conversationId}`;
    }

    let conversationResp = await QaiConversation.deleteOne(conversationQuery);
    logg.info(`conversationResp: ${JSON.stringify(conversationResp)}`);

    logg.info(`ended`);
    return [true, null];
}

export const deleteConversation = functionWrapper(
    fileName,
    "_deleteConversation",
    _deleteConversation
);

/*
 * Added on 2nd Jan 2025
 * When a QRev user opens the QDA front end app, we have designed UI such that in Qai bot, they will see any updates as a separate chat item.
 * This will let user know of any updates in Campaign Replies, Upcoming Meeting Battle Cards, New Qualified Leads.
 * So we need to fetch the count of above mentioned items and return it to the user.
 * Note: Currently we have only implemented Campaign Replies. Others need to be implemented later.
 * 
 * Sample response:
[
    {
        type: "email_replies_and_suggested_drafts",
        value: {
            count: 5,
        },
    },
    {
        type: "demo_calls",
        value: {
            count: 5,
        },
    },
    {
        type: "new_prospects",
        value: {
            count: 20,
        },
    },
]
 */
async function _getReviewUpdates(
    { accountId, userId },
    { txid, logg, funcName }
) {
    logg.info(`started`);

    let [emailRepliesCount, emailRepliesErr] =
        await CampaignUtils.getEmailRepliesCount(
            { accountId, userId },
            { txid }
        );
    if (emailRepliesErr) {
        throw emailRepliesErr;
    }

    if (!emailRepliesCount) {
        emailRepliesCount = 0;
    }
    let demoCallsCount = 0; // * Since we have not implemented demo calls yet, so setting it to 0
    let newProspectsCount = 20; // * We have a demo version of this feature, so setting it to a random static number 20.

    let result = [
        {
            type: "email_replies_and_suggested_drafts",
            value: { count: emailRepliesCount },
        },
        {
            type: "demo_calls",
            value: { count: demoCallsCount },
        },
        {
            type: "new_prospects",
            value: { count: newProspectsCount },
        },
    ];

    logg.info(`result: ${JSON.stringify(result)}`);
    logg.info(`ended`);
    return [result, null];
}

export const getReviewUpdates = functionWrapper(
    fileName,
    "_getReviewUpdates",
    _getReviewUpdates
);

function getCampaignRequirementsAndMessageTemplates(
    { accountId, sequenceSteps },
    { txid }
) {
    const requirementRules = [
        "Do Not Use Templates Verbatim: Use existing templates as a reference but generate personalized content for each recipient. Be creative.",
        "Craft subject lines that are specific, compelling, and highlight a clear benefit or pain point relevant to the recipient. Keep them concise, ideally under 7 words.",
        "Do not include your company name or overly promotional terms in the subject line.",
        "For the follow up messages, do not include 'Re: ' in the subject line.",
        "Incorporate specific details about the recipient's company, role, industry trends or needs to demonstrate genuine interest and understanding to show you've done your research.",
        "Address issues directly related to their responsibilities and known challenges.",
        "Position yourself as a partner looking to help solve their problems, not just sell a product or service.",
        "Use personal pronouns (you, your, your team) to create a personalized feel.",
        "Keep the language approachable while remaining professional.",
        "Use clear and straightforward language.",
        "Limit the message to essential information that captures interest. Aim for brevity without sacrificing personalization.",
        "Keep it concise, 2-3 short sentences, then the call to action.",
        "Focus on One Key Value Proposition: Avoid overwhelming the recipient with multiple offerings.",
        "Place Compelling Points Early: Mention the most compelling points in the first few sentences to capture attention.",
        "Avoid Generic Greetings: Do not use phrases like 'Hope this message finds you well.' Start with a personalized greeting using their name.",
        "Remove Placeholders: Eliminate any placeholders like [your contact info], [phone], etc.",
        "Make the CTA Clear and Simple: Encourage a low-commitment response that directly relates to the recipient's challenges or goals.",
        "Personalize the CTA Timing: Ask for their availability instead of suggesting a specific time.",
        "Make sure sender info mentioned below is accurate and included in the message.",
        "Make sure no phone number, linkedin url or any other sender contact is present. Only above sender info is allowed.",
        "Align with Brand Guidelines: Ensure the tone, messaging, and value proposition strictly adhere to the brand guidelines provided.",
        "Demonstrate Understanding: Show that you understand the recipient's challenges to build rapport and trust.",
        "Focus exclusively on the specific pain points (mentioned in json below) without introducing additional problems like cybersecurity, AI or security",
        "Utilize HTML to enhance readability— bold text for key phrases, and ensure mobile optimization.",
        "Make sure no markdown or richtext is used in the message.",
        "Build Credibility Briefly: Mention relevant success stories or expertise without overwhelming the recipient.",
        "Ask open-ended questions to encourage replies and make it easy for the recipient to respond.",
    ];
    const allEmailTemplates = [
        {
            type: "email",
            name: "Initial outreach",
            template:
                '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"></head><body><p>Hi [Recipient Name],</p><p>As the [Recipient Position] at [Recipient Company], you\'re likely focused on [specific pain point relevant to their role], especially regarding [related challenge]. At [Sender Company], we specialize in helping organizations like yours [specific benefit or outcome], leveraging our unique hybrid delivery model. This approach offers you [a unique selling point that correlates to recipient role, industry and company]].</p><p>Would you be open to a brief discussion about how we can support your goals?</p>[Sender Signature]</body></html>',
        },
        {
            type: "email",
            name: "Follow-up",
            template:
                '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"></head><body><p>Hi [Recipient Name],</p><p>I wanted to reach out again regarding the challenges many companies face in [specific challenges based on one pain point that aligns with recipient role or industry or company]. At [Sender Company], we have successfully helped similar organizations streamline their [relevant_area] operations, reducing costs through our proven model while improving overall efficiency.</p><p>Are there specific outcomes you\'re targeting that an optimized [relevant_area] could support?</p>[Sender Signature]</body></html>',
        },
        {
            type: "email",
            name: "Value proposition",
            template:
                '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"></head><body><p>Hi [Recipient Name],</p><p>I noticed your impressive work as [Recipient Position] at [Recipient Company]. We recently helped a similar company in [Recipient Industry] reduce their data processing time by [any relavant facts about Sender Company if applicable]. Given your experience in [Relevant Expertise], I believe we could deliver comparable results for [Recipient Company].</p><p>If you\'d be interested in discussing how we might replicate this success with your team, just let me know I\'d be happy to set up a quick call.</p>[Sender Signature]</body></html>',
        },
        {
            type: "email",
            name: "Case study highlight",
            template:
                '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"></head><body><p>Hi [Recipient Name],</p><p>Following our earlier conversation, I thought you might find it valuable to see a quick example of our work in action. We recently partnered with a company in [Recipient Industry] to tackle [key issue], resulting in [specific improvement or measurable metric]. By applying a similar approach, we could help [Recipient Company] achieve comparable gains.</p><p>Would you like me to share additional details about this case study or discuss how we might adapt these methods to your team?</p>[Sender Signature]</body></html>',
        },
        {
            type: "email",
            name: "Strategic alignment",
            template:
                '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"></head><body><p>Hi [Recipient Name],</p><p>I hope you’ve had a chance to review the results we discussed. It’s often beneficial at this stage to talk through strategic priorities in greater detail. Understanding your roadmap for [upcoming initiatives or relevant focus area] can help us align our solution precisely with your goals.</p><p>Would you be open to scheduling a short strategy session to explore potential collaboration opportunities and determine the best path forward?</p>[Sender Signature]</body></html>',
        },
        {
            type: "email",
            name: "Break-up",
            template:
                '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"></head><body><p>Hi [Recipient Name],</p><p>I know that your role as [Recipient Role] at [Recipient Company] keeps you engaged with a multitude of high-priority initiatives. Since we haven\'t connected yet, I wanted to reach out one last time before stepping back.</p><p>If you\'d like to discuss how [Sender Company] can support your goals, feel free to reach out at a time that suits you. We\'re here to help whenever the timing aligns.</p>[Sender Signature]</body></html>',
        },
    ];

    const LinkedinTemplate = {
        type: "linkedin_connect_request",
        name: "Linkedin connection request",
        template: `Hi [Recipient Name],
As the [Recipient Position] at [Recipient Company], I thought it would be valuable to connect. I’m with [Sender Company], where we help teams tackle [specific pain point] through [specific solution/approach].

Would love to connect and explore how we could support your goals.

[Sender Name]`,
    };

    let messageTemplates = [];

    if (!sequenceSteps || sequenceSteps.length === 0) {
        messageTemplates = [];
        return { requirementRules, messageTemplates };
    }

    let shouldAddLinkedinTemplate = false,
        isLinkedinTemplatePresent = false;
    // if there is 'type' as 'linkedin_connect_request' and 'should_have_ai_generated_message' is true, then add the linkedin template.
    for (let step of sequenceSteps) {
        if (
            step.type === "linkedin_connect_request" &&
            step.should_have_ai_generated_message
        ) {
            shouldAddLinkedinTemplate = true;
            break;
        } else if (step.type === "linkedin_connect_request") {
            isLinkedinTemplatePresent = true;
        }
    }

    const addEmailTemplateFunc = (seqSteps, allEmailTemplates) => {
        /*
        if numSteps is 6 or more, then return all email templates.
        if numSteps is 1, then return the first email template.
        if numSteps is 2, then return the first and last email templates.
        if numSteps is 3, then return the first two and last email templates.
        if numSteps is 4, then return the first three and last email templates.
        if numSteps is 5, then return the first four and last email templates.
        if numSteps is 0, then return empty array.
        */
        let numSteps = seqSteps.length;
        let messageTemplates = [];
        if (numSteps === 0) {
            messageTemplates = [];
        } else if (numSteps === 1) {
            let template = allEmailTemplates[0];
            template.id = seqSteps[0].id;
            messageTemplates = [template];
        } else if (numSteps === 2) {
            let template1 = allEmailTemplates[0];
            template1.id = seqSteps[0].id;
            let template2 = allEmailTemplates[5];
            template2.id = seqSteps[1].id;
            messageTemplates = [template1, template2];
        } else if (numSteps === 3) {
            let template1 = allEmailTemplates[0];
            template1.id = seqSteps[0].id;
            let template2 = allEmailTemplates[1];
            template2.id = seqSteps[1].id;
            let template3 = allEmailTemplates[5];
            template3.id = seqSteps[2].id;
            messageTemplates = [template1, template2, template3];
        } else if (numSteps === 4) {
            let template1 = allEmailTemplates[0];
            template1.id = seqSteps[0].id;
            let template2 = allEmailTemplates[1];
            template2.id = seqSteps[1].id;
            let template3 = allEmailTemplates[2];
            template3.id = seqSteps[2].id;
            let template4 = allEmailTemplates[5];
            template4.id = seqSteps[3].id;
            messageTemplates = [template1, template2, template3, template4];
        } else if (numSteps === 5) {
            let template1 = allEmailTemplates[0];
            template1.id = seqSteps[0].id;
            let template2 = allEmailTemplates[1];
            template2.id = seqSteps[1].id;
            let template3 = allEmailTemplates[2];
            template3.id = seqSteps[2].id;
            let template4 = allEmailTemplates[3];
            template4.id = seqSteps[3].id;
            let template5 = allEmailTemplates[5];
            template5.id = seqSteps[4].id;
            messageTemplates = [
                template1,
                template2,
                template3,
                template4,
                template5,
            ];
        } else {
            messageTemplates = allEmailTemplates;
        }
        return messageTemplates;
    };

    let numSteps = 0;
    if (!isLinkedinTemplatePresent) {
        messageTemplates = addEmailTemplateFunc(
            sequenceSteps,
            allEmailTemplates
        );
        numSteps = sequenceSteps.length;
    } else if (!shouldAddLinkedinTemplate) {
        let linkedinRemovedSteps = sequenceSteps.filter(
            (step) => step.type !== "linkedin_connect_request"
        );
        messageTemplates = addEmailTemplateFunc(
            linkedinRemovedSteps.length,
            allEmailTemplates
        );
        numSteps = sequenceSteps.length - 1;
    } else {
        let linkedinRemovedSteps = sequenceSteps.filter(
            (step) => step.type !== "linkedin_connect_request"
        );
        let emailTemplates = addEmailTemplateFunc(
            linkedinRemovedSteps.length,
            allEmailTemplates
        );
        let positionOfLinkedinTemplate = sequenceSteps.findIndex(
            (step) => step.type === "linkedin_connect_request"
        );
        // add the linkedin template at the position of the linkedin template in the emailTemplates array.
        let linkedinTemplate = LinkedinTemplate;
        linkedinTemplate.id = sequenceSteps[positionOfLinkedinTemplate].id;
        emailTemplates.splice(positionOfLinkedinTemplate, 0, linkedinTemplate);
        messageTemplates = emailTemplates;
        numSteps = sequenceSteps.length;
    }

    return { requirementRules, messageTemplates, numSteps };
}
