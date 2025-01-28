import { WebSocketServer } from "ws";
import { logger } from "../logger.js";
import { handleAgentStatusConnection } from "./handlers/agent.status.handler.js";

const fileName = "WebSocket Setup";

// Store WebSocket server instance for external access
let wss = null;

// Initialize WebSocket server
export function initializeWebSocket(server) {
    try {
        // Create WebSocket server attached to HTTP server
        wss = new WebSocketServer({ server });

        // Handle new connections
        wss.on("connection", handleConnection);

        logger.info(`${fileName}: WebSocket server initialized`);
    } catch (error) {
        logger.error(
            `${fileName}: Failed to initialize WebSocket server: ${error}`
        );
        throw error;
    }
}

// Handle new WebSocket connections
function handleConnection(ws, req) {
    logger.info(`${fileName}: New WebSocket connection established`);

    // Extract connection type from URL query parameters
    const urlParams = new URLSearchParams(req.url.split("?")[1]);
    const connectionType = urlParams.get("type");

    // Route connection to appropriate handler based on type
    switch (connectionType) {
        case "agent-status":
            handleAgentStatusConnection(ws, req);
            break;
        // Add more connection types here as needed
        default:
            logger.warn(
                `${fileName}: Unknown connection type: ${connectionType}`
            );
            ws.close(1003, "Unsupported connection type");
    }
}

// Get WebSocket server instance
export function getWebSocketServer() {
    return wss;
}
