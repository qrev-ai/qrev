import CustomError from "../../std/custom.error.js";
import { logger } from "../../logger.js";
import * as ResellerUtils from "../../utils/crm/reseller.utils.js";

const fileName = "Reseller APIs";

export async function createResellerApi(req, res, next) {
    const txid = req.id;
    const funcName = "createResellerApi";
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
    let resellerData = req.body;

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

    if (!resellerData.first_name) {
        logg.info(`ended unsuccessfully`);
        throw new CustomError(
            `Missing first_name`,
            fileName,
            funcName,
            400,
            true
        );
    }

    if (!resellerData.last_name) {
        logg.info(`ended unsuccessfully`);
        throw new CustomError(
            `Missing last_name`,
            fileName,
            funcName,
            400,
            true
        );
    }

    if (!resellerData.email) {
        logg.info(`ended unsuccessfully`);
        throw new CustomError(`Missing email`, fileName, funcName, 400, true);
    }

    let [savedReseller, createErr] = await ResellerUtils.createReseller(
        { resellerData, accountId },
        { txid }
    );

    if (createErr) {
        logg.info(`ended unsuccessfully`);
        throw createErr;
    }

    logg.info(`ended`);
    res.json({
        success: true,
        message: `${funcName} executed successfully`,
        txid,
        reseller_id: savedReseller._id,
    });
}

export async function getResellersApi(req, res, next) {
    const txid = req.id;
    const funcName = "getResellersApi";
    const logg = logger.child({ txid, funcName });
    logg.info(`started with query: ${JSON.stringify(req.query)}`);

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

    // api has account_id in query, optional filters and pagination
    let {
        account_id: accountId,
        start_date: startDate,
        end_date: endDate,
        status,
        certified,
        min_score: minScore,
        max_score: maxScore,
        search,
        page,
        limit,
    } = req.query;

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

    const filters = {};
    if (startDate && endDate) {
        filters.startDate = startDate;
        filters.endDate = endDate;
    }

    if (status) filters.status = status;
    if (certified !== undefined) filters.certified = certified === "true";
    if (minScore !== undefined) filters.minScore = parseInt(minScore);
    if (maxScore !== undefined) filters.maxScore = parseInt(maxScore);
    if (search) filters.search = search;

    const pagination = {};
    if (page) pagination.page = page;
    if (limit) pagination.limit = limit;

    let [result, getErr] = await ResellerUtils.getResellers(
        { accountId, filters, pagination },
        { txid }
    );

    if (getErr) {
        logg.info(`ended unsuccessfully`);
        throw getErr;
    }

    logg.info(`ended`);
    res.json({
        success: true,
        message: `${funcName} executed successfully`,
        txid,
        ...result,
    });
}

export async function deleteResellerApi(req, res, next) {
    const txid = req.id;
    const funcName = "deleteResellerApi";
    const logg = logger.child({ txid, funcName });
    logg.info(`started with query: ${JSON.stringify(req.query)}`);

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

    // api has account_id and reseller_id in query
    let { account_id: accountId, reseller_id: resellerId } = req.query;

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

    if (!resellerId) {
        logg.info(`ended unsuccessfully`);
        throw new CustomError(
            `Missing reseller_id`,
            fileName,
            funcName,
            400,
            true
        );
    }

    let [deletedReseller, deleteErr] = await ResellerUtils.deleteReseller(
        { resellerId, accountId },
        { txid }
    );

    if (deleteErr) {
        logg.info(`ended unsuccessfully`);
        throw deleteErr;
    }

    logg.info(`ended`);
    res.json({
        success: true,
        message: `${funcName} executed successfully`,
        txid,
        reseller_id: deletedReseller._id,
    });
}

export async function getResellerByIdApi(req, res, next) {
    const txid = req.id;
    const funcName = "getResellerByIdApi";
    const logg = logger.child({ txid, funcName });
    logg.info(`started with query: ${JSON.stringify(req.query)}`);

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

    // api has account_id and reseller_id in query
    let { account_id: accountId, reseller_id: resellerId } = req.query;

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

    if (!resellerId) {
        logg.info(`ended unsuccessfully`);
        throw new CustomError(
            `Missing reseller_id`,
            fileName,
            funcName,
            400,
            true
        );
    }

    let [reseller, getErr] = await ResellerUtils.getResellerById(
        { resellerId, accountId },
        { txid }
    );

    if (getErr) {
        logg.info(`ended unsuccessfully`);
        throw getErr;
    }

    logg.info(`ended`);
    res.json({
        success: true,
        message: `${funcName} executed successfully`,
        txid,
        reseller,
    });
}

export async function getResellerLeaderboardApi(req, res, next) {
    const txid = req.id;
    const funcName = "getResellerLeaderboardApi";
    const logg = logger.child({ txid, funcName });
    logg.info(`started with query: ${JSON.stringify(req.query)}`);

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

    // api has account_id and based_on in query
    let { account_id: accountId, based_on: basedOn } = req.query;

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

    if (!basedOn) {
        logg.info(`ended unsuccessfully`);
        throw new CustomError(
            `Missing based_on parameter. Expected one of: score, response_time, conversion, satisfaction`,
            fileName,
            funcName,
            400,
            true
        );
    }

    // Validate that basedOn is one of the allowed values
    const allowedValues = [
        "score",
        "response_time",
        "conversion",
        "satisfaction",
    ];
    if (!allowedValues.includes(basedOn)) {
        logg.info(`ended unsuccessfully`);
        throw new CustomError(
            `Invalid based_on parameter. Expected one of: score, response_time, conversion, satisfaction`,
            fileName,
            funcName,
            400,
            true
        );
    }

    let [leaderboard, getErr] = await ResellerUtils.getResellerLeaderboard(
        { accountId, basedOn },
        { txid }
    );

    if (getErr) {
        logg.info(`ended unsuccessfully`);
        throw getErr;
    }

    logg.info(`ended`);
    res.json({
        success: true,
        message: `${funcName} executed successfully`,
        txid,
        leaderboard,
        based_on: basedOn,
    });
}
