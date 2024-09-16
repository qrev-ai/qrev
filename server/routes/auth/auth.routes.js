import { Router } from "express";
import * as AuthApis from "../../apis/auth/auth.apis.js";
import { apiWrapper } from "../../std/wrappers.js";

const router = Router();

router.post("/ex/tokens", apiWrapper(AuthApis.getTokenFromStateApi));
router.post("/refresh", apiWrapper(AuthApis.refreshAccessTokenApi));
router.post("/logout", apiWrapper(AuthApis.logoutUserApi));

export default router;
