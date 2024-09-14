const fileName = "Verify Access Token Middleware";
import { isFreeRoute } from "../config/no_auth_required_routes.js";
import { logger } from "../logger.js";
import CustomError from "../std/custom.error.js";
import * as AuthUtils from "../utils/auth/auth.utils.js";

export async function signAccessToken(req, res, next) {
    const txid = req.id;
    const funcName = "signAccessToken";
    const logg = logger.child({ txid, funcName });
    try {
        if (isFreeRoute(req.originalUrl)) {
            next();
            return;
        }

        // if (process.env.LOCAL_COMPUTER === "yes") {
        //     _addTestUserToReq({ req, logg });
        //     next();
        //     return;
        // }

        const authHeader = req.headers["authorization"];
        const accessToken = authHeader && authHeader.split(" ")[1];
        if (!accessToken) {
            logg.error(`Missing access token`);
            throw new CustomError(
                `Missing access token`,
                fileName,
                funcName,
                400,
                false
            );
        }

        let [decodedData, verifyErr] = await AuthUtils.verifyAccessToken(
            { accessToken },
            { txid }
        );
        if (verifyErr) {
            // check if verifyErr is instance of CustomError
            if (verifyErr instanceof CustomError) {
                verifyErr.reportToTeam = false;
            }
            throw verifyErr;
        }

        req.user = decodedData;
        logg.info(`decoded user: ` + JSON.stringify(decodedData));
        next();
    } catch (error) {
        logg.error(`ended unsuccessfully`);
        next(error);
    }
}

function _addTestUserToReq({ req, logg }) {
    logg.info(`Since LOCAL_COMPUTER is set, skipping token verification`);
    let testUserId = null,
        testState = null;
    if (req.body.testUserId) {
        logg.info(
            `Setting userId to req.body.testUserId: ${req.body.testUserId}`
        );
        testUserId = req.body.testUserId;
    } else {
        logg.info(
            `Setting userId to process.env.LOCAL_COMPUTER_USER_ID: ${process.env.LOCAL_COMPUTER_USER_ID}`
        );
        testUserId = process.env.LOCAL_COMPUTER_USER_ID;
    }

    if (req.body.testState) {
        logg.info(`Setting state to req.body.testState: ${req.body.testState}`);
        testState = req.body.testState;
    } else {
        logg.info(
            `Setting state to process.env.LOCAL_COMPUTER_STATE: ${process.env.LOCAL_COMPUTER_STATE}`
        );
        testState = process.env.LOCAL_COMPUTER_STATE;
    }
    req.user = {
        userId: testUserId,
        state: testState,
    };
}
