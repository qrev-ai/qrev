import { Router } from "express";
import * as CampaignApis from "../../apis/campaign/campaign.apis.js";
import { apiWrapper } from "../../std/wrappers.js";

const router = Router();

router.post("/send", apiWrapper(CampaignApis.sendCampaignApi));

router.get("/email_open", apiWrapper(CampaignApis.saveCampaignEmailOpen));

// ! old route. not valid as 23rd July 2024
router.post(
    "/update_sequence_messages",
    apiWrapper(CampaignApis.updateCampaignSequenceMessagesApi)
);

router.get(
    "/update_sequence_messages",
    apiWrapper(CampaignApis.sequenceAsyncCallbackApi)
);

router.get("/sequence/all", apiWrapper(CampaignApis.getAllSequenceApi));
router.get(
    "/sequence/meetings",
    apiWrapper(CampaignApis.getSequenceMeetingsApi)
);
router.get("/sequence", apiWrapper(CampaignApis.getSequenceDetailsApi));

router.get(
    "/sequence/prospects",
    apiWrapper(CampaignApis.getSequenceProspectsApi)
);

router.post(
    "/config/senders",
    apiWrapper(CampaignApis.setSenderListForCampaignApi)
);
router.get(
    "/config/senders",
    apiWrapper(CampaignApis.getSenderListForCampaignApi)
);

router.get(
    "/sequence/all/emails",
    apiWrapper(CampaignApis.getAllSequenceEmailsApi)
);

router.get(
    "/sequence/prospect/timeline",
    apiWrapper(CampaignApis.getSequenceProspectActivityTimelineApi)
);

router.post(
    "/sequence/prospect/bounce_webhook",
    apiWrapper(CampaignApis.campaignProspectBounceWebhookApi)
);

router.get("/unsubscribe", apiWrapper(CampaignApis.unsubscribeCampaignApi));

router.post(
    "/confirm_unsubscribe",
    apiWrapper(CampaignApis.campaignUnsubscribeConfirmApi)
);

router.get(
    "/sequence/analytics/open",
    apiWrapper(CampaignApis.getSequenceOpenAnalyticsApi)
);

router.get(
    "/sequence/step/analytics/open",
    apiWrapper(CampaignApis.getSequenceStepOpenAnalyticsApi)
);

router.get(
    "/sequence/analytics/reply",
    apiWrapper(CampaignApis.getSequenceReplyAnalyticsApi)
);

router.get(
    "/sequence/step/analytics/reply",
    apiWrapper(CampaignApis.getSequenceStepReplyAnalyticsApi)
);

export default router;
