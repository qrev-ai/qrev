import { NextRequest } from 'next/server';
import OpenAI from 'openai';

// Force dynamic rendering - don't try to statically analyze at build time
export const dynamic = 'force-dynamic';

// Lazy initialization to avoid build-time errors
let _openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return _openai;
}

const QAI_SYSTEM_PROMPT = `You are QAi, an AI assistant for GTM (Go-To-Market) teams. You help with:
- Creating and managing email campaigns
- Researching prospects and companies
- Generating personalized outreach emails
- Analyzing campaign performance

Be concise, helpful, and proactive. When users want to create campaigns, guide them through the process.`;

export async function POST(request: NextRequest) {
  const { messages } = await request.json();

  const stream = await getOpenAI().chat.completions.create({
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
