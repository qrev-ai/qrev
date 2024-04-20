import { logger } from "../../logger.js";
import CustomError from "../../std/custom.error.js";
import * as AuthUtils from "../../utils/auth/auth.utils.js";
import * as AccountUserUtils from "../../utils/account/account.user.utils.js";

const fileName = "Auth APIs";

/*
 * This is the first api that gets called after user successfully logs in to QRev
 * So that it can exchange QRev's 'state' with tokens
 * NOTE: This api can only be called once per user login. User cannot call this api again for security reasons
 */
export async function getTokenFromStateApi(req, res, next) {
    const txid = req.id;
    const funcName = "getTokenFromStateApi";
    const logg = logger.child({ txid, funcName });
    logg.info(`started with body:`, req.body);

    const state = req.body.state;
    const accountType = req.body.accountType;
    if (!state) {
        logg.info(`ended unsuccessfully`);
        throw new CustomError(`Missing state`, fileName, funcName, 400, true);
    }

    let [resultResp, exchangeErr] = await AuthUtils.exchangeStateForTokens(
        { state, accountType },
        { txid }
    );
    if (exchangeErr) {
        if (exchangeErr.message === "Google auth obj not found for state.") {
            exchangeErr.reportToTeam = false;
        }
        logg.info(`ended unsuccessfully`);
        throw exchangeErr;
    }

    let { result, userId } = resultResp;

    let [accountUserResp, accountUserErr] =
        await AccountUserUtils.updateAccountUserStatusAsLoggedIn(
            { userId },
            { txid, sendErrorMsg: true }
        );
    if (accountUserErr) {
        logg.error(`accountUserErr:` + accountUserErr);
        logg.info(`still ended successfully`);
    }

    logg.info(`ended`);
    res.json({
        success: true,
        message: `${funcName} executed successfully`,
        txid,
        result,
    });
}

export async function refreshAccessTokenApi(req, res, next) {
    const txid = req.id;
    const funcName = "refreshAccessTokenApi";
    const logg = logger.child({ txid, funcName });
    logg.info(`started with body:`, req.body);

    const refreshToken = req.body.refreshToken;
    if (!refreshToken) {
        logg.info(`ended unsuccessfully`);
        throw new CustomError(
            `Missing refreshToken`,
            fileName,
            funcName,
            400,
            true
        );
    }

    let [result, refreshErr] = await AuthUtils.refreshAccessToken(
        { refreshToken },
        { txid }
    );
    if (refreshErr) {
        logg.info(`ended unsuccessfully`);
        throw refreshErr;
    }

    logg.info(`ended`);
    res.json({
        success: true,
        message: `${funcName} executed successfully`,
        txid,
        result,
    });
}
