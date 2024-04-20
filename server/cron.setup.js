import cron from "node-cron";
import { v4 as uuidv4 } from "uuid";

import * as CampaignUtils from "./utils/campaign/campaign.utils.js";

import { logger } from "./logger.js";

export function cronSetup() {
    logger.info(`setting up cron jobs`);
    cron.schedule("*/30 * * * * *", async () => {
        const txid = uuidv4();
        await CampaignUtils.executeCampaignCronJob(
            {},
            { txid, sendErrorMsg: true }
        );
    });
}
