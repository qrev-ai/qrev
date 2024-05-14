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

    let { sequence_id: sequenceId, user_timezone: userTimezone } = req.body;
    if (!sequenceId) throw `Missing sequence_id in body`;

    let [campCreateResp, campErr] =
        await CampaignUtils.setupSequenceProspectMessageTime(
            { sequenceId, accountId, userId, userTimezone },
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

/*
* Created on 4th May 2024
* Q: What does this API do?
* - This API is used to get all the email messages that are currently being sent across all sequences
* Q: Why?
* - Since AI generates personalized messages for each prospect in all sequences, we need to provide a UI for QRev user to see the messages being sent.

* Q: Where is this API used?
* - This API is used in the QRev Frontend, under the "Emails" tab in the "Campaign" app.
*/
export async function getAllSequenceEmailsApi(req, res, next) {
    const txid = req.id;
    const funcName = "getAllSequenceEmailsApi";
    const logg = logger.child({ txid, funcName });
    logg.info(`started with body:` + JSON.stringify(req.body));
    logg.info(`started with query:` + JSON.stringify(req.query));

    let userId = req.user && req.user.userId ? req.user.userId : null;
    if (!userId) throw `Missing userId from decoded access token`;

    let { account_id: accountId, page_num: pageNum, limit } = req.query;

    if (!accountId) throw `Missing account_id`;

    let [result, resultErr] = await CampaignUtils.getAllSequenceEmails(
        { accountId, pageNum, limit },
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

/*
 * Created on 10th May 2024
 * Q: What does this API do?
 * - For a prospect in a sequence, this API is used to get the timeline of all activities done by the prospect
 * - These will be activities like email sent, email opened, email replied etc.
 */
export async function getSequenceProspectActivityTimelineApi(req, res, next) {
    const txid = req.id;
    const funcName = "getSequenceProspectActivityTimelineApi";
    const logg = logger.child({ txid, funcName });
    logg.info(`started with body:` + JSON.stringify(req.body));
    logg.info(`started with query:` + JSON.stringify(req.query));

    let {
        account_id: accountId,
        sequence_id: sequenceId,
        sequence_prospect_id: sequenceProspectId,
        user_timezone: userTimezone,
    } = req.query;

    if (!accountId) throw `Missing account_id`;
    if (!sequenceId) throw `Missing sequence_id`;
    if (!sequenceProspectId) throw `Missing sequence_prospect_id`;

    let [result, resultErr] = await CampaignUtils.getProspectActivityTimeline(
        { accountId, sequenceId, sequenceProspectId, userTimezone },
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

/*
 * Created on 11th May 2024
 * Q: What does this API do?
 * - This API is used for webhook so that 3rd party email verifier services (like ZeroBounce)
 * - to notify that all emails in a campaign sequence have been processed and gives list of valid emails and invalid emails
 * - Note: Currently only ZeroBounce is supported
 * - Note: If you don't have ZeroBounce subscription, you can set "VERIFY_PROSPECT_EMAIL_BY_SERVICE" to "none" in .env file
 * - Note: If you have ZeroBounce subscription, then set below keys in .env file:
 *   - set "VERIFY_PROSPECT_EMAIL_BY_SERVICE" to "zerobounce"
 *   - set "ZERO_BOUNCE_API_KEY" to your ZeroBounce API key
 *   - set "QREV_ZEROBOUNCE_SECRET_ID" to a randomly generated secret id so that zerobounce webhook can be verified
 */
export async function campaignProspectBounceWebhookApi(req, res, next) {
    const txid = req.id;
    const funcName = "campaignProspectBounceWebhookApi";
    const logg = logger.child({ txid, funcName });
    logg.info(`started with body:` + JSON.stringify(req.body));
    logg.info(`started with query:` + JSON.stringify(req.query));

    let {
        cs_id: campaignSequenceId,
        service_name: serviceName,
        secret_id: secretId,
        account_id: accountId,
    } = req.query;

    if (!campaignSequenceId) throw `Missing cs_id in query`;
    if (!serviceName) throw `Missing service_name in query`;
    if (!secretId) throw `Missing secret_id in query`;

    let [resp, err] = await CampaignUtils.campaignProspectBounceWebhook(
        { campaignSequenceId, serviceName, secretId, accountId },
        { txid }
    );
    if (err) throw err;

    logg.info(`ended successfully`);
    return res.json({
        success: true,
        message: `${funcName} executed successfully`,
    });
}
