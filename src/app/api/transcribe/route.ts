import { NextResponse } from 'next/server';
import { transcribeAudio } from '@/lib/sarvam';
import { auth } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const session = await auth();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userId = (session?.user as any)?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const transcript = await transcribeAudio(buffer, file.name || 'audio.webm');

    return NextResponse.json({ transcript });
  } catch (error) {
    console.error('Transcription API error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
