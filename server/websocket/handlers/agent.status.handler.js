import { logger } from "../../logger.js";

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
export function broadcastAgentStatus({ agentId, statusUpdate }, { txid }) {
    const funcName = "broadcastAgentStatus";
    const logg = logger.child({ txid, funcName });
    logg.info(`started`);
    try {
        const connections = agentConnections.get(agentId);
        if (!connections) return;

        const message = JSON.stringify({
            type: "status-update",
            data: statusUpdate,
        });

        connections.forEach((client) => {
            if (client.readyState === client.OPEN) {
                client.send(message);
            }
        });
    } catch (error) {
        logg.error(`error: ${error}`);
    }
    logg.info(`ended`);
    return [true, null];
}
