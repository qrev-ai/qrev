import { functionWrapper } from "../../std/wrappers.js";
import CustomError from "../../std/custom.error.js";
import { logger } from "../../logger.js";

import { v4 as uuidv4 } from "uuid";

import { Agent } from "../../models/agents/agent.model.js";
import { SupportedAgentTypes } from "../../config/agents/agent.config.js";

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

    let agentDoc = await Agent.create(agentObj);
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

    // Updated fields: first name, last name, email, linkedin_url, insights, score, job_title
    let tempData = [
        {
            first_name: "John",
            last_name: "Doe",
            email: "john.doe@example.com",
            linkedin_url: "https://www.linkedin.com/in/john-doe-1234567890",
            insights: "Insights about John Doe",
            score: 85,
            job_title: "Senior Software Engineer",
        },
        {
            first_name: "Jane",
            last_name: "Smith",
            email: "jane.smith@example.com",
            linkedin_url: "https://www.linkedin.com/in/jane-smith-0987654321",
            insights: "Insights about Jane Smith",
            score: 92,
            job_title: "Product Manager",
        },
        {
            first_name: "Michael",
            last_name: "Johnson",
            email: "michael.johnson@example.com",
            linkedin_url:
                "https://www.linkedin.com/in/michael-johnson-2468101214",
            insights: "Insights about Michael Johnson",
            score: 78,
            job_title: "Marketing Director",
        },
        {
            first_name: "Emily",
            last_name: "Williams",
            email: "emily.williams@example.com",
            linkedin_url:
                "https://www.linkedin.com/in/emily-williams-3690257812",
            insights: "Insights about Emily Williams",
            score: 89,
            job_title: "Data Analyst",
        },
        {
            first_name: "David",
            last_name: "Brown",
            email: "david.brown@example.com",
            linkedin_url: "https://www.linkedin.com/in/david-brown-1592376480",
            insights: "Insights about David Brown",
            score: 76,
            job_title: "UX/UI Designer",
        },
        {
            first_name: "Sophia",
            last_name: "Martinez",
            email: "sophia.martinez@example.com",
            linkedin_url:
                "https://www.linkedin.com/in/sophia-martinez-4812592367",
            insights: "Insights about Sophia Martinez",
            score: 95,
            job_title: "Financial Analyst",
        },
        {
            first_name: "James",
            last_name: "Garcia",
            email: "james.garcia@example.com",
            linkedin_url: "https://www.linkedin.com/in/james-garcia-5709841236",
            insights: "Insights about James Garcia",
            score: 82,
            job_title: "Sales Manager",
        },
    ];

    // Sort the data by descending order of score
    tempData.sort((a, b) => b.score - a.score);

    logg.info(`ended`);
    return [tempData, null];
}

export const dailyProspectUpdates = functionWrapper(
    fileName,
    "dailyProspectUpdates",
    _dailyProspectUpdates
);
