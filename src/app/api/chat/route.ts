import { callSarvamStream } from '@/lib/sarvam';
import { buildSystemPrompt } from '@/lib/prompts';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { messages, questionCount } = await req.json();

    // Build a dynamic system prompt that tells the LLM exactly how many
    // questions it has asked already — critical for smart early wrap-up
    const systemPrompt = buildSystemPrompt(questionCount ?? 0);

    const sarvamMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ];

    const response = await callSarvamStream(sarvamMessages);

    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}