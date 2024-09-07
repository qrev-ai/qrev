import { functionWrapper } from "../../std/wrappers.js";
import CustomError from "../../std/custom.error.js";
import { logger } from "../../logger.js";
import { AccountModel } from "../../models/account/account.model.js";
import { AccountUser } from "../../models/account/account.users.model.js";

const fileName = "Account User Utils";

async function _setUserConfig(
    {
        userId,
        accountId,
        timezone,
        workingStartWindowHour,
        workingEndWindowHour,
        workingCustomHours,
        duration,
        bufferTime,
        conferenceType,
        visibleForDays,
    },
    { logg, txid, funcName }
) {
    logg.info(`started`);
    // get account user
    const [accountUser, accountUserErr] = await getAccountUser(
        { userId, accountId },
        { logg, txid, funcName }
    );
    if (accountUserErr) {
        logg.info(`ended unsuccessfully`);
        throw accountUserErr;
    }
    if (!accountUser) {
        logg.info(`ended unsuccessfully since no user found for this account`);
        throw `No user found for this account`;
    }

    workingStartWindowHour = workingStartWindowHour
        ? workingStartWindowHour
        : "";
    workingEndWindowHour = workingEndWindowHour ? workingEndWindowHour : "";

    if (workingStartWindowHour && workingEndWindowHour) {
        workingCustomHours = {};
    }
    let updateObj = {
        timezone,
        working_start_window_hour: workingStartWindowHour,
        working_end_window_hour: workingEndWindowHour,
        working_custom_hours: workingCustomHours,
        duration,
        buffer_time: bufferTime,
        conference_type: conferenceType,
        visible_for_days: visibleForDays,
        updated_on: new Date(),
    };

    let dbResp = await AccountUser.findOneAndUpdate(
        { _id: accountUser._id },
        updateObj,
        { new: true }
    ).lean();
    logg.info(`started`);
    return [dbResp, null];
}

export const setUserConfig = functionWrapper(
    fileName,
    "setUserConfig",
    _setUserConfig
);

async function _getAccountUser(
    { userId, accountId, includeUserInfo },
    { logg, txid, funcName }
) {
    logg.info(`started`);
    let accountUser = null;
    let queryObj = {
        user: userId,
        account: accountId,
    };
    if (includeUserInfo) {
        accountUser = await AccountUser.findOne(queryObj)
            .populate("user")
            .lean();
    } else {
        accountUser = await AccountUser.findOne(queryObj).lean();
    }
    logg.info(`accountUser: ${JSON.stringify(accountUser)}`);
    logg.info(`ended`);
    return [accountUser, null];
}

export const getAccountUser = functionWrapper(
    fileName,
    "getAccountUser",
    _getAccountUser
);

async function _getUserConfig({ userId, accountId }, { logg, txid, funcName }) {
    logg.info(`started`);
    // get account user
    const [accountUser, accountUserErr] = await getAccountUser(
        { userId, accountId },
        { logg, txid, funcName }
    );
    if (accountUserErr) {
        logg.info(`ended unsuccessfully`);
        throw accountUserErr;
    }
    if (!accountUser) {
        logg.info(`ended unsuccessfully since no user found for this account`);
        throw `No user found for this account`;
    }
    let result = {
        timezone: accountUser.timezone,
        working_start_window_hour: accountUser.working_start_window_hour,
        working_end_window_hour: accountUser.working_end_window_hour,
        working_custom_hours: accountUser.working_custom_hours,
        duration: accountUser.duration,
        buffer_time: accountUser.buffer_time,
        conference_type: accountUser.conference_type,
        visible_for_days: accountUser.visible_for_days,
    };
    logg.info(`ended`);
    return [result, null];
}

export const getUserConfig = functionWrapper(
    fileName,
    "getUserConfig",
    _getUserConfig
);

async function _updateConferenceType(
    { accountId, userId, conferenceType },
    { logg, txid, funcName }
) {
    logg.info(`started`);
    if (!userId) throw `invalid userId`;
    if (!accountId) throw `invalid accountId`;
    if (!conferenceType) throw `invalid conferenceType`;

    const [accountUser, accountUserErr] = await getAccountUser(
        { userId, accountId },
        { logg, txid, funcName }
    );
    if (accountUserErr) {
        logg.info(`ended unsuccessfully`);
        throw accountUserErr;
    }
    if (!accountUser) {
        logg.info(`ended unsuccessfully since no user found for this account`);
        throw `No user found for this account`;
    }

    let updateResp = await AccountUser.updateOne(
        { user: userId, account: accountId },
        { conference_type: conferenceType }
    );
    logg.info(`updateResp: ${JSON.stringify(updateResp)}`);
    logg.info(`ended successfully`);
    return [updateResp, null];
}

export const updateConferenceType = functionWrapper(
    fileName,
    "updateConferenceType",
    _updateConferenceType
);

async function _updateAccountUserStatusAsLoggedIn(
    { userId },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    if (!userId) throw `invalid userId`;

    let accountUserDocs = await AccountUser.find({ user: userId }).lean();
    logg.info(`accountUserDocs: ${JSON.stringify(accountUserDocs)}`);

    if (!accountUserDocs || !accountUserDocs.length) {
        logg.info(`ended successfully since no accountUser found`);
        return [true, null];
    }

    let toBeUpdatedAccountUserIds = [];
    for (const accountUserDoc of accountUserDocs) {
        let status = accountUserDoc && accountUserDoc.invite_status;
        if (status === "pending") {
            toBeUpdatedAccountUserIds.push(accountUserDoc._id);
        }
    }

    if (toBeUpdatedAccountUserIds.length) {
        let updateResp = await AccountUser.updateMany(
            { _id: { $in: toBeUpdatedAccountUserIds } },
            { invite_status: "accepted", updated_on: new Date() }
        );
        logg.info(`updateResp: ${JSON.stringify(updateResp)}`);
    }

    logg.info(`ended successfully`);
    return [true, null];
}

export const updateAccountUserStatusAsLoggedIn = functionWrapper(
    fileName,
    "updateAccountUserStatusAsLoggedIn",
    _updateAccountUserStatusAsLoggedIn
);

async function _doAllUsersBelongToAccount(
    { accountId, userIds },
    { logg, txid, funcName }
) {
    logg.info(`started`);
    if (!accountId) throw `invalid accountId`;
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        throw `invalid userIds`;
    }

    logg.info(`userIds: ${JSON.stringify(userIds)}`);
    const count = await AccountUser.countDocuments({
        account: accountId,
        user: { $in: userIds },
    });
    logg.info(`count: ${count}`);

    const allBelong = count === userIds.length;

    logg.info(`All users belong to account: ${allBelong}`);
    logg.info(`ended`);
    return [allBelong, null];
}

export const doAllUsersBelongToAccount = functionWrapper(
    fileName,
    "doAllUsersBelongToAccount",
    _doAllUsersBelongToAccount
);
