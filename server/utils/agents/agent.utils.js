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
import * as ArtifactUtils from "../crm/artifact.utils.js";

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
        status: "created",
    };

    let agentDocResp = await Agent.insertMany([agentObj]);
    let agentDoc = agentDocResp[0];
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

    let agentDoc = await Agent.findOne({ _id: agentId, account: accountId });
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
async function _listAgents({ accountId, userId }, { txid, logg, funcName }) {
    logg.info(`started`);
    if (!accountId) throw `accountId is invalid`;
    if (!userId) throw `userId is invalid`;

    let agents = await Agent.find({ account: accountId });
    logg.info(`agents fetched: ${agents.length}`);

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

    const [pendingArtifacts, artifactError] =
        await ArtifactUtils.getReviewPendingArtifacts(
            { accountId },
            { txid, logg, funcName }
        );

    if (artifactError) {
        throw new CustomError(
            `Failed to get pending artifacts: ${artifactError}`,
            fileName,
            funcName
        );
    }

    // Group artifacts by type and create headers
    const groupedArtifacts = pendingArtifacts.reduce((acc, artifact) => {
        const type = artifact.type;
        if (!acc[type]) {
            // Get supported fields for this type from config
            const typeProperties = SUPPORTED_ARTIFACT_TYPES[type] || {};

            acc[type] = {
                type,
                headers: typeProperties,
                artifacts: [],
            };
        }
        acc[type].artifacts.push(artifact);
        return acc;
    }, {});

    // Convert to array format
    const result = Object.values(groupedArtifacts);

    if (pendingArtifacts.length <= 10) {
        logg.info(`Grouped artifacts by type: ${JSON.stringify(result)}`);
    }
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
            status: "archived",
            updated_on: Date.now(),
        },
        { new: true }
    );

    if (!agentDoc) {
        throw new CustomError(`Agent not found`, fileName, funcName);
    }

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
            status: "paused",
            updated_on: Date.now(),
        },
        { new: true }
    );

    if (!agentDoc) {
        throw new CustomError(`Agent not found`, fileName, funcName);
    }

    logg.info(`agentDoc paused: ${JSON.stringify(agentDoc)}`);
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
            status: "running: prospecting",
            updated_on: Date.now(),
        },
        { new: true }
    );

    if (!agentDoc) {
        throw new CustomError(`Agent not found`, fileName, funcName);
    }

    logg.info(`agentDoc resumed: ${JSON.stringify(agentDoc)}`);
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

    let agentStatus = agentDoc.status;
    if (agentStatus === "running: prospecting") {
        throw new CustomError(`Agent is already running`, fileName, funcName);
    }

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
    logg.info(`aiServerResp: ${JSON.stringify(aiServerResp)}`);

    // update agent status to running: prospecting
    let statusUpdateResp = await Agent.updateOne(
        { _id: agentId, account: accountId },
        { status: "running: prospecting", updated_on: Date.now() }
    );
    logg.info(`statusUpdateResp: ${JSON.stringify(statusUpdateResp)}`);

    logg.info(`ended`);
    return [true, null];
}

export const executeAgent = functionWrapper(
    fileName,
    "executeAgent",
    _executeAgent
);

async function _updateExecutionStatus(
    { agentId, status, artifactListId },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    if (!agentId) throw `agentId is invalid`;
    if (!status) throw `status is invalid`;

    const updateObj = {
        status,
        updated_on: new Date(),
        execution_result_review_status: "not_seen",
        execution_result_list_id: artifactListId,
    };

    let agentDoc = await Agent.findOneAndUpdate({ _id: agentId }, updateObj, {
        new: true,
    });

    if (!agentDoc) {
        throw new CustomError(`Agent not found`, fileName, funcName);
    }

    logg.info(`agent status updated: ${JSON.stringify(agentDoc)}`);
    logg.info(`ended`);
    return [true, null];
}

export const updateExecutionStatus = functionWrapper(
    fileName,
    "updateExecutionStatus",
    _updateExecutionStatus
);
