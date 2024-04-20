import CustomError from "../../std/custom.error.js";
import { logger } from "../../logger.js";
import * as TeamUtils from "../../utils/team/team.utils.js";

const fileName = "Team APIs";

export async function createTeamApi(req, res, next) {
    const txid = req.id;
    const funcName = "createTeamApi";
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

    // api has account_id in query
    // api has name, members in body
    let { account_id: accountId } = req.query;
    let { name, members } = req.body;
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
    if (!name) {
        logg.info(`ended unsuccessfully`);
        throw new CustomError(`Missing name`, fileName, funcName, 400, true);
    }
    if (!members || members.length === 0) {
        logg.info(`ended unsuccessfully`);
        throw new CustomError(`Missing members`, fileName, funcName, 400, true);
    }

    logg.info(`Detected userId: ${userId}`);
    let [{ team, teamUsers }, dbErr] = await TeamUtils.createTeam(
        { name, members, accountId, createdByUserId: userId },
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
        team_id: team._id,
    });
}

export async function updateTeamApi(req, res, next) {
    const txid = req.id;
    const funcName = "updateTeamApi";
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

    // api has team_id,account_id in query
    // api has name, members in body
    let { team_id: teamId, account_id: accountId } = req.query;
    let { name, members } = req.body;
    if (!teamId) {
        logg.info(`ended unsuccessfully`);
        throw new CustomError(`Missing team_id`, fileName, funcName, 400, true);
    }
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
    if (!name) {
        logg.info(`ended unsuccessfully`);
        throw new CustomError(`Missing name`, fileName, funcName, 400, true);
    }
    if (!members || members.length === 0) {
        logg.info(`ended unsuccessfully`);
        throw new CustomError(`Missing members`, fileName, funcName, 400, true);
    }

    let [updateResp, dbErr] = await TeamUtils.updateTeam(
        { name, members, teamId, accountId },
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

export async function deleteTeamApi(req, res, next) {
    const txid = req.id;
    const funcName = "deleteTeamApi";
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

    // api has team_id,account_id in query
    let { team_id: teamId, account_id: accountId } = req.query;
    if (!teamId) {
        logg.info(`ended unsuccessfully`);
        throw new CustomError(`Missing team_id`, fileName, funcName, 400, true);
    }
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

    let [deleteResp, dbErr] = await TeamUtils.deleteTeam(
        { teamId, accountId },
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

export async function getTeamsApi(req, res, next) {
    const txid = req.id;
    const funcName = "getTeamsApi";
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
            `Missing account_id`,
            fileName,
            funcName,
            400,
            true
        );
    }

    let [teams, dbErr] = await TeamUtils.getTeams({ accountId }, { txid });
    if (dbErr) {
        logg.info(`ended unsuccessfully`);
        throw dbErr;
    }
    logg.info(`ended`);
    res.json({
        success: true,
        message: `${funcName} executed successfully`,
        txid,
        teams,
    });
}
