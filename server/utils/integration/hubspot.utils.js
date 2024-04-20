import axios from "axios";
import qs from "qs";
import { functionWrapper } from "../../std/wrappers.js";
import CustomError from "../../std/custom.error.js";
import { logger } from "../../logger.js";
import { HubspotOauth } from "../../models/integration/hubspot.oauth.model.js";

const fileName = "HubSpot Utils";

async function _exchangeCodeForTokens({ oauthCode }, { logg, txid, funcName }) {
    const CLIENT_ID = process.env.HUBSPOT_CLIENT_ID;
    const CLIENT_SECRET = process.env.HUBSPOT_CLIENT_SECRET;
    let REDIRECT_URI = process.env.HUBSPOT_REDIRECT_URI;
    if (process.env.LOCAL_COMPUTER === "yes") {
        REDIRECT_URI = "http://localhost:8080/api/hubspot/redirect";
    }
    let formData = qs.stringify({
        code: oauthCode,
        client_secret: CLIENT_SECRET,
        grant_type: "authorization_code",
        client_id: CLIENT_ID,
        redirect_uri: REDIRECT_URI,
    });
    let url = process.env.HUBSPOT_TOKEN_URL;
    let headers = {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
    };
    let hsResp = await axios.post(url, formData, headers);
    let tokens = hsResp.data;
    logg.info(`hs-auth-resp: ${JSON.stringify(tokens)}`);
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
    "hs-exchangeCodeForTokens",
    _exchangeCodeForTokens
);

async function _getUserInfo({ accessToken }, { logg, txid, funcName }) {
    logg.info(`started`);
    let url = process.env.HUBSPOT_USER_INFO_URL;
    // if it doesnt end with a slash, add it
    if (url[url.length - 1] !== "/") url = url + "/";
    url = url + accessToken;
    let result = await axios.get(url);
    logg.info(`result: ${JSON.stringify(result.data)}`);
    logg.info(`ended`);
    return [result.data, null];
}

export const getUserInfo = functionWrapper(
    fileName,
    "hs-getUserInfo",
    _getUserInfo
);

async function _saveAuth(
    { tokens, userInfo, state, oauthCode },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    let authObj = {
        state,
        email: userInfo.user,
        hub_domain: userInfo.hub_domain,
        provided_scopes: userInfo.scopes,
        hub_id: userInfo.hub_id,
        app_id: userInfo.app_id,
        hubspot_user_id: userInfo.user_id,
        token_type: userInfo.token_type,
        code: oauthCode,
        scope: tokens.scope,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry: tokens.expiry_date,
    };

    logg.info(`authObj: ${JSON.stringify(authObj)}`);
    let savedDoc = await new HubspotOauth(authObj).save();
    logg.info(`savedDoc: ${JSON.stringify(savedDoc)}`);
    logg.info(`ended`);
    return [savedDoc, null];
}

export const saveAuth = functionWrapper(fileName, "hs-saveAuth", _saveAuth);

async function _connectAuthToAccount(
    { state, accountId, userId },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    // get auth doc by state
    let queryObj = { state };
    let authDoc = await HubspotOauth.findOne(queryObj).lean();
    logg.info(`authDoc: ${JSON.stringify(authDoc)}`);
    if (!authDoc) throw `authDoc not found. So failed to connect`;
    // if is_connected_to_account is true, throw error
    if (authDoc.is_connected_to_account)
        throw `authDoc is already connected to an account`;
    // update is_connected_to_account to true and account to accountId
    let updateObj = {
        is_connected_to_account: true,
        account: accountId,
    };
    if (userId) updateObj.user = userId;
    let options = { new: true };
    let updatedDoc = await HubspotOauth.findOneAndUpdate(
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
    "hs-connectAuthToAccount",
    _connectAuthToAccount
);

export async function _isHubSpotConnected(
    { accountId },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    let queryObj = { account: accountId };
    let authDoc = await HubspotOauth.findOne(queryObj).lean();
    logg.info(`authDoc: ${JSON.stringify(authDoc)}`);
    let isConnected = false;
    if (authDoc && authDoc.is_connected_to_account) isConnected = true;
    logg.info(`isConnected: ${isConnected}`);
    logg.info(`ended`);
    return [isConnected, null];
}

export const isHubSpotConnected = functionWrapper(
    fileName,
    "isHubSpotConnected",
    _isHubSpotConnected
);
