import { Router } from "express";
import * as CrmApis from "../../apis/crm/crm.apis.js";
import { apiWrapper } from "../../std/wrappers.js";

const router = Router();

router.get(
    "/is_reseller_allowed",
    apiWrapper(CrmApis.isUserAllowedToUseResellerApi)
);

export default router;
