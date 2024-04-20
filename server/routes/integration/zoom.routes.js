import { Router } from "express";
import * as ZoomApis from "../../apis/integration/zoom.apis.js";
import { apiWrapper } from "../../std/wrappers.js";

const router = Router();

router.get("/redirect", apiWrapper(ZoomApis.zoomRedirectApi));
router.get("/dev/redirect", apiWrapper(ZoomApis.zoomDevRedirectApi));

router.post("/connect", apiWrapper(ZoomApis.connectZoomAuthToAccountApi));

router.get("/is_connected", apiWrapper(ZoomApis.isZoomConnected));

export default router;
