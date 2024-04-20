import { Router } from "express";
import * as CrmApis from "../../apis/crm/crm.apis.js";
import { apiWrapper } from "../../std/wrappers.js";

const router = Router();

router.get("/contact/all", apiWrapper(CrmApis.getAllContactsApi));

export default router;
