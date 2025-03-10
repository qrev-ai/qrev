import { functionWrapper } from "../../std/wrappers.js";
import CustomError from "../../std/custom.error.js";
import { logger } from "../../logger.js";
import { v4 as uuidv4 } from "uuid";
import { CompanyReport } from "../../models/agents/company_report.model.js";
import { AgentReports } from "../../models/agents/agent.reports.model.js";
import {
    DefaultCompanyReports,
    SupportedCompanyReportTypes,
} from "../../config/agents/report.config.js";
import { Agent } from "../../models/agents/agent.model.js";

const fileName = "Report Utils";

// Helper function to create default reports for an account
async function createDefaultReports(accountId, userId, { txid, logg }) {
    logg.info(`Creating default reports for account: ${accountId}`);
    const reportsToCreate = DefaultCompanyReports.map((report) => ({
        _id: uuidv4(),
        account: accountId,
        name: report.title,
        description: report.description,
        type: SupportedCompanyReportTypes.Default,
        created_on: new Date(),
        updated_on: new Date(),
    }));

    const createdReports = await CompanyReport.insertMany(reportsToCreate);
    logg.info(`Created ${createdReports.length} default reports`);
    return createdReports;
}

// Get all company reports for an account
async function _getAllCompanyReports(
    { accountId, userId, createIfNotPresent },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    if (!accountId) throw `accountId is invalid`;
    if (!userId) throw `userId is invalid`;

    // Check for existing reports
    let existingReports = await CompanyReport.find({
        account: accountId,
    }).lean();
    logg.info(`Found ${existingReports.length} existing reports`);

    // Create default reports if none exist and flag is set
    if (existingReports.length === 0 && createIfNotPresent) {
        existingReports = await createDefaultReports(accountId, userId, {
            txid,
            logg,
        });
    }

    logg.info(`ended`);
    return [existingReports, null];
}

export const getAllCompanyReports = functionWrapper(
    fileName,
    "getAllCompanyReports",
    _getAllCompanyReports
);

// Create a custom company report
async function _createCustomReport(
    { accountId, userId, name, description },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    if (!accountId) throw `accountId is invalid`;
    if (!userId) throw `userId is invalid`;
    if (!name) throw `name is invalid`;
    if (!description) throw `description is invalid`;

    const reportId = uuidv4();
    const reportObj = {
        _id: reportId,
        account: accountId,
        name,
        description,
        type: SupportedCompanyReportTypes.Custom,
        created_on: new Date(),
        updated_on: new Date(),
    };

    const createdReport = await CompanyReport.create(reportObj);
    logg.info(`Created custom report: ${JSON.stringify(createdReport)}`);

    logg.info(`ended`);
    return [createdReport, null];
}

export const createCustomReport = functionWrapper(
    fileName,
    "createCustomReport",
    _createCustomReport
);

// Get a single company report
async function _getCompanyReport(
    { accountId, userId, reportId },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    if (!accountId) throw `accountId is invalid`;
    if (!userId) throw `userId is invalid`;
    if (!reportId) throw `reportId is invalid`;

    const report = await CompanyReport.findOne({
        _id: reportId,
        account: accountId,
    }).lean();

    if (!report) {
        throw new CustomError("Report not found", fileName, funcName);
    }

    logg.info(`ended`);
    return [report, null];
}

export const getCompanyReport = functionWrapper(
    fileName,
    "getCompanyReport",
    _getCompanyReport
);

// Get agent reports by company artifact ID and agent ID
async function _getAgentReportsByCompany(
    { accountId, userId, companyArtifactId, agentId, isPublic = false },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    if (!companyArtifactId) throw `companyArtifactId is invalid`;
    if (!agentId) throw `agentId is invalid`;

    if (isPublic) {
        let agentDoc = await Agent.findOne({
            _id: agentId,
        }).lean();
        if (!agentDoc) throw `agent not found`;
        if (!agentDoc.is_sharing_enabled) throw `agent is not sharing`;
        accountId = agentDoc.account;
        userId = agentDoc.user;
    }

    const reports = await AgentReports.find({
        account: accountId,
        company_id: companyArtifactId,
        agent: agentId,
    }).lean();

    logg.info(
        `Found ${reports.length} reports for company artifact ${companyArtifactId} and agent ${agentId}`
    );
    logg.info(`ended`);
    return [reports, null];
}

export const getAgentReportsByCompany = functionWrapper(
    fileName,
    "getAgentReportsByCompany",
    _getAgentReportsByCompany
);
