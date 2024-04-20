import fs from "fs";
import { logger } from "../../logger.js";
import CustomError from "../../std/custom.error.js";
import { v4 as uuidv4 } from "uuid";
import * as ZoomUtils from "../../utils/integration/zoom.utils.js";
import * as AccontUserUtils from "../../utils/account/account.user.utils.js";

const fileName = "Zoom APIs";

export async function zoomRedirectApi(req, res, next) {
    const txid = req.id;
    const funcName = "zoomRedirectApi";
    const logg = logger.child({ txid, funcName });
    logg.info(`started with body: ${JSON.stringify(req.body)}`);
    logg.info(`started with query: ${JSON.stringify(req.query)}`);
    const oauthCode = req.query.code;
    const state = req.query.state;
    if (!oauthCode) throw `Missing code`;
    if (!state) throw `Missing state`;

    let [tokens, exchangeErr] = await ZoomUtils.exchangeCodeForTokens(
        { oauthCode },
        { txid }
    );
    if (exchangeErr) {
        logg.info(`ended unsuccessfully cuz of exchangeErr`);
        throw exchangeErr;
    }

    let accessToken = tokens.access_token;

    let [userInfo, userInfoErr] = await ZoomUtils.getUserInfo(
        { accessToken },
        { txid }
    );
    if (userInfoErr) {
        logg.info(`ended unsuccessfully cuz of userInfoErr`);
        throw userInfoErr;
    }

    let [savedAuthDoc, saveTokensErr] = await ZoomUtils.saveAuth(
        { tokens, userInfo, state, oauthCode },
        { txid }
    );
    if (saveTokensErr) {
        logg.info(`ended unsuccessfully cuz of saveTokensErr`);
        throw saveTokensErr;
    }
    logg.info(`ended successfully`);
    res.render("browser-login-success");
}

/*
 * Created on 29th December 2023, by Sanjay
 * For publishing, Zoom requires us to have different redirect auth URLs for developer and production environments.
 */
export async function zoomDevRedirectApi(req, res, next) {
    const txid = req.id;
    const funcName = "zoomDevRedirectApi";
    const logg = logger.child({ txid, funcName });
    logg.info(`started with body: ${JSON.stringify(req.body)}`);
    logg.info(`started with query: ${JSON.stringify(req.query)}`);
    const oauthCode = req.query.code;
    if (!oauthCode) throw `Missing code`;

    let [tokens, exchangeErr] = await ZoomUtils.exchangeCodeForTokens(
        { oauthCode, isDev: true },
        { txid }
    );
    if (exchangeErr) {
        logg.info(`ended unsuccessfully cuz of exchangeErr`);
        throw exchangeErr;
    }

    let accessToken = tokens.access_token;

    let [userInfo, userInfoErr] = await ZoomUtils.getUserInfo(
        { accessToken },
        { txid }
    );
    if (userInfoErr) {
        logg.info(`ended unsuccessfully cuz of userInfoErr`);
        throw userInfoErr;
    }

    // let [savedAuthDoc, saveTokensErr] = await ZoomUtils.saveAuth(
    //     { tokens, userInfo, state, oauthCode, isDev: true },
    //     { txid }
    // );
    // if (saveTokensErr) {
    //     logg.info(`ended unsuccessfully cuz of saveTokensErr`);
    //     throw saveTokensErr;
    // }
    logg.info(`ended successfully`);
    res.render("browser-login-success");
}

export async function connectZoomAuthToAccountApi(req, res, next) {
    const txid = req.id;
    const funcName = "connectZoomAuthToAccountApi";
    const logg = logger.child({ txid, funcName });
    logg.info(`started with body: ${JSON.stringify(req.body)}`);
    logg.info(`started with query: ${JSON.stringify(req.query)}`);

    const { state } = req.body;
    const { account_id: accountId } = req.query;

    if (!state) throw `Missing state`;
    if (!accountId) throw `Missing account_id`;

    const userId = req.user && req.user.userId ? req.user.userId : null;
    if (!userId) `Missing userId from decoded access token`;

    let [connectResult, connectErr] = await ZoomUtils.connectAuthToAccount(
        { state, accountId, userId },
        { txid }
    );
    if (connectErr) {
        logg.error(`ended unsuccessfully cuz of connectErr`);
        throw connectErr;
    }

    let [defConfTypeResp, defConfTypeErr] =
        await AccontUserUtils.updateConferenceType(
            { accountId, userId, conferenceType: "zoom" },
            { txid, sendErrorMsg: true }
        );
    if (defConfTypeErr) {
        logg.error(`failed to update default conf type to zoom`);
        throw defConfTypeErr;
    }

    logg.info(`ended successfully`);
    return res.json({
        success: true,
        message: `${funcName} executed successfully`,
    });
}

export async function isZoomConnected(req, res, next) {
    const txid = req.id;
    const funcName = "isZoomConnected";
    const logg = logger.child({ txid, funcName });
    logg.info(`started with body: ${JSON.stringify(req.body)}`);
    logg.info(`started with query: ${JSON.stringify(req.query)}`);

    const { account_id: accountId } = req.query;
    if (!accountId) throw `Missing account_id`;

    const userId = req.user && req.user.userId ? req.user.userId : null;
    if (!userId) `Missing userId from decoded access token`;

    let [isConnected, isConnectedErr] = await ZoomUtils.isZoomConnected(
        { accountId, userId },
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
        is_connected: isConnected ? true : false,
    });
}

export async function zoomDeauthorizeApi(req, res, next) {
    const txid = req.id;
    const funcName = "zoomDeauthorizeApi";
    const logg = logger.child({ txid, funcName });
    logg.info(`started with body: ${JSON.stringify(req.body)}`);
    logg.info(`started with headers: ${JSON.stringify(req.query)}`);
    let zoomVerificationToken = req.headers["authorization"];
    let expectedVerificationToken = process.env.ZOOM_VERIFICATION_TOKEN;
    let expectedVerificationToken2 = process.env.ZOOM_SECRET_TOKEN;
    if (!zoomVerificationToken) {
        throw new CustomError(
            `Missing zoomVerificationToken`,
            fileName,
            funcName,
            400,
            false
        );
    }
    if (
        zoomVerificationToken &&
        zoomVerificationToken !== expectedVerificationToken &&
        zoomVerificationToken !== expectedVerificationToken2
    ) {
        throw new CustomError(
            `zoom auth verification failed`,
            fileName,
            funcName,
            400,
            false
        );
    }

    let zoomEvent = req.body.event;
    let payload = req.body.payload;
    if (!payload || !zoomEvent) {
        throw new CustomError(
            `some data is missing`,
            fileName,
            funcName,
            400,
            false
        );
    }

    if (zoomEvent !== "app_deauthorized") {
        logg.info(`event received was not app_deauthorized`);
        return res.json({
            success: true,
            msg: "event received was not app_deauthorized",
        });
    }

    let [deAuthResp, deAuthErr] = await ZoomUtils.deauthorizeUser(
        { payload },
        { txid }
    );
    if (deAuthErr) {
        logg.info(`ended unsuccessfully cuz of deAuthErr`);
        throw deAuthErr;
    }

    logg.info(`ended successfully`);
    return res.json({
        success: true,
        message: `user has been deauthorized successfully`,
    });
}

export async function zoomVerifyPageApi(req, res, next) {
    const txid = req.id;
    const funcName = "zoomVerifyPageApi";
    const logg = logger.child({ txid, funcName });
    logg.info(`started`);

    try {
        // read file data/verifyzoom.html async and then send in response
        fs.readFile("data/verifyzoom.html", "utf8", (err, data) => {
            if (err) {
                logg.error(`err: ` + err);
                res.status(500).send("Error loading HTML file");
            } else {
                logg.info(`Sending back positive response`);
                res.send(data);
            }
        });
    } catch (err) {
        if (err && err.response && err.response.data) {
            err = JSON.stringify(err.response.data);
        }

        logg.error(`errM: ` + err);

        res.status(400).json({
            success: false,
            message: `${funcName} failed`,
            err,
        });
    }
}
