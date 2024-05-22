import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import { google } from "googleapis";
import qs from "qs";
import * as GoogleAuthDbUtils from "./google.auth.db.utils.js";
import { functionWrapper } from "../../std/wrappers.js";
import { GoogleOauth } from "../../models/auth/google.oauth.model.js";

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
    { senderEmailId, toEmailId, subject, body, senderAuthObj },
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

    let data = {
        raw: Buffer.from(
            `To: ${toEmailId}
Content-type: text/html;charset=iso-8859-1
Subject: ${subject}

${body}`
        ).toString("base64"),
    };

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

    for (const message of messages) {
        let headers = message && message.payload && message.payload.headers;
        if (!headers) {
            logg.error(`no headers found for this message`);
            continue;
        }

        let replyHeader = headers.find(
            (header) => header.name === "In-Reply-To"
        );
        if (replyHeader) {
            let replyMessage = message.snippet;
            let replyMessageId = message.id;
            let result = { message: replyMessage, message_id: replyMessageId };
            logg.info(`email replied: ${JSON.stringify(result)}`);
            logg.info(`ended`);
            return [result, null];
        }
    }

    logg.info(`no reply headers found`);
    logg.info(`ended`);
    return [false, null];
}

export const hasEmailReplied = functionWrapper(
    fileName,
    "hasEmailReplied",
    _hasEmailReplied
);
