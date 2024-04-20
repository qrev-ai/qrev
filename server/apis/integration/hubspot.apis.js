import { logger } from "../../logger.js";
import CustomError from "../../std/custom.error.js";
import * as HsUtils from "../../utils/integration/hubspot.utils.js";
const fileName = "HubSpot APIs";

export async function hubspotRedirectApi(req, res, next) {
    const txid = req.id;
    const funcName = "hubspotRedirectApi";
    const logg = logger.child({ txid, funcName });
    logg.info(`started with body: ${JSON.stringify(req.body)}`);
    logg.info(`started with query: ${JSON.stringify(req.query)}`);
    const oauthCode = req.query.code;
    const state = req.query.state;
    if (!oauthCode) {
        logg.info(`ended unsuccessfully cuz missing oauthCode`);
        throw new CustomError(`Missing code`, fileName, funcName, 400, true);
    }
    if (!state) {
        logg.info(`ended unsuccessfully cuz missing state`);
        throw new CustomError(`Missing state`, fileName, funcName, 400, true);
    }

    let [tokens, exchangeErr] = await HsUtils.exchangeCodeForTokens(
        { oauthCode },
        { txid }
    );
    if (exchangeErr) {
        logg.info(`ended unsuccessfully cuz of exchangeErr`);
        throw exchangeErr;
    }

    let accessToken = tokens.access_token;
    let [userInfo, userInfoErr] = await HsUtils.getUserInfo(
        { accessToken },
        { txid }
    );
    if (userInfoErr) {
        logg.info(`ended unsuccessfully cuz of userInfoErr`);
        throw userInfoErr;
    }

    let [savedAuthDoc, saveTokensErr] = await HsUtils.saveAuth(
        { tokens, userInfo, state, oauthCode },
        { txid }
    );
    if (saveTokensErr) {
        logg.info(`ended unsuccessfully`);
        throw saveTokensErr;
    }
    logg.info(`ended successfully`);
    res.render("browser-login-success");
}

export async function connectHubSpotAuthToAccount(req, res, next) {
    const txid = req.id;
    const funcName = "connectHubSpotAuthToAccount";
    const logg = logger.child({ txid, funcName });
    logg.info(`started with body: ${JSON.stringify(req.body)}`);
    logg.info(`started with query: ${JSON.stringify(req.query)}`);

    const { state } = req.body;
    const { account_id: accountId } = req.query;

    if (!state) {
        logg.info(`ended unsuccessfully cuz missing state`);
        throw new CustomError(`Missing state`, fileName, funcName, 400, true);
    }
    if (!accountId) {
        logg.info(`ended unsuccessfully cuz missing accountId`);
        throw new CustomError(
            `Missing accountId`,
            fileName,
            funcName,
            400,
            true
        );
    }

    const userId = req.user && req.user.userId ? req.user.userId : null;
    if (!userId) {
        logg.info(`ended unsuccessfully`);
        throw new CustomError(
            `Missing userId from decoded access token`,
            fileName,
            funcName,
            400,
            true
        );
    }

    let [connectResult, connectErr] = await HsUtils.connectAuthToAccount(
        { state, accountId, userId },
        { txid }
    );
    if (connectErr) {
        logg.info(`ended unsuccessfully cuz of connectErr`);
        throw connectErr;
    }

    logg.info(`ended successfully`);
    return res.json({
        success: true,
        message: `${funcName} executed successfully`,
    });
}

export async function isHubSpotConnected(req, res, next) {
    const txid = req.id;
    const funcName = "isHubSpotConnected";
    const logg = logger.child({ txid, funcName });
    logg.info(`started with query: ${JSON.stringify(req.query)}`);
    const { account_id: accountId } = req.query;

    if (!accountId) {
        logg.info(`ended unsuccessfully cuz missing accountId`);
        throw new CustomError(
            `Missing accountId`,
            fileName,
            funcName,
            400,
            true
        );
    }

    let [isConnected, isConnectedErr] = await HsUtils.isHubSpotConnected(
        { accountId },
        { txid }
    );
    if (isConnectedErr) {
        logg.info(`ended unsuccessfully cuz of isConnectedErr`);
        throw isConnectedErr;
    }

    logg.info(`ended successfully`);
    return res.json({
        success: true,
        message: `${funcName} executed successfully`,
        is_connected: isConnected,
    });
}
