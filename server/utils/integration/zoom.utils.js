import axios from "axios";
import qs from "qs";
import { functionWrapper } from "../../std/wrappers.js";
import CustomError from "../../std/custom.error.js";
import { logger } from "../../logger.js";
import { ZoomOauth } from "../../models/integration/zoom.oath.model.js";

const fileName = "Zoom Utils";

async function _exchangeCodeForTokens(
    { oauthCode, isDev },
    { logg, txid, funcName }
) {
    logg.info(`started`);
    let CLIENT_ID = process.env.ZOOM_CLIENT_ID;
    let CLIENT_SECRET = process.env.ZOOM_CLIENT_SECRET;
    let REDIRECT_URI = process.env.ZOOM_REDIRECT_URI;

    if (isDev) {
        logg.info(`Using dev credentials`);
        CLIENT_ID = process.env.ZOOM_DEV_CLIENT_ID;
        CLIENT_SECRET = process.env.ZOOM_DEV_CLIENT_SECRET;
        REDIRECT_URI = process.env.ZOOM_DEV_REDIRECT_URI;
    }

    if (process.env.LOCAL_COMPUTER === "yes") {
        REDIRECT_URI = "http://localhost:8080/api/zoom/redirect";
    }
    let formData = qs.stringify({
        grant_type: "authorization_code",
        code: oauthCode,
        redirect_uri: REDIRECT_URI,
    });
    let url = process.env.ZOOM_TOKEN_URL;
    let headers = {
        headers: {
            Authorization: `Basic ${Buffer.from(
                `${CLIENT_ID}:${CLIENT_SECRET}`
            ).toString("base64")}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
    };
    let zoomResp = await axios.post(url, formData, headers);
    let tokens = zoomResp.data;
    logg.info(`zoom-auth-resp: ${JSON.stringify(tokens)}`);
    if (!tokens.expiry_date && tokens.expires_in) {
        let expiresInSeconds = Number(tokens.expires_in);
        let expiryDate = new Date().getTime();
        // decrease by 10 seconds to be on the safe side
        expiryDate = expiryDate + (expiresInSeconds - 10) * 1000;
        tokens.expiry_date = expiryDate;
        logg.info(`Manually set expiry_date: ${tokens.expiry_date}`);
    }
    logg.info(`ended`);
    return [tokens, null];
}

export const exchangeCodeForTokens = functionWrapper(
    fileName,
    "zoom-exchangeCodeForTokens",
    _exchangeCodeForTokens
);

async function _getUserInfo({ accessToken }, { logg, txid, funcName }) {
    logg.info(`started`);
    let url = process.env.ZOOM_USER_INFO_URL;
    let headers = { headers: { Authorization: "Bearer " + accessToken } };
    let resp = await axios.get(url, headers);
    let userInfo = resp.data;
    logg.info(`userInfo: ${JSON.stringify(userInfo)}`);
    logg.info(`ended`);
    return [userInfo, null];
}

export const getUserInfo = functionWrapper(
    fileName,
    "zoom-getUserInfo",
    _getUserInfo
);

async function _saveAuth(
    { tokens, userInfo, state, oauthCode },
    { logg, txid, funcName }
) {
    logg.info(`started`);
    // userInfo has 2 fields: id and email
    let authObj = {
        state,
        email: userInfo.email || "",
        zoom_id: userInfo.id || "",
        zoom_account_id: userInfo.account_id || "",
        code: oauthCode,
        scope: tokens.scope,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry: tokens.expiry_date,
    };

    logg.info(`authObj: ${JSON.stringify(authObj)}`);
    let savedDoc = await new ZoomOauth(authObj).save();
    logg.info(`savedDoc: ${JSON.stringify(savedDoc)}`);
    logg.info(`ended`);
    return [savedDoc, null];
}

export const saveAuth = functionWrapper(fileName, "zoom-saveAuth", _saveAuth);

async function _connectAuthToAccount(
    { userId, accountId, state },
    { logg, txid, funcName }
) {
    logg.info(`started`);
    // get auth doc by state
    let queryObj = { state };
    let authDoc = await ZoomOauth.findOne(queryObj).lean();
    logg.info(`authDoc: ${JSON.stringify(authDoc)}`);
    if (authDoc.is_connected_to_account)
        throw `authDoc is already connected to an account`;

    let updateObj = {
        is_connected_to_account: true,
        account: accountId,
    };
    if (userId) updateObj.user = userId;
    let options = { new: true };

    let updatedDoc = await ZoomOauth.findOneAndUpdate(
        queryObj,
        updateObj,
        options
    ).lean();
    logg.info(`updatedDoc: ${JSON.stringify(updatedDoc)}`);
    logg.info(`ended`);
    return [updatedDoc, null];
}

export const connectAuthToAccount = functionWrapper(
    fileName,
    "zoom-connectAuthToAccount",
    _connectAuthToAccount
);

async function _isZoomConnected(
    { accountId, userId },
    { logg, txid, funcName }
) {
    logg.info(`started`);
    let queryObj = { account: accountId, user: userId };
    let authDoc = await ZoomOauth.findOne(queryObj).lean();
    logg.info(`authDoc: ${JSON.stringify(authDoc)}`);
    let isConnected = false;
    if (authDoc && authDoc.is_connected_to_account) isConnected = true;
    logg.info(`isConnected: ${isConnected}`);
    logg.info(`ended`);
    return [isConnected, null];
}

export const isZoomConnected = functionWrapper(
    fileName,
    "isZoomConnected",
    _isZoomConnected
);

async function _deauthorizeUser({ payload }, { txid, logg, funcName }) {
    logg.info(`started`);
    let accountId = payload.account_id;
    let userId = payload.user_id;

    let queryObj = {
        zoom_id: userId,
        zoom_account_id: accountId,
    };
    let updateObj = { deauthorize: true, updated_on: new Date() };

    logg.info(`updateObj: ${JSON.stringify(updateObj)}`);
    let updateResp = await ZoomOauth.updateMany(queryObj, updateObj);
    logg.info(`updateResp: ${JSON.stringify(updateResp)}`);
    logg.info(`ended`);
    return [updateResp, null];
}

export const deauthorizeUser = functionWrapper(
    fileName,
    "zoom-deauthorizeUser",
    _deauthorizeUser
);
