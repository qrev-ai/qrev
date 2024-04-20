import { logger } from "../../logger.js";
import * as CrmContactUtils from "../../utils/crm/contact.utils.js";

const fileName = "CRM APIs";

export async function getAllContactsApi(req, res, next) {
    const txid = req.id;
    const funcName = "getAllContactsApi";
    const logg = logger.child({ txid, funcName });
    logg.info(`started with body:` + JSON.stringify(req.body));
    logg.info(`started with query:` + JSON.stringify(req.query));

    let userId = req.user && req.user.userId ? req.user.userId : null;
    if (!userId) {
        logg.info(`ended unsuccessfully`);
        throw `Missing userId from decoded access token`;
    }

    let { account_id: accountId } = req.query;
    if (!accountId) throw `Missing account_id in query`;

    /*
    let result = [
        {
            name: "John Doe",
            email: "johndoe@comp1.com",
            job_title: "CEO",
            company_name: "Company 1",
            linkedin_url: "https://www.linkedin.com/in/johndoe",
            last_contacted_on: new Date().getTime(),
        },
        {
            name: "John Doe 1",
            email: "johndoe@comp2.com",
            job_title: "CEO",
            company_name: "Company 2",
            linkedin_url: "https://www.linkedin.com/in/johndoe",
            last_contacted_on: new Date().getTime(),
        },
        {
            name: "John Doe 2",
            email: "johndoe@comp3.com",
            job_title: "CEO",
            company_name: "Company 3",
            linkedin_url: "https://www.linkedin.com/in/johndoe",
            last_contacted_on: new Date().getTime(),
        },
    ];
    */

    let [result, err] = await CrmContactUtils.getAllContacts(
        { accountId, addFullName: true },
        { txid }
    );
    if (err) throw err;

    logg.info(`ended successfully`);
    return res.json({
        success: true,
        message: `${funcName} executed successfully`,
        result,
    });
}
