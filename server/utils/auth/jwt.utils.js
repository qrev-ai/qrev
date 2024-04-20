import jwt from "jsonwebtoken";
import { functionWrapper } from "../../std/wrappers.js";
import { getExpiryInDateMs } from "./tokens.db.utils.js";

const fileName = "JWT Utils";

async function _signUser(
    { state, userId, accountType },
    { logg, txid, funcName }
) {
    logg.info(`started`);
    const {
        REFRESH_TOKEN_JWT_SECRET,
        ACCESS_TOKEN_JWT_SECRET,
        REFRESH_TOKEN_EXPIRES_IN,
        ACCESS_TOKEN_EXPIRES_IN,
    } = process.env;
    let accessToken = jwt.sign(
        { state, userId, accountType },
        ACCESS_TOKEN_JWT_SECRET,
        { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
    );
    let refreshToken = jwt.sign(
        { state, userId, accountType },
        REFRESH_TOKEN_JWT_SECRET,
        { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
    );

    let expiryInDate = getExpiryInDateMs(ACCESS_TOKEN_EXPIRES_IN);
    logg.info(`ended`);
    return [{ accessToken, refreshToken, expiryInDate }, null];
}
export const signUser = functionWrapper(fileName, "signUser", _signUser);

async function _verifyRefreshToken({ refreshToken }, { logg, txid, funcName }) {
    logg.info(`started`);
    const { REFRESH_TOKEN_JWT_SECRET } = process.env;
    let decodedData = jwt.verify(refreshToken, REFRESH_TOKEN_JWT_SECRET);
    logg.info(`ended`);
    return [decodedData, null];
}
export const verifyRefreshToken = functionWrapper(
    fileName,
    "verifyRefreshToken",
    _verifyRefreshToken
);

async function _signUserAccessToken(
    { state, userId, accountType },
    { logg, txid, funcName }
) {
    logg.info(`started`);
    const { ACCESS_TOKEN_JWT_SECRET, ACCESS_TOKEN_EXPIRES_IN } = process.env;
    let accessToken = jwt.sign(
        { state, userId, accountType },
        ACCESS_TOKEN_JWT_SECRET,
        { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
    );

    let expiryInDate = getExpiryInDateMs(ACCESS_TOKEN_EXPIRES_IN);

    logg.info(`ended`);
    return [{ accessToken, expiryInDate }, null];
}
export const signUserAccessToken = functionWrapper(
    fileName,
    "signUserAccessToken",
    _signUserAccessToken
);

async function _verifyAccessToken({ accessToken }, { logg, txid, funcName }) {
    const { ACCESS_TOKEN_JWT_SECRET } = process.env;
    let decodedData = jwt.verify(accessToken, ACCESS_TOKEN_JWT_SECRET);
    return [decodedData, null];
}
export const verifyAccessToken = functionWrapper(
    fileName,
    "verifyAccessToken",
    _verifyAccessToken
);
