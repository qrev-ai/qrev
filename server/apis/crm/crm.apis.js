import CustomError from "../../std/custom.error.js";
import { logger } from "../../logger.js";

const fileName = "CRM APIs";

export async function isUserAllowedToUseResellerApi(req, res, next) {
    const txid = req.id;
    const funcName = "isUserAllowedToUseResellerApi";
    const logg = logger.child({ txid, funcName });
    logg.info(`started with body: ${JSON.stringify(req.body)}`);

    // let userId = req.user && req.user.userId ? req.user.userId : null;
    // if (!userId) {
    //     logg.info(`ended unsuccessfully`);
    //     throw new CustomError(
    //         `Missing userId from decoded access token`,
    //         fileName,
    //         funcName,
    //         400,
    //         true
    //     );
    // }

    // api has account_id in query
    let { account_id: accountId } = req.query;

    if (!accountId) {
        logg.info(`ended unsuccessfully`);
        throw new CustomError(
            `Missing account_id`,
            fileName,
            funcName,
            400,
            true
        );
    }

    // check if user is allowed to use reseller api
    let allowedAccuntIds = process.env.TEST_ACCOUNTS.split(",");
    let isAllowed = false;
    if (allowedAccuntIds.includes(accountId)) {
        logg.info(`this user is allowed to use reseller api`);
        isAllowed = true;
    }

    logg.info(`ended`);
    res.json({
        success: true,
        message: `${funcName} executed successfully`,
        txid,
        is_allowed: isAllowed,
    });
}
