import fs from "fs";
import axios from "axios";
import momenttz from "moment-timezone";
import { v4 as uuidv4 } from "uuid";
import { functionWrapper } from "../../std/wrappers.js";
import CustomError from "../../std/custom.error.js";
import { logger } from "../../logger.js";
import { reportErrorToQRevTeam } from "../../std/report.error.js";
import Papa from "papaparse";
import csv from "csv-parser";

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

async function _writeJsonArrayToCsvFile(
    { csvPath, data },
    { txid, logg, funcName }
) {
    logg.info(`started`);

    // convert array of objects to csv string
    let csvData = null;
    try {
        csvData = Papa.unparse(data);
        await fs.promises.writeFile(csvPath, csvData);
    } catch (err) {
        logg.error(`error: ${err}`);
        throw err;
    }

    logg.info(`ended`);
    return [csvData, null];
}

export const writeJsonArrayToCsvFile = functionWrapper(
    fileName,
    "writeJsonArrayToCsvFile",
    _writeJsonArrayToCsvFile
);

async function _readFile({ filePath }, { txid, logg, funcName }) {
    logg.info(`started`);
    try {
        const file = await fs.promises.readFile(filePath);
        logg.info(`ended`);
        return [file, null];
    } catch (err) {
        throw new CustomError(err, fileName, funcName);
    }
}

export const readFile = functionWrapper(fileName, "readFile", _readFile);

async function _createFileFromText(
    { text, fileName, encoding = "utf8" },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    let tempFilePath = `data/temp/${fileName}`;
    try {
        // Specify encoding when writing the file
        await fs.promises.writeFile(tempFilePath, text, { encoding });
        logg.info(`ended`);
        return [tempFilePath, null];
    } catch (err) {
        logg.error(`error: ${err}`);
        return [null, err];
    }
}

export const createFileFromText = functionWrapper(
    fileName,
    "createFileFromText",
    _createFileFromText
);

export function readCsvFile({ csvPath }, { txid }) {
    return new Promise((resolve, reject) => {
        let data = [];
        fs.createReadStream(csvPath)
            .pipe(csv())
            .on("data", (row) => {
                data.push(row);
            })
            .on("end", () => {
                resolve(data);
            });
    });
}
