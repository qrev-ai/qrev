import _ from "lodash";
import { functionWrapper } from "../../std/wrappers.js";
import CustomError from "../../std/custom.error.js";
import { logger } from "../../logger.js";
import { VisitorAnalytics } from "../../models/analytic/visitor.analytic.model.js";
import {
    AnalyticActionTypes,
    AnalyticAppTypes,
} from "../../config/analytic.config.js";

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

    for (const analytic of analytics) {
        let seqId = analytic.sequence;
        seqId = typeof seqId === "object" ? seqId.toString() : seqId;
        if (!result[seqId]) {
            result[seqId] = {
                contacted: 0,
                opened: 0,
                clicked: 0,
                replied: 0,
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
        } else if (actionType === AnalyticActionTypes.campaign_message_reply) {
            if (
                analytic.analytic_metadata &&
                analytic.analytic_metadata.has_bounced
            ) {
                // do not count as replied
            } else {
                let spmsId = analytic.sequence_prospect_message;
                if (!repliedMessageMap[spmsId]) {
                    result[seqId].replied++;
                    repliedMessageMap[spmsId] = true;
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
                clicked: 0,
                replied: 0,
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
