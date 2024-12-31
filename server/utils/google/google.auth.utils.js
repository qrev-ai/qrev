import { reportErrorToQRevTeam } from "../../std/report.error.js";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import { google } from "googleapis";
import qs from "qs";
import { logger } from "../../logger.js";
import * as GoogleAuthDbUtils from "./google.auth.db.utils.js";
import { functionWrapper } from "../../std/wrappers.js";
import { GoogleOauth } from "../../models/auth/google.oauth.model.js";
import { GooglePubSubPushData } from "../../models/google/google.pubsub.push.data.model.js";
import { GooglePubSubConfig } from "../../config/google.pubsub.config.js";
import GmailParseMessage from "gmail-api-parse-message";

const fileName = "Google Auth Utils";

async function _exchangeCodeForTokens({ oauthCode }, { logg, txid, funcName }) {
    logg.info(`started`);

    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
    const GOOGLE_AUTH_SCOPES = [
        "https://www.googleapis.com/auth/gmail.send",
        "https://www.googleapis.com/auth/gmail.readonly",
    ];
    let redirectUrl = getRedirectUri();
    const oauth2Client = new google.auth.OAuth2(
        GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET,
        redirectUrl
    );
    oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: GOOGLE_AUTH_SCOPES.join(" "),
    });
    const googleResponse = await oauth2Client.getToken(oauthCode);
    let { tokens } = googleResponse;
    logg.info(`tokens`, tokens);
    oauth2Client.setCredentials(tokens);

    logg.info(`ended`);
    return [tokens, null];
}

export const exchangeCodeForTokens = functionWrapper(
    fileName,
    "exchangeCodeForTokens",
    _exchangeCodeForTokens
);

function getRedirectUri() {
    if (process.env.ENVIRONMENT_TYPE === "dev") {
        return process.env.LOCAL_GOOGLE_AUTH_REDIRECT_URL;
    }
    return process.env.GOOGLE_AUTH_REDIRECT_URL;
}

async function _getUserInfo({ accessToken }, { logg, txid, funcName }) {
    logg.info(`started`);
    const GOOGLE_PROFILE_URL = "https://www.googleapis.com/userinfo/v2/me";
    const result = await axios.get(GOOGLE_PROFILE_URL, {
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
        },
    });
    logg.info(`result: `, result.data);
    logg.info(`ended`);
    return [result.data, null];
}

export const getUserInfo = functionWrapper(
    fileName,
    "getUserInfo",
    _getUserInfo
);

async function _saveAuth(
    {
        tokens,
        userInfo,
        state,
        native,
        deviceId,
        deviceType,
        userId,
        newVersion,
    },
    { logg, txid, funcName }
) {
    logg.info(`started`);
    if (userId) {
        logg.info("Since userId valid, upserting by email and device_id");
        logg.info(
            "This means user trying to link multiple google accounts or same account"
        );
        let [authObj, upsertDbErr] = await GoogleAuthDbUtils.upsertUser(
            {
                queryObj: { email: userInfo.email, device_id: deviceId },
                updateObj: {
                    state,
                    id_token: tokens.id_token,
                    access_token: tokens.access_token,
                    refresh_token: tokens.refresh_token,
                    expiry: tokens.expiry_date,
                    created_on: new Date(),
                    user_id: userId,
                    device_type: deviceType,
                    name: userInfo.name,
                },
                options: {
                    new: true,
                    upsert: true,
                },
            },
            { txid }
        );
        if (upsertDbErr) {
            throw upsertDbErr;
        }
        logg.info(`upserted-authObj`, authObj);
    } else {
        await GoogleAuthDbUtils.createAuth(
            {
                email: userInfo.email,
                device_id: deviceId,
                state,
                id_token: tokens.id_token,
                scope: tokens.scope,
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
                expiry: tokens.expiry_date,
                created_on: new Date(),
                device_type: deviceType,
                name: userInfo.name,
            },
            { txid }
        );
    }
    logg.info(`ended`);
    return [true, null];
}

export const saveAuth = functionWrapper(fileName, "saveAuth", _saveAuth);

async function _refreshOrReturnToken(
    { authObj, email, userId, returnBackAuthObj },
    { logg, txid, funcName }
) {
    logg.info(`started`);
    if (!authObj) {
        let queryObj = {};
        if (email) {
            queryObj.email = email;
        } else if (userId) {
            queryObj.user_id = userId;
        } else {
            throw `email or userId not found`;
        }
        authObj = await GoogleOauth.findOne(queryObj).sort("-expiry").lean();
        logg.info(`authObj: ${JSON.stringify(authObj)}`);
    }

    if (!authObj) throw `invalid authObj`;
    let accessToken = authObj.access_token;
    let expiry = authObj.expiry;
    let refreshToken = authObj.refresh_token;
    let state = authObj.state;

    if (!expiry) throw `invalid expiry`;
    if (!refreshToken) throw `invalid refresh token`;
    if (!state) throw `invalid state`;
    if (!accessToken) throw `invalid access token`;

    let nowDate = new Date();
    if (Number(expiry) > nowDate.getTime()) {
        logg.info(`token not expired`);
        logg.info(`ended`);
        let returnData = returnBackAuthObj ? authObj : accessToken;
        return [returnData, null];
    }

    let data = qs.stringify({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
    });

    let headers = {
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
    };

    let url = process.env.GOOGLE_REFRESH_URL;
    let resp = await axios.post(url, data, headers);

    let result = resp.data;
    logg.info(`result: ${JSON.stringify(result)}`);
    let today = new Date();
    let newExpiry = today.getTime() + (result.expires_in - 60) * 1000;
    let newAccessToken = result.access_token;

    let queryFields = { state };
    let updateFields = {
        access_token: newAccessToken,
        expiry: newExpiry,
    };
    let updateResp = await GoogleOauth.updateOne(queryFields, updateFields);
    logg.info(`google update resp: ${JSON.stringify(updateResp)}`);

    authObj.access_token = newAccessToken;
    authObj.expiry = newExpiry;

    logg.info(`ended`);
    let returnData = returnBackAuthObj ? authObj : newAccessToken;
    return [returnData, null];
}

export const refreshOrReturnToken = functionWrapper(
    fileName,
    "refreshOrReturnToken",
    _refreshOrReturnToken
);

async function _sendEmail(
    { senderEmailId, toEmailId, subject, body, senderAuthObj, replyToEmailId },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    if (!senderEmailId) throw `senderEmailId is invalid`;
    if (!toEmailId) throw `toEmailId is invalid`;
    if (!subject) throw `subject is invalid`;
    if (!body) throw `body is invalid`;

    let [accessToken, refreshOrReturnTokenErr] = await refreshOrReturnToken(
        { email: senderEmailId, authObj: senderAuthObj },
        { txid }
    );
    if (refreshOrReturnTokenErr) throw refreshOrReturnTokenErr;

    let url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/send`;

    let headers = { Authorization: `Bearer ${accessToken}` };

    let emailStr = `To: ${toEmailId}`;
    emailStr += `\nContent-type: text/html;charset=iso-8859-1`;

    if (replyToEmailId) {
        emailStr += `\nReply-To: ${replyToEmailId}`;
    }

    emailStr += `\nSubject: ${subject}\n\n${body}`;
    let data = { raw: Buffer.from(emailStr).toString("base64") };

    try {
        let resp = await axios.post(url, data, { headers });
        logg.info(`resp.data: ${JSON.stringify(resp.data)}`);
        logg.info(`ended successfully`);
        return [resp.data, null];
    } catch (err) {
        if (err && err.response && err.response.data) {
            err = JSON.stringify(err.response.data);
        }
        logg.error(`failed to call gmail send api: ${err}`);
        logg.info(`ended with error`);
        return [null, err];
    }
}

export const sendEmail = functionWrapper(fileName, "sendEmail", _sendEmail);

async function _hasEmailBounced(
    { emailThreadId, senderAuthObj, waitTime },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    if (!emailThreadId) throw `emailThreadId is invalid`;
    if (!senderAuthObj) throw `senderAuthObj is invalid`;

    if (waitTime) {
        logg.info(`waiting for ${waitTime} ms`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
    let [accessToken, refreshOrReturnTokenErr] = await refreshOrReturnToken(
        { authObj: senderAuthObj },
        { txid }
    );
    if (refreshOrReturnTokenErr) throw refreshOrReturnTokenErr;

    let url = `https://gmail.googleapis.com/gmail/v1/users/me/threads/${emailThreadId}?format=full`;
    let headers = {
        headers: { Authorization: `Bearer ${accessToken}` },
    };

    let resp = await axios.get(url, headers);
    let threadData = resp.data;
    logg.info(`threadData: ${JSON.stringify(threadData)}`);
    let messages = threadData && threadData.messages;
    if (!messages) {
        logg.error(`no messages found for this thread`);
        return [false, null];
    }

    for (const message of messages) {
        let headers = message && message.payload && message.payload.headers;
        if (!headers) {
            logg.error(`no headers found for this message`);
            continue;
        }

        let bounceHeader = headers.find(
            (header) => header.name === "X-Failed-Recipients"
        );
        if (bounceHeader) {
            logg.info(`email bounced`);
            logg.info(`ended`);
            return [true, null];
        }
    }

    logg.info(`no bounce headers found`);
    logg.info(`ended`);
    return [false, null];
}

export const hasEmailBounced = functionWrapper(
    fileName,
    "hasEmailBounced",
    _hasEmailBounced
);

async function _hasEmailReplied(
    { emailThreadId, senderAuthObj },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    if (!emailThreadId) throw `emailThreadId is invalid`;
    if (!senderAuthObj) throw `senderAuthObj is invalid`;

    let [accessToken, refreshOrReturnTokenErr] = await refreshOrReturnToken(
        { authObj: senderAuthObj },
        { txid }
    );
    if (refreshOrReturnTokenErr) throw refreshOrReturnTokenErr;

    let url = `https://gmail.googleapis.com/gmail/v1/users/me/threads/${emailThreadId}?format=full`;
    let headers = {
        headers: { Authorization: `Bearer ${accessToken}` },
    };

    let resp = await axios.get(url, headers);
    let threadData = resp.data;
    logg.info(`threadData: ${JSON.stringify(threadData)}`);

    let messages = threadData && threadData.messages;
    if (!messages) {
        logg.error(`no messages found for this thread`);
        return [false, null];
    }

    if (!messages.length) {
        logg.error(`no messages found for this thread`);
        return [false, null];
    }

    if (messages.length === 1) {
        logg.info(`only one message found. So, no reply`);
        return [false, null];
    }

    for (let i = 1; i < messages.length; i++) {
        const message = messages[i];

        let labelIds = message.labelIds;

        if (!labelIds || !labelIds.length) {
            logg.error(
                `no labelIds found for this message: ${JSON.stringify(message)}`
            );
            continue;
        }

        let isSent = labelIds.includes("SENT");
        if (!isSent) {
            logg.info(`since SENT label not found, this is a reply`);

            let replyMessage = message.snippet;
            let replyMessageId = message.id;
            let result = { message: replyMessage, message_id: replyMessageId };
            logg.info(`email replied: ${JSON.stringify(result)}`);

            logg.info(`ended`);
            return [result, null];
        }
    }

    logg.info(`no reply found`);
    logg.info(`ended`);
    return [false, null];
}
export const hasEmailReplied = functionWrapper(
    fileName,
    "hasEmailReplied",
    _hasEmailReplied
);

async function _setupWatchEmailReplyWebhook(
    { authObj, accountId, storeInDb, userEmail, ignoreIfAlreadyExists = false },
    { txid, logg, funcName }
) {
    logg.info(`started`);

    if (!userEmail) throw `userEmail is invalid`;

    if (!authObj) {
        let [gAuthObj, getAuthObjErr] = await refreshOrReturnToken(
            { email: userEmail, returnBackAuthObj: true },
            { txid }
        );
        if (getAuthObjErr) throw getAuthObjErr;
        authObj = gAuthObj;
    }

    if (!authObj) throw `authObj is invalid`;

    if (ignoreIfAlreadyExists) {
        logg.info(`checking if reply webhook watch already exists`);
        let gPubSubDataDoc = await GooglePubSubPushData.findOne({
            email: userEmail,
        }).lean();

        let expiryDate = gPubSubDataDoc && gPubSubDataDoc.expiration_date;
        expiryDate = expiryDate ? new Date(expiryDate) : null;
        expiryDate = expiryDate ? expiryDate.getTime() : null;
        if (expiryDate && expiryDate > new Date().getTime()) {
            logg.info(`watch already exists`);
            logg.info(`ended`);
            return [gPubSubDataDoc, null];
        }
    }

    let [accessToken, refreshOrReturnTokenErr] = await refreshOrReturnToken(
        { authObj },
        { txid }
    );
    if (refreshOrReturnTokenErr) throw refreshOrReturnTokenErr;

    let watchWebhookUrl = "https://www.googleapis.com/gmail/v1/users/me/watch";

    let topicName = process.env.GOOGLE_CLOUD_PUBSUB_TOPIC_NAME;
    if (!topicName) throw `topicName not found in env`;

    let reqBody = {
        topicName,
        labelIds: ["INBOX"],
        labelFilterBehavior: "INCLUDE",
    };

    let headers = {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            Accept: "application/json",
        },
    };

    let resp = await axios.post(watchWebhookUrl, reqBody, headers);

    let watchResp = resp.data;

    logg.info(`watchResp: ` + JSON.stringify(watchResp));

    /*
    * Sample Response:
        {
            historyId: 1234567890
            expiration: 1431990098200
        }
    */

    let { historyId, expiration } = watchResp;
    // convert expiration to number if it is string
    expiration = Number(expiration);

    if (storeInDb) {
        logg.info(`storing in db`);

        let historyBackupObj = {
            history_id: historyId,
            setup: true,
            added_on: new Date(),
        };

        let gUpdateObj = {
            $set: {
                history_id: historyId,
                expiration_date: new Date(expiration),
                updated_on: new Date(),
            },
            $push: {
                history_id_backup: {
                    $each: [historyBackupObj],
                    $position: 0,
                    $slice: GooglePubSubConfig.history_backup_max_length,
                },
            },
        };

        if (accountId) {
            accountId =
                typeof accountId === "string"
                    ? accountId
                    : accountId.toString();

            // $addToSet: { connected_to_account_ids: accountId },
            gUpdateObj.$addToSet = { connected_to_account_ids: accountId };
        }

        let gPubSubDataDoc = await GooglePubSubPushData.findOneAndUpdate(
            { email: userEmail },
            gUpdateObj,
            { upsert: true, new: true }
        );

        logg.info(`gPubSubDataDoc: ${JSON.stringify(gPubSubDataDoc)}`);

        logg.info(`ended`);
        return [gPubSubDataDoc, null];
    }

    logg.info(`ended`);
    return [watchResp, null];
}

export const setupWatchEmailReplyWebhook = functionWrapper(
    fileName,
    "setupWatchEmailReplyWebhook",
    _setupWatchEmailReplyWebhook
);

async function _updateHistoryIdForUser(
    {
        userEmail,
        historyId,
        pubSubMessageId,
        pubSubPublishTime,
        returnPrevHistoryId,
    },
    { txid, logg, funcName }
) {
    logg.info(`started for userEmail: ${userEmail}, historyId: ${historyId}`);
    if (!userEmail) throw `userEmail is invalid`;
    if (!historyId) throw `historyId is invalid`;
    if (!pubSubMessageId) throw `pubSubMessageId is invalid`;
    if (!pubSubPublishTime) throw `pubSubPublishTime is invalid`;

    let queryObj = { email: userEmail };

    let oldPubSubPushData = await GooglePubSubPushData.findOne(queryObj).lean();
    if (!oldPubSubPushData)
        throw `PubSubPushData not found for email: ${userEmail}`;

    let oldHistoryId = oldPubSubPushData.history_id;
    logg.info(`oldHistoryId: ${oldHistoryId}`);

    let historyBackupObj = {
        history_id: historyId,
        pubsub_message_id: pubSubMessageId,
        pubsub_publish_time: pubSubPublishTime,
        added_on: new Date(),
    };
    let updateFields = {
        $set: {
            history_id: historyId,
            updated_on: new Date(),
        },
        $push: {
            history_id_backup: {
                $each: [historyBackupObj],
                $position: 0,
                $slice: GooglePubSubConfig.history_backup_max_length,
            },
        },
    };

    let gPubSubDataDoc = await GooglePubSubPushData.findOneAndUpdate(
        queryObj,
        updateFields,
        { new: true }
    );

    logg.info(`gPubSubDataDoc: ${JSON.stringify(gPubSubDataDoc)}`);

    logg.info(`ended`);
    if (returnPrevHistoryId) return [oldHistoryId, null];
    return [gPubSubDataDoc, null];
}

export const updateHistoryIdForUser = functionWrapper(
    fileName,
    "updateHistoryIdForUser",
    _updateHistoryIdForUser
);

async function _getHistoryMessages(
    { authObj, historyId },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    if (!authObj) throw `authObj is invalid`;

    let [accessToken, refreshOrReturnTokenErr] = await refreshOrReturnToken(
        { authObj },
        { txid }
    );
    if (refreshOrReturnTokenErr) throw refreshOrReturnTokenErr;

    let histories = await getHistoryMessagesUtil(
        { accessToken, historyId },
        { txid }
    );
    logg.info(`histories length: ${histories.length}`);
    if (histories.length < 20) {
        logg.info(`histories: ${JSON.stringify(histories)}`);
    }

    let messages = filterMessagesFromHistories({ histories }, { txid });

    let uniqueMessages = removeDuplicateMessages(messages);
    /*
     * uniqueMessages structure: [{ threadId, messageId }]
     */
    logg.info(`uniqueMessages length: ${uniqueMessages.length}`);
    if (uniqueMessages.length < 20) {
        logg.info(`uniqueMessages: ${JSON.stringify(uniqueMessages)}`);
    }

    logg.info(`ended`);
    return [uniqueMessages, null];
}

export const getHistoryMessages = functionWrapper(
    fileName,
    "getHistoryMessages",
    _getHistoryMessages
);

async function getHistoryMessagesUtil(
    {
        accessToken,
        historyId,
        pageToken = null,
        existingHistoryResults = [],
        waitTime = 0,
    },
    { txid }
) {
    const funcName = "getHistoryMessagesUtil";
    let logg = logger.child({ txid, funcName });
    // logg.info(`started`);

    let url = `https://www.googleapis.com/gmail/v1/users/me/history`;
    let queryParams = {
        startHistoryId: historyId,
        historyTypes: ["messageAdded"],
    };
    if (pageToken) {
        queryParams.pageToken = pageToken;
    }
    url = `${url}?${qs.stringify(queryParams)}`;

    let headers = {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    };

    if (waitTime) {
        logg.info(`waiting for ${waitTime} ms`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    let historyResp = null;
    try {
        let resp = await axios.get(url, headers);
        historyResp = resp.data;
    } catch (err) {
        if (err && err.response && err.response.data) {
            err = JSON.stringify(err.response.data);
        }
        logg.error(`failed to call gmail history api: ${err}`);
        // logg.info(`ended`);
        throw err;
    }

    let historyResults = historyResp.history || [];
    let nextPageToken = historyResp.nextPageToken;

    let allHistoryResults = [...existingHistoryResults, ...historyResults];

    if (nextPageToken) {
        return getHistoryMessagesUtil(
            {
                accessToken,
                historyId,
                pageToken: nextPageToken,
                existingHistoryResults: allHistoryResults,
                waitTime: waitTime + 100,
            },
            { txid }
        );
    }

    // logg.info(`ended`);
    return allHistoryResults;
}

function filterMessagesFromHistories({ histories }, { txid }) {
    const funcName = "filterMessagesFromHistories";
    let logg = logger.child({ txid, funcName });
    logg.info(`started`);
    /*
    * Sample history structure:
   [
        {
            "id": "239740",
            "messages": [
            {
                "id": "18fec4dec1da179e",
                "threadId": "18fec4dec1da179e"
            }
            ],
            "messagesAdded": [
            {
                "message": {
                "id": "18fec4dec1da179e",
                "threadId": "18fec4dec1da179e",
                "labelIds": [
                    "SENT"
                ]
                }
            }
            ]
        },
        {
            "id": "239759",
            "messages": [
            {
                "id": "18fec4dec1da179e",
                "threadId": "18fec4dec1da179e"
            }
            ]
        },
        {
            "id": "239760",
            "messages": [
            {
                "id": "18fec4dec1da179e",
                "threadId": "18fec4dec1da179e"
            }
            ]
        },
        {
            "id": "239761",
            "messages": [
            {
                "id": "18fec4dec1da179e",
                "threadId": "18fec4dec1da179e"
            }
            ]
        },
        {
            "id": "239765",
            "messages": [
            {
                "id": "18fec4dec1da179e",
                "threadId": "18fec4dec1da179e"
            }
            ]
        },
        {
            "id": "239769",
            "messages": [
            {
                "id": "18fec51f35e095a3",
                "threadId": "18fec4dec1da179e"
            }
            ],
            "messagesAdded": [
            {
                "message": {
                "id": "18fec51f35e095a3",
                "threadId": "18fec4dec1da179e",
                "labelIds": [
                    "UNREAD",
                    "IMPORTANT",
                    "CATEGORY_PERSONAL",
                    "INBOX"
                ]
                }
            }
            ]
        }
        ]
    */
    let messages = [];

    for (const history of histories) {
        let messagesAdded = history.messagesAdded;
        if (!messagesAdded) continue;
        for (const messageAdded of messagesAdded) {
            let message = messageAdded.message;
            if (!message) continue;
            messages.push(message);
        }
    }

    let resultMessages = [];
    // ignore messages with labelIds: ["SENT", "DRAFT"]. Because these are emails sent by the user himself/herself, not prospect replies.
    //Also ignore messages with threadId same as message id. Because they are not replies to any campaign email. They are new emails.
    let toBeIgnoredLabelIds = new Set(["SENT", "DRAFT"]);
    for (const message of messages) {
        let { labelIds, threadId, id } = message;
        if (labelIds && labelIds.length) {
            let ignoredLabelFound = false;
            for (const labelId of labelIds) {
                if (toBeIgnoredLabelIds.has(labelId)) {
                    logg.info(
                        `since labelId: ${labelId} found, ignoring this message: ${JSON.stringify(
                            message
                        )}`
                    );
                    ignoredLabelFound = true;
                    break;
                }
            }

            if (ignoredLabelFound) continue;
        }

        // NOTE: disabling code to ignore messages with threadId same as message id, because we have made feature for adding another user as "Reply-To". in this case, threadId will be same as message id.
        // if (threadId === id) {
        //     logg.info(
        //         `since threadId is same as id, ignoring this message: ${JSON.stringify(
        //             message
        //         )}`
        //     );
        //     continue;
        // }
        resultMessages.push(message);
    }

    logg.info(`resultMessages length: ${resultMessages.length}`);
    if (resultMessages.length < 20) {
        logg.info(`resultMessages: ${JSON.stringify(resultMessages)}`);
    }

    logg.info(`ended`);
    return resultMessages;
}

function removeDuplicateMessages(messages) {
    // remove duplicates
    let threadMap = {};
    for (const message of messages) {
        let threadId = message.threadId;
        if (!threadMap[threadId]) {
            threadMap[threadId] = new Set();
        }
        threadMap[threadId].add(message.id);
    }
    let uniqueMessages = [];
    for (const threadId in threadMap) {
        let messageIds = threadMap[threadId];
        for (const messageId of messageIds) {
            uniqueMessages.push({ threadId, messageId });
        }
    }

    return uniqueMessages;
}

/*
 * messages structure: [{ threadId, messageId, spmsDoc}]
 * If addDetailsToMessages is true, then response will be [{ threadId, messageId, spmsDoc, messageData }]
 */
async function _getEmailMessageDetails(
    { authObj, messages, addDetailsToMessages = false },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    if (!authObj) throw `authObj is invalid`;
    if (!messages) throw `messages is invalid`;

    let [accessToken, refreshOrReturnTokenErr] = await refreshOrReturnToken(
        { authObj },
        { txid }
    );
    if (refreshOrReturnTokenErr) throw refreshOrReturnTokenErr;

    let headers = { headers: { Authorization: `Bearer ${accessToken}` } };
    let messageDetails = [];
    let waitTime = 600;
    for (let i = 0; i < messages.length; i++) {
        const message = messages[i];
        let { threadId, messageId } = message;
        let url = `https://www.googleapis.com/gmail/v1/users/me/messages/${messageId}`;
        let messageData = null;

        try {
            let resp = await axios.get(url, headers);
            messageData = resp.data;
        } catch (err) {
            if (err && err.response && err.response.data) {
                err = JSON.stringify(err.response.data);
            }
            logg.error(`failed to call gmail message api: ${err}`);
            logg.info(
                `failed for threadId: ${threadId}, messageId: ${messageId}`
            );
            throw err;
        }

        messageDetails.push(messageData);
        logg.info(`messageData: ${JSON.stringify(messageData)}`);
        if (addDetailsToMessages) {
            message.messageData = messageData;
        }

        if (i !== messages.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, waitTime));
            waitTime += 200;
        }
    }

    logg.info(`messageDetails length: ${messageDetails.length}`);

    logg.info(`ended`);
    return [messageDetails, null];
}

export const getEmailMessageDetails = functionWrapper(
    fileName,
    "getEmailMessageDetails",
    _getEmailMessageDetails
);

/*
 * If we want to quickly disable Google PubSub, we can do it by setting GooglePubSubConfig.enabled = false
 */
export function isGooglePubSubEnabled({}, { txid }) {
    let isEnabled = GooglePubSubConfig.enabled === true;
    return isEnabled;
}

/*
 * This function is used to refresh the google pubsub webhook
 * This function is called by the cron job
 * WHY: Google PubSub webhook expires after 7 days so we need to refresh it
 */
async function _autoRefreshGooglePubSubWebhook(
    { expiresInNextNMinutes = 55 },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    if (process.env.LOCAL_COMPUTER === "yes") {
        logg.info(`since LOCAL_COMPUTER is yes, not executing the cron job`);
        return;
    }

    let expiryDate = new Date();
    expiryDate = expiryDate.getTime() + expiresInNextNMinutes * 60 * 1000;
    expiryDate = new Date(expiryDate);

    let gPubSubDataDocs = await GooglePubSubPushData.find({
        expiration_date: { $lte: expiryDate },
    }).lean();

    logg.info(`gPubSubDataDocs length: ${gPubSubDataDocs.length}`);

    if (!gPubSubDataDocs.length) {
        logg.info(`ended since no gPubSubDataDocs found to refresh`);
        return [true, null];
    }

    let promises = [];
    for (const gPubSubDataDoc of gPubSubDataDocs) {
        let { email } = gPubSubDataDoc;
        let promise = setupWatchEmailReplyWebhook(
            { userEmail: email, storeInDb: true },
            { txid }
        );
        promises.push(promise);
    }

    let results = await Promise.all(promises);

    let failureEmails = [];
    for (let i = 0; i < results.length; i++) {
        const result = results[i];
        let [gPubSubDataDoc, err] = result;
        if (err) {
            let { email } = gPubSubDataDocs[i];
            logg.error(`failed to refresh ${email} pubsub. err: ${err}`);
            failureEmails.push(email);
        }
    }

    if (failureEmails.length) {
        logg.info(`failureEmails: ${JSON.stringify(failureEmails)}`);

        await reportErrorToQRevTeam({
            txid,
            location: `${fileName} -> ${funcName}`,
            subject: `Failed to refresh google pubsub for ${failureEmails.length} emails`,
            message: `Emails: ${failureEmails.join(", ")}`,
        });
    }

    logg.info(`ended`);
    return [true, null];
}

export const autoRefreshGooglePubSubWebhook = functionWrapper(
    fileName,
    "autoRefreshGooglePubSubWebhook",
    _autoRefreshGooglePubSubWebhook
);

/*
 * messages structure: [{ threadId, messageId, spmsDoc, messageData }]
 */
/*
 * messages structure: [{ threadId, messageId, spmsDoc, messageData }]
 */
export function markMessagesWithValidReply({ messages }, { txid }) {
    const funcName = "markMessagesWithValidReply";
    let logg = logger.child({ txid, funcName });
    logg.info(`started`);
    let result = [];

    for (const message of messages) {
        let messageData = message && message.messageData;
        let threadId = message && message.threadId;
        if (!messageData) {
            logg.error(
                `messageData not found for message: ${JSON.stringify(message)}`
            );
            continue;
        }

        let isFailed = hasEmailFailed({ message: messageData }, { txid });

        if (isFailed) {
            logg.info(`email failed for threadId: ${threadId}`);
            result.push({
                ...message,
                isFailed: true,
            });
            continue;
        }

        logg.info(`email not failed for threadId: ${threadId}`);
        result.push({
            ...message,
            isFailed: false,
        });
    }

    logg.info(`ended`);
    return result;
}

export function hasEmailFailed({ message }, { txid }) {
    const funcName = "hasEmailFailed";
    let logg = logger.child({ txid, funcName });
    logg.info(`started`);
    let headers = message && message.payload && message.payload.headers;
    if (!headers) {
        logg.error(`headers not found for message: ${JSON.stringify(message)}`);
        return false;
    }

    const failedHeaderKeywords = [
        "Mail Delivery Subsystem",
        "Mail Delivery System",
        "Delivery Status Notification",
        "Returned mail",
        "Undelivered",
        "Undeliverable",
        "Delivery has failed",
        "Non-Delivery Report",
    ];

    let fromHeader = headers.find((x) => x.name && x.name === "From");
    let subjectHeader = headers.find((x) => x.name && x.name === "Subject");
    let fromHeaderValue = fromHeader && fromHeader.value;
    let subjectHeaderValue = subjectHeader && subjectHeader.value;

    let fromHeaderFailed = false;
    if (fromHeaderValue) {
        fromHeaderFailed = failedHeaderKeywords.some((x) =>
            fromHeaderValue.includes(x)
        );
    }

    let subjectHeaderFailed = false;
    if (subjectHeaderValue) {
        subjectHeaderFailed = failedHeaderKeywords.some((x) =>
            subjectHeaderValue.includes(x)
        );
    }
    let hasFailed = fromHeaderFailed || subjectHeaderFailed;

    logg.info(`hasFailed: ${hasFailed}`);

    logg.info(`ended`);
    return hasFailed;
}

// NOTE: Either senderUserId or senderEmail or senderAuthObj is required
async function _hasBouncedMessage(
    { senderUserId, senderEmail, senderAuthObj, emailThreadId },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    if (!emailThreadId) throw `emailThreadId is invalid`;

    let [accessToken, refreshOrReturnTokenErr] = await refreshOrReturnToken(
        { authObj: senderAuthObj, email: senderEmail, userId: senderUserId },
        { txid }
    );
    if (refreshOrReturnTokenErr) throw refreshOrReturnTokenErr;

    let url = `https://gmail.googleapis.com/gmail/v1/users/me/threads/${emailThreadId}?format=full`;
    let headers = {
        headers: { Authorization: `Bearer ${accessToken}` },
    };

    let resp = await axios.get(url, headers);
    let threadData = resp.data;
    logg.info(`threadData: ${JSON.stringify(threadData)}`);
    let messages = threadData && threadData.messages;
    if (!messages) {
        throw `no messages found for this thread`;
    }

    for (const message of messages) {
        let hasFailed = hasEmailFailed({ message }, { txid });
        if (hasFailed) {
            logg.info(`email bounced`);
            logg.info(`ended`);
            return [true, null];
        }
    }

    logg.info(`Email not bounced`);
    logg.info(`ended`);
    return [false, null];
}

export const hasBouncedMessage = functionWrapper(
    fileName,
    "hasBouncedMessage",
    _hasBouncedMessage
);

async function _sendReplyToThread(
    { threadId, replyMessage, senderAuthObj, subject, toEmailId },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    if (!threadId) throw `threadId is invalid`;
    if (!replyMessage) throw `replyMessage is invalid`;

    let [accessToken, refreshOrReturnTokenErr] = await refreshOrReturnToken(
        { authObj: senderAuthObj },
        { txid }
    );
    if (refreshOrReturnTokenErr) throw refreshOrReturnTokenErr;

    let headers = { headers: { Authorization: `Bearer ${accessToken}` } };

    // get the thread messages
    let url = `https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}?format=full`;
    let resp = await axios.get(url, headers);
    let threadData = resp.data;
    let messages = threadData && threadData.messages;
    if (!messages) {
        throw `no messages found for this thread`;
    }
    // get the last message
    let lastMessage = messages[0];
    logg.info(`lastMessage: ${JSON.stringify(lastMessage)}`);

    let referencesHeader = lastMessage.payload.headers.find(
        (header) => header.name === "References"
    );

    let refHValue = referencesHeader && referencesHeader.value;
    logg.info(`refHValue: ${refHValue}`);

    let messageIdHeader = lastMessage.payload.headers.find(
        (header) => header.name === "Message-ID" || header.name === "Message-Id"
    );

    let mIDHValue = messageIdHeader && messageIdHeader.value;
    logg.info(`mIDHValue: ${mIDHValue}`);

    let replyMessageData = {
        threadId,
        raw: Buffer.from(
            `Content-type: text/html;charset=iso-8859-1
References: ${refHValue}
In-Reply-To: ${mIDHValue}
Subject: Re:${subject}
To: ${toEmailId}

${replyMessage}`
        ).toString("base64"),
    };

    let sendUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/send`;

    try {
        let resp = await axios.post(sendUrl, replyMessageData, headers);
        logg.info(`resp.data: ${JSON.stringify(resp.data)}`);
        logg.info(`ended successfully`);
        return [resp.data, null];
    } catch (err) {
        if (err && err.response && err.response.data) {
            err = JSON.stringify(err.response.data);
        }
        logg.error(`failed to call gmail send api: ${err}`);
        logg.info(`ended with error`);
        return [null, err];
    }
}

export const sendReplyToThread = functionWrapper(
    fileName,
    "sendReplyToThread",
    _sendReplyToThread
);

export function getSendersListFromMessageData({ messageData }, { txid }) {
    const funcName = "getSendersListFromMessageData";
    let logg = logger.child({ txid, funcName });
    // logg.info(`started`);
    if (!messageData) throw `messageData is invalid`;

    // use GmailParseMessage
    let parsedMessage = GmailParseMessage(messageData);
    if (parsedMessage && parsedMessage.textHtml) {
        // in textHtml, find all matching ‘mailto: <original_sender_email_id>’.
        // then extract the email id from it.
        let textHtml = parsedMessage.textHtml;
        let emailIds = [];
        let emailRegex = /mailto:([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+)/g;
        let match;
        while ((match = emailRegex.exec(textHtml)) !== null) {
            emailIds.push(match[1]);
        }
        // logg.info(`emailIds: ${emailIds}`);
        // logg.info(`ended`);
        return emailIds;
    } else if (parsedMessage && parsedMessage.textPlain) {
        // get any email ids from textPlain
        let textPlain = parsedMessage.textPlain;
        let emailIds = [];
        let emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+)/g;
        let match;
        while ((match = emailRegex.exec(textPlain)) !== null) {
            emailIds.push(match[1]);
        }
        // logg.info(`emailIds: ${emailIds}`);
        // logg.info(`ended`);
        return emailIds;
    } else {
        throw `parsedMessage not found`;
    }
}

export function isMessageBodyMatchingSentMessage(
    { messageData, originalMessageBody },
    { txid }
) {
    const funcName = "isMessageBodyMatchingSentMessage";
    let logg = logger.child({ txid, funcName });
    // logg.info(`started`);
    if (!messageData) throw `messageData is invalid`;
    if (!originalMessageBody) throw `originalMessageBody is invalid`;

    originalMessageBody = originalMessageBody.trim();

    // use GmailParseMessage
    let parsedMessage = GmailParseMessage(messageData);
    if (parsedMessage && parsedMessage.textHtml) {
        let textHtml = parsedMessage.textHtml;
        textHtml = textHtml.trim();
        let isMatching = textHtml.includes(originalMessageBody);
        logg.info(`isMatching: ${isMatching}`);
        // logg.info(`ended`);
        return isMatching;
    } else if (parsedMessage && parsedMessage.textPlain) {
        let textPlain = parsedMessage.textPlain;
        textPlain = textPlain.trim();
        let isMatching = textPlain.includes(originalMessageBody);
        logg.info(`isMatching: ${isMatching}`);
        // logg.info(`ended`);
        return isMatching;
    } else {
        throw `parsedMessage not found`;
    }
}

export function getSpmsIdIfTrackingTagPresentInMessage(
    { messageData, trackingUrl, spmsIdQueryParamName },
    { txid }
) {
    const funcName = "getSpmsIdIfTrackingTagPresentInMessage";
    let logg = logger.child({ txid, funcName });
    // logg.info(`started`);

    if (!messageData) throw `messageData is invalid`;

    // use GmailParseMessage
    let parsedMessage = GmailParseMessage(messageData);
    let htmlText = parsedMessage && parsedMessage.textHtml;
    if (!htmlText) throw `not able to parse htmlText from messageData`;

    let trackingTagValues = extractTrackingTagValues(htmlText);
    if (!trackingTagValues || !trackingTagValues.length) {
        trackingTagValues = [];
    }
    logg.info(`trackingTagValues: ${JSON.stringify(trackingTagValues)}`);

    let trackingTagSearchStr = `${trackingUrl}?${spmsIdQueryParamName}=`;
    let tag = trackingTagValues.find((href) =>
        href.startsWith(trackingTagSearchStr)
    );
    logg.info(`chosen tag: ${tag}`);
    let spmsId = null;
    if (tag) {
        // use qs to get the spmsId value
        let parsedUrl = qs.parse(tag.split("?")[1]);
        spmsId = parsedUrl && parsedUrl[spmsIdQueryParamName];
    }

    logg.info(`spmsId: ${spmsId}`);
    // logg.info(`ended`);
    return spmsId;
}

// code suggested by Claude AI
function extractTrackingTagValues(htmlString) {
    const regex = /<img\s+(?:[^>]*?\s+)?src=["']([^"']*)["']/gi;
    const matches = [];
    let match;

    while ((match = regex.exec(htmlString)) !== null) {
        matches.push(match[1]);
    }

    return matches;
}

async function _parseEmailMessage({ messageData }, { txid, logg, funcName }) {
    logg.info(`started`);

    let parsedMessage = GmailParseMessage(messageData);
    let htmlText = parsedMessage && parsedMessage.textHtml;
    if (!htmlText) throw `not able to parse htmlText from messageData`;

    logg.info(`ended`);
    return [htmlText, null];
}

export const parseEmailMessage = functionWrapper(
    fileName,
    "parseEmailMessage",
    _parseEmailMessage
);
