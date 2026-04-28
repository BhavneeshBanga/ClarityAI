# ClarityAI Deep Dive Architecture & Code Flow
**An exhaustive, masterclass-level breakdown for developers transitioning from Python/Flask to Modern Web Development.**

---

## 🟢 INTRODUCTION: The Mindset Shift (Flask vs. Next.js)

Welcome to the deep dive. Since you already know Python, Flask, DSA, HTML, and CSS, you understand the fundamentals of web development: a client makes an HTTP request, the server processes it, talks to a database, and returns a response (usually HTML or JSON).

In **Flask**, you typically have:
1. `app.py` or `routes.py` defining your endpoints.
2. Jinja templates (`index.html`) rendered on the server.
3. SQLAlchemy for your database.
4. WTForms for handling inputs.

**Next.js 15 (App Router)** completely changes this paradigm. It is a "Full-Stack React Framework". 
*   **React** handles the UI components (the "V" in MVC).
*   **Next.js** handles the routing, server-side rendering, and backend APIs (the "C" and "M").
*   Instead of Jinja templates, you write UI using **JSX/TSX** (JavaScript/TypeScript XML).
*   Instead of SQLAlchemy, we use **Prisma ORM**.
*   Instead of Flask-Login, we use **NextAuth.js**.

The biggest shift is understanding **Where code runs**. 
In Next.js, code either runs on the **Server** (Node.js environment, can securely access the database, API keys) or on the **Client** (the user's browser, can handle clicks, state, animations).

Let's break down your entire project file by file, line by line.

---

## 🟢 CHAPTER 1: Project Structure & The App Router

Next.js uses a file-system-based router.

```text
ClarityAI/
├── prisma/
│   └── schema.prisma        <-- Database schema
├── lib/
│   ├── auth.ts              <-- Authentication config
│   ├── prisma.ts            <-- Database client initialization
│   ├── prompts.ts           <-- AI System prompts
│   ├── sarvam.ts            <-- AI API caller
│   └── types.ts             <-- TypeScript definitions
├── hooks/
│   └── useChat.ts           <-- Custom React Hook for chat logic
├── components/
│   ├── FinalReport.tsx      <-- UI Component
│   ├── MCQInput.tsx         <-- UI Component
│   └── EditableUserMessage.tsx <-- UI Component
├── src/
│   └── app/                 <-- NEXT.JS APP ROUTER ROOT
│       ├── layout.tsx       <-- The global HTML wrapper
│       ├── page.tsx         <-- The main route (/) UI
│       └── api/             <-- Backend Routes
│           └── chat/
│               └── route.ts <-- Backend route for POST /api/chat
```

### The `src/app` Directory Magic
In Flask, you do `@app.route('/api/chat')`. 
In Next.js, you simply create a folder `src/app/api/chat` and put a file named `route.ts` inside it. Next.js automatically turns this into the `/api/chat` endpoint!
Similarly, `src/app/page.tsx` becomes the UI for the `/` (home) route.

---

## 🟢 CHAPTER 2: The Database Layer (Prisma & PostgreSQL)
*File: `prisma/schema.prisma`*

Prisma is to TypeScript what SQLAlchemy is to Python. It translates your TypeScript code into secure SQL queries.

### 2.1 The Connection
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```
This tells Prisma: "We are using PostgreSQL. Go get the connection string from the `.env` file."

### 2.2 NextAuth Boilerplate Models
```prisma
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String?   @unique
  emailVerified DateTime?
  image         String?
  accounts      Account[]
  sessions      Session[]
  chatSessions  ChatSession[]
}
```
NextAuth requires specific tables to work (`User`, `Account`, `Session`, `VerificationToken`). 
*   `@id @default(cuid())`: This makes the ID the Primary Key. Instead of an auto-incrementing integer (1, 2, 3), it generates a `cuid` (Collision Resistant Unique Identifier), which is a random string like `clqz123abc...`. This is much safer for web apps so hackers can't guess user IDs.
*   `email String? @unique`: The `?` means it is optional (nullable in SQL). `@unique` creates a SQL UNIQUE constraint.
*   `chatSessions ChatSession[]`: This tells Prisma that a User can have multiple `ChatSessions` (a One-to-Many relationship).

### 2.3 The Core App Data
```prisma
model ChatSession {
  id             String    @id
  title          String
  phase          String
  mode           String    @default("standard")
  branchedFrom   String?
  questionCount  Int       @default(0)
  totalQuestions Int       @default(5)
  category       String?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  
  userId         String
  user           User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  messages       Message[]
}
```
This defines the sidebar chat threads.
*   `@default(now())`: Equivalent to SQL `DEFAULT CURRENT_TIMESTAMP`.
*   `@updatedAt`: A Prisma magic feature that automatically updates this timestamp every time you modify the row.
*   `user User @relation(...)`: This defines the Foreign Key. It says "The `userId` column in this table points to the `id` column in the `User` table." `onDelete: Cascade` means if the User is deleted, all their ChatSessions are instantly deleted too.

```prisma
model Message {
  id            String      @id
  role          String
  content       String      
  isReport      Boolean     @default(false)
  isError       Boolean     @default(false)
  choicesJson   String?     
  allowCustom   Boolean     @default(false)
  timestamp     Float
  
  chatSessionId String
  chatSession   ChatSession @relation(fields: [chatSessionId], references: [id], onDelete: Cascade)
}
```
Every chat bubble is a `Message` linked to a `ChatSession`.
*   `role`: Usually 'user' or 'assistant'.
*   `choicesJson`: Because PostgreSQL doesn't natively support simple string arrays in all ORMs perfectly without complexity, storing a JSON string (e.g., `["Yes", "No"]`) is a common pattern.

---

## 🟢 CHAPTER 3: Authentication Layer (NextAuth)
*File: `lib/auth.ts`*

In Flask, implementing Google Login (OAuth) requires manually setting up OAuth clients, handling callback URLs, exchanging tokens, and managing secure cookies. NextAuth abstracts this entirely.

```typescript
import { NextAuthOptions, getServerSession } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
```
**The Adapter**: This is the magic bridge. When someone logs in via Google, NextAuth receives their email. Because we linked the `PrismaAdapter`, NextAuth will automatically run a SQL query: `SELECT * FROM User WHERE email = ...`. If they don't exist, it runs `INSERT INTO User...`. You don't have to write any registration logic!

```typescript
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: 'jwt' },
```
**JWT Strategy**: When a user logs in, the server creates a JSON Web Token (JWT) containing their ID, signs it with a secret key, and saves it in a secure, HTTP-only cookie in the user's browser.

```typescript
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) token.userId = user.id;
      return token;
    },
    async session({ session, token }) {
      if (token.userId && session.user) {
        (session.user as any).id = token.userId as string;
      }
      return session;
    },
  },
};
```
**Callbacks**: NextAuth handles the session, but by default, it doesn't include the Database User ID in the session object visible to the frontend. This code grabs the `user.id` during login, stuffs it into the JWT token, and then exposes it in the active session object so your code can use `session.user.id`.

---

## 🟢 CHAPTER 4: The Frontend Entry Point
*File: `src/app/page.tsx`*

This file represents the actual UI. 

### 4.1 The `'use client'` Directive
```tsx
'use client';

import { useChat } from '@/hooks/useChat';
import { useSession, signOut } from 'next-auth/react';
import { useState, useRef, useEffect } from 'react';
```
In Next.js 15, components render on the Server by default (for performance and SEO). But server components cannot have interactivity (like `onClick` buttons) or State.
By putting `'use client';` at the top, we instruct Next.js to send this JavaScript to the browser so the page becomes an interactive React app.

### 4.2 State Management (React Basics)
```tsx
  const [input, setInput] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [deletingId, setDeletingId]  = useState<string | null>(null);
```
`useState` is React's memory. 
In vanilla JS/HTML, you do `document.getElementById('input').value`. 
In React, the UI is a direct reflection of the State. When you call `setInput('Hello')`, React automatically re-renders the component and updates the `<textarea>` to show 'Hello'.

### 4.3 Using Refs
```tsx
  const messagesEndRef  = useRef<HTMLDivElement>(null);
  const textareaRef     = useRef<HTMLTextAreaElement>(null);
```
While `useState` causes a UI re-render, `useRef` is a way to directly hold onto an HTML element (like getting a pointer to the actual `<textarea>` node) WITHOUT causing re-renders when it changes.

```tsx
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [session.messages]);
```
`useEffect` runs side-effects. This specific line says: "Every time the `session.messages` array changes (a new message is added), find the `messagesEndRef` div and scroll the browser down to it." This is what makes the chat auto-scroll!

### 4.4 The UI Architecture
The return statement of a React component is JSX (HTML inside JavaScript).
```tsx
return (
  <div className="flex h-screen w-full bg-[#f5f5f5] font-sans">
     <aside> {/* Sidebar */} </aside>
     <main>  {/* Main Chat Area */} </main>
  </div>
)
```
Instead of writing CSS classes in a separate `.css` file, you are using **Tailwind CSS**. Classes like `flex h-screen w-full` directly apply CSS properties (`display: flex; height: 100vh; width: 100%;`).

### 4.5 Rendering Markdown in React
React prevents Cross-Site Scripting (XSS) by automatically escaping HTML tags. If an AI says `**Bold**`, React will literally display the asterisks. 
In `page.tsx`, the `renderMarkdown` function manually parses the text:
```tsx
const boldMatch = remaining.match(/\*\*(.*?)\*\*/);
if (boldMatch) {
  parts.push(<strong key={...} className="font-semibold">{boldMatch[1]}</strong>);
}
```
This takes the raw string, splits it, and returns an array of actual React HTML components (`<strong>`, `<br>`, etc.).

---

## 🟢 CHAPTER 5: The Brain of the UI
*File: `hooks/useChat.ts`*

This is the most complex file in the frontend. It abstracts all the logic away from the UI. Let's break down exactly what happens when you hit "Send".

### 5.1 Local State & Persistence
```typescript
const [session, setSession]   = useState<Session>(makeSession);
```
This holds the current chat session.

```typescript
  // Debounced DB persist on every session change
  useEffect(() => {
    if (!userId || !dbReady) return;
    if (session.messages.length <= 1) return; // don't save empty sessions

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      persistSession(session).then(() => { ... });
    }, SAVE_DEBOUNCE_MS);
  }, [session, userId, dbReady]);
```
**Debouncing**: Imagine the AI is streaming text to the UI. The `session` state updates 10 times a second as letters arrive. If we saved to the database on every update, we would crash the database with 10 requests per second per user!
Instead, we use a `setTimeout`. Every time `session` changes, we cancel the old timer and start a new 1.2-second timer. The save function (`persistSession`) ONLY runs if the session stops changing for 1.2 seconds. This is a crucial senior developer pattern!

### 5.2 The `sendMessage` Logic
```typescript
  const sendMessage = useCallback(async (userInput: string, overrideSession?: Session) => {
    // 1. Create User Message
    const userMessage: Message = { id: nanoid(), role: 'user', content: userInput.trim(), timestamp: Date.now() };

    // 2. Optimistic UI Update
    setSession((prev) => ({ ...prev, messages: [...prev.messages, userMessage] }));
    setLoading(true);
```
**Optimistic UI**: We update the UI instantly without waiting for the server.

```typescript
    // 3. Prepare payload for the server
    const apiMessages = allMessages
      .filter((m) => !m.isReport && !m.isError && m.content !== WELCOME_MESSAGE && m.content.length > 0)
      .map((m) => ({ role: m.role, content: m.content }));
```
We strip out internal app data (like `isReport`) and send a clean array of `{ role, content }` to the server.

### 5.3 Fetching and Streaming (The Magic)
```typescript
    const response = await fetch('/api/chat', { ... });
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let streamedResponse = '';
```
Normally, `fetch` waits for the entire JSON string and parses it. 
With AI, we use `response.body.getReader()`. This gives us direct access to the raw TCP/HTTP stream arriving from the server.

```typescript
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
```
We enter a `while(true)` loop. `reader.read()` waits for the next tiny packet of data from the network. 
Because the data arrives as binary `Uint8Array` (bytes), we use `TextDecoder` to turn those bytes into JavaScript strings.

```typescript
      for (const line of chunk.split('\n')) {
        if (!line.startsWith('data: ') || line.includes('[DONE]')) continue;
        const data  = JSON.parse(line.slice(6));
        const delta = data.choices?.[0]?.delta?.content;
        
        streamedResponse += delta;
```
The server sends data using **Server-Sent Events (SSE)**. The format looks like this:
`data: {"choices": [{"delta": {"content": "Hello"}}]}`
We split by newline, strip the `"data: "` prefix, parse the JSON, extract the word `"Hello"`, and append it to our `streamedResponse` string.

```typescript
        setSession((prev) => ({
          ...prev,
          messages: prev.messages.map((m) => m.id === aiMessageId ? { ...m, content: displayContent } : m),
        }));
      }
    }
```
Finally, we update the React State. React instantly redraws the UI, making the new word appear on screen.

---

## 🟢 CHAPTER 6: The Backend Engine
*File: `src/app/api/chat/route.ts`*

When `fetch('/api/chat')` is called, it hits this Next.js serverless route.

### 6.1 Security First
```typescript
import { auth } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
```
If a hacker tries to send a POST request to `/api/chat` directly using Postman or cURL, this code checks the cookies. If the NextAuth cookie isn't valid, it instantly rejects the request with a 401 Unauthorized. 

### 6.2 Data Sanitization
```typescript
    const body = await req.json();
    const { messages, questionCount, mode, memoryNote } = body;

    const sanitized = messages
      .filter((m: unknown) => m && typeof m === 'object')
      .map((m: { role?: unknown; content?: unknown }) => ({
        role: (m.role === 'user' || m.role === 'assistant') ? m.role : 'user',
        content: String(m.content ?? '').slice(0, 8000),
      }))
```
**Never trust the client.** 
Even though our React frontend sends perfect data, a malicious user could modify the JavaScript. The backend strictly ensures that `messages` is an array, `role` is ONLY 'user' or 'assistant', and `content` is cast to a string and truncated to 8,000 characters to prevent Memory Overload attacks.

### 6.3 System Prompt Injection
```typescript
    const systemPrompt = sessionMode === 'mcq' ? buildMCQSystemPrompt(qCount) : buildSystemPrompt(qCount);

    const sarvamMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...finalMessages,
    ];
```
The user's messages only contain their chat. The server injects a hidden `system` message at the very top. This is the master instruction manual for the AI.

### 6.4 Connecting to the AI and Proxying the Stream
```typescript
    const response = await callSarvamStream(sarvamMessages);

    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
```
This is brilliant architecture. Instead of waiting for Sarvam to reply, we call Sarvam, take Sarvam's raw HTTP response stream (`response.body`), and return it DIRECTLY as the output of our Next.js API route! 
We add `text/event-stream` headers so the browser knows to expect a continuous flow of data, not a single static JSON file. This acts as a perfect proxy.

---

## 🟢 CHAPTER 7: The AI Layer
*Files: `lib/prompts.ts` & `lib/sarvam.ts`*

### 7.1 The External API Call (`lib/sarvam.ts`)
```typescript
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
```
This runs entirely on the Next.js backend server. It constructs the payload for Sarvam AI.
*   `model: 'sarvam-105b'`: Specifies which LLM to use.
*   `max_tokens: 1500`: Limits the response length so you don't burn through API credits.
*   `temperature: 0.7`: Controls randomness. 0.0 is robotic and predictable. 1.0 is highly creative. 0.7 is a good balance for a conversational assistant.
*   `stream: true`: This is the critical flag telling Sarvam to send the response chunk-by-chunk via SSE (Server-Sent Events) instead of waiting to finish generating everything.

### 7.2 Prompt Engineering Mastery (`lib/prompts.ts`)
The success of an AI app lies in its System Prompt. Look at how specific the instructions are:

```typescript
export function buildSystemPrompt(questionCount: number): string {
  return `You are ClarityAI, a world-class decision advisor...
  
You have asked ${questionCount} clarifying question(s) so far (maximum: 20).
```
Notice we dynamically inject `questionCount`. The AI doesn't have memory of how many times it has asked a question unless we explicitly calculate it and inject it into the prompt.

```text
━━━ STOP QUESTIONING WHEN ━━━
You MUST generate the Final Report when EITHER:
(a) You have covered: core motivation, key constraints... OR
(b) You have reached the 20-question limit (currently at ${questionCount})

Then output ONLY this exact JSON — no preamble, no markdown, no code fences:
{"type":"final_report", "summary": "...", "pros": [...]}
```
This is called **Structured Output Prompting**. LLMs naturally want to talk ("Here is your report!"). We strictly command it to output raw JSON so that our frontend code can parse it (`JSON.parse()`) and render beautiful custom UI components instead of just showing raw text.

---

## 🟢 CHAPTER 8: The Complete Lifecycle in Action

Let's trace the complete lifecycle of one specific action: **The user types "I want to start a company" and hits send.**

1.  **[Browser / UI]** The `onChange` event on the `<textarea>` updates the React state `input` to "I want to start a company".
2.  **[Browser / UI]** User hits the Send button. `page.tsx` calls `handleSend()`.
3.  **[Browser / Hook]** `handleSend` calls `sendMessage("I want to start a company")` from `useChat.ts`.
4.  **[Browser / Hook]** `useChat.ts` instantly creates a new User message object with a unique ID (`nanoid()`).
5.  **[Browser / Hook]** React state `session.messages` is updated. React immediately renders the new message on the screen.
6.  **[Browser / Network]** `useChat.ts` opens an HTTP POST request to `/api/chat`.
7.  **[Server / API]** Next.js Node.js server receives the request at `src/app/api/chat/route.ts`.
8.  **[Server / Auth]** `auth()` checks the user's cookies. It validates the JWT and extracts the `userId`.
9.  **[Server / API]** The server runs `buildSystemPrompt()` and appends the user's chat history.
10. **[Server / Network]** The Next.js server makes a POST request to `api.sarvam.ai/chat/completions`.
11. **[External / AI]** Sarvam's GPU processes the prompt. The first token (word) is generated: `"That's"`.
12. **[Server / API]** Sarvam streams `"That's"` back to Next.js. Next.js instantly proxies it back to the Browser.
13. **[Browser / Hook]** The `reader.read()` loop captures the packet. It extracts `"That's"` and updates the React state.
14. **[Browser / UI]** The UI renders `"That's"`.
15. **[External -> Server -> Browser]** Steps 11-14 repeat thousands of times per second. "That's" -> "That's an" -> "That's an exciting" -> "That's an exciting journey."
16. **[Browser / Hook]** The stream finishes. `useChat.ts` does a final parse. If it detects MCQ options, it extracts them.
17. **[Browser / Hook]** The `useEffect` timer (1.2 seconds) finally triggers because the stream stopped changing the session.
18. **[Browser / Network]** `persistSession` sends the full JSON session object to `/api/sessions`.
19. **[Server / API / Prisma]** The server receives the save request. Prisma executes an `UPSERT` SQL command against Neon/Supabase PostgreSQL to save the session and messages permanently.

---

## 🟢 SUMMARY

By understanding this flow, you have graduated from basic scripting to modern full-stack engineering. You are combining:
1. **Real-time UX** (React state, Optimistic UI).
2. **Streaming Protocols** (SSE, Readers, TextDecoders).
3. **Serverless Architecture** (Next.js API Routes).
4. **Type-Safe Database Modeling** (Prisma ORM).
5. **Prompt Engineering** (System prompts, JSON forcing).

Take your time reading this. Compare it to how you would build it in Flask, and you'll quickly see why this stack is so powerful for modern AI applications.
