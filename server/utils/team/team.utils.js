import { functionWrapper } from "../../std/wrappers.js";
import CustomError from "../../std/custom.error.js";
import { logger } from "../../logger.js";
import { TeamModel } from "../../models/team/team.model.js";
import { TeamUser } from "../../models/team/team.users.model.js";
import * as UserUtils from "../user/user.utils.js";

const fileName = "Team Utils";

async function _createTeam(
    { name, members, accountId, createdByUserId },
    { logg, txid, funcName }
) {
    logg.info(`started`);
    const team = new TeamModel({
        name,
        account: accountId,
        created_by: createdByUserId,
    });
    const savedTeam = await team.save();
    const teamUsers = [];
    for (let i = 0; i < members.length; i++) {
        const member = members[i];
        const memberUserId = member.user_id;
        const memberRole = member.role;
        const mObserver = member.observer;
        const teamUser = new TeamUser({
            team: savedTeam._id,
            account: accountId,
            user: memberUserId,
            role: memberRole,
            observer: mObserver,
        });
        await teamUser.save();
        teamUsers.push(teamUser);
    }
    logg.info(`ended`);
    return [{ team: savedTeam, teamUsers }, null];
}

export const createTeam = functionWrapper(fileName, "createTeam", _createTeam);

async function _updateTeam(
    { name, members, teamId, accountId },
    { logg, txid, funcName }
) {
    logg.info(`started`);
    const team = await TeamModel.findOne({
        _id: teamId,
        account: accountId,
    }).lean();
    if (!team) {
        throw `Team not found with id: ${teamId}`;
    }

    let updateObj = {};
    if (name) {
        updateObj.name = name;
    }
    logg.info("team updateObj:" + JSON.stringify(updateObj));
    if (updateObj !== JSON.stringify("{}")) {
        let updateResult = await TeamModel.updateOne(
            { _id: teamId, account: accountId },
            updateObj
        );
        logg.info("team updateResult:" + JSON.stringify(updateResult));
    }

    const oldMembers = await TeamUser.find({
        team: teamId,
        account: accountId,
    }).lean();
    const memberIdsToBeRemoved = [];
    const membersToBeAdded = [];
    const membersToBeUpdated = [];
    for (let i = 0; i < members.length; i++) {
        const member = members[i];
        const memberUserId = member.user_id;
        const memberRole = member.role;
        const mObserver = member.observer;
        const oldMember = oldMembers.find(
            (m) => m.user.toString() === memberUserId.toString()
        );
        if (!oldMember) {
            membersToBeAdded.push({
                team: teamId,
                user: memberUserId,
                role: memberRole,
                observer: mObserver,
                account: accountId,
            });
        } else {
            membersToBeUpdated.push({
                _id: oldMember._id,
                role: memberRole,
                observer: mObserver,
            });
        }
    }
    for (let i = 0; i < oldMembers.length; i++) {
        const oldMember = oldMembers[i];
        const memberUserId = oldMember.user.toString();
        const member = members.find(
            (m) => m.user_id.toString() === memberUserId.toString()
        );
        if (!member) {
            memberIdsToBeRemoved.push(oldMember._id);
        }
    }

    logg.info("memberIdsToBeRemoved:" + JSON.stringify(memberIdsToBeRemoved));
    logg.info("membersToBeAdded:" + JSON.stringify(membersToBeAdded));
    logg.info("membersToBeUpdated:" + JSON.stringify(membersToBeUpdated));

    if (memberIdsToBeRemoved.length > 0) {
        await TeamUser.deleteMany({
            _id: { $in: memberIdsToBeRemoved },
            team: teamId,
            account: accountId,
        });
    }

    if (membersToBeAdded.length > 0) {
        let insertResp = await TeamUser.insertMany(membersToBeAdded);
    }

    if (membersToBeUpdated.length > 0) {
        for (let i = 0; i < membersToBeUpdated.length; i++) {
            const member = membersToBeUpdated[i];
            let updateResult = await TeamUser.updateOne(
                { _id: member._id },
                {
                    role: member.role,
                    observer: member.observer,
                }
            );
        }
    }

    logg.info(`ended`);
    return [true, null];
}

export const updateTeam = functionWrapper(fileName, "updateTeam", _updateTeam);

async function _deleteTeam({ teamId, accountId }, { logg, txid, funcName }) {
    logg.info(`started`);
    /*
    if team doesnt exist return error
    if team exists, first delete all team members
    then delete team
    */

    const team = await TeamModel.findOne({
        _id: teamId,
        account: accountId,
    }).lean();
    if (!team) {
        throw `Team not found with id: ${teamId}`;
    }

    const deleteResp = await TeamUser.deleteMany({
        team: teamId,
        account: accountId,
    });
    // log deleteresp
    logg.info("deleteResp:", deleteResp);

    const deletedTeam = await TeamModel.findOneAndDelete({
        _id: teamId,
        account: accountId,
    }).lean();
    // log deletedTeam
    logg.info("deletedTeam:", deletedTeam);
    logg.info(`ended`);
    return [deletedTeam, null];
}

export const deleteTeam = functionWrapper(fileName, "deleteTeam", _deleteTeam);

async function _getTeamMembers(
    { teamId, accountId },
    { logg, txid, funcName }
) {
    logg.info(`started`);

    let teamUsers = await TeamUser.find({
        team: teamId,
        account: accountId,
    })
        .populate("user")
        .select("-user.devices -user.google_oauths")
        .lean();

    logg.info("teamUsers:" + JSON.stringify(teamUsers));
    teamUsers = teamUsers.map((tu) => {
        let userName = "";
        if (tu.user.profile_first_name) {
            userName = tu.user.profile_first_name;
        }
        if (tu.user.profile_last_name) {
            if (userName) userName += " ";
            userName += tu.user.profile_last_name;
        }
        return {
            user_id: tu.user._id,
            name: userName,
            email: tu.user.email,
            role: tu.role,
            observer: tu.observer,
        };
    });

    logg.info(`ended`);
    return [teamUsers, null];
}

export const getTeamMembers = functionWrapper(
    fileName,
    "getTeams",
    _getTeamMembers
);

async function _getTeams({ accountId }, { logg, txid, funcName }) {
    logg.info(`started`);
    let teams = await TeamModel.find({
        account: accountId,
    }).lean();
    logg.info("teams:", teams);

    let result = [];
    for (let i = 0; i < teams.length; i++) {
        const team = teams[i];
        let [teamMembers, getMemberErr] = await getTeamMembers(
            { teamId: team._id, accountId },
            { txid }
        );
        if (getMemberErr) {
            logg.info(`ended unsuccessfully`);
            throw getMemberErr;
        }
        result.push({
            team_id: team._id,
            name: team.name,
            members: teamMembers,
        });
    }
    logg.info(`ended`);
    return [result, null];
}

export const getTeams = functionWrapper(fileName, "getTeams", _getTeams);
