import { Router } from "express";
import * as AgentsApis from "../../apis/agents/agents.apis.js";
import { apiWrapper } from "../../std/wrappers.js";
const router = Router();

router.post("/create", apiWrapper(AgentsApis.createAgentApi));
router.post("/delete", apiWrapper(AgentsApis.deleteAgentApi));
router.get("/list", apiWrapper(AgentsApis.listAgentsApi));
router.post("/update", apiWrapper(AgentsApis.updateAgentApi));
router.get("/get", apiWrapper(AgentsApis.getAgentApi));

router.get(
    "/daily_prospect_updates",
    apiWrapper(AgentsApis.dailyProspectUpdatesApi)
);

export default router;
