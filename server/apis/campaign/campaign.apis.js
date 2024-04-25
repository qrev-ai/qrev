import { logger } from "../../logger.js";
import CustomError from "../../std/custom.error.js";
import * as CampaignUtils from "../../utils/campaign/campaign.utils.js";
import path from "path";

const fileName = "Campaign APIs";

export async function sendCampaignApi(req, res, next) {
    const txid = req.id;
    const funcName = "sendCampaignApi";
    const logg = logger.child({ txid, funcName });
    logg.info(`started with body:` + JSON.stringify(req.body));
    logg.info(`started with query:` + JSON.stringify(req.query));

    let userId = req.user && req.user.userId ? req.user.userId : null;
    if (!userId) {
        logg.info(`ended unsuccessfully`);
        throw `Missing userId from decoded access token`;
    }

    let { account_id: accountId } = req.query;
    if (!accountId) throw `Missing account_id in query`;

    let { sequence_id: sequenceId } = req.body;
    if (!sequenceId) throw `Missing sequence_id in body`;

    let [campCreateResp, campErr] =
        await CampaignUtils.setupSequenceProspectMessageTime(
            { sequenceId, accountId, userId },
            { txid }
        );
    if (campErr) throw campErr;

    logg.info(`ended successfully`);
    return res.json({
        success: true,
        message: `${funcName} executed successfully`,
    });
}

export async function updateCampaignSequenceMessagesApi(req, res, next) {
    const txid = req.id;
    const funcName = "updateCampaignSequenceMessagesApi";
    const logg = logger.child({ txid, funcName });
    logg.info(`started with body:` + JSON.stringify(req.body));
    logg.info(`started with query:` + JSON.stringify(req.query));

    let secretKey = req.query.secretKey;
    let serverSecretKey = process.env.AI_BOT_SERVER_TOKEN;
    if (!secretKey) throw `Missing secretKey in query`;
    if (secretKey !== serverSecretKey) {
        logg.info(`ended unsuccessfully`);
        throw `Invalid secretKey`;
    }

    let { sequence_id: sequenceId } = req.body;
    if (!sequenceId) throw `Missing sequence_id in body`;

    let [updateResp, updateErr] = await CampaignUtils.updateSequenceMessages(
        { sequenceId },
        { txid }
    );
    if (updateErr) throw updateErr;

    logg.info(`ended successfully`);
    return res.json({
        success: true,
        message: `${funcName} executed successfully`,
    });
}

export async function saveCampaignEmailOpen(req, res, next) {
    const txid = req.id;
    const funcName = "saveCampaignEmailOpen";
    const logg = logger.child({ txid, funcName });
    logg.info(`started with body:` + JSON.stringify(req.body));
    logg.info(`started with query:` + JSON.stringify(req.query));
    logg.info(`started with headers:` + JSON.stringify(req.headers));

    let { ssmid } = req.query;
    if (!ssmid) throw `invalid ssmid`;

    let [saveAnalyticResp, saveAnalyticErr] =
        await CampaignUtils.saveSequenceStepMessageOpenAnalytic(
            { ssmid },
            { txid }
        );
    if (saveAnalyticErr) throw saveAnalyticErr;

    const relativePath = "./data/empty_img.png";
    const absolutePath = path.resolve(relativePath);
    return res.sendFile(absolutePath);
}

export async function getAllSequenceApi(req, res, next) {
    const txid = req.id;
    const funcName = "getAllSequenceApi";
    const logg = logger.child({ txid, funcName });
    logg.info(`started with body:` + JSON.stringify(req.body));
    logg.info(`started with query:` + JSON.stringify(req.query));

    let userId = req.user && req.user.userId ? req.user.userId : null;
    if (!userId) throw `Missing userId from decoded access token`;

    let { account_id: accountId } = req.query;

    if (!accountId) throw `Missing account_id`;

    /*
    let result = [
        {
            _id: "60f3e3e3e3e3e3e3e3e3e3e3",
            name: "SEQ1",
            steps: 13,
            current_prospects: { active: 31, bounced: 3 },
            sequence_analytics: {
                contacted: 12,
                opened: 8,
                clicked: 3,
                replied: 1,
                booked: 0,
            },
        },
        {
            _id: "60f3e3e3e3e3e3e3e3e3e3e2",
            name: "SEQ2",
            steps: 5,
            current_prospects: { active: 21, bounced: 2 },
            sequence_analytics: {
                contacted: 5,
                opened: 3,
                clicked: 1,
                replied: 0,
                booked: 0,
            },
        },
    ];
    */

    let [result, resultErr] =
        await CampaignUtils.getAllSequencesAndItsAnalytics(
            { accountId },
            { txid }
        );
    if (resultErr) throw resultErr;

    logg.info(`ended successfully`);
    return res.json({
        success: true,
        message: `${funcName} executed successfully`,
        result,
    });
}

export async function getSequenceDetailsApi(req, res, next) {
    const txid = req.id;
    const funcName = "getSequenceDetailsApi";
    const logg = logger.child({ txid, funcName });
    logg.info(`started with body:` + JSON.stringify(req.body));
    logg.info(`started with query:` + JSON.stringify(req.query));

    let userId = req.user && req.user.userId ? req.user.userId : null;
    if (!userId) throw `Missing userId from decoded access token`;

    let { account_id: accountId, sequence_id: sequenceId } = req.query;

    if (!accountId) throw `Missing account_id`;
    if (!sequenceId) throw `Missing sequence_id`;

    let [result, resultErr] = await CampaignUtils.getSequenceDetails(
        { accountId, sequenceId },
        { txid }
    );
    if (resultErr) throw resultErr;

    logg.info(`ended successfully`);
    return res.json({
        success: true,
        message: `${funcName} executed successfully`,
        result,
    });
}

export async function getSequenceProspectsApi(req, res, next) {
    const txid = req.id;
    const funcName = "getSequenceProspectsApi";
    const logg = logger.child({ txid, funcName });
    logg.info(`started with body:` + JSON.stringify(req.body));
    logg.info(`started with query:` + JSON.stringify(req.query));

    let userId = req.user && req.user.userId ? req.user.userId : null;
    if (!userId) throw `Missing userId from decoded access token`;

    let { account_id: accountId, sequence_id: sequenceId } = req.query;

    if (!accountId) throw `Missing account_id`;
    if (!sequenceId) throw `Missing sequence_id`;

    let [result, resultErr] = await CampaignUtils.getSequenceProspects(
        { accountId, sequenceId },
        { txid }
    );
    if (resultErr) throw resultErr;

    logg.info(`ended successfully`);
    return res.json({
        success: true,
        message: `${funcName} executed successfully`,
        result,
    });
}

export async function setSenderListForCampaignApi(req, res, next) {
    const txid = req.id;
    const funcName = "setSenderListForCampaignApi";
    const logg = logger.child({ txid, funcName });
    logg.info(`started with body:` + JSON.stringify(req.body));
    logg.info(`started with query:` + JSON.stringify(req.query));

    let userId = req.user && req.user.userId ? req.user.userId : null;
    if (!userId) throw `Missing userId from decoded access token`;

    let { account_id: accountId } = req.query;
    if (!accountId) throw `Missing account_id`;

    let { sender_list: senderList } = req.body;
    if (!senderList) throw `Missing sender_list in body`;

    let [result, resultErr] = await CampaignUtils.setEmailSenderListForCampaign(
        { accountId, senderList },
        { txid }
    );
    if (resultErr) throw resultErr;

    logg.info(`ended successfully`);
    return res.json({
        success: true,
        message: `${funcName} executed successfully`,
    });
}

export async function getSenderListForCampaignApi(req, res, next) {
    const txid = req.id;
    const funcName = "getSenderListForCampaignApi";
    const logg = logger.child({ txid, funcName });
    logg.info(`started with body:` + JSON.stringify(req.body));
    logg.info(`started with query:` + JSON.stringify(req.query));

    let userId = req.user && req.user.userId ? req.user.userId : null;
    if (!userId) throw `Missing userId from decoded access token`;

    let { account_id: accountId } = req.query;
    if (!accountId) throw `Missing account_id`;

    let [result, resultErr] = await CampaignUtils.getEmailSenderListForCampaign(
        { accountId },
        { txid }
    );
    if (resultErr) throw resultErr;

    logg.info(`ended successfully`);
    return res.json({
        success: true,
        message: `${funcName} executed successfully`,
        result,
    });
}
