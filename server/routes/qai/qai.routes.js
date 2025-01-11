import { Router } from "express";
import * as QaiBotApis from "../../apis/qai/qai.apis.js";
import { apiWrapper } from "../../std/wrappers.js";
import multer from "multer";
import path from "path";

const storage = multer.diskStorage({
    destination: "uploads/",
    filename: function (req, file, cb) {
        // Get the file extension
        const ext = path.extname(file.originalname);
        // Generate unique filename with original extension
        cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    },
});

const upload = multer({ storage: storage });

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

router.get("/review-updates", apiWrapper(QaiBotApis.getReviewUpdatesApi));

export default router;
