import CustomError from "../../std/custom.error.js";
import { logger } from "../../logger.js";
import * as AccountUserUtils from "../../utils/account/account.user.utils.js";

const fileName = "Account User APIs";

export async function setUserConfigApi(req, res, next) {
    const txid = req.id;
    const funcName = "setUserConfigApi";
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

    let { account_id: accountId } = req.query;
    if (!accountId) {
        logg.info(`ended unsuccessfully`);
        throw new CustomError(
            `Missing accountId`,
            fileName,
            funcName,
            400,
            true
        );
    }

    let {
        timezone,
        working_start_window_hour: workingStartWindowHour,
        working_end_window_hour: workingEndWindowHour,
        working_custom_hours: workingCustomHours,
        duration,
        buffer_time: bufferTime,
        conference_type: conferenceType,
        visible_for_days: visibleForDays,
    } = req.body;

    let [dbResp, configDbErr] = await AccountUserUtils.setUserConfig(
        {
            userId,
            accountId,
            timezone,
            workingStartWindowHour,
            workingEndWindowHour,
            workingCustomHours,
            duration,
            bufferTime,
            conferenceType,
            visibleForDays,
        },
        { txid }
    );
    if (configDbErr) {
        logg.error(`ended unsuccessfully`);
        throw new CustomError(
            `Error in setting user config`,
            fileName,
            funcName,
            400,
            true
        );
    }
    logg.info(`ended`);
    res.json({
        success: true,
        message: `${funcName} executed successfully`,
        txid,
    });
}

export async function getUserConfigApi(req, res, next) {
    const txid = req.id;
    const funcName = "getUserConfigApi";
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

    let { account_id: accountId } = req.query;
    if (!accountId) {
        logg.info(`ended unsuccessfully`);
        throw new CustomError(
            `Missing accountId`,
            fileName,
            funcName,
            400,
            true
        );
    }

    let [configData, configDbErr] = await AccountUserUtils.getUserConfig(
        { userId, accountId },
        { txid }
    );
    if (configDbErr) {
        logg.error(`ended unsuccessfully`);
        throw new CustomError(
            `Error in getting user config`,
            fileName,
            funcName,
            400,
            true
        );
    }
    logg.info(`ended`);
    res.json({
        success: true,
        message: `${funcName} executed successfully`,
        txid,
        config: configData,
    });
}
