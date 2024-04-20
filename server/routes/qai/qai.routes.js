import { Router } from "express";
import * as QaiBotApis from "../../apis/qai/qai.apis.js";
import { apiWrapper } from "../../std/wrappers.js";

const router = Router();

router.post("/converse", apiWrapper(QaiBotApis.converseApi));

router.post(
    "/conversation/create",
    apiWrapper(QaiBotApis.createConversationApi)
);
router.get("/conversation", apiWrapper(QaiBotApis.getConversationApi));
router.get("/conversation/all", apiWrapper(QaiBotApis.getConversationsApi));
router.post(
    "/conversation/delete",
    apiWrapper(QaiBotApis.deleteConversationApi)
);

export default router;
