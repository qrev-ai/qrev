import { v4 as uuidv4 } from "uuid";
import { logger } from "../../logger.js";
import CustomError from "../../std/custom.error.js";
import * as AgentUtils from "../../utils/agents/agent.utils.js";

const fileName = "Agents APIs";

export async function createAgentApi(req, res, next) {
    const txid = req.id;
    const funcName = "createAgentApi";
    const logg = logger.child({ txid, funcName });
    logg.info(`started with body:` + JSON.stringify(req.body));
    logg.info(`started with query:` + JSON.stringify(req.query));

    let userId = req.user && req.user.userId ? req.user.userId : null;
    if (!userId) {
        logg.info(`ended unsuccessfully`);
        throw new CustomError(
            `Missing userId from decoded access token`,
            fileName,
            funcName
        );
    }

    let { account_id: accountId } = req.query;
    if (!accountId) {
        logg.info(`ended unsuccessfully`);
        throw new CustomError(
            `Missing account_id from query`,
            fileName,
            funcName
        );
    }

    let { name, description, type } = req.body;
    if (!name) {
        logg.info(`ended unsuccessfully`);
        throw new CustomError(`Missing name from body`, fileName, funcName);
    }
    if (!description) {
        logg.info(`ended unsuccessfully`);
        throw new CustomError(
            `Missing description from body`,
            fileName,
            funcName
        );
    }
    if (!type) {
        logg.info(`ended unsuccessfully`);
        throw new CustomError(`Missing type from body`, fileName, funcName);
    }

    let [agent, agentErr] = await AgentUtils.createAgent(
        { accountId, userId, name, description, type },
        { txid }
    );
    if (agentErr) {
        logg.info(`agentErr:` + agentErr);
        throw new CustomError(`Error creating agent`, fileName, funcName);
    }

    let [updatedAgentDoc, execErr] = await AgentUtils.executeAgent(
        { accountId, userId, agentId: agent._id, agentDoc: agent },
        { txid }
    );
    if (execErr) {
        throw execErr;
    }

    res.status(200).json({
        success: true,
        message: "Agent created successfully",
        result: updatedAgentDoc,
    });
}

export async function getAgentApi(req, res, next) {
    const txid = req.id;
    const funcName = "getAgentApi";
    const logg = logger.child({ txid, funcName });
    logg.info(`started with body:` + JSON.stringify(req.body));
    logg.info(`started with query:` + JSON.stringify(req.query));

    let userId = req.user && req.user.userId ? req.user.userId : null;
    if (!userId) {
        logg.info(`ended unsuccessfully`);
        throw new CustomError(
            `Missing userId from decoded access token`,
            fileName,
            funcName
        );
    }

    let { account_id: accountId, agent_id: agentId } = req.query;
    if (!accountId) {
        logg.info(`ended unsuccessfully`);
        throw new CustomError(
            `Missing account_id from query`,
            fileName,
            funcName
        );
    }

    let [agent, agentErr] = await AgentUtils.getAgent(
        { accountId, userId, agentId },
        { txid }
    );
    if (agentErr) {
        logg.info(`agentErr:` + agentErr);
        throw new CustomError(`Error getting agent`, fileName, funcName);
    }

    res.status(200).json({
        success: true,
        message: "Agent fetched successfully",
        result: agent,
    });
}

export async function updateAgentApi(req, res, next) {
    const txid = req.id;
    const funcName = "updateAgentApi";
    const logg = logger.child({ txid, funcName });
    logg.info(`started with body:` + JSON.stringify(req.body));
    logg.info(`started with query:` + JSON.stringify(req.query));

    let userId = req.user && req.user.userId ? req.user.userId : null;
    if (!userId) {
        logg.info(`ended unsuccessfully`);
        throw new CustomError(
            `Missing userId from decoded access token`,
            fileName,
            funcName
        );
    }

    let { account_id: accountId, agent_id: agentId } = req.query;
    if (!accountId) {
        logg.info(`ended unsuccessfully`);
        throw new CustomError(
            `Missing account_id from query`,
            fileName,
            funcName
        );
    }

    let { name, description, type } = req.body;
    if (!name) {
        logg.info(`ended unsuccessfully`);
        throw new CustomError(`Missing name from body`, fileName, funcName);
    }
    if (!description) {
        logg.info(`ended unsuccessfully`);
        throw new CustomError(
            `Missing description from body`,
            fileName,
            funcName
        );
    }
    if (!type) {
        logg.info(`ended unsuccessfully`);
        throw new CustomError(`Missing type from body`, fileName, funcName);
    }

    let [agent, agentErr] = await AgentUtils.updateAgent(
        { accountId, userId, agentId, name, description, type },
        { txid }
    );

    if (agentErr) {
        logg.info(`agentErr:` + agentErr);
        throw new CustomError(`Error updating agent`, fileName, funcName);
    }

    res.status(200).json({
        success: true,
        message: "Agent updated successfully",
        result: agent,
    });
}

export async function deleteAgentApi(req, res, next) {
    const txid = req.id;
    const funcName = "deleteAgentApi";
    const logg = logger.child({ txid, funcName });
    logg.info(`started with body:` + JSON.stringify(req.body));
    logg.info(`started with query:` + JSON.stringify(req.query));

    let userId = req.user && req.user.userId ? req.user.userId : null;
    if (!userId) {
        logg.info(`ended unsuccessfully`);
        throw new CustomError(
            `Missing userId from decoded access token`,
            fileName,
            funcName
        );
    }

    let { account_id: accountId, agent_id: agentId } = req.query;
    if (!accountId) {
        logg.info(`ended unsuccessfully`);
        throw new CustomError(
            `Missing account_id from query`,
            fileName,
            funcName
        );
    }

    let [agent, agentErr] = await AgentUtils.deleteAgent(
        { accountId, userId, agentId },
        { txid }
    );
    if (agentErr) {
        logg.info(`agentErr:` + agentErr);
        throw new CustomError(`Error deleting agent`, fileName, funcName);
    }

    res.status(200).json({
        success: true,
        message: "Agent deleted successfully",
    });
}

export async function listAgentsApi(req, res, next) {
    const txid = req.id;
    const funcName = "listAgentsApi";
    const logg = logger.child({ txid, funcName });
    logg.info(`started with body:` + JSON.stringify(req.body));
    logg.info(`started with query:` + JSON.stringify(req.query));

    let userId = req.user && req.user.userId ? req.user.userId : null;
    if (!userId) {
        logg.info(`ended unsuccessfully`);
        throw new CustomError(
            `Missing userId from decoded access token`,
            fileName,
            funcName
        );
    }

    let { account_id: accountId } = req.query;
    if (!accountId) {
        logg.info(`ended unsuccessfully`);
        throw new CustomError(
            `Missing account_id from query`,
            fileName,
            funcName
        );
    }

    let [agents, agentsErr] = await AgentUtils.listAgents(
        { accountId, userId, getStatusInfo: true },
        { txid }
    );
    if (agentsErr) {
        logg.info(`agentsErr:` + agentsErr);
        throw new CustomError(`Error listing agents`, fileName, funcName);
    }

    res.status(200).json({
        success: true,
        message: "Agents fetched successfully",
        result: agents,
    });
}

export async function dailyProspectUpdatesApi(req, res, next) {
    const txid = req.id;
    const funcName = "dailyProspectUpdatesApi";
    const logg = logger.child({ txid, funcName });
    logg.info(`started with body:` + JSON.stringify(req.body));
    logg.info(`started with query:` + JSON.stringify(req.query));

    let userId = req.user && req.user.userId ? req.user.userId : null;
    if (!userId) {
        logg.info(`ended unsuccessfully`);
        throw new CustomError(
            `Missing userId from decoded access token`,
            fileName,
            funcName
        );
    }

    let { account_id: accountId } = req.query;
    if (!accountId) {
        logg.info(`ended unsuccessfully`);
        throw new CustomError(
            `Missing account_id from query`,
            fileName,
            funcName
        );
    }

    let [result, resultErr] = await AgentUtils.dailyProspectUpdates(
        { accountId, userId },
        { txid }
    );
    if (resultErr) {
        logg.info(`resultErr:` + resultErr);
        throw new CustomError(
            `Error getting daily prospect updates`,
            fileName,
            funcName
        );
    }

    /*
    * Sample response: 
    {
        "success": true,
        "message": "Daily prospect updates fetched successfully",
        "result": [
            {
                first_name: "Jane",
                last_name: "Smith",
                email: "jane.smith@example.com",
                linkedin_url: "https://www.linkedin.com/in/jane-smith-0987654321",
                insights: "Insights about Jane Smith",
                score: 92,
                job_title: "Product Manager",
                company_name: "Global Solutions Ltd.",
                references: "Met at ProductCon 2023"
            },
            {
                first_name: "John",
                last_name: "Doe",
                email: "john.doe@example.com",
                linkedin_url: "https://www.linkedin.com/in/john-doe-1234567890",
                insights: "Insights about John Doe",
                score: 85,
                job_title: "Senior Software Engineer",
                company_name: "Tech Innovators Inc.",
                references: "Referred by Sarah Johnson"
            }
        ]
    }
    */

    res.status(200).json({
        success: true,
        message: "Daily prospect updates fetched successfully",
        result: result,
    });
}

export async function archiveAgentApi(req, res, next) {
    const txid = req.id;
    const funcName = "archiveAgentApi";
    const logg = logger.child({ txid, funcName });
    logg.info(`started with body:` + JSON.stringify(req.body));
    logg.info(`started with query:` + JSON.stringify(req.query));

    let userId = req.user && req.user.userId ? req.user.userId : null;
    if (!userId) {
        logg.info(`ended unsuccessfully`);
        throw new CustomError(
            `Missing userId from decoded access token`,
            fileName,
            funcName
        );
    }

    let { account_id: accountId, agent_id: agentId } = req.query;
    if (!accountId) {
        logg.info(`ended unsuccessfully`);
        throw new CustomError(
            `Missing account_id from query`,
            fileName,
            funcName
        );
    }

    let [resp, agentErr] = await AgentUtils.archiveAgent(
        { accountId, userId, agentId },
        { txid }
    );
    if (agentErr) {
        logg.info(`agentErr:` + agentErr);
        throw new CustomError(`Error archiving agent`, fileName, funcName);
    }

    res.status(200).json({
        success: true,
        message: "Agent archived successfully",
    });
}

export async function pauseAgentApi(req, res, next) {
    const txid = req.id;
    const funcName = "pauseAgentApi";
    const logg = logger.child({ txid, funcName });
    logg.info(`started with body:` + JSON.stringify(req.body));
    logg.info(`started with query:` + JSON.stringify(req.query));

    let userId = req.user && req.user.userId ? req.user.userId : null;
    if (!userId) {
        logg.info(`ended unsuccessfully`);
        throw new CustomError(
            `Missing userId from decoded access token`,
            fileName,
            funcName
        );
    }

    let { account_id: accountId, agent_id: agentId } = req.query;
    if (!accountId) {
        logg.info(`ended unsuccessfully`);
        throw new CustomError(
            `Missing account_id from query`,
            fileName,
            funcName
        );
    }

    let [resp, agentErr] = await AgentUtils.pauseAgent(
        { accountId, userId, agentId },
        { txid }
    );
    if (agentErr) {
        logg.info(`agentErr:` + agentErr);
        throw new CustomError(`Error pausing agent`, fileName, funcName);
    }

    res.status(200).json({
        success: true,
        message: "Agent paused successfully",
    });
}

export async function resumeAgentApi(req, res, next) {
    const txid = req.id;
    const funcName = "resumeAgentApi";
    const logg = logger.child({ txid, funcName });
    logg.info(`started with body:` + JSON.stringify(req.body));
    logg.info(`started with query:` + JSON.stringify(req.query));

    let userId = req.user && req.user.userId ? req.user.userId : null;
    if (!userId) {
        logg.info(`ended unsuccessfully`);
        throw new CustomError(
            `Missing userId from decoded access token`,
            fileName,
            funcName
        );
    }

    let { account_id: accountId, agent_id: agentId } = req.query;
    if (!accountId) {
        logg.info(`ended unsuccessfully`);
        throw new CustomError(
            `Missing account_id from query`,
            fileName,
            funcName
        );
    }

    let [resp, agentErr] = await AgentUtils.resumeAgent(
        { accountId, userId, agentId },
        { txid }
    );
    if (agentErr) {
        logg.info(`agentErr:` + agentErr);
        throw new CustomError(`Error resuming agent`, fileName, funcName);
    }

    res.status(200).json({
        success: true,
        message: "Agent resumed successfully",
    });
}

export async function executionUpdateAsyncApi(req, res, next) {
    const txid = req.id;
    const funcName = "executionUpdateAsyncApi";
    const logg = logger.child({ txid, funcName });
    logg.info(`started with body:` + JSON.stringify(req.body));
    logg.info(`started with query:` + JSON.stringify(req.query));

    let { secretKey: secretKey } = req.query;
    if (secretKey !== process.env.AI_BOT_SERVER_TOKEN) {
        logg.info(`ended unsuccessfully`);
        throw new CustomError(`Invalid secret key`, fileName, funcName);
    }

    let {
        agent_id: agentId,
        status_id: statusId,
        status_name: statusName,
        status_state: statusState,
    } = req.body;
    if (!statusId) {
        logg.info(`ended unsuccessfully`);
        throw new CustomError(
            `Missing status_id from body`,
            fileName,
            funcName
        );
    }
    if (!statusName) {
        logg.info(`ended unsuccessfully`);
        throw new CustomError(
            `Missing status_name from body`,
            fileName,
            funcName
        );
    }
    if (!statusState) {
        logg.info(`ended unsuccessfully`);
        throw new CustomError(
            `Missing status_state from body`,
            fileName,
            funcName
        );
    }
    if (!agentId) {
        logg.info(`ended unsuccessfully`);
        throw new CustomError(`Missing agent_id from body`, fileName, funcName);
    }

    await AgentUtils.updateExecutionStatus(
        { agentId, statusId, statusName, statusState },
        { txid, sendErrorMsg: true }
    );

    res.status(200).json({
        success: true,
        message: "Agent execution update async fetched successfully",
    });
}

export async function getAgentStatusUpdatesApi(req, res, next) {
    const txid = req.id;
    const funcName = "getAgentStatusUpdatesApi";
    const logg = logger.child({ txid, funcName });
    logg.info(`started with body:` + JSON.stringify(req.body));
    logg.info(`started with query:` + JSON.stringify(req.query));

    let userId = req.user && req.user.userId ? req.user.userId : null;
    if (!userId) {
        logg.info(`ended unsuccessfully`);
        throw new CustomError(
            `Missing userId from decoded access token`,
            fileName,
            funcName
        );
    }

    let { account_id: accountId, agent_id: agentId } = req.query;
    if (!accountId) {
        logg.info(`ended unsuccessfully`);
        throw new CustomError(
            `Missing account_id from query`,
            fileName,
            funcName
        );
    }
    if (!agentId) {
        logg.info(`ended unsuccessfully`);
        throw new CustomError(
            `Missing agent_id from query`,
            fileName,
            funcName
        );
    }

    let [statusUpdates, statusUpdatesErr] =
        await AgentUtils.getAgentStatusUpdates(
            { accountId, userId, agentId },
            { txid }
        );
    if (statusUpdatesErr) {
        logg.info(`statusUpdatesErr:` + statusUpdatesErr);
        throw new CustomError(
            `Error getting agent status updates`,
            fileName,
            funcName
        );
    }

    res.status(200).json({
        success: true,
        message: "Agent status updates fetched successfully",
        result: statusUpdates,
    });
}
