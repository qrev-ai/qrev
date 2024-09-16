import CustomError from "../../std/custom.error.js";
import { logger } from "../../logger.js";
import * as AccountUtils from "../../utils/account/account.utils.js";
import * as CampaignUtils from "../../utils/campaign/campaign.utils.js";

const fileName = "Account APIs";

export async function createAccountApi(req, res, next) {
    const txid = req.id;
    const funcName = "createAccountApi";
    const logg = logger.child({ txid, funcName });
    logg.info(`started with body:`, req.body);
    let userId = req.user && req.user.userId ? req.user.userId : null;
    if (!userId) {
        logg.info(`ended unsuccessfully`);
        throw new CustomError(
            `Missing userId from decoded access token`,
            fileName,
            funcName,
            400,
            true
        );
    }

    let { name, domain } = req.body;
    if (!name) {
        logg.info(`ended unsuccessfully`);
        throw new CustomError(`Missing name`, fileName, funcName, 400, true);
    }

    domain = domain ? domain : "";

    logg.info(`Detected userId: ${userId}`);
    let [{ account, accountUser }, dbErr] = await AccountUtils.createAccount(
        { name, domain, ownerUserId: userId },
        { txid }
    );
    if (dbErr) {
        logg.info(`ended unsuccessfully`);
        throw dbErr;
    }
    logg.info(`ended`);
    res.json({
        success: true,
        message: `${funcName} executed successfully`,
        txid,
        account_id: account._id,
    });
}

export async function getAccountUsersApi(req, res, next) {
    const txid = req.id;
    const funcName = "getAccountUsersApi";
    const logg = logger.child({ txid, funcName });
    logg.info(`started with query:`, req.query);
    let userId = req.user && req.user.userId ? req.user.userId : null;
    if (!userId) {
        logg.info(`ended unsuccessfully`);
        throw new CustomError(
            `Missing userId from decoded access token`,
            fileName,
            funcName,
            400,
            true
        );
    }

    let { account_id: accountId } = req.query;
    if (!accountId) {
        logg.info(`ended unsuccessfully`);
        throw new CustomError(
            `Missing accountId`,
            fileName,
            funcName,
            400,
            true
        );
    }

    let [account_users, dbErr] = await AccountUtils.getAccountUsers(
        { accountId },
        { txid }
    );
    if (dbErr) {
        logg.info(`ended unsuccessfully`);
        throw dbErr;
    }
    logg.info(`ended`);
    res.json({
        success: true,
        message: `${funcName} executed successfully`,
        txid,
        account_users,
    });
}

export async function inviteUserToAccountApi(req, res, next) {
    const txid = req.id;
    const funcName = "inviteUserToAccountApi";
    const logg = logger.child({ txid, funcName });
    logg.info(`started with body:`, req.body);
    logg.info(`started with query:`, req.query);

    let userId = req.user && req.user.userId ? req.user.userId : null;
    if (!userId) {
        logg.info(`ended unsuccessfully`);
        throw new CustomError(
            `Missing userId from decoded access token`,
            fileName,
            funcName,
            400,
            true
        );
    }

    let { user_emails: userEmails, is_super_admin: isSuperAdmin } = req.body;
    let { account_id: accountId } = req.query;
    if (!accountId) {
        logg.info(`ended unsuccessfully`);
        throw new CustomError(
            `Missing accountId`,
            fileName,
            funcName,
            400,
            true
        );
    }
    if (!userEmails || !userEmails.length) {
        logg.info(`ended unsuccessfully`);
        throw new CustomError(`Missing users`, fileName, funcName, 400, true);
    }

    const invalidEmailPresent = userEmails.filter(
        (email) => !email || !email.trim() || !email.includes("@")
    );
    if (invalidEmailPresent.length) {
        logg.info(`ended unsuccessfully`);
        throw new CustomError(
            `Invalid emails present in user_emails`,
            fileName,
            funcName,
            400,
            true
        );
    }

    if (!isSuperAdmin) {
        isSuperAdmin = false;
    }

    let [added_users, dbErr] = await AccountUtils.addUsersToAccount(
        { accountId, userEmails, isSuperAdmin },
        { txid }
    );
    if (dbErr) {
        logg.info(`ended unsuccessfully`);
        throw dbErr;
    }
    logg.info(`ended`);
    res.json({
        success: true,
        message: `${funcName} executed successfully`,
        txid,
        added_users,
    });
}

export async function removeUserFromAccountApi(req, res, next) {
    const txid = req.id;
    const funcName = "removeUserFromAccountApi";
    const logg = logger.child({ txid, funcName });
    logg.info(`started with body:`, req.body);
    logg.info(`started with query:`, req.query);
    let userId = req.user && req.user.userId ? req.user.userId : null;
    if (!userId) {
        logg.info(`ended unsuccessfully`);
        throw new CustomError(
            `Missing userId from decoded access token`,
            fileName,
            funcName,
            400,
            true
        );
    }

    let { user_id: toBeRemovedUserId } = req.body;
    let { account_id: accountId } = req.query;
    if (!accountId) {
        logg.info(`ended unsuccessfully`);
        throw new CustomError(
            `Missing accountId`,
            fileName,
            funcName,
            400,
            true
        );
    }
    if (!toBeRemovedUserId) {
        logg.info(`ended unsuccessfully`);
        throw new CustomError(
            `Missing user_id of user to be removed`,
            fileName,
            funcName,
            400,
            true
        );
    }

    let [removed_user, dbErr] = await AccountUtils.removeUserFromAccount(
        { accountId, toBeRemovedUserId },
        { txid }
    );
    if (dbErr) {
        logg.info(`ended unsuccessfully`);
        throw dbErr;
    }
    logg.info(`ended`);
    res.json({
        success: true,
        message: `${funcName} executed successfully`,
        txid,
    });
}

/*
 * Added on 16th September 2024
 * WHAT DOES THIS API DO?
 * Returns list of things to be configured for the user account
 * WHERE IS THIS API USED?
 * When user logs in, we need to check if they have configured their account with all required resources.
 * These resources are: account setup, brand document, pain points doc, ICP text/voice/doc, default campaign settings
 * WHY IS THIS API NEEDED?
 * Lets assume user has setup their account and brand document. But before they could set other things browser got closed or they logged out. So we need to show them what they have not configured.
 
* Response structure:
{
            to_be_configured: [
        { config_type: "account_info" },
        {
            config_type: "resource",
            values: [
                "brand_doc",
                "pain_points_doc",
                "case_studies_doc",
                "icp_doc",
            ],
        },
                { config_type: "default_configurations" },
            ],
        }
*/
export async function getAccountConfigStatusApi(req, res, next) {
    const txid = req.id;
    const funcName = "getAccountConfigStatusApi";
    const logg = logger.child({ txid, funcName });
    logg.info(`started with body: ${JSON.stringify(req.body)}`);
    logg.info(`started with query: ${JSON.stringify(req.query)}`);

    let userId = req.user && req.user.userId ? req.user.userId : null;
    if (!userId) {
        throw new CustomError(
            `Missing userId from decoded access token`,
            fileName,
            funcName
        );
    }

    let { account_id: accountId, return_all_config: returnAllConfig } =
        req.query;
    if (!accountId && !returnAllConfig) {
        throw new CustomError(
            `Missing account_id or return_all_config`,
            fileName,
            funcName
        );
    }

    let toBeConfigured = [];
    if (returnAllConfig) {
        // return all config
        toBeConfigured.push({
            config_type: "account_info",
        });
        toBeConfigured.push({
            config_type: "resource",
            values: CampaignUtils.getAllResourcesToBeConfigured(),
        });
        toBeConfigured.push({ config_type: "default_configurations" });
        logg.info(`toBeConfigured: ${JSON.stringify(toBeConfigured)}`);
        logg.info(`ended`);
        return res.json({
            success: true,
            message: `${funcName} executed successfully`,
            txid,
            to_be_configured: toBeConfigured,
        });
    }

    let [missingResourcesResp, missingResourcesDbErr] =
        await CampaignUtils.checkMissingResources({ accountId }, { txid });
    if (missingResourcesDbErr) {
        logg.info(`ended unsuccessfully`);
        throw missingResourcesDbErr;
    }

    let missingResources =
        missingResourcesResp && missingResourcesResp.missingResources;
    if (missingResources && missingResources.length > 0) {
        toBeConfigured.push({
            config_type: "resource",
            values: missingResources,
        });
    }

    let [campaignDefaults, campaignDefaultsDbErr] =
        await CampaignUtils.getExistingCampaignDefaults(
            { accountId, userId, createIfNotExists: false },
            { txid }
        );
    if (campaignDefaultsDbErr) {
        logg.info(`ended unsuccessfully`);
        throw campaignDefaultsDbErr;
    }

    if (!campaignDefaults) {
        toBeConfigured.push({ config_type: "default_configurations" });
    }

    logg.info(`toBeConfigured: ${JSON.stringify(toBeConfigured)}`);
    logg.info(`ended`);
    return res.json({
        success: true,
        message: `${funcName} executed successfully`,
        txid,
        to_be_configured: toBeConfigured,
    });
}
