# ClarityAI Project Flow & Architecture
*A comprehensive guide for developers transitioning from Python/Flask/DSA to Modern Web Development (Next.js, React, TypeScript).*

---

## 1. High-Level Architecture Overview

Your application, **ClarityAI**, is built on a modern stack:
*   **Frontend**: React (UI Library), Next.js (Framework), Tailwind CSS (Styling).
*   **Backend**: Next.js API Routes (Serverless backend).
*   **Database**: PostgreSQL (via Neon/Supabase), accessed using Prisma ORM.
*   **Authentication**: NextAuth.js (for Google login).
*   **AI Integration**: Sarvam AI API for generating responses.

Unlike Flask where backend and frontend are often separated or joined by Jinja templates, Next.js allows you to write both **Client-Side (UI)** and **Server-Side (API/DB)** code in the same project. 

Let's follow the data from the moment a user clicks something on the screen to the moment the database saves it.

---

## 2. The User Interface (`src/app/page.tsx`)
*This is the entry point for what the user sees.*

**Key Concepts:**
*   `'use client';`: This directive at the top of the file tells Next.js that this component runs in the user's browser, not on the server. It allows us to use interactive features like `useState` (for variables that change on screen) and event listeners (like `onClick`).
*   **State (`useState`)**: Think of state as variables that, when updated, automatically redraw the UI. For example, `const [input, setInput] = useState('')` tracks what the user is typing in the chat box.
*   **The Hook (`useChat`)**: Instead of writing 400 lines of complex logic to handle sending messages, fetching API data, and saving to the database directly in the UI, we extract it into a "Custom Hook" called `useChat`. 

**The Flow in `page.tsx`:**
1.  **User Types**: The user types in the `<textarea>`. This triggers the `onChange` event, updating the `input` state.
2.  **User Clicks Send**: The user clicks the send button (or hits Enter). This triggers the `handleSend` function.
3.  **Calling the Hook**: `handleSend` takes the `input` string and passes it to the `sendMessage` function, which comes from the `useChat` hook. The UI now waits for the Hook to do the heavy lifting.

---

## 3. The Brain / Logic (`hooks/useChat.ts`)
*This file is the middleman. It manages the chat history, talks to your backend API, and syncs with the database.*

**Key Concepts:**
*   **`useCallback` & `useEffect`**: React hooks that manage when functions are created and when side-effects (like fetching data on page load) happen.
*   **Local State (`session`, `history`)**: The hook maintains the current active `session` (the chat you are looking at) and the `history` (the list of past chats in the sidebar).

**The `sendMessage` Flow inside `useChat.ts`:**
1.  **Update UI Immediately**: As soon as `sendMessage(userInput)` is called, it immediately adds the user's message to the local `session` state. This makes the UI feel instant, even before the server responds.
2.  **Prepare the Payload**: It formats the chat history into an array of `messages` that the AI understands (e.g., `[{ role: 'user', content: 'hello' }]`).
3.  **The Fetch Call**: It makes an HTTP `POST` request to your own backend API at `/api/chat`.
    ```typescript
    const response = await fetch('/api/chat', { ...body });
    ```
4.  **Handling the Stream**: Modern AI apps stream responses (like ChatGPT). Instead of waiting 10 seconds for the whole answer, `useChat` uses a `reader` to read the server's response chunk-by-chunk (letter-by-letter).
    *   It creates a blank AI message in the UI state.
    *   As chunks arrive from the server, it continuously appends the text to that AI message, making it look like the AI is typing live.
5.  **Database Persistence**: Notice the `useEffect` block monitoring `session`. Every time the session changes (a message is sent or received), it triggers a debounced (delayed) call to `persistSession(session)`. This silently sends the whole chat to the database via another API route (`/api/sessions`) so the user doesn't lose their data if they refresh.

---

## 4. The Server API (`src/app/api/chat/route.ts`)
*This code runs on the server. It is completely hidden from the user's browser. This is the equivalent of your Flask routes (`@app.route('/chat')`).*

**Key Concepts:**
*   **Secure Environment**: Because this runs on the server, it can safely use secret API keys (like your Sarvam API key) and connect directly to databases without exposing credentials to the user.

**The Flow in `route.ts`:**
1.  **Authentication Check**: 
    ```typescript
    const session = await auth();
    if (!session?.user?.id) return error;
    ```
    Before doing anything, it checks if the person making the request is actually logged in. It uses `next-auth` to check the secure cookies.
2.  **Read Request**: It parses the incoming JSON body (`req.json()`) sent by `useChat.ts` to get the `messages`, `mode`, etc.
3.  **Sanitization & System Prompts**: It cleans up the messages and injects a "System Prompt" (using `buildSystemPrompt`). The system prompt is the hidden instruction telling the AI *how* to behave (e.g., "You are ClarityAI, ask exactly 4 choices...").
4.  **Call External AI API (`callSarvamStream`)**: It forwards the sanitized messages and system prompt to the Sarvam AI server.
5.  **Stream Back to Client**: It takes the raw streaming response from Sarvam and pipes it directly back to the Next.js client (`useChat.ts`).

---

## 5. Database & Authentication (`lib/auth.ts` & `prisma/schema.prisma`)
*Where and how data is stored permanently.*

**Key Concepts:**
*   **Prisma**: An ORM (Object-Relational Mapper). Instead of writing raw SQL strings like `SELECT * FROM users`, Prisma lets you use JavaScript/TypeScript functions like `prisma.user.findMany()`.
*   **NextAuth**: Handles the entire OAuth flow (redirecting to Google, getting the profile info, and creating secure browser session cookies).

**How Authentication Works (`lib/auth.ts`):**
1.  The user clicks "Login with Google".
2.  NextAuth redirects them to Google. After they log in, Google sends them back to your app with a special token.
3.  NextAuth takes that token, talks to Google to verify it, and gets the user's email/name.
4.  **The Adapter (`PrismaAdapter`)**: Because you configured NextAuth with Prisma, NextAuth automatically looks into your database. If the email doesn't exist, it creates a new `User` in the `User` table. If they do exist, it logs them in.
5.  **Callbacks**: The code in `callbacks` ensures that the user's database `id` is attached to their secure browser cookie, so every API route knows exactly *who* is making requests.

**How the Database is Structured (`schema.prisma`):**
1.  **`User`**: Created by NextAuth. Contains email, name, image.
2.  **`ChatSession`**: Represents one sidebar chat thread. It links to a `User` (so users only see their own chats). It stores metadata like `title`, `phase`, and `mode`.
3.  **`Message`**: Represents individual text bubbles inside a `ChatSession`. It stores who said it (`role`), the `content`, and special data like `choicesJson` if the message contains multiple-choice options.

---

## Summary of a Complete Cycle

1. **[UI]** User types "I want to buy a car" and clicks Send in `page.tsx`.
2. **[Hook]** `useChat.ts` intercepts this, updates the UI instantly, and makes an HTTP `POST` to `/api/chat`.
3. **[API Server]** `/api/chat/route.ts` verifies the user is logged in via Google (`auth()`), builds the secret system instructions, and forwards the data to Sarvam AI.
4. **[External AI]** Sarvam starts streaming the answer ("What kind of car? SUV, Sedan?").
5. **[Hook]** `useChat.ts` receives the stream, updating the UI letter-by-letter. 
6. **[Hook]** A few seconds after the stream finishes, `useChat.ts` triggers an automatic save in the background.
7. **[DB Server]** The backend receives the save request and uses Prisma to INSERT/UPDATE the `ChatSession` and `Message` tables in your PostgreSQL database.

This architecture ensures that the UI is fast and responsive (Client-side React), sensitive operations and keys are kept secret (Server-side APIs), and data is structured and saved reliably (Prisma + SQL).
