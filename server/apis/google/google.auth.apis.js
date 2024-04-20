import CustomError from "../../std/custom.error.js";
import * as GoogleAuthUtils from "../../utils/google/google.auth.utils.js";
import * as AuthUtils from "../../utils/auth/auth.utils.js";
import { logger } from "../../logger.js";

const fileName = "Google Auth API";

export async function authApi(req, res, next) {
    const txid = req.id;
    let funcName = "authApi";
    const logg = logger.child({ txid, funcName });
    logg.info(`started with body`, req.body);
    logg.info(`started with query`, req.query);
    logg.info(`started with params`, req.params);

    const oauthCode = req.query.code || req.headers["code"] || req.body.code;
    const stateValue = req.query.state;
    if (!oauthCode) {
        logg.info(`ended unsuccessfully`);
        throw `Missing oauthCode`;
    }
    if (!stateValue) {
        logg.info(`ended unsuccessfully`);
        throw `Missing state`;
    }

    let { state, native, deviceId, deviceType, userId, newVersion } =
        AuthUtils.splitState({ stateValue }, { txid });

    if (!state || !deviceId) {
        logg.info(`either state or deviceId is missing`);
        logg.info(`ended unsuccessfully`);
        throw `Missing state or deviceId`;
    }

    let [tokens, exchangeErr] = await GoogleAuthUtils.exchangeCodeForTokens(
        { oauthCode },
        { txid }
    );
    if (exchangeErr) {
        logg.info(`ended unsuccessfully`);
        throw `Failed to exchange oauthCode for tokens: ${exchangeErr}`;
    }

    let accessToken = tokens.access_token;
    let [userInfo, userInfoErr] = await GoogleAuthUtils.getUserInfo(
        { accessToken },
        { txid }
    );
    if (userInfoErr) {
        logg.info(`ended unsuccessfully`);
        throw `Failed to get user info: ${userInfoErr}`;
    }

    if (!userInfo || !userInfo.email) {
        logg.info(
            `either userInfo or userInfo.email is missing. So return true`
        );
        // return 200
        return res.json({
            success: true,
            message: `${funcName} executed successfully`,
            txid,
        });
    }

    let [saveTokensResp, saveTokensErr] = await GoogleAuthUtils.saveAuth(
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
        { txid }
    );
    if (saveTokensErr) {
        logg.info(`ended unsuccessfully`);
        throw `Failed to save tokens: ${saveTokensErr}`;
    }

    logg.info(`ended successfully`);
    res.render("browser-login-success");
}
