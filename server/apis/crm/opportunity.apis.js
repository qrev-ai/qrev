import CustomError from "../../std/custom.error.js";
import { logger } from "../../logger.js";
import * as OpportunityUtils from "../../utils/crm/opportunity.utils.js";

const fileName = "Opportunity APIs";

export async function createOpportunityApi(req, res, next) {
    const txid = req.id;
    const funcName = "createOpportunityApi";
    const logg = logger.child({ txid, funcName });
    logg.info(`started with body:`, req.body);

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
    let opportunityData = req.body;

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

    if (!opportunityData.name) {
        logg.info(`ended unsuccessfully`);
        throw new CustomError(`Missing name`, fileName, funcName, 400, true);
    }

    let [savedOpportunity, createErr] =
        await OpportunityUtils.createOpportunity(
            { opportunityData, accountId },
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
        opportunity_id: savedOpportunity._id,
    });
}

export async function getOpportunitiesApi(req, res, next) {
    const txid = req.id;
    const funcName = "getOpportunitiesApi";
    const logg = logger.child({ txid, funcName });
    logg.info(`started with query:`, req.query);

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
        stage,
        company,
        contact,
        reseller,
        min_amount: minAmount,
        max_amount: maxAmount,
        min_probability: minProbability,
        priority,
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

    if (stage) filters.stage = stage;
    if (company) filters.company = company;
    if (contact) filters.contact = contact;
    if (reseller) filters.reseller = reseller;
    if (minAmount !== undefined) filters.minAmount = parseFloat(minAmount);
    if (maxAmount !== undefined) filters.maxAmount = parseFloat(maxAmount);
    if (minProbability !== undefined)
        filters.minProbability = parseInt(minProbability);
    if (priority) filters.priority = priority;
    if (search) filters.search = search;

    const pagination = {};
    if (page) pagination.page = page;
    if (limit) pagination.limit = limit;

    let [result, getErr] = await OpportunityUtils.getOpportunities(
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

export async function deleteOpportunityApi(req, res, next) {
    const txid = req.id;
    const funcName = "deleteOpportunityApi";
    const logg = logger.child({ txid, funcName });
    logg.info(`started with query:`, req.query);

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

    // api has account_id and opportunity_id in query
    let { account_id: accountId, opportunity_id: opportunityId } = req.query;

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

    if (!opportunityId) {
        logg.info(`ended unsuccessfully`);
        throw new CustomError(
            `Missing opportunity_id`,
            fileName,
            funcName,
            400,
            true
        );
    }

    let [deletedOpportunity, deleteErr] =
        await OpportunityUtils.deleteOpportunity(
            { opportunityId, accountId },
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
        opportunity_id: deletedOpportunity._id,
    });
}

export async function getOpportunityByIdApi(req, res, next) {
    const txid = req.id;
    const funcName = "getOpportunityByIdApi";
    const logg = logger.child({ txid, funcName });
    logg.info(`started with query:`, req.query);

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

    // api has account_id and opportunity_id in query
    let { account_id: accountId, opportunity_id: opportunityId } = req.query;

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

    if (!opportunityId) {
        logg.info(`ended unsuccessfully`);
        throw new CustomError(
            `Missing opportunity_id`,
            fileName,
            funcName,
            400,
            true
        );
    }

    let [opportunity, getErr] = await OpportunityUtils.getOpportunityById(
        { opportunityId, accountId },
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
        opportunity,
    });
}

export async function getOpportunityAiAnalysisApi(req, res, next) {
    const txid = req.id;
    const funcName = "getOpportunityAiAnalysisApi";
    const logg = logger.child({ txid, funcName });
    logg.info(`started with query:`, req.query);

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

    let [analysis, getErr] = await OpportunityUtils.getOpportunityAiAnalysis(
        { accountId },
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
        analysis,
    });
}

export async function getOpportunityPipelineTimelineApi(req, res, next) {
    const txid = req.id;
    const funcName = "getOpportunityPipelineTimelineApi";
    const logg = logger.child({ txid, funcName });
    logg.info(`started with query:`, req.query);

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

    let [timeline, getErr] =
        await OpportunityUtils.getOpportunityPipelineTimeline(
            { accountId },
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
        timeline,
    });
}
