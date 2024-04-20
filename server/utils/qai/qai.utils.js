import { v4 as uuidv4 } from "uuid";
import { functionWrapper } from "../../std/wrappers.js";
import CustomError from "../../std/custom.error.js";
import { logger } from "../../logger.js";
import { QaiConversation } from "../../models/qai/qai.conversations.model.js";

const fileName = "QAi Utils";

async function _converse(
    { query, accountId, userId, uploadedData },
    { txid, logg, funcName }
) {
    logg.info(`started`);

    let url = process.env.AI_BOT_SERVER_URL;
    let token = process.env.AI_BOT_SERVER_TOKEN;
    let asyncUrl =
        process.env.SERVER_URL_PATH + "/api/campaign/update_sequence_messages";
    let data = {
        query,
        company_id: accountId,
        user_id: userId,
        token,
        "asynchronous [optional]": asyncUrl,
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
    { accountId, userId },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    let conversations = await QaiConversation.find({
        account: accountId,
        owner: userId,
    }).lean();
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
    { accountId, userId, conversationId },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    let conversation = await QaiConversation.findOne({
        _id: conversationId,
        account: accountId,
        owner: userId,
    }).lean();
    logg.info(`conversation: ${JSON.stringify(conversation)}`);

    logg.info(`ended`);
    return [conversation, null];
}

export const getConversation = functionWrapper(
    fileName,
    "_getConversation",
    _getConversation
);

async function _addUserQueryToConversation(
    { query, accountId, userId, conversationId, uploadedData },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    let conversationQuery = { _id: conversationId, account: accountId };
    let conversation = await QaiConversation.findOne(conversationQuery).lean();
    logg.info(`conversation: ${JSON.stringify(conversation)}`);
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
    let updateObj = { $push: { messages: messageObj } };
    if (!conversation.messages || conversation.messages.length === 0) {
        updateObj.$set = { title: query };
    }

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
    { response, accountId, userId, conversationId },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    let conversationQuery = { _id: conversationId, account: accountId };
    let conversation = await QaiConversation.findOne(conversationQuery).lean();
    logg.info(`conversation: ${JSON.stringify(conversation)}`);
    if (!conversation) {
        throw `Conversation not found for ${conversationId}`;
    }

    let messageId = uuidv4();
    let updateObj = {
        $push: {
            messages: {
                message_id: messageId,
                type: "bot",
                value: response,
                created_on: new Date(),
            },
        },
    };
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
