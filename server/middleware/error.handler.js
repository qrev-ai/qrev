import { logger } from "../logger.js";
import { reportErrorToQRevTeam } from "../std/report.error.js";

export async function errorHandler(error, req, res, next) {
    const txid = req.id;
    const funcName = "errorHandler";
    const logg = logger.child({ txid, funcName });

    logg.info(`started`);
    if (!error) {
        logg.info(`invalid error object`);
        error = {
            statusCode: 500,
            status: "error",
            message: "Unknown error",
            reportToTeam: true,
            fileName: "unknown",
            funcName: "unknown",
        };
    }
    let statusCode = error.statusCode || 500;
    let status = error.status || "error";
    let message = "Unknown error";
    if (error.message) {
        message = error.message;
    } else if (error) {
        message = error;
    }

    let errorFileName = error.fileName || "unknown";
    let errorFuncName = error.funcName || "unknown";

    logg.info(`error message` + message);
    logg.info(`error location: ${errorFileName}: ${errorFuncName}`);
    logg.error(error);

    let reportToTeam = error.reportToTeam === false ? false : true;

    if (reportToTeam) {
        logg.info(`error is being reported to team.`);

        await reportErrorToQRevTeam({
            txid,
            location: `${errorFileName}: ${errorFuncName}`,
            subject: `Failed to execute ${errorFuncName}`,
            message: `Error: ` + message,
        });
    } else {
        logg.info(`error is NOT being reported to team.`);
    }

    logg.info(`ended`);
    return res.status(statusCode).json({
        success: false,
        message,
        txid,
        status,
    });
}
