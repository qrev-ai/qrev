import _ from "lodash";
import { functionWrapper } from "../../std/wrappers.js";
import CustomError from "../../std/custom.error.js";
import { logger } from "../../logger.js";
import { VisitorAnalytics } from "../../models/analytic/visitor.analytic.model.js";
import {
    AnalyticActionTypes,
    AnalyticAppTypes,
} from "../../config/analytic.config.js";
import * as GoogleUtils from "../google/google.auth.utils.js";

const fileName = "Analytic Utils";

function getTimeRangeQueryObj({ timeRange }, { txid }) {
    let timeQueryObj = {};
    if (!timeRange || JSON.stringify(timeRange) === "{}" || !timeRange.type)
        return timeQueryObj;
    let timeRangeType = timeRange.type;
    if (timeRangeType === "all_time") return timeQueryObj;
    else if (timeRangeType === "other") {
        let timeRangeValue = timeRange.value;
        if (!timeRangeValue) return timeQueryObj;
        let timeRangeValueStart = timeRangeValue.start;
        let timeRangeValueEnd = timeRangeValue.end;
        if (!timeRangeValueStart || !timeRangeValueEnd) return timeQueryObj;
        timeQueryObj = {
            created_on: {
                $gte: new Date(timeRangeValueStart),
                $lte: new Date(timeRangeValueEnd),
            },
        };
    }

    return timeQueryObj;
}

async function _getAnalyticsFromDb(
    { accountId, type, timeRange, data, sequenceIds, sequenceProspectId },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    let queryObj = { account: accountId };
    let timeQueryObj = getTimeRangeQueryObj({ timeRange }, { txid });
    if (timeQueryObj) queryObj = { ...queryObj, ...timeQueryObj };

    if (type === "campaign_message") {
        if (sequenceIds && sequenceIds.length) {
            queryObj = {
                ...queryObj,
                sequence: { $in: sequenceIds },
            };
        }
    } else if (type === "sequence_prospect") {
        if (sequenceProspectId) {
            queryObj = {
                ...queryObj,
                sequence_prospect: sequenceProspectId,
            };
        }
    }

    logg.info(`queryObj: ${JSON.stringify(queryObj)}`);
    let analytics = null;

    analytics = await VisitorAnalytics.find(queryObj).sort("created_on").lean();
    logg.info(`analytics length: ${analytics.length}`);
    // logg.info(`analytics: ${JSON.stringify(analytics)}`);
    logg.info(`ended`);
    return [analytics, null];
}

export const getAnalyticsFromDb = functionWrapper(
    fileName,
    "getAnalyticsFromDb",
    _getAnalyticsFromDb
);

async function _storeCampaignMessageSendAnalytic(
    {
        sessionId,
        messageResponse,
        messageStatus,
        spmsId,
        accountId,
        sequenceId,
        contactId,
        sequenceStepId,
        sequenceProspectId,
    },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    let analytic = new VisitorAnalytics({
        session_id: sessionId,
        app_type: AnalyticAppTypes.campaign,
        action_type: AnalyticActionTypes.campaign_message_send,
        analytic_metadata: {
            message_response: messageResponse,
            message_status: messageStatus,
        },
        sequence_prospect_message: spmsId,
        account: accountId,
        sequence: sequenceId,
        contact: contactId,
        sequence_step: sequenceStepId,
        sequence_prospect: sequenceProspectId,
    });

    let saveResp = await analytic.save();

    logg.info(`saveResp: ` + JSON.stringify(saveResp));
    logg.info(`ended`);
    return [saveResp, null];
}

export const storeCampaignMessageSendAnalytic = functionWrapper(
    fileName,
    "storeCampaignMessageSendAnalytic",
    _storeCampaignMessageSendAnalytic
);

async function _storeCampaignMessageOpenAnalytic(
    {
        sessionId,
        spmsId,
        accountId,
        sequenceId,
        contactId,
        sequenceStepId,
        sequenceProspectId,
    },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    let analytic = new VisitorAnalytics({
        session_id: sessionId,
        app_type: AnalyticAppTypes.campaign,
        action_type: AnalyticActionTypes.campaign_message_open,
        sequence_prospect_message: spmsId,
        account: accountId,
        sequence: sequenceId,
        contact: contactId,
        sequence_step: sequenceStepId,
        sequence_prospect: sequenceProspectId,
    });

    let saveResp = await analytic.save();

    logg.info(`saveResp: ` + JSON.stringify(saveResp));
    logg.info(`ended`);
    return [saveResp, null];
}

export const storeCampaignMessageOpenAnalytic = functionWrapper(
    fileName,
    "storeCampaignMessageOpenAnalytic",
    _storeCampaignMessageOpenAnalytic
);

async function _storeCampaignAutoMessageReplyOpenAnalytic(
    {
        sessionId,
        spmsId,
        accountId,
        sequenceId,
        contactId,
        sequenceStepId,
        sequenceProspectId,
        replyId,
        replyObj,
    },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    let analytic = new VisitorAnalytics({
        session_id: sessionId,
        app_type: AnalyticAppTypes.campaign,
        action_type: AnalyticActionTypes.campaign_message_auto_reply_open,
        sequence_prospect_message: spmsId,
        account: accountId,
        sequence: sequenceId,
        contact: contactId,
        sequence_step: sequenceStepId,
        sequence_prospect: sequenceProspectId,
        analytic_metadata: {
            reply_id: replyId,
            reply_obj: replyObj,
        },
    });

    let saveResp = await analytic.save();

    logg.info(`saveResp: ` + JSON.stringify(saveResp));
    logg.info(`ended`);
    return [saveResp, null];
}

export const storeCampaignAutoMessageReplyOpenAnalytic = functionWrapper(
    fileName,
    "storeCampaignAutoMessageReplyOpenAnalytic",
    _storeCampaignAutoMessageReplyOpenAnalytic
);

async function _getCampaignMessageAnalytics(
    { accountId, sequenceIds },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    if (!accountId) throw `accountId not found`;

    let [analytics, analyticsErr] = await getAnalyticsFromDb(
        { accountId, type: "campaign_message", sequenceIds },
        { txid }
    );
    if (analyticsErr) throw analyticsErr;

    logg.info(`analytics length: ${analytics.length}`);

    let result = {};
    let repliedMessageMap = {}; // if there were 5 replies within a thread, then we should count it as 1 reply. This map will help in that
    let openedMessageMap = {};

    for (const analytic of analytics) {
        let seqId = analytic.sequence;
        seqId = typeof seqId === "object" ? seqId.toString() : seqId;
        if (!result[seqId]) {
            result[seqId] = {
                contacted: 0,
                opened: 0,
                unique_opened: 0,
                clicked: 0,
                replied: 0,
                unique_replied: 0,
                booked: 0,
            };
        }

        let actionType = analytic.action_type;
        if (actionType === AnalyticActionTypes.campaign_message_send) {
            if (
                analytic.analytic_metadata &&
                analytic.analytic_metadata.message_status === "skipped"
            ) {
                // do not count as contacted
            } else {
                result[seqId].contacted++;
            }
        } else if (actionType === AnalyticActionTypes.campaign_message_open) {
            result[seqId].opened++;

            let sequenceProspectId = analytic.sequence_prospect;
            if (!openedMessageMap[sequenceProspectId]) {
                result[seqId].unique_opened++;
                openedMessageMap[sequenceProspectId] = true;
            }
        } else if (actionType === AnalyticActionTypes.campaign_message_reply) {
            if (
                analytic.analytic_metadata &&
                analytic.analytic_metadata.has_bounced
            ) {
                // do not count as replied
            } else {
                result[seqId].replied++;

                let sequenceProspectId = analytic.sequence_prospect;
                if (!repliedMessageMap[sequenceProspectId]) {
                    result[seqId].unique_replied++;
                    repliedMessageMap[sequenceProspectId] = true;
                }
            }
        }
        // else if (actionType === AnalyticActionTypes.link_open) {
        //     result[seqId].clicked++;
        // } else if (actionType === AnalyticActionTypes.book) {
        //     result[seqId].booked++;
        // }
    }

    for (const seqId of sequenceIds) {
        if (!result[seqId]) {
            result[seqId] = {
                contacted: 0,
                opened: 0,
                unique_opened: 0,
                clicked: 0,
                replied: 0,
                unique_replied: 0,
                booked: 0,
            };
        }
    }

    // logg.info(`result: ${JSON.stringify(result)}`);
    logg.info(`ended`);
    return [result, null];
}

export const getCampaignMessageAnalytics = functionWrapper(
    fileName,
    "getCampaignMessageAnalytics",
    _getCampaignMessageAnalytics
);

async function _getSequenceProspectAnalytics(
    { accountId, sequenceProspectId, formatInfo },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    if (!accountId) throw `accountId not found`;

    let [analytics, analyticsErr] = await getAnalyticsFromDb(
        { accountId, sequenceProspectId, type: "sequence_prospect" },
        { txid }
    );
    if (analyticsErr) throw analyticsErr;

    let result = [];
    let repliedMessageMap = {}; // if there were 5 replies within a thread, then we should count it as 1 reply. This map will help in that
    if (!formatInfo) {
        result = analytics;
    } else {
        for (const analytic of analytics) {
            let actionType = analytic.action_type;
            let messageStatus =
                analytic.analytic_metadata &&
                analytic.analytic_metadata.message_status;

            let actionStr = "";
            if (actionType === AnalyticActionTypes.campaign_message_send) {
                if (messageStatus === "skipped") {
                    actionStr = "sent_skipped";
                } else {
                    actionStr = "sent";
                }
            } else if (
                actionType === AnalyticActionTypes.campaign_message_open
            ) {
                actionStr = "opened";
            } else if (
                actionType === AnalyticActionTypes.campaign_message_reply
            ) {
                if (
                    analytic.analytic_metadata &&
                    analytic.analytic_metadata.has_bounced
                ) {
                    actionStr = "sent_bounced";
                } else {
                    let spmsId = analytic.sequence_prospect_message;
                    if (!repliedMessageMap[spmsId]) {
                        actionStr = "replied";
                        repliedMessageMap[spmsId] = true;
                    }
                }
            }

            if (actionStr) {
                let item = {
                    date_time: new Date(analytic.created_on).getTime(),
                    action_type: actionStr,
                };
                result.push(item);
            }
        }
    }

    logg.info(`result: ${JSON.stringify(result)}`);
    logg.info(`ended`);
    return [result, null];
}

export const getSequenceProspectAnalytics = functionWrapper(
    fileName,
    "getSequenceProspectAnalytics",
    _getSequenceProspectAnalytics
);

async function _getSequenceAnalytics(
    { accountId, sequenceId },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    if (!accountId) throw `accountId not found`;

    let [analytics, analyticsErr] = await getAnalyticsFromDb(
        { accountId, type: "campaign_message", sequenceIds: [sequenceId] },
        { txid }
    );
    if (analyticsErr) throw analyticsErr;

    logg.info(`analytics length: ${analytics.length}`);

    let repliedMessageMap = {}; // if there were 5 replies within a thread, then we should count it as 1 reply. This map will help in that

    let result = {};

    for (const analytic of analytics) {
        let seqStepId = analytic.sequence_step;
        seqStepId =
            typeof seqStepId === "object" ? seqStepId.toString() : seqStepId;

        if (!result[seqStepId]) {
            result[seqStepId] = {
                contacted: 0,
                delivered: 0,
                bounced: 0,
                opened: 0,
                skipped: 0,
                replied: 0,
            };
        }

        let actionType = analytic.action_type;
        if (actionType === AnalyticActionTypes.campaign_message_send) {
            // if (
            //     analytic.analytic_metadata &&
            //     analytic.analytic_metadata.message_status === "bounced"
            // ) {
            //     // this is for backward compactibility where bounced was stored in "campaign_message_send" action type
            //     result[seqStepId].bounced++;
            // } else
            if (
                analytic.analytic_metadata &&
                analytic.analytic_metadata.message_status === "skipped"
            ) {
                result[seqStepId].skipped++;
            } else {
                result[seqStepId].contacted++;
            }
        } else if (actionType === AnalyticActionTypes.campaign_message_open) {
            result[seqStepId].opened++;
        } else if (actionType === AnalyticActionTypes.campaign_message_reply) {
            if (
                analytic.analytic_metadata &&
                analytic.analytic_metadata.has_bounced
            ) {
                result[seqStepId].bounced++;
            } else {
                let spmsId = analytic.sequence_prospect_message;
                if (!repliedMessageMap[spmsId]) {
                    result[seqStepId].replied++;
                    repliedMessageMap[spmsId] = true;
                }
            }
        }
    }

    // calculate delivered using contacted - bounced - skipped
    for (const seqStepId in result) {
        let seqStepData = result[seqStepId];
        seqStepData.delivered = seqStepData.contacted - seqStepData.bounced;
    }

    logg.info(`result: ${JSON.stringify(result)}`);

    logg.info(`ended`);
    return [result, null];
}

export const getSequenceAnalytics = functionWrapper(
    fileName,
    "getSequenceAnalytics",
    _getSequenceAnalytics
);

async function _storeCampaignMessageReplyAnalytic(
    {
        sessionId,
        spmsId,
        accountId,
        sequenceId,
        contactId,
        sequenceStepId,
        sequenceProspectId,
        messageId,
        messageDetails,
        repliedOnDate,
        isFailed,
        replyToUserId,
    },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    let analyticMetadataObj = {
        message_id: messageId,
        message_details: messageDetails,
        has_bounced: isFailed ? true : false,
    };
    if (replyToUserId) {
        analyticMetadataObj.reply_to_user_id = replyToUserId;
    }
    let analytic = new VisitorAnalytics({
        session_id: sessionId,
        app_type: AnalyticAppTypes.campaign,
        action_type: AnalyticActionTypes.campaign_message_reply,
        analytic_metadata: analyticMetadataObj,
        sequence_prospect_message: spmsId,
        account: accountId,
        sequence: sequenceId,
        contact: contactId,
        sequence_step: sequenceStepId,
        sequence_prospect: sequenceProspectId,
        created_on: repliedOnDate || new Date(),
        updated_on: repliedOnDate || new Date(),
    });

    let saveResp = await analytic.save();

    logg.info(`saveResp: ` + JSON.stringify(saveResp));
    logg.info(`ended`);
    return [saveResp, null];
}

export const storeCampaignMessageReplyAnalytic = functionWrapper(
    fileName,
    "storeCampaignMessageReplyAnalytic",
    _storeCampaignMessageReplyAnalytic
);

async function _storeCampaignMessageUnsubscribeAnalytic(
    {
        sessionId,
        spmsId,
        accountId,
        sequenceId,
        contactId,
        sequenceStepId,
        sequenceProspectId,
    },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    let analytic = new VisitorAnalytics({
        session_id: sessionId,
        app_type: AnalyticAppTypes.campaign,
        action_type: AnalyticActionTypes.campaign_message_unsubscribe,
        sequence_prospect_message: spmsId,
        account: accountId,
        sequence: sequenceId,
        contact: contactId,
        sequence_step: sequenceStepId,
        sequence_prospect: sequenceProspectId,
    });

    let saveResp = await analytic.save();

    logg.info(`saveResp: ` + JSON.stringify(saveResp));
    logg.info(`ended`);
    return [saveResp, null];
}

export const storeCampaignMessageUnsubscribeAnalytic = functionWrapper(
    fileName,
    "storeCampaignMessageUnsubscribeAnalytic",
    _storeCampaignMessageUnsubscribeAnalytic
);

/*
* This will return an array of below structure:
    [{sequence_prospect,prospect_email,prospect_name,count,last_opened_on}]
* If sequenceStepId is not provided, then it will return the analytics for all the sequence steps.
* Else, it will return the analytics for the provided sequence step.
*/
async function _getSequenceOpenAnalytics(
    { accountId, sequenceId, sequenceStepId, sortByDescCount = false },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    if (!accountId) throw `accountId not found`;
    if (!sequenceId) throw `sequenceId not found`;

    let queryObj = {
        account: accountId,
        sequence: sequenceId,
        action_type: AnalyticActionTypes.campaign_message_open,
    };
    if (sequenceStepId) {
        queryObj.sequence_step = sequenceStepId;
    }

    let analytics = await VisitorAnalytics.find(queryObj)
        .populate("contact", "email first_name last_name")
        .sort("created_on")
        .lean();

    logg.info(`analytics length: ${analytics.length}`);
    if (!analytics || !analytics.length) {
        logg.info(`no open analytics found. So returning empty array`);
        return [[], null];
    }

    let sequenceProspectIdMap = {};
    let result = [];
    for (const analytic of analytics) {
        let sequenceProspectId = analytic.sequence_prospect;
        if (!sequenceProspectIdMap[sequenceProspectId]) {
            let firstName = analytic.contact.first_name;
            let lastName = analytic.contact.last_name;
            let prospectName = firstName || "";
            if (lastName) prospectName = prospectName + " " + lastName;
            prospectName = prospectName.trim();

            sequenceProspectIdMap[sequenceProspectId] = {
                sequence_prospect: sequenceProspectId,
                prospect_email: analytic.contact.email,
                prospect_name: prospectName,
                count: 0,
                last_opened_on: null,
            };
        }

        let sequenceProspectData = sequenceProspectIdMap[sequenceProspectId];
        sequenceProspectData.count++;
        let openedOnDate = new Date(analytic.created_on).getTime();
        if (!sequenceProspectData.last_opened_on) {
            sequenceProspectData.last_opened_on = openedOnDate;
        } else if (openedOnDate > sequenceProspectData.last_opened_on) {
            sequenceProspectData.last_opened_on = openedOnDate;
        }
    }

    for (const sequenceProspectId in sequenceProspectIdMap) {
        result.push(sequenceProspectIdMap[sequenceProspectId]);
    }

    if (sortByDescCount && result.length) {
        result = result.sort((a, b) => b.count - a.count);
    }

    logg.info(`result: ${JSON.stringify(result)}`);

    logg.info(`ended`);
    return [result, null];
}

export const getSequenceOpenAnalytics = functionWrapper(
    fileName,
    "getSequenceOpenAnalytics",
    _getSequenceOpenAnalytics
);

/*
* This will return an array of below structure:
    [{sequence_prospect_message,prospect_email,prospect_name,reply,replied_on}]
* If sequenceStepId is not provided, then it will return the analytics for all the sequence steps.
* Else, it will return the analytics for the provided sequence step.
*/
async function _getSequenceReplyAnalytics(
    { accountId, sequenceId, sequenceStepId, sortDescByTime = false },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    if (!accountId) throw `accountId not found`;
    if (!sequenceId) throw `sequenceId not found`;

    let queryObj = {
        account: accountId,
        sequence: sequenceId,
        action_type: AnalyticActionTypes.campaign_message_reply,
        "analytic_metadata.has_bounced": { $ne: true },
    };
    if (sequenceStepId) {
        queryObj.sequence_step = sequenceStepId;
    }

    let analytics = await VisitorAnalytics.find(queryObj)
        .populate("contact", "email first_name last_name")
        .sort("created_on")
        .lean();

    logg.info(`analytics length: ${analytics.length}`);
    if (!analytics || !analytics.length) {
        logg.info(`no reply analytics found. So returning empty array`);
        return [[], null];
    }

    // sort ascending order
    analytics = analytics.sort((a, b) => {
        let aReplyDate = getReplyAnalyticDate({ analytic: a }, { txid });
        let bReplyDate = getReplyAnalyticDate({ analytic: b }, { txid });

        if (!aReplyDate) {
            aReplyDate = new Date(a.created_on).getTime();
        }
        if (!bReplyDate) {
            bReplyDate = new Date(b.created_on).getTime();
        }

        return aReplyDate - bReplyDate;
    });

    let result = [];
    let repliedMessageMap = {}; // if there were 5 replies within a thread, then we should count it as 1 reply. This map will help in that

    for (const analytic of analytics) {
        let sequenceProspectMessageId = analytic.sequence_prospect_message;

        if (repliedMessageMap[sequenceProspectMessageId]) {
            continue;
        }

        repliedMessageMap[sequenceProspectMessageId] = true;

        let firstName = analytic.contact.first_name;
        let lastName = analytic.contact.last_name;
        let prospectName = firstName || "";
        if (lastName) prospectName = prospectName + " " + lastName;
        prospectName = prospectName.trim();

        let formattedMessage = formatEmail(
            { message: analytic.analytic_metadata.message_details },
            { txid }
        );

        let item = {
            sequence_prospect_message: sequenceProspectMessageId,
            prospect_email: analytic.contact.email,
            prospect_name: prospectName,
            reply: formattedMessage,
            replied_on: new Date(analytic.created_on).getTime(),
        };

        result.push(item);
    }

    if (sortDescByTime && result.length) {
        result = result.sort((a, b) => b.replied_on - a.replied_on);
    }

    logg.info(`result: ${JSON.stringify(result)}`);

    logg.info(`ended`);
    return [result, null];
}

export const getSequenceReplyAnalytics = functionWrapper(
    fileName,
    "getSequenceReplyAnalytics",
    _getSequenceReplyAnalytics
);

function getReplyAnalyticDate({ analytic: a }, { txid }) {
    const funcName = `getReplyAnalyticDate`;
    const logg = logger.child({ txid, funcName });
    // logg.info(`started`);

    let aHeaders =
        a &&
        a.analytic_metadata &&
        a.analytic_metadata.message_details &&
        a.analytic_metadata.message_details.payload &&
        a.analytic_metadata.message_details.payload.headers;

    let dateMillis = null;
    if (aHeaders && aHeaders.length) {
        let aDateHeader = aHeaders.find((x) => x.name === "Date");
        if (aDateHeader) {
            let dateStr = aDateHeader.value;
            try {
                dateMillis = new Date(dateStr).getTime();
            } catch (e) {
                logg.error(`failed to parse dateStr: ${dateStr}`);
            }
        }
    }

    logg.info(`dateMillis: ${dateMillis}`);
    // logg.info(`ended`);
    return dateMillis;
}

function formatEmail({ message }, { txid }) {
    const funcName = `formatEmail`;
    const logg = logger.child({ txid, funcName });
    logg.info(`started`);
    let formattedMessage = message;
    if (!message) {
        logg.info(`message is empty`);
        return "";
    }

    let messageSnippet = message.snippet || "";

    formattedMessage = messageSnippet;

    logg.info(`formattedMessage: ${formattedMessage}`);
    logg.info(`ended`);
    return formattedMessage;
}

async function _hasSequenceMessgeBounced({ spmsId }, { txid, logg, funcName }) {
    logg.info(`started`);
    if (!spmsId) throw `spmsId not found`;

    let queryObj = {
        sequence_prospect_message: spmsId,
        action_type: AnalyticActionTypes.campaign_message_reply,
        "analytic_metadata.has_bounced": true,
    };
    logg.info(`queryObj: ${JSON.stringify(queryObj)}`);
    let analytics = await VisitorAnalytics.find(queryObj).lean();
    logg.info(`analytics length: ${analytics.length}`);
    if (analytics.length < 20) {
        logg.info(`analytics: ${JSON.stringify(analytics)}`);
    }

    let hasBounced = false;

    if (analytics && analytics.length) {
        hasBounced = true;
    }

    logg.info(`hasBounced: ${hasBounced}`);
    logg.info(`ended`);
    return [hasBounced, null];
}

export const hasSequenceMessgeBounced = functionWrapper(
    fileName,
    "hasSequenceMessgeBounced",
    _hasSequenceMessgeBounced
);

/*
    return data structure: {
        sequence_step_id: {
            opened: {
                total_count: 0,
                unique_count: 0,
                prospects: [{ email, count, last_opened_on }]
            }
            replied: {
                total_count: 0,
                prospects: [{ email, replied_on, reply }]
            }
        }
    }
*/
async function _getSequenceStepAnalyticsForOpenAndReply(
    { sequenceId, accountId },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    if (!sequenceId) throw `sequenceId not found`;
    if (!accountId) throw `accountId not found`;

    let openQueryObj = {
        account: accountId,
        sequence: sequenceId,
        action_type: AnalyticActionTypes.campaign_message_open,
    };

    let openAnalytics = await VisitorAnalytics.find(openQueryObj)
        .populate("contact", "email")
        .sort("created_on")
        .lean();

    // check for replies with has_bounced not true
    let replyQueryObj = {
        account: accountId,
        sequence: sequenceId,
        action_type: AnalyticActionTypes.campaign_message_reply,
        "analytic_metadata.has_bounced": { $ne: true },
    };

    let replyAnalytics = await VisitorAnalytics.find(replyQueryObj)
        .populate("contact", "email")
        .sort("created_on")
        .lean();

    let result = {};

    let emptyObj = {
        opened: {
            total_count: 0,
            unique_count: 0,
            prospects: [],
        },
        replied: {
            total_count: 0,
            prospects: [],
        },
    };
    for (const openAnalytic of openAnalytics) {
        let sequenceStepId = openAnalytic.sequence_step;

        if (!result[sequenceStepId]) {
            // deep copy emptyObj
            result[sequenceStepId] = JSON.parse(JSON.stringify(emptyObj));
        }

        let contactEmail = openAnalytic.contact.email;
        let analyticDate = new Date(openAnalytic.created_on).getTime();

        let openedObj = result[sequenceStepId].opened;
        openedObj.total_count++;
        if (!openedObj.prospects.find((obj) => obj.email === contactEmail)) {
            openedObj.unique_count++;
            openedObj.prospects.push({
                email: contactEmail,
                count: 1,
                last_opened_on: analyticDate,
            });
        } else {
            let prospect = openedObj.prospects.find(
                (obj) => obj.email === contactEmail
            );
            prospect.count++;
            if (analyticDate > prospect.last_opened_on) {
                prospect.last_opened_on = analyticDate;
            }
        }
    }

    let repliedMessageMap = {}; // if there were 5 replies within a thread, then we should count it as 1 reply. This map will help in that

    for (const replyAnalytic of replyAnalytics) {
        let spmsId = replyAnalytic.sequence_prospect_message;
        if (repliedMessageMap[spmsId]) {
            continue;
        }
        repliedMessageMap[spmsId] = true;

        let sequenceStepId = replyAnalytic.sequence_step;

        if (!result[sequenceStepId]) {
            result[sequenceStepId] = JSON.parse(JSON.stringify(emptyObj));
        }

        let contactEmail = replyAnalytic.contact.email;
        let analyticDate = new Date(replyAnalytic.created_on).getTime();

        let repliedObj = result[sequenceStepId].replied;
        repliedObj.total_count++;
        let formattedMessage = formatEmail(
            { message: replyAnalytic.analytic_metadata.message_details },
            { txid }
        );
        repliedObj.prospects.push({
            email: contactEmail,
            replied_on: analyticDate,
            reply: formattedMessage,
        });
    }

    logg.info(`result: ${JSON.stringify(result)}`);
    logg.info(`ended`);
    return [result, null];
}

export const getSequenceStepAnalyticsForOpenAndReply = functionWrapper(
    fileName,
    "getSequenceStepAnalyticsForOpenAndReply",
    _getSequenceStepAnalyticsForOpenAndReply
);

async function _checkIfAnySequenceMessageOpensFound(
    { sequenceId, accountId, sequenceStepIds, spmsIds, returnOpenMap = false },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    if (!sequenceId) throw `sequenceId not found`;
    if (!accountId) throw `accountId not found`;

    let openQueryObj = {
        account: accountId,
        sequence: sequenceId,
        action_type: AnalyticActionTypes.campaign_message_open,
    };
    if (sequenceStepIds && sequenceStepIds.length) {
        openQueryObj.sequence_step = { $in: sequenceStepIds };
    }
    if (spmsIds && spmsIds.length) {
        openQueryObj.sequence_prospect_message = { $in: spmsIds };
    }

    let openAnalytics = await VisitorAnalytics.find(openQueryObj);
    let openAnalyticsCount = openAnalytics.length;
    logg.info(`openAnalyticsCount: ${openAnalyticsCount}`);

    let hasOpens = openAnalyticsCount > 0;

    if (!returnOpenMap) {
        logg.info(`ended`);
        return [hasOpens, null];
    }

    if (!hasOpens) {
        logg.info(`ended`);
        return [null, null];
    }

    let openMap = {}; // map of spmsId -> count
    for (const openAnalytic of openAnalytics) {
        let spmsId = openAnalytic.sequence_prospect_message;
        if (!openMap[spmsId]) {
            openMap[spmsId] = 0;
        }
        openMap[spmsId]++;
    }

    logg.info(`ended`);
    return [openMap, null];
}

export const checkIfAnySequenceMessageOpensFound = functionWrapper(
    fileName,
    "checkIfAnySequenceMessageOpensFound",
    _checkIfAnySequenceMessageOpensFound
);

async function _checkIfAutoReplyAlreadySent(
    { sequenceId, accountId, spmsIds },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    if (!sequenceId) throw `sequenceId not found`;
    if (!accountId) throw `accountId not found`;

    let queryObj = {
        account: accountId,
        sequence: sequenceId,
        action_type: AnalyticActionTypes.campaign_message_auto_reply,
    };
    if (spmsIds && spmsIds.length) {
        queryObj.sequence_prospect_message = { $in: spmsIds };
    }

    let analytics = await VisitorAnalytics.find(queryObj);
    let hasAutoReplySent = analytics.length > 0;

    logg.info(`hasAutoReplySent: ${hasAutoReplySent}`);
    logg.info(`ended`);
    return [hasAutoReplySent, null];
}

export const checkIfAutoReplyAlreadySent = functionWrapper(
    fileName,
    "checkIfAutoReplyAlreadySent",
    _checkIfAutoReplyAlreadySent
);

async function _storeAutoCampaignMessageReplyAnalytic(
    {
        sessionId,
        spmsId,
        accountId,
        sequenceId,
        contactId,
        sequenceStepId,
        sequenceProspectId,
        replyId,
        replyObj,
        repliedOnDate,
        originalReplyId,
        updateAutoDraftReply,
    },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    let amDoc = {
        reply_id: replyId,
        reply_obj: replyObj,
    };
    if (originalReplyId) {
        amDoc.original_reply_id = originalReplyId;
    }
    if (updateAutoDraftReply) {
        amDoc.is_auto_draft_reply = true;
    }
    let analytic = new VisitorAnalytics({
        session_id: sessionId,
        app_type: AnalyticAppTypes.campaign,
        action_type: AnalyticActionTypes.campaign_message_auto_reply,
        analytic_metadata: amDoc,
        sequence_prospect_message: spmsId,
        account: accountId,
        sequence: sequenceId,
        contact: contactId,
        sequence_step: sequenceStepId,
        sequence_prospect: sequenceProspectId,
        created_on: repliedOnDate || new Date(),
        updated_on: repliedOnDate || new Date(),
    });

    let saveResp = await analytic.save();

    logg.info(`saveResp: ` + JSON.stringify(saveResp));
    logg.info(`ended`);
    return [saveResp, null];
}

export const storeAutoCampaignMessageReplyAnalytic = functionWrapper(
    fileName,
    "storeAutoCampaignMessageReplyAnalytic",
    _storeAutoCampaignMessageReplyAnalytic
);

async function _getAutoReplyDraftInfos(
    { accountId, sortByCreatedOnDesc = true },
    { txid, logg, funcName }
) {
    logg.info(`started`);

    let queryObj = {
        account: accountId,
        action_type: AnalyticActionTypes.campaign_message_reply,
        "analytic_metadata.auto_reply_draft.status": "generated",
    };

    let analytics = await VisitorAnalytics.find(queryObj);
    logg.info(`analytics.length: ${analytics.length}`);

    if (sortByCreatedOnDesc) {
        analytics.sort(
            (a, b) =>
                (b.updated_on || b.created_on) - (a.updated_on || a.created_on)
        );
    }

    let draftInfos = analytics.map((analytic) => {
        let msgDetails = analytic.analytic_metadata.message_details;
        let userMsg = GoogleUtils.parseEmailMessage(
            { messageData: msgDetails },
            { txid }
        );
        return {
            _id: analytic._id,
            tag: analytic.analytic_metadata.auto_reply_draft.tag,
            draft: analytic.analytic_metadata.auto_reply_draft.draft,
            user_message: userMsg,
        };
    });

    logg.info(`draftInfos: ${JSON.stringify(draftInfos)}`);

    logg.info(`ended`);
    return [draftInfos, null];
}

export const getAutoReplyDraftInfos = functionWrapper(
    fileName,
    "getAutoReplyDraftInfos",
    _getAutoReplyDraftInfos
);

async function getSequenceReplyAnalytic(
    { accountId, replyAnalyticId },
    { txid, logg, funcName }
) {
    logg.info(`started`);

    let queryObj = {
        account: accountId,
        action_type: AnalyticActionTypes.campaign_message_reply,
        _id: replyAnalyticId,
    };

    let analytic = await VisitorAnalytics.findOne(queryObj).lean();
    logg.info(`analytic: ${JSON.stringify(analytic)}`);

    logg.info(`ended`);
    return [analytic, null];
}

export const getSequenceReplyAnalytic = functionWrapper(
    fileName,
    "getSequenceReplyAnalytic",
    _getSequenceReplyAnalytic
);
