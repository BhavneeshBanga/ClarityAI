import { buildSystemPrompt, buildMCQSystemPrompt } from '@/lib/prompts';
import { callSarvamStream } from '@/lib/sarvam';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

const MAX_MESSAGE_LENGTH = 8_000;
const MAX_MESSAGES       = 60;

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { messages, questionCount, mode, memoryNote } = body;

    // ── Validation ────────────────────────────────────────────────────────
    if (!Array.isArray(messages)) {
      return NextResponse.json({ error: 'messages must be an array' }, { status: 400 });
    }
    if (messages.length > MAX_MESSAGES) {
      return NextResponse.json({ error: 'Too many messages in session' }, { status: 400 });
    }

    const qCount      = typeof questionCount === 'number' && Number.isFinite(questionCount) ? questionCount : 0;
    const sessionMode = mode === 'mcq' ? 'mcq' : 'standard';

    // Sanitize messages
    const sanitized = messages
      .filter((m: unknown) => m && typeof m === 'object')
      .map((m: { role?: unknown; content?: unknown }) => ({
        role: (m.role === 'user' || m.role === 'assistant') ? (m.role as 'user' | 'assistant') : 'user',
        content: String(m.content ?? '').slice(0, MAX_MESSAGE_LENGTH),
      }))
      .filter((m) => m.content.length > 0);

    const systemPrompt =
      sessionMode === 'mcq'
        ? buildMCQSystemPrompt(qCount)
        : buildSystemPrompt(qCount);

    // ── Memory injection ─────────────────────────────────────────────────
    let finalMessages = sanitized;
    if (memoryNote && typeof memoryNote === 'string' && sanitized.length > 0) {
      const lastUserIdx = sanitized.length - 1;
      finalMessages = [
        ...sanitized.slice(0, lastUserIdx),
        { role: 'user' as const, content: memoryNote.slice(0, 2000) },
        { role: 'assistant' as const, content: 'Understood. I have reviewed everything you\'ve shared. Continuing with your session.' },
        sanitized[lastUserIdx],
      ];
    }

    const sarvamMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...finalMessages,
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
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}