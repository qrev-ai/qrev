import momenttz from "moment-timezone";
import { v4 as uuidv4 } from "uuid";
import { functionWrapper } from "../../std/wrappers.js";
import CustomError from "../../std/custom.error.js";
import { logger } from "../../logger.js";
import { reportErrorToQRevTeam } from "../../std/report.error.js";
import * as ZeroBounceUtils from "./zerobounce.utils.js";

const fileName = "Prospect Verify Utils";

async function _verifyProspectsEmails(
    { prospects, serviceName, campaignSequenceId, accountId },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    if (!prospects || !prospects.length) {
        logg.error(`No prospects found`);
        return [[], null];
    }
    if (!serviceName)
        throw `Service name is required to verify prospects email`;

    let resultProspects = [];
    let prospectEmails = prospects.map((p) => p.prospect_email);
    let prospectVerifyFileId = null;
    if (serviceName === "zerobounce") {
        let [zbResult, error] = await ZeroBounceUtils.verifyProspectsEmails(
            { prospectEmails, campaignSequenceId, accountId },
            { txid }
        );
        if (error) throw error;
        let { resultEmails, prospectVerifyFileId: zbFileId } = zbResult;
        prospectVerifyFileId = zbFileId;
        let resultProspectSet = new Set(resultEmails);
        resultProspects = prospects.filter((p) =>
            resultProspectSet.has(p.prospect_email)
        );
    } else {
        throw `Service ${serviceName} is not supported`;
    }
    logg.info(`ended`);

    let result = { resultProspects, prospectVerifyFileId };
    return [result, null];
}

export const verifyProspectsEmails = functionWrapper(
    fileName,
    "verifyProspectsEmails",
    _verifyProspectsEmails
);

async function _prospectBounceWebhook(
    { serviceName, secretId, prospectVerifyFileId, accountId },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    if (!serviceName)
        throw `Service name is required to verify prospects email`;

    let result = null;
    if (serviceName === "zerobounce") {
        let [zbResult, error] = await ZeroBounceUtils.prospectBounceWebhook(
            { secretId, prospectVerifyFileId, accountId },
            { txid }
        );
        if (error) throw error;
        result = zbResult;
    } else {
        throw `Service ${serviceName} is not supported`;
    }
    logg.info(`ended`);
    return [result, null];
}

export const prospectBounceWebhook = functionWrapper(
    fileName,
    "prospectBounceWebhook",
    _prospectBounceWebhook
);
