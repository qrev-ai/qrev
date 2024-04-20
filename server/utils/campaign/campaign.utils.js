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

async function _setupSequenceProspectMessages(
    { sequenceId, accountId, userId },
    { txid, logg, funcName }
) {
    logg.info(`started`);
    if (!sequenceId) throw `sequenceId is invalid`;

    let seqQueryObj = { _id: sequenceId, account: accountId };
    let sequenceDoc = await SequenceModel.findOne(seqQueryObj).lean();
    logg.info(`sequenceDoc: ${JSON.stringify(sequenceDoc)}`);

    if (!sequenceDoc)
        throw `sequenceDoc is invalid for sequenceId: ${sequenceId}`;

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
            },
            { txid }
        );
    if (scheduleErr) throw scheduleErr;

    logg.info(`ended`);
    return [scheduleResp, null];
}

export const setupSequenceProspectMessages = functionWrapper(
    fileName,
    "setupSequenceProspectMessages",
    _setupSequenceProspectMessages
);

async function _scheduleTimeForCampaignProspectsFromQAi(
    { campaignSequenceId, accountId, userId, sequenceStepId, prospects },
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
    // * These limits are for 1 sender as per GMail Restrictions. This needs to be adjusted for Outlook later.
    let perHourLimit = 20;
    let perDayLimit = 500;

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
        { prospects, defaultTz: "Asia/Calcutta" },
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

export function scheduleTimeForProspects(
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
    let scheduleTimes =
        SlotGen_utils.createFreeFromBusySlotsOpenLinkNewCustomHours(
            {
                busy: [],
                range_start_time: initialRangeTime,
                range_end_time: initialRangeTime + 14 * 24 * 60 * 60 * 1000,
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

function isSameDomainProspectScheduledForTime(
    { domainScheduledTimes, startTime, prospectDomain },
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
    logg.info(`ended with false`);
    return false;
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
    },
    { txid }
) {
    const funcName = "scheduleTimeForProspectForSender";
    const logg = logger.child({ txid, funcName });
    // logg.info(`started`);

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

    let [resp, err] = await executeCampaignStepUtil(
        { spmsDoc, spmsId },
        { txid, sendErrorMsg: true }
    );

    let failed = false;
    if (err) {
        logg.error(`err: ${err}`);
        failed = true;
        resp = { messageResponse: null, hasEmailBounced: null };
    }
    let { messageResponse, hasEmailBounced } = resp;

    let queryObj = { _id: spmsId };
    let messageStatus = "sent";
    if (failed) messageStatus = "failed";
    else if (hasEmailBounced) messageStatus = "bounced";

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

export const storeMessageSendAnalytic = functionWrapper(
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
        } else {
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
        } else {
            result.current_prospects.active++;
        }
    }

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
