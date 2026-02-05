import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const QAI_SYSTEM_PROMPT = `You are QAi, an AI assistant for GTM (Go-To-Market) teams. You help with:
- Creating and managing email campaigns
- Researching prospects and companies
- Generating personalized outreach emails
- Analyzing campaign performance

Be concise, helpful, and proactive. When users want to create campaigns, guide them through the process.`;

export async function chat(
  messages: Message[],
  onChunk?: (text: string) => void
): Promise<string> {
  const stream = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'system', content: QAI_SYSTEM_PROMPT }, ...messages],
    stream: true,
  });

  let fullResponse = '';
  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content || '';
    fullResponse += text;
    onChunk?.(text);
  }
  return fullResponse;
}

export async function generateEmail(
  prospect: {
    firstName?: string;
    lastName?: string;
    company?: string;
    title?: string;
    research?: any;
  },
  template: string,
  step: number = 1
): Promise<{ subject: string; body: string }> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are an expert email copywriter. Generate personalized, compelling outreach emails.
Rules:
- Keep subject lines under 7 words
- Be specific and relevant to the prospect
- No generic phrases like "I hope this email finds you well"
- Include a clear call to action
- Sound human, not robotic
Return JSON: {"subject": "...", "body": "..."}`,
      },
      {
        role: 'user',
        content: `Generate email step ${step} for:
Prospect: ${prospect.firstName} ${prospect.lastName}
Company: ${prospect.company}
Title: ${prospect.title}
Research: ${JSON.stringify(prospect.research || {})}

Template/Context: ${template}`,
      },
    ],
    response_format: { type: 'json_object' },
  });

  return JSON.parse(response.choices[0].message.content || '{}');
}

export async function researchProspect(
  name: string,
  company: string
): Promise<{
  company: { summary: string; industry: string; size: string; funding?: string };
  person: { background: string; interests: string[] };
  insights: string[];
}> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are a research assistant. Provide realistic, plausible research about companies and people.
Return JSON with: company (summary, industry, size, funding), person (background, interests[]), insights[]`,
      },
      {
        role: 'user',
        content: `Research: ${name} at ${company}`,
      },
    ],
    response_format: { type: 'json_object' },
  });

  return JSON.parse(response.choices[0].message.content || '{}');
}
