import { functionWrapper } from "../../std/wrappers.js";
import CustomError from "../../std/custom.error.js";
import { logger } from "../../logger.js";
import * as TokenDbUtils from "./tokens.db.utils.js";
import * as GoogleAuthDbUtils from "../google/google.auth.db.utils.js";
import * as JwtUtils from "../auth/jwt.utils.js";

const fileName = "Auth Utils";

export function splitState({ stateValue, splitChar = "#" }, { txid }) {
    const funcName = "splitState";
    const logg = logger.child({ txid, funcName });
    logg.info(`started`);

    let state = null,
        native = true,
        deviceId = null,
        deviceType = null,
        userId = null,
        newVersion = null;

    if (stateValue && stateValue.includes("testsanjay")) {
        state = stateValue;
        deviceId = stateValue;
        logg.info(`ended`);
        return { state, native, deviceId, deviceType, userId, newVersion };
    }
    const splittedState = stateValue.split(splitChar);
    if (splittedState.length > 1) {
        // google state value
        const stateVal = splittedState.filter((element) =>
            element.includes("STA")
        );
        state = stateVal.length ? stateVal[0].replace("STA", "") : "";

        // flag for identifying the api call is from browser or native apps
        const nativeFlag = splittedState.filter((element) =>
            element.includes("NAT")
        );
        native = nativeFlag === "true" ? true : false;

        // flag for identifying the device id
        const deviceIdValue = splittedState.filter((element) =>
            element.includes("DID")
        );
        deviceId = deviceIdValue.length
            ? deviceIdValue[0].replace("DID", "")
            : "";

        // flag for identifying the type = ['android', 'web', 'ios', 'desktop_mac', 'desktop_win']
        const deviceTypeValue = splittedState.filter((element) =>
            element.includes("TYP")
        );
        deviceType = deviceTypeValue.length
            ? deviceTypeValue[0].replace("TYP", "")
            : "";

        // flag for identifying the user id
        const userIdValue = splittedState.filter((element) =>
            element.includes("UID")
        );
        userId = userIdValue.length ? userIdValue[0].replace("UID", "") : "";

        // flag for identifying the new version
        const newVersionValue = splittedState.filter((element) =>
            element.includes("NEWVERSION")
        );
        newVersion = newVersionValue.length
            ? newVersionValue[0].replace("NEWVERSION", "")
            : "";
    }
    let result = { state, native, deviceId, deviceType, userId, newVersion };
    logg.info(`splitted data`, result);
    logg.info(`ended`);
    return result;
}

async function _exchangeStateForTokens(
    { state, accountType },
    { logg, txid, funcName }
) {
    logg.info(`started`);
    if (!accountType) accountType = "google";

    let authObj = null;
    if (accountType === "google") {
        let [googleAuthObj, googleDbErr] =
            await GoogleAuthDbUtils.getGoogleAuthObj({ state }, { txid });
        if (googleDbErr) {
            throw googleDbErr;
        }

        authObj = googleAuthObj;
    } else if (accountType === "outlook" || accountType === "ms") {
        // let [msAuthObj, msDbErr] = await MsUtils.getMsAuthObj(
        //     { state },
        //     { txid }
        // );
        // if (msDbErr) {
        //     throw msDbErr;
        // }
        // authObj = msAuthObj;
    } else {
        throw `Invalid account type: ${accountType}`;
    }

    if (!authObj) {
        throw `Auth obj not found for state.`;
    }

    if (authObj.is_token_exchanged) {
        throw `Token already exchanged for state.`;
    }

    let [result, jwtErr] = await JwtUtils.signUser(
        {
            state: authObj.state,
            userId: authObj.user_id,
            accountType,
        },
        { txid }
    );

    if (jwtErr) {
        throw jwtErr;
    }

    logg.info(`result: ${JSON.stringify(result)}`);

    if (accountType === "google") {
        let [updateDbResp, updateDbErr] = await GoogleAuthDbUtils.upsertUser(
            {
                queryObj: { state: authObj.state },
                updateObj: { is_token_exchanged: true },
                options: { new: true },
            },
            { txid }
        );
        if (updateDbErr) {
            throw updateDbErr;
        }
    } else if (accountType === "outlook" || accountType === "ms") {
        // let [updateDbResp, updateDbErr] = await MsUtils.updateMsAuthObj(
        //     {
        //         queryObj: { state: authObj.state },
        //         updateObj: { is_token_exchanged: true },
        //         options: { new: true },
        //     },
        //     { txid }
        // );
        // if (updateDbErr) {
        //     throw updateDbErr;
        // }
    } else {
        throw `Invalid account type: ${accountType}`;
    }

    let [refreshDbResp, refreshDbErr] = await TokenDbUtils.saveToken(
        {
            userId: authObj.user_id,
            refreshToken: result.refreshToken,
            accessToken: result.accessToken,
            state: authObj.state,
            accountType,
        },
        { txid }
    );
    if (refreshDbErr) {
        throw refreshDbErr;
    }

    let userId = authObj.user_id;

    logg.info(`ended`);
    return [{ result, userId }, null];
}

export const exchangeStateForTokens = functionWrapper(
    fileName,
    "exchangeStateForTokens",
    _exchangeStateForTokens
);

async function _refreshAccessToken({ refreshToken }, { logg, txid, funcName }) {
    logg.info(`started`);

    let [decodedData, jwtVerifyErr] = await JwtUtils.verifyRefreshToken(
        { refreshToken },
        { txid }
    );

    if (jwtVerifyErr) {
        throw jwtVerifyErr;
    }

    let { state, userId } = decodedData;
    if (!state || !userId) {
        throw `Invalid refresh token. Decoded state or userId is null.`;
    }

    let [refreshTokenDoc, tokenDbErr] = await TokenDbUtils.getRefreshTokenDoc(
        { refreshToken },
        { txid }
    );
    if (tokenDbErr) {
        throw tokenDbErr;
    }
    if (!refreshTokenDoc) {
        throw new CustomError(
            `Refresh token invalid.`,
            fileName,
            funcName,
            400,
            false
        );
    }

    let [result, jwtSignErr] = await JwtUtils.signUserAccessToken(
        { state, userId },
        { txid }
    );
    if (jwtSignErr) {
        throw jwtSignErr;
    }

    let newAccessToken = result.accessToken;
    let [updateDbResp, updateDbErr] = await TokenDbUtils.updateAccessToken(
        {
            refreshToken,
            accessToken: newAccessToken,
            state,
            userId,
            oldAccessToken: refreshTokenDoc.access_token,
        },
        { txid }
    );

    logg.info(`ended`);
    return [result, null];
}

export const refreshAccessToken = functionWrapper(
    fileName,
    "refreshAccessToken",
    _refreshAccessToken
);

async function _verifyAccessToken({ accessToken }, { logg, txid, funcName }) {
    let [decodedData, jwtVerifyErr] = await JwtUtils.verifyAccessToken(
        { accessToken },
        { txid }
    );
    if (jwtVerifyErr) {
        throw new CustomError(
            `Invalid access token.`,
            fileName,
            funcName,
            498,
            false
        );
    }

    let [doesAccessTokenExist, tokenDbErr] =
        await TokenDbUtils.doesAccessTokenExist(
            { accessToken, userId: decodedData.userId },
            { txid }
        );
    if (tokenDbErr) {
        throw tokenDbErr;
    }
    if (!doesAccessTokenExist) {
        throw new CustomError(
            `Access token invalid.`,
            fileName,
            funcName,
            498,
            false
        );
    }
    return [decodedData, null];
}
export const verifyAccessToken = functionWrapper(
    fileName,
    "verifyAccessToken",
    _verifyAccessToken,
    {
        printError: false,
    }
);
