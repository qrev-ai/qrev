import { Tokens } from "../../models/auth/tokens.model.js";
import CustomError from "../../std/custom.error.js";
import { functionWrapper } from "../../std/wrappers.js";

const fileName = "Refresh DB Utils";

async function _saveToken(
    { userId, refreshToken, accessToken, accountType, state },
    { logg, txid, funcName }
) {
    logg.info(`started`);

    let doc = {
        user_id: userId,
        refresh_token: refreshToken,
        access_token: accessToken,
        account_type: accountType,
        state: state,
    };
    let savedDoc = await Tokens.create(doc);
    savedDoc = savedDoc.toJSON();
    logg.info(`saved token doc in mongodb:` + JSON.stringify(savedDoc));

    logg.info(`ended`);
    return [savedDoc, null];
}
export const saveToken = functionWrapper(fileName, "saveToken", _saveToken);

async function _getRefreshTokenDoc({ refreshToken }, { logg, txid, funcName }) {
    logg.info(`started`);
    let tokenDoc = await Tokens.findOne({
        refresh_token: refreshToken,
    }).lean();
    logg.info(`tokenDoc:`, { tokenDoc });
    logg.info(`ended`);
    return [tokenDoc, null];
}
export const getRefreshTokenDoc = functionWrapper(
    fileName,
    "getRefreshTokenDoc",
    _getRefreshTokenDoc
);

export function getExpiryInDateMs(expiresInStr) {
    let funcName = "getExpiryInDateMs";
    try {
        let expiryInDate = new Date();
        if (!expiresInStr) {
            throw `Missing expiresInStr`;
        }
        /*
    expiresInStr is of the form: "30d" which means 30 days or "1h" which means 1 hour or "30m" which means 30 minutes
    */
        let timeUnit = expiresInStr.slice(-1);
        let timeValue = parseInt(expiresInStr.slice(0, -1));
        if (timeUnit === "d") {
            expiryInDate.setDate(expiryInDate.getDate() + timeValue);
        } else if (timeUnit === "h") {
            expiryInDate.setHours(expiryInDate.getHours() + timeValue);
        } else if (timeUnit === "m") {
            expiryInDate.setMinutes(expiryInDate.getMinutes() + timeValue);
        } else if (timeUnit === "s") {
            expiryInDate.setSeconds(expiryInDate.getSeconds() + timeValue);
        } else {
            throw `Invalid expiresInStr: ${expiresInStr}`;
        }
        return expiryInDate.getTime();
    } catch (err) {
        throw new CustomError(err, fileName, funcName, 400, true);
    }
}

function getExpirySeconds(expiresInStr) {
    let funcName = "getExpirySeconds";
    try {
        let expiryInSeconds = null;
        if (!expiresInStr) {
            throw `Missing expiresInStr`;
        }
        let timeUnit = expiresInStr.slice(-1);
        let timeValue = parseInt(expiresInStr.slice(0, -1));
        if (timeUnit === "d") {
            expiryInSeconds = timeValue * 24 * 60 * 60;
        } else if (timeUnit === "h") {
            expiryInSeconds = timeValue * 60 * 60;
        } else if (timeUnit === "m") {
            expiryInSeconds = timeValue * 60;
        } else if (timeUnit === "s") {
            expiryInSeconds = timeValue;
        } else {
            throw `Invalid expiresInStr: ${expiresInStr}`;
        }
        return expiryInSeconds;
    } catch (err) {
        throw new CustomError(err, fileName, funcName, 400, true);
    }
}

async function _doesAccessTokenExist(
    { accessToken, userId },
    { logg, txid, funcName }
) {
    logg.info(`started`);
    if (!accessToken) {
        throw `Missing accessToken`;
    }
    if (!userId) {
        throw `Missing userId`;
    }

    let doesExist = false;
    userId = typeof userId === "string" ? userId : userId.toString();
    let tokenDoc = await Tokens.findOne({
        access_token: accessToken,
        user_id: userId,
    }).lean();
    logg.info(`tokenDoc:` + JSON.stringify(tokenDoc));

    if (tokenDoc) {
        doesExist = true;
        logg.info(`Access token exists`);
    } else {
        logg.info(`Access token does not exist`);
    }
    logg.info(`ended`);
    return [doesExist, null];
}
export const doesAccessTokenExist = functionWrapper(
    fileName,
    "doesAccessTokenExist",
    _doesAccessTokenExist
);

async function _updateAccessToken(
    { refreshToken, accessToken, state, userId, oldAccessToken },
    { logg, txid, funcName }
) {
    logg.info(`started`);
    if (!refreshToken) {
        throw `Missing refreshToken`;
    }
    if (!accessToken) {
        throw `Missing accessToken`;
    }
    if (!state) {
        throw `Missing state`;
    }
    if (!userId) {
        throw `Missing userId`;
    }

    userId = typeof userId === "string" ? userId : userId.toString();
    let updateDbResp = await Tokens.updateOne(
        {
            refresh_token: refreshToken,
            user_id: userId,
            state: state,
        },
        {
            access_token: accessToken,
            updated_on: new Date(),
        }
    );
    logg.info(`updateDbResp:` + JSON.stringify(updateDbResp));

    logg.info(`ended`);
    return [updateDbResp, null];
}
export const updateAccessToken = functionWrapper(
    fileName,
    "updateAccessToken",
    _updateAccessToken
);
