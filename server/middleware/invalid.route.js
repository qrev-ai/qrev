import { logger } from "../logger.js";

export async function invalidRouteHandler(req, res, next) {
    const txid = req.id;
    const funcName = "invalidRouteHandler";
    const logg = logger.child({ txid, funcName });
    logg.error(`Invalid Route: ${req.originalUrl}`);
    return res.status(404).json({
        success: false,
        message: `Invalid Route: ${req.originalUrl}`,
        txid,
        status: "error",
    });
}
