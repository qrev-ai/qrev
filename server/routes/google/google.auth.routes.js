import { Router } from "express";
import * as GoogleAuthApis from "../../apis/google/google.auth.apis.js";
import { apiWrapper } from "../../std/wrappers.js";

const router = Router();

router.get("/code/to/tokens", apiWrapper(GoogleAuthApis.authApi));

export default router;
