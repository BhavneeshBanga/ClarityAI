import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sessions = await prisma.chatSession.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      phase: true,
      mode: true,
      branchedFrom: true,
      createdAt: true,
      _count: {
        select: { messages: true }
      }
    }
  });

  return NextResponse.json({ sessions });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { id, title, phase, mode, questionCount, totalQuestions, category, branchedFrom, messages, createdAt } = body;

  await prisma.chatSession.upsert({
    where: { id },
    update: {
      title,
      phase,
      mode,
      questionCount,
      totalQuestions,
      category,
      updatedAt: new Date(),
    },
    create: {
      id,
      userId: session.user.id,
      title,
      phase,
      mode,
      questionCount,
      totalQuestions,
      category,
      branchedFrom,
      createdAt: new Date(createdAt || Date.now()),
    }
  });

  if (messages && Array.isArray(messages)) {
    for (const msg of messages) {
      await prisma.message.upsert({
        where: { id: msg.id },
        update: {
          role: msg.role,
          content: msg.content,
          isReport: msg.isReport,
          isError: msg.isError,
          choicesJson: msg.choices ? JSON.stringify(msg.choices) : null,
          allowCustom: msg.allowCustom,
        },
        create: {
          id: msg.id,
          chatSessionId: id,
          role: msg.role,
          content: msg.content,
          isReport: msg.isReport,
          isError: msg.isError,
          choicesJson: msg.choices ? JSON.stringify(msg.choices) : null,
          allowCustom: msg.allowCustom || false,
          timestamp: msg.timestamp ? (typeof msg.timestamp === 'number' ? msg.timestamp : new Date(msg.timestamp).getTime()) : Date.now(),
        }
      });
    }
  }

  return NextResponse.json({ ok: true });
}
