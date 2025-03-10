import { Router } from "express";
import * as AgentsApis from "../../apis/agents/agents.apis.js";
import * as AgentReportsApis from "../../apis/agents/agent.reports.apis.js";
import { apiWrapper } from "../../std/wrappers.js";

import multer from "multer";
import path from "path";

const storage = multer.diskStorage({
    destination: "uploads/",
    filename: function (req, file, cb) {
        // Get the file extension
        const ext = path.extname(file.originalname);
        // Generate unique filename with original extension
        cb(
            null,
            `agent_${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`
        );
    },
});

const upload = multer({ storage: storage });

const router = Router();

router
    .route("/create")
    .post(
        upload.single("uploaded_file"),
        apiWrapper(AgentsApis.createAgentApi)
    );

router.post("/delete", apiWrapper(AgentsApis.deleteAgentApi));
router.get("/list", apiWrapper(AgentsApis.listAgentsApi));
router.post("/update", apiWrapper(AgentsApis.updateAgentApi));
router.get("/get", apiWrapper(AgentsApis.getAgentApi));

router.get(
    "/daily_prospect_updates",
    apiWrapper(AgentsApis.dailyProspectUpdatesApi)
);

router.post("/archive", apiWrapper(AgentsApis.archiveAgentApi));

router.post("/pause", apiWrapper(AgentsApis.pauseAgentApi));

router.post("/resume", apiWrapper(AgentsApis.resumeAgentApi));

router.post(
    "/execution_update_async",
    apiWrapper(AgentsApis.executionUpdateAsyncApi)
);

router.get("/status_updates", apiWrapper(AgentsApis.getAgentStatusUpdatesApi));

router.post(
    "/update_sharing_status",
    apiWrapper(AgentsApis.updateSharingStatusApi)
);

// New routes for agent reports
router.get(
    "/reports/all",
    apiWrapper(AgentReportsApis.getAllCompanyReportsApi)
);
router.post(
    "/reports/create_custom",
    apiWrapper(AgentReportsApis.createCustomReportApi)
);
router.get("/reports/get", apiWrapper(AgentReportsApis.getCompanyReportApi));
router.get(
    "/reports/by_company",
    apiWrapper(AgentReportsApis.getAgentReportsByCompanyApi)
);

export default router;
