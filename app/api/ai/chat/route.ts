import { NextRequest } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const QAI_SYSTEM_PROMPT = `You are QAi, an AI assistant for GTM (Go-To-Market) teams. You help with:
- Creating and managing email campaigns
- Researching prospects and companies
- Generating personalized outreach emails
- Analyzing campaign performance

Be concise, helpful, and proactive. When users want to create campaigns, guide them through the process.`;

export async function POST(request: NextRequest) {
  const { messages } = await request.json();

  const stream = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'system', content: QAI_SYSTEM_PROMPT }, ...messages],
    stream: true,
  });

  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || '';
        controller.enqueue(encoder.encode(text));
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
    },
  });
}
