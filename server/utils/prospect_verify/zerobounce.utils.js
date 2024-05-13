import csv from "csv-parser";
import { Readable } from "stream";
import axios from "axios";
import momenttz from "moment-timezone";
import { v4 as uuidv4 } from "uuid";
import { functionWrapper } from "../../std/wrappers.js";
import CustomError from "../../std/custom.error.js";
import { logger } from "../../logger.js";
import { reportErrorToQRevTeam } from "../../std/report.error.js";
import { ProspectEmailVerifyModel } from "../../models/prospect_verify/prospect.email.verify.model.js";
import * as FileUtils from "../std/file.utils.js";
import FormData from "form-data";

const fileName = "Zero Bounce Utils";

async function _verifyProspectsEmails(
    { prospectEmails, campaignSequenceId, accountId },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    let [cachedResult, cacheErr] = await getCachedProspectsFromDb(
        { prospectEmails, accountId },
        { txid }
    );
    if (cacheErr) throw cacheErr;

    let { cachedVerifiedEmails, uncachedEmails } = cachedResult;

    let zeroBounceFileId = null;

    if (uncachedEmails && uncachedEmails.length) {
        let [fileId, sendErr] = await bulkEmailVerificationRequest(
            { prospectEmails: uncachedEmails, campaignSequenceId, accountId },
            { txid }
        );
        if (sendErr) throw sendErr;
        zeroBounceFileId = fileId;
    }

    // combine uncached emails with cached verified emails
    let resultEmails = [...cachedVerifiedEmails, ...uncachedEmails];

    let result = { resultEmails, prospectVerifyFileId: zeroBounceFileId };

    logg.info(`ended`);
    return [result, null];
}

export const verifyProspectsEmails = functionWrapper(
    fileName,
    "zb-verifyProspectsEmails",
    _verifyProspectsEmails
);

async function _getCachedProspectsFromDb(
    { prospectEmails, cachedBeforeDays = 30, accountId },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    let cachedVerifiedEmails = [];
    let uncachedEmails = [];
    let cachedUnverifiedEmails = [];

    let currentTimeMillis = Date.now();
    let query = {
        email: { $in: prospectEmails },
        updated_on: {
            $gte: new Date(
                currentTimeMillis - cachedBeforeDays * 24 * 60 * 60 * 1000
            ),
        },
    };

    let cachedProspects = await ProspectEmailVerifyModel.find(query).lean();

    let cachedProspectsMap = new Map();
    cachedProspects.forEach((p) => {
        cachedProspectsMap.set(p.email, p);
    });

    prospectEmails.forEach((email) => {
        let cachedProspect = cachedProspectsMap.get(email);
        if (cachedProspect) {
            if (cachedProspect.is_valid) {
                cachedVerifiedEmails.push(email);
            } else {
                cachedUnverifiedEmails.push(email);
            }
        } else {
            uncachedEmails.push(email);
        }
    });

    if (accountId) {
        // update connected_to_account_ids for all cached prospects
        let cachedEmails = cachedProspects.map((p) => p.email);
        let updateQuery = {
            email: { $in: cachedEmails },
        };
        let updateObj = {
            $addToSet: { connected_to_account_ids: accountId },
        };

        let updateResp = await ProspectEmailVerifyModel.updateMany(
            updateQuery,
            updateObj
        );
        logg.info(
            `Updated connected_to_account_ids for cached prospects: ${JSON.stringify(
                updateResp
            )}`
        );
    }

    logg.info(`ended`);
    let result = {
        cachedVerifiedEmails,
        uncachedEmails,
        cachedUnverifiedEmails,
    };
    return [result, null];
}

const getCachedProspectsFromDb = functionWrapper(
    fileName,
    "zb-getCachedProspectsFromDb",
    _getCachedProspectsFromDb
);

async function _bulkEmailVerificationRequest(
    { prospectEmails, campaignSequenceId, accountId },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    if (!campaignSequenceId) throw `campaignSequenceId is required`;

    let zbApiKey = process.env.ZERO_BOUNCE_API_KEY;
    if (!zbApiKey) throw `ZERO_BOUNCE_API_KEY is not set`;

    let zbQrevSecretId = process.env.QREV_ZEROBOUNCE_SECRET_ID;
    if (!zbQrevSecretId) throw `QREV_ZEROBOUNCE_SECRET_ID is not set`;

    let url = "https://bulkapi.zerobounce.net/v2/sendfile";

    // create a file with 1 column "email" and rows as emails
    let fileContent = "email\n";
    prospectEmails.forEach((email) => {
        fileContent += `${email}\n`;
    });
    let fileName = `zb_${campaignSequenceId}.csv`;
    let filePath = `data/temp/${fileName}`;
    let [fileReadSteam, fileErr] = await FileUtils.createTempFile(
        { fileContent, filePath, returnReadStream: true },
        { txid }
    );
    if (fileErr) throw fileErr;

    let serverPath = process.env.SERVER_URL_PATH;
    let asyncApiUrl = `${serverPath}/api/campaign/sequence/prospect/bounce_webhook`;
    asyncApiUrl += `?cs_id=${campaignSequenceId}&service_name=zerobounce&secret_id=${zbQrevSecretId}&account_id=${accountId}`;

    const formData = new FormData();
    formData.append("api_key", zbApiKey);
    formData.append("return_url", asyncApiUrl);
    formData.append("email_address_column", "1");
    formData.append("file", fileReadSteam);

    // send request to zerobounce with field api_key and "file" (a file with emails with heading "email")
    let headers = { headers: { ...formData.getHeaders() } };
    logg.info(`headers: ${JSON.stringify(headers)}`);

    let response = await axios.post(url, formData, headers);

    logg.info(`response data: ${JSON.stringify(response.data)}`);

    // delete the file
    let [deleteResp, deleteErr] = await FileUtils.deleteFile(
        { filePath },
        { txid }
    );
    if (deleteErr) throw deleteErr;

    let respData = response.data;

    let fileId = respData && respData.file_id;
    logg.info(`ended`);
    return [fileId, null];
}

const bulkEmailVerificationRequest = functionWrapper(
    fileName,
    "zb-bulkEmailVerificationRequest",
    _bulkEmailVerificationRequest
);

async function _prospectBounceWebhook(
    { secretId, prospectVerifyFileId, accountId },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    if (!secretId) throw `secretId is required`;
    if (!prospectVerifyFileId) throw `prospectVerifyFileId is required`;

    let zbQrevSecretId = process.env.QREV_ZEROBOUNCE_SECRET_ID;
    if (!zbQrevSecretId) throw `QREV_ZEROBOUNCE_SECRET_ID is not set`;

    if (secretId !== zbQrevSecretId) throw `Invalid secretId`;

    let validProspectEmails = [],
        invalidProspectEmails = [];

    let [prospectsData, fileErr] = await getFileFromZeroBounce(
        { prospectVerifyFileId },
        { txid }
    );
    if (fileErr) throw fileErr;

    if (prospectsData && prospectsData.length) {
        if (prospectsData.length < 10) {
            logg.info(`prospect data: ${prospectsData}`);
        }

        validProspectEmails = prospectsData
            .filter((p) => p.is_valid)
            .map((p) => p.email);

        invalidProspectEmails = prospectsData
            .filter((p) => !p.is_valid)
            .map((p) => p.email);
    }

    let [cacheResp, cacheErr] = await cacheProspectsFromZeroBounceFile(
        { prospectsData, accountId },
        { txid }
    );
    if (cacheErr) throw cacheErr;

    let [zbDeleteResp, zbDeleteErr] = await deleteFileFromZeroBounce(
        { prospectVerifyFileId },
        { txid }
    );
    if (zbDeleteErr) throw zbDeleteErr;

    let result = { validProspectEmails, invalidProspectEmails };

    logg.info(`ended`);
    return [result, null];
}

export const prospectBounceWebhook = functionWrapper(
    fileName,
    "zb-prospectBounceWebhook",
    _prospectBounceWebhook
);

async function _getFileFromZeroBounce(
    { prospectVerifyFileId },
    { txid, logg, funcName }
) {
    logg.info(`started`);

    let zbApiKey = process.env.ZERO_BOUNCE_API_KEY;
    if (!zbApiKey) throw `ZERO_BOUNCE_API_KEY is not set`;

    let url = `https://bulkapi.zerobounce.net/v2/getfile?api_key=${zbApiKey}&file_id=${prospectVerifyFileId}`;

    let response = await axios.get(url);

    let fileContent = response.data;

    let result = await convertCsvStringToArrayOfObjects(fileContent);

    result = result.map((r) => {
        let item = {
            email: r["Email Address"] || "",
            sub_status: r["ZB Sub Status"] || "",
            mx_record: r["ZB MX Record"] || "",
            smtp_provider: r["ZB SMTP Provider"] || "",
        };

        if (r["ZB Status"] && r["ZB Status"].toLowerCase() === "valid") {
            item.is_valid = true;
        } else {
            item.is_valid = false;
        }

        if (r["ZB Free Email"] && r["ZB Free Email"].toLowerCase() === "true") {
            item.is_free_email = true;
        } else {
            item.is_free_email = false;
        }

        if (r["ZB MX Found"] && r["ZB MX Found"].toLowerCase() === "true") {
            item.is_mx_found = true;
        } else {
            item.is_mx_found = false;
        }
        return item;
    });
    logg.info(`ended`);
    return [result, null];
}

const getFileFromZeroBounce = functionWrapper(
    fileName,
    "zb-getFileFromZeroBounce",
    _getFileFromZeroBounce
);

async function _deleteFileFromZeroBounce(
    { prospectVerifyFileId },
    { txid, logg, funcName }
) {
    logg.info(`started`);

    let zbApiKey = process.env.ZERO_BOUNCE_API_KEY;
    if (!zbApiKey) throw `ZERO_BOUNCE_API_KEY is not set`;

    let url = `https://bulkapi.zerobounce.net/v2/deletefile?api_key=${zbApiKey}&file_id=${prospectVerifyFileId}`;

    let response = await axios.get(url);

    logg.info(`response data: ${JSON.stringify(response.data)}`);

    logg.info(`ended`);
    return [true, null];
}

const deleteFileFromZeroBounce = functionWrapper(
    fileName,
    "zb-deleteFileFromZeroBounce",
    _deleteFileFromZeroBounce
);

async function _cacheProspectsFromZeroBounceFile(
    { prospectsData, accountId },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    /*
    * format of prospectsData:
        [
            {
                email: ".."
                is_valid: true
                sub_status: "..",
                is_free_email: true,
                is_mx_found: true,
                mx_record: "..",
                smtp_provider: "..",

            }
        ]
    */

    prospectsData = prospectsData.map((p) => {
        p.updated_on = new Date();
        p.verifier_service = "zerobounce";
        return p;
    });

    // upsert prospects data in db (through bulk insert)
    // also add accountId to connected_to_account_ids for all prospects

    let bulkUpdateData = prospectsData.map((p) => {
        return {
            updateOne: {
                filter: { email: p.email },
                update: {
                    $set: p,
                    $addToSet: { connected_to_account_ids: accountId },
                },
                upsert: true,
            },
        };
    });

    // if bulkUpdateData is less than 10, then log it
    if (bulkUpdateData.length < 10) {
        logg.info(`Bulk update data: ${JSON.stringify(bulkUpdateData)}`);
    }

    let updateResp = await ProspectEmailVerifyModel.bulkWrite(bulkUpdateData);

    logg.info(`update response: ${JSON.stringify(updateResp)}`);

    logg.info(`ended`);
    return [updateResp, null];
}

const cacheProspectsFromZeroBounceFile = functionWrapper(
    fileName,
    "zb-cacheProspectsFromZeroBounceFile",
    _cacheProspectsFromZeroBounceFile
);

function convertCsvStringToArrayOfObjects(csvString) {
    const csvStream = Readable.from([csvString]);
    const results = [];

    return new Promise((resolve, reject) => {
        csvStream
            .pipe(csv())
            .on("data", (data) => results.push(data))
            .on("end", () => resolve(results))
            .on("error", (error) => reject(error));
    });
}
