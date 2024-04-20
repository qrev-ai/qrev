import { Router } from "express";
import * as TeamApis from "../../apis/team/team.apis.js";
import { apiWrapper } from "../../std/wrappers.js";

const router = Router();

router.post("/create", apiWrapper(TeamApis.createTeamApi));
router.post("/update", apiWrapper(TeamApis.updateTeamApi));
router.post("/delete", apiWrapper(TeamApis.deleteTeamApi));
router.get("/list", apiWrapper(TeamApis.getTeamsApi));

export default router;
