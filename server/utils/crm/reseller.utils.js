import { functionWrapper } from "../../std/wrappers.js";
import CustomError from "../../std/custom.error.js";
import { logger } from "../../logger.js";
import { Reseller } from "../../models/crm/reseller.model.js";

const fileName = "Reseller Utils";

async function _createReseller(
    { resellerData, accountId },
    { logg, txid, funcName }
) {
    logg.info(`started`);

    const reseller = new Reseller({
        ...resellerData,
        account: accountId,
    });

    const savedReseller = await reseller.save();

    logg.info(`ended`);
    return [savedReseller, null];
}

export const createReseller = functionWrapper(
    fileName,
    "createReseller",
    _createReseller
);

async function _getResellers(
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

    if (filters.status) {
        query.status = filters.status;
    }

    if (filters.certified !== undefined) {
        query.certified = filters.certified;
    }

    if (filters.minScore !== undefined) {
        query.score = { ...(query.score || {}), $gte: filters.minScore };
    }

    if (filters.maxScore !== undefined) {
        query.score = { ...(query.score || {}), $lte: filters.maxScore };
    }

    if (filters.search) {
        query.$or = [
            { first_name: { $regex: filters.search, $options: "i" } },
            { last_name: { $regex: filters.search, $options: "i" } },
            { email: { $regex: filters.search, $options: "i" } },
            { company: { $regex: filters.search, $options: "i" } },
        ];
    }

    // Set up pagination
    const page = parseInt(pagination.page) || 1;
    const limit = parseInt(pagination.limit) || 10;
    const skip = (page - 1) * limit;

    // Execute query
    const totalCount = await Reseller.countDocuments(query);
    const resellers = await Reseller.find(query)
        .sort({ created_on: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

    const result = {
        resellers,
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

export const getResellers = functionWrapper(
    fileName,
    "getResellers",
    _getResellers
);

async function _deleteReseller(
    { resellerId, accountId },
    { logg, txid, funcName }
) {
    logg.info(`started`);

    const reseller = await Reseller.findOne({
        _id: resellerId,
        account: accountId,
        is_deleted: { $ne: true },
    }).lean();

    if (!reseller) {
        throw `Reseller not found with id: ${resellerId}`;
    }

    const deletedReseller = await Reseller.findOneAndUpdate(
        { _id: resellerId, account: accountId },
        { is_deleted: true },
        { new: true }
    ).lean();

    logg.info(`ended`);
    return [deletedReseller, null];
}

export const deleteReseller = functionWrapper(
    fileName,
    "deleteReseller",
    _deleteReseller
);

async function _getResellerById(
    { resellerId, accountId },
    { logg, txid, funcName }
) {
    logg.info(`started`);

    const reseller = await Reseller.findOne({
        _id: resellerId,
        account: accountId,
    }).lean();

    if (!reseller) {
        throw `Reseller not found with id: ${resellerId}`;
    }

    logg.info(`ended`);
    return [reseller, null];
}

export const getResellerById = functionWrapper(
    fileName,
    "getResellerById",
    _getResellerById
);

async function _getResellerLeaderboard(
    { accountId, basedOn },
    { logg, txid, funcName }
) {
    logg.info(`started`);

    let sortField;
    switch (basedOn) {
        case "score":
            sortField = { score: -1 };
            break;
        case "response_time":
            sortField = { response_time: 1 }; // Lower is better for response time
            break;
        case "conversion":
            sortField = { conversion: -1 };
            break;
        case "satisfaction":
            sortField = { satisfaction: -1 };
            break;
        default:
            sortField = { score: -1 };
    }

    const resellers = await Reseller.find({ account: accountId })
        .sort(sortField)
        .select(
            "first_name last_name email score response_time conversion satisfaction certified"
        )
        .lean();

    // Add ranking to each reseller
    const rankedResellers = resellers.map((reseller, index) => ({
        ...reseller,
        rank: index + 1,
    }));

    logg.info(`ended`);
    return [rankedResellers, null];
}

export const getResellerLeaderboard = functionWrapper(
    fileName,
    "getResellerLeaderboard",
    _getResellerLeaderboard
);
