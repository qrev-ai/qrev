import { Router } from "express";
import * as QaiBotApis from "../../apis/qai/qai.apis.js";
import { apiWrapper } from "../../std/wrappers.js";
import multer from "multer";
const upload = multer({ dest: "uploads/" });

const router = Router();

router
    .route("/converse")
    .post(upload.single("uploaded_file"), apiWrapper(QaiBotApis.converseApi));

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
