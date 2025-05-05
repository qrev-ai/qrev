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

export default router;
