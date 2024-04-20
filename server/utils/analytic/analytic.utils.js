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
    { accountId, type, timeRange, data, sequenceIds },
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
            result[seqId].contacted++;
        } else if (actionType === AnalyticActionTypes.campaign_message_open) {
            result[seqId].opened++;
        } else if (actionType === AnalyticActionTypes.campaign_message_reply) {
            result[seqId].replied++;
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

    return [result, null];
}

export const getCampaignMessageAnalytics = functionWrapper(
    fileName,
    "getCampaignMessageAnalytics",
    _getCampaignMessageAnalytics
);
