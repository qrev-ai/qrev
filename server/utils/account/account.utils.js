import { functionWrapper } from "../../std/wrappers.js";
import CustomError from "../../std/custom.error.js";
import { logger } from "../../logger.js";
import { AccountModel } from "../../models/account/account.model.js";
import { AccountUser } from "../../models/account/account.users.model.js";
import * as UserUtils from "../user/user.utils.js";

const fileName = "Account Utils";

async function _getUserAccounts({ userId }, { logg, txid, funcName }) {
    logg.info(`started`);
    let accounts = await AccountUser.find({ user: userId })
        .populate("account")
        .select("-__v -_id")
        .lean();

    accounts = accounts.map((obj) => {
        return {
            id: obj.account._id,
            name: obj.account.name,
            domain: obj.account.domain,
        };
    });
    logg.info(`ended`);
    return [accounts, null];
}

export const getUserAccounts = functionWrapper(
    fileName,
    "getUserAccounts",
    _getUserAccounts
);

async function _createAccount(
    { name, domain, ownerUserId },
    { logg, txid, funcName }
) {
    logg.info(`started`);
    const account = new AccountModel({
        name,
        domain,
        owner: ownerUserId,
    });
    const savedAccount = await account.save();
    const accountUser = new AccountUser({
        account: savedAccount._id,
        user: ownerUserId,
        is_super_admin: true,
        invite_status: "accepted",
    });
    await accountUser.save();
    logg.info(`ended`);
    return [{ account: savedAccount, accountUser }, null];
}

export const createAccount = functionWrapper(
    fileName,
    "createAccount",
    _createAccount
);

async function _getAccountUsers({ accountId }, { logg, txid, funcName }) {
    logg.info(`started`);
    if (!accountId) {
        throw `accountId is required`;
    }
    const selectListStr =
        "-__v -user.__v -user.devices -user.google_oauths -user.profile_email";
    let accountUsers = await AccountUser.find({ account: accountId })
        .populate("user")
        .select(selectListStr)
        .lean();

    accountUsers = accountUsers.map((obj) => {
        let userName = "";
        if (obj.user.profile_first_name) {
            userName += obj.user.profile_first_name;
        }
        if (obj.user.profile_last_name) {
            if (userName.length > 0) userName += " ";
            userName += obj.user.profile_last_name;
        }
        return {
            // account_user_id: obj._id,
            user_id: obj.user._id,
            name: userName,
            email: obj.user.email,
            is_super_admin: obj.is_super_admin,
            invite_status: obj.invite_status,
            created_on: obj.created_on,
            updated_on: obj.updated_on,
        };
    });
    logg.info(`ended`);
    return [accountUsers, null];
}

export const getAccountUsers = functionWrapper(
    fileName,
    "getAccountUsers",
    _getAccountUsers
);

async function _addUsersToAccount(
    { accountId, userEmails, isSuperAdmin },
    { logg, txid, funcName }
) {
    logg.info(`started`);
    if (!accountId) {
        throw `accountId is required`;
    }
    if (!userEmails || !userEmails.length) {
        throw `atleast one user email is required`;
    }
    let accountUsers = [];
    for (let userEmail of userEmails) {
        // if user exists, add user to account
        // else create user and set logged_in to false for the user and then add user to account
        let [userObj, getUserDbErr] = await UserUtils.getUserObjByEmail(
            { email: userEmail },
            { txid }
        );
        if (getUserDbErr) {
            logg.error(`ended unsuccessfully: getUserDbErr`);
            throw getUserDbErr;
        }
        if (!userObj) {
            logg.info(
                `|${userEmail}|: user not found, so creating user with logged_in: false`
            );
            let newUserObj = {
                email: userEmail.trim().toLowerCase(),
                logged_in: false,
                devices: [],
            };
            let [createdUserObj, createDbErr] = await UserUtils.createUser(
                {
                    data: newUserObj,
                },
                { txid }
            );
            if (createDbErr) {
                logg.error(`|${userEmail}|: ended unsuccessfully: createDbErr`);
                throw createDbErr;
            }
            userObj = createdUserObj;
        }

        let userName = "";
        if (userObj.profile_first_name) {
            userName += userObj.profile_first_name;
        }
        if (userObj.profile_last_name) {
            if (userName.length > 0) userName += " ";
            userName += userObj.profile_last_name;
        }

        // if user is already added to account, skip
        let existingAccountUserObj = await AccountUser.findOne({
            account: accountId,
            user: userObj._id,
        }).lean();
        if (existingAccountUserObj) {
            logg.info(
                `|${userEmail}|: user already added to account, so skipping: |${userEmail}|`
            );
            accountUsers.push({
                // account_user_id: existingAccountUserObj._id,
                user_id: userObj._id,
                name: userName,
                email: userObj.email,
                is_super_admin: existingAccountUserObj.is_super_admin,
                invite_status: existingAccountUserObj.invite_status,
                created_on: existingAccountUserObj.created_on,
                updated_on: existingAccountUserObj.updated_on,
            });
            continue;
        }

        let [accountUserObj, accountUserDbErr] = await addUserToAccount(
            { accountId, userObj, isSuperAdmin },
            { txid }
        );
        if (accountUserDbErr) {
            logg.error(
                `|${userEmail}|: ended unsuccessfully: accountUserDbErr`
            );
            throw accountUserDbErr;
        }

        accountUsers.push({
            // account_user_id: accountUserObj._id,
            user_id: userObj._id,
            name: userName,
            email: userObj.email,
            is_super_admin: isSuperAdmin,
            invite_status: accountUserObj.invite_status,
            created_on: accountUserObj.created_on,
            updated_on: accountUserObj.updated_on,
        });
    }
    logg.info(`ended`);
    return [accountUsers, null];
}

export const addUsersToAccount = functionWrapper(
    fileName,
    "addUsersToAccount",
    _addUsersToAccount
);

async function _addUserToAccount(
    { accountId, userObj, isSuperAdmin },
    { logg, txid, funcName }
) {
    logg.info(`started`);
    if (!accountId) {
        throw `accountId is required`;
    }
    if (!userObj || !userObj._id) {
        throw `userObj or userObj._id is required`;
    }
    let accountUserObj = new AccountUser({
        account: accountId,
        user: userObj._id,
        is_super_admin: isSuperAdmin || false,
        invite_status: "pending",
    });
    let savedAccountUserObj = await accountUserObj.save();

    logg.info(`ended`);
    return [savedAccountUserObj, null];
}

export const addUserToAccount = functionWrapper(
    fileName,
    "addUserToAccount",
    _addUserToAccount
);

async function _removeUserFromAccount(
    { accountId, toBeRemovedUserId },
    { logg, txid, funcName }
) {
    logg.info(`started`);
    if (!accountId) {
        throw `accountId is required`;
    }
    if (!toBeRemovedUserId) {
        throw `toBeRemovedUserId is required`;
    }
    let accountUserObj = await AccountUser.findOne({
        account: accountId,
        user: toBeRemovedUserId,
    }).lean();
    if (!accountUserObj) {
        throw `accountUserObj not found`;
    }
    let deletedAccountUserObj = await AccountUser.findOneAndDelete({
        account: accountId,
        user: toBeRemovedUserId,
    }).lean();
    logg.info(`ended`);
    return [deletedAccountUserObj, null];
}

export const removeUserFromAccount = functionWrapper(
    fileName,
    "removeUserFromAccount",
    _removeUserFromAccount
);
