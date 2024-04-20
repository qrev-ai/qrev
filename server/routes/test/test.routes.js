import { Router } from "express";
import * as TestApis from "../../apis/test/test.apis.js";
import { apiWrapper } from "../../std/wrappers.js";

const router = Router();

router.post("/test", apiWrapper(TestApis.testApi));

export default router;
