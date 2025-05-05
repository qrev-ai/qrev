import { functionWrapper } from "../../std/wrappers.js";
import CustomError from "../../std/custom.error.js";
import { logger } from "../../logger.js";
import { Company } from "../../models/crm/company.model.js";

const fileName = "Company Utils";

async function _createCompany(
    { companyData, accountId },
    { logg, txid, funcName }
) {
    logg.info(`started`);

    const company = new Company({
        ...companyData,
        account: accountId,
    });

    const savedCompany = await company.save();

    logg.info(`ended`);
    return [savedCompany, null];
}

export const createCompany = functionWrapper(
    fileName,
    "createCompany",
    _createCompany
);

async function _getCompanies(
    { accountId, filters = {}, pagination = {} },
    { logg, txid, funcName }
) {
    logg.info(`started`);

    const query = { account: accountId };

    // Apply filters
    if (filters.startDate && filters.endDate) {
        query.created_on = {
            $gte: new Date(filters.startDate),
            $lte: new Date(filters.endDate),
        };
    }

    if (filters.status) {
        query.status = filters.status;
    }

    if (filters.industry) {
        query.industry = filters.industry;
    }

    if (filters.search) {
        query.$or = [
            { name: { $regex: filters.search, $options: "i" } },
            { industry: { $regex: filters.search, $options: "i" } },
            { description: { $regex: filters.search, $options: "i" } },
        ];
    }

    // Set up pagination
    const page = parseInt(pagination.page) || 1;
    const limit = parseInt(pagination.limit) || 10;
    const skip = (page - 1) * limit;

    // Execute query
    const totalCount = await Company.countDocuments(query);
    const companies = await Company.find(query)
        .sort({ created_on: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

    const result = {
        companies,
        pagination: {
            total: totalCount,
            page,
            limit,
            pages: Math.ceil(totalCount / limit),
        },
    };

    logg.info(`ended`);
    return [result, null];
}

export const getCompanies = functionWrapper(
    fileName,
    "getCompanies",
    _getCompanies
);

async function _deleteCompany(
    { companyId, accountId },
    { logg, txid, funcName }
) {
    logg.info(`started`);

    const company = await Company.findOne({
        _id: companyId,
        account: accountId,
    }).lean();

    if (!company) {
        throw `Company not found with id: ${companyId}`;
    }

    const deletedCompany = await Company.findOneAndDelete({
        _id: companyId,
        account: accountId,
    }).lean();

    logg.info(`ended`);
    return [deletedCompany, null];
}

export const deleteCompany = functionWrapper(
    fileName,
    "deleteCompany",
    _deleteCompany
);

async function _getCompanyById(
    { companyId, accountId },
    { logg, txid, funcName }
) {
    logg.info(`started`);

    const company = await Company.findOne({
        _id: companyId,
        account: accountId,
    }).lean();

    if (!company) {
        throw `Company not found with id: ${companyId}`;
    }

    logg.info(`ended`);
    return [company, null];
}

export const getCompanyById = functionWrapper(
    fileName,
    "getCompanyById",
    _getCompanyById
);
