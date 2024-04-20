import { User } from "../../models/user/user.model.js";
import { functionWrapper } from "../../std/wrappers.js";

const fileName = "User Utils";

async function _getUserObjByEmail(
    { email, session },
    { logg, txid, funcName }
) {
    logg.info(`started`);
    if (!email) {
        throw `email not found`;
    }
    let userObj = null;
    if (session) {
        userObj = await User.findOne({ email }).session(session).lean();
    } else {
        userObj = await User.findOne({ email }).lean();
    }
    logg.info(`userObj`, userObj);
    logg.info(`ended`);
    return [userObj, null];
}

export const getUserObjByEmail = functionWrapper(
    fileName,
    "getUserObjByEmail",
    _getUserObjByEmail
);

async function _createUser({ data, session }, { logg, txid, funcName }) {
    logg.info(`started`);
    if (!data || !data.email) {
        throw `data or data.email not found: ` + JSON.stringify(data);
    }
    const userObj = new User(data);
    let result = null;
    if (session) {
        result = await userObj.save({ session });
    } else {
        result = await userObj.save();
    }
    logg.info(`user record saved with user id:` + result._id);
    logg.info(`ended`);
    return [result, null];
}

export const createUser = functionWrapper(fileName, "createUser", _createUser);

async function _addNewDeviceToUser(
    { email, device, setLoggedIn, session, auth_account_type },
    { logg, txid, funcName }
) {
    logg.info(`started`);
    if (!email) {
        throw `email not found`;
    }
    if (!device) {
        throw `device not found`;
    }
    const dbOptions = {};
    if (session) {
        dbOptions.session = session;
    }

    let updateObj = { $push: { devices: device } };
    if (setLoggedIn) {
        updateObj.logged_in = true;
    }
    if (auth_account_type) {
        updateObj.auth_account_type = auth_account_type;
    }
    logg.info(`updateObj: ${JSON.stringify(updateObj)}`);
    let result = await User.updateOne({ email }, updateObj, dbOptions);
    logg.info(`ended`);
    return [result, null];
}

export const addNewDeviceToUser = functionWrapper(
    fileName,
    "addNewDeviceToUser",
    _addNewDeviceToUser
);

async function _getUserById({ id }, { logg, txid, funcName }) {
    logg.info(`started`);
    if (!id) {
        throw `user id not found`;
    }
    let userObj = await User.findById(id)
        .select("-devices -google_oauths")
        .lean();
    if (!userObj) {
        throw `user object not found for id: ` + id;
    }
    logg.info(`userObj: ${JSON.stringify(userObj)}`);
    let firstName = userObj.profile_first_name;
    let lastName = userObj.profile_last_name;
    let name = "";
    if (firstName) {
        name = firstName;
    }
    if (lastName) {
        name = name + ` ${lastName}`;
    }
    let result = {
        email: userObj.email,
        name,
        first_name: firstName ? firstName : "",
        last_name: lastName ? lastName : "",
        phone_number: userObj.profile_phone_number
            ? userObj.profile_phone_number
            : "",
        account_type: userObj.auth_account_type || "google",
    };
    logg.info(`ended`);
    return [result, null];
}

export const getUserById = functionWrapper(
    fileName,
    "getUserById",
    _getUserById
);

async function _getUsersInfoByIds({ userIds }, { logg, txid, funcName }) {
    logg.info(`started`);
    if (!userIds || !userIds.length) {
        throw `userIds not found`;
    }
    let users = await User.find({ _id: { $in: userIds } })
        .select("email profile_first_name profile_last_name")
        .lean();
    logg.info(`users:`, users);
    let result = {};
    for (let user of users) {
        let firstName = user.profile_first_name;
        let lastName = user.profile_last_name;
        let name = "";
        if (firstName) {
            name = firstName;
        }
        if (lastName) {
            name = name + ` ${lastName}`;
        }
        let userId = user._id.toString();
        result[userId] = {
            email: user.email,
            name,
            first_name: firstName ? firstName : "",
            last_name: lastName ? lastName : "",
        };
    }
    logg.info(`ended`);
    return [result, null];
}

export const getUsersInfoByIds = functionWrapper(
    fileName,
    "getUsersInfoByIds",
    _getUsersInfoByIds
);

async function _getUserInfoByEmails({ emails }, { txid, logg, funcName }) {
    logg.info(`started`);
    if (!emails || !emails.length) {
        throw `emails not found`;
    }
    let users = await User.find({ email: { $in: emails } }).lean();
    logg.info(`users:` + JSON.stringify(users));

    logg.info(`ended`);
    return [users, null];
}

export const getUserInfoByEmails = functionWrapper(
    fileName,
    "getUserInfoByEmails",
    _getUserInfoByEmails
);
