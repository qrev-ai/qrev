import momenttz from "moment-timezone";
import { v4 as uuidv4 } from "uuid";
import { functionWrapper } from "../../std/wrappers.js";
import CustomError from "../../std/custom.error.js";
import { logger } from "../../logger.js";
import { reportErrorToQRevTeam } from "../../std/report.error.js";
import * as GoogleUtils from "../google/google.auth.utils.js";
import * as UserUtils from "../user/user.utils.js";
import { SequenceModel } from "../../models/campaign/sequence.model.js";
import { SequenceStep } from "../../models/campaign/sequence.step.model.js";
import { IntermediateProspectData } from "../../models/campaign/intermediate.prospect.data.model.js";
import { SequenceProspect } from "../../models/campaign/sequence.prospect.model.js";
import * as CrmContactUtils from "../crm/contact.utils.js";
import * as SlotGen_utils from "../slot/open_link_free_slots.js";
import { SequenceProspectMessageSchedule } from "../../models/campaign/sequence.prospect.message_schedule.model.js";
import { CampaignConfig } from "../../models/campaign/campaign.config.model.js";
import * as AnalyticUtils from "../analytic/analytic.utils.js";
import * as ProspectVerifyUtils from "../prospect_verify/prospect.verify.utils.js";
import * as IntegrationUtils from "../integration/integration.utils.js";
import { CampaignEmailUnsubscribeList } from "../../models/campaign/campaign.unsubscribe.list.model.js";
import * as FileUtils from "../std/file.utils.js";
import { IntermediateProspectMessage } from "../../models/campaign/intermediate.prospect.message.model.js";
import { CampaignDefaults } from "../../config/campaign/campaign.config.js";
import * as S3Utils from "../aws/aws.s3.utils.js";
import path from "path";

const fileName = "Campaign Utils";

async function _updateSequenceMessages(
    { sequenceId },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    if (!sequenceId) throw `sequenceId is invalid`;

    let sequenceSteps = await SequenceStep.find({ sequence: sequenceId });
    logg.info(`sequenceSteps: ${JSON.stringify(sequenceSteps)}`);
    if (!sequenceSteps || !sequenceSteps.length) {
        throw `sequenceSteps is empty for sequenceId: ${sequenceId}`;
    }

    let sequenceStepIds = sequenceSteps.map((x) => x._id);
    let sequenceStepId = sequenceStepIds[0].toString();

    let queryObj = { sequence_id: sequenceId };
    let intermediateProspects = await IntermediateProspectData.find(queryObj);

    let prospectEmails = intermediateProspects.map((x) => x.prospect_email);

    let seqProspectDocs = await SequenceProspect.find({
        sequence: sequenceId,
        prospect_email: { $in: prospectEmails },
    })
        .select("_id prospect_email")
        .lean();

    let seqProspectIdMap = {};
    for (let i = 0; i < seqProspectDocs.length; i++) {
        let seqProspectId = seqProspectDocs[i]._id;
        let seqProspectEmail = seqProspectDocs[i].prospect_email;
        seqProspectIdMap[seqProspectEmail] = seqProspectId;
    }

    let updateData = intermediateProspects.map((x) => {
        let { prospect_email, message_subject, message_body } = x;
        let seqProspectId = seqProspectIdMap[prospect_email];
        return {
            updateOne: {
                filter: {
                    sequence: sequenceId,
                    sequence_step: sequenceStepId,
                    sequence_prospect: seqProspectId,
                },
                update: {
                    message_subject,
                    message_body,
                    is_message_generation_complete: true,
                },
            },
        };
    });

    logg.info(`updateData: ${JSON.stringify(updateData)}`);
    let bulkWriteResp = await SequenceProspectMessageSchedule.bulkWrite(
        updateData
    );

    let seqStepUpdateResp = await SequenceStep.updateOne(
        { _id: sequenceStepId },
        { is_prospects_generation_completed: true }
    );

    logg.info(`bulkWriteResp: ${JSON.stringify(bulkWriteResp)}`);
    logg.info(`seqStepUpdateResp: ${JSON.stringify(seqStepUpdateResp)}`);

    logg.info(`ended`);
    return [bulkWriteResp, null];
}

export const updateSequenceMessages = functionWrapper(
    fileName,
    "updateSequenceMessages",
    _updateSequenceMessages
);

async function _setupCampaignFromQai(
    {
        sequenceDetails,
        accountId,
        userId,
        userQuery,
        conversationId,
        uploadedData,
    },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    if (!sequenceDetails) throw `sequenceDetails is invalid`;
    if (!accountId) throw `accountId is invalid`;
    if (!userId) throw `userId is invalid`;

    let campaignSequenceId = sequenceDetails.id;
    if (!campaignSequenceId) throw `campaignSequenceId is invalid`;
    let sequenceName = sequenceDetails.name || `QAi: ${userQuery}`;

    let [sequenceDoc, sequenceDocErr] = await createCampaignSequence(
        {
            campaignSequenceId,
            accountId,
            userId,
            name: sequenceName,
            conversationId,
            uploadedData,
        },
        { txid }
    );
    if (sequenceDocErr) throw sequenceDocErr;

    let stepsInfo = sequenceDetails.steps;
    if (!stepsInfo || !stepsInfo.length) {
        throw `stepsInfo is invalid or empty for campaignSequenceId: ${campaignSequenceId}`;
    }

    let [sequenceStepDocs, sequenceStepDocErr] =
        await createCampaignSequenceStepsFromQAi(
            { campaignSequenceId, accountId, userId, stepsInfo },
            { txid }
        );
    if (sequenceStepDocErr) throw sequenceStepDocErr;
    if (!sequenceStepDocs || !sequenceStepDocs.length) {
        throw `sequenceStepDocs is empty for campaignSequenceId: ${campaignSequenceId}`;
    }

    logg.info(`ended`);
    return [{ sequenceDoc, sequenceStepDocs }, null];
}

export const setupCampaignFromQai = functionWrapper(
    fileName,
    "setupCampaignFromQai",
    _setupCampaignFromQai
);

async function _createCampaignSequence(
    {
        campaignSequenceId,
        accountId,
        userId,
        name,
        conversationId,
        uploadedData,
    },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    if (!accountId) throw `accountId is invalid`;
    if (!userId) throw `userId is invalid`;
    if (!campaignSequenceId) {
        throw `campaignSequenceId is invalid`;
    }
    if (!name) {
        logg.info(`since name is empty, setting default name`);
        name = `Campaign Sequence: ${campaignSequenceId}`;
    }

    let obj = {
        _id: campaignSequenceId,
        name,
        account: accountId,
        created_by: userId,
        status: "created",
    };
    if (uploadedData && uploadedData.file_name) {
        obj.uploaded_file_name = uploadedData.file_name;
    }
    if (conversationId) obj.conversation = conversationId;

    let sequenceDocResp = await SequenceModel.insertMany([obj]);
    let sequenceDoc = sequenceDocResp && sequenceDocResp[0];
    logg.info(`sequenceDoc: ${JSON.stringify(sequenceDoc)}`);

    logg.info(`ended`);
    return [sequenceDoc, null];
}

const createCampaignSequence = functionWrapper(
    fileName,
    "createCampaignSequence",
    _createCampaignSequence
);

async function _createCampaignSequenceStepsFromQAi(
    { campaignSequenceId, accountId, userId, stepsInfo },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    if (!campaignSequenceId) throw `campaignSequenceId is invalid`;
    if (!accountId) throw `accountId is invalid`;
    if (!userId) throw `userId is invalid`;
    if (!stepsInfo || !stepsInfo.length) {
        throw `stepsInfo is invalid or empty for campaignSequenceId: ${campaignSequenceId}`;
    }

    /*
    * stepsInfo structure: 
    [
        {
            "id": "6a130fe1-a43c-4703-ab53-058330600738",
            "type": "ai_generated_email",
            "time_of_dispatch": {
                "time_value": 1,
                "time_unit": "day"
            }
        },
        {
            "id": "df83d08e-4441-4bf5-a20c-ced9ed952bf9",
            "type": "ai_generated_email",
            "time_of_dispatch": {
                "time_value": 3,
                "time_unit": "day"
            }
        }
    ]
    */

    let sequenceStepDocs = [];
    for (let i = 0; i < stepsInfo.length; i++) {
        let stepInfo = stepsInfo[i];
        let sequenceStepId = stepInfo.id;
        if (!sequenceStepId) throw `sequenceStepId is invalid for index: ${i}`;

        let seqStepTimeOfDispatch = stepInfo.time_of_dispatch;
        if (!seqStepTimeOfDispatch) {
            throw `seqStepTimeOfDispatch is invalid for sequenceStepId: ${sequenceStepId}`;
        }

        let obj = {
            _id: sequenceStepId,
            sequence: campaignSequenceId,
            account: accountId,
            created_by: userId,
            // type: "email",
            subject: "",
            body: "",
            // draft_type: "ai_generated",
            time_of_dispatch: {
                type: "from_prospect_added_time",
                value: seqStepTimeOfDispatch,
            },
            active: true,
            order: i + 1,
        };

        if (stepInfo.type === "ai_generated_email") {
            obj.type = "email";
            obj.draft_type = "ai_generated";
        } else {
            throw `stepInfo.type is invalid for sequenceStepId: ${sequenceStepId}`;
        }

        sequenceStepDocs.push(obj);
    }

    let sequenceStepDocsResp = await SequenceStep.insertMany(sequenceStepDocs);
    logg.info(`sequenceStepDocsResp: ${JSON.stringify(sequenceStepDocsResp)}`);
    logg.info(`ended`);
    return [sequenceStepDocsResp, null];
}

const createCampaignSequenceStepsFromQAi = functionWrapper(
    fileName,
    "createCampaignSequenceStepsFromQAi",
    _createCampaignSequenceStepsFromQAi
);

async function _createCampaignSequenceProspectsFromQAi(
    { campaignSequenceId, accountId, userId, conversationId, uploadedData },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    if (!campaignSequenceId) throw `campaignSequenceId is invalid`;
    if (!accountId) throw `accountId is invalid`;
    if (!userId) throw `userId is invalid`;

    let intermediateDataQuery = { sequence_id: campaignSequenceId };
    let prospects = await IntermediateProspectData.find(
        intermediateDataQuery
    ).lean();
    let prospectsCount = prospects.length;
    logg.info(`prospectsCount: ${prospectsCount}`);
    if (!prospectsCount) {
        logg.error(
            `prospectsCount is 0 for campaignSequenceId: ${campaignSequenceId}`
        );
        throw `prospectsCount is 0 for campaignSequenceId: ${campaignSequenceId}`;
    }

    /*
     * Added below code on 8th May 2024
     * This code is added to verify the prospect emails using third party service like "zerobounce"
     * This is to ensure that the emails are valid and deliverable
     * We need this because we cannot try to send email and then check if it bounced. This will affect the QRev user's email reputation
     */
    let verifyProspectService = process.env.VERIFY_PROSPECT_EMAIL_BY_SERVICE;
    if (verifyProspectService && verifyProspectService !== "none") {
        let [pvResult, verifyErr] =
            await ProspectVerifyUtils.verifyProspectsEmails(
                {
                    prospects,
                    serviceName: verifyProspectService,
                    campaignSequenceId,
                    accountId,
                },
                { txid }
            );
        if (verifyErr) throw verifyErr;
        let { resultProspects: verifiedProspects, prospectVerifyFileId } =
            pvResult;
        if (!verifiedProspects || !verifiedProspects.length) {
            throw `verifiedProspects is empty`;
        }
        prospects = verifiedProspects;

        if (prospectVerifyFileId) {
            let sequenceDocUpdateResp = await SequenceModel.updateOne(
                { _id: campaignSequenceId },
                {
                    prospect_verify_data: {
                        file_id: prospectVerifyFileId,
                        status: "async_processing",
                        service_name: verifyProspectService,
                    },
                }
            );
            logg.info(
                `sequenceDocUpdateResp: ${JSON.stringify(
                    sequenceDocUpdateResp
                )}`
            );
        }
    }

    let source = "qai";
    let sourceDrillDown1 =
        uploadedData && uploadedData.values && uploadedData.values.length
            ? "uploaded_data"
            : "enriched_data";
    let sourceDrillDown2 = conversationId || "";

    let uploadedMap = {};
    if (sourceDrillDown1 === "uploaded_data") {
        for (let i = 0; i < uploadedData.values.length; i++) {
            let uploadedProspect = uploadedData.values[i];
            let { email: prospect_email } = uploadedProspect;
            prospect_email = prospect_email.trim().toLowerCase();
            uploadedMap[prospect_email] = uploadedProspect;
        }
    }

    let contacts = prospects.map((x) => {
        let {
            prospect_email: email,
            prospect_name: name,
            prospect_timezone: timezone,
            prospect_phone: phone_number,
        } = x;

        let obj = { email, name, timezone, phone_number };
        if (uploadedMap[email]) {
            obj = { ...obj, ...uploadedMap[email] };
        }
        if (source) obj.latest_source = source;
        if (sourceDrillDown1) obj.latest_source_drill_down_1 = sourceDrillDown1;
        if (sourceDrillDown2) obj.latest_source_drill_down_2 = sourceDrillDown2;
        return obj;
    });

    let [contactDocs, contactDocsErr] = await CrmContactUtils.createContacts(
        { contacts, accountId, userId },
        { txid }
    );
    if (contactDocsErr) throw contactDocsErr;

    // cspDocs: campaign sequence prospects documents
    let cspDocs = contactDocs.map((x) => {
        let contactId = x._id;
        contactId =
            typeof contactId === "object" ? contactId.toString() : contactId;

        let name = x.first_name || "";
        if (x.last_name) name += ` ${x.last_name}`;
        name = name.trim();
        return {
            _id: uuidv4(),
            sequence: campaignSequenceId,
            account: accountId,
            contact: contactId,
            prospect_email: x.email,
            prospect_timezone: x.timezone,
            prospect_name: name,
            prospect_phone: x.phone_number,
            status: "pending",
        };
    });

    let cspDocsResp = await SequenceProspect.insertMany(cspDocs);
    // logg.info(`cspDocsResp: ${JSON.stringify(cspDocsResp)}`);
    logg.info(`ended`);
    return [cspDocsResp, null];
}

const createCampaignSequenceProspectsFromQAi = functionWrapper(
    fileName,
    "createCampaignSequenceProspectsFromQAi",
    _createCampaignSequenceProspectsFromQAi
);

// ! not used anymore
async function _createCampaignSequenceProspectMessagesFromQAi(
    { campaignSequenceId, accountId, sequenceStepId, prospects },
    { txid, logg, funcName }
) {
    /*
        let item = {
            _id: uuidv4(),
            sequence: prospect.sequence,
            account: prospect.account,
            contact: prospect.contact,
            sequence_step: sequenceStepId,
            sequence_prospect: prospect._id,
            sender_email: selectedSender,
            message_scheduled_time: new Date(selectedTime),
            message_status: "pending",
            prospect_timezone: timezone,
        };
    */

    logg.info(`started`);
    if (!campaignSequenceId) throw `campaignSequenceId is invalid`;
    if (!accountId) throw `accountId is invalid`;
    if (!sequenceStepId) throw `sequenceStepId is invalid`;
    if (!prospects || !prospects.length) {
        throw `prospects is empty for campaignSequenceId: ${campaignSequenceId}`;
    }

    let spsmDocs = [];
    for (const prospect of prospects) {
        let item = {
            _id: uuidv4(),
            sequence: campaignSequenceId,
            account: accountId,
            contact: prospect.contact,
            sequence_step: sequenceStepId,
            sequence_prospect: prospect._id,
            // sender_email: "",
            // message_scheduled_time: new Date(),
            message_status: "pending",
            prospect_timezone: prospect.prospect_timezone,
        };
        spsmDocs.push(item);
    }

    let spsmDocsResp = await SequenceProspectMessageSchedule.insertMany(
        spsmDocs
    );
    // logg.info(`spsmDocsResp: ${JSON.stringify(spsmDocsResp)}`);
    logg.info(`ended`);
    return [spsmDocsResp, null];
}

const createCampaignSequenceProspectMessagesFromQAi = functionWrapper(
    fileName,
    "createCampaignSequenceProspectMessagesFromQAi",
    _createCampaignSequenceProspectMessagesFromQAi
);

async function _executeSequenceConfirmation(
    { sequenceId, accountId, userId, userTimezone },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    if (!sequenceId) throw `sequenceId is invalid`;

    let seqQueryObj = { _id: sequenceId, account: accountId };
    let sequenceDoc = await SequenceModel.findOne(seqQueryObj).lean();
    logg.info(`sequenceDoc: ${JSON.stringify(sequenceDoc)}`);

    if (!sequenceDoc)
        throw `sequenceDoc is invalid for sequenceId: ${sequenceId}`;

    let isExecuteSequenceConfirmationFound = checkActivity(
        {
            activities: sequenceDoc.activities,
            type: "execute_sequence_confirmation",
        },
        { txid }
    );

    if (isExecuteSequenceConfirmationFound) {
        logg.info(
            `since execute_sequence_confirmation is found, throwing error`
        );
        throw `sequenceId: ${sequenceId} is already executed`;
    }

    // * Update the sequence with the activity "execute_sequence_confirmation"
    let updateData = {
        $push: {
            activities: {
                type: "execute_sequence_confirmation",
                time: new Date(),
                txid,
            },
        },
        default_timezone: userTimezone,
    };
    sequenceDoc = await SequenceModel.findOneAndUpdate(
        seqQueryObj,
        updateData,
        { new: true }
    );
    logg.info(`updated sequenceDoc: ${JSON.stringify(sequenceDoc)}`);

    let sequenceSteps = await SequenceStep.find({ sequence: sequenceId })
        .sort("order")
        .lean();
    logg.info(`sequenceSteps: ${JSON.stringify(sequenceSteps)}`);
    if (!sequenceSteps || !sequenceSteps.length) {
        throw `sequenceSteps is empty for sequenceId: ${sequenceId}`;
    }

    let [scheduleResp, scheduleErr] =
        await scheduleTimeForSequenceIfNotAlreadyDone(
            {
                sequenceId,
                sequenceDoc,
                accountId,
                userId,
                sequenceSteps,
            },
            { txid }
        );
    if (scheduleErr) throw scheduleErr;

    let [setupWebhookResp, setupWebhookErr] = await setupEmailReplyWebhook(
        { accountId, userId, ignoreIfAlreadyExists: true },
        { txid }
    );
    if (setupWebhookErr) throw setupWebhookErr;

    logg.info(`ended`);
    return [scheduleResp, null];
}

export const executeSequenceConfirmation = functionWrapper(
    fileName,
    "executeSequenceConfirmation",
    _executeSequenceConfirmation
);

// ! not used anymore
async function _scheduleTimeForCampaignProspectsFromQAi(
    {
        campaignSequenceId,
        accountId,
        userId,
        sequenceStepId,
        prospects,
        defaultTimezone,
        campaignConfigDoc,
    },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    if (!campaignSequenceId) throw `campaignSequenceId is invalid`;
    if (!accountId) throw `accountId is invalid`;
    if (!userId) throw `userId is invalid`;
    if (!sequenceStepId) throw `sequenceStepId is invalid`;
    if (!prospects || !prospects.length) {
        logg.info(`ended since prospects is empty`);
        return [true, null];
    }

    if (!campaignConfigDoc) {
        let cConfigQueryObj = { account: accountId };
        campaignConfigDoc = await CampaignConfig.findOne(
            cConfigQueryObj
        ).lean();
        logg.info(`campaignConfigDoc: ${JSON.stringify(campaignConfigDoc)}`);
    }

    let [senderList, senderListErr] = await getSendersList(
        { accountId, userId },
        { txid }
    );
    if (senderListErr) throw senderListErr;
    if (!senderList || !senderList.length) throw `senderList is empty or null`;

    let senderIdMap = {};
    for (let i = 0; i < senderList.length; i++) {
        let sender = senderList[i];
        let senderId = sender.user_id;
        senderId =
            typeof senderId === "object" ? senderId.toString() : senderId;
        let senderEmail = sender.email;
        senderIdMap[senderEmail] = senderId;
    }

    let { perHourLimit, perDayLimit } = getLimitConfig(
        { senderCount: senderList.length },
        { txid }
    );

    let replyToUser =
        campaignConfigDoc && campaignConfigDoc.reply_to_user
            ? campaignConfigDoc.reply_to_user.toString()
            : null;

    let scheduleList = scheduleTimeForSequenceProspects(
        {
            prospects,
            perHourLimit,
            perDayLimit,
            senderList,
            sequenceStepId,
            isFirstSequenceStep: true,
            sequenceStepTimeValue: { time_value: 1, time_unit: "day" },
            prospectSenderMap: {},
            prospectLastScheduleTimeMap: {},
            defaultTimezone,
            prevStepTimeValue: null,
            scheduleTimeHours:
                campaignConfigDoc && campaignConfigDoc.message_schedule_window,
            replyToUser,
        },
        { txid }
    );

    /*
        scheduleList: [
            {
                sequence: prospect.sequence,
                account: prospect.account,
                contact: prospect.contact,
                sequence_step: sequenceStepId,
                sequence_prospect: prospect._id,
                prospect_timezone: timezone,
                sender_email: selectedSender,
                message_scheduled_time: new Date(selectedTime),
                message_status: "pending",
            }
        ];

        use bulkWrite to update "sender_email", "message_scheduled_time" and "message_status" in SequenceProspectMessageSchedule 
            using fields: sequence, account, sequence_step, sequence_prospect
    */

    let updateData = scheduleList.map((x) => {
        let {
            sequence,
            account,
            contact,
            sequence_step,
            sequence_prospect,
            sender_email,
            message_scheduled_time,
            message_status,
            reply_to,
        } = x;

        let sender = senderIdMap[sender_email];

        let updateObj = {
            sender_email,
            message_scheduled_time,
            message_status,
            sender,
        };
        if (reply_to) {
            updateObj.reply_to = reply_to;
        }

        return {
            updateOne: {
                filter: {
                    sequence,
                    account,
                    contact,
                    sequence_step,
                    sequence_prospect,
                },
                update: updateObj,
            },
        };
    });
    logg.info(`updateData: ${JSON.stringify(updateData)}`);
    let bulkWriteResp = await SequenceProspectMessageSchedule.bulkWrite(
        updateData
    );
    logg.info(`bulkWriteResp: ${JSON.stringify(bulkWriteResp)}`);

    logg.info(`ended`);
    return [scheduleList, null];
}

const scheduleTimeForCampaignProspectsFromQAi = functionWrapper(
    fileName,
    "scheduleTimeForCampaignProspectsFromQAi",
    _scheduleTimeForCampaignProspectsFromQAi
);

async function _getSendersList(
    { accountId, userId },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    if (!accountId) throw `accountId is invalid`;

    let queryObj = { account: accountId };

    let campaignConfigDoc = await CampaignConfig.findOne(queryObj).lean();
    logg.info(`campaignConfigDoc: ${JSON.stringify(campaignConfigDoc)}`);

    let senderList = campaignConfigDoc && campaignConfigDoc.email_senders;
    logg.info(`senderList: ${JSON.stringify(senderList)}`);

    if (!senderList || !senderList.length) {
        // ! This is a temporary fix. Need to remove this once the sender list is available in campaign config in QDA UI
        let [userDoc, userDocErr] = await UserUtils.getUserById(
            { id: userId },
            { txid }
        );
        if (userDocErr) throw userDocErr;
        if (!userDoc) throw `userDoc is empty for userId: ${userId}`;
        let userEmail = userDoc.email;
        senderList = [{ email: userEmail, user_id: userId }];
    }

    if (!senderList || !senderList.length) throw `senderList is empty`;
    logg.info(`ended`);
    return [senderList, null];
}

const getSendersList = functionWrapper(
    fileName,
    "getSendersList",
    _getSendersList
);

function getLimitConfig({}, { txid }) {
    const funcName = "getLimitConfig";
    const logg = logger.child({ txid, funcName });
    // logg.info(`started`);
    // * The Per Hour limits is for 1 sender as per GMail Restrictions. This needs to be adjusted for Outlook later.
    let perHourLimit = 20;

    // * Even though the Per Day limit is 500 (as per GMail Restrictions), we are keeping it as 50 for now.
    // * Because, initially we want companies to start with a lower limit and then once they are comfortable, we can increase it.
    // * Hence, in the future, we need to make this dynamic based on the user's comfort level.
    // * Also, this needs to be adjusted for Outlook later.
    let perDayLimit = 50;

    // logg.info(`ended`);
    return { perHourLimit, perDayLimit };
}

/*
prospects: [{prospect_email,prospect_timezone},...]
perHourLimit: 20
perDayLimit: 500
senderList: ["email1","email2",...]
*/
function scheduleTimeForSequenceProspects(
    {
        prospects,
        perHourLimit,
        perDayLimit,
        senderList,
        scheduleTimeHours,
        sequenceStepId,
        isFirstSequenceStep,
        sequenceStepTimeValue,
        prospectSenderMap,
        prospectLastScheduleTimeMap,
        defaultTimezone,
        prevStepTimeValue,
        ignoreSchedulingBeforeTimes,
        replyToUser,
    },
    { txid }
) {
    const funcName = "scheduleTimeForSequenceProspects";
    const logg = logger.child({ txid, funcName });
    logg.info(`started`);
    let senderCount = senderList.length;
    if (!scheduleTimeHours || JSON.stringify(scheduleTimeHours) === "{}") {
        logg.info(
            `since scheduleTimeHours is empty, setting default scheduleTimeHours (mon-friday 9am-5pm)`
        );
        scheduleTimeHours = {
            sun: [],
            mon: [{ start: "09:00", end: "17:00" }],
            tue: [{ start: "09:00", end: "17:00" }],
            wed: [{ start: "09:00", end: "17:00" }],
            thu: [{ start: "09:00", end: "17:00" }],
            fri: [{ start: "09:00", end: "17:00" }],
            sat: [],
        };
    }

    let ignoreSchedulingBeforeTime = null;
    if (ignoreSchedulingBeforeTimes && ignoreSchedulingBeforeTimes.length) {
        // find the highest value from ignoreSchedulingBeforeTimes
        ignoreSchedulingBeforeTime = Math.max(...ignoreSchedulingBeforeTimes);
    }

    let tzGroupedProspects = groupProspectsByTimezone(
        { prospects, defaultTz: defaultTimezone || "Asia/Calcutta" },
        { txid }
    );

    let senderScheduleMap = {};
    for (let i = 0; i < senderCount; i++) {
        let sender = senderList[i];
        let senderEmail = sender.email;
        senderScheduleMap[senderEmail] = {};
    }

    let scheduleList = [];

    for (let timezone in tzGroupedProspects) {
        let currProspects = tzGroupedProspects[timezone];
        let currScheduleList = scheduleTimeForProspects(
            {
                prospects: currProspects,
                perHourLimit,
                perDayLimit,
                senderList,
                scheduleTimeHours,
                timezone,
                senderScheduleMap,
                sequenceStepId,
                isFirstSequenceStep,
                sequenceStepTimeValue,
                prospectSenderMap,
                prospectLastScheduleTimeMap,
                prevStepTimeValue,
                ignoreSchedulingBeforeTime,
                replyToUser,
            },
            { txid }
        );
        scheduleList.push(...currScheduleList);
    }

    logg.info(`ended`);
    return scheduleList;
}

function groupProspectsByTimezone({ prospects, defaultTz }, { txid }) {
    const funcName = "groupProspectsByTimezone";
    const logg = logger.child({ txid, funcName });
    logg.info(`started`);
    let tzGroupedProspects = {};
    for (let i = 0; i < prospects.length; i++) {
        let { prospect_email, prospect_timezone } = prospects[i];
        if (!prospect_timezone) prospect_timezone = defaultTz;
        if (!tzGroupedProspects[prospect_timezone])
            tzGroupedProspects[prospect_timezone] = [];
        tzGroupedProspects[prospect_timezone].push(prospects[i]);
    }
    logg.info(`ended`);
    return tzGroupedProspects;
}

function scheduleTimeForProspects(
    {
        prospects,
        perHourLimit,
        perDayLimit,
        senderList,
        scheduleTimeHours,
        timezone,
        senderScheduleMap,
        sequenceStepId,
        isFirstSequenceStep,
        sequenceStepTimeValue,
        prospectSenderMap,
        prospectLastScheduleTimeMap,
        prevStepTimeValue,
        ignoreSchedulingBeforeTime,
        replyToUser,
    },
    { txid }
) {
    const funcName = "scheduleTimeForProspects";
    const logg = logger.child({ txid, funcName });
    logg.info(
        `started with params: ${JSON.stringify({
            perHourLimit,
            perDayLimit,
            scheduleTimeHours,
            timezone,
            senderScheduleMap,
        })}`
    );

    let initialRangeTime = new Date().getTime();

    if (!isFirstSequenceStep && sequenceStepTimeValue && prevStepTimeValue) {
        /*
        * Old disabled code on 18th July 2024.
        * Now we are using TimeValue of the current step and the previous step to calculate the time difference
        * Then we add this difference to the initialRangeTime
        * This is to ensure that the time between the current step and the previous step is maintained

            let { time_value, time_unit } = sequenceStepTimeValue;
            let timeValueMillis = time_value * 24 * 60 * 60 * 1000;
            if (time_unit === "hour") timeValueMillis = time_value * 60 * 60 * 1000;
            initialRangeTime = initialRangeTime + timeValueMillis;
        */
        let { time_value: timeValue, time_unit: timeUnit } =
            sequenceStepTimeValue;

        let stepValueMillis = convertTimeStepValueToMillis(
            { timeValue, timeUnit },
            { txid }
        );

        let { time_value: prevTimeValue, time_unit: prevTimeUnit } =
            prevStepTimeValue;

        let prevStepValueMillis = convertTimeStepValueToMillis(
            { timeValue: prevTimeValue, timeUnit: prevTimeUnit },
            { txid }
        );

        let differenceStepValueMillis = stepValueMillis - prevStepValueMillis;

        initialRangeTime = initialRangeTime + differenceStepValueMillis;
    }

    if (ignoreSchedulingBeforeTime) {
        // if initialRangeTime is less than ignoreSchedulingBeforeTime, then set initialRangeTime to ignoreSchedulingBeforeTime
        if (initialRangeTime < ignoreSchedulingBeforeTime) {
            logg.info(
                `initialRangeTime[${initialRangeTime}] is less than ignoreSchedulingBeforeTime[${ignoreSchedulingBeforeTime}]. So Setting initialRangeTime to ignoreSchedulingBeforeTime`
            );
            initialRangeTime = ignoreSchedulingBeforeTime;
        }
    }

    let endRangeTime = initialRangeTime + 30 * 24 * 60 * 60 * 1000;

    let scheduleTimes =
        SlotGen_utils.createFreeFromBusySlotsOpenLinkNewCustomHours(
            {
                busy: [],
                range_start_time: initialRangeTime,
                range_end_time: endRangeTime,
                window_start_time_tz: timezone,
                duration: 60,
                custom_hours: scheduleTimeHours,
            },
            false,
            timezone
        );
    // ignore slots which are less than 1 hour from now
    let currTime = new Date().getTime();
    scheduleTimes = scheduleTimes.filter(
        (x) => x.startTime > currTime + 1 * 60 * 60 * 1000
    );

    if (ignoreSchedulingBeforeTime) {
        // ignore slots which are less than ignoreSchedulingBeforeTime
        scheduleTimes = scheduleTimes.filter(
            (x) => x.startTime > ignoreSchedulingBeforeTime
        );
    }

    // logg.info(`scheduleTimes: ${JSON.stringify(scheduleTimes)}\n\n`);

    scheduleTimes = scheduleTimes.map((x) => {
        return { start: x.startTime, end: x.endTime };
    });

    let temp = scheduleTimes.map((x) => {
        return momenttz(x.start).tz(timezone).format("YYYY-MM-DD HH:mm, ddd");
    });
    logg.info(`formatted scheduleTimes: ${JSON.stringify(temp)}`);

    let scheduleMap = {};
    let domainScheduleMap = {};

    let scheduleList = [];

    for (const prospect of prospects) {
        let found = false,
            selectedTime = null,
            selectedSender = null;
        let prospectEmail = prospect.prospect_email;
        let prospectDomain = prospectEmail.split("@")[1];
        for (const scheduleTime of scheduleTimes) {
            let startTime = scheduleTime.start;

            let existingSenderEmail =
                prospectSenderMap && prospectSenderMap[prospectEmail];
            if (existingSenderEmail) {
                let {
                    isSameDomainProspectScheduled,
                    isLimitConditionSatisfied,
                } = scheduleTimeForProspectForSender(
                    {
                        scheduleMap,
                        senderScheduleMap,
                        senderEmail: existingSenderEmail,
                        startTime,
                        perHourLimit,
                        perDayLimit,
                        prospectDomain,
                        domainScheduleMap,
                        prospectEmail,
                        prospectLastScheduledTime:
                            prospectLastScheduleTimeMap[prospectEmail],
                        sequenceStepTimeValue,
                        isFirstSequenceStep,
                        prevStepTimeValue,
                    },
                    { txid }
                );
                if (!isLimitConditionSatisfied) {
                    continue;
                }
                if (isSameDomainProspectScheduled) {
                    continue;
                }

                found = true;
                selectedTime = startTime;
                selectedSender = existingSenderEmail;
                prospectLastScheduleTimeMap[prospectEmail] = startTime;
            } else {
                for (const sender of senderList) {
                    let senderEmail = sender.email;
                    let {
                        isSameDomainProspectScheduled,
                        isLimitConditionSatisfied,
                    } = scheduleTimeForProspectForSender(
                        {
                            scheduleMap,
                            senderScheduleMap,
                            senderEmail,
                            startTime,
                            perHourLimit,
                            perDayLimit,
                            prospectDomain,
                            domainScheduleMap,
                            prospectEmail,
                            prospectLastScheduledTime:
                                prospectLastScheduleTimeMap[prospectEmail],
                            sequenceStepTimeValue,
                            isFirstSequenceStep,
                            prevStepTimeValue,
                        },
                        { txid }
                    );

                    if (!isLimitConditionSatisfied) {
                        continue;
                    }
                    if (isSameDomainProspectScheduled) {
                        continue;
                    }
                    found = true;
                    selectedTime = startTime;
                    selectedSender = senderEmail;
                    prospectSenderMap[prospectEmail] = senderEmail;
                    prospectLastScheduleTimeMap[prospectEmail] = startTime;

                    break;
                }
            }

            if (found) {
                logg.info(
                    `FOUND slot |${momenttz(scheduleTime.start)
                        .tz(timezone)
                        .format("YYYY-MM-DD HH:mm")}| for |${prospectEmail}|`
                );
                break;
            }
        }

        if (!found || !selectedTime || !selectedSender) {
            logg.error(`failed to find scheduleTime for ${prospectEmail}`);
            throw `failed to find scheduleTime for ${prospectEmail}`;
        }

        // prospect.scheduled_email_time = selectedTime;
        // prospect.sender_email = selectedSender;

        let item = {
            // _id: uuidv4(),
            sequence: prospect.sequence,
            account: prospect.account,
            contact: prospect.contact,
            sequence_step: sequenceStepId,
            sequence_prospect: prospect._id,
            sender_email: selectedSender,
            message_scheduled_time: new Date(selectedTime),
            message_status: "pending",
            prospect_timezone: timezone,
            // sender_account_type:
        };
        if (replyToUser) {
            replyToUser = replyToUser.toString();
            item.reply_to = { user_id: replyToUser };
        }

        scheduleList.push(item);
    }

    logg.info(`ended`);
    return scheduleList;
}

function satisfyLimitCondition(
    { scheduleTimeMap, perHourLimit, perDayLimit, startTime },
    { txid }
) {
    const funcName = "satisfyLimitCondition";
    const logg = logger.child({ txid, funcName });
    // logg.info(
    //     `started with body: ${JSON.stringify({
    //         scheduleTimeMap,
    //         perHourLimit,
    //         perDayLimit,
    //         startTime,
    //     })}`
    // );
    let count = scheduleTimeMap[startTime];
    /*
    * commenting below code because it didnt satisfy a scenario where count is 0 but perDayLimit has crossed the limit because of other slots that were booked within the same day
   * Ex: {"scheduleTimeMap":{"1710142200000":1,"1710145800000":1,"1710149400000":0},"perHourLimit":1,"perDayLimit":2,"startTime":1710149400000}
    if (!count) {
        logg.info(`no count found for startTime: ${startTime}`);
        logg.info(`ended`);
        return true;
    }
    */
    if (count >= perHourLimit) {
        // logg.info(`count: ${count} >= perHourLimit: ${perHourLimit}`);
        // logg.info(`ended`);
        return false;
    }
    let _30minsBeforeCount = scheduleTimeMap[startTime - 30 * 60 * 1000];
    if (_30minsBeforeCount && _30minsBeforeCount + count >= perHourLimit) {
        // logg.info(
        //     `_30minsBeforeCount: ${_30minsBeforeCount} + count: ${count} >= perHourLimit: ${perHourLimit}`
        // );
        // logg.info(`ended`);
        return false;
    }

    let _30minsAfterCount = scheduleTimeMap[startTime + 30 * 60 * 1000];
    if (_30minsAfterCount && _30minsAfterCount + count >= perHourLimit) {
        // logg.info(
        //     `_30minsAfterCount: ${_30minsAfterCount} + count: ${count} >= perHourLimit: ${perHourLimit}`
        // );
        // logg.info(`ended`);
        return false;
    }

    // set initial index to 1 day prior to startTime
    let initialIndex = startTime - 24 * 60 * 60 * 1000;
    while (initialIndex <= startTime) {
        let endIndex = initialIndex + 24 * 60 * 60 * 1000;

        let count = 0;
        for (let i = initialIndex; i <= endIndex; i += 30 * 60 * 1000) {
            count += scheduleTimeMap[i] || 0;
        }
        if (count >= perDayLimit) {
            // logg.info(`count: ${count} >= perDayLimit: ${perDayLimit}`);
            // logg.info(`ended`);
            return false;
        }
        initialIndex += 30 * 60 * 1000;
    }

    logg.info(`count is within limits`);
    // logg.info(`ended`);
    return true;
}

/*
WHAT DOES THIS FUNCTION DO?
* This function provides Multithreading support.
* Multithreading support essentially means ability to send a message to multiple prospects of same company. These prospects should receive the message at a different time so that they don't feel spammed.
* This function is to check if the prospect is scheduled for the same time as another prospect from the same domain


IMPLEMENTATION:
* If the prospect's domain is some generic domain like gmail.com, outlook.com, yahoo.com etc then return false
* If the prospect is scheduled for the same time as another prospect from the same domain, then return true
* If the prospect is scheduled within "daysBuffer" days from another prospect from the same domain, then return true
* NOTE: The "daysBuffer" is set to 2 days by default. Ideally, this should be configurable by the QRev user in the campaign setup
*/
function isSameDomainProspectScheduledForTime(
    { domainScheduledTimes, startTime, prospectDomain, daysBuffer = 2 },
    { txid }
) {
    const funcName = "isSameDomainProspectScheduledForTime";
    const logg = logger.child({ txid, funcName });
    logg.info(`started`);
    // if prospectDomain is gmail.com, outlook.com, yahoo.com etc then return false, since these are not custom domains
    if (
        !prospectDomain ||
        prospectDomain.includes("gmail.com") ||
        prospectDomain.includes("outlook.com") ||
        prospectDomain.includes("yahoo.com")
    ) {
        logg.info(`ended with false since generic domain`);
        return false;
    }

    if (!domainScheduledTimes || !domainScheduledTimes.length) {
        logg.info(`ended with false since domainScheduledTimes is empty`);
        return false;
    }
    if (domainScheduledTimes.includes(startTime)) {
        logg.info(
            `ended with true since domainScheduledTimes includes startTime`
        );
        return true;
    }

    /*
     * Added buffer days support on 14th May 2024
     * This is to avoid sending emails to prospects who work in the same company within a few days of each other.
     * Currently, the buffer days is set to 3 days. But ideally we want QRev users to set this buffer days in the campaign setup.
     */
    // check if any of the scheduled times are within "daysBuffer" days from startTime
    let bufferMillis = daysBuffer * 24 * 60 * 60 * 1000;
    let startTimeDateMillisPlusBuffer = startTime + bufferMillis;
    let startTimeDateMillisMinusBuffer = startTime - bufferMillis;

    for (let i = 0; i < domainScheduledTimes.length; i++) {
        let scheduledTime = domainScheduledTimes[i];
        if (
            scheduledTime >= startTimeDateMillisMinusBuffer &&
            scheduledTime <= startTimeDateMillisPlusBuffer
        ) {
            logg.info(
                `ended with true since scheduledTime is within buffer days`
            );
            return true;
        }
    }

    logg.info(`ended with false`);
    return false;
}

function convertTimeStepValueToMillis({ timeValue, timeUnit }, { txid }) {
    const funcName = "convertTimeStepValueToMillis";
    const logg = logger.child({ txid, funcName });
    // logg.info(`started`);

    if (!timeValue) throw `timeValue is invalid`;
    if (!timeUnit) throw `timeUnit is invalid`;

    timeUnit = timeUnit.toLowerCase().trim();
    let stepValueMillis = null;
    let hourValidUnits = ["hour", "hours", "hr", "hrs", "h"];
    let dayValidUnits = ["day", "days", "d"];
    let weekValidUnits = ["week", "weeks", "w"];
    let monthValidUnits = ["month", "months"];
    let yearValidUnits = ["year", "years", "y"];
    if (hourValidUnits.includes(timeUnit))
        stepValueMillis = timeValue * 60 * 60 * 1000;
    else if (dayValidUnits.includes(timeUnit))
        stepValueMillis = timeValue * 24 * 60 * 60 * 1000;
    else if (weekValidUnits.includes(timeUnit))
        stepValueMillis = timeValue * 7 * 24 * 60 * 60 * 1000;
    else if (monthValidUnits.includes(timeUnit))
        stepValueMillis = timeValue * 30 * 24 * 60 * 60 * 1000;
    else if (yearValidUnits.includes(timeUnit))
        stepValueMillis = timeValue * 365 * 24 * 60 * 60 * 1000;
    else throw `time_unit: ${timeUnit} is invalid`;

    // logg.info(`ended`);
    return stepValueMillis;
}

function scheduleTimeForProspectForSender(
    {
        scheduleMap,
        senderScheduleMap,
        senderEmail,
        startTime,
        perHourLimit,
        perDayLimit,
        prospectDomain,
        domainScheduleMap,
        prospectEmail,
        prospectLastScheduledTime,
        sequenceStepTimeValue,
        isFirstSequenceStep,
        prevStepTimeValue,
    },
    { txid }
) {
    const funcName = "scheduleTimeForProspectForSender";
    const logg = logger.child({ txid, funcName });
    // logg.info(`started`);

    if (prospectLastScheduledTime) {
        // if the start time is before last scheduled time, then return false
        // WHY: to avoid sending the message from sequence step 2 before sequence step 1
        if (startTime < prospectLastScheduledTime) {
            // logg.info(
            //     `ended with false since startTime[${startTime}] < prospectLastScheduledTime[${prospectLastScheduledTime}]`
            // );
            return {
                isLimitConditionSatisfied: false,
                isSameDomainProspectScheduled: false,
            };
        }

        // sequenceStepTimeValue format: {time_value: 1, time_unit: "day"}
        // if the start time is before last scheduled time + time_value, then return false
        // WHY: if sequence step 2 is to be scheduled 2 days after sequence step 1, then we need to check this condition
        // Ignore this condition if it is the first sequence step since we dont have any previous scheduled time
        let { time_value: timeValue, time_unit: timeUnit } =
            sequenceStepTimeValue;
        if (!isFirstSequenceStep && prevStepTimeValue) {
            let stepValueMillis = convertTimeStepValueToMillis(
                { timeValue, timeUnit },
                { txid }
            );

            let { time_value: prevTimeValue, time_unit: prevTimeUnit } =
                prevStepTimeValue;
            let prevStepValueMillis = convertTimeStepValueToMillis(
                { timeValue: prevTimeValue, timeUnit: prevTimeUnit },
                { txid }
            );

            let differenceStepValueMillis =
                stepValueMillis - prevStepValueMillis;

            if (
                startTime <
                prospectLastScheduledTime + differenceStepValueMillis
            ) {
                // logg.info(
                //     `ended with false since startTime[${startTime}] < prospectLastScheduledTime[${prospectLastScheduledTime}] + differenceStepValueMillis[${differenceStepValueMillis}]`
                // );
                return {
                    isLimitConditionSatisfied: false,
                    isSameDomainProspectScheduled: false,
                };
            }
        }
    }

    if (!senderScheduleMap[senderEmail][startTime]) {
        senderScheduleMap[senderEmail][startTime] = 0;
    }
    let isLimitConditionSatisfied = satisfyLimitCondition(
        {
            scheduleTimeMap: senderScheduleMap[senderEmail],
            perHourLimit,
            perDayLimit,
            startTime,
        },
        { txid }
    );
    if (!isLimitConditionSatisfied) {
        // logg.info(`ended`);
        //continue;
        return {
            isLimitConditionSatisfied,
            isSameDomainProspectScheduled: null,
        };
    }

    let isSameDomainProspectScheduled = isSameDomainProspectScheduledForTime(
        {
            domainScheduledTimes: domainScheduleMap[prospectDomain],
            startTime,
            prospectDomain,
        },
        { txid }
    );

    if (isSameDomainProspectScheduled) {
        // continue;
        // logg.info(`ended`);
        return { isLimitConditionSatisfied, isSameDomainProspectScheduled };
    }

    senderScheduleMap[senderEmail][startTime]++;
    scheduleMap[prospectEmail] = startTime;
    if (!domainScheduleMap[prospectDomain]) {
        domainScheduleMap[prospectDomain] = [];
    }
    domainScheduleMap[prospectDomain].push(startTime);
    // found = true;
    // selectedTime = startTime;
    // selectedSender = senderEmail;
    // break;

    // logg.info(`ended`);
    return { isSameDomainProspectScheduled, isLimitConditionSatisfied };
}

async function _executeCampaignSequenceStepMessages(
    { spmsDocs },
    { txid, logg, funcName }
) {
    logg.info(`started`);

    if (!spmsDocs || !spmsDocs.length) {
        throw `spmsDocs is empty`;
    }

    // group spmsDocs by sender_email
    let senderEmailGroupedSpmsDocs = {};
    for (let i = 0; i < spmsDocs.length; i++) {
        let spmsDoc = spmsDocs[i];
        let senderEmail = spmsDoc.sender_email;
        if (!senderEmail) {
            logg.error(
                `sender_email is empty for spmsDoc: ${JSON.stringify(spmsDoc)}`
            );
            continue;
        }
        if (!senderEmailGroupedSpmsDocs[senderEmail])
            senderEmailGroupedSpmsDocs[senderEmail] = [];
        senderEmailGroupedSpmsDocs[senderEmail].push(spmsDoc);
    }

    let senderPromises = [];
    for (let senderEmail in senderEmailGroupedSpmsDocs) {
        let spmsDocs = senderEmailGroupedSpmsDocs[senderEmail];
        let senderPromise = execCampaignSequencesStepMessagesForSender(
            { spmsDocs, senderEmail },
            { txid, sendErrorMsg: true }
        );
        senderPromises.push(senderPromise);
    }

    let senderResp = await Promise.allSettled(senderPromises);

    logg.info(`ended`);
    return [senderResp, null];
}

export const executeCampaignSequenceStepMessages = functionWrapper(
    fileName,
    "executeCampaignSequenceStepMessages",
    _executeCampaignSequenceStepMessages
);

async function _execCampaignSequencesStepMessagesForSender(
    { spmsDocs, senderEmail },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    if (!spmsDocs || !spmsDocs.length) {
        logg.info(`spmsDocs is empty`);
        return [true, null];
    }

    let [senderAuthObj, authObjErr] = await GoogleUtils.refreshOrReturnToken(
        { email: senderEmail, returnBackAuthObj: true },
        { txid }
    );
    if (authObjErr) throw authObjErr;

    if (!senderAuthObj)
        throw `senderAuthObj is invalid for senderEmail: ${senderEmail}`;

    // initial wait time is 5 sec
    let waitTime = 5000;
    let promises = [];
    for (let i = 0; i < spmsDocs.length; i++) {
        const spmsDoc = spmsDocs[i];
        // make use of function "executeCampaignSequenceStep" for each spmsDoc
        let promise = executeCampaignSequenceStep(
            { spmsDoc },
            { txid, sendErrorMsg: true }
        );
        promises.push(promise);

        //wait for minimum of waitTime or 12 sec (if this not the last spmsDoc)
        if (i < spmsDocs.length - 1) {
            await new Promise((resolve) =>
                setTimeout(resolve, Math.min(waitTime, 12000))
            );
            waitTime += 200;
        }
    }

    let resp = await Promise.allSettled(promises);

    logg.info(`ended`);
    return [resp, null];
}

const execCampaignSequencesStepMessagesForSender = functionWrapper(
    fileName,
    "execCampaignSequencesStepMessagesForSender",
    _execCampaignSequencesStepMessagesForSender
);

async function _executeCampaignSequenceStep(
    { spmsId, spmsDoc },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    if (!spmsId && !spmsDoc) throw `spmsId is invalid`;
    if (!spmsDoc) {
        logg.info(`since spmsDoc is empty, fetching spmsDoc for spmsId`);
        let spmsQueryObj = { _id: spmsId };
        spmsDoc = await SequenceProspectMessageSchedule.findOne(
            spmsQueryObj
        ).lean();
        logg.info(`spmsDoc: ${JSON.stringify(spmsDoc)}`);
    }

    if (!spmsId) spmsId = spmsDoc && spmsDoc._id;

    if (!spmsDoc) {
        throw `failed to find spmsDoc for spmsId: ${spmsId}`;
    }

    let accountId = spmsDoc.account;
    let contactId = spmsDoc.contact;

    let [contactDoc, contactErr] = await CrmContactUtils.getContactById(
        { contactId, accountId },
        { txid }
    );

    if (contactErr) throw contactErr;
    if (!contactDoc) throw `contactDoc is invalid`;
    if (!contactDoc.email) throw `contactDoc.email is invalid`;

    let [sendReplyAndDelayResp, sRADErr] = await sendReplyAndDelayEmail(
        { spmsDoc, spmsId, accountId, contactDoc },
        { txid, sendErrorMsg: true }
    );
    if (sRADErr) {
        logg.error(`sRADErr: ${sRADErr}`);
        logg.info(`even though got sendReplyAndDelay error, continuing...`);
    }

    let messageDelayed =
        sendReplyAndDelayResp && sendReplyAndDelayResp.messageDelayed;

    if (messageDelayed) {
        logg.info(`message is delayed. so skipping this sending the message`);
        logg.info(`ended`);
        return [true, null];
    }

    let [hasRepliedToPrevStep, repliedErr] =
        await hasProspectRepliedToPreviousStep(
            {
                sequenceId: spmsDoc.sequence,
                sequenceProspectId: spmsDoc.sequence_prospect,
                currentSpmsId: spmsId,
                currentSequenceStepId: spmsDoc.sequence_step,
                accountId,
            },
            { txid, sendErrorMsg: true }
        );
    if (repliedErr) {
        logg.error(
            `got reply error. but continuing... repliedErr: ${repliedErr}`
        );
    }

    let messageResponse = null;
    let failed = false;

    if (hasRepliedToPrevStep) {
        logg.info(`prospect has replied. so skipping this sending the message`);

        messageResponse = {
            reason: "prospect_replied_to_previous_step",
            data: hasRepliedToPrevStep,
        };
    } else {
        let [resp, err] = await executeCampaignStepUtil(
            { spmsDoc, spmsId, contactDoc },
            { txid, sendErrorMsg: true }
        );
        if (err) {
            logg.error(
                `got error while sending message. but continuing... err: ${err}`
            );

            failed = true;
            messageResponse = {
                reason: "failed to send email",
                data: `${err}`,
            };
        } else {
            messageResponse = resp && resp.messageResponse;
        }
    }

    let messageStatus = "";
    if (hasRepliedToPrevStep) messageStatus = "skipped";
    else if (failed) messageStatus = "failed";
    else messageStatus = "sent";

    let queryObj = { _id: spmsId };

    let updateObj = {
        message_status: messageStatus,
        updated_on: new Date(),
        message_response: messageResponse,
        message_sent_time: new Date(),
    };

    let updateResp = await SequenceProspectMessageSchedule.updateOne(
        queryObj,
        updateObj
    );
    logg.info(`updateResp: ${JSON.stringify(updateResp)}`);

    let seqProspectQueryObj = { _id: spmsDoc.sequence_prospect };
    let seqProspectUpdateObj = {
        status: messageStatus,
        updated_on: new Date(),
    };
    let seqProspectUpdateResp = await SequenceProspect.updateOne(
        seqProspectQueryObj,
        seqProspectUpdateObj
    );
    logg.info(
        `seqProspectUpdateResp: ${JSON.stringify(seqProspectUpdateResp)}`
    );

    let [sessionId, analyticsErr] = await storeMessageSendAnalytic(
        { spmsDoc, messageResponse, messageStatus },
        { txid, sendErrorMsg: true }
    );
    if (analyticsErr) {
        logg.error(`analyticsErr: ${analyticsErr}`);
    }

    if (sessionId) {
        let updateResp = await SequenceProspectMessageSchedule.updateOne(
            queryObj,
            { analytic_session_id: sessionId }
        );
        logg.info(`updateResp: ${JSON.stringify(updateResp)}`);
    }

    // * Push Lead and Email activity to User connected CRMs
    let [integrationActivities, crmErr] =
        await IntegrationUtils.sequenceStepMessageSend(
            {
                accountId,
                contactDoc,
                messageStatus,
                emailSubject: spmsDoc.message_subject,
                emailBody: spmsDoc.message_body,
                emailSentTime: new Date(),
                senderEmail: spmsDoc.sender_email,
            },
            { txid, sendErrorMsg: true }
        );
    if (crmErr) {
        logg.error(`Got CRM error. But continuing... crmErr: ${crmErr}`);
    } else if (integrationActivities && integrationActivities.length) {
        // adding integration activities to the spmsDoc
        let integrationActivitiesObj = {
            integration_activities: integrationActivities,
        };
        let integActivitiesUpdateResp =
            await SequenceProspectMessageSchedule.updateOne(
                queryObj,
                integrationActivitiesObj
            );
        logg.info(
            `integActivitiesUpdateResp: ${JSON.stringify(
                integActivitiesUpdateResp
            )}`
        );
    }

    logg.info(`ended`);
    return [true, null];
}

const executeCampaignSequenceStep = functionWrapper(
    fileName,
    "executeCampaignSequenceStep",
    _executeCampaignSequenceStep
);

async function _executeCampaignStepUtil(
    { spmsDoc, spmsId, contactDoc },
    { txid, logg, funcName }
) {
    logg.info(`started`);

    let {
        account,
        sequence,
        sequence_step,
        sequence_prospect,
        contact,
        sender_email,
        sender,
        message_scheduled_time,
        // prospect_email,
        message_status,
        message_subject,
        message_body,
        is_message_generation_complete,
        reply_to: replyToObj,
    } = spmsDoc;

    if (message_status !== "pending") {
        throw `message_status is not pending`;
    }

    if (!is_message_generation_complete) {
        throw `message is not generated yet`;
    }

    if (!contactDoc) throw `contactDoc is invalid`;
    if (!contactDoc.email) throw `contactDoc.email is invalid`;

    let prospect_email = "";

    prospect_email = contactDoc.email;

    let [senderAuthObj, authObjErr] = await GoogleUtils.refreshOrReturnToken(
        { email: sender_email, returnBackAuthObj: true },
        { txid }
    );
    if (authObjErr) throw authObjErr;

    if (!senderAuthObj)
        throw `senderAuthObj is invalid for sender_email: ${sender_email}`;

    if (spmsId) {
        message_body = convertToHtmlAndAddTags(
            { emailBody: message_body, campaignProspectId: spmsId },
            { txid }
        );
    }

    let replyToEmailId = null;
    if (replyToObj && replyToObj.user_id) {
        logg.info(`getting replyToUser for user id: ${replyToObj.user_id}`);
        let [replyToUserDoc, replyToUserErr] = await UserUtils.getUserById(
            { id: replyToObj.user_id },
            { txid }
        );
        if (replyToUserErr) throw replyToUserErr;
        if (!replyToUserDoc) throw `replyToUserDoc is invalid`;

        replyToEmailId = replyToUserDoc.email;
    }

    let [sendResp, sendEmailErr] = await GoogleUtils.sendEmail(
        {
            senderEmailId: sender_email,
            senderAuthObj,
            toEmailId: prospect_email,
            subject: message_subject,
            body: message_body,
            replyToEmailId,
        },
        { txid }
    );
    if (sendEmailErr) throw sendEmailErr;
    if (!sendResp) throw `sendResp is invalid`;

    let emailSentId = null,
        emailThreadId = null,
        emailLabelIds = null;

    emailSentId = sendResp && sendResp.id;
    emailThreadId = sendResp && sendResp.threadId;
    emailLabelIds = sendResp && sendResp.labelIds;

    let messageResponse = {
        email_sent_id: emailSentId,
        email_thread_id: emailThreadId,
        email_label_ids: emailLabelIds,
    };

    logg.info(`ended`);
    return [{ messageResponse }, null];
}

const executeCampaignStepUtil = functionWrapper(
    fileName,
    "executeCampaignStepUtil",
    _executeCampaignStepUtil
);

function convertToHtmlAndAddTags(
    { emailBody, campaignProspectId, replyId },
    { txid }
) {
    const funcName = "convertToHtmlAndAddTags";
    const logg = logger.child({ txid, funcName });
    logg.info(`started`);

    //convert \n to <br>
    emailBody = emailBody.replace(/\n/g, "<br>");

    const serverUrlPath = process.env.SERVER_URL_PATH;
    let trackingUrl = `${serverUrlPath}/api/campaign/email_open?ssmid=${campaignProspectId}`;
    if (replyId) trackingUrl += `&reply_id=${replyId}`;

    const trackingTag = `<img src="${trackingUrl}" alt="Image"/>`;
    // const unsubscribeTag = `<a href="${serverUrlPath}/api/campaign/unsubscribe?ssmid=${campaignProspectId}">Click here to unsubscribe</a>`;
    // const result = `${emailBody}<br><br>${unsubscribeTag}<br>${trackingTag}`;
    const result = `${emailBody}<br>${trackingTag}`;
    logg.info(`after converting to html & adding tracking tag: ${result}`);
    logg.info(`ended`);
    return result;
}

async function _storeMessageSendAnalytic(
    { spmsDoc, messageResponse, messageStatus },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    if (!spmsDoc) throw `spmsDoc is invalid`;
    if (!messageStatus) throw `messageStatus is invalid`;

    let sessionId = uuidv4();
    let [analyticResp, analyticErr] =
        await AnalyticUtils.storeCampaignMessageSendAnalytic(
            {
                sessionId,
                messageResponse,
                messageStatus,
                spmsId: spmsDoc._id,
                accountId: spmsDoc.account,
                sequenceId: spmsDoc.sequence,
                contactId: spmsDoc.contact,
                sequenceStepId: spmsDoc.sequence_step,
                sequenceProspectId: spmsDoc.sequence_prospect,
            },
            { txid }
        );

    if (analyticErr) throw analyticErr;

    let [contactResp, contactErr] = await CrmContactUtils.addSessionToContact(
        {
            sessionId,
            contactId: spmsDoc.contact,
            accountId: spmsDoc.account,
            updateLastContactedOn: true,
        },
        { txid }
    );
    if (contactErr) throw contactErr;

    logg.info(`ended`);
    return [sessionId, null];
}

const storeMessageSendAnalytic = functionWrapper(
    fileName,
    "storeMessageSendAnalytic",
    _storeMessageSendAnalytic
);

async function _saveSequenceStepMessageOpenAnalytic(
    { ssmid },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    if (!ssmid) throw `invalid ssmid`;

    let queryObj = { _id: ssmid };
    let spmsDoc = await SequenceProspectMessageSchedule.findOne(
        queryObj
    ).lean();
    logg.info(`ssmDoc: ${JSON.stringify(spmsDoc)}`);
    if (!spmsDoc) throw `spmsDoc not found for ssmid: ${ssmid}`;

    let [hasBounced, repliedErr] = await AnalyticUtils.hasSequenceMessgeBounced(
        { spmsId: ssmid },
        { txid, sendErrorMsg: true }
    );
    if (repliedErr) {
        logg.error(
            `got repliedErr. but continuing... repliedErr: ${repliedErr}`
        );
    }

    if (hasBounced) {
        logg.info(
            `since prospect message failed to deliver, skip storing open analytic`
        );
        return [true, null];
    }

    // just to be sure, check in real time if there is a bounced reply from GMail API
    let [hasBounceMessage, bounceErr] = await GoogleUtils.hasBouncedMessage(
        {
            senderUserId: spmsDoc.sender,
            senderEmail: spmsDoc.sender_email,
            emailThreadId: spmsDoc.message_response.email_thread_id,
        },
        { txid, sendErrorMsg: true }
    );
    if (bounceErr) {
        logg.error(`got bounceErr. but continuing... bounceErr: ${bounceErr}`);
    }

    if (hasBounceMessage) {
        logg.info(
            `since prospect message failed to deliver, skip storing open analytic`
        );
        return [true, null];
    }

    let [analyticResp, analyticErr] =
        await AnalyticUtils.storeCampaignMessageOpenAnalytic(
            {
                sessionId: spmsDoc.analytic_session_id,
                spmsId: ssmid,
                accountId: spmsDoc.account,
                sequenceId: spmsDoc.sequence,
                contactId: spmsDoc.contact,
                sequenceStepId: spmsDoc.sequence_step,
                sequenceProspectId: spmsDoc.sequence_prospect,
            },
            { txid }
        );
    if (analyticErr) throw analyticErr;

    // * added below code on 18th July 2024
    let [replyResp, replyErr] = await sendReplyIfNotSentBefore(
        { spmsDoc },
        { txid, sendErrorMsg: true }
    );
    if (replyErr) {
        logg.error(`got replyErr. but continuing... replyErr: ${replyErr}`);
    }

    logg.info(`ended`);
    return [analyticResp, null];
}

export const saveSequenceStepMessageOpenAnalytic = functionWrapper(
    fileName,
    "saveSequenceStepMessageOpenAnalytic",
    _saveSequenceStepMessageOpenAnalytic
);

async function _saveSequenceStepMessageReplyOpenAnalytic(
    { ssmid, replyId },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    if (!ssmid) throw `invalid ssmid`;
    if (!replyId) throw `invalid replyId`;

    let queryObj = { _id: ssmid };
    let spmsDoc = await SequenceProspectMessageSchedule.findOne(
        queryObj
    ).lean();
    logg.info(`ssmDoc: ${JSON.stringify(spmsDoc)}`);
    if (!spmsDoc) throw `spmsDoc not found for ssmid: ${ssmid}`;

    // check if replyId is present in field: "replies" (structure: [{reply_id, replied_on, type, message, message_response}]) of spmsDoc
    let replies = spmsDoc.replies || [];
    let replyObj = false;
    for (let i = 0; i < replies.length; i++) {
        let reply = replies[i];
        if (reply && reply.reply_id === replyId) {
            replyObj = reply;
            break;
        }
    }

    if (!replyObj) {
        logg.info(`replyId is not present in spmsDoc.replies`);
        return [true, null];
    }

    let [saveReplyOpenResp, saveReplyOpenErr] =
        await AnalyticUtils.storeCampaignAutoMessageReplyOpenAnalytic(
            {
                sessionId: spmsDoc.analytic_session_id,
                spmsId: ssmid,
                accountId: spmsDoc.account,
                sequenceId: spmsDoc.sequence,
                contactId: spmsDoc.contact,
                sequenceStepId: spmsDoc.sequence_step,
                sequenceProspectId: spmsDoc.sequence_prospect,
                replyId,
                replyObj,
            },
            { txid }
        );
    if (saveReplyOpenErr) throw saveReplyOpenErr;

    logg.info(`ended`);
    return [saveReplyOpenResp, null];
}

export const saveSequenceStepMessageReplyOpenAnalytic = functionWrapper(
    fileName,
    "saveSequenceStepMessageReplyOpenAnalytic",
    _saveSequenceStepMessageReplyOpenAnalytic
);

/*
    response structure:[
        {
            _id: "60f3e3e3e3e3e3e3e3e3e3e3",
            name: "SEQ1",
            steps: 13,
            current_prospects: { active: 31, bounced: 3 },
            sequence_analytics: {
                contacted: 12,
                opened: 8,
                clicked: 3,
                replied: 1,
                booked: 0,
            },
        },...
    ]
*/
async function _getAllSequencesAndItsAnalytics(
    { accountId },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    if (!accountId) throw `accountId is invalid`;

    let seqQuery = { account: accountId };
    let sequences = await SequenceModel.find(seqQuery)
        .sort("-created_on")
        .lean();
    logg.info(`sequences.length: ${sequences.length}`);
    logg.info(`sequences: ${JSON.stringify(sequences)}`);
    if (!sequences || !sequences.length) {
        logg.info(`ended since sequences is empty`);
        return [[], null];
    }

    let sequenceIds = sequences.map((x) => x._id);
    let sequenceSteps = await SequenceStep.find({
        sequence: { $in: sequenceIds },
        account: accountId,
    }).lean();
    logg.info(`sequenceSteps.length: ${sequenceSteps.length}`);

    let sequenceStepMap = {};
    for (let i = 0; i < sequenceSteps.length; i++) {
        let sequenceStep = sequenceSteps[i];
        let seqId = sequenceStep.sequence;
        if (!sequenceStepMap[seqId]) sequenceStepMap[seqId] = [];
        sequenceStepMap[seqId].push(sequenceStep);
    }

    let resultMap = {};
    for (let i = 0; i < sequences.length; i++) {
        let seq = sequences[i];
        let seqId = seq._id;
        let seqName = seq.name;
        let createdOn = seq.created_on;
        let sequenceSteps = sequenceStepMap[seqId] || [];
        resultMap[seqId] = {
            _id: seqId,
            name: seqName,
            steps: sequenceSteps.length || 0,
            current_prospects: { active: 0, bounced: 0 },
            // sequence_analytics: {
            //     contacted: 0,
            //     opened: 0,
            //     clicked: 0,
            //     replied: 0,
            //     booked: 0,
            // },
        };
    }

    let seqProspects = await SequenceProspect.find({
        account: accountId,
        // status: { $ne: "pending" },
    }).lean();

    for (let i = 0; i < seqProspects.length; i++) {
        let seqProspect = seqProspects[i];
        let seqId = seqProspect.sequence;
        let status = seqProspect.status;
        if (status === "bounced" || status === "failed") {
            resultMap[seqId].current_prospects.bounced++;
        } else if (status === "sent") {
            resultMap[seqId].current_prospects.active++;
        }
    }

    let [seqAnalyticsMap, analyticErr] =
        await AnalyticUtils.getCampaignMessageAnalytics(
            { accountId, sequenceIds },
            { txid }
        );
    if (analyticErr) throw analyticErr;

    for (let seqId in seqAnalyticsMap) {
        let seqAnalytics = seqAnalyticsMap[seqId];
        resultMap[seqId].sequence_analytics = seqAnalytics;
    }

    let result = Object.values(resultMap);

    logg.info(`result: ${JSON.stringify(result)}`);
    logg.info(`ended`);
    return [result, null];
}

export const getAllSequencesAndItsAnalytics = functionWrapper(
    fileName,
    "getAllSequencesAndItsAnalytics",
    _getAllSequencesAndItsAnalytics
);

async function _getSequenceDetails(
    { accountId, sequenceId },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    if (!accountId) throw `accountId is invalid`;
    if (!sequenceId) throw `sequenceId is invalid`;

    let seqQuery = { _id: sequenceId, account: accountId };
    let sequence = await SequenceModel.findOne(seqQuery).lean();
    logg.info(`sequence: ${JSON.stringify(sequence)}`);
    if (!sequence) {
        throw `failed to find sequence for sequenceId: ${sequenceId}`;
    }

    let seqStepQuery = { sequence: sequenceId, account: accountId };
    let sequenceSteps = await SequenceStep.find(seqStepQuery)
        .sort("order")
        .lean();
    logg.info(`sequenceSteps: ${JSON.stringify(sequenceSteps)}`);

    let days = 1;
    for (let i = 0; i < sequenceSteps.length; i++) {
        let sequenceStep = sequenceSteps[i];
        /*
        time_of_dispatch: {
            type: "from_prospect_added_time",
            value: { time_value: 1, time_unit: "day" },
        }
        */
        let { time_of_dispatch } = sequenceStep;
        let value = time_of_dispatch && time_of_dispatch.value;
        let timeValue = value && value.time_value;
        if (timeValue && days < timeValue) {
            days = timeValue;
        }
    }

    let result = {
        name: sequence.name,
        step_details: {
            steps: sequenceSteps.length || 0,
            days,
        },
        current_prospects: { active: 0, bounced: 0 },
        steps: [],
    };

    let seqProspectQuery = { sequence: sequenceId, account: accountId };
    let seqProspects = await SequenceProspect.find(seqProspectQuery).lean();

    for (let i = 0; i < seqProspects.length; i++) {
        let seqProspect = seqProspects[i];
        let status = seqProspect.status;
        if (status === "bounced" || status === "failed") {
            result.current_prospects.bounced++;
        } else if (status === "sent") {
            result.current_prospects.active++;
        }
    }

    let pendingSpmsDocs = await SequenceProspectMessageSchedule.find({
        sequence: sequenceId,
        account: accountId,
        message_status: "pending",
    }).lean();
    logg.info(`pendingSpmsDocs.length: ${pendingSpmsDocs.length}`);

    let pendingSpmsMap = {};
    for (let i = 0; i < pendingSpmsDocs.length; i++) {
        let pendingSpmsDoc = pendingSpmsDocs[i];
        let seqStepId = pendingSpmsDoc.sequence_step;
        if (!pendingSpmsMap[seqStepId]) pendingSpmsMap[seqStepId] = 0;
        pendingSpmsMap[seqStepId]++;
    }

    let [seqAnalyticsMap, analyticErr] =
        await AnalyticUtils.getSequenceAnalytics(
            { accountId, sequenceId },
            { txid }
        );
    if (analyticErr) throw analyticErr;

    for (let i = 0; i < sequenceSteps.length; i++) {
        let sequenceStep = sequenceSteps[i];
        let item = {
            active: sequenceStep.active,
            order: sequenceStep.order || 1,
            type: sequenceStep.type,
            time_of_dispatch: sequenceStep.time_of_dispatch,
        };
        if (sequenceStep.draft_type === "ai_generated") {
            item.draft_type = sequenceStep.draft_type;
            item.subject = "";
            item.body = "";
        } else {
            item.draft_type = sequenceStep.draft_type;
            item.subject = sequenceStep.subject;
            item.body = sequenceStep.body;
        }

        let seqStepId = sequenceStep._id;
        let seqStepAnalytics = seqAnalyticsMap && seqAnalyticsMap[seqStepId];
        if (seqStepAnalytics) {
            item.analytics = seqStepAnalytics;
            let seqStepPendingCount = pendingSpmsMap[seqStepId] || 0;
            item.analytics.pending = seqStepPendingCount;
        }

        result.steps.push(item);
    }

    logg.info(`result: ${JSON.stringify(result)}`);
    logg.info(`ended`);
    return [result, null];
}

export const getSequenceDetails = functionWrapper(
    fileName,
    "getSequenceDetails",
    _getSequenceDetails
);

async function _setEmailSenderListForCampaign(
    { accountId, senderList },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    if (!accountId) throw `accountId is invalid`;
    if (!senderList || !senderList.length) throw `senderList is invalid`;

    let campaignConfigDoc = await CampaignConfig.findOne({
        account: accountId,
    }).lean();
    logg.info(
        `existing campaignConfigDoc: ${JSON.stringify(campaignConfigDoc)}`
    );

    let [userObjs, userErr] = await UserUtils.getUserInfoByEmails(
        { emails: senderList },
        { txid }
    );
    if (userErr) throw userErr;

    let emailSenders = userObjs.map((x) => {
        return {
            user_id: x._id.toString(),
            email: x.email,
        };
    });

    if (!campaignConfigDoc) {
        let obj = {
            _id: uuidv4(),
            account: accountId,
            email_senders: emailSenders,
        };
        let campaignConfig = new CampaignConfig(obj);
        let saveResp = await campaignConfig.save();
        logg.info(`saveResp: ${JSON.stringify(saveResp)}`);
    } else {
        let queryObj = { account: accountId };
        let updateObj = { email_senders: emailSenders, updated_on: new Date() };
        let updateResp = await CampaignConfig.updateOne(queryObj, updateObj);
        logg.info(`updateResp: ${JSON.stringify(updateResp)}`);
    }

    logg.info(`ended`);
    return [true, null];
}

export const setEmailSenderListForCampaign = functionWrapper(
    fileName,
    "setEmailSenderListForCampaign",
    _setEmailSenderListForCampaign
);

async function _getEmailSenderListForCampaign(
    { accountId },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    if (!accountId) throw `accountId is invalid`;

    let queryObj = { account: accountId };
    let campaignConfigDoc = await CampaignConfig.findOne(queryObj).lean();
    logg.info(`campaignConfigDoc: ${JSON.stringify(campaignConfigDoc)}`);

    let emailSenders = campaignConfigDoc && campaignConfigDoc.email_senders;
    if (!emailSenders || !emailSenders.length) {
        emailSenders = [];
    } else {
        emailSenders = emailSenders.map((x) => x.email);
    }
    logg.info(`ended`);
    return [emailSenders, null];
}

export const getEmailSenderListForCampaign = functionWrapper(
    fileName,
    "getEmailSenderListForCampaign",
    _getEmailSenderListForCampaign
);

async function _executeCampaignCronJob({}, { txid, logg, funcName }) {
    logg.info(`started at ${new Date().toISOString()}`);
    if (process.env.LOCAL_COMPUTER === "yes") {
        logg.info(`since LOCAL_COMPUTER is yes, not executing the cron job`);
        return;
    }

    let now = new Date();
    let now1MinBack = new Date(now.getTime() - 1 * 60 * 1000);

    let queryObj = {
        message_status: "pending",
        message_scheduled_time: {
            $gt: now1MinBack,
            $lt: now,
        },
        is_message_generation_complete: true,
        is_under_execution: { $ne: true },
    };
    logg.info(`queryObj: ${JSON.stringify(queryObj)}`);

    let spmsDocs = await SequenceProspectMessageSchedule.find(queryObj).lean();

    if (!spmsDocs.length) {
        logg.info(`no spmsDocs found`);
        return;
    }

    logg.info(`spmsDocs.length: ${spmsDocs.length}`);
    logg.info(`spmsDocs: ${JSON.stringify(spmsDocs)}`);

    // update is_under_execution to true for all spmsDocs
    let spmsIds = spmsDocs.map((x) => x._id);
    let updateObj = { is_under_execution: true };
    let statusUpdateResp = await SequenceProspectMessageSchedule.updateMany(
        { _id: { $in: spmsIds } },
        updateObj
    );
    logg.info(`statusUpdateResp: ${JSON.stringify(statusUpdateResp)}`);

    let [execResp, execErr] = await executeCampaignSequenceStepMessages(
        { spmsDocs },
        { txid }
    );
    if (execErr) throw execErr;
}

export const executeCampaignCronJob = functionWrapper(
    fileName,
    "executeCampaignCronJob",
    _executeCampaignCronJob
);

async function _getSequenceProspects(
    { accountId, sequenceId },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    if (!accountId) throw `accountId is invalid`;
    if (!sequenceId) throw `sequenceId is invalid`;

    let queryObj = { account: accountId, sequence: sequenceId };
    let seqProspects = await SequenceProspect.find(queryObj)
        .populate("contact")
        .lean();
    logg.info(`seqProspects.length: ${seqProspects.length}`);
    if (seqProspects.length < 10) {
        logg.info(`seqProspects: ${JSON.stringify(seqProspects)}`);
    }

    let data = [];
    const headers = {
        _id: {
            label: "ID",
            type: "string",
            hidden: true,
            order: 0,
        },
        email: {
            label: "Email",
            type: "string",
            order: 1,
        },
        name: {
            label: "Name",
            type: "string",
            order: 2,
        },
        phone_number: {
            label: "Phone Number",
            type: "string",
            order: 3,
        },
        company_name: {
            label: "Company Name",
            type: "string",
            order: 4,
        },
        linkedin_url: {
            label: "LinkedIn URL",
            type: "string",
            order: 5,
        },
        status: {
            label: "Status",
            type: "chip",
            values: ["pending", "sent", "bounced", "skipped"],
            order: 6,
        },
    };

    for (let i = 0; i < seqProspects.length; i++) {
        let seqProspect = seqProspects[i];
        let contact = seqProspect.contact || {};
        let name = contact.first_name || "";
        if (contact.last_name) name += " " + contact.last_name;

        let item = {
            _id: seqProspect._id,
            email: contact.email || "",
            name,
            phone_number: contact.phone_number || "",
            company_name: contact.company_name || "",
            linkedin_url: contact.linkedin_url || "",
            status: seqProspect.status,
        };

        data.push(item);
    }

    logg.info(`ended`);
    return [{ headers, data }, null];
}

export const getSequenceProspects = functionWrapper(
    fileName,
    "getSequenceProspects",
    _getSequenceProspects
);

async function _getAllSequenceEmails(
    { accountId, pageNum = 1, limit = 20 },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    if (!accountId) throw `accountId is invalid`;

    const headers = {
        _id: {
            label: "ID",
            type: "string",
            hidden: true,
            order: 0,
        },
        prospect_name: {
            label: "Prospect Name",
            type: "string",
            order: 1,
        },
        prospect_email: {
            label: "Prospect Email",
            type: "string",
            order: 2,
        },
        prospect_phone_number: {
            label: "Prospect Phone Number",
            type: "string",
            order: 3,
        },
        message: {
            label: "Message",
            type: "draft",
            order: 4,
        },
        status: {
            label: "Status",
            type: "chip",
            values: ["pending", "sent", "bounced", "skipped"],
            order: 5,
        },
        sender_email: {
            label: "Sender Email",
            type: "string",
            order: 6,
        },
        scheduled_time: {
            label: "Scheduled Time",
            type: "datetime_millis",
            order: 7,
        },
        created_on: {
            label: "Created On",
            type: "datetime_millis",
            order: 8,
        },
    };

    let queryObj = {
        account: accountId,
        message_scheduled_time: { $exists: true },
    };

    let spmsDocsPromise = SequenceProspectMessageSchedule.find(queryObj)
        .sort("-created_on")
        .skip((pageNum - 1) * limit)
        .limit(limit)
        .populate("contact")
        .lean();

    let numOfPagesPromise =
        SequenceProspectMessageSchedule.countDocuments(queryObj);

    let [spmsDocs, numOfDocs] = await Promise.all([
        spmsDocsPromise,
        numOfPagesPromise,
    ]);
    logg.info(`spmsDocs.length: ${spmsDocs.length}`);
    if (spmsDocs.length < 10) {
        logg.info(`spmsDocs: ${JSON.stringify(spmsDocs)}`);
    }
    logg.info(`numOfDocs: ${numOfDocs}`);

    let numOfPages = Math.ceil(numOfDocs / limit);
    logg.info(`numOfPages: ${numOfPages}`);

    if (!spmsDocs.length) {
        logg.info(`no spmsDocs found`);
        return [{ numOfPages, data: [], headers }, null];
    }

    let data = [];
    let userIdSet = new Set();
    for (let i = 0; i < spmsDocs.length; i++) {
        let spmsDoc = spmsDocs[i];
        let contact = spmsDoc.contact || {};
        let toName = contact.first_name || "";
        if (contact.last_name) toName += " " + contact.last_name;

        let senderUserId = spmsDoc.sender.toString();
        let item = {
            _id: spmsDoc._id,
            prospect_name: toName || contact.email || "",
            prospect_email: contact.email || "",
            prospect_phone_number: contact.phone_number || "",
            message: {
                subject: spmsDoc.message_subject || "",
                body: spmsDoc.message_body || "",
            },
            status: spmsDoc.message_status,
            scheduled_time: new Date(spmsDoc.message_scheduled_time).getTime(),
            created_on: new Date(spmsDoc.created_on).getTime(),
            sender_id: senderUserId,
        };

        userIdSet.add(senderUserId);

        data.push(item);
    }

    let userIds = Array.from(userIdSet);
    let [userObjMap, userErr] = await UserUtils.getUsersInfoByIds(
        { userIds },
        { txid }
    );
    if (userErr) throw userErr;

    for (let i = 0; i < data.length; i++) {
        let item = data[i];
        let senderUserId = item.sender_id;
        let userObj = userObjMap[senderUserId];
        item.sender_email = userObj && userObj.email;
        // remove sender_id from item
        delete item.sender_id;
    }

    logg.info(`ended`);
    return [{ numOfPages, data, headers }, null];
}

export const getAllSequenceEmails = functionWrapper(
    fileName,
    "getAllSequenceEmails",
    _getAllSequenceEmails
);

async function _getProspectActivityTimeline(
    { accountId, sequenceId, sequenceProspectId, userTimezone },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    if (!accountId) throw `accountId is invalid`;
    if (!sequenceId) throw `sequenceId is invalid`;
    if (!sequenceProspectId) throw `sequenceProspectId is invalid`;

    // let seqProspectQueryObj = {
    //     _id: sequenceProspectId,
    //     account: accountId,
    // };
    // let seqProspectDc = await SequenceProspect.findOne(
    //     seqProspectQueryObj
    // ).lean();
    // logg.info(`seqProspectDc: ${JSON.stringify(seqProspectDc)}`);

    // if (!seqProspectDc) {
    //     throw `failed to find seqProspectDc for sequenceProspectId: ${sequenceProspectId}`;
    // }

    // let spmsQueryObj = {
    //     account: accountId,
    //     sequence: sequenceId,
    //     sequence_prospect: sequenceProspectId,
    // };

    // let spmsDocs = await SequenceProspectMessageSchedule.find(spmsQueryObj)
    //     .sort("created_on")
    //     .lean();
    // logg.info(`spmsDocs: ${JSON.stringify(spmsDocs)}`);

    // if (!spmsDocs.length) {
    //     logg.info(`no spmsDocs found`);
    //     return [[], null];
    // }

    let [anayticsInfo, anayticsErr] =
        await AnalyticUtils.getSequenceProspectAnalytics(
            { accountId, sequenceProspectId, formatInfo: true },
            { txid }
        );
    if (anayticsErr) throw anayticsErr;

    let result = [];
    if (!anayticsInfo) {
        logg.info(`no anayticsInfo found`);
        anayticsInfo = [];
    }

    for (let i = 0; i < anayticsInfo.length; i++) {
        let item = anayticsInfo[i];
        /*
        item format: {
                date_time, // in milliseconds
                action_type, // "sent", "sent_bounced", "opened", "replied"
            }
        */
        let dateTime = item.date_time;
        let actionType = item.action_type;
        let messageType = "email";

        let str = "";
        // using dateTime, actionType and messageType, format into human readable string and store in str and then add it to result field

        // if userTimezone is not provided, then use UTC timezone
        if (!userTimezone) userTimezone = "UTC";

        // format to date time string like "2 April 2024, 10:30 AM"
        let formatStr = "D MMMM YYYY, h:mm A";
        let dateTimeStr = momenttz(dateTime).tz(userTimezone).format(formatStr);

        if (actionType === "sent") {
            str = `${messageType} sent at ${dateTimeStr}`;
        } else if (actionType === "sent_bounced") {
            str = `${messageType} sent but bounced at ${dateTimeStr}`;
        } else if (actionType === "sent_skipped") {
            str = `${messageType} skipped at ${dateTimeStr}`;
        } else if (actionType === "opened") {
            str = `${messageType} opened at ${dateTimeStr}`;
        } else if (actionType === "replied") {
            str = `${messageType} replied at ${dateTimeStr}`;
        }

        result.push(str);
    }

    logg.info(`result: ${JSON.stringify(result)}`);
    logg.info(`ended`);
    return [result, null];
}

export const getProspectActivityTimeline = functionWrapper(
    fileName,
    "getProspectActivityTimeline",
    _getProspectActivityTimeline
);

async function _campaignProspectBounceWebhook(
    { campaignSequenceId, serviceName, secretId, accountId },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    if (!campaignSequenceId) throw `campaignSequenceId is invalid`;
    if (!serviceName) throw `serviceName is invalid`;

    let queryObj = { _id: campaignSequenceId, account: accountId };
    let campaignSequence = await SequenceModel.findOne(queryObj).lean();
    logg.info(`campaignSequence: ${JSON.stringify(campaignSequence)}`);
    if (!campaignSequence) {
        throw `failed to find campaignSequence for campaignSequenceId: ${campaignSequenceId}`;
    }

    let prospectVerifyData =
        campaignSequence && campaignSequence.prospect_verify_data;

    let prospectVerifyFileId = prospectVerifyData && prospectVerifyData.file_id;

    let [result, err] = await ProspectVerifyUtils.prospectBounceWebhook(
        { serviceName, secretId, prospectVerifyFileId, accountId },
        { txid }
    );

    let { validProspectEmails, invalidProspectEmails } = result;

    invalidProspectEmails = invalidProspectEmails || [];

    if (invalidProspectEmails.length) {
        let [removeResp, removeErr] = await removeInvalidProspectsFromCampaign(
            { campaignSequenceId, invalidProspectEmails, accountId },
            { txid }
        );
        if (removeErr) throw removeErr;
    }

    if (prospectVerifyData) {
        prospectVerifyData.status = "completed";
    }

    let seqUpdateResp = await SequenceModel.updateOne(queryObj, {
        $set: { prospect_verify_data: prospectVerifyData },
    });
    logg.info(`seqUpdateResp: ${JSON.stringify(seqUpdateResp)}`);

    logg.info(`ended`);
    return [true, null];
}

export const campaignProspectBounceWebhook = functionWrapper(
    fileName,
    "campaignProspectBounceWebhook",
    _campaignProspectBounceWebhook
);

async function _removeInvalidProspectsFromCampaign(
    { campaignSequenceId, invalidProspectEmails, accountId },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    if (!campaignSequenceId) throw `campaignSequenceId is invalid`;
    if (!invalidProspectEmails || !invalidProspectEmails.length) {
        logg.info(`invalidProspectEmails is empty`);
        return [true, null];
    }

    // get contactIds for invalidProspectEmails
    // then remove the docs from the SequenceProspect collection
    // then remove the docs from the SequenceProspectMessageSchedule collection

    let [contacts, contactsErr] = await CrmContactUtils.getContactByEmails(
        { emails: invalidProspectEmails, accountId },
        { txid }
    );
    if (contactsErr) throw contactsErr;

    let contactIds = contacts.map((x) => {
        let id = x._id;
        id = typeof id === "object" ? id.toString() : id;
        return id;
    });

    let seqProspectQueryObj = {
        account: accountId,
        contact: { $in: contactIds },
    };
    let seqProspects = await SequenceProspect.find(seqProspectQueryObj).lean();
    logg.info(`seqProspects.length: ${seqProspects.length}`);

    let seqProspectIds = seqProspects.map((x) => x._id);
    let seqProspectRemoveResp = await SequenceProspect.deleteMany({
        _id: { $in: seqProspectIds },
    });

    logg.info(
        `seqProspectRemoveResp: ${JSON.stringify(seqProspectRemoveResp)}`
    );

    let spmsQueryObj = {
        account: accountId,
        sequence_prospect: { $in: seqProspectIds },
    };

    let spmsRemoveResp = await SequenceProspectMessageSchedule.deleteMany(
        spmsQueryObj
    );
    logg.info(`spmsRemoveResp: ${JSON.stringify(spmsRemoveResp)}`);

    logg.info(`ended`);
    return [true, null];
}

const removeInvalidProspectsFromCampaign = functionWrapper(
    fileName,
    "removeInvalidProspectsFromCampaign",
    _removeInvalidProspectsFromCampaign
);

async function _hasProspectRepliedToPreviousStep(
    {
        sequenceId,
        sequenceProspectId,
        currentSpmsId,
        currentSequenceStepId,
        accountId,
    },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    if (!accountId) throw `sequenceId is invalid`;
    if (!sequenceId) throw `sequenceId is invalid`;
    if (!sequenceProspectId) throw `sequenceProspectId is invalid`;
    if (!currentSpmsId) throw `currentSpmsId is invalid`;
    if (!currentSequenceStepId) throw `currentSequenceStepId is invalid`;

    let seqStepsQueryObj = { sequence: sequenceId, account: accountId };
    let seqSteps = await SequenceStep.find(seqStepsQueryObj)
        .sort("order")
        .lean();
    logg.info(`seqSteps.length: ${seqSteps.length}`);
    logg.info(`seqSteps: ${JSON.stringify(seqSteps)}`);

    let prevSeqStepId = null;
    for (let i = 0; i < seqSteps.length; i++) {
        let seqStep = seqSteps[i];
        if (seqStep._id === currentSequenceStepId) {
            break;
        }
        prevSeqStepId = seqStep._id;
    }

    if (!prevSeqStepId) {
        logg.info(`no previous seqStepId found. So returning false`);
        logg.info(`ended`);
        return [false, null];
    }

    let queryObj = {
        sequence: sequenceId,
        sequence_prospect: sequenceProspectId,
        sequence_step: prevSeqStepId,
    };

    let prevSpmsDoc = await SequenceProspectMessageSchedule.findOne(
        queryObj
    ).lean();
    logg.info(`prevSpmsDoc: ${JSON.stringify(prevSpmsDoc)}`);

    if (!prevSpmsDoc) {
        throw `failed to find prevSpmsDoc for queryObj: ${JSON.stringify(
            queryObj
        )}`;
    }

    let prevMessageStatus = prevSpmsDoc.message_status;
    let prevMessageResponse = prevSpmsDoc.message_response;
    if (prevMessageStatus === "skipped") {
        let prevMessageReason =
            prevMessageResponse && prevMessageResponse.reason;
        if (prevMessageReason === "prospect_replied_to_previous_step") {
            logg.info(
                `since prospect replied to some old previous step, so considering as replied`
            );
            let result = prevMessageResponse && prevMessageResponse.data;
            logg.info(`result: ${JSON.stringify(result)}`);
            logg.info(`ended`);
            return [result, null];
        } else {
            logg.info(`since prospect did not reply to some old previous step`);
            logg.info(`ended`);
            return [false, null];
        }
    }

    let emailThreadId =
        prevMessageResponse && prevMessageResponse.email_thread_id;
    let senderUserId = prevSpmsDoc.sender;
    if (emailThreadId && senderUserId) {
        let [senderAuthObj, authObjErr] =
            await GoogleUtils.refreshOrReturnToken(
                { userId: senderUserId, returnBackAuthObj: true },
                { txid }
            );
        if (authObjErr) throw authObjErr;

        let [hasReplied, hasRepliedErr] = await GoogleUtils.hasEmailReplied(
            { emailThreadId, senderAuthObj },
            { txid }
        );
        if (hasRepliedErr) throw hasRepliedErr;
        if (hasReplied) {
            hasReplied.replied_sequence_step_id = prevSeqStepId;
        }
        logg.info(`hasReplied: ${JSON.stringify(hasReplied)}`);
        logg.info(`ended`);
        return [hasReplied, null];
    }

    logg.info(`ended with false`);
    return [false, null];
}

const hasProspectRepliedToPreviousStep = functionWrapper(
    fileName,
    "hasProspectRepliedToPreviousStep",
    _hasProspectRepliedToPreviousStep
);

async function _setupEmailReplyWebhook(
    { accountId, userId, ignoreIfAlreadyExists = false },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    if (!accountId) throw `accountId is invalid`;
    if (!userId) throw `userId is invalid`;

    let [userObj, userErr] = await UserUtils.getUserById(
        { id: userId },
        { txid }
    );
    if (userErr) throw userErr;

    let userEmail = userObj.email;
    let userAccountType = userObj.account_type;

    if (!userAccountType || userAccountType === "google") {
        let [googleResp, googleErr] = await setupGoogleEmailReplyWebhook(
            { userEmail, accountId, ignoreIfAlreadyExists },
            { txid }
        );
        if (googleErr) throw googleErr;

        logg.info(`ended`);
        return [googleResp, null];
    } else {
        throw `accountType: ${userAccountType} is not supported`;
    }
}

export const setupEmailReplyWebhook = functionWrapper(
    fileName,
    "setupEmailReplyWebhook",
    _setupEmailReplyWebhook
);

async function _setupGoogleEmailReplyWebhook(
    { userEmail, accountId, ignoreIfAlreadyExists = false },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    if (!userEmail) throw `userEmail is invalid`;
    if (!accountId) throw `accountId is invalid`;

    let isGPubSubEnabled = GoogleUtils.isGooglePubSubEnabled(
        { userEmail },
        { txid }
    );
    if (!isGPubSubEnabled) {
        logg.info(`Google PubSub is not enabled for userEmail: ${userEmail}`);
        logg.info(`ended`);
        return [true, null];
    }

    let [authObj, authObjErr] = await GoogleUtils.refreshOrReturnToken(
        { email: userEmail, returnBackAuthObj: true },
        { txid }
    );
    if (authObjErr) throw authObjErr;

    let [watchResp, watchErr] = await GoogleUtils.setupWatchEmailReplyWebhook(
        {
            authObj,
            accountId,
            storeInDb: true,
            userEmail,
            ignoreIfAlreadyExists,
        },
        { txid }
    );
    if (watchErr) throw watchErr;

    logg.info(`ended`);
    return [watchResp, null];
}

const setupGoogleEmailReplyWebhook = functionWrapper(
    fileName,
    "setupGoogleEmailReplyWebhook",
    _setupGoogleEmailReplyWebhook
);

async function _handleGooglePubSubWebhook(
    {
        userEmail,
        historyId,
        pubSubMessageId,
        pubSubPublishTime,
        subscriptionName,
    },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    if (!userEmail) throw `userEmail is invalid`;
    if (!historyId) throw `historyId is invalid`;
    if (!pubSubMessageId) throw `pubSubMessageId is invalid`;
    if (!pubSubPublishTime) throw `pubSubPublishTime is invalid`;
    if (!subscriptionName) throw `subscriptionName is invalid`;

    let [authObj, authObjErr] = await GoogleUtils.refreshOrReturnToken(
        { email: userEmail, returnBackAuthObj: true },
        { txid }
    );
    if (authObjErr) throw authObjErr;

    let isGPubSubEnabled = GoogleUtils.isGooglePubSubEnabled(
        { userEmail },
        { txid }
    );
    if (!isGPubSubEnabled) {
        logg.info(`Google PubSub is not enabled for userEmail: ${userEmail}`);
        logg.info(`ended`);
        return [true, null];
    }

    let [prevHistoryId, updateHistoryErr] =
        await GoogleUtils.updateHistoryIdForUser(
            {
                userEmail,
                historyId,
                pubSubMessageId,
                pubSubPublishTime,
                returnPrevHistoryId: true,
            },
            { txid }
        );
    if (updateHistoryErr) throw updateHistoryErr;

    let [userInfo, userInfoErr] = await UserUtils.getUserObjByEmail(
        { email: userEmail },
        { txid }
    );
    if (userInfoErr) throw userInfoErr;

    let userId = userInfo._id;
    userId = typeof userId === "string" ? userId : userId.toString();

    let [messages, messagesErr] = await GoogleUtils.getHistoryMessages(
        { authObj, historyId: prevHistoryId, getMessageDetails: true },
        { txid }
    );
    if (messagesErr) throw messagesErr;

    /*
     * messages structure: [{ threadId, messageId }]
     */

    if (!messages || !messages.length) {
        logg.info(`no messages found for historyId: ${historyId}`);
        logg.info(`ended`);
        return [true, null];
    }

    let [{ matchingMessageData, notMatchingMessages }, spsmErr] =
        await getSpmsDocsForMessages({ messages, userId }, { txid });
    if (spsmErr) throw spsmErr;
    /*
     * matchingMessageData structure: [{ threadId, messageId, spmsDoc}]
     * notMatchingMessages structure: [{ threadId, messageId }]
     *  * We will use notMatchingMessages to further check whether the message was sent by 1 sender but since the message had "Reply-To" header, it was sent to another email.
     *  * So we will further check this using "notMatchingMessages"
     */

    let [replyToMsgResp, replyToMsgErr] =
        await checkIfRepliedToMessagesSentByAnotherSender(
            { messages: notMatchingMessages, userInfo, userAuthObj: authObj },
            { txid, sendErrorMsg: true }
        );

    if (!matchingMessageData || !matchingMessageData.length) {
        logg.info(`no replies found for messages sent by QRev campaigns`);
        logg.info(`ended`);
        return [true, null];
    }

    let [messageDetailsResp, messageDetailsErr] =
        await GoogleUtils.getEmailMessageDetails(
            {
                authObj,
                messages: matchingMessageData,
                addDetailsToMessages: true,
            },
            { txid }
        );
    if (messageDetailsErr) throw messageDetailsErr;

    /*
     * matchingMessageData structure: [{ threadId, messageId, spmsDoc, messageData }]
     */

    let result = GoogleUtils.markMessagesWithValidReply(
        { messages: matchingMessageData },
        { txid }
    );

    if (!result || !result.length) {
        logg.info(
            `no actual replies found for messages sent by QRev campaigns`
        );
        logg.info(`ended`);
        return [true, null];
    }

    let [updateResp, updateErr] = await updateMessageReplies(
        { messages: result, userId },
        { txid }
    );
    if (updateErr) throw updateErr;

    logg.info(`ended`);
    return [true, null];
}

export const handleGooglePubSubWebhook = functionWrapper(
    fileName,
    "handleGooglePubSubWebhook",
    _handleGooglePubSubWebhook
);

/*
 * get all the spmsDocs for the messages with matching "message_response.email_thread_id" with sender as userId
 * messages structure: [{ threadId, messageId }]
 * response structure: [{ threadId, messageId, spmsDoc}]
 */
async function _getSpmsDocsForMessages(
    { messages, userId },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    if (!messages || !messages.length) throw `messages is invalid`;
    if (!userId) throw `userId is invalid`;

    let emailThreadIds = messages
        .filter((x) => x.threadId)
        .map((x) => x.threadId);

    let emailMessageIds = messages
        .filter((x) => x.messageId)
        .map((x) => x.messageId);

    /*
     * get all the spmsDocs for the messages with matching "message_response.email_thread_id" with sender as userId
     * but the message should not be in emailMessageIds. because we are looking for replies and replies will have different messageId
     */
    let spmsQueryObj = {
        sender: userId,
        "message_response.email_thread_id": { $in: emailThreadIds },
        "message_response.email_sent_id": { $nin: emailMessageIds },
    };
    let spmsDocs = await SequenceProspectMessageSchedule.find(
        spmsQueryObj
    ).lean();

    logg.info(`spmsDocs.length: ${spmsDocs.length}`);
    if (spmsDocs.length < 20) {
        logg.info(`spmsDocs: ${JSON.stringify(spmsDocs)}`);
    }

    let matchingMessageData = [];
    let notMatchingMessages = [];
    for (let i = 0; i < messages.length; i++) {
        let message = messages[i];
        let threadId = message.threadId;
        let spmsDoc = spmsDocs.find(
            (x) =>
                x.message_response &&
                x.message_response.email_thread_id === threadId
        );
        let isRepliedMessage = checkIfItIsRepliedMessage(
            { spmsDoc, messageId: message.messageId },
            { txid }
        );
        if (!spmsDoc) {
            logg.info(`no spmsDoc found for threadId: ${threadId}`);
            notMatchingMessages.push(message);
            continue;
        }

        if (isRepliedMessage) {
            logg.info(
                `this is a replied message. So skipping. spmsId: ${spmsDoc._id}`
            );
            continue;
        }

        let item = { ...message, spmsDoc };
        matchingMessageData.push(item);
    }

    logg.info(`matchingMessageData.length: ${matchingMessageData.length}`);
    if (matchingMessageData.length < 20) {
        logg.info(
            `matchingMessageData: ${JSON.stringify(matchingMessageData)}`
        );
    }

    logg.info(`ended`);

    return [{ matchingMessageData, notMatchingMessages }, null];
}

const getSpmsDocsForMessages = functionWrapper(
    fileName,
    "getSpmsDocsForMessages",
    _getSpmsDocsForMessages
);

/*
 * messages structure: [{ threadId, messageId, spmsDoc, messageData, isFailed }]
 */
async function _updateMessageReplies({ messages }, { txid, logg, funcName }) {
    logg.info(`started`);
    if (!messages || !messages.length) throw `messages is invalid`;

    let updatePromises = [];
    for (let i = 0; i < messages.length; i++) {
        let message = messages[i];
        let { threadId, messageId, spmsDoc, messageData, isFailed } = message;
        let promise = updateSequenceStepMessageReply(
            { threadId, messageId, spmsDoc, messageData, isFailed },
            { txid, sendErrorMsg: true }
        );
        updatePromises.push(promise);
    }

    let updateResults = await Promise.all(updatePromises);

    // if any of the update fails, then log the error and count the number of failures
    let numOfFailures = 0;
    for (let i = 0; i < updateResults.length; i++) {
        let [updateResp, updateErr] = updateResults[i];
        if (updateErr) {
            logg.error(`${i}: updateErr: ${updateErr}`);
            numOfFailures++;
        }
    }

    logg.info(`numOfFailures: ${numOfFailures}`);

    logg.info(`ended`);
    return [true, null];
}

const updateMessageReplies = functionWrapper(
    fileName,
    "updateMessageReplies",
    _updateMessageReplies
);

async function _updateSequenceStepMessageReply(
    { threadId, messageId, spmsDoc, messageData, isFailed },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    if (!threadId) throw `threadId is invalid`;
    if (!messageId) throw `messageId is invalid`;
    if (!spmsDoc) throw `spmsDoc is invalid`;
    if (!messageData) throw `messageData is invalid`;

    let spmsUpdateObj = { updated_on: new Date() };

    let spmsQueryObj = { _id: spmsDoc._id };

    if (isFailed) {
        spmsUpdateObj.message_status = "bounced";
    } else {
        spmsQueryObj.has_message_been_replied = true;
    }

    let spmsUpdateResp = await SequenceProspectMessageSchedule.updateOne(
        spmsQueryObj,
        spmsUpdateObj
    );
    logg.info(`spmsUpdateResp: ${JSON.stringify(spmsUpdateResp)}`);

    let messageHeaders =
        messageData && messageData.payload && messageData.payload.headers;
    let repliedOnDate = new Date();
    if (messageHeaders && messageHeaders.length) {
        /*
        * Date Header to be found:
        {
            "name": "Date",
            "value": "Thu, 6 Jun 2024 12:22:12 +0530"
        }
        */
        let dateHeader = messageHeaders.find((x) => x.name === "Date");
        if (dateHeader) {
            let dateStr = dateHeader.value;
            try {
                repliedOnDate = new Date(dateStr);
            } catch (e) {
                logg.error(`failed to parse dateStr: ${dateStr}`);
            }
        }
    }

    let [ReplyAnalyticResp, ReplyAnalyticErr] =
        await AnalyticUtils.storeCampaignMessageReplyAnalytic(
            {
                sessionId: spmsDoc.analytic_session_id,
                spmsId: spmsDoc._id,
                accountId: spmsDoc.account,
                sequenceId: spmsDoc.sequence,
                contactId: spmsDoc.contact,
                sequenceStepId: spmsDoc.sequence_step,
                sequenceProspectId: spmsDoc.sequence_prospect,
                messageId,
                messageDetails: messageData,
                repliedOnDate,
                isFailed,
            },
            { txid }
        );
    if (ReplyAnalyticErr) throw ReplyAnalyticErr;

    if (isFailed) {
        // update SequenceProspect.status to "bounced"
        let spQueryObj = { _id: spmsDoc.sequence_prospect };
        let spUpdateObj = { status: "bounced" };
        let spUpdateResp = await SequenceProspect.updateOne(
            spQueryObj,
            spUpdateObj
        );
        logg.info(`bounce-spUpdateResp: ${JSON.stringify(spUpdateResp)}`);
    }

    logg.info(`ended`);
    return [true, null];
}

const updateSequenceStepMessageReply = functionWrapper(
    fileName,
    "updateSequenceStepMessageReply",
    _updateSequenceStepMessageReply
);

async function _prospectClickedUnsubscribeLink(
    { ssmid },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    if (!ssmid) throw `ssmid is invalid`;

    let queryObj = { _id: ssmid };
    let spmsDoc = await SequenceProspectMessageSchedule.findOne(
        queryObj
    ).lean();
    logg.info(`spmsDoc: ${JSON.stringify(spmsDoc)}`);

    if (!spmsDoc) {
        throw `failed to find spmsDoc for ssmid: ${ssmid}`;
    }

    let updateObj = {
        $addToSet: {
            unsubscribe_activities: {
                type: "email_unsubscribe_clicked",
                time: new Date().toISOString(),
            },
        },
    };

    let updateResp = await SequenceProspectMessageSchedule.updateOne(
        queryObj,
        updateObj
    );
    logg.info(`updateResp: ${JSON.stringify(updateResp)}`);

    logg.info(`ended`);
    return [updateResp, null];
}

export const prospectClickedUnsubscribeLink = functionWrapper(
    fileName,
    "prospectClickedUnsubscribeLink",
    _prospectClickedUnsubscribeLink
);

async function _prospectConfirmedUnsubscribeLink(
    { ssmid },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    if (!ssmid) throw `ssmid is invalid`;

    let queryObj = { _id: ssmid };
    let spmsDoc = await SequenceProspectMessageSchedule.findOne(queryObj)
        .populate("contact")
        .lean();
    logg.info(`spmsDoc: ${JSON.stringify(spmsDoc)}`);

    if (!spmsDoc) {
        throw `failed to find spmsDoc for ssmid: ${ssmid}`;
    }

    let contactDoc = spmsDoc.contact;

    let updateObj = {
        $addToSet: {
            unsubscribe_activities: {
                type: "email_unsubscribe_confirmed",
                time: new Date().toISOString(),
            },
        },
    };

    let updateResp = await SequenceProspectMessageSchedule.updateOne(
        queryObj,
        updateObj
    );
    logg.info(`updateResp: ${JSON.stringify(updateResp)}`);

    let [unsubscribeResp, unsubscribeErr] = await addProspectToUnsubscribeList(
        { spmsDoc, contactDoc },
        { txid }
    );
    if (unsubscribeErr) throw unsubscribeErr;

    let [analyticsResp, analyticsErr] =
        await AnalyticUtils.storeCampaignMessageUnsubscribeAnalytic(
            {
                sessionId: spmsDoc.analytic_session_id,
                spmsId: spmsDoc._id,
                accountId: spmsDoc.account,
                sequenceId: spmsDoc.sequence,
                contactId: contactDoc._id,
                sequenceStepId: spmsDoc.sequence_step,
                sequenceProspectId: spmsDoc.sequence_prospect,
            },
            { txid }
        );
    if (analyticsErr) throw analyticsErr;

    logg.info(`ended`);
    return [updateResp, null];
}

export const prospectConfirmedUnsubscribeLink = functionWrapper(
    fileName,
    "prospectConfirmedUnsubscribeLink",
    _prospectConfirmedUnsubscribeLink
);

async function _addProspectToUnsubscribeList(
    { spmsDoc, contactDoc },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    if (!spmsDoc) throw `spmsDoc is invalid`;

    let spmsId = spmsDoc._id;
    let accountId = spmsDoc.account;
    accountId =
        typeof accountId === "object" ? accountId.toString() : accountId;
    let senderUserId = spmsDoc.sender;
    let prospectEmail = contactDoc.email.trim().toLowerCase();
    let contactId = contactDoc._id;

    let queryObj = { account: accountId, prospect_email: prospectEmail };
    let updateObj = {
        sequence_prospect_message: spmsId,
        contact: contactId,
        sender: senderUserId,
        updated_on: new Date(),
    };

    let unsubscribeListDoc =
        await CampaignEmailUnsubscribeList.findOneAndUpdate(
            queryObj,
            updateObj,
            { upsert: true, new: true }
        ).lean();

    logg.info(`unsubscribeListDoc: ${JSON.stringify(unsubscribeListDoc)}`);

    logg.info(`ended`);
    return [unsubscribeListDoc, null];
}

const addProspectToUnsubscribeList = functionWrapper(
    fileName,
    "addProspectToUnsubscribeList",
    _addProspectToUnsubscribeList
);

/*
 * Created on 16th June 2024
 * This will return headers and data for the sequence open analytics
 * headers will be like sequence_prospect (hidden),prospect_email (Prospect Email), prospect_name (Prospect Name), count (Num of times opened), last_opened_on (Last Opened On)
 * data will be array of objects with above headers as keys
 */
async function _getSequenceOpenAnalytics(
    { accountId, sequenceId, sequenceStepId },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    if (!accountId) throw `accountId is invalid`;
    if (!sequenceId) throw `sequenceId is invalid`;

    const headers = {
        sequence_prospect: {
            label: "Prospect ID",
            type: "string",
            hidden: true,
            order: 0,
        },
        prospect_email: {
            label: "Prospect Email",
            type: "string",
            order: 1,
        },
        prospect_name: {
            label: "Prospect Name",
            type: "string",
            order: 2,
        },
        count: {
            label: "Num of times opened",
            type: "number",
            order: 3,
        },
        last_opened_on: {
            label: "Last Opened On",
            type: "datetime_millis",
            order: 4,
        },
    };

    let [data, dataErr] = await AnalyticUtils.getSequenceOpenAnalytics(
        { accountId, sequenceId, sequenceStepId },
        { txid }
    );
    if (dataErr) throw dataErr;

    logg.info(`ended`);
    return [{ headers, data }, null];
}

export const getSequenceOpenAnalytics = functionWrapper(
    fileName,
    "getSequenceOpenAnalytics",
    _getSequenceOpenAnalytics
);

/*
 * Created on 16th June 2024
 * This will return headers and data for the sequence reply analytics
 * headers will be like sequence_prospect_message (hidden),prospect_email (Prospect Email), prospect_name (Prospect Name), reply (Reply), replied_on (Replied On)
 * data will be array of objects with above headers as keys
 */
async function _getSequenceReplyAnalytics(
    { accountId, sequenceId, sequenceStepId },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    if (!accountId) throw `accountId is invalid`;
    if (!sequenceId) throw `sequenceId is invalid`;

    const headers = {
        sequence_prospect_message: {
            label: "Sequence Prospect Message ID",
            type: "string",
            hidden: true,
            order: 0,
        },
        prospect_email: {
            label: "Prospect Email",
            type: "string",
            order: 1,
        },
        prospect_name: {
            label: "Prospect Name",
            type: "string",
            order: 2,
        },
        reply: {
            label: "Reply",
            type: "string",
            order: 3,
        },
        replied_on: {
            label: "Replied On",
            type: "datetime_millis",
            order: 4,
        },
    };

    let [data, dataErr] = await AnalyticUtils.getSequenceReplyAnalytics(
        { accountId, sequenceId, sequenceStepId },
        { txid }
    );
    if (dataErr) throw dataErr;

    logg.info(`ended`);
    return [{ headers, data }, null];
}

export const getSequenceReplyAnalytics = functionWrapper(
    fileName,
    "getSequenceReplyAnalytics",
    _getSequenceReplyAnalytics
);

/*
result columns: 
    "campaign name"
    "email name" (seq step number) (Ex: "Email 1")
    "contacted"
    "delivered"
    "delivered %"
    "opens"
    "unique opens"
    "unique opens %"
    "replies"
    "failed delivery"
    "failed delivery %"
    "email id of who opened"
    "actual replies"
*/
async function _generateSequencesAnalyticsCsv(
    { sequenceIds, accountId, csvFilePath },
    { txid, logg, funcName }
) {
    if (!sequenceIds || !sequenceIds.length) throw `sequenceIds is invalid`;
    if (!accountId) throw `accountId is invalid`;

    let result = [];
    for (let i = 0; i < sequenceIds.length; i++) {
        let sequenceId = sequenceIds[i];
        let [sequenceAnalytics, sequenceAnalyticsErr] =
            await generateSequenceAnalytics(
                { sequenceId, accountId },
                { txid }
            );
        if (sequenceAnalyticsErr) throw sequenceAnalyticsErr;

        result = result.concat(sequenceAnalytics);
    }

    if (result.length && csvFilePath) {
        let [res, err] = await FileUtils.writeJsonArrayToCsvFile(
            { csvPath: csvFilePath, data: result },
            { txid }
        );
        if (err) throw err;
    }

    return [result, null];
}

export const generateSequencesAnalyticsCsv = functionWrapper(
    fileName,
    "generateSequencesAnalyticsCsv",
    _generateSequencesAnalyticsCsv
);

/*
result columns: 
    "campaign name"
    "email name" (seq step number) (Ex: "Email 1")
    "contacted"
    "delivered"
    "delivered %"
    "opens"
    "unique opens"
    "unique opens %"
    "replies"
    "failed delivery"
    "failed delivery %"
    "email id of who opened"
    "actual replies"
*/
async function _generateSequenceAnalytics(
    { sequenceId, accountId },
    { txid, logg, funcName }
) {
    logg.info(`started for sequenceId: ${sequenceId}`);
    if (!sequenceId) throw `sequenceId is invalid`;
    if (!accountId) throw `accountId is invalid`;

    let seqQueryObj = { _id: sequenceId, account: accountId };
    let sequenceDoc = await SequenceModel.findOne(seqQueryObj).lean();
    if (!sequenceDoc) {
        throw `failed to find sequenceDoc for sequenceId: ${sequenceId}`;
    }

    let sequenceName = sequenceDoc.name;

    let seqStepDocs = await SequenceStep.find({
        sequence: sequenceId,
        account: accountId,
    })
        .sort("order")
        .lean();
    let seqStepsCount = seqStepDocs.length;
    logg.info(`seqStepsCount: ${seqStepsCount}`);
    if (!seqStepsCount) throw `no seqSteps found for sequenceId: ${sequenceId}`;

    let seqStepEmailNames = [];
    for (let i = 1; i <= seqStepsCount; i++) {
        seqStepEmailNames.push(`Email ${i}`);
    }

    let result = [];

    let spmsDocs = await SequenceProspectMessageSchedule.find({
        sequence: sequenceId,
        account: accountId,
    })
        .select("_id message_status sequence_step")
        .lean();

    let groupedSpmsDocs = []; // [{seq_step_id, spmsDocs}]
    for (let i = 0; i < seqStepsCount; i++) {
        let seqStepDoc = seqStepDocs[i];
        let seqStepId = seqStepDoc._id;
        let spmsDocsForSeqStep = spmsDocs.filter(
            (x) => x.sequence_step === seqStepId
        );
        groupedSpmsDocs.push({
            seq_step_id: seqStepId,
            spmsDocs: spmsDocsForSeqStep,
        });
    }

    let [stepAnalytics, stepAnalyticsErr] =
        await AnalyticUtils.getSequenceStepAnalyticsForOpenAndReply(
            { sequenceId, accountId },
            { txid }
        );
    if (stepAnalyticsErr) throw stepAnalyticsErr;
    /*
        stepAnalytics structure: {
            sequence_step_id: {
                opened: {
                    total_count: 0,
                    unique_count: 0,
                    prospects: [{ email, count, last_opened_on }]
                }
                replied: {
                    total_count: 0,
                    prospects: [{ email, replied_on, reply }]
                }
            }
        }
    */

    for (let i = 0; i < seqStepsCount; i++) {
        let item = {
            "campaign name": sequenceName,
            "email name": seqStepEmailNames[i],
            contacted: 0,
            delivered: 0,
            "delivered %": "0%",
            opens: 0,
            "unique opens": 0,
            "unique opens %": 0,
            replies: 0,
            "failed delivery": 0,
            "failed delivery %": "0%",
            "email id of who opened": "",
            "actual replies": "",
        };

        let stepSpmsDocs = groupedSpmsDocs[i].spmsDocs;
        // get contacted as message_status with anything other than ("pending" or "skipped")
        item.contacted = stepSpmsDocs.filter(
            (x) =>
                x.message_status !== "pending" && x.message_status !== "skipped"
        ).length;
        // get count of message_status with "sent"
        item.delivered = stepSpmsDocs.filter(
            (x) => x.message_status === "sent"
        ).length;
        // calculate delivered % to 1 decimal place
        let deliveredPercent = 0;
        if (item.contacted) {
            deliveredPercent = (item.delivered / item.contacted) * 100;
            item["delivered %"] = deliveredPercent.toFixed(1) + "%";
        }

        // set failed delivery count as the difference between contacted and delivered
        item["failed delivery"] = item.contacted - item.delivered;

        // set failed delivery % as 100 - delivered % to 1 decimal place
        let failedDeliveryPercent = 0;
        if (item.contacted) {
            failedDeliveryPercent = 100 - deliveredPercent;
            item["failed delivery %"] = failedDeliveryPercent.toFixed(1) + "%";
        }

        let stepId = groupedSpmsDocs[i].seq_step_id;
        let stepAnalytic = stepAnalytics[stepId];
        if (stepAnalytic) {
            let opened = stepAnalytic.opened;
            let replied = stepAnalytic.replied;
            item.opens = opened.total_count || 0;
            item["unique opens"] = opened.unique_count || 0;

            // calculate unique opens % to 1 decimal place
            if (item.delivered) {
                let uniqueOpensPercent =
                    (opened.unique_count / item.delivered) * 100;
                item["unique opens %"] = uniqueOpensPercent.toFixed(1) + "%";
            }

            item.replies = replied.total_count || 0;

            /*
            for "email id of who opened", generate string like below:
            "ex@dom1.com (5) | ex2@dom2.com (1)"
            */
            item["email id of who opened"] = generateOpenedEmailsString(
                opened.prospects
            );

            /*
            for "actual replies", generate string like below:
            "(ex@dom1.com) reply_str | (ex2@dom2.com) reply_str"
            */
            item["actual replies"] = generateRepliesString(replied.prospects);
        }

        result.push(item);
    }

    logg.info(`ended for sequenceId: ${sequenceId}`);
    return [result, null];
}

const generateSequenceAnalytics = functionWrapper(
    fileName,
    "generateSequenceAnalytics",
    _generateSequenceAnalytics
);

/*
    prospectsData: [{ email, count, last_opened_on }]

    return string like below:
            "ex@dom1.com (5) | ex2@dom2.com (1)"
*/
function generateOpenedEmailsString(prospectsData) {
    let result = "";
    if (prospectsData && prospectsData.length) {
        let prospectsStr = prospectsData
            .map((x) => `${x.email} (${x.count})`)
            .join(" | ");
        result = prospectsStr;
    }
    return result;
}

/*
    prospectsData: [{ email, replied_on, reply }]

    return string like below:
            "((ex@dom1.com) reply_str | (ex2@dom2.com) reply_str"
*/
function generateRepliesString(prospectsData) {
    let result = "";
    if (prospectsData && prospectsData.length) {
        let repliesStr = prospectsData
            .map((x) => `(${x.email}) ${x.reply}`)
            .join(" | ");
        result = repliesStr;
    }
    return result;
}

async function _checkIfMessageSentForPrevSteps(
    {
        currentSequenceStepId,
        sequenceId,
        sequenceProspectId,
        prevSpmsDocs,
        returnBackSpmsDocs = false,
    },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    if (!sequenceId) throw `sequenceId is invalid`;
    if (!currentSequenceStepId) throw `currentSequenceStepId is invalid`;

    let seqStepsQueryObj = { sequence: sequenceId };
    let seqSteps = await SequenceStep.find(seqStepsQueryObj)
        .sort("order")
        .lean();

    let prevSeqStepIds = [];
    for (let i = 0; i < seqSteps.length; i++) {
        let seqStep = seqSteps[i];
        if (seqStep._id === currentSequenceStepId) {
            break;
        }
        prevSeqStepIds.push(seqStep._id);
    }

    if (!(prevSpmsDocs && prevSpmsDocs.length) && prevSeqStepIds.length) {
        let queryObj = {
            sequence: sequenceId,
            sequence_prospect: sequenceProspectId,
            sequence_step: { $in: prevSeqStepIds },
        };

        prevSpmsDocs = await SequenceProspectMessageSchedule.find(
            queryObj
        ).lean();

        // sort the prevSpmsDocs based on sequence_step order
        prevSpmsDocs.sort((a, b) => {
            let aSeqStepOrder = seqSteps.find(
                (x) => x._id === a.sequence_step
            ).order;
            let bSeqStepOrder = seqSteps.find(
                (x) => x._id === b.sequence_step
            ).order;
            return aSeqStepOrder - bSeqStepOrder;
        });
    }

    if (!prevSpmsDocs) {
        prevSpmsDocs = [];
    }

    // if atleast one of the previous steps is sent, then return true
    let hasPrevMessageSent = prevSpmsDocs.some(
        (x) => x.message_status === "sent" || x.message_status === "replied"
    );

    logg.info(`hasPrevMessageSent: ${hasPrevMessageSent}`);

    logg.info(`ended`);
    let result = hasPrevMessageSent;
    if (returnBackSpmsDocs) {
        result = { hasPrevMessageSent, prevSpmsDocs };
    }
    return [result, null];
}

const checkIfMessageSentForPrevSteps = functionWrapper(
    fileName,
    "checkIfMessageSentForPrevSteps",
    _checkIfMessageSentForPrevSteps
);

async function _sendReplyToMessage(
    { accountId, spmsId, spmsDoc, contactDoc },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    if (!accountId) throw `accountId is invalid`;

    if (!spmsDoc && spmsId) {
        let spmsQueryObj = { _id: spmsId, account: accountId };
        spmsDoc = await SequenceProspectMessageSchedule.findOne(spmsQueryObj)
            .populate("contact")
            .lean();
    }

    if (!spmsDoc) throw `spmsDoc is invalid for spmsId: ${spmsId}`;

    if (!contactDoc && spmsDoc.contact && spmsDoc.contact._id) {
        contactDoc = spmsDoc.contact;
    }

    if (!contactDoc) throw `contactDoc is invalid`;

    let contactFirstName = contactDoc.first_name || contactDoc.last_name || "";
    let contactEmail = contactDoc.email;
    if (!contactFirstName && contactEmail) {
        contactFirstName = contactEmail.split("@")[0];
    }

    let replyId = uuidv4();

    let htmlBody = `Any thoughts, ${contactFirstName}?`;

    let finalHtmlBody = convertToHtmlAndAddTags(
        {
            emailBody: htmlBody,
            campaignProspectId: spmsId,
            replyId,
        },
        { txid }
    );

    let senderUserId = spmsDoc.sender;
    let [senderAuthObj, authObjErr] = await GoogleUtils.refreshOrReturnToken(
        { userId: senderUserId, returnBackAuthObj: true },
        { txid }
    );
    if (authObjErr) throw authObjErr;

    let threadId = spmsDoc.message_response.email_thread_id;
    logg.info(`threadId: ${threadId}`);

    let subject = spmsDoc.message_subject || "";

    let [sendResp, sendErr] = await GoogleUtils.sendReplyToThread(
        {
            senderAuthObj,
            threadId,
            subject,
            replyMessage: finalHtmlBody,
            toEmailId: contactEmail,
        },
        { txid }
    );
    if (sendErr) throw sendErr;

    // update replies in spmsDoc db
    let replyObj = {
        reply_id: replyId,
        replied_on: new Date().toISOString(),
        reply: htmlBody,
        message_response: sendResp,
    };
    let updateObj = { $addToSet: { replies: replyObj } };
    let spmsUpdateResp = await SequenceProspectMessageSchedule.updateOne(
        { _id: spmsId, account: accountId },
        updateObj
    );
    logg.info(`spmsUpdateResp: ${JSON.stringify(spmsUpdateResp)}`);

    // store the reply in the analytics
    let [replyAnalyticResp, replyAnalyticErr] =
        await AnalyticUtils.storeAutoCampaignMessageReplyAnalytic(
            {
                sessionId: spmsDoc.analytic_session_id,
                spmsId,
                accountId,
                sequenceId: spmsDoc.sequence,
                contactId: contactDoc._id,
                sequenceStepId: spmsDoc.sequence_step,
                sequenceProspectId: spmsDoc.sequence_prospect,
                replyId,
                replyObj,
                repliedOnDate: new Date(),
            },
            { txid }
        );
    if (replyAnalyticErr) throw replyAnalyticErr;

    logg.info(`ended`);
    return [sendResp, null];
}

export const sendReplyToMessage = functionWrapper(
    fileName,
    "sendReplyToMessage",
    _sendReplyToMessage
);

function checkIfItIsRepliedMessage({ spmsDoc, messageId }, { txid }) {
    const funcName = "checkIfItIsRepliedMessage";
    const logg = logger.child({ txid, funcName });
    logg.info(`started`);

    if (!messageId) throw `messageId is invalid`;
    if (!spmsDoc) {
        logg.info(`spmsDoc is invalid. So returning false`);
        return false;
    }

    let replies = spmsDoc.replies || [];
    let isRepliedMessage = false;

    for (let i = 0; i < replies.length; i++) {
        let reply = replies[i];
        let messageResponse = reply && reply.message_response;
        let replyMessageId = messageResponse && messageResponse.id;
        if (replyMessageId === messageId) {
            logg.info(
                `found replied message for replyObj: ${JSON.stringify(reply)}`
            );
            isRepliedMessage = true;
            break;
        }
    }

    logg.info(`isRepliedMessage: ${isRepliedMessage}`);
    return isRepliedMessage;
}

/*
    * Logic reference doc: https://www.notion.so/thetrackapp/Auto-Reply-feature-when-prospects-open-the-message-46795b175da5487d8b372538f3d1b4e3
   
*/
async function _sendReplyAndDelayEmail(
    { spmsDoc, spmsId, accountId, contactDoc },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    let sequenceId = spmsDoc.sequence;

    let sequenceDoc = await SequenceModel.findOne({
        _id: sequenceId,
        account: accountId,
    }).lean();
    if (!sequenceDoc) {
        throw `failed to find sequenceDoc for sequenceId: ${sequenceId}`;
    }

    let currSeqProspectId = spmsDoc.sequence_prospect;
    let seqProspectQueryObj = { account: accountId, _id: currSeqProspectId };
    let seqProspectDoc = await SequenceProspect.findOne(
        seqProspectQueryObj
    ).lean();
    if (!seqProspectDoc) {
        throw `failed to find seqProspectDoc for currSeqProspectId: ${currSeqProspectId}`;
    }

    // 1. Check if any previous sequence-step message is sent to the prospect within the same campaign.
    let [prevMsgSentResp, prevMsgSentErr] =
        await checkIfMessageSentForPrevSteps(
            {
                currentSequenceStepId: spmsDoc.sequence_step,
                sequenceId,
                sequenceProspectId: spmsDoc.sequence_prospect,
                returnBackSpmsDocs: true,
            },
            { txid }
        );
    if (prevMsgSentErr) throw prevMsgSentErr;

    let { hasPrevMessageSent, prevSpmsDocs } = prevMsgSentResp;

    if (!hasPrevMessageSent) {
        logg.info(
            `no previous message sent. So no need to send reply & delaying.`
        );
        return [{ messageDelayed: false }, null];
    } else {
        logg.info(`previous messages were sent. So continuing.`);
    }

    let prevSpmsIds = prevSpmsDocs.map((x) => x._id);

    // 2. Check if any of the previous sequence-step messages were opened.
    let [prevMsgOpenMap, hasPrevMessagesOpenedErr] =
        await AnalyticUtils.checkIfAnySequenceMessageOpensFound(
            {
                sequenceId,
                accountId,
                spmsIds: prevSpmsIds,
                returnOpenMap: true,
            },
            { txid }
        );
    if (hasPrevMessagesOpenedErr) throw hasPrevMessagesOpenedErr;

    // prevMsgOpenMap format:  map of spmsId (key) -> count of opens (value)
    if (!prevMsgOpenMap || !Object.keys(prevMsgOpenMap).length) {
        logg.info(
            `no previous message opened. So no need to send reply & delaying.`
        );
        return [{ messageDelayed: false }, null];
    } else {
        logg.info(`previous messages were opened. So continuing.`);
    }

    // 3. Check if we have already sent an ‘Any thoughts, <<first_name>>?’ reply to any of the previous sequence-step messages.
    let [autoReplyAlreadySent, autoReplyCheckErr] =
        await AnalyticUtils.checkIfAutoReplyAlreadySent(
            { sequenceId, accountId, spmsIds: prevSpmsIds },
            { txid }
        );
    if (autoReplyCheckErr) throw autoReplyCheckErr;

    if (autoReplyAlreadySent) {
        logg.info(
            `auto reply already sent. So no need to send reply & delaying.`
        );
        return [{ messageDelayed: false }, null];
    } else {
        logg.info(`auto reply not sent. So continuing.`);
    }

    // 4. Out of all the previous sequence-step messages sent, select the most opened sequence-step and then reply with ‘Any thoughts, <<first_name>>?’ in the same thread with the tracking tag.
    let mostOpenedSpmsId = getMostOpenedSpmsId(
        { prevMsgOpenMap, prevSpmsDocs },
        { txid }
    );
    if (!mostOpenedSpmsId) throw `mostOpenedSpmsId is invalid`;

    let [sendReplyResp, sendReplyErr] = await sendReplyToMessage(
        { accountId, spmsId: mostOpenedSpmsId, contactDoc },
        { txid }
    );
    if (sendReplyErr) throw sendReplyErr;

    // 5. Delay sending the current message and all the future sequence-step messages in the campaign to a later date such that it follows strict scheduling rules.
    let [delayResp, delayErr] = await delaySequenceProspectMessages(
        { spmsDoc, spmsId, accountId, contactDoc, sequenceDoc, seqProspectDoc },
        { txid }
    );
    if (delayErr) throw delayErr;

    logg.info(`ended`);
    return [{ messageDelayed: true }, null];
}

export const sendReplyAndDelayEmail = functionWrapper(
    fileName,
    "sendReplyAndDelayEmail",
    _sendReplyAndDelayEmail
);

/*
prevMsgOpenMap structure: map of spmsId (key) -> count of opens (value)
prevSpmsDocs: array of spmsDocs

- get the spmsId with the most opens
- if more than one spmsId has the same count of opens, then get the spmsId of the most recent sequence step (this is the sequence step at the end of prevSpmsDocs)
*/
function getMostOpenedSpmsId({ prevMsgOpenMap, prevSpmsDocs }, { txid }) {
    const funcName = "getMostOpenedSpmsId";
    const logg = logger.child({ txid, funcName });
    // logg.info(`started`);

    let maxCount = 0;
    let maxSpmsIds = [];
    for (let spmsId in prevMsgOpenMap) {
        let count = prevMsgOpenMap[spmsId];
        if (count > maxCount) {
            maxCount = count;
            maxSpmsIds = [spmsId];
        } else if (count === maxCount && count > 0) {
            maxSpmsIds.push(spmsId);
        }
    }

    if (!maxSpmsIds.length) {
        logg.info(`no maxSpmsIds found`);
        return null;
    }

    if (maxSpmsIds.length === 1) {
        logg.info(`maxSpmsId: ${maxSpmsIds[0]}`);
        return maxSpmsIds[0];
    }

    logg.info(`maxSpmsIds with same count: ${JSON.stringify(maxSpmsIds)}`);

    let maxSpmsId = null;
    // do reverse for loop on prevSpmsDocs
    for (let i = prevSpmsDocs.length - 1; i >= 0; i--) {
        let spmsDoc = prevSpmsDocs[i];
        if (maxSpmsIds.includes(spmsDoc._id.toString())) {
            maxSpmsId = spmsDoc._id;
            break;
        }
    }

    logg.info(`maxSpmsId: ${maxSpmsId}`);
    // logg.info(`ended`);
    return maxSpmsId;
}

async function _delaySequenceProspectMessages(
    {
        spmsDoc,
        spmsId,
        accountId,
        contactDoc,
        sequenceDoc,
        seqProspectDoc,
        campaignConfigDoc,
    },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    if (!spmsDoc) {
        let spmsQueryObj = { _id: spmsId, account: accountId };
        spmsDoc = await SequenceProspectMessageSchedule.findOne(
            spmsQueryObj
        ).lean();
    }

    if (!spmsDoc) throw `spmsDoc is invalid for spmsId: ${spmsId}`;
    if (!spmsId) {
        spmsId = spmsDoc._id;
    }

    if (!campaignConfigDoc) {
        logg.info(`fetching campaignConfigDoc`);
        let configQueryObj = { account: accountId };
        campaignConfigDoc = await CampaignConfig.findOne(configQueryObj).lean();
        logg.info(`campaignConfigDoc: ${JSON.stringify(campaignConfigDoc)}`);
    }

    let contactId = contactDoc._id;
    let currSequenceStepId = spmsDoc.sequence_step;
    let senderId = spmsDoc.sender;
    let sequenceId = spmsDoc.sequence;

    let [futureDocResp, futureSeqStepErr] = await getFutureSpmsDocs(
        {
            accountId,
            currSequenceStepId,
            sequenceId,
            contactId,
            includeCurrent: true,
            returnPreviousSeqStepDoc: true,
        },
        { txid }
    );
    if (futureSeqStepErr) throw futureSeqStepErr;

    let { futureSpmsDocs, prevSeqStepDoc } = futureDocResp;
    if (!futureSpmsDocs || !futureSpmsDocs.length) {
        throw `no futureSpmsDocs found to delay`;
    }

    let [senderDetails, senderDetailsErr] = await getSenderDetails(
        { accountId, senderId },
        { txid }
    );
    if (senderDetailsErr) throw senderDetailsErr;

    let senderList = [senderDetails];

    let { perHourLimit, perDayLimit } = getLimitConfig(
        { senderCount: senderList.length },
        { txid }
    );

    let defaultTimezone =
        sequenceDoc.default_timezone ||
        senderDetails.timezone ||
        "Asia/Calcutta";

    let prospects = [seqProspectDoc];

    let resultScheduleList = [];
    let [scheduleMapRes, scheduleMapErr] = await prepareScheduleMap(
        {
            accountId,
            sequenceId,
            sequenceProspectId: seqProspectDoc._id,
            contactId,
            senderList,
            spmsDocsToIgnore: futureSpmsDocs.map((x) => x._id),
        },
        { txid }
    );
    if (scheduleMapErr) throw scheduleMapErr;

    let { prospectSenderMap, prospectLastScheduleTimeMap } = scheduleMapRes;
    let prevStepTimeValue =
        prevSeqStepDoc &&
        prevSeqStepDoc.time_of_dispatch &&
        prevSeqStepDoc.time_of_dispatch.value;

    for (let i = 0; i < futureSpmsDocs.length; i++) {
        let futureSpmsDoc = futureSpmsDocs[i];
        let fSeqStepDoc = futureSpmsDoc.sequence_step;
        let sequenceStepId = fSeqStepDoc._id;
        let sequenceStepTimeValue =
            fSeqStepDoc.time_of_dispatch && fSeqStepDoc.time_of_dispatch.value;

        let ignoreSchedulingBeforeTimes = [];
        if (i === 0) {
            let msgScheduledTime = futureSpmsDoc.message_scheduled_time;
            msgScheduledTime = new Date(msgScheduledTime).getTime();
            // increase the msgScheduledTime by sequenceStepTimeValue (format: { "time_value": 6, "time_unit": "day" })
            let timeToBeIgnored = addSequenceStepTime(
                {
                    time: msgScheduledTime,
                    sequenceStepTimeValue,
                    prevStepTimeValue,
                },
                { txid }
            );
            logg.info(`timeToBeIgnored: ${timeToBeIgnored}`);
            ignoreSchedulingBeforeTimes.push(timeToBeIgnored);
        }

        let replyToUser =
            campaignConfigDoc && campaignConfigDoc.reply_to_user
                ? campaignConfigDoc.reply_to_user.toString()
                : null;

        let scheduleList = scheduleTimeForSequenceProspects(
            {
                prospects,
                perHourLimit,
                perDayLimit,
                senderList,
                sequenceStepId,
                isFirstSequenceStep: false,
                sequenceStepTimeValue,
                prospectSenderMap,
                prospectLastScheduleTimeMap,
                defaultTimezone,
                prevStepTimeValue,
                ignoreSchedulingBeforeTimes,
                scheduleTimeHours:
                    campaignConfigDoc &&
                    campaignConfigDoc.message_schedule_window,
                replyToUser,
            },
            { txid }
        );

        resultScheduleList = [...resultScheduleList, ...scheduleList];
        prevStepTimeValue = sequenceStepTimeValue;
    }

    let updateData = resultScheduleList.map((x) => {
        let {
            sequence,
            account,
            contact,
            sequence_step,
            sequence_prospect,
            message_scheduled_time,
            reply_to,
        } = x;

        let updateObj = { message_scheduled_time };
        if (reply_to) {
            updateObj.reply_to = reply_to;
        }

        return {
            updateOne: {
                filter: {
                    sequence,
                    account,
                    contact,
                    sequence_step,
                    sequence_prospect,
                },
                update: updateObj,
            },
        };
    });
    logg.info(`updateData: ${JSON.stringify(updateData)}`);
    let bulkWriteResp = await SequenceProspectMessageSchedule.bulkWrite(
        updateData
    );
    logg.info(`bulkWriteResp: ${JSON.stringify(bulkWriteResp)}`);

    logg.info(`ended`);
    return [resultScheduleList, null];
}

const delaySequenceProspectMessages = functionWrapper(
    fileName,
    "delaySequenceProspectMessages",
    _delaySequenceProspectMessages
);

async function _getFutureSpmsDocs(
    {
        accountId,
        currSequenceStepId,
        sequenceId,
        contactId,
        includeCurrent,
        returnPreviousSeqStepDoc,
    },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    if (!accountId) throw `accountId is invalid`;
    if (!sequenceId) throw `sequenceId is invalid`;
    if (!contactId) throw `contactId is invalid`;
    if (!currSequenceStepId) throw `currSequenceStepId is invalid`;

    let seqStepDocs = await SequenceStep.find({
        sequence: sequenceId,
        account: accountId,
    })
        .sort("order")
        .lean();

    let futureSeqStepDocs = [];
    let foundCurrent = false;
    for (let i = 0; i < seqStepDocs.length; i++) {
        let seqStepDoc = seqStepDocs[i];
        if (seqStepDoc._id.toString() === currSequenceStepId) {
            foundCurrent = true;
            if (includeCurrent) {
                futureSeqStepDocs.push(seqStepDoc);
            }
            continue;
        }

        if (foundCurrent) {
            futureSeqStepDocs.push(seqStepDoc);
        }
    }

    logg.info(`futureSeqStepDocs.length: ${futureSeqStepDocs.length}`);
    if (futureSeqStepDocs.length <= 10) {
        logg.info(`futureSeqStepDocs: ${JSON.stringify(futureSeqStepDocs)}`);
    }

    let futureSpmsDocs = await SequenceProspectMessageSchedule.find({
        sequence: sequenceId,
        sequence_step: { $in: futureSeqStepDocs.map((x) => x._id) },
        account: accountId,
        contact: contactId,
    }).lean();

    // sort the futureSpmsDocs based on sequence_step order
    futureSpmsDocs.sort((a, b) => {
        let aSeqStepOrder = seqStepDocs.find(
            (x) => x._id === a.sequence_step
        ).order;
        let bSeqStepOrder = seqStepDocs.find(
            (x) => x._id === b.sequence_step
        ).order;
        return aSeqStepOrder - bSeqStepOrder;
    });

    // replace sequence_step field with actual sequence_step doc
    futureSpmsDocs = futureSpmsDocs.map((x) => {
        let seqStepDoc = seqStepDocs.find((y) => y._id === x.sequence_step);
        if (seqStepDoc) {
            x.sequence_step = seqStepDoc;
        }
        return x;
    });

    // if futureSpmsDocs.length <= 10, then logg.info the futureSpmsDocs
    if (futureSpmsDocs.length <= 10) {
        logg.info(`futureSpmsDocs: ${JSON.stringify(futureSpmsDocs)}`);
    }

    if (returnPreviousSeqStepDoc) {
        let prevSeqStepDoc = getPreviousSeqStepDoc(
            { seqStepDocs, currSequenceStepId },
            { txid }
        );
        logg.info(`ended`);
        return [{ prevSeqStepDoc, futureSpmsDocs }, null];
    }

    logg.info(`ended`);
    return [futureSpmsDocs, null];
}

const getFutureSpmsDocs = functionWrapper(
    fileName,
    "getFutureSpmsDocs",
    _getFutureSpmsDocs
);

function getPreviousSeqStepDoc({ seqStepDocs, currSequenceStepId }, { txid }) {
    const funcName = "getPreviousSeqStepDoc";
    const logg = logger.child({ txid, funcName });

    let prevSeqStepDoc = null;
    let foundCurrDoc = false;
    for (let i = 0; i < seqStepDocs.length; i++) {
        let seqStepDoc = seqStepDocs[i];
        if (seqStepDoc._id === currSequenceStepId) {
            foundCurrDoc = true;
            break;
        }
        prevSeqStepDoc = seqStepDoc;
    }

    if (!foundCurrDoc) {
        logg.error(`currSequenceStepId not found in seqStepDocs`);
        throw `currSequenceStepId not found in seqStepDocs`;
    }

    logg.info(`prevSeqStepDoc: ${JSON.stringify(prevSeqStepDoc)}`);

    return prevSeqStepDoc;
}

async function _getSenderDetails(
    { accountId, senderId },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    if (!accountId) throw `accountId is invalid`;
    if (!senderId) throw `senderId is invalid`;

    let [userDoc, userDocErr] = await UserUtils.getUserById(
        { id: senderId },
        { txid }
    );
    if (userDocErr) throw userDocErr;
    if (!userDoc) throw `userDoc is empty for userId: ${senderId}`;
    let userEmail = userDoc.email;
    let senderDetails = { email: userEmail, user_id: senderId };

    logg.info(`ended`);
    return [senderDetails, null];
}

const getSenderDetails = functionWrapper(
    fileName,
    "getSenderDetails",
    _getSenderDetails
);

/*
 Generate map objects of prospectSenderMap and prospectLastScheduleTimeMap
 * prospectSenderMap: map of prospect_email (key) -> sender_email (value)
 * prospectLastScheduleTimeMap: map of prospect_email (key) -> last_schedule_time_millis (value)
*/
async function _prepareScheduleMap(
    {
        accountId,
        sequenceId,
        sequenceProspectId,
        contactId,
        senderList,
        spmsDocsToIgnore,
    },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    if (!accountId) throw `accountId is invalid`;
    if (!sequenceId) throw `sequenceId is invalid`;

    if (!spmsDocsToIgnore) {
        spmsDocsToIgnore = [];
    }

    let prospectSenderMap = {};
    let prospectLastScheduleTimeMap = {};

    let spmsQueryObj = {
        sequence: sequenceId,
        account: accountId,
    };
    if (spmsDocsToIgnore.length) {
        spmsQueryObj._id = { $nin: spmsDocsToIgnore };
    }

    let spmsDocs = await SequenceProspectMessageSchedule.find(spmsQueryObj)
        .populate("contact")
        .populate("sender")
        .select(
            "contact sender message_scheduled_time message_status sequence_prospect sequence_step"
        )
        .lean();

    for (let i = 0; i < spmsDocs.length; i++) {
        let spmsDoc = spmsDocs[i];
        let contactDoc = spmsDoc.contact;
        let senderDoc = spmsDoc.sender;
        let contactEmail = contactDoc.email;
        let senderEmail = senderDoc.email;
        let msgScheduledTime = spmsDoc.message_scheduled_time;
        if (!msgScheduledTime) {
            logg.error(
                `msgScheduledTime is invalid for spmsDoc: ${JSON.stringify(
                    spmsDoc
                )}. but continuing`
            );
            continue;
        }
        msgScheduledTime = new Date(msgScheduledTime).getTime();
        if (!prospectSenderMap[contactEmail]) {
            prospectSenderMap[contactEmail] = senderEmail;
        }

        if (!prospectLastScheduleTimeMap[contactEmail]) {
            prospectLastScheduleTimeMap[contactEmail] = msgScheduledTime;
        } else if (
            msgScheduledTime > prospectLastScheduleTimeMap[contactEmail]
        ) {
            prospectLastScheduleTimeMap[contactEmail] = msgScheduledTime;
        }
    }

    // if number of keys is less than 20, then logg.info the maps
    if (Object.keys(prospectSenderMap).length <= 20) {
        logg.info(`prospectSenderMap: ${JSON.stringify(prospectSenderMap)}`);
    }
    if (Object.keys(prospectLastScheduleTimeMap).length <= 20) {
        logg.info(
            `prospectLastScheduleTimeMap: ${JSON.stringify(
                prospectLastScheduleTimeMap
            )}`
        );
    }

    logg.info(`ended`);
    return [{ prospectSenderMap, prospectLastScheduleTimeMap }, null];
}

const prepareScheduleMap = functionWrapper(
    fileName,
    "prepareScheduleMap",
    _prepareScheduleMap
);

function addSequenceStepTime(
    { time, sequenceStepTimeValue, prevStepTimeValue },
    { txid }
) {
    const funcName = "addSequenceStepTime";
    const logg = logger.child({ txid, funcName });

    let { time_value: timeValue, time_unit: timeUnit } = sequenceStepTimeValue;
    let { time_value: prevTimeValue, time_unit: prevTimeUnit } =
        prevStepTimeValue;

    let stepValueMillis = convertTimeStepValueToMillis(
        { timeValue, timeUnit },
        { txid }
    );

    let prevStepValueMillis = convertTimeStepValueToMillis(
        { timeValue: prevTimeValue, timeUnit: prevTimeUnit },
        { txid }
    );

    let newTime = time + stepValueMillis - prevStepValueMillis;

    // logg.info(`newTime: ${newTime}`);
    return newTime;
}

/*
 * Created on 18th July 2024
 * WHAT:
    - This function sends a auto-reply 'Any thoughts, <<first_name>>?' to the most opened message in a sequence.

* WHEN IS THIS FUNCTION CALLED:
    - This function is called when a prospect opens a message in a sequence.

* WHY call this function, when we already have implemented auto-reply feature in "sendReplyAndDelayEmail" function above:
    - The "sendReplyAndDelayEmail" function is called when we are about to send 2nd or 3rd or 4th or so on message to a prospect and then we check if the previous messages were opened and then we send the auto-reply.
    - But "sendReplyAndDelayEmail" function will not work for 1 specific scenario:
        - When we send all messages in a sequence and then the prospect opens any of the messages in the sequence.
    - Hence, we need a separate function to handle this specific scenario.

* HOW:
    - Check if all messages were sent. (So that we confirm there are no pending messages in the sequence)
        - If NO, then do nothing
        - If YES, then continue.
    - Check if any auto-reply was sent before to any of the messages in the sequence.
        - If yes, then do nothing.
        - If no, then continue.
    - Get the most opened message in the sequence.
    - Send the auto-reply 'Any thoughts, <<first_name>>?' to the most opened message.

* Reference Notion Doc: https://www.notion.so/thetrackapp/Auto-Reply-feature-when-prospects-open-the-message-46795b175da5487d8b372538f3d1b4e3
*/
async function _sendReplyIfNotSentBefore(
    { spmsDoc },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    if (!spmsDoc) throw `spmsDoc is invalid`;

    let sequenceId = spmsDoc.sequence;
    let accountId = spmsDoc.account;
    let contactId = spmsDoc.contact;

    let spmsDocs = await SequenceProspectMessageSchedule.find({
        sequence: sequenceId,
        account: accountId,
        contact: contactId,
    })
        .populate("sequence_step")
        .lean();

    logg.info(`spmsDocs.length: ${spmsDocs.length}`);
    if (spmsDocs.length <= 10) {
        logg.info(`spmsDocs: ${JSON.stringify(spmsDocs)}`);
    }

    // sort by sequence_step order
    spmsDocs.sort((a, b) => {
        let aSeqStepOrder = a.sequence_step.order;
        let bSeqStepOrder = b.sequence_step.order;
        return aSeqStepOrder - bSeqStepOrder;
    });

    // if number of spmsDocs is less than = 1, then do nothing
    if (spmsDocs.length <= 1) {
        logg.info(`only one spmsDoc found. So no need to send reply.`);
        return [{ messageSent: false }, null];
    }

    // 1. Check if there are any messages that haven't yet sent
    let pendingSpmsDocs = spmsDocs.filter((x) => x.message_status !== "sent");
    if (pendingSpmsDocs.length) {
        logg.info(`pending messages found. So no need to send reply.`);
        return [{ messageSent: false }, null];
    } else {
        logg.info(
            `no pending messages found. This means all messages were attempted to send. So continuing.`
        );
    }

    let spmsIds = spmsDocs.map((x) => x._id);

    // 2. Check if any auto-reply was sent before to any of the messages in the sequence.
    let [autoReplyAlreadySent, autoReplyCheckErr] =
        await AnalyticUtils.checkIfAutoReplyAlreadySent(
            { sequenceId, accountId, spmsIds },
            { txid }
        );
    if (autoReplyCheckErr) throw autoReplyCheckErr;

    if (autoReplyAlreadySent) {
        logg.info(`auto reply already sent. So no need to send reply.`);
        return [{ messageSent: false }, null];
    } else {
        logg.info(`auto reply not sent. So continuing.`);
    }

    // 3. Get the most opened message in the sequence.
    let [prevMsgOpenMap, hasPrevMessagesOpenedErr] =
        await AnalyticUtils.checkIfAnySequenceMessageOpensFound(
            { sequenceId, accountId, spmsIds, returnOpenMap: true },
            { txid }
        );
    if (hasPrevMessagesOpenedErr) throw hasPrevMessagesOpenedErr;

    // prevMsgOpenMap format:  map of spmsId (key) -> count of opens (value)
    if (!prevMsgOpenMap || !Object.keys(prevMsgOpenMap).length) {
        logg.info(`no previous message opened. So no need to send reply.`);
        return [{ messageSent: false }, null];
    } else {
        logg.info(`previous messages were opened. So continuing.`);
    }

    let mostOpenedSpmsId = getMostOpenedSpmsId(
        { prevMsgOpenMap, prevSpmsDocs: spmsDocs },
        { txid }
    );
    if (!mostOpenedSpmsId) throw `mostOpenedSpmsId is invalid`;

    // 4. Send the auto-reply 'Any thoughts, <<first_name>>?' to the most opened message.
    logg.info(`sending reply to spmsId: ${mostOpenedSpmsId}`);
    let [sendReplyResp, sendReplyErr] = await sendReplyToMessage(
        { accountId, spmsId: mostOpenedSpmsId },
        { txid }
    );
    if (sendReplyErr) throw sendReplyErr;

    logg.info(`ended`);
    return [{ messageSent: true }, null];
}

export const sendReplyIfNotSentBefore = functionWrapper(
    fileName,
    "sendReplyIfNotSentBefore",
    _sendReplyIfNotSentBefore
);

async function _updateSequenceProspects(
    { sequenceId },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    if (!sequenceId) throw `sequenceId is invalid`;

    // 1. check if the sequence is found for the sequenceId
    // 2. check if prospects have been already generated. If so, then throw an error
    // 3. Get the generated prospects from IntermediateProspectData collection
    // 4. Create SequenceProspect documents for the prospects

    let sequenceDoc = await SequenceModel.findOne({
        _id: sequenceId,
    }).lean();
    if (!sequenceDoc)
        throw `failed to find sequenceDoc for sequenceId: ${sequenceId}`;

    let accountId = sequenceDoc.account;
    let activities = sequenceDoc.activities;
    let userId = sequenceDoc.created_by;
    let conversationId = sequenceDoc.conversation;

    let isProspectAddedStatusFound = checkActivity(
        { activities, type: "prospects_added" },
        { txid }
    );
    if (isProspectAddedStatusFound) {
        throw `prospects are already generated for the sequenceId: ${sequenceId}`;
    }

    let [prospectDocs, prospectDocsErr] =
        await createCampaignSequenceProspectsFromQAi(
            {
                campaignSequenceId: sequenceId,
                accountId,
                userId,
                conversationId,
            },
            { txid }
        );
    if (prospectDocsErr) throw prospectDocsErr;

    // add activities with object { type: "prospects_added", time: new Date().toISOString() }
    let updateObj = {
        $push: {
            activities: {
                type: "prospects_added",
                time: new Date().toISOString(),
                txid,
            },
        },
    };
    let updateResp = await SequenceModel.updateOne(
        { _id: sequenceId },
        updateObj
    );

    logg.info(`updateResp: ${JSON.stringify(updateResp)}`);

    logg.info(`ended`);
    return [prospectDocs, null];
}

export const updateSequenceProspects = functionWrapper(
    fileName,
    "updateSequenceProspects",
    _updateSequenceProspects
);

function checkActivity({ activities, type }, { txid }) {
    const funcName = "checkActivity";
    const logg = logger.child({ txid, funcName });

    if (!activities || !activities.length) {
        activities = [];
    }

    let isFound = false;
    for (let i = 0; i < activities.length; i++) {
        let activity = activities[i];
        if (activity.type === type) {
            isFound = true;
            break;
        }
    }

    logg.info(`${type}: isFound: ${isFound}`);
    return isFound;
}

async function _updateSequenceStepProspectMessages(
    { sequenceId, sequenceStepId },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    if (!sequenceId) throw `sequenceId is invalid`;
    if (!sequenceStepId) throw `sequenceStepId is invalid`;

    // 1. check if the sequence is found for the sequenceId
    // 2. check if the sequenceStep is found for the sequenceStepId
    // 3. for the sequenceStep, if prospect messages are already generated, then throw an error (this is done through checking the sequenceStepDoc.activities)
    // 4. Get the generated prospect messages from IntermediateProspectMessageData collection
    // 5. Create SequenceProspectMessage documents for the prospects
    // 6. In the sequenceDoc, if there is activity for 'execute_sequence_confirmation', then schedule messages and add to seqStepDoc.activities with object { status: "prospect_messages_scheduled", time: new Date().toISOString() }
    // 7. In the sequenceStepDoc, add to activities with object { status: "prospect_messages_added", time: new Date().toISOString() }

    let seqQueryObj = { _id: sequenceId };
    let sequenceDoc = await SequenceModel.findOne(seqQueryObj).lean();
    if (!sequenceDoc)
        throw `failed to find sequenceDoc for sequenceId: ${sequenceId}`;

    let accountId = sequenceDoc.account;

    let seqStepQueryObj = {
        _id: sequenceStepId,
        sequence: sequenceId,
        account: accountId,
    };
    let sequenceStepDoc = await SequenceStep.findOne(seqStepQueryObj).lean();
    if (!sequenceStepDoc)
        throw `failed to find sequenceStepDoc for sequenceStepId: ${sequenceStepId}`;

    let seqProspectQueryObj = { sequence: sequenceId, account: accountId };
    let seqProspects = await SequenceProspect.find(seqProspectQueryObj)
        .populate("contact")
        .lean();
    logg.info(`seqProspects.length: ${seqProspects.length}`);

    let isProspectMessagesAddedStatusFound = checkActivity(
        {
            activities: sequenceStepDoc.activities,
            type: "prospect_messages_added",
        },
        { txid }
    );
    if (isProspectMessagesAddedStatusFound) {
        throw `prospect messages are already generated for the sequenceStepId: ${sequenceStepId}`;
    }

    let [spmsDocs, prospectMessageDocsErr] =
        await createSpmsDocsFromIntermediateProspectMessage(
            {
                sequenceId,
                sequenceStepId,
                sequenceStepDoc,
                accountId,
                seqProspects,
            },
            { txid }
        );
    if (prospectMessageDocsErr) throw prospectMessageDocsErr;

    let updateObj = {
        $push: {
            activities: {
                type: "prospect_messages_added",
                time: new Date().toISOString(),
                txid,
            },
        },
    };
    let updateMessageAddedResp = await SequenceStep.updateOne(
        seqStepQueryObj,
        updateObj
    );
    logg.info(
        `updateMessageAddedResp: ${JSON.stringify(updateMessageAddedResp)}`
    );

    let isExecuteSequenceConfirmationFound = checkActivity(
        {
            activities: sequenceDoc.activities,
            type: "execute_sequence_confirmation",
        },
        { txid }
    );

    if (isExecuteSequenceConfirmationFound) {
        logg.info(`execute_sequence_confirmation found. Scheduling messages.`);
        let [scheduleResp, scheduleErr] =
            await scheduleSequenceProspectMessages(
                {
                    accountId,
                    sequenceId,
                    sequenceDoc,
                    sequenceStepId,
                    sequenceStepDoc,
                    seqProspects,
                    spmsDocs,
                },
                { txid }
            );
        if (scheduleErr) throw scheduleErr;

        let updateObj = {
            $push: {
                activities: {
                    type: "prospect_messages_scheduled",
                    time: new Date().toISOString(),
                    txid,
                },
            },
        };
        let updateScheduleStatusResp = await SequenceStep.updateOne(
            seqStepQueryObj,
            updateObj
        );
        logg.info(
            `updateScheduleStatusResp: ${JSON.stringify(
                updateScheduleStatusResp
            )}`
        );
    }

    logg.info(`ended`);
    return [spmsDocs, null];
}

export const updateSequenceStepProspectMessages = functionWrapper(
    fileName,
    "updateSequenceStepProspectMessages",
    _updateSequenceStepProspectMessages
);

async function _createSpmsDocsFromIntermediateProspectMessage(
    { sequenceId, sequenceStepId, sequenceStepDoc, accountId, seqProspects },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    if (!sequenceId) throw `sequenceId is invalid`;
    if (!sequenceStepId) throw `sequenceStepId is invalid`;
    if (!accountId) throw `accountId is invalid`;

    // 1. query 'IntermediateProspectMessage' collection to get the prospect messages for the sequenceStepId
    // 2. create SequenceProspectMessage documents for the prospect messages

    let interProspectMessageDocs = await IntermediateProspectMessage.find({
        sequence_id: sequenceId,
        sequence_step_id: sequenceStepId,
    }).lean();

    logg.info(
        `interProspectMessageDocs.length: ${interProspectMessageDocs.length}`
    );
    if (interProspectMessageDocs.length <= 10) {
        logg.info(
            `interProspectMessageDocs: ${JSON.stringify(
                interProspectMessageDocs
            )}`
        );
    }
    if (!interProspectMessageDocs.length) {
        throw `no interProspectMessageDocs found for sequenceStepId: ${sequenceStepId}`;
    }

    let contactEmailMap = {};
    seqProspects.forEach((x) => {
        contactEmailMap[x.contact.email] = x;
    });

    let spmsDocs = [];
    for (let i = 0; i < interProspectMessageDocs.length; i++) {
        let interProspectMessageDoc = interProspectMessageDocs[i];
        let prospectDoc =
            contactEmailMap[interProspectMessageDoc.prospect_email];

        let spmsDoc = {
            _id: uuidv4(),
            sequence: sequenceId,
            account: accountId,
            contact: prospectDoc.contact._id,
            sequence_step: sequenceStepId,
            sequence_prospect: prospectDoc._id,
            is_message_generation_complete: true,
            message_type: sequenceStepDoc.type,
            message_subject: interProspectMessageDoc.message_subject,
            message_body: interProspectMessageDoc.message_body,
            message_status: "pending",
            prospect_email: interProspectMessageDoc.prospect_email,
            prospect_timezone: prospectDoc.contact.timezone,
        };
        spmsDocs.push(spmsDoc);
    }

    logg.info(`spmsDocs.length: ${spmsDocs.length}`);
    if (spmsDocs.length <= 10) {
        logg.info(`spmsDocs: ${JSON.stringify(spmsDocs)}`);
    }
    if (!spmsDocs.length) {
        throw `no spmsDocs found for sequenceStepId: ${sequenceStepId}`;
    }

    let spmsDocsResp = await SequenceProspectMessageSchedule.insertMany(
        spmsDocs
    );

    if (spmsDocsResp.length <= 10) {
        logg.info(`spmsDocsResp: ${JSON.stringify(spmsDocsResp)}`);
    }

    logg.info(`ended`);
    return [spmsDocsResp, null];
}

const createSpmsDocsFromIntermediateProspectMessage = functionWrapper(
    fileName,
    "createSpmsDocsFromIntermediateProspectMessage",
    _createSpmsDocsFromIntermediateProspectMessage
);

async function _scheduleSequenceProspectMessages(
    {
        accountId,
        sequenceId,
        sequenceDoc,
        sequenceStepId,
        sequenceStepDoc,
        seqProspects,
        spmsDocs,
        seqStepDocs,
        campaignConfigDoc,
    },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    if (!accountId) throw `accountId is invalid`;
    if (!sequenceId) throw `sequenceId is invalid`;
    if (!sequenceStepId) throw `sequenceStepId is invalid`;
    if (!seqProspects || !seqProspects.length) throw `seqProspects is invalid`;

    if (!spmsDocs || !spmsDocs.length) {
        logg.info(
            `querying spmsDocs for sequenceId: ${sequenceId} and sequenceStepId: ${sequenceStepId}`
        );
        spmsDocs = await SequenceProspectMessageSchedule.find({
            account: accountId,
            sequence: sequenceId,
            sequence_step: sequenceStepId,
        }).lean();
    }

    if (!campaignConfigDoc) {
        let cConfigQueryObj = { account: accountId };
        campaignConfigDoc = await CampaignConfig.findOne(
            cConfigQueryObj
        ).lean();
        logg.info(`campaignConfigDoc: ${JSON.stringify(campaignConfigDoc)}`);
    }

    let userId = sequenceDoc.created_by;
    let defaultTimezone = sequenceDoc.default_timezone || "Asia/Calcutta";

    let [scheduleMapRes, scheduleMapErr] = await prepareScheduleMap(
        { accountId, sequenceId, spmsDocsToIgnore: spmsDocs.map((x) => x._id) },
        { txid }
    );
    if (scheduleMapErr) throw scheduleMapErr;

    let { prospectSenderMap, prospectLastScheduleTimeMap } = scheduleMapRes;

    let [senderList, senderListErr] = await getSendersList(
        { accountId, userId },
        { txid }
    );
    if (senderListErr) throw senderListErr;
    if (!senderList || !senderList.length) throw `senderList is empty or null`;

    let senderIdMap = {};
    for (let i = 0; i < senderList.length; i++) {
        let sender = senderList[i];
        let senderId = sender.user_id;
        senderId =
            typeof senderId === "object" ? senderId.toString() : senderId;
        let senderEmail = sender.email;
        senderIdMap[senderEmail] = senderId;
    }

    let { perHourLimit, perDayLimit } = getLimitConfig(
        { senderCount: senderList.length },
        { txid }
    );

    let sequenceStepTimeValue =
        sequenceStepDoc.time_of_dispatch &&
        sequenceStepDoc.time_of_dispatch.value;

    if (!seqStepDocs || !seqStepDocs.length) {
        seqStepDocs = await SequenceStep.find({
            sequence: sequenceId,
            account: accountId,
        })
            .sort("order")
            .lean();
    }

    let isFirstSequenceStep =
        seqStepDocs[0]._id.toString() === sequenceStepId.toString();

    let prevStepTimeValue = null;
    if (!isFirstSequenceStep) {
        let prevSeqStepDoc = getPreviousSeqStepDoc(
            { seqStepDocs, currSequenceStepId: sequenceStepId },
            { txid }
        );
        prevStepTimeValue =
            prevSeqStepDoc &&
            prevSeqStepDoc.time_of_dispatch &&
            prevSeqStepDoc.time_of_dispatch.value;
    }

    let replyToUser =
        campaignConfigDoc && campaignConfigDoc.reply_to_user
            ? campaignConfigDoc.reply_to_user.toString()
            : null;

    let scheduleList = scheduleTimeForSequenceProspects(
        {
            prospects: seqProspects,
            perHourLimit,
            perDayLimit,
            senderList,
            sequenceStepId,
            isFirstSequenceStep,
            sequenceStepTimeValue,
            prospectSenderMap,
            prospectLastScheduleTimeMap,
            defaultTimezone,
            prevStepTimeValue,
            scheduleTimeHours:
                campaignConfigDoc && campaignConfigDoc.message_schedule_window,
            replyToUser,
        },
        { txid }
    );

    let updateData = scheduleList.map((x) => {
        let {
            sequence,
            account,
            contact,
            sequence_step,
            sequence_prospect,
            message_scheduled_time,
            sender_email,
            message_status,
            reply_to,
        } = x;

        let sender = senderIdMap[sender_email];

        if (contact && contact._id) {
            contact = contact._id;
        }

        let updateObj = {
            message_scheduled_time,
            message_status,
            sender,
            sender_email,
        };

        if (reply_to) {
            updateObj.reply_to = reply_to;
        }

        return {
            updateOne: {
                filter: {
                    sequence,
                    account,
                    contact,
                    sequence_step,
                    sequence_prospect,
                },
                update: updateObj,
            },
        };
    });
    logg.info(`updateData: ${JSON.stringify(updateData)}`);
    let bulkWriteResp = await SequenceProspectMessageSchedule.bulkWrite(
        updateData
    );
    logg.info(`bulkWriteResp: ${JSON.stringify(bulkWriteResp)}`);

    logg.info(`ended`);
    return [bulkWriteResp, null];
}

const scheduleSequenceProspectMessages = functionWrapper(
    fileName,
    "scheduleSequenceProspectMessages",
    _scheduleSequenceProspectMessages
);

async function _scheduleTimeForSequenceIfNotAlreadyDone(
    { sequenceId, sequenceDoc, accountId, userId, sequenceSteps },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    if (!sequenceId) throw `sequenceId is invalid`;
    if (!accountId) throw `accountId is invalid`;
    if (!userId) throw `userId is invalid`;
    if (!sequenceSteps || !sequenceSteps.length)
        throw `sequenceSteps is invalid`;

    /*
    * if sequenceDoc.activities doesn't have "prospects_added", then do nothing 
    * for each seqstepdoc:
       1. if "prospect_messages_added" is present but "prospect_messages_scheduled" is not present, then schedule the messages
       2. else do nothing
    */

    let isProspectsAdded = checkActivity(
        {
            activities: sequenceDoc.activities,
            type: "prospects_added",
        },
        { txid }
    );
    if (!isProspectsAdded) {
        logg.info(
            `prospects are not added for sequenceId: ${sequenceId}. So not scheduling messages.`
        );
        return [true, null];
    }

    let seqProspects = await SequenceProspect.find({
        sequence: sequenceId,
        account: accountId,
    })
        .populate("contact")
        .lean();

    if (!seqProspects || !seqProspects.length) {
        throw `no seqProspects found for sequenceId: ${sequenceId}`;
    }

    logg.info(`seqProspects.length: ${seqProspects.length}`);
    if (seqProspects.length <= 10) {
        logg.info(`seqProspects: ${JSON.stringify(seqProspects)}`);
    }

    for (let i = 0; i < sequenceSteps.length; i++) {
        let sequenceStepDoc = sequenceSteps[i];
        let sequenceStepId = sequenceStepDoc._id;
        let seqStepActivities = sequenceStepDoc.activities;

        let isMessagesAdded = checkActivity(
            {
                activities: seqStepActivities,
                type: "prospect_messages_added",
            },
            { txid }
        );
        if (!isMessagesAdded) {
            logg.info(
                `prospect messages are not added for sequenceStepId: ${sequenceStepId}. So not scheduling messages.`
            );
            continue;
        }

        let isMessagesScheduled = checkActivity(
            {
                activities: seqStepActivities,
                type: "prospect_messages_scheduled",
            },
            { txid }
        );

        if (isMessagesScheduled) {
            logg.info(
                `prospect messages are already scheduled for sequenceStepId: ${sequenceStepId}. So not scheduling messages.`
            );
            continue;
        }

        let [scheduleResp, scheduleErr] =
            await scheduleSequenceProspectMessages(
                {
                    accountId,
                    sequenceId,
                    sequenceDoc,
                    sequenceStepId,
                    sequenceStepDoc,
                    seqProspects,
                    seqStepDocs: sequenceSteps,
                },
                { txid }
            );
        if (scheduleErr) throw scheduleErr;

        let updateObj = {
            $push: {
                activities: {
                    type: "prospect_messages_scheduled",
                    time: new Date().toISOString(),
                    txid,
                },
            },
        };
        let seqStepQueryObj = {
            _id: sequenceStepId,
            sequence: sequenceId,
            account: accountId,
        };
        let updateScheduleStatusResp = await SequenceStep.updateOne(
            seqStepQueryObj,
            updateObj
        );
        logg.info(
            `updateScheduleStatusResp: ${JSON.stringify(
                updateScheduleStatusResp
            )}`
        );
    }

    logg.info(`ended`);
    return [true, null];
}

const scheduleTimeForSequenceIfNotAlreadyDone = functionWrapper(
    fileName,
    "scheduleTimeForSequenceIfNotAlreadyDone",
    _scheduleTimeForSequenceIfNotAlreadyDone
);

async function _getCampaignDefaults(
    { accountId, setDefaultIfNotFound = false },
    { txid, logg, funcName }
) {
    // get the campaign defaults for the accountId in "CampaignConfig" collection
    // if found, then return the campaign defaults
    // if not found, but setDefaultIfNotFound is true, then create the campaign defaults and return this
    // if not found and setDefaultIfNotFound is false, then return null

    logg.info(`started`);
    if (!accountId) throw `accountId is invalid`;

    let defaultQueryObj = { account: accountId };
    let campaignDefaults = await CampaignConfig.findOne(defaultQueryObj).lean();

    if (!setDefaultIfNotFound && !campaignDefaults) {
        logg.info(`campaignDefaults not found. setDefaultIfNotFound is false.`);
        logg.info(`ended`);
        return [null, null];
    }

    if (!campaignDefaults) {
        campaignDefaults = {};
    }
    if (!campaignDefaults.exclude_domains) {
        campaignDefaults.exclude_domains = [];
    }

    if (!campaignDefaults.sequence_steps_template) {
        campaignDefaults.sequence_steps_template = [];
    }
    if (
        !campaignDefaults.sequence_steps_template.length &&
        setDefaultIfNotFound
    ) {
        campaignDefaults.sequence_steps_template =
            CampaignDefaults.sequence_steps_template;
        // update the sequence_steps_template in the CampaignConfig collection
        let seqStepTemplateUpdateResp = await CampaignConfig.updateOne(
            defaultQueryObj,
            {
                sequence_steps_template:
                    campaignDefaults.sequence_steps_template,
            }
        );
        logg.info(
            `seqStepTemplateUpdateResp: ${JSON.stringify(
                seqStepTemplateUpdateResp
            )}`
        );
    }

    let result = campaignDefaults;

    logg.info(`ended`);
    return [result, null];
}

export const getCampaignDefaults = functionWrapper(
    fileName,
    "getCampaignDefaults",
    _getCampaignDefaults
);
/*
* Context: 
*   * Our potential customer Scripbox wanted to have a different email ID for the “Reply To” field in the email that we send to the prospects as part of the campaign.

* Challenge:
*   * If the prospect replies, then another email ID will receive the message. So we won’t be able to detect a reply and show accurate stats.

* Solution:
*   * Make sure the “Reply To” email ID is logged in to QRev and the Google PubSub Reply service is also set up for this email ID.
*   * Whenever we detect a message from this email ID, try to connect to the appropriate campaign message and then store the reply analytic.

* For more details, check this notion doc: https://www.notion.so/thetrackapp/Reply-To-feature-for-Campaigns-d4a30efa7bc148deb5c4c2896670d5b9

* "messages" structure: [{ threadId, messageId }]
*/
async function _checkIfRepliedToMessagesSentByAnotherSender(
    { messages, userInfo, userAuthObj },
    { txid, logg, funcName }
) {
    if (!userInfo) throw `userInfo is invalid`;
    logg.info(`started`);

    if (!messages || !messages.length) {
        logg.info(`no messages found. So returning.`);
        return [true, null];
    }

    let isAReplyToSender = await SequenceProspectMessageSchedule.exists({
        "reply_to.user_id": userInfo._id,
        message_status: { $ne: "sent" },
    });
    logg.info(`isAReplyToSender: ${isAReplyToSender}`);
    if (isAReplyToSender) {
        // do nothing
    } else {
        // WHY to return if not a sender?
        // If not a sender for any existing message, then no need to check further
        // Also, we don't want to unnecessarily check details of each message of user that isn't related to QRev since it is a breach of privacy
        logg.info(`userInfo is not a reply to sender. So returning.`);
        return [true, null];
    }

    let promises = [];
    for (let i = 0; i < messages.length; i++) {
        if (i !== 0) {
            // wait for 2 sec
            await new Promise((resolve) => setTimeout(resolve, 2000));
        }
        const message = messages[i];
        let promise = checkIfRepliedToMessageSentByAnotherSender(
            { message, userInfo, userAuthObj },
            { txid, sendErrorMsg: true }
        );
        promises.push(promise);
    }

    let responses = await Promise.all(promises);

    logg.info(`ended`);
    return [true, null];
}

const checkIfRepliedToMessagesSentByAnotherSender = functionWrapper(
    fileName,
    "checkIfRepliedToMessagesSentByAnotherSender",
    _checkIfRepliedToMessagesSentByAnotherSender
);

async function _checkIfRepliedToMessageSentByAnotherSender(
    { message, userInfo, userAuthObj },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    if (!message) throw `message is invalid`;
    if (!userInfo) throw `userInfo is invalid`;

    let { threadId, messageId } = message;
    if (!threadId) throw `threadId is invalid`;
    if (!messageId) throw `messageId is invalid`;

    let { email: userEmail, _id: userId } = userInfo;
    if (!userEmail) throw `userEmail is invalid`;
    if (!userId) throw `userId is invalid`;
    userId = userId.toString();

    /*
    * Check if the “messageId” is the same as the “threadId”
    - If YES, then continue below
    - If NO, then check if “threadId” matches the previous “reply_thread_id”. If so, then store the reply analytic.
    */
    if (threadId !== messageId) {
        let spmsDoc = await SequenceProspectMessageSchedule.findOne({
            "reply_to.thread_id": threadId,
            "reply_to.user_id": userId,
        })
            .populate("contact", "_id email")
            .populate("sender", "_id email")
            .lean();

        if (!spmsDoc) {
            logg.info(
                `spmsDoc not found for threadId: ${threadId}. so not storing the reply analytic.`
            );
            logg.info(`ended`);
            return [true, null];
        }
        logg.info(`matchingSpmsDoc: ${JSON.stringify(spmsDoc)}`);

        let [messageDetailsResp, messageDetailsErr] =
            await GoogleUtils.getEmailMessageDetails(
                { authObj: userAuthObj, messages: [message] },
                { txid }
            );
        if (messageDetailsErr) throw messageDetailsErr;
        if (!messageDetailsResp || !messageDetailsResp.length) {
            throw `failed to get message details for message: ${JSON.stringify(
                message
            )}`;
        }
        let [messageData] = messageDetailsResp;

        logg.info(`reply matched. So storing the reply analytic.`);
        let [storeReplyResp, storeReplyErr] =
            await storeReplyAnalyticForDifferentSender(
                {
                    threadId,
                    messageId,
                    userId,
                    userEmail,
                    spmsDoc,
                    messageData,
                },
                { txid }
            );
        if (storeReplyErr) throw storeReplyErr;

        logg.info(`ended`);
        return [true, null];
    }

    let [messageDetailsResp, messageDetailsErr] =
        await GoogleUtils.getEmailMessageDetails(
            { authObj: userAuthObj, messages: [message] },
            { txid }
        );
    if (messageDetailsErr) throw messageDetailsErr;
    if (!messageDetailsResp || !messageDetailsResp.length) {
        throw `failed to get message details for message: ${JSON.stringify(
            message
        )}`;
    }
    let [messageData] = messageDetailsResp;

    /*
    * Check if the prospect is the prospect for that campaign message.
    - If YES, then continue below
    - If NO, then do nothing.
    */
    // from the messageData, get the prospect email from the "From" field in message header
    let headers =
        messageData && messageData.payload && messageData.payload.headers;
    if (!headers || !headers.length) {
        throw `headers is invalid`;
    }
    let prospectEmail = getFromEmailUsingHeaders({ headers }, { txid });
    if (!prospectEmail) {
        throw `failed to get prospectEmail from headers`;
    }

    let spmsId = getSpmsIdIfTrackingTagPresentInMessage(
        { messageData },
        { txid }
    );
    if (!spmsId) {
        logg.info(`spmsId not found. So not storing the reply analytic.`);
        logg.info(`ended`);
        return [true, null];
    }

    let matchingSpmsDoc = await SequenceProspectMessageSchedule.findOne({
        _id: spmsId,
    })
        .populate("contact", "_id email")
        .populate("sender", "_id email")
        .lean();
    if (!matchingSpmsDoc) {
        logg.info(`not able to find matchingSpmsDoc for spmsId: ${spmsId}`);
        throw `failed to find matchingSpmsDoc for spmsId: ${spmsId}`;
    }
    logg.info(`matchingSpmsDoc: ${JSON.stringify(matchingSpmsDoc)}`);

    // see if userId matches with "reply_to.user_id" in matchingSpmsDoc
    if (matchingSpmsDoc.reply_to.user_id.toString() !== userId) {
        logg.info(
            `userId doesn't match with reply_to.user_id. So not storing the reply analytic.`
        );
        logg.info(`ended`);
        return [true, null];
    }

    logg.info(`storing the reply analytic.`);
    let [storeReplyResp, storeReplyErr] =
        await storeReplyAnalyticForDifferentSender(
            {
                threadId,
                messageId,
                userId,
                userEmail,
                spmsDoc: matchingSpmsDoc,
                messageData,
            },
            { txid }
        );
    if (storeReplyErr) throw storeReplyErr;

    let spmsUpdateObj = {
        "reply_to.thread_id": threadId,
        "reply_to.message_id": messageId,
        "reply_to.replied_on": new Date().toISOString(),
    };

    let spmsUpdateResp = await SequenceProspectMessageSchedule.updateOne(
        { _id: spmsId },
        spmsUpdateObj
    );
    logg.info(`spmsUpdateResp: ${JSON.stringify(spmsUpdateResp)}`);

    logg.info(`ended`);
    return [true, null];
}

export const checkIfRepliedToMessageSentByAnotherSender = functionWrapper(
    fileName,
    "checkIfRepliedToMessageSentByAnotherSender",
    _checkIfRepliedToMessageSentByAnotherSender
);

async function _storeReplyAnalyticForDifferentSender(
    { threadId, messageId, userId, userEmail, spmsDoc, messageData },
    { txid, logg, funcName }
) {
    /*
     * NOTE: in spmsDoc, field "contact" and "sender" are populated fields
     */

    let messageHeaders =
        messageData && messageData.payload && messageData.payload.headers;
    let repliedOnDate = new Date();
    if (messageHeaders && messageHeaders.length) {
        /*
        * Date Header to be found:
        {
            "name": "Date",
            "value": "Thu, 6 Jun 2024 12:22:12 +0530"
        }
        */
        let dateHeader = messageHeaders.find((x) => x.name === "Date");
        if (dateHeader) {
            let dateStr = dateHeader.value;
            try {
                repliedOnDate = new Date(dateStr);
                logg.info(`we have set repliedOnDate as: ${repliedOnDate}`);
            } catch (e) {
                logg.error(`failed to parse dateStr: ${dateStr}`);
            }
        }
    }

    let isFailed = GoogleUtils.hasEmailFailed(
        { message: messageData },
        { txid }
    );

    let [ReplyAnalyticResp, ReplyAnalyticErr] =
        await AnalyticUtils.storeCampaignMessageReplyAnalytic(
            {
                sessionId: spmsDoc.analytic_session_id,
                spmsId: spmsDoc._id,
                accountId: spmsDoc.account,
                sequenceId: spmsDoc.sequence,
                contactId: spmsDoc.contact._id,
                sequenceStepId: spmsDoc.sequence_step,
                sequenceProspectId: spmsDoc.sequence_prospect,
                messageId,
                messageDetails: messageData,
                repliedOnDate,
                isFailed,
                replyToUserId: userId,
            },
            { txid }
        );
    if (ReplyAnalyticErr) throw ReplyAnalyticErr;

    logg.info(`ended`);
    return [true, null];
}

const storeReplyAnalyticForDifferentSender = functionWrapper(
    fileName,
    "storeReplyAnalyticForDifferentSender",
    _storeReplyAnalyticForDifferentSender
);

function getFromEmailUsingHeaders({ headers }, { txid }) {
    const funcName = "getFromEmailUsingHeaders";
    const logg = logger.child({ txid, funcName });
    // logg.info(`started`);
    // NOTE: Maybe need to move code to GoogleUtils file because when we support Outlook, it may have different header structure

    if (!headers) {
        logg.info(`headers is invalid`);
        return null;
    }
    if (!headers.length) {
        logg.info(`headers is empty`);
        return null;
    }

    let fromHeader = headers.find((x) => x.name === "From");
    if (!fromHeader) {
        logg.info(`fromHeader not found`);
        return null;
    }

    let fromValue = fromHeader.value;
    if (!fromValue) {
        logg.info(`fromValue not found`);
        return null;
    }

    // see if the fromValue has the email ID in format "name <email>"
    let emailMatch = fromValue.match(/<([^>]+)>/);
    if (!emailMatch) {
        logg.info(`emailMatch not found. so returning fromValue`);
        return fromValue;
    }

    let email = emailMatch[1];
    if (email && email.length) {
        email = email.trim().toLowerCase();
    }
    logg.info(`email: ${email}`);
    return email;
}

function getSpmsIdIfTrackingTagPresentInMessage(
    { messageData, accountType = "google" },
    { txid }
) {
    const funcName = "getSpmsIdIfTrackingTagPresentInMessage";
    const logg = logger.child({ txid, funcName });
    // logg.info(`started`);

    const serverUrlPath = process.env.SERVER_URL_PATH;
    let trackingUrl = `${serverUrlPath}/api/campaign/email_open`;
    let spmsIdQueryParamName = "ssmid";

    let spmsId = null;
    if (accountType === "google" || accountType === "gmail") {
        spmsId = GoogleUtils.getSpmsIdIfTrackingTagPresentInMessage(
            { messageData, trackingUrl, spmsIdQueryParamName },
            { txid }
        );
    } else {
        throw `accountType: ${accountType} is not supported`;
    }

    if (!spmsId) {
        logg.info(`trackingTag not found`);
        return null;
    }

    logg.info(`spmsId: ${spmsId}`);
    // logg.info(`ended`);
    return spmsId;
}

async function _storeResourceFile(
    { accountId, resourceName, resourceType, resourceText, files },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    if (!accountId) throw `accountId is invalid`;
    if (!resourceName) throw `resourceName is invalid`;
    if (!resourceType) throw `resourceType is invalid`;

    if (!isValidResourceName(resourceName)) {
        const validResourceNames = CampaignDefaults.resource_file_types;
        throw `Invalid resource_name: ${resourceName}. It can only be ${validResourceNames.join(
            ", "
        )}`;
    }

    const [configResult, configErr] = await isResourceConfigured(
        { accountId, resourceName },
        { txid }
    );
    if (configErr) throw configErr;
    if (configResult && configResult.isConfigured) {
        throw `Resource ${resourceName} is already configured`;
    }

    const [s3Links, s3LinksErr] = await processAndUploadFiles(
        { accountId, resourceName, resourceType, resourceText, files },
        { txid }
    );
    if (s3LinksErr) throw s3LinksErr;

    if (s3Links && s3Links.length) {
        const [updateResult, updateErr] = await updateCampaignConfig(
            { accountId, resourceName, s3Links },
            { txid }
        );
        if (updateErr) throw updateErr;
    }

    logg.info(`ended successfully`);
    return [{ s3Links }, null];
}

export const storeResourceFile = functionWrapper(
    fileName,
    "storeResourceFile",
    _storeResourceFile
);

async function _processAndUploadFiles(
    { accountId, resourceName, resourceType, resourceText, files },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    const campaignResourceConfigPrefixPath =
        process.env.CAMPAIGN_RESOURCE_CONFIG_PREFIX_PATH;
    let s3Links = [];

    if (resourceType === "text") {
        const [textLinks, textErr] = await processTextResource(
            {
                accountId,
                resourceName,
                resourceText,
                prefixPath: campaignResourceConfigPrefixPath,
            },
            { txid }
        );
        if (textErr) throw textErr;
        s3Links = textLinks;
    } else if (resourceType === "files" || resourceType === "file") {
        const [fileLinks, fileErr] = await processFileResources(
            {
                accountId,
                resourceName,
                files,
                prefixPath: campaignResourceConfigPrefixPath,
            },
            { txid }
        );
        if (fileErr) throw fileErr;
        s3Links = fileLinks;
    } else {
        throw `Invalid resourceType: ${resourceType}`;
    }

    logg.info(`ended`);
    return [s3Links, null];
}

const processAndUploadFiles = functionWrapper(
    fileName,
    "processAndUploadFiles",
    _processAndUploadFiles
);

function isValidResourceName(resourceName) {
    const validResourceNames = CampaignDefaults.resource_file_types;
    return validResourceNames.includes(resourceName);
}
async function _processTextResource(
    { accountId, resourceName, resourceText, prefixPath },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    const [tempFilePath, tempFileErr] = await FileUtils.createFileFromText(
        { text: resourceText, fileName: `${resourceName}_text.txt` },
        { txid }
    );
    if (tempFileErr) throw tempFileErr;

    const [s3Link, s3LinkErr] = await uploadFileToS3(
        { accountId, resourceName, filePath: tempFilePath, prefixPath, contentType: "text/plain", originalFileName: `${resourceName}.txt` },
        { txid }
    );
    if (s3LinkErr) throw s3LinkErr;

    await FileUtils.deleteFile({ filePath: tempFilePath }, { txid });
    logg.info(`ended`);
    return [[s3Link], null];
}

const processTextResource = functionWrapper(
    fileName,
    "processTextResource",
    _processTextResource
);

async function _processFileResources(
    { accountId, resourceName, files, prefixPath },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    const s3Links = [];
    for (let file of files) {
        const [s3Link, s3LinkErr] = await uploadFileToS3(
            { accountId, resourceName, filePath: file.path, prefixPath, contentType: file.mimetype, originalFileName: file.originalname },
            { txid }
        );
        if (s3LinkErr) throw s3LinkErr;
        s3Links.push(s3Link);
        await FileUtils.deleteFile({ filePath: file.path }, { txid });
    }
    logg.info(`ended`);
    return [s3Links, null];
}

const processFileResources = functionWrapper(
    fileName,
    "processFileResources",
    _processFileResources
);

async function _uploadFileToS3(
    { accountId, resourceName, filePath, prefixPath, contentType, originalFileName },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    const [fileObj, fileErr] = await FileUtils.readFile({ filePath }, { txid });
    if (fileErr) throw fileErr;

    logg.info(`filePath: ${filePath}`);

    const uniqueId = uuidv4().replace(/-/g, '');
    const fileName = `${prefixPath}/${accountId}/${resourceName}_${uniqueId}_${originalFileName}`;
    logg.info(`fileName: ${fileName}`);

    const [s3Link, s3Error] = await S3Utils.uploadFile(
        { file: fileObj, fileName, ContentType: contentType },
        { txid }
    );
    if (s3Error) throw s3Error;

    logg.info(`ended`);
    return [s3Link, null];
}

const uploadFileToS3 = functionWrapper(
    fileName,
    "uploadFileToS3",
    _uploadFileToS3
);

async function _updateCampaignConfig(
    { accountId, resourceName, s3Links },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    const updateResult = await CampaignConfig.findOneAndUpdate(
        { account: accountId },
        {
            $push: {
                resource_documents: {
                    name: resourceName,
                    s3_links: s3Links,
                    added_on: new Date().toISOString(),
                },
            },
            updated_on: new Date().toISOString(),
        },
        { new: true, upsert: true }
    );
    if (!updateResult) throw "Failed to update CampaignConfig";
    logg.info(`ended`);
    return [updateResult, null];
}

const updateCampaignConfig = functionWrapper(
    fileName,
    "updateCampaignConfig",
    _updateCampaignConfig
);

async function _isResourceConfigured(
    { accountId, resourceName },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    if (!accountId) throw `accountId is invalid`;
    if (!resourceName) throw `resourceName is invalid`;

    // Check if the resource is configured in the CampaignConfig model
    const config = await CampaignConfig.findOne({ account: accountId });
    const isConfigured =
        config &&
        config.resource_documents &&
        config.resource_documents.length &&
        config.resource_documents.some((doc) => doc.name === resourceName);

    logg.info(`ended successfully`);
    return [{ isConfigured }, null];
}

const isResourceConfigured = functionWrapper(
    fileName,
    "isResourceConfigured",
    _isResourceConfigured
);

async function _checkMissingResources({ accountId }, { txid, logg, funcName }) {
    logg.info(`started`);
    if (!accountId) throw `accountId is invalid`;

    const validResourceNames = CampaignDefaults.resource_file_types;
    const missingResources = [];

    for (const resourceName of validResourceNames) {
        const [configResult, configErr] = await isResourceConfigured(
            { accountId, resourceName },
            { txid }
        );
        if (configErr) throw configErr;
        if (!configResult.isConfigured) {
            missingResources.push(resourceName);
        }
    }

    logg.info(`ended successfully`);
    return [{ missingResources, totalMissing: missingResources.length }, null];
}

export const checkMissingResources = functionWrapper(
    fileName,
    "checkMissingResources",
    _checkMissingResources
);
