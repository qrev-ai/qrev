import { functionWrapper } from "../../std/wrappers.js";
import CustomError from "../../std/custom.error.js";
import { logger } from "../../logger.js";
import { Contact } from "../../models/crm/contact.model.js";

const fileName = "Contact Utils";

async function _createContact(
    { contactData, accountId },
    { logg, txid, funcName }
) {
    logg.info(`started`);

    const contact = new Contact({
        ...contactData,
        account: accountId,
    });

    const savedContact = await contact.save();

    logg.info(`ended`);
    return [savedContact, null];
}

export const createContact = functionWrapper(
    fileName,
    "createContact",
    _createContact
);

async function _getContacts(
    { accountId, filters = {}, pagination = {} },
    { logg, txid, funcName }
) {
    logg.info(`started`);

    const query = { account: accountId, is_deleted: { $ne: true } };

    // Apply filters
    if (filters.startDate && filters.endDate) {
        query.created_on = {
            $gte: new Date(filters.startDate),
            $lte: new Date(filters.endDate),
        };
    }

    if (filters.statuses && filters.statuses.length > 0) {
        query.status = { $in: filters.statuses };
    }

    if (filters.company) {
        query.company = filters.company;
    }

    if (filters.reseller) {
        // the value can be "assigned" or "unassigned" or "all"
        if (filters.reseller === "assigned") {
            query.reseller = { $ne: null, $exists: true };
        } else if (filters.reseller === "unassigned") {
            // value is either null or undefined
            query.reseller = { $exists: false };
        } else if (filters.reseller === "all") {
            // do nothing
        } else {
            logg.info(`Invalid value for reseller: ${filters.reseller}`);
            throw `Invalid value for reseller: ${filters.reseller}`;
        }
    }

    // if (filters.search) {
    //     query.$or = [
    //         { first_name: { $regex: filters.search, $options: "i" } },
    //         { last_name: { $regex: filters.search, $options: "i" } },
    //         { email: { $regex: filters.search, $options: "i" } },
    //     ];
    // }

    // Set up pagination
    const page = parseInt(pagination.page) || 1;
    const limit = parseInt(pagination.limit) || 10;
    const skip = (page - 1) * limit;

    logg.info(`Query: ${JSON.stringify(query)}`);
    // Execute query
    const totalCount = await Contact.countDocuments(query);
    const contacts = await Contact.find(query)
        .populate("company", "name")
        .populate("reseller", "first_name last_name")
        .sort({ created_on: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

    logg.info(`Total Contacts Count: ${totalCount}`);
    if (contacts.length < 5) {
        logg.info(`Contacts: ${JSON.stringify(contacts)}`);
    }
    // if reseller is not found, then set it to null
    contacts.forEach((contact) => {
        if (!contact.reseller) {
            contact.reseller = null;
        }
    });

    const result = {
        contacts,
        pagination: {
            total: totalCount,
            page,
            limit,
            pages: Math.ceil(totalCount / limit),
        },
    };

    logg.info(`ended`);
    return [result, null];
}

export const getContacts = functionWrapper(
    fileName,
    "getContacts",
    _getContacts
);

async function _deleteContact(
    { contactId, accountId },
    { logg, txid, funcName }
) {
    logg.info(`started`);

    const contact = await Contact.findOne({
        _id: contactId,
        account: accountId,
    }).lean();

    if (!contact) {
        throw `Contact not found with id: ${contactId}`;
    }

    const deletedContact = await Contact.findOneAndUpdate(
        { _id: contactId, account: accountId },
        { is_deleted: true },
        { new: true }
    ).lean();

    logg.info(`ended`);
    return [deletedContact, null];
}

export const deleteContact = functionWrapper(
    fileName,
    "deleteContact",
    _deleteContact
);

async function _getContactById(
    { contactId, accountId },
    { logg, txid, funcName }
) {
    logg.info(`started`);

    const contact = await Contact.findOne({
        _id: contactId,
        account: accountId,
    })
        .populate("company", "name")
        .populate("reseller", "first_name last_name")
        .lean();

    if (!contact) {
        throw `Contact not found with id: ${contactId}`;
    }

    logg.info(`ended`);
    return [contact, null];
}

export const getContactById = functionWrapper(
    fileName,
    "getContactById",
    _getContactById
);
