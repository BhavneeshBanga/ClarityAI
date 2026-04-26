import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET /api/sessions/[id] — load a full session with all messages
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const chatSession = await prisma.chatSession.findFirst({
    where: {
      id:     params.id,
      userId: session.user.id, // ensure users can only read their own sessions
    },
    include: {
      messages: {
        orderBy: { timestamp: 'asc' },
      },
    },
  });

  if (!chatSession) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Reshape to match the client-side Session type
  const shaped = {
    id:            chatSession.id,
    title:         chatSession.title,
    phase:         chatSession.phase,
    mode:          chatSession.mode,
    questionCount: chatSession.questionCount,
    totalQuestions: chatSession.totalQuestions,
    category:      chatSession.category ?? '',
    branchedFrom:  chatSession.branchedFrom ?? undefined,
    createdAt:     chatSession.createdAt.getTime(),
    messages: chatSession.messages.map((m: any) => ({
      id:            m.id,
      role:          m.role,
      content:       m.content,
      isReport:      m.isReport,
      isError:       m.isError,
      choices:       m.choicesJson ? JSON.parse(m.choicesJson) : undefined,
      allowCustom:   m.allowCustom || undefined,
      timestamp:     m.timestamp,
    })),
  };

  return NextResponse.json({ session: shaped });
}

// DELETE /api/sessions/[id] — delete a session
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await prisma.chatSession.deleteMany({
    where: {
      id:     params.id,
      userId: session.user.id,
    },
  });

  return NextResponse.json({ ok: true });
}
