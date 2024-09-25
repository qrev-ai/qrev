import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import { functionWrapper } from "../../std/wrappers.js";
import CustomError from "../../std/custom.error.js";
import { logger } from "../../logger.js";
import { QaiConversation } from "../../models/qai/qai.conversations.model.js";
import * as UserUtils from "../user/user.utils.js";
import * as CampaignUtils from "../campaign/campaign.utils.js";
import * as OpenAiUtils from "../ai/openai.utils.js";

const fileName = "QAi Utils";

const NEW_CONVERSATION_TITLE = "New chat";

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

export const converse = functionWrapper(fileName, "_converse", _converse);

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

    let result = { name };

    if (domain) {
        result.website_url = domain;
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

    let result = { name };

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
    logg.info(`conversations: ${JSON.stringify(conversations)}`);

    logg.info(`ended`);
    return [conversations, null];
}

export const getConversations = functionWrapper(
    fileName,
    "_getConversations",
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
            value: {
                actions: [
                    {
                        action: "text",
                        response: "Sorry, could not find any results",
                    },
                ],
            },
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
    return [messageId, null];
}

export const addQaiResponseToConversation = functionWrapper(
    fileName,
    "_addQaiResponseToConversation",
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
