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

    const query = { account: accountId };

    // Apply filters
    if (filters.startDate && filters.endDate) {
        query.created_on = {
            $gte: new Date(filters.startDate),
            $lte: new Date(filters.endDate),
        };
    }

    if (filters.status) {
        query.status = filters.status;
    }

    if (filters.company) {
        query.company = filters.company;
    }

    if (filters.reseller) {
        query.reseller = filters.reseller;
    }

    if (filters.search) {
        query.$or = [
            { first_name: { $regex: filters.search, $options: "i" } },
            { last_name: { $regex: filters.search, $options: "i" } },
            { email: { $regex: filters.search, $options: "i" } },
        ];
    }

    // Set up pagination
    const page = parseInt(pagination.page) || 1;
    const limit = parseInt(pagination.limit) || 10;
    const skip = (page - 1) * limit;

    // Execute query
    const totalCount = await Contact.countDocuments(query);
    const contacts = await Contact.find(query)
        .populate("company", "name")
        .populate("reseller", "first_name last_name")
        .sort({ created_on: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

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

    const deletedContact = await Contact.findOneAndDelete({
        _id: contactId,
        account: accountId,
    }).lean();

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
