import { functionWrapper } from "../../std/wrappers.js";
import CustomError from "../../std/custom.error.js";
import { logger } from "../../logger.js";
import { Contact } from "../../models/crm/contact.model.js";

const fileName = "CRM Contact Utils";

async function _createContacts(
    { contacts, accountId, userId },
    { txid, funcName, logg }
) {
    logg.info(`started`);
    if (!contacts || !contacts.length) throw `contacts is required`;

    let objs = [];
    for (let contact of contacts) {
        let { email, first_name, last_name, name } = contact;

        if (!email) {
            logg.error(
                `email is missing for contact: ${JSON.stringify(contact)}`
            );
            continue;
        }

        if (name && !first_name && !last_name) {
            let names = name.split(" ");
            first_name = names[0];
            last_name = names.slice(1).join(" ");
        }

        email = email.trim().toLowerCase();

        let item = {
            account: accountId,
            ...contact,
            email,
            first_name,
            last_name,
        };

        objs.push(item);
    }

    if (!objs.length) throw `No valid contacts found`;

    logg.info(`contacts-length: ${objs.length}`);
    if (objs.length < 10) {
        logg.info(`contact-objs: ${JSON.stringify(objs)}`);
    }

    let emails = objs.map((o) => o.email);

    let existingDocs = await Contact.find({
        account: accountId,
        email: { $in: emails },
    }).lean();

    let existingEmails = existingDocs.map((d) => d.email);
    let existingEmailsSet = new Set(existingEmails);

    let updatePromises = [],
        createObjs = [];

    for (let obj of objs) {
        let { email } = obj;
        if (existingEmailsSet.has(email)) {
            logg.info(`updating existing contact: ${email}`);
            let updateObj = { ...obj };
            delete updateObj.email;
            let queryObj = { account: accountId, email };
            updatePromises.push(
                Contact.findOneAndUpdate(queryObj, updateObj, { new: true })
            );
        } else {
            logg.info(`creating new contact: ${email}`);
            if (obj.latest_source) {
                obj.original_source = obj.latest_source;
            }
            if (obj.latest_source_drill_down_1) {
                obj.original_source_drill_down_1 =
                    obj.latest_source_drill_down_1;
            }
            if (obj.latest_source_drill_down_2) {
                obj.original_source_drill_down_2 =
                    obj.latest_source_drill_down_2;
            }

            createObjs.push(obj);
        }
    }

    let result = [];
    if (createObjs.length) {
        logg.info(`creating new contacts: ${createObjs.length}`);
        let createResps = await Contact.insertMany(createObjs);
        // add the created contacts to the result
        result = result.concat(createResps);
    }

    if (updatePromises.length) {
        logg.info(`updating existing contacts: ${updatePromises.length}`);
        let updateResps = await Promise.all(updatePromises);
        // add the updated contacts to the result
        result = result.concat(updateResps);
    }

    logg.info(`ended`);
    return [result, null];
}

export const createContacts = functionWrapper(
    fileName,
    "createContacts",
    _createContacts
);

async function _addSessionToContact(
    { sessionId, contactId, accountId, updateLastContactedOn },
    { txid, funcName, logg }
) {
    logg.info(`started`);

    if (!sessionId) throw `sessionId is required`;
    if (!contactId) throw `contactId is required`;
    if (!accountId) throw `accountId is required`;

    let contact = await Contact.findOne({
        _id: contactId,
        account: accountId,
    }).lean();

    if (!contact) throw `contact not found`;

    let sessionIds = contact.analytic_sessions || [];
    /*
    analytic_sessions: [{
                    session_id: sessionId,
                    created_on: new Date(),
                }]
    */
    let existingSessionIds = sessionIds.map((s) => s.session_id);
    if (existingSessionIds.includes(sessionId)) {
        logg.info(`session already exists for contact`);
        return [null, null];
    }

    let updateObj = {
        $push: {
            analytic_sessions: {
                session_id: sessionId,
                created_on: new Date(),
            },
        },
    };

    if (updateLastContactedOn) {
        updateObj.last_contacted_on = new Date();
    }

    let queryObj = { _id: contactId, account: accountId };
    let updateResp = await Contact.updateOne(queryObj, updateObj);
    logg.info(`updateResp: ${JSON.stringify(updateResp)}`);

    logg.info(`ended`);
    return [updateResp, null];
}

export const addSessionToContact = functionWrapper(
    fileName,
    "addSessionToContact",
    _addSessionToContact
);

async function _getAllContacts(
    { accountId, addFullName },
    { txid, funcName, logg }
) {
    logg.info(`started`);
    if (!accountId) throw `accountId is required`;

    let contacts = await Contact.find({ account: accountId }).lean();
    logg.info(`contacts: ${contacts.length}`);

    if (addFullName) {
        contacts = contacts.map((c) => {
            c.name = `${c.first_name} ${c.last_name}`;
            return c;
        });
    }
    logg.info(`ended`);
    return [contacts, null];
}

export const getAllContacts = functionWrapper(
    fileName,
    "getAllContacts",
    _getAllContacts
);

async function _getContactById(
    { contactId, accountId, addFullName },
    { txid, funcName, logg }
) {
    logg.info(`started`);
    if (!contactId) throw `contactId is required`;
    if (!accountId) throw `accountId is required`;

    let contact = await Contact.findOne({
        _id: contactId,
        account: accountId,
    }).lean();
    logg.info(`contact: ${JSON.stringify(contact)}`);

    if (addFullName) {
        contact.name = `${contact.first_name} ${contact.last_name}`;
    }
    logg.info(`ended`);
    return [contact, null];
}

export const getContactById = functionWrapper(
    fileName,
    "getContactById",
    _getContactById
);

async function _getContactByEmails(
    { emails, accountId, addFullName },
    { txid, funcName, logg }
) {
    logg.info(`started`);

    if (!emails || !emails.length) throw `contactEmails is required`;
    if (!accountId) throw `accountId is required`;

    let contacts = await Contact.find({
        account: accountId,
        email: { $in: emails },
    }).lean();

    if (addFullName) {
        contacts = contacts.map((c) => {
            let name = c.first_name || "";
            if (c.last_name) {
                name += ` ${c.last_name}`;
            }
            name = name.trim();
            c.name = name;
            return c;
        });
    }

    logg.info(`ended`);
    return [contacts, null];
}

export const getContactByEmails = functionWrapper(
    fileName,
    "getContactByEmails",
    _getContactByEmails
);
