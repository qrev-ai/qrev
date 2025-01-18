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
        await CampaignUtils.executeSequenceConfirmation(
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

// ! old API. not valid as 23rd July 2024. Check below function "sequenceAsyncCallbackApi"
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

/*
 * Created on 23rd July 2024
 * WHAT THIS FUNCTION DOES:
 *   - This function is used to handle the async callback from the AI bot server after AI server gives instructions to create Sequence.
 *
 * When does this function get called:
 *  - Reference doc: https://www.notion.so/thetrackapp/Multi-Step-Sequence-Creation-through-QAi-589e5dc4b8b74d2c85b5ea135d502120
 *  - When a QRev user asks QAi bot to create a campaign, the AI server will give instructions to Backend server create a sequence.
 *  - Hence, AI server will provide sequence_id and step_ids to Backend server. Backend server will then create the sequence and steps in the database.
 *  - Then, AI server will start generating prospects for the sequence. Once the prospects are generated, AI server will send an async callback to this API with request body defined in https://www.notion.so/thetrackapp/Backend-Sequence-Step-Personalized-Messages-Generation-Confirmation-Async-Callback-API-b86284c2c6b0432aaa111f26defd4f6d
 *  - Then, Ai server will start generating personalized messages for each prospect step by step. Once the messages are generated, AI server will send an async callback to this API with request body defined in https://www.notion.so/thetrackapp/Backend-Sequence-Step-Personalized-Messages-Generation-Confirmation-Async-Callback-API-b86284c2c6b0432aaa111f26defd4f6d
 */
export async function sequenceAsyncCallbackApi(req, res, next) {
    const txid = req.id;
    const funcName = "sequenceAsyncCallbackApi";
    const logg = logger.child({ txid, funcName });
    logg.info(`started with body:` + JSON.stringify(req.body));
    logg.info(`started with query:` + JSON.stringify(req.query));

    let {
        secretKey,
        type,
        sequence_id: sequenceId,
        sequence_step_id: sequenceStepId,
    } = req.query;

    let serverSecretKey = process.env.AI_BOT_SERVER_TOKEN;
    if (!secretKey) throw `Missing secretKey in query`;
    if (secretKey !== serverSecretKey) {
        logg.info(`ended unsuccessfully`);
        throw `Invalid secretKey`;
    }

    if (!type) throw `Missing type in query`;
    if (!sequenceId) throw `Missing sequence_id in query`;

    let acceptedTypeValues = [
        "prospect_generation_completion",
        "sequence_step_personalized_messages",
    ];
    if (!acceptedTypeValues.includes(type)) {
        logg.info(`ended unsuccessfully`);
        throw `Invalid type`;
    }

    if (type === "sequence_step_personalized_messages") {
        if (!sequenceStepId) {
            let [updateResp, updateErr] =
                await CampaignUtils.updateAllSequenceStepProspectMessages(
                    { sequenceId },
                    { txid }
                );
            if (updateErr) throw updateErr;
        } else {
            // ! this is the old version of the API. check above function
            let [updateResp, updateErr] =
                await CampaignUtils.updateSequenceStepProspectMessages(
                    { sequenceId, sequenceStepId },
                    { txid }
                );
            if (updateErr) throw updateErr;
        }
    } else {
        let [updateResp, updateErr] =
            await CampaignUtils.updateSequenceProspects(
                { sequenceId },
                { txid }
            );
        if (updateErr) throw updateErr;
    }

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

    let { ssmid, reply_id: replyId } = req.query;
    if (!ssmid) throw `invalid ssmid`;

    if (replyId) {
        let [saveMessageReplyResp, saveMessageReplyErr] =
            await CampaignUtils.saveSequenceStepMessageReplyOpenAnalytic(
                { ssmid, replyId },
                { txid }
            );
        if (saveMessageReplyErr) throw saveMessageReplyErr;
    } else {
        let [saveAnalyticResp, saveAnalyticErr] =
            await CampaignUtils.saveSequenceStepMessageOpenAnalytic(
                { ssmid, replyId },
                { txid }
            );
        if (saveAnalyticErr) throw saveAnalyticErr;
    }

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

    let {
        account_id: accountId,
        current_page_num: currentPageNum,
        limit,
    } = req.query;

    if (!accountId) throw `Missing account_id`;

    // if (!currentPageNum) throw `Missing current_page_num`;
    // if (!limit) limit = 10;

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
                unique_opened: 5,
                clicked: 3,
                replied: 1,
                unique_replied: 1,
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
                unique_opened: 2,
                clicked: 1,
                replied: 0,
                unique_replied: 0,
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

    /*
    * Sample response structure:

    let result = {
        name: "SEQ 1",
        step_details: {
            steps: 1,
            days: 1,
        },
        current_prospects: {
            active: 12,
            bounced: 1,
        },
        steps: [
            {
                active: true,
                order: 1,
                type: "email",
                time_of_dispatch: {
                    type: "from_prospect_added_time",
                    value: { time_value: 1, time_unit: "day" },
                },
                draft_type: "ai_generated", // or "manual"
                subject: "",
                body: "",
                analytics: {
                    delivered: 0,
                    pending: 0,
                    bounced: 0,
                    opened: 0,
                },
            },
        ],
    };
    */

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

export async function unsubscribeCampaignApi(req, res, next) {
    const txid = req.id;
    const funcName = "unsubscribeCampaignApi";
    const logg = logger.child({ txid, funcName });
    logg.info(`started with body:` + JSON.stringify(req.body));
    logg.info(`started with query:` + JSON.stringify(req.query));

    let { ssmid } = req.query;
    if (!ssmid) throw `Missing ssmid in query`;

    let [resp, err] = await CampaignUtils.prospectClickedUnsubscribeLink(
        { ssmid },
        { txid }
    );
    if (err) throw err;

    const relativePath = "./views/unsubscribe_email.html";
    const absolutePath = path.resolve(relativePath);
    logg.info(`ended successfully`);
    return res.sendFile(absolutePath);
}

export async function campaignUnsubscribeConfirmApi(req, res, next) {
    const txid = req.id;
    const funcName = "campaignUnsubscribeConfirmApi";
    const logg = logger.child({ txid, funcName });
    logg.info(`started with body:` + JSON.stringify(req.body));
    logg.info(`started with query:` + JSON.stringify(req.query));

    let { ssmid } = req.query;
    if (!ssmid) throw `Missing ssmid in query`;

    let [resp, err] = await CampaignUtils.prospectConfirmedUnsubscribeLink(
        { ssmid },
        { txid }
    );
    if (err) throw err;

    const relativePath = "./views/unsubscribe_email_confirmation.html";
    const absolutePath = path.resolve(relativePath);
    logg.info(`ended successfully`);
    return res.sendFile(absolutePath);
}

export async function getSequenceOpenAnalyticsApi(req, res, next) {
    const txid = req.id;
    const funcName = "getSequenceOpenAnalyticsApi";
    const logg = logger.child({ txid, funcName });
    logg.info(`started with body:` + JSON.stringify(req.body));
    logg.info(`started with query:` + JSON.stringify(req.query));

    let { account_id: accountId, sequence_id: sequenceId } = req.query;

    if (!accountId) throw `Missing account_id`;
    if (!sequenceId) throw `Missing sequence_id`;

    let [result, err] = await CampaignUtils.getSequenceOpenAnalytics(
        { accountId, sequenceId },
        { txid }
    );
    if (err) throw err;
    /*
     * "result" will return headers and data for the sequence open analytics
     * headers will be like sequence_prospect (hidden),prospect_email (Prospect Email), prospect_name (Prospect Name), count (Num of times opened), last_opened_on (Last Opened On)
     * data will be array of objects with above headers as keys
     */

    logg.info(`ended successfully`);
    return res.json({
        success: true,
        message: `${funcName} executed successfully`,
        result,
    });
}

export async function getSequenceStepOpenAnalyticsApi(req, res, next) {
    const txid = req.id;
    const funcName = "getSequenceStepOpenAnalyticsApi";
    const logg = logger.child({ txid, funcName });
    logg.info(`started with body:` + JSON.stringify(req.body));
    logg.info(`started with query:` + JSON.stringify(req.query));

    let {
        account_id: accountId,
        sequence_id: sequenceId,
        sequence_step_id: sequenceStepId,
    } = req.query;

    if (!accountId) throw `Missing account_id`;
    if (!sequenceId) throw `Missing sequence_id`;
    if (!sequenceStepId) throw `Missing sequence_step_id`;

    let [result, err] = await CampaignUtils.getSequenceOpenAnalytics(
        { accountId, sequenceId, sequenceStepId },
        { txid }
    );
    if (err) throw err;

    logg.info(`ended successfully`);
    return res.json({
        success: true,
        message: `${funcName} executed successfully`,
        result,
    });
}

export async function getSequenceReplyAnalyticsApi(req, res, next) {
    const txid = req.id;
    const funcName = "getSequenceReplyAnalyticsApi";
    const logg = logger.child({ txid, funcName });
    logg.info(`started with body:` + JSON.stringify(req.body));
    logg.info(`started with query:` + JSON.stringify(req.query));

    let { account_id: accountId, sequence_id: sequenceId } = req.query;

    if (!accountId) throw `Missing account_id`;
    if (!sequenceId) throw `Missing sequence_id`;

    let [result, err] = await CampaignUtils.getSequenceReplyAnalytics(
        { accountId, sequenceId },
        { txid }
    );
    if (err) throw err;
    /*
     * Created on 16th June 2024
     * "result" will return headers and data for the sequence reply analytics
     * headers will be like sequence_prospect_message (hidden),prospect_email (Prospect Email), prospect_name (Prospect Name), reply (Reply), replied_on (Replied On)
     * data will be array of objects with above headers as keys
     *
     */

    logg.info(`ended successfully`);
    return res.json({
        success: true,
        message: `${funcName} executed successfully`,
        result,
    });
}

export async function getSequenceStepReplyAnalyticsApi(req, res, next) {
    const txid = req.id;
    const funcName = "getSequenceStepReplyAnalyticsApi";
    const logg = logger.child({ txid, funcName });
    logg.info(`started with body:` + JSON.stringify(req.body));
    logg.info(`started with query:` + JSON.stringify(req.query));

    let {
        account_id: accountId,
        sequence_id: sequenceId,
        sequence_step_id: sequenceStepId,
    } = req.query;

    if (!accountId) throw `Missing account_id`;
    if (!sequenceId) throw `Missing sequence_id`;
    if (!sequenceStepId) throw `Missing sequence_step_id`;

    let [result, err] = await CampaignUtils.getSequenceReplyAnalytics(
        { accountId, sequenceId, sequenceStepId },
        { txid }
    );
    if (err) throw err;
    /*
     * Created on 16th June 2024
     * "result" will return headers and data for the sequence step reply analytics
     * headers will be like sequence_prospect_message (hidden),prospect_email (Prospect Email), prospect_name (Prospect Name), reply (Reply), replied_on (Replied On)
     * data will be array of objects with above headers as keys
     */

    logg.info(`ended successfully`);
    return res.json({
        success: true,
        message: `${funcName} executed successfully`,
        result,
    });
}

/*
 * Added on 30th August 2024
 * Context: When a new user logs in QRev for the first time, we need them to upload their brand document, pain points doc, ICP text/voice/doc etc.
 * WHAT DOES THIS API DO?
 * - This API is used to store the resource file (like brand document, pain points doc, ICP text/voice/doc etc.) uploaded by the user.
 * - It stores the file in the database and returns the file path.
 * WHERE IS THIS API USED?
 * - This API is used in the QRev Desktop App when user logs in and if any of the required resources are not uploaded, it will ask user to upload the resources.
 */
export async function storeResourceInfoApi(req, res, next) {
    const txid = req.id;
    const funcName = "storeResourceInfoApi";
    const logg = logger.child({ txid, funcName });
    logg.info(`started with body:` + JSON.stringify(req.body));

    let userId = req.user && req.user.userId ? req.user.userId : null;
    if (!userId) throw `Missing userId from decoded access token`;

    let { account_id: accountId } = req.query;
    let {
        resource_name: resourceName,
        resource_type: resourceType,
        resource_text: resourceText,
    } = req.body;
    let files = req.files;

    if (!accountId)
        throw new CustomError(`Missing account_id`, fileName, funcName);
    if (!resourceName)
        throw new CustomError(`Missing resource_name`, fileName, funcName);
    if (!resourceType)
        throw new CustomError(`Missing resource_type`, fileName, funcName);

    if (
        resourceType !== "text" &&
        resourceType !== "files" &&
        resourceType !== "file"
    )
        throw new CustomError(`Invalid resource_type`, fileName, funcName);
    if (resourceType === "text" && !resourceText)
        throw new CustomError(
            `Missing resource_text for text resource_type`,
            fileName,
            funcName
        );
    if (
        (resourceType === "files" || resourceType === "file") &&
        (!files || files.length === 0)
    )
        throw new CustomError(
            `No files uploaded for ${resourceType} resource_type`,
            fileName,
            funcName
        );

    logg.info(`resourceType: ${resourceType}, files: ${JSON.stringify(files)}`);

    let [result, resultErr] = await CampaignUtils.storeResourceFile(
        { accountId, resourceName, resourceType, resourceText, files },
        { txid }
    );
    if (resultErr) throw resultErr;

    logg.info(`ended successfully`);
    return res.json({
        success: true,
        message: `${funcName} executed successfully`,
    });
}

/*
 * Added on 3rd September 2024
 * Context: When a user logs in QRev, we need them to upload their brand document, pain points doc, ICP text/voice/doc etc.
 * WHAT DOES THIS API DO?
 * - This API is used to check if the user has uploaded all the required resources.
 * - If any resource is missing, it returns the list of missing resources.
 * - If all resources are uploaded, it returns an empty array.
 * WHERE IS THIS API USED?
 * - This API is used in the QRev Desktop App when user logs in.
 */
export async function checkMissingResourcesApi(req, res, next) {
    const txid = req.id;
    const funcName = "checkMissingResourcesApi";
    const logg = logger.child({ txid, funcName });
    logg.info(`started with query:` + JSON.stringify(req.query));

    let userId = req.user && req.user.userId ? req.user.userId : null;
    if (!userId) throw `Missing userId from decoded access token`;

    let { account_id: accountId } = req.query;
    if (!accountId) throw `Missing account_id`;

    let [result, resultErr] = await CampaignUtils.checkMissingResources(
        { accountId },
        { txid }
    );
    if (resultErr) throw resultErr;
    if (!result) throw new CustomError(`Missing result`, fileName, funcName);

    let missingResources = result.missingResources || [];
    logg.info(`ended successfully`);
    return res.json({
        success: true,
        message: `${funcName} executed successfully`,
        missing_resources: missingResources,
    });
}

/*
 * Added on 7th September 2024
 * WHAT DOES THIS API DO?
 * - Retrieves existing campaign defaults for the user's account.
 * - If no defaults exist, it creates a new config with default values.
 * WHERE IS THIS API USED?
 * - In the QRev Desktop App when onbaording user. also used in Settings page.
 */
export async function getExistingCampaignDefaultsApi(req, res, next) {
    const txid = req.id;
    const funcName = "getExistingCampaignDefaultsApi";
    const logg = logger.child({ txid, funcName });
    logg.info(`started with query:` + JSON.stringify(req.query));

    let userId = req.user && req.user.userId ? req.user.userId : null;
    if (!userId)
        throw new CustomError(
            `Missing userId from decoded access token`,
            fileName,
            funcName
        );

    let { account_id: accountId } = req.query;
    if (!accountId)
        throw new CustomError(`Missing account_id`, fileName, funcName);

    let [result, resultErr] = await CampaignUtils.getExistingCampaignDefaults(
        {
            accountId,
            userId,
            returnBackDefaultConfig: true,
            createIfNotExists: false,
        },
        { txid }
    );
    if (resultErr) throw resultErr;

    logg.info(`ended successfully`);
    return res.json({
        success: true,
        message: `${funcName} executed successfully`,
        campaign_defaults: result,
    });
}

/*
 * Added on 7th September 2024
 * WHAT DOES THIS API DO?
 * - Sets campaign defaults for the user's account.
 * WHERE IS THIS API USED?
 * - In the QRev Desktop App when onbaording user. also used in Settings page.
 */
export async function setCampaignDefaultsApi(req, res, next) {
    const txid = req.id;
    const funcName = "setCampaignDefaultsApi";
    const logg = logger.child({ txid, funcName });
    logg.info(`started with body:` + JSON.stringify(req.body));
    logg.info(`started with query:` + JSON.stringify(req.query));

    let userId = req.user && req.user.userId ? req.user.userId : null;
    if (!userId)
        throw new CustomError(
            `Missing userId from decoded access token`,
            fileName,
            funcName
        );

    let { account_id: accountId } = req.query;
    let { email_senders, exclude_domains, sequence_steps_template } = req.body;

    if (!accountId)
        throw new CustomError(`Missing account_id`, fileName, funcName);
    if (!email_senders || !Array.isArray(email_senders))
        throw new CustomError(`Invalid email_senders`, fileName, funcName);

    let [result, resultErr] = await CampaignUtils.setCampaignDefaults(
        { accountId, email_senders, exclude_domains, sequence_steps_template },
        { txid }
    );
    if (resultErr) throw resultErr;

    logg.info(`ended successfully`);
    return res.json({
        success: true,
        message: `${funcName} executed successfully`,
    });
}

export async function getSequenceListApi(req, res, next) {
    const txid = req.id;
    const funcName = "getSequenceListApi";
    const logg = logger.child({ txid, funcName });
    logg.info(`started with query:` + JSON.stringify(req.query));

    let userId = req.user && req.user.userId ? req.user.userId : null;
    if (!userId) throw `Missing userId from decoded access token`;

    let { account_id: accountId, get_only_names: getOnlyNames } = req.query;
    if (!accountId) throw `Missing account_id`;

    getOnlyNames =
        getOnlyNames === "true" || getOnlyNames === true ? true : false;
    let [result, resultErr] = await CampaignUtils.getSequenceList(
        { accountId, getOnlyNames },
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
 * Added on 29th October 2024
 * WHAT DOES THIS API DO?
 * - This API is used to update an existing sequence prospect message using AI
 * - It takes the existing message and update instructions as input and returns the updated message
 * WHERE IS THIS API USED?
 * - In the QRev Desktop App when user wants to modify an existing message using AI
 */
export async function updateSequenceMessageUsingAiApi(req, res, next) {
    const txid = req.id;
    const funcName = "updateSequenceMessageUsingAiApi";
    const logg = logger.child({ txid, funcName });
    logg.info(`started with body:` + JSON.stringify(req.body));
    logg.info(`started with query:` + JSON.stringify(req.query));

    let userId = req.user && req.user.userId ? req.user.userId : null;
    if (!userId) throw `Missing userId from decoded access token`;

    let { account_id: accountId } = req.query;
    if (!accountId) throw `Missing account_id`;

    let {
        spms_id: spmsId,
        update_instructions: updateInstructions,
        existing_message: existingMessage,
        ai_query_type: aiQueryType,
    } = req.body;

    if (!spmsId) throw `Missing spms_id in body`;
    if (!existingMessage) throw `Missing existing_message in body`;

    let [result, resultErr] = await CampaignUtils.updateSequenceMessageUsingAi(
        { spmsId, updateInstructions, existingMessage, accountId, aiQueryType },
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
 * Added on 30th December 2024
 * WHAT DOES THIS API DO?
 * - This API is used to get all the generated auto reply drafts for a given account
 * User can then review and approve the draft to be sent to the prospect
 * WHERE IS THIS API USED?
 * - In the QRev Desktop App under 'Review Mails' UI when user wants to review and approve the auto reply drafts
 */
export async function getAllGeneratedAutoReplyDraftsApi(req, res, next) {
    const txid = req.id;
    const funcName = "getAllGeneratedAutoReplyDraftsApi";
    const logg = logger.child({ txid, funcName });
    logg.info(`started with query:` + JSON.stringify(req.query));

    let userId = req.user && req.user.userId ? req.user.userId : null;
    if (!userId) {
        throw new CustomError(
            `Missing userId from decoded access token`,
            fileName,
            funcName
        );
    }

    let { account_id: accountId, fetch_type: fetchType } = req.query;
    if (!accountId) {
        throw new CustomError(`Missing account_id`, fileName, funcName);
    }

    if (!fetchType) fetchType = "pending";
    let validFetchTypes = ["pending", "sent"];
    if (!validFetchTypes.includes(fetchType)) {
        throw new CustomError(
            `Invalid fetch_type: ${fetchType}. Should be one of these values: ${JSON.stringify(
                validFetchTypes
            )}`,
            fileName,
            funcName
        );
    }

    let [draftInfos, draftInfosErr] =
        await CampaignUtils.getAllGeneratedAutoReplyDrafts(
            { accountId, fetchType, userId },
            { txid }
        );
    if (draftInfosErr) throw draftInfosErr;

    logg.info(`ended successfully`);
    return res.json({
        success: true,
        message: `${funcName} executed successfully`,
        result: draftInfos,
    });
}

/*
 * Added on 31st December 2024
 * WHAT DOES THIS API DO?
 * - This API is used to send an auto reply draft to the prospect
 * WHERE IS THIS API USED?
 * - In the QRev Desktop App under 'Review Mails' UI when user wants to send an auto reply draft to the prospect
 */
export async function sendAutoReplyDraftApi(req, res, next) {
    const txid = req.id;
    const funcName = "sendAutoReplyDraftApi";
    const logg = logger.child({ txid, funcName });
    logg.info(`started with body:` + JSON.stringify(req.body));

    let userId = req.user && req.user.userId ? req.user.userId : null;
    if (!userId) throw `Missing userId from decoded access token`;

    let { account_id: accountId } = req.query;
    if (!accountId) throw `Missing account_id`;

    let {
        reply_analytic_id: replyAnalyticId,
        reply_txt_message: replyTxtMessage,
    } = req.body;
    if (!replyAnalyticId) {
        throw new CustomError(
            `Missing reply_analytic_id in body`,
            fileName,
            funcName
        );
    }
    if (!replyTxtMessage)
        throw new CustomError(
            `Missing reply_txt_message in body`,
            fileName,
            funcName
        );

    let [result, resultErr] = await CampaignUtils.sendAutoReplyDraft(
        { accountId, replyAnalyticId, replyTxtMessage, userId },
        { txid }
    );
    if (resultErr) throw resultErr;

    logg.info(`ended successfully`);
    return res.json({
        success: true,
        message: `${funcName} executed successfully`,
    });
}
