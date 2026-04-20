# ClarityAI — Google IDX Full Build Prompt

> Paste this entire prompt into Google IDX (Project IDX) AI assistant or Gemini Code Assist to scaffold the full app.

---

## PROMPT START

Build a complete production-ready Next.js 14 (App Router) TypeScript web application called **ClarityAI**.

---

## What is ClarityAI?

ClarityAI is an AI-powered decision assistant. It helps professionals and entrepreneurs make big decisions (starting a company, switching careers, raising funding, hiring a co-founder, etc.) by:

1. Asking the user what their big decision or problem is
2. Detecting the category (Startup, Career, Finance, Relationships, Legal, etc.)
3. Asking 4–6 focused clarifying questions one at a time
4. Analyzing user's answers
5. Giving a final structured recommendation with Pros, Cons, Risks, and a Personal Verdict

---

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS only (no external component libraries)
- **LLM**: Sarvam AI API (api.sarvam.ai)
- **Model**: `sarvam-m` (Sarvam 105B)
- **State**: React useState / useReducer (no Redux)
- **Storage**: localStorage for session history
- **Font**: Inter (Google Fonts)

---

## File Structure

```
clarityai/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css
│   └── api/
│       └── chat/
│           └── route.ts
├── components/
│   ├── Sidebar.tsx
│   ├── ChatArea.tsx
│   ├── MessageBubble.tsx
│   ├── ChoiceButtons.tsx
│   ├── InputBar.tsx
│   ├── PhaseIndicator.tsx
│   └── FinalReport.tsx
├── lib/
│   ├── sarvam.ts
│   ├── prompts.ts
│   └── types.ts
├── hooks/
│   └── useChat.ts
├── .env.local
├── tailwind.config.ts
└── package.json
```

---

## Environment Variables

Create `.env.local`:

```env
SARVAM_API_KEY=your_sarvam_api_key_here
SARVAM_BASE_URL=https://api.sarvam.ai/v1
```

---

## Detailed Implementation Instructions

### 1. `lib/types.ts`

```typescript
export type Phase = 'welcome' | 'questioning' | 'analyzing' | 'final';

export type MessageRole = 'user' | 'assistant';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  choices?: string[];
  isReport?: boolean;
  timestamp: number;
}

export interface Session {
  id: string;
  title: string;
  messages: Message[];
  phase: Phase;
  questionCount: number;
  totalQuestions: number;
  category: string;
  createdAt: number;
}

export interface FinalReport {
  summary: string;
  pros: string[];
  cons: string[];
  risks: string[];
  verdict: string;
  score: number; // 1-10 readiness score
}
```

---

### 2. `lib/prompts.ts`

```typescript
export const SYSTEM_PROMPT = `You are ClarityAI, a world-class decision advisor for professionals and entrepreneurs.

Your job is to help users make big, important decisions through a structured process:

PHASE 1 - UNDERSTAND: When user shares their problem, detect the category and acknowledge it warmly. Then ask the FIRST clarifying question only. Do not ask multiple questions at once.

PHASE 2 - QUESTION (repeat 4-6 times): Ask ONE focused clarifying question at a time. After each answer, ask the next question. Keep questions sharp and specific to the user's situation.

PHASE 3 - FINAL REPORT: After collecting enough information, generate a structured report in this EXACT JSON format:

{
  "type": "final_report",
  "summary": "2-3 sentence summary of the situation",
  "pros": ["pro 1", "pro 2", "pro 3"],
  "cons": ["con 1", "con 2", "con 3"],
  "risks": ["risk 1", "risk 2"],
  "verdict": "Your honest, direct recommendation in 2-3 sentences. Be decisive — tell them what to do.",
  "score": 7,
  "next_steps": ["Step 1: ...", "Step 2: ...", "Step 3: ..."]
}

Rules:
- Always be warm, professional, and direct
- Never ask more than one question at a time
- After 4-6 questions, move to the final report
- When giving choices, format them as: CHOICES: ["option 1", "option 2", "option 3"]
- Be honest — if someone is not ready, say so kindly but clearly
- Respond in the same language the user writes in (Hindi or English)`;

export const WELCOME_MESSAGE = `Hello! I'm **ClarityAI** — your personal decision advisor.

I help you think through big decisions step by step, so you never miss what matters.

**What's the big decision or challenge you're facing today?**

*(Examples: starting a startup, switching careers, hiring a co-founder, raising funding, relocating for work)*`;
```

---

### 3. `lib/sarvam.ts`

```typescript
interface SarvamMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface SarvamResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export async function callSarvam(messages: SarvamMessage[]): Promise<string> {
  const response = await fetch(`${process.env.SARVAM_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.SARVAM_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'sarvam-m',
      messages,
      max_tokens: 1500,
      temperature: 0.7,
      stream: false,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Sarvam API error: ${response.status} — ${error}`);
  }

  const data: SarvamResponse = await response.json();
  return data.choices[0].message.content;
}
```

---

### 4. `app/api/chat/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { callSarvam } from '@/lib/sarvam';
import { SYSTEM_PROMPT } from '@/lib/prompts';

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    const sarvamMessages = [
      { role: 'system' as const, content: SYSTEM_PROMPT },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ];

    const reply = await callSarvam(sarvamMessages);
    return NextResponse.json({ reply });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to get response from ClarityAI' },
      { status: 500 }
    );
  }
}
```

---

### 5. `hooks/useChat.ts`

```typescript
import { useState, useCallback } from 'react';
import { Message, Session, Phase } from '@/lib/types';
import { WELCOME_MESSAGE } from '@/lib/prompts';
import { nanoid } from 'nanoid';

function parseChoices(content: string): { text: string; choices: string[] } {
  const choiceMatch = content.match(/CHOICES:\s*\[([^\]]+)\]/);
  if (!choiceMatch) return { text: content, choices: [] };

  const choices = choiceMatch[1]
    .split(',')
    .map(c => c.trim().replace(/^["']|["']$/g, ''));
  const text = content.replace(/CHOICES:\s*\[([^\]]+)\]/, '').trim();
  return { text, choices };
}

function isJsonReport(content: string): boolean {
  return content.includes('"type": "final_report"') || content.includes('"type":"final_report"');
}

export function useChat() {
  const [session, setSession] = useState<Session>({
    id: nanoid(),
    title: 'New Session',
    messages: [{
      id: nanoid(),
      role: 'assistant',
      content: WELCOME_MESSAGE,
      timestamp: Date.now(),
    }],
    phase: 'welcome',
    questionCount: 0,
    totalQuestions: 5,
    category: '',
    createdAt: Date.now(),
  });

  const [loading, setLoading] = useState(false);

  const sendMessage = useCallback(async (userInput: string) => {
    if (!userInput.trim() || loading) return;

    const userMessage: Message = {
      id: nanoid(),
      role: 'user',
      content: userInput.trim(),
      timestamp: Date.now(),
    };

    const updatedMessages = [...session.messages, userMessage];

    setSession(prev => ({
      ...prev,
      messages: updatedMessages,
      title: prev.title === 'New Session' ? userInput.slice(0, 40) + '...' : prev.title,
    }));

    setLoading(true);

    try {
      const apiMessages = updatedMessages
        .filter(m => !m.isReport)
        .map(m => ({ role: m.role, content: m.content }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages }),
      });

      const data = await response.json();
      const rawReply: string = data.reply;

      let aiMessage: Message;

      if (isJsonReport(rawReply)) {
        aiMessage = {
          id: nanoid(),
          role: 'assistant',
          content: rawReply,
          isReport: true,
          timestamp: Date.now(),
        };
        setSession(prev => ({
          ...prev,
          messages: [...updatedMessages, aiMessage],
          phase: 'final',
        }));
      } else {
        const { text, choices } = parseChoices(rawReply);
        aiMessage = {
          id: nanoid(),
          role: 'assistant',
          content: text,
          choices: choices.length > 0 ? choices : undefined,
          timestamp: Date.now(),
        };
        setSession(prev => ({
          ...prev,
          messages: [...updatedMessages, aiMessage],
          phase: prev.phase === 'welcome' ? 'questioning' : prev.phase,
          questionCount: prev.questionCount + 1,
        }));
      }
    } catch (error) {
      console.error('Send error:', error);
      const errMessage: Message = {
        id: nanoid(),
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.',
        timestamp: Date.now(),
      };
      setSession(prev => ({
        ...prev,
        messages: [...updatedMessages, errMessage],
      }));
    } finally {
      setLoading(false);
    }
  }, [session, loading]);

  const newSession = useCallback(() => {
    setSession({
      id: nanoid(),
      title: 'New Session',
      messages: [{
        id: nanoid(),
        role: 'assistant',
        content: WELCOME_MESSAGE,
        timestamp: Date.now(),
      }],
      phase: 'welcome',
      questionCount: 0,
      totalQuestions: 5,
      category: '',
      createdAt: Date.now(),
    });
  }, []);

  return { session, loading, sendMessage, newSession };
}
```

---

### 6. `components/FinalReport.tsx`

```typescript
'use client';

import { FinalReport as FinalReportType } from '@/lib/types';

interface Props {
  content: string;
}

export default function FinalReport({ content }: Props) {
  let report: FinalReportType & { next_steps?: string[] };

  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON');
    report = JSON.parse(jsonMatch[0]);
  } catch {
    return <p className="text-sm text-gray-500">Could not parse report.</p>;
  }

  const score = Math.min(10, Math.max(1, report.score || 5));

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
          Decision Report
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Readiness</span>
          <div className="flex gap-0.5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className={`w-3 h-2 rounded-sm ${
                  i < score ? 'bg-indigo-500' : 'bg-gray-100'
                }`}
              />
            ))}
          </div>
          <span className="text-xs font-medium text-indigo-600">{score}/10</span>
        </div>
      </div>

      <p className="text-sm text-gray-600 leading-relaxed border-l-2 border-indigo-200 pl-3">
        {report.summary}
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-green-50 rounded-xl p-3">
          <p className="text-xs font-semibold text-green-700 mb-2">Pros</p>
          <ul className="space-y-1">
            {report.pros?.map((p, i) => (
              <li key={i} className="text-xs text-green-800 flex gap-1.5">
                <span className="text-green-400 mt-0.5">+</span>{p}
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-red-50 rounded-xl p-3">
          <p className="text-xs font-semibold text-red-700 mb-2">Cons</p>
          <ul className="space-y-1">
            {report.cons?.map((c, i) => (
              <li key={i} className="text-xs text-red-800 flex gap-1.5">
                <span className="text-red-400 mt-0.5">−</span>{c}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {report.risks && report.risks.length > 0 && (
        <div className="bg-amber-50 rounded-xl p-3">
          <p className="text-xs font-semibold text-amber-700 mb-2">Key Risks</p>
          <ul className="space-y-1">
            {report.risks.map((r, i) => (
              <li key={i} className="text-xs text-amber-800 flex gap-1.5">
                <span className="text-amber-500 mt-0.5">!</span>{r}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3">
        <p className="text-xs font-semibold text-indigo-700 mb-1">My Verdict</p>
        <p className="text-sm text-indigo-900 leading-relaxed">{report.verdict}</p>
      </div>

      {report.next_steps && report.next_steps.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-2">Next Steps</p>
          <ol className="space-y-1">
            {report.next_steps.map((step, i) => (
              <li key={i} className="text-xs text-gray-700 flex gap-2">
                <span className="text-indigo-500 font-medium shrink-0">{i + 1}.</span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
```

---

### 7. Main `app/page.tsx` Layout

Build `page.tsx` as a two-panel layout:

**Left Sidebar (220px fixed)**:
- ClarityAI logo (with purple accent on "AI")
- "+ New Session" button
- Recent sessions list from localStorage
- Each session shows title truncated to 1 line

**Right Main Panel (flex-1)**:
- Top bar with session title + Phase indicator pill
- Progress bar (fills based on questionCount / totalQuestions)
- Chat area with messages
- Input bar at bottom

---

### 8. UI Design Rules (IMPORTANT)

- **Background**: pure white `#ffffff`
- **Primary accent color**: `#6b6ef9` (indigo-purple)
- **Font**: Inter, 14px base
- **No shadows** except subtle `shadow-sm` on cards
- **No gradients**
- **Border style**: `border border-gray-100` or `border-gray-200`
- **Message bubbles**:
  - AI: `bg-gray-50 text-gray-800` rounded `rounded-2xl rounded-tl-sm`
  - User: `bg-indigo-500 text-white` rounded `rounded-2xl rounded-tr-sm`
- **Input bar**: flat white, border-top only, no card shadow
- The overall feel should match **early ChatGPT (2022)** — minimal, clean, focused

---

### 9. `app/globals.css`

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

* {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}

body {
  background-color: #ffffff;
  color: #111111;
}

::-webkit-scrollbar {
  width: 4px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: #e0e0e0;
  border-radius: 4px;
}

textarea:focus, input:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(107, 110, 249, 0.2);
}
```

---

### 10. Install Dependencies

```bash
npm install nanoid
```

---

### 11. `package.json` scripts

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  }
}
```

---

### 12. `.idx/dev.nix` (for Google IDX)

```nix
{ pkgs }: {
  channel = "stable-23.11";
  packages = [ pkgs.nodejs_20 ];
  idx.previews = {
    previews = {
      web = {
        command = ["npm" "run" "dev" "--" "--port" "$PORT" "--hostname" "0.0.0.0"];
        manager = "web";
      };
    };
  };
}
```

---

## Conversation Flow (for AI to follow)

```
User opens app
  → ClarityAI shows welcome message

User types problem
  → AI detects category, acknowledges, asks Question 1
  → [Optional: shows 2-3 choice buttons]

User answers Q1
  → AI asks Question 2
  ...repeat for 4-6 questions...

After enough context collected
  → AI returns JSON final report
  → App renders FinalReport component with pros/cons/verdict/score

User can start a new session anytime
```

---

## PROMPT END

---

*Built for Google IDX | Next.js 14 | TypeScript | Sarvam AI 105B | Tailwind CSS*