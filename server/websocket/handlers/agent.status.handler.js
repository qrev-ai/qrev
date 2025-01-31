import { logger } from "../../logger.js";
import { Agent } from "../../models/agents/agent.model.js";
import { AgentStatus } from "../../models/agents/agent.status.model.js";

const fileName = "Agent Status Handler";

// Store active connections for each agent
const agentConnections = new Map();

export function handleAgentStatusConnection(ws, req) {
    const urlParams = new URLSearchParams(req.url.split("?")[1]);
    const agentId = urlParams.get("agentId");

    if (!agentId) {
        logger.warn(`${fileName}: No agentId provided`);
        ws.close(1003, "agentId is required");
        return;
    }

    // Store connection
    if (!agentConnections.has(agentId)) {
        agentConnections.set(agentId, new Set());
    }
    agentConnections.get(agentId).add(ws);

    logger.info(`${fileName}: Client connected for agent ${agentId}`);

    // Send initial status updates
    AgentStatus.find({ agent: agentId })
        .sort({ created_on: 1 })
        .lean()
        .then((agentStatusDocs) => {
            if (agentStatusDocs && agentStatusDocs.length > 0) {
                const message = JSON.stringify({
                    type: "status-update",
                    data: agentStatusDocs,
                });
                ws.send(message);
            }
        })
        .catch((error) => {
            logger.error(
                `${fileName}: Error fetching initial status for agent ${agentId}: ${error}`
            );
        });

    // Handle client disconnect
    ws.on("close", () => {
        agentConnections.get(agentId)?.delete(ws);
        if (agentConnections.get(agentId)?.size === 0) {
            agentConnections.delete(agentId);
        }
        logger.info(`${fileName}: Client disconnected from agent ${agentId}`);
    });

    // Handle errors
    ws.on("error", (error) => {
        logger.error(
            `${fileName}: WebSocket error for agent ${agentId}: ${error}`
        );
    });
}

// Broadcast status update to all connected clients for a specific agent
export function broadcastAgentStatus({ agentId, statusUpdates }, { txid }) {
    const funcName = "broadcastAgentStatus";
    const logg = logger.child({ txid, funcName });
    logg.info(`started`);
    try {
        const connections = agentConnections.get(agentId);
        if (!connections) return;

        const message = JSON.stringify({
            type: "status-update",
            data: statusUpdates,
        });

        connections.forEach((client) => {
            if (client.readyState === client.OPEN) {
                logg.info(`sending message to client with id: ${client.id}`);
                client.send(message);
            }
        });
    } catch (error) {
        logg.error(`error: ${error}`);
    }
    logg.info(`ended`);
    return [true, null];
}
