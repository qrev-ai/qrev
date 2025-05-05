import { Router } from "express";
import * as ContactApis from "../../apis/crm/contact.apis.js";
import { apiWrapper } from "../../std/wrappers.js";

const router = Router();

router.post("/create", apiWrapper(ContactApis.createContactApi));
router.get("/list", apiWrapper(ContactApis.getContactsApi));
router.post("/delete", apiWrapper(ContactApis.deleteContactApi));
router.get("/get", apiWrapper(ContactApis.getContactByIdApi));

export default router;
