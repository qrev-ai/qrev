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
