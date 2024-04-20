import { logger } from "../logger.js";

export async function logIncomingRequest(req, res, next) {
    logger.info(`Incoming Request: ${req.method} ${req.url}`);
    next();
}
