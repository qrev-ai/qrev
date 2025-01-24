import { v4 as uuidv4 } from "uuid";
import { functionWrapper } from "../../std/wrappers.js";
import { Artifact } from "../../models/crm/artifact.model.js";
import CustomError from "../../std/custom.error.js";

const fileName = "Artifact Utils";

async function _createListArtifact(
    { userId, name, description },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    if (!userId) {
        throw new CustomError(`userId is invalid`, fileName, funcName);
    }
    if (!name) {
        throw new CustomError(`name is invalid`, fileName, funcName);
    }
    if (!description) {
        throw new CustomError(`description is invalid`, fileName, funcName);
    }

    const listArtifact = {
        _id: uuidv4(),
        type: "list",
        properties: {
            name,
            description,
            type: "dynamic",
            is_active: true,
            visibility: "private",
            last_updated: new Date(),
            owner: userId,
        },
    };

    let listArtifactDocResp = await Artifact.insertMany([listArtifact]);
    let listArtifactDoc = listArtifactDocResp[0];

    logg.info(`ended`);
    return [listArtifactDoc, null];
}

export const createListArtifact = functionWrapper(
    fileName,
    "createListArtifact",
    _createListArtifact
);
