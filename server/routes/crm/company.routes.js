import { Router } from "express";
import * as CompanyApis from "../../apis/crm/company.apis.js";
import { apiWrapper } from "../../std/wrappers.js";

const router = Router();

router.post("/create", apiWrapper(CompanyApis.createCompanyApi));
router.get("/list", apiWrapper(CompanyApis.getCompaniesApi));
router.post("/delete", apiWrapper(CompanyApis.deleteCompanyApi));
router.get("/get", apiWrapper(CompanyApis.getCompanyByIdApi));

export default router;
