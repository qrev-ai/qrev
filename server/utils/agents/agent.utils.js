import axios from "axios";
import { functionWrapper } from "../../std/wrappers.js";
import CustomError from "../../std/custom.error.js";
import { logger } from "../../logger.js";

import { v4 as uuidv4 } from "uuid";

import { Agent } from "../../models/agents/agent.model.js";
import { SupportedAgentTypes } from "../../config/agents/agent.config.js";
import {
    getAnalyzedProspectsCollection,
    getProspectsCollection,
} from "../../models/agents/analyzed.prospects.model.js";
import * as ArtifactConfig from "../../config/qrev_crm/artifact.config.js";
import { AgentArtifact } from "../../models/agents/agent.artifact.model.js";
import * as AgentStatusHandler from "../../websocket/handlers/agent.status.handler.js";
import { AgentStatus } from "../../models/agents/agent.status.model.js";

const fileName = "Agent Utils";

// Add this function at the beginning of the file
function isValidAgentType(type) {
    return SupportedAgentTypes.includes(type);
}

// Create a new agent
async function _createAgent(
    { accountId, userId, name, description, type },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    if (!accountId) throw `accountId is invalid`;
    if (!userId) throw `userId is invalid`;
    if (!name) throw `name is invalid`;
    if (!description) throw `description is invalid`;
    if (!type) throw `type is invalid`;
    if (!isValidAgentType(type))
        throw new CustomError(
            `Invalid agent type: ${type}`,
            fileName,
            funcName
        );

    const agentId = uuidv4();
    const agentObj = {
        _id: agentId,
        account: accountId,
        created_by: userId,
        name,
        description,
        type,
    };

    let agentDocResp = await Agent.insertMany([agentObj]);
    let agentDoc = agentDocResp[0];

    // Create initial status
    const statusId = uuidv4();
    let statusDocResp = await AgentStatus.insertMany([
        {
            _id: statusId,
            account: accountId,
            agent: agentId,
            name: "created",
            state: "not_applicable",
        },
    ]);
    let statusDoc = statusDocResp[0];
    logg.info(`statusDoc created: ${JSON.stringify(statusDoc)}`);
    agentDoc.status = statusDoc.name;

    logg.info(`agentDoc created: ${JSON.stringify(agentDoc)}`);

    logg.info(`ended`);
    return [agentDoc, null];
}

export const createAgent = functionWrapper(
    fileName,
    "createAgent",
    _createAgent
);

// Get an agent by ID
async function _getAgent(
    { accountId, userId, agentId },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    if (!accountId) throw `accountId is invalid`;
    if (!userId) throw `userId is invalid`;
    if (!agentId) throw `agentId is invalid`;

    let agentDoc = await Agent.findOne({
        _id: agentId,
        account: accountId,
    }).lean();
    if (!agentDoc) {
        throw new CustomError(`Agent not found`, fileName, funcName);
    }

    logg.info(`ended`);
    return [agentDoc, null];
}

export const getAgent = functionWrapper(fileName, "getAgent", _getAgent);

// Update an existing agent
async function _updateAgent(
    { accountId, userId, agentId, name, description, type },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    if (!accountId) throw `accountId is invalid`;
    if (!userId) throw `userId is invalid`;
    if (!agentId) throw `agentId is invalid`;
    if (!name) throw `name is invalid`;
    if (!description) throw `description is invalid`;
    if (!type) throw `type is invalid`;
    if (!isValidAgentType(type))
        throw new CustomError(
            `Invalid agent type: ${type}`,
            fileName,
            funcName
        );

    let agentDoc = await Agent.findOneAndUpdate(
        { _id: agentId, account: accountId },
        { name, description, type, updated_on: Date.now() },
        { new: true }
    );

    if (!agentDoc) {
        throw new CustomError(`Agent not found`, fileName, funcName);
    }

    logg.info(`agentDoc updated: ${JSON.stringify(agentDoc)}`);
    logg.info(`ended`);
    return [agentDoc, null];
}

export const updateAgent = functionWrapper(
    fileName,
    "updateAgent",
    _updateAgent
);

// Delete an agent
async function _deleteAgent(
    { accountId, userId, agentId },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    if (!accountId) throw `accountId is invalid`;
    if (!userId) throw `userId is invalid`;
    if (!agentId) throw `agentId is invalid`;

    // First delete any associated artifacts
    const deletedArtifacts = await AgentArtifact.deleteMany({
        agent: agentId,
        account: accountId,
    });
    logg.info(`Deleted ${deletedArtifacts.deletedCount} associated artifacts`);

    let agentDoc = await Agent.findOneAndDelete({
        _id: agentId,
        account: accountId,
    });
    if (!agentDoc) {
        throw new CustomError(`Agent not found`, fileName, funcName);
    }

    logg.info(`agentDoc deleted: ${JSON.stringify(agentDoc)}`);
    logg.info(`ended`);
    return [agentDoc, null];
}

export const deleteAgent = functionWrapper(
    fileName,
    "deleteAgent",
    _deleteAgent
);

// List all agents for an account
async function _listAgents(
    { accountId, userId, getStatusInfo = false },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    if (!accountId) throw `accountId is invalid`;
    if (!userId) throw `userId is invalid`;

    let agents = await Agent.find({ account: accountId }).lean();
    logg.info(`agents fetched: ${agents.length}`);

    if (getStatusInfo) {
        logg.info(`getStatusInfo is true. so getting complete status`);
        const agentIds = agents.map((agent) => agent._id);
        const statuses = await AgentStatus.find({
            agent: { $in: agentIds },
            account: accountId,
            state: { $in: ["finished", "not_applicable"] },
        })
            .sort({ created_on: -1 })
            .lean();

        const latestStatusByAgent = statuses.reduce((acc, status) => {
            if (!acc[status.agent]) {
                acc[status.agent] = status;
            }
            return acc;
        }, {});

        agents = agents.map((agent) => {
            const latestStatus = latestStatusByAgent[agent._id];
            let status = latestStatus?.name || "";
            let message = latestStatus?.message || "";
            let progress = latestStatus?.progress_percentage;

            if (message) {
                status = status + ": " + message;
            }
            if (progress) {
                status = status + " (" + progress + "%)";
            }
            return { ...agent, status };
        });
    }

    if (agents.length <= 10) {
        logg.info(`agents: ${JSON.stringify(agents)}`);
    }

    logg.info(`ended`);
    return [agents, null];
}

export const listAgents = functionWrapper(fileName, "listAgents", _listAgents);

async function _dailyProspectUpdates(
    { accountId, userId },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    if (!accountId) throw `accountId is invalid`;
    if (!userId) throw `userId is invalid`;

    let agents = await Agent.find({ account: accountId }).select("_id").lean();
    let agentIds = agents.map((agent) => agent._id);

    let pendingArtifacts = await AgentArtifact.find({
        agent: { $in: agentIds },
        "review_status.status": "pending",
    }).lean();

    // Group artifacts by type and create headers
    const groupedArtifacts = groupArtifactsByType(pendingArtifacts);

    // Convert to array format
    let result = Object.values(groupedArtifacts);

    if (pendingArtifacts.length <= 10) {
        logg.info(`Grouped artifacts by type: ${JSON.stringify(result)}`);
    }

    // result = [
    //     {
    //         type: "company",
    //         headers: ArtifactConfig.SUPPORTED_ARTIFACT_TYPES["company"],
    //         artifacts: [
    //             {
    //                 _id: "74bea328-15d2-4142-bffc-086775544c72",
    //                 type: "company",
    //                 parent_artifact_id: "835bf755-567f-49b9-b589-b5ddb1e8b9ad",
    //                 analysis_result: {
    //                     confidence_score: 10,
    //                     analysis_reasons: [
    //                         "No relevant information about west coast pharma companies working on large molecules",
    //                         "Encountered a captcha/bot verification page",
    //                         "Source is a startup networking platform with no direct pharmaceutical company details",
    //                     ],
    //                 },
    //                 properties: {
    //                     name: "F6S Network Limited",
    //                     homepage_url: "https://www.f6s.com",
    //                     primary_industry:
    //                         "Technology Platform / Startup Network",
    //                     employee_count: 10,
    //                     review_status: "pending",
    //                     review_status_updated_on: "2025-01-25T12:32:25.878Z",
    //                 },
    //                 created_on: "2025-01-25T12:32:25.878Z",
    //                 updated_on: "2025-01-25T12:32:25.878Z",
    //                 owner: "65269526e7e5e7f1d991e9f0",
    //                 account: "652a31a0a7e0abdf1796b9bf",
    //             },
    //             {
    //                 _id: "5f4e9aca-fa18-4615-92ba-56061d6a5ffc",
    //                 type: "company",
    //                 parent_artifact_id: "835bf755-567f-49b9-b589-b5ddb1e8b9ad",
    //                 analysis_result: {
    //                     confidence_score: 90,
    //                     analysis_reasons: [
    //                         "Amgen is a west coast pharma company specifically located in Thousand Oaks, California",
    //                         "Confirmed as a large molecule biotechnology/pharmaceutical company",
    //                         "Currently hiring over 25 roles across California, including scientific positions like principal scientist in biotransformation",
    //                         "Headquarters focused on research and scientific roles",
    //                         "Meets all key criteria for west coast large molecule pharma company",
    //                     ],
    //                 },
    //                 properties: {
    //                     name: "Amgen",
    //                     homepage_url: "https://www.amgen.com/",
    //                     primary_industry: "Biotechnology/Pharmaceuticals",
    //                     review_status: "pending",
    //                     review_status_updated_on: "2025-01-25T12:32:43.440Z",
    //                 },
    //                 created_on: "2025-01-25T12:32:43.440Z",
    //                 updated_on: "2025-01-25T12:32:43.440Z",
    //                 owner: "65269526e7e5e7f1d991e9f0",
    //                 account: "652a31a0a7e0abdf1796b9bf",
    //             },
    //         ],
    //     },
    //     {
    //         type: "contact",
    //         headers: ArtifactConfig.SUPPORTED_ARTIFACT_TYPES["contact"],
    //         artifacts: [
    //             {
    //                 _id: "5f4e9aca-fa18-4615-92ba-56061d6a5ffc",
    //                 type: "contact",
    //                 parent_artifact_id: "835bf755-567f-49b9-b589-b5ddb1e8b9ad",
    //                 analysis_result: {
    //                     confidence_score: 35,
    //                     analysis_reasons: [
    //                         "User has a valid email address",
    //                         "User has a valid phone number",
    //                         "User has a valid LinkedIn profile",
    //                         "User has a valid Twitter profile",
    //                     ],
    //                 },
    //                 properties: {
    //                     // Basic Info
    //                     first_name: "Test 1",
    //                     last_name: "User 1",
    //                     email: "test1@test.com",
    //                     phone: "1234567890",

    //                     // Professional Info
    //                     job_title: "Software Engineer",
    //                     department: "Engineering",

    //                     // Social Media
    //                     linkedin_url: "https://www.linkedin.com/in/test1",
    //                     twitter_url: "https://www.twitter.com/test1",

    //                     // Address
    //                     street_address: "1234 Main St",
    //                     city: "San Francisco",
    //                     state: "CA",
    //                     postal_code: "94101",
    //                     country: "USA",

    //                     // Other
    //                     lead_source: "LinkedIn",
    //                     lead_status: "new",
    //                     lifecycle_stage: "subscriber",
    //                 },
    //                 created_on: "2025-01-25T12:32:43.440Z",
    //                 updated_on: "2025-01-25T12:32:43.440Z",
    //                 owner: "65269526e7e5e7f1d991e9f0",
    //                 account: "652a31a0a7e0abdf1796b9bf",
    //             },
    //         ],
    //     },
    // ];

    logg.info(`ended`);
    return [result, null];
}

export const dailyProspectUpdates = functionWrapper(
    fileName,
    "dailyProspectUpdates",
    _dailyProspectUpdates
);

// Archive an agent
async function _archiveAgent(
    { accountId, userId, agentId },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    if (!accountId) throw `accountId is invalid`;
    if (!userId) throw `userId is invalid`;
    if (!agentId) throw `agentId is invalid`;

    let agentDoc = await Agent.findOneAndUpdate(
        { _id: agentId, account: accountId },
        {
            is_archived: true,
            updated_on: Date.now(),
        },
        { new: true }
    );

    if (!agentDoc) {
        throw new CustomError(`Agent not found`, fileName, funcName);
    }

    // Create archived status
    const statusId = uuidv4();
    let statusDocResp = await AgentStatus.insertMany([
        {
            _id: statusId,
            account: accountId,
            agent: agentId,
            name: "archived",
            state: "not_applicable",
        },
    ]);
    let statusDoc = statusDocResp[0];
    logg.info(`archived statusDoc created: ${JSON.stringify(statusDoc)}`);

    logg.info(`agentDoc archived: ${JSON.stringify(agentDoc)}`);
    logg.info(`ended`);
    return [agentDoc, null];
}

export const archiveAgent = functionWrapper(
    fileName,
    "archiveAgent",
    _archiveAgent
);

// Pause an agent
async function _pauseAgent(
    { accountId, userId, agentId },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    if (!accountId) throw `accountId is invalid`;
    if (!userId) throw `userId is invalid`;
    if (!agentId) throw `agentId is invalid`;

    let agentDoc = await Agent.findOneAndUpdate(
        { _id: agentId, account: accountId },
        {
            updated_on: Date.now(),
        },
        { new: true }
    );

    if (!agentDoc) {
        throw new CustomError(`Agent not found`, fileName, funcName);
    }

    // Create paused status
    const statusId = uuidv4();
    let statusDocResp = await AgentStatus.insertMany([
        {
            _id: statusId,
            account: accountId,
            agent: agentId,
            name: "paused",
            state: "not_applicable",
        },
    ]);
    let statusDoc = statusDocResp[0];
    logg.info(`paused statusDoc created: ${JSON.stringify(statusDoc)}`);

    logg.info(`ended`);
    return [agentDoc, null];
}

export const pauseAgent = functionWrapper(fileName, "pauseAgent", _pauseAgent);

async function _resumeAgent(
    { accountId, userId, agentId },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    if (!accountId) throw `accountId is invalid`;
    if (!userId) throw `userId is invalid`;
    if (!agentId) throw `agentId is invalid`;

    let agentDoc = await Agent.findOneAndUpdate(
        { _id: agentId, account: accountId },
        {
            updated_on: Date.now(),
        },
        { new: true }
    );

    if (!agentDoc) {
        throw new CustomError(`Agent not found`, fileName, funcName);
    }

    // Create running status
    const statusId = uuidv4();
    let statusDocResp = await AgentStatus.insertMany([
        {
            _id: statusId,
            account: accountId,
            agent: agentId,
            name: "running",
            state: "not_applicable",
        },
    ]);
    let statusDoc = statusDocResp[0];
    logg.info(`running statusDoc created: ${JSON.stringify(statusDoc)}`);

    logg.info(`ended`);
    return [agentDoc, null];
}

export const resumeAgent = functionWrapper(
    fileName,
    "resumeAgent",
    _resumeAgent
);

async function _executeAgent(
    { accountId, userId, agentId, agentDoc, userTimezone },
    { txid, logg, funcName }
) {
    logg.info(`started`);

    if (!agentDoc && agentId) {
        agentDoc = await Agent.findOne({ _id: agentId, account: accountId });
    }

    if (!agentDoc) {
        throw new CustomError(`Agent not found`, fileName, funcName);
    }

    agentId = agentId || agentDoc._id;

    let aiServerUrl = process.env.AI_BOT_SERVER_URL;
    if (!aiServerUrl) {
        throw new CustomError(`AI server URL not found`, fileName, funcName);
    }

    aiServerUrl = aiServerUrl + "/flaskapi/research";
    let aiServerToken = process.env.AI_BOT_SERVER_TOKEN;
    if (!aiServerToken) {
        throw new CustomError(`AI server token not found`, fileName, funcName);
    }

    let asyncUrl =
        "/api/agent/execution_update_async?secretKey=" +
        aiServerToken +
        "&agent_id=" +
        agentId;
    if (process.env.ENVIRONMENT_TYPE === "dev") {
        asyncUrl = "http://localhost:8080" + asyncUrl;
    } else {
        asyncUrl = process.env.SERVER_URL_PATH + asyncUrl;
    }

    let aiServerBody = {
        secret_key: aiServerToken,
        agent_id: agentId,
        query: agentDoc.description || agentDoc.name || "",
        user_timezone: userTimezone,
        async_url: asyncUrl,
        user_id: userId,
        account_id: accountId,
    };

    logg.info(`aiServerBody: ${JSON.stringify(aiServerBody)}`);

    let aiServerResp = await axios.post(aiServerUrl, aiServerBody);
    logg.info(`aiServerResp: ${JSON.stringify(aiServerResp.data)}`);

    // update agent status to
    let updatedAgentDoc = await Agent.findOneAndUpdate(
        { _id: agentId, account: accountId },
        {
            updated_on: Date.now(),
        },
        { new: true }
    );
    logg.info(`updatedAgentDoc: ${JSON.stringify(updatedAgentDoc)}`);

    // Create running status
    const statusId = uuidv4();
    let statusDocResp = await AgentStatus.insertMany([
        {
            _id: statusId,
            account: accountId,
            agent: agentId,
            name: "running",
            state: "not_applicable",
        },
    ]);
    let statusDoc = statusDocResp[0];
    logg.info(`running statusDoc created: ${JSON.stringify(statusDoc)}`);

    updatedAgentDoc.status = statusDoc.name;

    logg.info(`ended`);
    return [updatedAgentDoc, null];
}

export const executeAgent = functionWrapper(
    fileName,
    "executeAgent",
    _executeAgent
);

async function _updateExecutionStatus(
    {
        agentId,
        statusId,
        statusName,
        statusState,
        message,
        progressPercentage,
        artifactType,
    },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    if (!agentId) {
        throw new CustomError(`agentId is invalid`, fileName, funcName);
    }
    if (!statusId) {
        throw new CustomError(`statusId is invalid`, fileName, funcName);
    }
    if (!statusName) {
        throw new CustomError(`statusName is invalid`, fileName, funcName);
    }
    if (!statusState) {
        throw new CustomError(`statusState is invalid`, fileName, funcName);
    }

    let agentDoc = await Agent.findOne({ _id: agentId });
    if (!agentDoc) {
        throw new CustomError(`Agent not found`, fileName, funcName);
    }

    let accountId = agentDoc.account;

    let statusDoc;
    if (statusState === "started") {
        // Create new status document
        let createObj = {
            _id: statusId,
            account: accountId,
            agent: agentId,
            name: statusName,
            state: statusState,
        };
        if (message) {
            createObj.message = message;
        }
        if (progressPercentage) {
            createObj.progress_percentage = progressPercentage;
        }

        let insertResp = await AgentStatus.insertMany([createObj]);
        statusDoc = insertResp[0];
    } else {
        // Update existing status document
        let updateObj = {
            state: statusState,
            updated_on: new Date(),
        };

        if (message) {
            updateObj.message = message;
        }
        if (progressPercentage) {
            updateObj.progress_percentage = progressPercentage;
        }
        if (statusState === "finished" || statusState === "failed") {
            updateObj.finished_on = Date.now();
        }

        let metaParams = { new: true };

        if (statusState === "not_applicable") {
            metaParams.upsert = true;
            updateObj.name = statusName;
            updateObj.agent = agentId;
        }

        statusDoc = await AgentStatus.findOneAndUpdate(
            { _id: statusId, account: accountId },
            updateObj,
            metaParams
        );

        if (!statusDoc) {
            throw new CustomError(
                `Status document not found`,
                fileName,
                funcName
            );
        }
    }

    logg.info(`agent status updated: ${JSON.stringify(statusDoc)}`);

    // Update agent document
    let agentUpdateObj = {
        updated_on: new Date(),
        execution_result_review_status: "not_seen",
    };

    if (artifactType) {
        agentUpdateObj.artifact_type = artifactType;
    }

    let updatedAgentDoc = await Agent.findOneAndUpdate(
        { _id: agentId },
        agentUpdateObj,
        { new: true }
    );

    if (!updatedAgentDoc) {
        throw new CustomError(`Agent not found`, fileName, funcName);
    }

    let statusUpdates = await AgentStatus.find({
        agent: agentId,
        account: accountId,
    })
        .sort({ created_on: 1 })
        .lean();
    logg.info(`will broadcast ${statusUpdates.length} status updates`);

    // Broadcast status update via WebSocket
    AgentStatusHandler.broadcastAgentStatus(
        { agentId, statusUpdates },
        { txid }
    );

    logg.info(`ended`);
    return [true, null];
}

export const updateExecutionStatus = functionWrapper(
    fileName,
    "updateExecutionStatus",
    _updateExecutionStatus
);

async function _getAgentStatusUpdates(
    { accountId, agentId },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    if (!accountId) throw `accountId is invalid`;
    if (!agentId) throw `agentId is invalid`;

    let agentDoc = await Agent.findOne({
        _id: agentId,
        account: accountId,
    })
        .select("_id artifact_type")
        .lean();

    if (!agentDoc) {
        throw new CustomError(`Agent not found`, fileName, funcName);
    }

    let artifacts = await AgentArtifact.find({
        agent: agentId,
        account: accountId,
    }).lean();

    let groupedArtifacts = groupArtifactsByType(artifacts);
    logg.info(`groupedArtifacts: ${JSON.stringify(groupedArtifacts)}`);
    logg.info(`agentDoc.artifact_type: ${agentDoc.artifact_type}`);
    let artifactsInfo = groupedArtifacts[Object.keys(groupedArtifacts)[0]];

    let result = {
        artifacts_info: artifactsInfo,
        artifact_type: agentDoc.artifact_type,
    };

    logg.info(`ended`);
    return [result, null];
}

export const getAgentStatusUpdates = functionWrapper(
    fileName,
    "getAgentStatusUpdates",
    _getAgentStatusUpdates
);

function groupArtifactsByType(artifacts) {
    let result = artifacts.reduce((acc, artifact) => {
        const type = artifact.type;
        if (!acc[type]) {
            // Get supported fields for this type from config
            const typeProperties =
                ArtifactConfig.SUPPORTED_ARTIFACT_TYPES[type] || {};

            acc[type] = {
                type,
                headers: typeProperties,
                artifacts: [],
            };
        }
        acc[type].artifacts.push(artifact);
        return acc;
    }, {});

    return result;
}
