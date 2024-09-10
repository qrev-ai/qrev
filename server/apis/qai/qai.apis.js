import { v4 as uuidv4 } from "uuid";
import { logger } from "../../logger.js";
import CustomError from "../../std/custom.error.js";
import * as QAiBotUtils from "../../utils/qai/qai.utils.js";
import * as CampaignUtils from "../../utils/campaign/campaign.utils.js";

const fileName = "QAi Bot APIs";

export async function converseApi(req, res, next) {
    const txid = req.id;
    const funcName = "qai-converseApi";
    const logg = logger.child({ txid, funcName });
    logg.info(`started with body:` + JSON.stringify(req.body));
    logg.info(`started with query:` + JSON.stringify(req.query));

    let userId = req.user && req.user.userId ? req.user.userId : null;
    if (!userId) {
        logg.info(`ended unsuccessfully`);
        throw `Missing userId from decoded access token`;
    }

    let { account_id: accountId } = req.query;

    let {
        query,
        uploaded_data: uploadedData,
        conversation_id: conversationId,
    } = req.body;

    let [conversationDocResp, conversationDocErr] =
        await QAiBotUtils.getConversation(
            {
                accountId,
                userId,
                conversationId,
                getAccountAndUserInfo: true,
            },
            { txid }
        );
    if (conversationDocErr) throw conversationDocErr;
    if (!conversationDocResp) throw `Conversation not found`;
    let { conversationInfo, accountInfo, userInfo } = conversationDocResp;
    if (!conversationInfo) throw `Conversation not found`;
    if (!accountInfo) throw `Account not found`;
    if (!userInfo) throw `User not found`;

    let [conversationResp, conversationErr] =
        await QAiBotUtils.addUserQueryToConversation(
            {
                query,
                accountId,
                userId,
                conversationId,
                uploadedData,
                conversation: conversationInfo,
            },
            { txid }
        );
    if (conversationErr) throw conversationErr;

    // get campaign defaults from Campaign Config in CampaignUtils
    let [campaignConfig, campaignConfigErr] =
        await CampaignUtils.getCampaignDefaults(
            { accountId, setDefaultIfNotFound: false },
            { txid }
        );
    if (campaignConfigErr) throw campaignConfigErr;

    let [botResp, botErr] = await QAiBotUtils.converse(
        {
            query,
            accountId,
            userId,
            uploadedData,
            conversationInfo,
            accountInfo,
            userInfo,
            campaignConfig,
        },
        { txid }
    );

    if (botErr) {
        // add default error bot response to conversation
        await QAiBotUtils.addQaiResponseToConversation(
            {
                accountId,
                conversationId,
                isError: true,
                conversation: conversationInfo,
            },
            { txid, sendErrorMsg: true }
        );
        throw botErr;
    }

    let sequenceDetails = QAiBotUtils.isCampaignCreatedInAIResponse(
        { botResp, accountId, userId },
        { txid }
    );

    if (sequenceDetails) {
        logg.info(`setting up the campaign sequence in db`);
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

        logg.info(`campaign setup done`);
    } else {
        logg.info(`no campaign found in AI response`);
    }

    let [qaiConversationResp, qaiConversationErr] =
        await QAiBotUtils.addQaiResponseToConversation(
            {
                response: botResp,
                accountId,
                conversationId,
                conversation: conversationInfo,
            },
            { txid }
        );
    if (qaiConversationErr) throw qaiConversationErr;

    logg.info(`ended successfully`);
    return res.json({
        success: true,
        message: `${funcName} executed successfully`,
        result: botResp,
    });
}

export async function createConversationApi(req, res, next) {
    const txid = req.id;
    const funcName = "qai-createConversationApi";
    const logg = logger.child({ txid, funcName });
    logg.info(`started with body:` + JSON.stringify(req.body));
    logg.info(`started with query:` + JSON.stringify(req.query));

    let userId = req.user && req.user.userId ? req.user.userId : null;
    if (!userId) {
        logg.info(`ended unsuccessfully`);
        throw `Missing userId from decoded access token`;
    }

    let { account_id: accountId } = req.query;

    let [conversation, conversationErr] = await QAiBotUtils.createConversation(
        { accountId, userId },
        { txid }
    );
    if (conversationErr) throw conversationErr;

    logg.info(`ended successfully`);
    return res.json({
        success: true,
        message: `${funcName} executed successfully`,
        conversation_id: conversation,
    });
}

export async function getConversationsApi(req, res, next) {
    const txid = req.id;
    const funcName = "qai-getConversationsApi";
    const logg = logger.child({ txid, funcName });
    logg.info(`started with body:` + JSON.stringify(req.body));
    logg.info(`started with query:` + JSON.stringify(req.query));

    let userId = req.user && req.user.userId ? req.user.userId : null;
    if (!userId) {
        logg.info(`ended unsuccessfully`);
        throw `Missing userId from decoded access token`;
    }

    let { account_id: accountId } = req.query;

    let [conversations, conversationsErr] = await QAiBotUtils.getConversations(
        { accountId, userId, sortByLatest: true },
        { txid }
    );
    if (conversationsErr) throw conversationsErr;

    logg.info(`ended successfully`);
    return res.json({
        success: true,
        message: `${funcName} executed successfully`,
        conversations,
    });
}

export async function getConversationApi(req, res, next) {
    const txid = req.id;
    const funcName = "qai-getConversationApi";
    const logg = logger.child({ txid, funcName });
    logg.info(`started with body:` + JSON.stringify(req.body));
    logg.info(`started with query:` + JSON.stringify(req.query));

    let userId = req.user && req.user.userId ? req.user.userId : null;
    if (!userId) {
        logg.info(`ended unsuccessfully`);
        throw `Missing userId from decoded access token`;
    }

    let { account_id: accountId, conversation_id: conversationId } = req.query;

    let [conversation, conversationErr] = await QAiBotUtils.getConversation(
        { accountId, userId, conversationId },
        { txid }
    );
    if (conversationErr) throw conversationErr;

    logg.info(`ended successfully`);
    return res.json({
        success: true,
        message: `${funcName} executed successfully`,
        conversation,
    });
}

export async function deleteConversationApi(req, res, next) {
    const txid = req.id;
    const funcName = "qai-deleteConversationApi";
    const logg = logger.child({ txid, funcName });
    logg.info(`started with body:` + JSON.stringify(req.body));
    logg.info(`started with query:` + JSON.stringify(req.query));

    let userId = req.user && req.user.userId ? req.user.userId : null;
    if (!userId) {
        logg.info(`ended unsuccessfully`);
        throw `Missing userId from decoded access token`;
    }

    let { account_id: accountId, conversation_id: conversationId } = req.query;

    let [deleteResp, deleteErr] = await QAiBotUtils.deleteConversation(
        { accountId, userId, conversationId },
        { txid }
    );
    if (deleteErr) throw deleteErr;

    logg.info(`ended successfully`);
    return res.json({
        success: true,
        message: `${funcName} executed successfully`,
    });
}
