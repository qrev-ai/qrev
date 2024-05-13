import fs from "fs";
import axios from "axios";
import momenttz from "moment-timezone";
import { v4 as uuidv4 } from "uuid";
import { functionWrapper } from "../../std/wrappers.js";
import CustomError from "../../std/custom.error.js";
import { logger } from "../../logger.js";
import { reportErrorToQRevTeam } from "../../std/report.error.js";

const fileName = "File Utils";

async function _createTempFile(
    { fileContent, filePath, returnReadStream = false },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    let tempFilePath = filePath || `/tmp/${uuidv4()}.txt`;
    try {
        await fs.promises.writeFile(tempFilePath, fileContent);

        if (returnReadStream) {
            let readStream = fs.createReadStream(tempFilePath);
            logg.info(`ended`);
            return [readStream, null];
        }

        logg.info(`ended`);
        return [tempFilePath, null];
    } catch (err) {
        logg.error(`error: ${err}`);
        return [null, err];
    }
}

export const createTempFile = functionWrapper(
    fileName,
    "createTempFile",
    _createTempFile
);

async function _deleteFile({ filePath }, { txid, logg, funcName }) {
    logg.info(`started`);
    try {
        await fs.promises.unlink(filePath);
        logg.info(`ended`);
        return [null, null];
    } catch (err) {
        logg.error(`error: ${err}`);
        return [null, err];
    }
}

export const deleteFile = functionWrapper(fileName, "deleteFile", _deleteFile);
