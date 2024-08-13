import { functionWrapper } from "../../std/wrappers.js";
import CustomError from "../../std/custom.error.js";
import { logger } from "../../logger.js";
import { HubspotOauth } from "../../models/integration/hubspot.oauth.model.js";
import axios from "axios";
import qs from "qs";
import { IntegrationActivityTypes } from "../../config/crm/integration.config.js";

const fileName = "HubSpot Utils";

async function _exchangeCodeForTokens({ oauthCode }, { logg, txid, funcName }) {
    const CLIENT_ID = process.env.HUBSPOT_CLIENT_ID;
    const CLIENT_SECRET = process.env.HUBSPOT_CLIENT_SECRET;
    let REDIRECT_URI =
        process.env.SERVER_URL_PATH + process.env.HUBSPOT_REDIRECT_URI;

    let formData = qs.stringify({
        code: oauthCode,
        client_secret: CLIENT_SECRET,
        grant_type: "authorization_code",
        client_id: CLIENT_ID,
        redirect_uri: REDIRECT_URI,
    });
    let url = process.env.HUBSPOT_TOKEN_URL;
    let headers = {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
    };
    let hsResp = await axios.post(url, formData, headers);
    let tokens = hsResp.data;
    logg.info(`hs-auth-resp: ${JSON.stringify(tokens)}`);
    if (!tokens.expiry_date && tokens.expires_in) {
        let expiresInSeconds = Number(tokens.expires_in);
        let expiryDate = new Date().getTime();
        // decrease by 10 seconds to be on the safe side
        expiryDate = expiryDate + (expiresInSeconds - 10) * 1000;
        tokens.expiry_date = expiryDate;
        logg.info(`Manually set expiry_date: ${tokens.expiry_date}`);
    }
    logg.info(`ended`);
    return [tokens, null];
}

export const exchangeCodeForTokens = functionWrapper(
    fileName,
    "hs-exchangeCodeForTokens",
    _exchangeCodeForTokens
);

async function _getUserInfo({ accessToken }, { logg, txid, funcName }) {
    logg.info(`started`);
    let url = process.env.HUBSPOT_USER_INFO_URL;
    // if it doesnt end with a slash, add it
    if (url[url.length - 1] !== "/") url = url + "/";
    url = url + accessToken;
    let result = await axios.get(url);
    logg.info(`result: ${JSON.stringify(result.data)}`);
    logg.info(`ended`);
    return [result.data, null];
}

export const getUserInfo = functionWrapper(
    fileName,
    "hs-getUserInfo",
    _getUserInfo
);

async function _saveAuth(
    { tokens, userInfo, state, oauthCode },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    let authObj = {
        state,
        email: userInfo.user,
        hub_domain: userInfo.hub_domain,
        provided_scopes: userInfo.scopes,
        hub_id: userInfo.hub_id,
        app_id: userInfo.app_id,
        hubspot_user_id: userInfo.user_id,
        token_type: userInfo.token_type,
        code: oauthCode,
        scope: tokens.scope,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry: tokens.expiry_date,
    };

    logg.info(`authObj: ${JSON.stringify(authObj)}`);
    let savedDoc = await new HubspotOauth(authObj).save();
    logg.info(`savedDoc: ${JSON.stringify(savedDoc)}`);
    logg.info(`ended`);
    return [savedDoc, null];
}

export const saveAuth = functionWrapper(fileName, "hs-saveAuth", _saveAuth);

async function _connectAuthToAccount(
    { state, accountId, userId },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    // get auth doc by state
    let queryObj = { state };
    let authDoc = await HubspotOauth.findOne(queryObj).lean();
    logg.info(`authDoc: ${JSON.stringify(authDoc)}`);
    if (!authDoc) throw `authDoc not found. So failed to connect`;
    // if is_connected_to_account is true, throw error
    if (authDoc.is_connected_to_account)
        throw `authDoc is already connected to an account`;
    // update is_connected_to_account to true and account to accountId
    let updateObj = {
        is_connected_to_account: true,
        account: accountId,
    };
    if (userId) updateObj.user = userId;
    let options = { new: true };
    let updatedDoc = await HubspotOauth.findOneAndUpdate(
        queryObj,
        updateObj,
        options
    ).lean();
    logg.info(`updatedDoc: ${JSON.stringify(updatedDoc)}`);
    logg.info(`ended`);
    return [updatedDoc, null];
}

export const connectAuthToAccount = functionWrapper(
    fileName,
    "hs-connectAuthToAccount",
    _connectAuthToAccount
);

export async function _isHubSpotConnected(
    { accountId },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    let queryObj = { account: accountId };
    let authDoc = await HubspotOauth.findOne(queryObj).lean();
    logg.info(`authDoc: ${JSON.stringify(authDoc)}`);
    let isConnected = false;
    if (authDoc && authDoc.is_connected_to_account) isConnected = true;
    logg.info(`isConnected: ${isConnected}`);
    logg.info(`ended`);
    return [isConnected, null];
}

export const isHubSpotConnected = functionWrapper(
    fileName,
    "isHubSpotConnected",
    _isHubSpotConnected
);
async function _sequenceStepMessageSend(
    {
        accountId,
        contactDoc,
        messageStatus,
        emailSubject,
        emailBody,
        emailSentTime,
        senderEmail,
    },
    { txid, logg, funcName }
) {
    logg.info(`started`);

    if (!accountId) throw `accountId is required`;
    if (!contactDoc) throw `contactDoc is required`;
    if (!messageStatus) throw `messageStatus is required`;
    if (!emailSubject) throw `emailSubject is required`;
    if (!emailBody) throw `emailBody is required`;
    if (!emailSentTime) throw `emailSentTime is required`;
    if (!senderEmail) throw `senderEmail is required`;

    let [authDoc, hsAuthErr] = await getAuthDetails(
        { accountId, refresh: true },
        { txid }
    );
    if (hsAuthErr) throw hsAuthErr;
    logg.info(`authDoc: ${JSON.stringify(authDoc)}`);
    if (!authDoc) {
        logg.info(`hs-authDoc not found for accountId: ${accountId}`);
        logg.info(`ended`);
        return [true, null];
    }

    let prospectEmail = contactDoc.email;
    if (!prospectEmail) throw `prospectEmail not found`;

    let [senderHSInfo, senderUserIdErr] = await getOwnerDetailsByEmail(
        { email: senderEmail, authDoc },
        { txid }
    );
    if (senderUserIdErr) throw senderUserIdErr;

    let senderUserId = senderHSInfo && senderHSInfo.id ? senderHSInfo.id : null;

    let [contactResp, contactIdErr] = await createOrUpdateContactFromContactDoc(
        { contactDoc, authDoc, senderUserId },
        { txid }
    );
    if (contactIdErr) throw contactIdErr;
    if (!contactResp) throw `contactResp not found`;

    let { contactId, isNewLead } = contactResp;

    let emailActivityId = null;

    if (messageStatus && messageStatus !== "skipped") {
        let [createEmailResp, createEmailErr] = await createEmailActivity(
            {
                contactId,
                contactEmail: prospectEmail,
                contactFirstName: contactDoc.first_name,
                contactLastName: contactDoc.last_name,
                emailSubject,
                emailBody,
                emailSentTime,
                senderEmail,
                authDoc,
                senderUserId,
                emailStatus: messageStatus.toUpperCase(),
            },
            { txid }
        );
        if (createEmailErr) throw createEmailErr;

        emailActivityId = createEmailResp && createEmailResp.id;

        logg.info(`emailActivityId: ${emailActivityId}`);
    } else if (messageStatus === "skipped") {
        logg.info(`messageStatus is skipped. So not creating email activity`);
    }

    let hsActivities = createActivitiesArray(
        {
            type: "sequence_step_message_send",
            data: { emailActivityId, contactId, isNewLead },
        },
        { txid }
    );

    logg.info(`ended`);
    return [hsActivities, null];
}

export const sequenceStepMessageSend = functionWrapper(
    fileName,
    "hs-sequenceStepMessageSend",
    _sequenceStepMessageSend
);

async function _getAuthDetails(
    { accountId, refresh },
    { txid, funcName, logg }
) {
    logg.info(`started`);
    if (!accountId) throw `accountId is required`;
    let queryObj = { account: accountId };
    let authDoc = await HubspotOauth.findOne(queryObj).sort("-expiry").lean();
    if (!authDoc) return [null, null];
    if (refresh) {
        let [refreshedDoc, refreshErr] = await refreshAccessToken(
            { authDoc },
            { txid }
        );
        if (refreshErr) throw refreshErr;
        if (!refreshedDoc) throw `hs-refreshedDoc not found`;
        authDoc = refreshedDoc;
    }

    logg.info(`ended`);
    return [authDoc, null];
}

export const getAuthDetails = functionWrapper(
    fileName,
    "hs-getAuthDetails",
    _getAuthDetails
);

async function _refreshAccessToken(
    { authDoc, expireWithinMinutes = 2 },
    { txid, funcName, logg }
) {
    // logg.info(`started`);
    if (!authDoc) throw `authDoc is required`;

    let expiry = authDoc.expiry;
    if (!expiry) throw `expiry not found in authDoc`;
    expiry = Number(expiry);
    let checkingTime = new Date().getTime() + expireWithinMinutes * 60 * 1000;
    if (expiry > checkingTime) {
        logg.info(`expiry is not near. No need to refresh`);
        // logg.info(`ended`);
        return [authDoc, null];
    }

    let refreshToken = authDoc.refresh_token;
    if (!refreshToken) throw `refreshToken not found in authDoc`;

    let url = process.env.HUBSPOT_TOKEN_URL;
    const CLIENT_ID = process.env.HUBSPOT_CLIENT_ID;
    const CLIENT_SECRET = process.env.HUBSPOT_CLIENT_SECRET;
    let data = qs.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
    });
    let headers = {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
    };
    let resp = await axios.post(url, data, headers);
    let result = resp.data;
    logg.info(`result: ${JSON.stringify(result)}`);
    let newExpiry = new Date().getTime() + (result.expires_in - 60) * 1000;
    let newAccessToken = result.access_token;
    let queryObj = { _id: authDoc._id };
    let updateObj = {
        expiry: newExpiry,
        access_token: newAccessToken,
    };
    let updatedDoc = await HubspotOauth.findOneAndUpdate(queryObj, updateObj, {
        new: true,
    }).lean();
    if (!updatedDoc)
        throw `updatedDoc not found. so failed to update hs- expiry and access_token`;
    authDoc.expiry = newExpiry;
    authDoc.access_token = newAccessToken;
    logg.info(`updatedDoc: ${JSON.stringify(updatedDoc)}`);
    // logg.info(`ended`);
    return [updatedDoc, null];
}

export const refreshAccessToken = functionWrapper(
    fileName,
    "hs-refreshAccessToken",
    _refreshAccessToken
);

async function _getOwnerDetailsByEmail(
    { email, authDoc },
    { txid, funcName, logg }
) {
    logg.info(`started`);
    if (!email || !email.trim()) throw `email is required`;
    if (!authDoc) throw `authDoc is required`;

    let [refreshedDoc, refreshErr] = await refreshAccessToken(
        { authDoc },
        { txid }
    );
    if (refreshErr) throw refreshErr;
    let accessToken =
        refreshedDoc && refreshedDoc.access_token
            ? refreshedDoc.access_token
            : null;
    if (!accessToken) throw `hs-accessToken not found`;

    email = email.trim().toLowerCase();

    let url = `https://api.hubspot.com/crm/v3/owners/?email=${email}`;
    let headers = {
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
        },
    };
    let resp = await axios.get(url, headers);
    let result = resp.data;
    logg.info(`result: ${JSON.stringify(result)}`);
    let ownersArray = result && result.results ? result.results : [];
    let ownerDetails = null;
    if (ownersArray.length) {
        for (let i = 0; i < ownersArray.length; i++) {
            let owner = ownersArray[i];
            let currOwnerEmail =
                owner && owner.email ? owner.email.trim().toLowerCase() : null;
            if (currOwnerEmail === email) {
                logg.info(`found owner details`);
                ownerDetails = owner;
                break;
            }
        }
    }
    logg.info(`ended`);
    return [ownerDetails, null];
}

export const getOwnerDetailsByEmail = functionWrapper(
    fileName,
    "hs-getOwnerDetailsByEmail",
    _getOwnerDetailsByEmail
);

async function _createOrUpdateContactFromContactDoc(
    { contactDoc, authDoc, senderUserId },
    { txid, funcName, logg }
) {
    logg.info(`started`);

    if (!contactDoc) throw `contactDoc is required`;
    if (!authDoc) throw `authDoc is required`;

    let prospectEmail = contactDoc.email;
    if (!prospectEmail) throw `prospectEmail not found`;

    let [existingContactDetails, getContactErr] =
        await getContactDetailsByEmail(
            { email: prospectEmail, authDoc },
            { txid }
        );
    if (getContactErr) throw getContactErr;

    let hsProps = {};

    if (contactDoc.first_name && contactDoc.first_name.trim())
        hsProps["firstname"] = contactDoc.first_name.trim();
    if (contactDoc.last_name && contactDoc.last_name.trim())
        hsProps["lastname"] = contactDoc.last_name.trim();
    if (contactDoc.name && contactDoc.name.trim()) {
        let nameArray = contactDoc.name.trim().split(" ");
        if (nameArray.length) {
            hsProps["firstname"] = nameArray[0];
            if (nameArray.length > 1)
                hsProps["lastname"] = nameArray.slice(1).join(" ");
        }
    }
    if (contactDoc.phone_number && contactDoc.phone_number.trim())
        hsProps["phone"] = contactDoc.phone_number.trim();
    if (contactDoc.company_name && contactDoc.company_name.trim())
        hsProps["company"] = contactDoc.company_name.trim();
    if (contactDoc.company_url && contactDoc.company_url.trim())
        hsProps["website"] = contactDoc.company_url.trim();

    if (senderUserId) hsProps["hubspot_owner_id"] = senderUserId;

    let contactId = null;
    let isNewLead = true;

    if (existingContactDetails && existingContactDetails.id) {
        contactId = existingContactDetails.id;
        isNewLead = false;
        let [updateResp, saveContactErr] = await updateContact(
            { contactId, hsProps, authDoc },
            { txid }
        );
        if (saveContactErr) throw saveContactErr;
    } else {
        let [hsContactId, saveContactErr] = await createContact(
            { contactEmail: prospectEmail, hsProps, authDoc },
            { txid }
        );
        if (saveContactErr) throw saveContactErr;
        contactId = hsContactId;
    }

    if (!contactId) throw `contactId not found`;

    let result = { contactId, isNewLead };

    logg.info(`ended`);
    return [result, null];
}

const createOrUpdateContactFromContactDoc = functionWrapper(
    fileName,
    "hs-createOrUpdateContactFromContactDoc",
    _createOrUpdateContactFromContactDoc
);

async function _getContactDetailsByEmail(
    { email, authDoc },
    { txid, funcName, logg }
) {
    logg.info(`started`);
    if (!email || !email.trim()) throw `email is required`;
    if (!authDoc) throw `authDoc is required`;

    let [refreshedDoc, refreshErr] = await refreshAccessToken(
        { authDoc },
        { txid }
    );
    if (refreshErr) throw refreshErr;
    let accessToken =
        refreshedDoc && refreshedDoc.access_token
            ? refreshedDoc.access_token
            : null;
    if (!accessToken) throw `hs-accessToken not found`;
    email = email.trim().toLowerCase();

    let url = `https://api.hubapi.com/crm/v3/objects/contacts/${email}?idProperty=email&properties=hubspot_owner_id,associatedCompanyId,hubspot_owner_id,associatedCompanyId,hs_latest_source,hs_latest_source_data_1,hs_latest_source_data_2,hs_analytics_source,hs_analytics_source_data_1,hs_analytics_source_data_2,utm_campaign,utm_source,utm_medium,utm_term,utm_content,hs_analytics_last_url,firstname,lastname,phone,jobtitle,city,country`;
    let headers = {
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
        },
    };
    let result = null;
    logg.info(`url: ${url}`);
    try {
        let resp = await axios.get(url, headers);
        result = resp.data;
        logg.info(`result: ${JSON.stringify(result)}`);
    } catch (err) {
        if (err && err.response && err.response.status === 404) {
            logg.info(`contact not found`);
        } else {
            throw err;
        }
    }
    logg.info(`ended`);
    return [result, null];
}

export const getContactDetailsByEmail = functionWrapper(
    fileName,
    "hs-getContactDetailsByEmail",
    _getContactDetailsByEmail
);

async function _createContact(
    { contactEmail, hsProps, authDoc },
    { txid, funcName, logg }
) {
    logg.info(`started`);
    if (!contactEmail || !contactEmail.trim()) throw `contactEmail is required`;
    if (!authDoc) throw `authDoc is required`;

    let [refreshedDoc, refreshErr] = await refreshAccessToken(
        { authDoc },
        { txid }
    );
    if (refreshErr) throw refreshErr;
    let accessToken =
        refreshedDoc && refreshedDoc.access_token
            ? refreshedDoc.access_token
            : null;
    if (!accessToken) throw `hs-accessToken not found`;
    contactEmail = contactEmail.trim().toLowerCase();
    if (!hsProps) hsProps = {};
    let url = `https://api.hubapi.com/crm/v3/objects/contacts`;
    hsProps["email"] = contactEmail;

    let data = { properties: hsProps };

    let headers = {
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
        },
    };

    logg.info(`data: ${JSON.stringify(data)}`);
    let resp = await axios.post(url, data, headers);
    let result = resp.data;
    logg.info(`result: ${JSON.stringify(result)}`);
    let contactId = result && result.id ? result.id : null;
    return [contactId, null];
}

export const createContact = functionWrapper(
    fileName,
    "hs-createContact",
    _createContact
);

async function _updateContact(
    { contactId, hsProps, authDoc },
    { txid, funcName, logg }
) {
    logg.info(`started`);
    if (!contactId) throw `contactId is required`;
    if (!authDoc) throw `authDoc is required`;

    let [refreshedDoc, refreshErr] = await refreshAccessToken(
        { authDoc },
        { txid }
    );
    if (refreshErr) throw refreshErr;
    let accessToken =
        refreshedDoc && refreshedDoc.access_token
            ? refreshedDoc.access_token
            : null;
    if (!accessToken) throw `hs-accessToken not found`;
    if (!hsProps) hsProps = {};
    let url = `https://api.hubapi.com/crm/v3/objects/contacts/${contactId}`;
    let data = { properties: hsProps };

    let headers = {
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
        },
    };

    logg.info(`data: ${JSON.stringify(data)}`);
    let resp = await axios.patch(url, data, headers);
    let result = resp.data;
    logg.info(`result: ${JSON.stringify(result)}`);
    return [true, null];
}

export const updateContact = functionWrapper(
    fileName,
    "hs-updateContact",
    _updateContact
);

/*
 * Hubspot API Doc Reference: https://developers.hubspot.com/docs/api/crm/email
 */
async function _createEmailActivity(
    {
        contactId,
        contactEmail,
        contactFirstName,
        contactLastName,
        emailSubject,
        emailBody,
        emailSentTime,
        senderEmail,
        authDoc,
        senderUserId,
        emailStatus, // BOUNCED, FAILED, SCHEDULED, SENDING, or SENT.
        emailDirection = "email", // email or incoming or forwarded
    },
    { txid, funcName, logg }
) {
    logg.info(`started`);
    if (!authDoc) throw `authDoc is required`;

    let [refreshedDoc, refreshErr] = await refreshAccessToken(
        { authDoc },
        { txid }
    );
    if (refreshErr) throw refreshErr;
    let accessToken =
        refreshedDoc && refreshedDoc.access_token
            ? refreshedDoc.access_token
            : null;
    if (!accessToken) throw `hs-accessToken not found`;

    let url = `https://api.hubapi.com/crm/v3/objects/emails`;

    let props = {
        hs_timestamp: new Date().getTime(),
        hs_email_status: emailStatus,
        hs_email_subject: emailSubject,
        hs_email_text: emailBody,
    };
    if (senderUserId) props["hubspot_owner_id"] = senderUserId;
    if (emailDirection) {
        if (emailDirection === "email") {
            props["hs_email_direction"] = "EMAIL";
        } else if (emailDirection === "incoming") {
            props["hs_email_direction"] = "INCOMING_EMAIL";
        } else if (emailDirection === "forwarded") {
            props["hs_email_direction"] = "FORWARDED_EMAIL";
        }
    }

    let emailHeaders = {};

    /*
        * Sample emailHeaders structure:
    {
        "from": {
            "email": "from@domain.com",
            "firstName": "FromFirst",
            "lastName": "FromLast"
        },
        "to": [
            {
            "email": "ToFirst ToLast<to@test.com>",
            "firstName": "ToFirst",
            "lastName": "ToLast"
            }
        ],
        "cc": [],
        "bcc": []
    }
    */

    if (senderEmail) {
        emailHeaders["from"] = { email: senderEmail };
    }
    if (contactEmail) {
        emailHeaders["to"] = [{ email: contactEmail }];

        if (contactFirstName && contactFirstName.trim()) {
            emailHeaders["to"][0]["firstName"] = contactFirstName.trim();
        }
        if (contactLastName && contactLastName.trim()) {
            emailHeaders["to"][0]["lastName"] = contactLastName.trim();
        }
    }

    if (emailHeaders && Object.keys(emailHeaders).length) {
        // convert "emailHeaders" to JSON escaped string and assign to "hs_email_headers"
        props["hs_email_headers"] = JSON.stringify(emailHeaders);
    }

    let data = {
        properties: props,
    };

    if (contactId) {
        data["associations"] = [
            {
                to: { id: contactId },
                types: [
                    {
                        associationCategory: "HUBSPOT_DEFINED",
                        associationTypeId: 198,
                    },
                ],
            },
        ];
    }

    let headers = {
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
        },
    };

    logg.info(`data: ${JSON.stringify(data)}`);

    let resp = await axios.post(url, data, headers);
    let result = resp.data;

    logg.info(`result: ${JSON.stringify(result)}`);

    /*
        * Sample response structure:
    {
        "createdAt": "2024-06-04T07:57:02.349Z",
        "archived": false,
        "archivedAt": "2024-06-04T07:57:02.349Z",
        "propertiesWithHistory": {
            "additionalProp1": [
            {
                "sourceId": "string",
                "sourceType": "string",
                "sourceLabel": "string",
                "updatedByUserId": 0,
                "value": "string",
                "timestamp": "2024-06-04T07:57:02.349Z"
            }
            ],
            "additionalProp2": [
            {
                "sourceId": "string",
                "sourceType": "string",
                "sourceLabel": "string",
                "updatedByUserId": 0,
                "value": "string",
                "timestamp": "2024-06-04T07:57:02.349Z"
            }
            ]
        },
        "id": "512",
        "properties": {
            "property_date": "1572480000000",
            "property_radio": "option_1",
            "property_number": "17",
            "property_string": "value",
            "property_checkbox": "false",
            "property_dropdown": "choice_b",
            "property_multiple_checkboxes": "chocolate;strawberry"
        },
        "updatedAt": "2024-06-04T07:57:02.349Z"
        }
    */

    logg.info(`ended`);
    return [result, null];
}

export const createEmailActivity = functionWrapper(
    fileName,
    "hs-createEmailActivity",
    _createEmailActivity
);

function createActivitiesArray({ type, data }, { txid }) {
    const funcName = "createActivitiesArray";
    const logg = logger.child({ txid, funcName });
    logg.info(`started`);

    let hsActivities = [];
    const crmType = "hubspot";
    if (type === "sequence_step_message_send") {
        let { emailActivityId, contactId, isNewLead } = data;
        if (contactId) {
            let hsActivity = {
                crm_type: crmType,
                type: IntegrationActivityTypes.campaign_sequence_step_message
                    .contact_id,
                value: contactId,
            };
            hsActivities.push(hsActivity);
        }
        if (isNewLead || isNewLead === false) {
            let hsActivity = {
                crm_type: crmType,
                type: IntegrationActivityTypes.campaign_sequence_step_message
                    .is_new_lead,
                value: isNewLead,
            };
            hsActivities.push(hsActivity);
        }
        if (emailActivityId) {
            let hsActivity = {
                crm_type: crmType,
                type: IntegrationActivityTypes.campaign_sequence_step_message
                    .email_activity_id,
                value: emailActivityId,
            };
            hsActivities.push(hsActivity);
        }
    }

    logg.info(`hsActivities: ${JSON.stringify(hsActivities)}`);

    logg.info(`ended`);

    return hsActivities;
}
