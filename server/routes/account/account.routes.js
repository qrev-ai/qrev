import { Router } from "express";
import * as AccountApis from "../../apis/account/account.apis.js";
import * as AccountUserApis from "../../apis/account/account.user.apis.js";
import { apiWrapper } from "../../std/wrappers.js";

const router = Router();

router.post("/create", apiWrapper(AccountApis.createAccountApi));
router.get("/users/list", apiWrapper(AccountApis.getAccountUsersApi));
router.post("/users/invite", apiWrapper(AccountApis.inviteUserToAccountApi));
router.post("/users/remove", apiWrapper(AccountApis.removeUserFromAccountApi));

router.post("/user/config", apiWrapper(AccountUserApis.setUserConfigApi));
router.get("/user/config", apiWrapper(AccountUserApis.getUserConfigApi));

router.get("/config/status", apiWrapper(AccountApis.getAccountConfigStatusApi));

router.get("/users_info", apiWrapper(AccountUserApis.getUserListApi));

export default router;
