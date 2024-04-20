import mongoose from "mongoose";
import { GoogleOauth } from "../../models/auth/google.oauth.model.js";
import { functionWrapper } from "../../std/wrappers.js";
import * as UserDbUtils from "../user/user.utils.js";

const fileName = "Google Auth DB Utils";

const mongoConnection = mongoose.connection;

async function _getGoogleAuthObj({ state }, { logg, txid, funcName }) {
    logg.info(`started`);
    if (!state) {
        throw `state not found`;
    }
    let authObj = await GoogleOauth.findOne({ state }).lean();
    logg.info(`ended`);
    return [authObj, null];
}

export const getGoogleAuthObj = functionWrapper(
    fileName,
    "getGoogleAuthObj",
    _getGoogleAuthObj
);

async function _upsertUser(
    { queryObj, updateObj, options },
    { logg, txid, funcName }
) {
    logg.info(`started`);
    if (!queryObj || JSON.stringify(queryObj) === "{}") {
        throw `queryObj not found or empty`;
    }
    if (!updateObj) {
        throw `updateObj not found`;
    }
    if (!options) {
        throw `options not found`;
    }
    let authObj = await GoogleOauth.findOneAndUpdate(
        queryObj,
        updateObj,
        options
    ).lean();
    logg.info(`ended`);
    return [authObj, null];
}

export const upsertUser = functionWrapper(fileName, "upsertUser", _upsertUser);

async function _createAuth(
    {
        email,
        device_id,
        state,
        id_token,
        scope,
        access_token,
        refresh_token,
        expiry,
        created_on,
        device_type,
        name,
    },
    { logg, txid, funcName }
) {
    logg.info(`started`);
    if (!email) {
        throw `email not found`;
    }
    if (!state) {
        throw `state not found`;
    }
    if (!device_id) {
        throw `device_id not found`;
    }
    if (!id_token) {
        throw `id_token not found`;
    }
    if (!access_token) {
        throw `access_token not found`;
    }
    if (!refresh_token) {
        throw `refresh_token not found`;
    }
    if (!expiry) {
        throw `expiry not found`;
    }

    const session = await mongoConnection.startSession();
    await session.withTransaction(async () => {
        const [existingUser, existingUserErr] =
            await UserDbUtils.getUserObjByEmail({ email, session }, { txid });
        if (existingUserErr) {
            throw existingUserErr;
        }

        let user_id = null;
        if (!existingUser || !existingUser._id) {
            let profile_first_name = name.split(" ")[0];
            let profile_last_name = name.substring(
                profile_first_name.length + 1
            );
            const data = {
                email,
                profile_email: email,
                profile_first_name,
                profile_last_name,
                devices: [
                    {
                        id: device_id,
                        device_type: device_type || "web",
                        token_expiry: null,
                    },
                ],
                logged_in: true,
                auth_account_type: "google",
            };
            logg.info(`\ncreating new user with data`, data);
            const [newUser, newUserErr] = await UserDbUtils.createUser(
                {
                    data,
                    session,
                },
                { txid }
            );
            if (newUserErr) {
                throw newUserErr;
            }
            user_id = newUser._id;
        } else {
            user_id = existingUser._id;
            await UserDbUtils.addNewDeviceToUser(
                {
                    email,
                    device: {
                        id: device_id,
                        device_type: device_type || "web",
                        token_expiry: null,
                    },
                    setLoggedIn: true,
                    session,
                },
                { txid }
            );
        }

        const result = await GoogleOauth.findOneAndUpdate(
            {
                email,
                device_id,
            },
            {
                state,
                id_token,
                scope,
                access_token,
                refresh_token,
                expiry,
                created_on: created_on || new Date(),
                user_id,
                device_type,
                email,
            },
            {
                new: true,
                upsert: true,
                session,
            }
        );
    });
    logg.info(`ended`);
    return [true, null];
}

export const createAuth = functionWrapper(fileName, "createAuth", _createAuth);
