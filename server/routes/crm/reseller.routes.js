import { Router } from "express";
import * as ResellerApis from "../../apis/crm/reseller.apis.js";
import { apiWrapper } from "../../std/wrappers.js";

const router = Router();

router.post("/create", apiWrapper(ResellerApis.createResellerApi));
router.get("/list", apiWrapper(ResellerApis.getResellersApi));
router.post("/delete", apiWrapper(ResellerApis.deleteResellerApi));
router.get("/get", apiWrapper(ResellerApis.getResellerByIdApi));
router.get("/leaderboard", apiWrapper(ResellerApis.getResellerLeaderboardApi));

export default router;
