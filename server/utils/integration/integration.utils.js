import { functionWrapper } from "../../std/wrappers.js";
import CustomError from "../../std/custom.error.js";
import { logger } from "../../logger.js";
import * as HubspotUtils from "./hubspot.utils.js";

const fileName = "Integration Utils";

async function _sequenceStepMessageSend(paramObj, { txid, funcName, logg }) {
    logg.info(`started with data: ${JSON.stringify(paramObj)}`);

    let integrationActivities = [];

    let [hsActivities, hsErr] = await HubspotUtils.sequenceStepMessageSend(
        paramObj,
        { txid, sendErrorMsg: true }
    );
    if (hsErr) {
        logg.error(`error while sending message to hubspot: ${hsErr}`);
    } else if (hsActivities && hsActivities.length) {
        integrationActivities = [...integrationActivities, ...hsActivities];
    }

    logg.info(`ended`);
    return [integrationActivities, null];
}

export const sequenceStepMessageSend = functionWrapper(
    fileName,
    "sequenceStepMessageSend",
    _sequenceStepMessageSend
);
