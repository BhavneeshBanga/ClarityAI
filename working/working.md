# ClarityAI - Project Architecture & Flow

This document explains how ClarityAI is structured, the sequence of operations, and how all the components and API routes interact. It's meant to serve as a quick guide for any future developers working on this project.

## High-Level Overview

ClarityAI is an AI-powered personal decision advisor built with Next.js 15, React 19, Prisma, and NextAuth. The user interface allows individuals to think through big decisions step-by-step using a conversational interface that connects to the Sarvam AI API.

The project is structured entirely inside the `src/` directory using the Next.js App Router paradigm.

---

## 1. Authentication Flow (`NextAuth`)

### Key Files:
- **`lib/auth.ts`**: Contains the core NextAuth v4 configuration (`authOptions`), specifying Google as the OAuth provider, Prisma as the database adapter, and JWT as the session strategy.
- **`src/app/api/auth/[...nextauth]/route.ts`**: The Next.js API route that catches all `/api/auth/*` requests and passes them to NextAuth.
- **`middleware.ts`**: Edge-compatible middleware that protects private routes. It uses `getToken` from `next-auth/jwt` to verify if the user is authenticated; if not, it redirects them to the `/login` page.
- **`components/Providers.tsx`**: A client-side wrapper that supplies the `<SessionProvider>` React Context to the application.

### Sequence:
1. User visits `localhost:3000`. `middleware.ts` intercepts the request.
2. If no valid token is found, user is redirected to `/login`.
3. User clicks "Sign in with Google". Request goes to `/api/auth/signin/google`.
4. Google returns profile data, which NextAuth automatically saves to the Neon Postgres Database using Prisma (creating `User` and `Account` records).
5. User is redirected back to the root (`/`) interface.

---

## 2. Database Schema & Persistence

### Key Files:
- **`prisma/schema.prisma`**: Defines the Neon PostgreSQL schema. Contains NextAuth boilerplate (`User`, `Account`, `Session`, `VerificationToken`) and ClarityAI domain models (`ChatSession`, `Message`).
- **`lib/prisma.ts`**: Instantiates a singleton `PrismaClient` to ensure we don't exhaust database connections during hot reloads in development.
- **`prisma.config.ts`**: Loads environment variables so Prisma knows where the remote Neon database lives (`DATABASE_URL`).

### Key Models:
- **`ChatSession`**: Represents a single decision-making conversation. Fields include `phase`, `mode` (e.g., standard vs MCQ), and `branchedFrom` (if it was spawned from another session).
- **`Message`**: Represents a single dialogue turn (either `user` or `assistant`), linked to a specific `ChatSession`.

---

## 3. The Chat & Session API

### Key Files:
- **`src/app/api/sessions/route.ts`**: Handles fetching a user's past sessions (`GET`) and creating/updating a session and its messages (`POST`).
- **`src/app/api/sessions/[id]/route.ts`**: Handles fetching a specific historical session (`GET`) or deleting it (`DELETE`).
- **`src/app/api/chat/route.ts`**: The central AI handler. It takes a payload of messages from the client, constructs a prompt system for Sarvam AI, and securely streams the AI's response back to the client.

### Sequence:
1. The frontend (`useChat.ts`) initiates a new message.
2. The UI sends a `POST /api/chat` request to the backend with the conversation history.
3. `/api/chat` validates the user session using `getServerSession(authOptions)`, formats the payload, and makes an upstream request to `api.sarvam.ai`.
4. After the AI finishes streaming its response, `useChat.ts` silently makes a background `POST /api/sessions` request to save the user's prompt and the AI's response to the database.

---

## 4. The Frontend & State Management

### Key Files:
- **`src/app/page.tsx`**: The main interface. It queries the user's session data on load, renders the Sidebar (historical sessions), and the Main Chat area.
- **`hooks/useChat.ts`**: The most critical logic hook. It handles all the complex state logic: maintaining local message arrays, interacting with `/api/chat` to get streams, handling MCQ modes, and periodically syncing state back to the Neon database via `persistSession()`.
- **`components/`**: Reusable UI parts like `EditableUserMessage`, `Sidebar`, etc.

### How `useChat` Syncs with the DB:
Instead of using `localStorage`, `useChat.ts` now uses `persistSession` helper functions. Whenever a message finishes streaming, it triggers a `POST` request to `/api/sessions` with the entire `session` object. The backend (`sessions/route.ts`) will either `create` a new `ChatSession` if it doesn't exist, or `update` it by aggressively upserting the messages attached to it.

---

## Summary of a Full Interaction Cycle

1. **User types a message** in `page.tsx`.
2. **`useChat.ts` adds** the user message to the local state, triggering a re-render.
3. **`useChat.ts` calls `POST /api/chat`** with the message history.
4. **Backend validates auth**, formats the prompt, and fetches the response from Sarvam AI.
5. **Backend streams** the response to the frontend.
6. **Frontend displays** the streaming text live.
7. **Stream completes**, `useChat.ts` groups the new messages and fires `POST /api/sessions`.
8. **Backend saves** the latest messages into Neon PostgreSQL, ensuring persistence across devices.
