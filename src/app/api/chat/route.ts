import { callSarvamStream } from '@/lib/sarvam';
import { buildSystemPrompt, buildMCQSystemPrompt } from '@/lib/prompts';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, questionCount, mode } = body;

    // ── Input validation ──────────────────────────────────────────────
    if (!Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'messages must be an array' },
        { status: 400 }
      );
    }

    const qCount =
      typeof questionCount === 'number' && Number.isFinite(questionCount)
        ? questionCount
        : 0;

    const sessionMode =
      mode === 'mcq' ? 'mcq' : 'standard';

    // Build a dynamic system prompt that tells the LLM exactly how many
    // questions it has asked already — critical for smart early wrap-up
    const systemPrompt =
      sessionMode === 'mcq'
        ? buildMCQSystemPrompt(qCount)
        : buildSystemPrompt(qCount);

    const sarvamMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: String(m.content ?? ''),
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