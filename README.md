# ClarityAI — AI-Powered Decision Advisor

> Think through your biggest decisions with the clarity of a McKinsey consultant, the empathy of a therapist, and the directness of a seasoned entrepreneur — in minutes, not months.
 
---

## What ClarityAI Does For You

ClarityAI is not a chatbot. It is a structured decision-making engine. You describe a decision you're facing — career, startup, finance, relationship, relocation — and it asks you the exact questions that expose your blind spots, reveals what you actually want, and generates a final decision report with a concrete recommendation.

**The difference from just asking ChatGPT:** ClarityAI asks you targeted clarifying questions first, builds a complete picture of your specific situation, then gives you a verdict — not a generic list of pros and cons.

---

## Who This Is For

| You are | Example use case |
|---|---|
| A professional facing a career change | "Should I leave my ₹40L job at a startup for  a ₹70L offer at a MNC?" |
| A founder making a startup decision | "Should I take VC funding or stay bootstrapped?" |
| Someone evaluating a major investment | "Should I put ₹50L into real estate or equity?" |
| A person navigating a relationship decision | "Should I move cities for my partner?" |
| Anyone at a life crossroads | "Should I quit my MBA and start a company?" |

---

## How It Works

```text
You describe the decision
        ↓
ClarityAI identifies the category
(career / startup / finance / relationship / relocation / education)
        ↓
Asks 5–15 targeted clarifying questions
(one at a time, no overwhelm)
        ↓
Generates a full Decision Report:
- Situation Overview
- Key Advantages (specific to YOUR situation)
- Major Drawbacks (specific to YOUR constraints)
- Critical Risks to Mitigate
- Readiness Score (1–10 with explanation)
- Executive Verdict (what you should actually do)
- Recommended Action Plan (step-by-step)
```

---

## Features

### Two Session Modes

**Standard Mode**
- Free-form conversation
- You type your answers in natural language
- Best for complex, nuanced decisions where context matters
- Supports Hindi and English (auto-detected)

**MCQ Mode (Multiple Choice)**
- Every question has 4 pre-built answer options + "Other – type your own"
- Faster — tap an answer instead of typing
- Great for decisions with clear-cut parameters
- Options are AI-generated and tailored to each specific question

### The Decision Report

Every session ends with a structured report card:

| Section | What it contains |
|---|---|
| **Situation Overview** | 3-sentence summary of your decision and the core tension |
| **Key Advantages** | Pros specific to what YOU shared, not generic |
| **Major Drawbacks** | Cons tied to YOUR specific constraints |
| **Critical Risks** | What could go wrong given YOUR situation |
| **Readiness Score** | 1–10 with a rubric (1–3 = don't do it, 8–10 = strong yes) |
| **Score Explanation** | Why you got that specific score |
| **Executive Verdict** | Direct recommendation — what to do and why |
| **Action Plan** | 3 concrete next steps with timeframes |

### Cloud Session Persistence & Authentication
- Secure authentication via NextAuth.js
- Sessions are saved in real-time to a Turso cloud database
- Access your past decisions from any device, anywhere
- Seamlessly switch between past decisions at any time

### Usage Limits & Cost Control
- Smart rate-limiting to prevent API abuse (quota system: 2 completed chats per 48 hours)
- Admin bypass capabilities for continuous access
- Elegant modal notifications when limits are reached

### Mobile-First Design
- Full mobile support with slide-in sidebar
- Hamburger menu for navigation
- Touch-optimized MCQ buttons with tap-to-lock
- Responsive from 320px to 4K

### Intelligent Conversation Engine
- **Memory injection**: After 10+ exchanges, the AI is reminded of everything you said earlier — no forgotten context in long sessions
- **Anti-redundancy**: The AI tracks what it has already asked and never repeats a question
- **Category detection**: Different question strategies for career vs startup vs finance vs relationship decisions
- **Adaptive depth**: Stops asking when it has enough information — doesn't force all 20 questions if 7 is enough
- **Timeout handling**: 60-second request timeout with clear error message and one-click retry

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v3 |
| Font | Inter (Google Fonts via next/font) |
| AI Model | Sarvam AI (streaming) |
| State | React hooks + useRef (race-condition safe) |
| Persistence | Turso Database (libSQL) |
| ORM | Prisma |
| Authentication | NextAuth.js |

---

## Project Structure

```text
clarityai/
├── src/
│   └── app/
│       ├── page.tsx           # Main UI — Landing and Chat Interface
│       ├── layout.tsx         # Root layout, Inter font loading, Auth Provider
│       ├── globals.css        # Base styles, animations, scrollbar
│       └── api/
│           ├── chat/          # API endpoint — prompt building, Sarvam call
│           ├── sessions/      # API endpoint for fetching/saving sessions
│           └── auth/          # NextAuth routes
├── components/
│   ├── FinalReport.tsx        # Decision report card (beautiful render)
│   ├── MCQInput.tsx           # Multiple choice button group
│   └── UsageLimitModal.tsx    # Rate limiting notification UI
├── hooks/
│   └── useChat.ts             # All state: messages, streaming, DB sync
├── lib/
│   ├── types.ts               # TypeScript types: Message, Session, Phase, etc.
│   ├── prompts.ts             # System prompts, memory injection, welcome message
│   └── sarvam.ts              # Sarvam AI streaming client
├── prisma/
│   └── schema.prisma          # DB schema (Users, Accounts, Sessions, ChatHistory)
├── tailwind.config.ts
├── package.json
└── README.md
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- A Sarvam AI API key (get one at sarvam.ai)
- Turso Database URL and Auth Token
- Auth credentials (e.g., GitHub OAuth for NextAuth)

### Installation

```bash
git clone https://github.com/yourusername/clarityai
cd clarityai
npm install
```

### Environment Variables

Create a `.env.local` file:

```env
SARVAM_API_KEY=your_sarvam_api_key_here
TURSO_DATABASE_URL=your_turso_db_url
TURSO_AUTH_TOKEN=your_turso_auth_token
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret
GITHUB_ID=your_github_client_id
GITHUB_SECRET=your_github_client_secret
ADMIN_EMAILS=your_admin_email@example.com
```

### Database Setup

```bash
npx prisma generate
npx prisma db push
```

### Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Build for Production

```bash
npm run build
npm start
```

---

## Recent Major Updates
- **User Authentication:** Fully integrated NextAuth.js for secure user sign-in.
- **Cloud Database Persistence:** Migrated from local storage to Turso DB with Prisma ORM. Sessions are now securely stored and synced across devices.
- **Usage Limits:** Implemented a robust 48-hour rate-limiting system (2 completed chats per user) to control API costs, featuring a beautiful notification modal.
- **Admin Bypass:** Added an admin bypass for rate limits based on user email.
- **Secure API Routes:** All API routes are strictly protected and tied to the authenticated user's session.

---

## Roadmap

### Near-term
- [ ] Export report as PDF
- [ ] Share report via link (public URL)
- [ ] Email report to yourself

### Mid-term
- [ ] Decision comparison (run two scenarios, compare reports side-by-side)
- [ ] Follow-up sessions ("It's been 30 days — how did the decision go?")
- [ ] Team mode (multiple users contribute context to one decision)
- [ ] Webhook integrations (send report to Notion, Slack, email)

### Long-term
- [ ] Decision journal (track outcomes of past decisions over time)
- [ ] Analytics dashboard (what types of decisions do users struggle with most)
- [ ] Multi-language support beyond Hindi/English

---

## Contributing

We welcome community contributions! This project is evolving rapidly. Here are the main areas where contributors can jump in and make an immediate impact:

### What We Need Help With:
1. **PDF Export Functionality:** Add the ability for users to export their final `FinalReport.tsx` as a cleanly formatted PDF document. (Suggested tools: `jspdf` or `react-to-pdf`).
2. **Shareable Public Links:** Create a dynamic route (e.g., `/report/[id]`) that allows users to generate a read-only public URL for their decision report to share with friends or mentors.
3. **Email Integration:** Implement an endpoint using Resend or SendGrid to let users email their decision reports to themselves or others.
4. **E2E Testing:** We need Playwright tests to cover the core chat flow, MCQ button selections, and the rendering of the final report.
5. **UI/UX Polish:** Improve mobile responsiveness, add micro-animations to the chat interface, and refine the dark/light mode experience.
6. **Localization:** Add support for more languages (Spanish, French, etc.) beyond the current English/Hindi implementation.

### How to Contribute:
- Fork the repository and create a feature branch (`git checkout -b feature/your-feature-name`).
- Ensure your code follows the existing TypeScript and ESLint standards.
- Test your changes locally to ensure no breaking changes.
- Submit a Pull Request with a clear description of what you've added or fixed.

---

## License

MIT