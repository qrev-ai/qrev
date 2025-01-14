import { v4 as uuidv4 } from "uuid";
import { logger } from "../../logger.js";
import CustomError from "../../std/custom.error.js";
import * as QAiBotUtils from "../../utils/qai/qai.utils.js";
import * as CampaignUtils from "../../utils/campaign/campaign.utils.js";
import * as FileUtils from "../../utils/std/file.utils.js";

const fileName = "QAi Bot APIs";

export async function converseApi(req, res, next) {
    const txid = req.id;
    const funcName = "qai-converseApi";
    const logg = logger.child({ txid, funcName });
    logg.info(`started with body:` + JSON.stringify(req.body));
    logg.info(`started with query:` + JSON.stringify(req.query));

    let userId = req.user && req.user.userId ? req.user.userId : null;
    if (!userId) {
        logg.info(`ended unsuccessfully`);
        throw `Missing userId from decoded access token`;
    }

    let { account_id: accountId } = req.query;

    let {
        query,
        uploaded_data: uploadedData,
        conversation_id: conversationId,
        is_demo: isDemoConversation,
    } = req.body;

    let uploadedCsvFile = req.file;
    let uploadedCsvFilePath =
        uploadedCsvFile && uploadedCsvFile.path ? uploadedCsvFile.path : null;

    let conversationInfo = null,
        accountInfo = null,
        userInfo = null;
    try {
        if (uploadedCsvFilePath) {
            logg.info(`uploadedCsvFilePath: ${uploadedCsvFilePath}`);
            let csvData = await FileUtils.readCsvFile(
                { csvPath: uploadedCsvFilePath },
                { txid }
            );
            logg.info(
                `since csv file is uploaded, using it instead of uploaded_data`
            );
            uploadedData = csvData;
        }

        let [conversationDocResp, conversationDocErr] =
            await QAiBotUtils.getConversation(
                {
                    accountId,
                    userId,
                    conversationId,
                    getAccountAndUserInfo: true,
                },
                { txid }
            );
        if (conversationDocErr) throw conversationDocErr;
        if (!conversationDocResp) throw `Conversation not found`;
        conversationInfo = conversationDocResp.conversationInfo;
        accountInfo = conversationDocResp.accountInfo;
        userInfo = conversationDocResp.userInfo;
        if (!conversationInfo) throw `Conversation not found`;
        if (!accountInfo) throw `Account not found`;
        if (!userInfo) throw `User not found`;

        let [conversationResp, conversationErr] =
            await QAiBotUtils.addUserQueryToConversation(
                {
                    query,
                    accountId,
                    userId,
                    conversationId,
                    uploadedData,
                    conversation: conversationInfo,
                },
                { txid }
            );
        if (conversationErr) throw conversationErr;

        // get campaign defaults from Campaign Config in CampaignUtils
        let [campaignConfig, campaignConfigErr] =
            await CampaignUtils.getCampaignDefaults(
                { accountId, setDefaultIfNotFound: false },
                { txid }
            );
        if (campaignConfigErr) throw campaignConfigErr;

        let [botResp, botErr] = await QAiBotUtils.converse(
            {
                query,
                accountId,
                userId,
                uploadedData,
                uploadedCsvFilePath,
                conversationInfo,
                accountInfo,
                userInfo,
                campaignConfig,
                isDemoConversation,
                conversationId,
            },
            { txid }
        );

        if (botErr) {
            throw botErr;
        }

        /*
        // ! this is temporary static code
        let botResp = {
            actions: [
                {
                    type: "list", // same as before
                    title: "Here are some of the people:",
                    values:
                        uploadedData && uploadedData.length
                            ? uploadedData
                            : [
                                  {
                                      name: "John Doe",
                                      email: "johndoe@gmail.com",
                                      phone_number: "1234567890",
                                      subject: "Hey, this is a sample subject",
                                      body: "I hope this email finds you well. I wanted to reach out and share some thoughts on the ever-evolving landscape of technology and its impact on our daily lives. It's fascinating to observe how artificial intelligence and machine learning are revolutionizing various industries, from healthcare to finance. The potential for innovation seems limitless, and I can't help but wonder about the ethical implications and challenges we might face as these technologies become more integrated into our society. On a different note, I've been exploring the concept of sustainable living lately and have been impressed by the innovative solutions people are developing to reduce their carbon footprint. From vertical gardens in urban areas to zero-waste initiatives, it's inspiring to see communities coming together to address environmental concerns. Have you come across any interesting sustainability projects recently? I'd love to hear your thoughts on these topics and perhaps discuss how we can incorporate some of these ideas into our own lives or work. It's always exciting to exchange ideas and perspectives, especially in times of rapid change and progress. Looking forward to hearing back from you and potentially collaborating on some forward-thinking initiatives in the future.",
                                  },
                                  {
                                      name: "John Doe 2",
                                      email: "johndoe2@gmail.com",
                                      phone_number: "1234567890",
                                      subject: "Hey, this is a sample subject",
                                      body: "I trust this message finds you in good spirits. I've been reflecting on the importance of continuous learning and personal growth in our fast-paced world. It's remarkable how access to information has transformed the way we acquire knowledge and skills. From online courses to podcasts and interactive workshops, the opportunities for self-improvement are endless. Recently, I've been delving into the world of mindfulness and its potential benefits for both personal well-being and professional performance. The practice of being present and cultivating awareness seems to have far-reaching effects on stress reduction, decision-making, and overall life satisfaction. Have you had any experience with mindfulness or meditation? I'd be curious to hear your thoughts on the subject. In addition to personal development, I've been pondering the future of work and how remote collaboration tools are reshaping the way we interact and produce results. The pandemic has certainly accelerated this shift, but I believe we're only scratching the surface of what's possible in terms of virtual teamwork and global connectivity. It's an exciting time to be alive, with so many possibilities on the horizon. I'm always eager to discuss new ideas and perspectives, so please feel free to share your insights on any of these topics or bring up something entirely different that's been on your mind lately. Looking forward to engaging in a thought-provoking conversation!",
                                  },
                              ],
                },
                {
                    action: "text",
                    response:
                        "The Diwali offer campaign for the uploaded person with the specified outreach type (email) is starting to be created. You can find it in the campaign tab.",
                },
                {
                    type: "email_sequence_draft",
                    title: "Here is the draft",
                    subject:
                        "Exclusive Christmas Offer: 15% Off until Jan 2, 2024!",
                    body: "Celebrate this season with our exclusive Christmas offer! Get ahead in 2024 by enjoying a 15% discount on [Your Product/Service]. Embrace the festive spirit and make the most of this limited-time offer. Act before Jan 2, 2024, to avail yourself of this special discount",
                    sequence: {
                        id: "6c42055a-1026-4bb3-8a4d-4076f219b398",
                        name: "New year 20% offer campaign",
                        steps: [
                            {
                                id: "6a130fe1-a43c-4703-ab53-058330600738",
                                type: "ai_generated_email",
                                time_of_dispatch: {
                                    time_value: 1,
                                    time_unit: "day",
                                },
                            },
                            {
                                id: "df83d08e-4441-4bf5-a20c-ced9ed952bf9",
                                type: "ai_generated_email",
                                time_of_dispatch: {
                                    time_value: 3,
                                    time_unit: "day",
                                },
                            },
                        ],
                    },
                },
            ],
        };
        */

        let [qaiConversationResp, qaiConversationErr] =
            await QAiBotUtils.addQaiResponseToConversation(
                {
                    response: botResp,
                    accountId,
                    conversationId,
                    conversation: conversationInfo,
                },
                { txid }
            );
        if (qaiConversationErr) throw qaiConversationErr;

        logg.info(`ended successfully`);
        return res.json({
            success: true,
            message: `${funcName} executed successfully`,
            result: botResp,
        });
    } catch (errorInCode) {
        if (uploadedCsvFilePath) {
            let [deleteResp, deleteErr] = await FileUtils.deleteFile(
                { filePath: uploadedCsvFilePath },
                { txid }
            );
            if (deleteErr) {
                logg.error(
                    `Error deleting uploaded csv file: ${deleteErr}. but continuing...`
                );
            }
        }
        logg.info(`error in code: ${errorInCode}`);
        logg.info(`error happened`);
        let [errResp, errRespErr] =
            await QAiBotUtils.addQaiResponseToConversation(
                {
                    accountId,
                    conversationId,
                    isError: true,
                    conversation: conversationInfo,
                },
                { txid, sendErrorMsg: true }
            );
        if (errRespErr) throw errRespErr;

        return res.json({
            success: true,
            message: `${funcName} executed unsuccessfully`,
            result: errResp,
        });
    }
}

export async function createConversationApi(req, res, next) {
    const txid = req.id;
    const funcName = "qai-createConversationApi";
    const logg = logger.child({ txid, funcName });
    logg.info(`started with body:` + JSON.stringify(req.body));
    logg.info(`started with query:` + JSON.stringify(req.query));

    let userId = req.user && req.user.userId ? req.user.userId : null;
    if (!userId) {
        logg.info(`ended unsuccessfully`);
        throw `Missing userId from decoded access token`;
    }

    let { account_id: accountId } = req.query;

    let [conversation, conversationErr] = await QAiBotUtils.createConversation(
        { accountId, userId },
        { txid }
    );
    if (conversationErr) throw conversationErr;

    logg.info(`ended successfully`);
    return res.json({
        success: true,
        message: `${funcName} executed successfully`,
        conversation,
    });
}

export async function getConversationsApi(req, res, next) {
    const txid = req.id;
    const funcName = "qai-getConversationsApi";
    const logg = logger.child({ txid, funcName });
    logg.info(`started with body:` + JSON.stringify(req.body));
    logg.info(`started with query:` + JSON.stringify(req.query));

    let userId = req.user && req.user.userId ? req.user.userId : null;
    if (!userId) {
        logg.info(`ended unsuccessfully`);
        throw `Missing userId from decoded access token`;
    }

    let { account_id: accountId } = req.query;

    let [conversations, conversationsErr] = await QAiBotUtils.getConversations(
        { accountId, userId, sortByLatest: true },
        { txid }
    );
    if (conversationsErr) throw conversationsErr;

    logg.info(`ended successfully`);
    return res.json({
        success: true,
        message: `${funcName} executed successfully`,
        conversations,
    });
}

export async function getConversationApi(req, res, next) {
    const txid = req.id;
    const funcName = "qai-getConversationApi";
    const logg = logger.child({ txid, funcName });
    logg.info(`started with body:` + JSON.stringify(req.body));
    logg.info(`started with query:` + JSON.stringify(req.query));

    let userId = req.user && req.user.userId ? req.user.userId : null;
    if (!userId) {
        logg.info(`ended unsuccessfully`);
        throw `Missing userId from decoded access token`;
    }

    let { account_id: accountId, conversation_id: conversationId } = req.query;

    let [conversation, conversationErr] = await QAiBotUtils.getConversation(
        {
            accountId,
            userId,
            conversationId,
            updateTitleUsingAiIfNotDone: true,
        },
        { txid }
    );
    if (conversationErr) throw conversationErr;

    logg.info(`ended successfully`);
    return res.json({
        success: true,
        message: `${funcName} executed successfully`,
        conversation,
    });
}

export async function deleteConversationApi(req, res, next) {
    const txid = req.id;
    const funcName = "qai-deleteConversationApi";
    const logg = logger.child({ txid, funcName });
    logg.info(`started with body:` + JSON.stringify(req.body));
    logg.info(`started with query:` + JSON.stringify(req.query));

    let userId = req.user && req.user.userId ? req.user.userId : null;
    if (!userId) {
        logg.info(`ended unsuccessfully`);
        throw `Missing userId from decoded access token`;
    }

    let { account_id: accountId, conversation_id: conversationId } = req.query;

    let [deleteResp, deleteErr] = await QAiBotUtils.deleteConversation(
        { accountId, userId, conversationId },
        { txid }
    );
    if (deleteErr) throw deleteErr;

    logg.info(`ended successfully`);
    return res.json({
        success: true,
        message: `${funcName} executed successfully`,
    });
}

/*
 * Added on 2nd Jan 2025
 * When a QRev user opens the QDA front end app, we have designed UI such that in Qai bot, they will see any updates as a separate chat item.
 * This will let user know of any updates in Campaign Replies, Upcoming Meeting Battle Cards, New Qualified Leads.
 * So we need to fetch the count of above mentioned items and return it to the user.
 * Note: Currently we have only implemented Campaign Replies. Others need to be implemented later.
 * 
 * Sample response:
{
    "result": [
        {
            type: "email_replies_and_suggested_drafts",
            value: {
                count: 5,
            },
        },
        {
            type: "demo_calls",
            value: {
                count: 5,
            },
        },
        {
            type: "new_prospects",
            value: {
                count: 20,
            },
        },
    ]
}
 */
export async function getReviewUpdatesApi(req, res, next) {
    const txid = req.id;
    const funcName = "qai-getReviewUpdatesApi";
    const logg = logger.child({ txid, funcName });

    let userId = req.user && req.user.userId ? req.user.userId : null;
    if (!userId) {
        logg.info(`ended unsuccessfully`);
        throw new CustomError(
            `Missing userId from decoded access token`,
            fileName,
            funcName
        );
    }

    let { account_id: accountId } = req.query;

    let [reviewUpdates, reviewUpdatesErr] = await QAiBotUtils.getReviewUpdates(
        { accountId, userId },
        { txid }
    );
    if (reviewUpdatesErr) throw reviewUpdatesErr;

    logg.info(`ended successfully`);
    return res.json({
        success: true,
        message: `${funcName} executed successfully`,
        result: reviewUpdates,
    });
}
