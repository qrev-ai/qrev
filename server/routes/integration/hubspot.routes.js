import { Router } from "express";
import * as HubspotApis from "../../apis/integration/hubspot.apis.js";
import { apiWrapper } from "../../std/wrappers.js";

const router = Router();

router.get("/redirect", apiWrapper(HubspotApis.hubspotRedirectApi));

router.post("/connect", apiWrapper(HubspotApis.connectHubSpotAuthToAccount));

router.get("/is_connected", apiWrapper(HubspotApis.isHubSpotConnected));

export default router;
