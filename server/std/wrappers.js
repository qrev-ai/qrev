import { logger } from "../logger.js";
import CustomError from "./custom.error.js";
import { reportErrorToQRevTeam } from "./report.error.js";

export function apiWrapper(func) {
    return async (req, res, next) => {
        try {
            await func(req, res, next);
        } catch (err) {
            next(err);
        }
    };
}

export function functionWrapper(
    fileName,
    funcName,
    func,
    options = {
        printError: true,
    }
) {
    return async (params, { txid, sendErrorMsg, location }) => {
        const logg = logger.child({ txid, funcName });
        try {
            return await func(params, { logg, txid, funcName });
        } catch (error) {
            let errObj = error;
            if (!(error instanceof CustomError)) {
                errObj = new CustomError(error, fileName, funcName, 400, true);
            }
            logg.error(`errM: ` + errObj.message);
            if (options && options.printError) {
                logg.error(errObj);
            }
            if (sendErrorMsg) {
                await reportErrorToQRevTeam({
                    txid,
                    location: location ? location : `${fileName}: ${funcName}`,
                    subject: `Failed to execute ${funcName}`,
                    message: `Error: ${errObj.message}`,
                }).catch((errr) => {
                    logg.error(
                        `Reporting to QRev team failed with error:`,
                        errr
                    );
                });
            }
            logg.info(`ended unsuccessfully`);
            return [null, errObj];
        }
    };
}
