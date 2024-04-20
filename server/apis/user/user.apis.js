import CustomError from "../../std/custom.error.js";
import { logger } from "../../logger.js";
import * as UserUtils from "../../utils/user/user.utils.js";
import * as AccountUtils from "../../utils/account/account.utils.js";

const fileName = "User APIs";

export async function getUserInfo(req, res, next) {
    const txid = req.id;
    const funcName = "getUserInfo";
    const logg = logger.child({ txid, funcName });
    logg.info(`started with body:`, req.body);

    let userId = req.user && req.user.userId ? req.user.userId : null;
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
    logg.info(`Detected userId: ${userId}`);
    let [userDetails, dbErr] = await UserUtils.getUserById(
        { id: userId },
        { txid }
    );
    if (dbErr) {
        logg.info(`ended unsuccessfully`);
        throw dbErr;
    }

    let [accounts, accountDbErr] = await AccountUtils.getUserAccounts(
        { userId },
        { txid }
    );
    if (accountDbErr) {
        logg.info(`ended unsuccessfully`);
        throw accountDbErr;
    }
    logg.info(`ended`);
    res.json({
        success: true,
        message: `${funcName} executed successfully`,
        txid,
        user_details: userDetails,
        accounts,
    });
}

export async function getUserAccountsApi(req, res, next) {
    const txid = req.id;
    const funcName = "getUserAccountsApi";
    const logg = logger.child({ txid, funcName });
    logg.info(`started with query:`, req.query);
    let userId = req.user && req.user.userId ? req.user.userId : null;
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

    logg.info(`Detected userId: ${userId}`);
    let [accounts, dbErr] = await AccountUtils.getUserAccounts(
        { userId },
        { txid }
    );
    if (dbErr) {
        logg.info(`ended unsuccessfully`);
        throw dbErr;
    }
    logg.info(`ended`);
    res.json({
        success: true,
        message: `${funcName} executed successfully`,
        txid,
        accounts,
    });
}
