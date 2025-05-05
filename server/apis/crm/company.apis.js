import CustomError from "../../std/custom.error.js";
import { logger } from "../../logger.js";
import * as CompanyUtils from "../../utils/crm/company.utils.js";

const fileName = "Company APIs";

export async function createCompanyApi(req, res, next) {
    const txid = req.id;
    const funcName = "createCompanyApi";
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

    // api has account_id in query
    let { account_id: accountId } = req.query;
    let companyData = req.body;

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

    if (!companyData.name) {
        logg.info(`ended unsuccessfully`);
        throw new CustomError(`Missing name`, fileName, funcName, 400, true);
    }

    let [savedCompany, createErr] = await CompanyUtils.createCompany(
        { companyData, accountId },
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
        company_id: savedCompany._id,
    });
}

export async function getCompaniesApi(req, res, next) {
    const txid = req.id;
    const funcName = "getCompaniesApi";
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

    // api has account_id in query, optional filters and pagination
    let {
        account_id: accountId,
        start_date: startDate,
        end_date: endDate,
        status,
        industry,
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
    if (industry) filters.industry = industry;
    if (search) filters.search = search;

    const pagination = {};
    if (page) pagination.page = page;
    if (limit) pagination.limit = limit;

    let [result, getErr] = await CompanyUtils.getCompanies(
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

export async function deleteCompanyApi(req, res, next) {
    const txid = req.id;
    const funcName = "deleteCompanyApi";
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

    // api has account_id and company_id in query
    let { account_id: accountId, company_id: companyId } = req.query;

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

    if (!companyId) {
        logg.info(`ended unsuccessfully`);
        throw new CustomError(
            `Missing company_id`,
            fileName,
            funcName,
            400,
            true
        );
    }

    let [deletedCompany, deleteErr] = await CompanyUtils.deleteCompany(
        { companyId, accountId },
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
        company_id: deletedCompany._id,
    });
}

export async function getCompanyByIdApi(req, res, next) {
    const txid = req.id;
    const funcName = "getCompanyByIdApi";
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

    // api has account_id and company_id in query
    let { account_id: accountId, company_id: companyId } = req.query;

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

    if (!companyId) {
        logg.info(`ended unsuccessfully`);
        throw new CustomError(
            `Missing company_id`,
            fileName,
            funcName,
            400,
            true
        );
    }

    let [company, getErr] = await CompanyUtils.getCompanyById(
        { companyId, accountId },
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
        company,
    });
}
