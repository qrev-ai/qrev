import { Router } from "express";
import * as OpportunityApis from "../../apis/crm/opportunity.apis.js";
import { apiWrapper } from "../../std/wrappers.js";

const router = Router();

router.post("/create", apiWrapper(OpportunityApis.createOpportunityApi));
router.get("/list", apiWrapper(OpportunityApis.getOpportunitiesApi));
router.post("/delete", apiWrapper(OpportunityApis.deleteOpportunityApi));
router.get("/get", apiWrapper(OpportunityApis.getOpportunityByIdApi));
router.get(
    "/ai-analysis",
    apiWrapper(OpportunityApis.getOpportunityAiAnalysisApi)
);
router.get(
    "/pipeline-timeline",
    apiWrapper(OpportunityApis.getOpportunityPipelineTimelineApi)
);
router.get(
    "/get-or-setup-pipeline",
    apiWrapper(OpportunityApis.getOrSetupPipelineApi)
);
router.get(
    "/pipeline-setting-info",
    apiWrapper(OpportunityApis.getPipelineSettingInfoApi)
);
router.post(
    "/update-pipeline-setting-info",
    apiWrapper(OpportunityApis.updatePipelineSettingInfoApi)
);
router.post(
    "/update-stage",
    apiWrapper(OpportunityApis.updateOpportunityPipelineStageApi)
);

router.get("/product/list", apiWrapper(OpportunityApis.getAllProductsApi));
router.post("/product/create", apiWrapper(OpportunityApis.createNewProductApi));

export default router;
