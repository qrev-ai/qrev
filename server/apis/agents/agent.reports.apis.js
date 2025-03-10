import { logger } from "../../logger.js";
import CustomError from "../../std/custom.error.js";
import * as ReportUtils from "../../utils/agents/report.utils.js";

const fileName = "Agent Reports APIs";

export async function getAllCompanyReportsApi(req, res, next) {
    const txid = req.id;
    const funcName = "getAllCompanyReportsApi";
    const logg = logger.child({ txid, funcName });
    logg.info(`Started with query: ${JSON.stringify(req.query)}`);

    let userId = req.user && req.user.userId ? req.user.userId : null;
    if (!userId) {
        logg.info("Missing userId from decoded access token");
        throw new CustomError(
            "Missing userId from decoded access token",
            fileName,
            funcName
        );
    }

    let { account_id: accountId, create_if_not_present } = req.query;
    if (!accountId) {
        logg.info("Missing account_id from query");
        throw new CustomError(
            "Missing account_id from query",
            fileName,
            funcName
        );
    }

    // Convert the optional parameter to a boolean
    let createIfNotPresentBool = create_if_not_present === "true";

    let [reports, reportsErr] = await ReportUtils.getAllCompanyReports(
        { accountId, userId, createIfNotPresent: createIfNotPresentBool },
        { txid }
    );
    if (reportsErr) {
        logg.info("reportsErr: " + reportsErr);
        throw new CustomError(
            "Error fetching company reports",
            fileName,
            funcName
        );
    }

    res.status(200).json({
        success: true,
        message: "Company reports fetched successfully",
        result: reports,
    });
}

export async function createCustomReportApi(req, res, next) {
    const txid = req.id;
    const funcName = "createCustomReportApi";
    const logg = logger.child({ txid, funcName });
    logg.info(`Started with body: ${JSON.stringify(req.body)}`);

    let userId = req.user && req.user.userId ? req.user.userId : null;
    if (!userId) {
        logg.info("Missing userId from decoded access token");
        throw new CustomError(
            "Missing userId from decoded access token",
            fileName,
            funcName
        );
    }

    let { account_id: accountId } = req.query;
    if (!accountId) {
        logg.info("Missing account_id from query");
        throw new CustomError(
            "Missing account_id from query",
            fileName,
            funcName
        );
    }

    let { name, description } = req.body;
    if (!name) {
        logg.info("Missing name from body");
        throw new CustomError("Missing name from body", fileName, funcName);
    }
    if (!description) {
        logg.info("Missing description from body");
        throw new CustomError(
            "Missing description from body",
            fileName,
            funcName
        );
    }

    let [report, reportErr] = await ReportUtils.createCustomReport(
        { accountId, userId, name, description },
        { txid }
    );
    if (reportErr) {
        logg.info("reportErr: " + reportErr);
        throw new CustomError(
            "Error creating custom report",
            fileName,
            funcName
        );
    }

    res.status(200).json({
        success: true,
        message: "Custom report created successfully",
        result: report,
    });
}

export async function getCompanyReportApi(req, res, next) {
    const txid = req.id;
    const funcName = "getCompanyReportApi";
    const logg = logger.child({ txid, funcName });
    logg.info(`Started with query: ${JSON.stringify(req.query)}`);

    let userId = req.user && req.user.userId ? req.user.userId : null;
    if (!userId) {
        logg.info("Missing userId from decoded access token");
        throw new CustomError(
            "Missing userId from decoded access token",
            fileName,
            funcName
        );
    }

    let { account_id: accountId, _id: reportId } = req.query;
    if (!accountId) {
        logg.info("Missing account_id from query");
        throw new CustomError(
            "Missing account_id from query",
            fileName,
            funcName
        );
    }
    if (!reportId) {
        logg.info("Missing _id from query");
        throw new CustomError("Missing _id from query", fileName, funcName);
    }

    let [report, reportErr] = await ReportUtils.getCompanyReport(
        { accountId, userId, reportId },
        { txid }
    );
    if (reportErr) {
        logg.info("reportErr: " + reportErr);
        throw new CustomError(
            "Error fetching company report",
            fileName,
            funcName
        );
    }

    res.status(200).json({
        success: true,
        message: "Company report fetched successfully",
        result: report,
    });
}

export async function getAgentReportsByCompanyApi(req, res, next) {
    const txid = req.id;
    const funcName = "getAgentReportsByCompanyApi";
    const logg = logger.child({ txid, funcName });
    logg.info(`Started with query: ${JSON.stringify(req.query)}`);

    let userId = req.user && req.user.userId ? req.user.userId : null;
    if (!userId) {
        logg.info("Missing userId from decoded access token");
        throw new CustomError(
            "Missing userId from decoded access token",
            fileName,
            funcName
        );
    }

    let {
        account_id: accountId,
        company_artifact_id: companyArtifactId,
        agent_id: agentId,
    } = req.query;
    if (!accountId) {
        logg.info("Missing account_id from query");
        throw new CustomError(
            "Missing account_id from query",
            fileName,
            funcName
        );
    }
    if (!companyArtifactId) {
        logg.info("Missing company_artifact_id from query");
        throw new CustomError(
            "Missing company_artifact_id from query",
            fileName,
            funcName
        );
    }
    if (!agentId) {
        logg.info("Missing agent_id from query");
        throw new CustomError(
            "Missing agent_id from query",
            fileName,
            funcName
        );
    }

    let [reports, reportsErr] = await ReportUtils.getAgentReportsByCompany(
        { accountId, userId, companyArtifactId, agentId },
        { txid }
    );
    if (reportsErr) {
        logg.info("reportsErr: " + reportsErr);
        throw new CustomError(
            "Error fetching agent reports for company",
            fileName,
            funcName
        );
    }

    res.status(200).json({
        success: true,
        message: "Agent reports for company fetched successfully",
        result: reports,
    });
}

export async function getPublicAgentReportsByCompanyApi(req, res, next) {
    const txid = req.id;
    const funcName = "getPublicAgentReportsByCompanyApi";
    const logg = logger.child({ txid, funcName });
    logg.info(`Started with query: ${JSON.stringify(req.query)}`);

    let { company_artifact_id: companyArtifactId, agent_id: agentId } =
        req.query;
    if (!companyArtifactId) {
        logg.info("Missing company_artifact_id from query");
        throw new CustomError(
            "Missing company_artifact_id from query",
            fileName,
            funcName
        );
    }
    if (!agentId) {
        logg.info("Missing agent_id from query");
        throw new CustomError(
            "Missing agent_id from query",
            fileName,
            funcName
        );
    }

    let [reports, reportsErr] = await ReportUtils.getAgentReportsByCompany(
        { companyArtifactId, agentId, isPublic: true },
        { txid }
    );
    if (reportsErr) {
        logg.info("reportsErr: " + reportsErr);
        throw new CustomError(
            "Error fetching agent reports for company",
            fileName,
            funcName
        );
    }

    res.status(200).json({
        success: true,
        message: "Agent reports for company fetched successfully",
        result: reports,
    });
}
