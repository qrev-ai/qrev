import { Router } from "express";
import * as CampaignApis from "../../apis/campaign/campaign.apis.js";
import { apiWrapper } from "../../std/wrappers.js";

const router = Router();

router.post("/send", apiWrapper(CampaignApis.sendCampaignApi));

router.get("/email_open", apiWrapper(CampaignApis.saveCampaignEmailOpen));

router.post(
    "/update_sequence_messages",
    apiWrapper(CampaignApis.updateCampaignSequenceMessagesApi)
);
router.get("/sequence/all", apiWrapper(CampaignApis.getAllSequenceApi));

router.get("/sequence", apiWrapper(CampaignApis.getSequenceDetailsApi));

router.post(
    "/config/senders",
    apiWrapper(CampaignApis.setSenderListForCampaignApi)
);
router.get(
    "/config/senders",
    apiWrapper(CampaignApis.getSenderListForCampaignApi)
);

export default router;
