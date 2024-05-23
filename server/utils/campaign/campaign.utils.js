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
import * as SlotGen_utils from "../slot/open_link_free_slots_1.js";
import { SequenceProspectMessageSchedule } from "../../models/campaign/sequence.prospect.message_schedule.model.js";
import { CampaignConfig } from "../../models/campaign/campaign.config.model.js";
import * as AnalyticUtils from "../analytic/analytic.utils.js";
import * as ProspectVerifyUtils from "../prospect_verify/prospect.verify.utils.js";

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
        campaignSequenceId,
        accountId,
        userId,
        userQuery,
        conversationId,
        uploadedData,
    },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    if (!campaignSequenceId) throw `campaignSequenceId is invalid`;
    if (!accountId) throw `accountId is invalid`;
    if (!userId) throw `userId is invalid`;

    let [sequenceDoc, sequenceDocErr] = await createCampaignSequence(
        {
            campaignSequenceId,
            accountId,
            userId,
            name: `QAi: ${userQuery}`,
            conversationId,
            uploadedData,
        },
        { txid }
    );
    if (sequenceDocErr) throw sequenceDocErr;

    let [sequenceStepDoc, sequenceStepDocErr] =
        await createCampaignSequenceStepFromQAi(
            { campaignSequenceId, accountId, userId },
            { txid }
        );
    if (sequenceStepDocErr) throw sequenceStepDocErr;
    let sequenceStepId = sequenceStepDoc && sequenceStepDoc._id;
    if (!sequenceStepId) throw `sequenceStepId is invalid`;

    let [prospects, prospectsErr] =
        await createCampaignSequenceProspectsFromQAi(
            {
                campaignSequenceId,
                accountId,
                userId,
                conversationId,
                uploadedData,
            },
            { txid }
        );
    if (prospectsErr) throw prospectsErr;

    let [sspmDocs, sspmDocsErr] =
        await createCampaignSequenceProspectMessagesFromQAi(
            { campaignSequenceId, accountId, sequenceStepId, prospects },
            { txid }
        );
    if (sspmDocsErr) throw sspmDocsErr;

    logg.info(`ended`);
    return [sspmDocs, null];
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
        logg.info(`since sequenceId is empty, generating new sequenceId`);
        campaignSequenceId = uuidv4();
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
        conversation: conversationId,
        status: "created",
    };
    if (uploadedData && uploadedData.file_name) {
        obj.uploaded_file_name = uploadedData.file_name;
    }

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

async function _createCampaignSequenceStepFromQAi(
    { campaignSequenceId, accountId, userId },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    if (!campaignSequenceId) throw `campaignSequenceId is invalid`;
    if (!accountId) throw `accountId is invalid`;
    if (!userId) throw `userId is invalid`;

    let sequenceStepId = uuidv4();
    let obj = {
        _id: sequenceStepId,
        sequence: campaignSequenceId,
        account: accountId,
        created_by: userId,
        type: "email",
        subject: "",
        body: "",
        time_of_dispatch: {
            type: "from_prospect_added_time",
            value: { time_value: 1, time_unit: "day" },
        },
        active: true,
        order: 1,
    };
    let sequenceStepDocResp = await SequenceStep.insertMany([obj]);
    let sequenceStepDoc = sequenceStepDocResp && sequenceStepDocResp[0];
    logg.info(`sequenceStepDoc: ${JSON.stringify(sequenceStepDoc)}`);

    logg.info(`ended`);
    return [sequenceStepDoc, null];
}

const createCampaignSequenceStepFromQAi = functionWrapper(
    fileName,
    "createCampaignSequenceStepFromQAi",
    _createCampaignSequenceStepFromQAi
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

async function _setupSequenceProspectMessageTime(
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

    if (
        sequenceDoc.status === "messages_scheduled" ||
        sequenceDoc.status === "messages_scheduling"
    )
        throw `sequenceId: ${sequenceId} already has messages_scheduled status`;

    // update sequence status to "messages_scheduling"
    // this is to avoid multiple calls to this function at the same time
    let seqStatusUpdateResp = await SequenceModel.updateOne(seqQueryObj, {
        status: "messages_scheduling",
    });
    logg.info(`seqStatusUpdateResp: ${JSON.stringify(seqStatusUpdateResp)}`);

    let sequenceStepQueryObj = { sequence: sequenceId };
    let sequenceStepDocs = await SequenceStep.find(sequenceStepQueryObj).lean();
    logg.info(`sequenceStepDocs: ${JSON.stringify(sequenceStepDocs)}`);
    if (!sequenceStepDocs || !sequenceStepDocs.length) {
        throw `sequenceStepDocs is empty for sequenceId: ${sequenceId}`;
    }

    let sequenceStepIds = sequenceStepDocs.map((x) => x._id);
    let sequenceStepId = sequenceStepIds[0];

    let seqProspectQueryObj = { sequence: sequenceId, status: "pending" };
    let prospects = await SequenceProspect.find(seqProspectQueryObj).lean();

    let [scheduleResp, scheduleErr] =
        await scheduleTimeForCampaignProspectsFromQAi(
            {
                campaignSequenceId: sequenceId,
                accountId,
                userId,
                sequenceStepId,
                prospects,
                defaultTimezone: userTimezone,
            },
            { txid }
        );
    if (scheduleErr) throw scheduleErr;

    // update sequence status to "messages_scheduled"
    let seqStatusUpdateResp2 = await SequenceModel.updateOne(seqQueryObj, {
        status: "messages_scheduled",
    });
    logg.info(`seqStatusUpdateResp2: ${JSON.stringify(seqStatusUpdateResp2)}`);

    logg.info(`ended`);
    return [scheduleResp, null];
}

export const setupSequenceProspectMessageTime = functionWrapper(
    fileName,
    "setupSequenceProspectMessageTime",
    _setupSequenceProspectMessageTime
);

async function _scheduleTimeForCampaignProspectsFromQAi(
    {
        campaignSequenceId,
        accountId,
        userId,
        sequenceStepId,
        prospects,
        defaultTimezone,
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

    let [senderList, senderListErr] = await getSendersList(
        { accountId },
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
        } = x;

        let sender = senderIdMap[sender_email];

        return {
            updateOne: {
                filter: {
                    sequence,
                    account,
                    contact,
                    sequence_step,
                    sequence_prospect,
                },
                update: {
                    sender_email,
                    message_scheduled_time,
                    message_status,
                    sender,
                },
            },
        };
    });
    logg.info(`updateData: ${JSON.stringify(updateData)}`);
    let bulkWriteResp = await SequenceProspectMessageSchedule.bulkWrite(
        updateData
    );
    // logg.info(`bulkWriteResp: ${JSON.stringify(bulkWriteResp)}`);

    logg.info(`ended`);
    return [scheduleList, null];
}

const scheduleTimeForCampaignProspectsFromQAi = functionWrapper(
    fileName,
    "scheduleTimeForCampaignProspectsFromQAi",
    _scheduleTimeForCampaignProspectsFromQAi
);

async function _getSendersList({ accountId }, { txid, logg, funcName }) {
    logg.info(`started`);
    if (!accountId) throw `accountId is invalid`;

    let queryObj = { account: accountId };

    let campaignConfigDoc = await CampaignConfig.findOne(queryObj).lean();
    logg.info(`campaignConfigDoc: ${JSON.stringify(campaignConfigDoc)}`);

    let senderList = campaignConfigDoc && campaignConfigDoc.email_senders;
    logg.info(`senderList: ${JSON.stringify(senderList)}`);
    // let senderEmails = senderList.map((x) => x.email);
    // senderEmails = senderEmails.filter((x) => x);
    // senderEmails = senderEmails.map((x) => x.trim().toLowerCase());
    // senderEmails = [...new Set(senderEmails)];
    // logg.info(`senderEmails: ${JSON.stringify(senderEmails)}`);
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
    },
    { txid }
) {
    const funcName = "scheduleTimeForSequenceProspects";
    const logg = logger.child({ txid, funcName });
    logg.info(`started`);
    let senderCount = senderList.length;
    if (!scheduleTimeHours) {
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

    if (!isFirstSequenceStep) {
        let { time_value, time_unit } = sequenceStepTimeValue;
        let timeValueMillis = time_value * 24 * 60 * 60 * 1000;
        if (time_unit === "hour") timeValueMillis = time_value * 60 * 60 * 1000;
        initialRangeTime = initialRangeTime + timeValueMillis;
    }

    let endRangeTime = initialRangeTime + 14 * 24 * 60 * 60 * 1000;

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
            false
        );
    // ignore slots which are less than 1 hour from now
    let currTime = new Date().getTime();
    scheduleTimes = scheduleTimes.filter(
        (x) => x.startTime > currTime + 1 * 60 * 60 * 1000
    );

    scheduleTimes = scheduleTimes.map((x) => {
        return { start: x.startTime, end: x.endTime };
    });

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

    let stepValueMillis = null;
    if (timeUnit === "hour") stepValueMillis = timeValue * 60 * 60 * 1000;
    else if (timeUnit === "day")
        stepValueMillis = timeValue * 24 * 60 * 60 * 1000;
    else if (timeUnit === "week")
        stepValueMillis = timeValue * 7 * 24 * 60 * 60 * 1000;
    else if (timeUnit === "month")
        stepValueMillis = timeValue * 30 * 24 * 60 * 60 * 1000;
    else if (timeUnit === "year")
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

    // initial wait time is 0.5 sec
    let waitTime = 500;
    let promises = [];
    for (const spmsDoc of spmsDocs) {
        // make use of function "executeCampaignSequenceStep" for each spmsDoc
        let promise = executeCampaignSequenceStep(
            { spmsDoc },
            { txid, sendErrorMsg: true }
        );
        promises.push(promise);

        //wait for minimum of waitTime or 2 sec
        await new Promise((resolve) =>
            setTimeout(resolve, Math.min(waitTime, 2000))
        );
        waitTime += 500;
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

    let [hasRepliedToPrevStep, repliedErr] =
        await hasProspectRepliedToPreviousStep(
            {
                sequenceId: spmsDoc.sequence,
                sequenceProspectId: spmsDoc.sequence_prospect,
                currentSpmsId: spmsId,
                currentSequenceStepId: spmsDoc.sequence_step,
                accountId: spmsDoc.account,
            },
            { txid, sendErrorMsg: true }
        );
    if (repliedErr) {
        logg.error(
            `got reply error. but continuing... repliedErr: ${repliedErr}`
        );
    }

    let messageResponse = null,
        hasEmailBounced = false;
    let failed = false;

    if (hasRepliedToPrevStep) {
        logg.info(`prospect has replied. so skipping this sending the message`);

        messageResponse = {
            reason: "prospect_replied_to_previous_step",
            data: hasRepliedToPrevStep,
        };
    } else {
        let [resp, err] = await executeCampaignStepUtil(
            { spmsDoc, spmsId },
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
            hasEmailBounced = resp && resp.hasEmailBounced;
        }
    }

    let messageStatus = "";
    if (hasRepliedToPrevStep) messageStatus = "skipped";
    else if (failed) messageStatus = "failed";
    else if (hasEmailBounced) messageStatus = "bounced";
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

    logg.info(`ended`);
    return [true, null];
}

const executeCampaignSequenceStep = functionWrapper(
    fileName,
    "executeCampaignSequenceStep",
    _executeCampaignSequenceStep
);

async function _executeCampaignStepUtil(
    { spmsDoc, spmsId },
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
    } = spmsDoc;

    if (message_status !== "pending") {
        throw `message_status is not pending`;
    }

    if (!is_message_generation_complete) {
        throw `message is not generated yet`;
    }

    let prospect_email = "";
    let [contactDoc, contactErr] = await CrmContactUtils.getContactById(
        { contactId: contact, accountId: account },
        { txid }
    );
    if (contactErr) throw contactErr;
    if (!contactDoc) throw `contactDoc is invalid`;
    if (!contactDoc.email) throw `contactDoc.email is invalid`;
    prospect_email = contactDoc.email;

    let [senderAuthObj, authObjErr] = await GoogleUtils.refreshOrReturnToken(
        { email: sender_email, returnBackAuthObj: true },
        { txid }
    );
    if (authObjErr) throw authObjErr;

    if (!senderAuthObj)
        throw `senderAuthObj is invalid for sender_email: ${sender_email}`;

    if (spmsId) {
        message_body = convertToHtmlAndAddTrackingTag(
            { emailBody: message_body, campaignProspectId: spmsId },
            { txid }
        );
    }

    let [sendResp, sendEmailErr] = await GoogleUtils.sendEmail(
        {
            senderEmailId: sender_email,
            senderAuthObj,
            toEmailId: prospect_email,
            subject: message_subject,
            body: message_body,
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

    let [hasEmailBounced, hasBouncedErr] = await GoogleUtils.hasEmailBounced(
        { emailThreadId, senderAuthObj, waitTime: 1500 },
        { txid, sendErrorMsg: true }
    );
    if (hasBouncedErr) {
        logg.error(`failed to check hasEmailBounced: ${hasBouncedErr}`);
        logg.error(`but continuing with the process`);
        hasEmailBounced = null;
    }
    logg.info(`hasEmailBounced1: ${hasEmailBounced}`);

    if (hasEmailBounced === false) {
        let [hasEmailBounced2, hasBouncedErr2] =
            await GoogleUtils.hasEmailBounced(
                { emailThreadId, senderAuthObj, waitTime: 1500 },
                { txid, sendErrorMsg: true }
            );
        if (hasBouncedErr2) {
            logg.error(`failed to check hasEmailBounced: ${hasBouncedErr}`);
            logg.error(`but continuing with the process`);
            hasEmailBounced2 = null;
        }
        logg.info(`hasEmailBounced2: ${hasEmailBounced2}`);
        hasEmailBounced = hasEmailBounced2;
    }

    if (!hasEmailBounced) hasEmailBounced = false;

    let messageResponse = {
        email_sent_id: emailSentId,
        email_thread_id: emailThreadId,
        email_label_ids: emailLabelIds,
    };

    logg.info(`ended`);
    return [{ messageResponse, hasEmailBounced }, null];
}

const executeCampaignStepUtil = functionWrapper(
    fileName,
    "executeCampaignStepUtil",
    _executeCampaignStepUtil
);

function convertToHtmlAndAddTrackingTag(
    { emailBody, campaignProspectId },
    { txid }
) {
    const funcName = "convertToHtmlAndAddTrackingTag";
    const logg = logger.child({ txid, funcName });
    logg.info(`started`);
    const serverUrlPath = process.env.SERVER_URL_PATH;
    const result = `${emailBody}<img src="${serverUrlPath}/api/campaign/email_open?ssmid=${campaignProspectId}" alt="Image"/>`;
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

    logg.info(`ended`);
    return [analyticResp, null];
}

export const saveSequenceStepMessageOpenAnalytic = functionWrapper(
    fileName,
    "saveSequenceStepMessageOpenAnalytic",
    _saveSequenceStepMessageOpenAnalytic
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

    let now = new Date();
    let now1MinBack = new Date(now.getTime() - 1 * 60 * 1000);

    let queryObj = {
        message_status: "pending",
        message_scheduled_time: {
            $gt: now1MinBack,
            $lt: now,
        },
        is_message_generation_complete: true,
    };
    logg.info(`queryObj: ${JSON.stringify(queryObj)}`);

    let spmsDocs = await SequenceProspectMessageSchedule.find(queryObj).lean();

    if (!spmsDocs.length) {
        logg.info(`no spmsDocs found`);
        return;
    }

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
            values: ["pending", "sent", "bounced"],
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
            values: ["pending", "sent", "bounced"],
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
