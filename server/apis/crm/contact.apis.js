import CustomError from "../../std/custom.error.js";
import { logger } from "../../logger.js";
import * as ContactUtils from "../../utils/crm/contact.utils.js";

const fileName = "Contact APIs";

export async function createContactApi(req, res, next) {
    const txid = req.id;
    const funcName = "createContactApi";
    const logg = logger.child({ txid, funcName });
    logg.info(`started with body: ${JSON.stringify(req.body)}`);

    // let userId = req.user && req.user.userId ? req.user.userId : null;
    // if (!userId) {
    //     logg.info(`ended unsuccessfully`);
    //     throw new CustomError(
    //         `Missing userId from decoded access token`,
    //         fileName,
    //         funcName,
    //         400,
    //         true
    //     );
    // }

    // api has account_id in query
    let { account_id: accountId } = req.query;
    let contactData = req.body;

    if (!accountId) {
        logg.info(`ended unsuccessfully`);
        throw new CustomError(
            `Missing account_id`,
            fileName,
            funcName,
            400,
            true
        );
    }

    if (!contactData.first_name) {
        logg.info(`ended unsuccessfully`);
        throw new CustomError(
            `Missing first_name`,
            fileName,
            funcName,
            400,
            true
        );
    }

    if (!contactData.last_name) {
        logg.info(`ended unsuccessfully`);
        throw new CustomError(
            `Missing last_name`,
            fileName,
            funcName,
            400,
            true
        );
    }

    if (!contactData.email) {
        logg.info(`ended unsuccessfully`);
        throw new CustomError(`Missing email`, fileName, funcName, 400, true);
    }

    let [savedContact, createErr] = await ContactUtils.createContact(
        { contactData, accountId },
        { txid }
    );

    if (createErr) {
        logg.info(`ended unsuccessfully`);
        throw createErr;
    }

    logg.info(`ended`);
    res.json({
        success: true,
        message: `${funcName} executed successfully`,
        txid,
        contact_id: savedContact._id,
    });
}

export async function getContactsApi(req, res, next) {
    const txid = req.id;
    const funcName = "getContactsApi";
    const logg = logger.child({ txid, funcName });
    logg.info(`started with query: ${JSON.stringify(req.query)}`);

    // let userId = req.user && req.user.userId ? req.user.userId : null;
    // if (!userId) {
    //     logg.info(`ended unsuccessfully`);
    //     throw new CustomError(
    //         `Missing userId from decoded access token`,
    //         fileName,
    //         funcName,
    //         400,
    //         true
    //     );
    // }

    // api has account_id in query, optional filters and pagination
    let {
        account_id: accountId,
        start_date: startDate,
        end_date: endDate,
        statuses,
        company,
        reseller,
        search,
        page,
        limit,
    } = req.query;

    if (!accountId) {
        logg.info(`ended unsuccessfully`);
        throw new CustomError(
            `Missing account_id`,
            fileName,
            funcName,
            400,
            true
        );
    }

    const filters = {};
    if (startDate && endDate) {
        filters.startDate = startDate;
        filters.endDate = endDate;
    }

    if (statuses) filters.statuses = statuses.split(",");
    if (company) filters.company = company;
    if (reseller) filters.reseller = reseller;
    if (search) filters.search = search;

    const pagination = {};
    if (page) pagination.page = page;
    if (limit) pagination.limit = limit;

    logg.info(`Filters: ${JSON.stringify(filters)}`);

    let [result, getErr] = await ContactUtils.getContacts(
        { accountId, filters, pagination },
        { txid }
    );

    if (getErr) {
        logg.info(`ended unsuccessfully`);
        throw getErr;
    }

    logg.info(`ended`);
    res.json({
        success: true,
        message: `${funcName} executed successfully`,
        txid,
        ...result,
    });
}

export async function deleteContactApi(req, res, next) {
    const txid = req.id;
    const funcName = "deleteContactApi";
    const logg = logger.child({ txid, funcName });
    logg.info(`started with query: ${JSON.stringify(req.query)}`);

    // let userId = req.user && req.user.userId ? req.user.userId : null;
    // if (!userId) {
    //     logg.info(`ended unsuccessfully`);
    //     throw new CustomError(
    //         `Missing userId from decoded access token`,
    //         fileName,
    //         funcName,
    //         400,
    //         true
    //     );
    // }

    // api has account_id and contact_id in query
    let { account_id: accountId, contact_id: contactId } = req.query;

    if (!accountId) {
        logg.info(`ended unsuccessfully`);
        throw new CustomError(
            `Missing account_id`,
            fileName,
            funcName,
            400,
            true
        );
    }

    if (!contactId) {
        logg.info(`ended unsuccessfully`);
        throw new CustomError(
            `Missing contact_id`,
            fileName,
            funcName,
            400,
            true
        );
    }

    let [deletedContact, deleteErr] = await ContactUtils.deleteContact(
        { contactId, accountId },
        { txid }
    );

    if (deleteErr) {
        logg.info(`ended unsuccessfully`);
        throw deleteErr;
    }

    logg.info(`ended`);
    res.json({
        success: true,
        message: `${funcName} executed successfully`,
        txid,
        contact_id: deletedContact._id,
    });
}

export async function getContactByIdApi(req, res, next) {
    const txid = req.id;
    const funcName = "getContactByIdApi";
    const logg = logger.child({ txid, funcName });
    logg.info(`started with query: ${JSON.stringify(req.query)}`);

    // let userId = req.user && req.user.userId ? req.user.userId : null;
    // if (!userId) {
    //     logg.info(`ended unsuccessfully`);
    //     throw new CustomError(
    //         `Missing userId from decoded access token`,
    //         fileName,
    //         funcName,
    //         400,
    //         true
    //     );
    // }

    // api has account_id and contact_id in query
    let { account_id: accountId, contact_id: contactId } = req.query;

    if (!accountId) {
        logg.info(`ended unsuccessfully`);
        throw new CustomError(
            `Missing account_id`,
            fileName,
            funcName,
            400,
            true
        );
    }

    if (!contactId) {
        logg.info(`ended unsuccessfully`);
        throw new CustomError(
            `Missing contact_id`,
            fileName,
            funcName,
            400,
            true
        );
    }

    let [contact, getErr] = await ContactUtils.getContactById(
        { contactId, accountId },
        { txid }
    );

    if (getErr) {
        logg.info(`ended unsuccessfully`);
        throw getErr;
    }

    logg.info(`ended`);
    res.json({
        success: true,
        message: `${funcName} executed successfully`,
        txid,
        contact,
    });
}
