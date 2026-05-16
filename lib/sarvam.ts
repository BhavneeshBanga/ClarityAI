interface SarvamMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export async function callSarvamStream(messages: SarvamMessage[]): Promise<Response> {
  const response = await fetch(`${process.env.SARVAM_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.SARVAM_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'sarvam-105b',
      messages,
      max_tokens: 4096,
      temperature: 0.7,
      stream: true,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Sarvam API error: ${response.status} — ${error}`);
  }

  return response;
}

export async function transcribeAudio(audioBuffer: Buffer, filename: string = 'audio.wav'): Promise<string> {
  const formData = new FormData();
  const blob = new Blob([audioBuffer as unknown as BlobPart], { type: 'audio/wav' });
  formData.append('file', blob, filename);
  // Optional, but recommended for some models
  formData.append('model', 'saaras:v3');
  
  const response = await fetch(`https://api.sarvam.ai/speech-to-text`, {
    method: 'POST',
    headers: {
      'api-subscription-key': process.env.SARVAM_API_KEY || '',
    },
    body: formData as any,
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Sarvam STT Error:', error);
    throw new Error(`Sarvam STT API error: ${response.status} — ${error}`);
  }

  const data = await response.json();
  // Return the transcript
  return data.transcript || '';
}