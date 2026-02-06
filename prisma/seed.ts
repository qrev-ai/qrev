import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // 1. Create a dev user
  const user = await db.user.upsert({
    where: { email: "dev@qrev.ai" },
    update: {},
    create: {
      id: "dev-user",
      name: "Dev User",
      email: "dev@qrev.ai",
    },
  });
  console.log(`  User: ${user.email}`);

  // 2. Create a workspace
  const workspace = await db.workspace.upsert({
    where: { id: "demo" },
    update: {},
    create: {
      id: "demo",
      name: "Demo Workspace",
    },
  });
  console.log(`  Workspace: ${workspace.name}`);

  // 3. Add user as admin of workspace
  await db.workspaceMember.upsert({
    where: {
      userId_workspaceId: { userId: user.id, workspaceId: workspace.id },
    },
    update: {},
    create: {
      userId: user.id,
      workspaceId: workspace.id,
      role: "ADMIN",
    },
  });

  // 4. Create prospects
  const prospects = [
    { email: "john@acme.com", firstName: "John", lastName: "Smith", company: "Acme Inc", title: "CTO" },
    { email: "sarah@betacorp.io", firstName: "Sarah", lastName: "Johnson", company: "Beta Corp", title: "VP Engineering" },
    { email: "mike@gamma.ai", firstName: "Mike", lastName: "Chen", company: "Gamma AI", title: "Head of Growth" },
    { email: "lisa@delta.com", firstName: "Lisa", lastName: "Park", company: "Delta Inc", title: "CTO" },
    { email: "raj@epsilon.io", firstName: "Raj", lastName: "Patel", company: "Epsilon Labs", title: "CEO" },
    { email: "emma@zeta.co", firstName: "Emma", lastName: "Wilson", company: "Zeta Finance", title: "VP Sales" },
    { email: "alex@theta.dev", firstName: "Alex", lastName: "Kim", company: "Theta Dev", title: "CTO" },
    { email: "maria@iota.com", firstName: "Maria", lastName: "Garcia", company: "Iota Systems", title: "Director of Engineering" },
    { email: "james@kappa.io", firstName: "James", lastName: "Brown", company: "Kappa Ventures", title: "Partner" },
    { email: "nina@lambda.ai", firstName: "Nina", lastName: "Tanaka", company: "Lambda AI", title: "Head of Product" },
    { email: "tom@acme.com", firstName: "Tom", lastName: "Lee", company: "Acme Inc", title: "VP Product" },
    { email: "anna@betacorp.io", firstName: "Anna", lastName: "White", company: "Beta Corp", title: "Engineering Manager" },
  ];

  const createdProspects = [];
  for (const p of prospects) {
    const prospect = await db.prospect.upsert({
      where: { workspaceId_email: { workspaceId: workspace.id, email: p.email } },
      update: {},
      create: { ...p, workspaceId: workspace.id },
    });
    createdProspects.push(prospect);
  }
  console.log(`  Prospects: ${createdProspects.length}`);

  // 5. Create campaigns
  const campaign1 = await db.campaign.upsert({
    where: { id: "campaign-1" },
    update: {},
    create: {
      id: "campaign-1",
      workspaceId: workspace.id,
      name: "Fintech CTOs Q1 Outreach",
      description: "Cold outreach to fintech CTOs about our AI platform",
      status: "ACTIVE",
    },
  });

  const campaign2 = await db.campaign.upsert({
    where: { id: "campaign-2" },
    update: {},
    create: {
      id: "campaign-2",
      workspaceId: workspace.id,
      name: "Series A Founders",
      description: "Targeting recently funded startup founders",
      status: "DRAFT",
    },
  });

  const campaign3 = await db.campaign.upsert({
    where: { id: "campaign-3" },
    update: {},
    create: {
      id: "campaign-3",
      workspaceId: workspace.id,
      name: "Enterprise Re-engagement",
      description: "Re-engage churned enterprise leads",
      status: "PAUSED",
    },
  });
  console.log(`  Campaigns: 3`);

  // 6. Add steps to campaign 1
  for (const step of [
    { stepNumber: 1, delayDays: 0, subjectTemplate: "Quick question about {{company}}", bodyTemplate: "Hi {{firstName}},\n\nI noticed {{company}} has been growing rapidly. As {{title}}, you're probably dealing with scaling challenges.\n\nWe've helped similar companies reduce outbound costs by 60%.\n\nWorth a quick chat?\n\nBest" },
    { stepNumber: 2, delayDays: 3, subjectTemplate: "Re: Quick question about {{company}}", bodyTemplate: "Hi {{firstName}},\n\nJust following up on my previous email. I'd love to share how we helped a similar company in your space.\n\nDo you have 15 minutes this week?\n\nBest" },
    { stepNumber: 3, delayDays: 5, subjectTemplate: "Last try - {{company}}", bodyTemplate: "Hi {{firstName}},\n\nI know you're busy, so I'll keep this short. If outbound efficiency isn't a priority right now, no worries at all.\n\nBut if it is, I'd love to show you what we've built.\n\nBest" },
  ]) {
    await db.campaignStep.upsert({
      where: { campaignId_stepNumber: { campaignId: campaign1.id, stepNumber: step.stepNumber } },
      update: {},
      create: { ...step, campaignId: campaign1.id },
    });
  }

  // 7. Add prospects to campaigns with various statuses
  const statuses = ["SENT", "REPLIED", "SENT", "PENDING", "BOUNCED", "SENT"];
  for (let i = 0; i < 6; i++) {
    await db.campaignProspect.upsert({
      where: {
        campaignId_prospectId: { campaignId: campaign1.id, prospectId: createdProspects[i].id },
      },
      update: {},
      create: {
        campaignId: campaign1.id,
        prospectId: createdProspects[i].id,
        status: statuses[i] as any,
        currentStep: statuses[i] === "PENDING" ? 0 : statuses[i] === "BOUNCED" ? 1 : 2,
        lastSentAt: statuses[i] !== "PENDING" ? new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) : null,
      },
    });
  }

  for (let i = 6; i < 10; i++) {
    await db.campaignProspect.upsert({
      where: {
        campaignId_prospectId: { campaignId: campaign2.id, prospectId: createdProspects[i].id },
      },
      update: {},
      create: {
        campaignId: campaign2.id,
        prospectId: createdProspects[i].id,
        status: "PENDING",
      },
    });
  }

  // 8. Create a sample conversation
  const convo = await db.conversation.upsert({
    where: { id: "convo-1" },
    update: {},
    create: {
      id: "convo-1",
      workspaceId: workspace.id,
      title: "Help me write a cold email",
    },
  });

  await db.message.deleteMany({ where: { conversationId: convo.id } });
  await db.message.createMany({
    data: [
      {
        conversationId: convo.id,
        role: "user",
        content: "Help me write a cold email to a fintech CTO",
      },
      {
        conversationId: convo.id,
        role: "assistant",
        content:
          "Here's a cold email draft for a fintech CTO:\n\n**Subject:** Quick question about scaling\n\n**Body:**\n\nHi [Name],\n\nI saw [Company] just raised a Series B — congrats! At this stage, most fintech CTOs I talk to are dealing with two things: scaling their outbound and keeping reply rates up.\n\nWe built an AI platform that helps teams like yours personalize outreach at scale. Companies like [similar company] saw a 3x increase in reply rates.\n\nWorth 15 minutes this week?\n\nBest,\n[Your name]",
      },
    ],
  });
  console.log(`  Conversations: 1 (with 2 messages)`);

  console.log("\nDone! Your demo workspace is ready.");
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
