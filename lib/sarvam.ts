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
      max_tokens: 1500,
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