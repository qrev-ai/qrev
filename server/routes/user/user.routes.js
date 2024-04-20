import { Router } from "express";
import * as UserApis from "../../apis/user/user.apis.js";
import { apiWrapper } from "../../std/wrappers.js";

const router = Router();

router.get("/details", apiWrapper(UserApis.getUserInfo));
router.get("/accounts/list", apiWrapper(UserApis.getUserAccountsApi));

export default router;
