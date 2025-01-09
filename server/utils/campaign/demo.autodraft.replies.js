import CustomError from "../../std/custom.error.js";

const fileName = "Demo Autodraft Replies";

let AutoDraftReplies = [
    {
        id: "test-id-1",
        user_name: "William Schaude",
        user_email: "william.schaude@acme.com",
        subject: "Re: AI based GTM",
        user_message:
            "Sounds interesting! \n\n \n\nWe're particularly interested in how QRev handles scaling challenges with AI.\n\n Happy to schedule a demo.",
        message_sent_on: "2024-10-07T10:10:07",
        tag: "positive",
        status: "pending",
        draft: "Great to heat that William. please share your availability and I will schedule a demo.",
    },
    {
        id: "test-id-2",
        user_name: "Sarah Parker",
        user_email: "sarah.parker@innovatorshub.net",
        subject: "Re: AI based GTM",
        user_message:
            "Thanks for the email. The concept is intriguing, but how easy is it to adapt? Would love some more information on how it works. \n\n",
        message_sent_on: "2024-09-17T10:10:07",
        tag: "slightly positive",
        status: "pending",
        draft: "Hi Sarah, Happy Friday. QRev has been designed to be intuitive for teams of all levels.",
    },
    {
        id: "test-id-3",
        user_name: "Jessica Taylor",
        user_email: "jessica.taylor@financecloud.io",
        subject: "Re: AI based GTM",
        user_message:
            "We are looking to implement a new AI based GTM.\n\nYou reached out at the perfect time. We are just about to start a new project and would love to chat.",
        message_sent_on: "2024-09-15T10:10:07",
        tag: "positive",
        status: "pending",
        draft: "That's great to hear Jessica. Would you have some time next Wednesday at 10am EST to chat?",
    },
    {
        id: "test-id-4",
        user_name: "David Wilson",
        user_email: "david.wilson@mediclinx.org",
        subject: "Re: AI based GTM",
        user_message:
            "Thanks but I think you'd be better off talking to my colleague Anna. She's the new Director of Sales.\n\nHer email is anna.smith@mediclinx.org",
        message_sent_on: "2024-10-14T10:10:07",
        tag: "slightly negative",
        status: "pending",
        draft: "Thanks David. I'll reach out to Anna. Appreciate your revert and guidance",
    },
    {
        id: "test-id-5",
        user_name: "Isabella Thomas",
        user_email: "isabella.thomas@skyreachsystems.com",
        subject: "Re: AI based GTM",
        user_message:
            "We've used Apollo, Sales navigator and few others. \n\nWhat makes QRev different from those?\n\n And does it integrate with our Salesforce?",
        message_sent_on: "2024-09-22T10:10:07",
        tag: "slightly negative",
        status: "sent",
        draft: "Hi Isabella, QRev is built on top of the latest LLM technology, with a focus on ease of use and scalability. \n\nThe best part is that there's very little human involvement. \n\nAnd it integrates with Salesforce and other CRM systems, and is designed to help sales teams work more efficiently.",
    },
    {
        id: "test-id-6",
        user_name: "Henry Clark",
        user_email: "henry.clark@dataspherelabs.com",
        subject: "Re: AI based GTM",
        user_message:
            "I'd like to see a demo, but I'd like to know more about the learning curve for my team. \n\nHow easy is it for non-technical staff to get up to speed with using QRev effectively?",
        message_sent_on: "2024-10-12T10:10:07",
        tag: "slightly positive",
        status: "sent",
        draft: "Thanks for your interest Henry. We're happy to provide a demo and answer any questions you have. Please share your availability and we can schedule a time.",
    },
];

export function getPendingAutoDraftReplies(fetchType, returnCountOnly = false) {
    let data = AutoDraftReplies.filter(
        (reply) => reply.status === fetchType
    );

    // if pendingData is empty, then set status of every AutoDraftReplies to 'pending'
    if (data.length === 0 && fetchType === "pending") {
        AutoDraftReplies.forEach((reply) => {
            reply.status = "pending";
        });

        data = AutoDraftReplies;
    }

    // return every field excpet status
    data = data.map((reply) => {
        let { status, ...rest } = reply;
        return rest;
    });
    return returnCountOnly ? data.length : data;
}

export function getSentAutoDraftReplies() {
    return AutoDraftReplies.filter((reply) => reply.status === "sent");
}

export function shouldUserBeShownDemoAutoDraftReplies(userId) {
    const demoAutoDraftRepliesUserId =
        process.env.DEMO_AUTO_DRAFT_REPLIES_USER_ID;
    return userId === demoAutoDraftRepliesUserId;
}

export function setSentStatus(id) {
    const funcName = "setSentStatus";
    let reply = AutoDraftReplies.find((reply) => reply.id === id);
    if (reply) {
        reply.status = "sent";
    } else {
        throw new CustomError(`Reply not found`, fileName, funcName);
    }

    return reply;
}
