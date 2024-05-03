import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import { functionWrapper } from "../../std/wrappers.js";
import CustomError from "../../std/custom.error.js";
import { logger } from "../../logger.js";
import { QaiConversation } from "../../models/qai/qai.conversations.model.js";
import * as UserUtils from "../user/user.utils.js";

const fileName = "QAi Utils";

async function _converse(
    {
        query,
        accountId,
        userId,
        uploadedData,
        conversationInfo,
        accountInfo,
        userInfo,
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

    let data = {
        query,
        company_id: accountId,
        user_id: userId,
        token,
        asynchronous: asyncUrl,
        conversation: conversationInfo,
        sender_company: senderCompany,
        sender_person: senderPerson,
    };

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
    let sequenceId = null;
    for (const a of actions) {
        if (a.type === "email_sequence_draft") {
            sequenceId = a.sequence_id;
            if (sequenceId) {
                logg.info(`campaign action found`);
                break;
            }
        }
    }

    logg.info(`ended`);
    return sequenceId;
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

async function _createConversation(
    { accountId, userId },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    let conversationDoc = {
        _id: uuidv4(),
        account: accountId,
        owner: userId,
        title: "New Conversation on " + new Date().toISOString(),
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
    { accountId, userId, conversationId, getAccountAndUserInfo },
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

        logg.info(`ended`);
        return [conversation, null];
    }
}

export const getConversation = functionWrapper(
    fileName,
    "_getConversation",
    _getConversation
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
        updateObj.$set = { title: query };
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
