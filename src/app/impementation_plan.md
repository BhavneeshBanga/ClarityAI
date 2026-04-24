# ClarityAI — Deep Problem Analysis & Fix Plan

## Executive Summary

After reading every file in the project, I've identified **17 distinct problems** ranging from app-breaking bugs to subtle UX friction that users would *feel* but never report. Many of these compound — e.g., the phase naming mismatch makes the progress bar, phase label, AND question counter all silently fail at once.

---

## 🔴 Critical Bugs (App-Breaking)

### 1. Phase Naming Mismatch — Everything Silently Fails
The **single biggest bug**. Three different naming schemes are used for phases:

| Location | Phase Names Used |
|---|---|
| `types.ts` | `welcome`, `questioning`, `analyzing`, `final` |
| `page.tsx` PHASE_LABELS | `intro`, `questions`, `analysis`, `final` |
| `useChat.ts` | `welcome`, `questioning`, `final` |

**Result**: The progress bar shows a fallback `10%` for the ENTIRE session (because `'welcome'` and `'questioning'` don't match `'intro'` or `'questions'`). The phase label shows `Phase: welcome` as raw text. The question counter tag checks `session.phase === 'questioning'` but PHASE_LABELS maps to `questions` — they never agree.

### 2. Dark Mode CSS Destroys the Layout
`globals.css` has:
```css
@media (prefers-color-scheme: dark) {
  :root { --background: #0a0a0a; --foreground: #ededed; }
}
```
But the ENTIRE UI uses hardcoded light colors (`bg-white`, `text-[#111]`, `bg-[#f5f5f5]`). On any dark-mode system:
- The `<body>` background flashes dark before the page content loads (FOUC)
- Any element without an explicit color inherits `color: #ededed` (light text on light bg = invisible)
- The sidebar and main panel are light-colored containers floating on a dark body

### 3. Streaming Report Shows a Blank Bubble
When the final report JSONstreams in (starts with `{`), the code sets `displayContent = ''`. The user sees an **empty chat bubble for 2-5 seconds** with no feedback, then the full report pops in. Extremely confusing UX — users think it crashed.

---

## 🟡 Major UX Problems (User Feels But Can't Articulate)

### 4. Sessions Lost on Refresh — Zero Persistence
No localStorage, no database writes. A user spends 10 minutes going through 8 clarifying questions, accidentally refreshes → **everything is gone**. The sidebar shows fake hardcoded sessions ('Career switch to product...') that aren't real — they're static JSX strings that do nothing when clicked.

### 5. MCQ Buttons Stay Clickable After Selection
After clicking a choice, the buttons from the previous message remain visible and fully clickable. Users can double-click or change their answer, causing duplicate messages and confused AI state. There's no visual "locked" state.

### 6. No Mobile Sidebar or Navigation
The sidebar is `hidden md:flex` — **completely invisible on mobile**. No hamburger menu, no way to start new sessions, see phase info, or access any controls on mobile. The app is desktop-only.

### 7. No Error Retry
When the API fails, users get "Sorry, something went wrong. Please try again." But there's no retry button and no way to resend — they must retype their entire answer from scratch.

### 8. No Auto-Focus on Input
When the page loads, the textarea isn't focused. Users must manually click on it every time, adding unnecessary friction to the critical first interaction.

### 9. No Markdown Rendering
Only `**bold**` is converted (via regex + `dangerouslySetInnerHTML`). Lists, links, bullet points, numbered steps — all show as raw text. The AI's responses look unprofessional and hard to read.

---

## 🟠 Architectural & Security Issues

### 10. XSS via dangerouslySetInnerHTML
```tsx
dangerouslySetInnerHTML={{ __html: msg.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
```
If the LLM response contains `<script>` or `<img onerror=...>`, it gets injected directly. While LLM injection is lower risk than user input, it's still a real vulnerability.

### 11. Race Condition in useChat
`sendMessage` captures `session.messages` via closure snapshot. The `useCallback` depends on `[session, loading]`, but rapid sends can still interleave because `setSession` batching doesn't guarantee the closure is fresh. This can cause message loss.

### 12. Prisma/NextAuth Schema — Dead Code
A full Prisma schema with Account, Session, User, VerificationToken, ChatSession, and Message models exists. NextAuth is in `package.json`. But **zero integration** — no routes use the DB, no auth is wired. This is 88 lines of dead schema adding confusion.

### 13. Font Loading is Broken
- `globals.css` sets `font-family: Arial, Helvetica, sans-serif` (generic fallback)
- `layout.tsx` loads Geist fonts via CSS variables (`--font-geist-sans`) but these variables are never referenced in any Tailwind class or CSS rule
- `FinalReport.tsx` loads `Outfit` font but only for the report card
- The prompt spec says to use `Inter` — which isn't loaded at all

### 14. Tailwind Content Paths Miss Components
```ts
content: [
  "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
  "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
],
```
But components live at `./components/` and hooks at `./hooks/` — **outside `src/`**. Tailwind won't scan them, so any Tailwind classes in `MCQInput.tsx`, `FinalReport.tsx`, or `useChat.ts` may be purged in production builds.

### 15. No Input Validation on API Route
The API route blindly trusts `messages`, `questionCount`, `mode` from the request body with zero validation.

### 16. Package Name is "temp"
`package.json` has `"name": "temp"`.

### 17. Progress Bar Is Cosmetic Only
Even if the phase names matched, the progress values are static per-phase (`10%`, `45%`, `75%`, `100%`). With up to 20 questions, the bar should smoothly increase from ~10% to ~85% during questioning, reflecting actual `questionCount / totalQuestions`.

---

## Proposed Changes

### Philosophy
Fix every problem above in a single coordinated pass. No half-measures. Keep the existing Sarvam AI integration and streaming architecture — they work fine. Focus on the broken state management, missing persistence, phase system, UX, and security.

---

### Types & Constants
#### [MODIFY] [types.ts](file:///c:/Users/bhavi/Downloads/Coding%20Payground/ClarityAI/lib/types.ts)
- Unify Phase type to: `'welcome' | 'questioning' | 'analyzing' | 'final'`
- Add `lockedChoiceIndex?: number` to Message for tracking selected MCQ choice
- Add `error?: boolean` field to Message for retry support

---

### Core State Management
#### [MODIFY] [useChat.ts](file:///c:/Users/bhavi/Downloads/Coding%20Payground/ClarityAI/hooks/useChat.ts)
- Fix race condition: use functional `setSession` updates everywhere, never read `session` from closure
- Add localStorage persistence: save session on every state change, restore on mount
- Add session history management (list of past sessions, ability to switch)
- Lock MCQ choices after selection (set `lockedChoiceIndex` on the message)
- Add retry mechanism: store failed message, expose `retryLastMessage` function
- Fix question counter logic
- Add proper "analyzing" phase transition before report generation
- Show a "generating report" placeholder during report streaming instead of blank

---

### UI/Page Layer
#### [MODIFY] [page.tsx](file:///c:/Users/bhavi/Downloads/Coding%20Payground/ClarityAI/src/app/page.tsx)
- Fix PHASE_LABELS and PHASE_PROGRESS to match actual phase names (`welcome`, `questioning`, `analyzing`, `final`)
- Make progress bar dynamic: `questionCount / totalQuestions` during questioning phase
- Add mobile hamburger menu for sidebar
- Auto-focus textarea on mount and after each message send
- Replace `dangerouslySetInnerHTML` with safe markdown renderer (custom function, no external deps)
- Add retry button on error messages
- Lock MCQ buttons after selection with visual "selected" state
- Show real session history from localStorage (clickable, loadable)
- Add "analyzing" state with animated indicator before report

---

### Styling
#### [MODIFY] [globals.css](file:///c:/Users/bhavi/Downloads/Coding%20Payground/ClarityAI/src/app/globals.css)
- Remove dark mode `prefers-color-scheme` block (the app is light-mode only)
- Load Inter font from Google Fonts
- Apply Inter as the base font family
- Add custom scrollbar styles
- Add smooth transitions and micro-animations

#### [MODIFY] [layout.tsx](file:///c:/Users/bhavi/Downloads/Coding%20Payground/ClarityAI/src/app/layout.tsx)
- Load Inter font properly via `next/font/google`
- Remove unused Geist font loading
- Apply font class to body

---

### Configuration
#### [MODIFY] [tailwind.config.ts](file:///c:/Users/bhavi/Downloads/Coding%20Payground/ClarityAI/tailwind.config.ts)
- Add `"./components/**/*.{js,ts,jsx,tsx}"` and `"./hooks/**/*.{js,ts,jsx,tsx}"` to content paths so Tailwind scans them

#### [MODIFY] [package.json](file:///c:/Users/bhavi/Downloads/Coding%20Payground/ClarityAI/package.json)
- Change name from "temp" to "clarityai"

---

### Components
#### [MODIFY] [MCQInput.tsx](file:///c:/Users/bhavi/Downloads/Coding%20Payground/ClarityAI/components/MCQInput.tsx)
- Add `locked` prop and `selectedIndex` prop
- When locked, show selected choice highlighted, others greyed out, all non-clickable
- Smooth transition animation on selection

#### [MODIFY] [FinalReport.tsx](file:///c:/Users/bhavi/Downloads/Coding%20Payground/ClarityAI/components/FinalReport.tsx)
- Keep existing beautiful design (it's actually well done)
- Minor: use Inter font instead of Outfit, or keep Outfit as a design choice

---

### API
#### [MODIFY] [route.ts](file:///c:/Users/bhavi/Downloads/Coding%20Payground/ClarityAI/src/app/api/chat/route.ts)
- Add basic input validation (messages is array, questionCount is number)

---

### Not Changing (Intentionally)
- **Prisma schema** — leaving it in place since it was clearly set up for future auth/persistence. Not deleting it.
- **Sarvam API integration** — works correctly, no changes needed
- **System prompts** — well-crafted, no changes needed
- **FinalReport design** — the report card is genuinely beautiful

---

## Verification Plan

### Automated
- `npm run build` — must succeed with zero errors
- Verify Tailwind scans all component directories

### Manual / Browser
- Open the app, verify:
  - Phase label shows correctly through all phases
  - Progress bar animates smoothly as questions are asked
  - MCQ buttons lock after clicking
  - Session persists after page refresh
  - Mobile view shows hamburger menu
  - Error messages show retry button
  - AI text renders markdown properly (bold, lists, etc.)
  - No dark mode flash/breakage
