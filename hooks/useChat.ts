'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Message, Session, SessionSummary, Phase } from '@/lib/types';
import { WELCOME_MESSAGE, buildMemorySummaryPrompt } from '@/lib/prompts';
import { nanoid } from 'nanoid';

// ─── Constants ───────────────────────────────────────────────────────────────

const STORAGE_KEY   = 'clarityai_current_session';
const HISTORY_KEY   = 'clarityai_session_history';
const MAX_HISTORY   = 20;
const FETCH_TIMEOUT = 60_000; // 60 s — Sarvam can be slow on first token

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isFinalReport(text: string): boolean {
  return /\"type\"\s*:\s*\"final_report\"/.test(text);
}

/**
 * Parse CHOICES: ["a", "b", "c"] appended by the LLM.
 * FIX: Use JSON.parse on the array portion instead of a fragile regex so that
 * choices containing apostrophes (e.g. "I don't know") are handled correctly.
 */
function parseChoices(content: string): {
  text: string;
  choices: string[];
  allowCustom: boolean;
} {
  const match = content.match(/\nCHOICES:\s*(\[[\s\S]*?\])\s*$/m);
  if (!match) return { text: content.trim(), choices: [], allowCustom: false };

  let choices: string[] = [];
  try {
    choices = JSON.parse(match[1]);
  } catch {
    // Fallback: extract quoted strings manually
    const regex = /"([^"\\]*(\\.[^"\\]*)*)"/g;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(match[1])) !== null) {
      choices.push(m[1].replace(/\\"/g, '"'));
    }
  }

  const text = content.replace(/\nCHOICES:\s*\[[\s\S]*?\]\s*$/m, '').trim();
  const lastChoice = choices[choices.length - 1]?.toLowerCase() ?? '';
  const allowCustom =
    lastChoice.includes('other') ||
    lastChoice.includes('describe') ||
    lastChoice.includes('type your own');

  return { text, choices, allowCustom };
}

/**
 * Count only genuine AI questions (not welcome, not report, not error).
 */
function countQuestions(messages: Message[]): number {
  return messages.filter(
    (m) =>
      m.role === 'assistant' &&
      !m.isReport &&
      !m.isError &&
      m.content !== WELCOME_MESSAGE &&
      m.content.length > 0 &&
      (m.choices !== undefined || m.content.trimEnd().endsWith('?'))
  ).length;
}

/**
 * Collect all user messages for memory injection after message 10.
 * Summarises what the user has shared so far to prevent the model from
 * losing early context in long sessions.
 */
function collectUserMessages(messages: Message[]): string[] {
  return messages
    .filter((m) => m.role === 'user')
    .map((m) => m.content.trim());
}

// ─── localStorage ────────────────────────────────────────────────────────────

function saveSession(s: Session): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* full */ }
}

function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch { return null; }
}

function saveFullSession(s: Session): void {
  try { localStorage.setItem(`clarityai_session_${s.id}`, JSON.stringify(s)); } catch { /* full */ }
}

function loadFullSession(id: string): Session | null {
  try {
    const raw = localStorage.getItem(`clarityai_session_${id}`);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch { return null; }
}

function saveToHistory(s: Session): void {
  if (s.messages.length <= 1) return;
  try {
    const history = loadHistory();
    const summary: SessionSummary = {
      id: s.id,
      title: s.title,
      phase: s.phase,
      mode: s.mode,
      createdAt: s.createdAt,
      messageCount: s.messages.length,
    };
    const idx = history.findIndex((h) => h.id === s.id);
    if (idx >= 0) history[idx] = summary; else history.unshift(summary);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
  } catch { /* full */ }
}

function loadHistory(): SessionSummary[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as SessionSummary[]) : [];
  } catch { return []; }
}

// ─── Factory ─────────────────────────────────────────────────────────────────

function makeSession(mode: 'standard' | 'mcq' = 'standard'): Session {
  return {
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
    totalQuestions: 20,
    category: '',
    mode,
    createdAt: Date.now(),
  };
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useChat() {
  const [session, setSession] = useState<Session>(() => {
    if (typeof window !== 'undefined') {
      const saved = loadSession();
      if (saved) return saved;
    }
    return makeSession();
  });
  const [loading, setLoading]   = useState(false);
  const [history, setHistory]   = useState<SessionSummary[]>([]);

  const sessionRef = useRef(session);
  sessionRef.current = session;

  // Load history on mount
  useEffect(() => { setHistory(loadHistory()); }, []);

  // Persist on every change
  useEffect(() => {
    saveSession(session);
    saveFullSession(session);
    saveToHistory(session);
  }, [session]);

  // ── sendMessage ────────────────────────────────────────────────────────────

  const sendMessage = useCallback(async (userInput: string) => {
    if (!userInput.trim() || loading) return;

    const userMessage: Message = {
      id: nanoid(),
      role: 'user',
      content: userInput.trim(),
      timestamp: Date.now(),
    };

    setSession((prev) => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      title:
        prev.title === 'New Session'
          ? userInput.slice(0, 48).trimEnd() + (userInput.length > 48 ? '…' : '')
          : prev.title,
      phase: prev.phase === 'welcome' ? 'questioning' : prev.phase,
    }));

    setLoading(true);

    try {
      const currentSession = sessionRef.current;
      const allMessages    = [...currentSession.messages, userMessage];

      // Build API messages — strip meta messages
      const apiMessages = allMessages
        .filter((m) => !m.isReport && !m.isError && m.content !== WELCOME_MESSAGE && m.content.length > 0)
        .map((m) => ({ role: m.role, content: m.content }));

      // ── Memory injection for long sessions ──────────────────────────────
      // After 10 user messages, prepend a memory summary so the model
      // doesn't forget early context. This dramatically improves report quality.
      const userMsgs = collectUserMessages(allMessages);
      let memoryNote: string | undefined;
      if (userMsgs.length >= 10) {
        memoryNote = buildMemorySummaryPrompt(userMsgs);
      }

      // ── Fetch with timeout ───────────────────────────────────────────────
      const controller  = new AbortController();
      const timeoutId   = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

      let response: Response;
      try {
        response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: apiMessages,
            questionCount: currentSession.questionCount,
            mode: currentSession.mode,
            memoryNote,  // injected into system prompt by route.ts
          }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        let errStr = `Server error (${response.status})`;
        try { const d = await response.json(); errStr = d.error || errStr; } catch { /* ignore */ }
        throw new Error(errStr);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No stream available');

      const decoder        = new TextDecoder();
      let streamedResponse = '';
      const aiMessageId    = nanoid();

      // Add empty bubble immediately
      setSession((prev) => ({
        ...prev,
        messages: [...prev.messages, {
          id: aiMessageId,
          role: 'assistant',
          content: '',
          timestamp: Date.now(),
        }],
      }));

      // ── Stream loop ──────────────────────────────────────────────────────
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ') || line.includes('[DONE]')) continue;
          try {
            const data  = JSON.parse(line.slice(6));
            const delta = data.choices?.[0]?.delta?.content;
            if (!delta) continue;

            streamedResponse += delta;

            const isLikelyReport    = streamedResponse.trimStart().startsWith('{');
            // Strip CHOICES line from display while streaming
            const displayContent    = isLikelyReport
              ? '⏳ Analyzing your responses and generating your personalized decision report…'
              : streamedResponse.replace(/\nCHOICES:\s*\[[\s\S]*$/m, '').trim();

            setSession((prev) => ({
              ...prev,
              phase: isLikelyReport ? 'analyzing' : prev.phase,
              messages: prev.messages.map((m) =>
                m.id === aiMessageId ? { ...m, content: displayContent } : m
              ),
            }));
          } catch { /* partial JSON chunk */ }
        }
      }

      // ── Post-stream finalize ─────────────────────────────────────────────
      if (isFinalReport(streamedResponse)) {
        setSession((prev) => ({
          ...prev,
          phase: 'final',
          messages: prev.messages.map((m) =>
            m.id === aiMessageId
              ? { ...m, content: streamedResponse, isReport: true }
              : m
          ),
        }));
      } else {
        const { text, choices, allowCustom } = parseChoices(streamedResponse);
        setSession((prev) => {
          const newMessages = prev.messages.map((m) =>
            m.id === aiMessageId
              ? { ...m, content: text, choices: choices.length > 0 ? choices : undefined, allowCustom: choices.length > 0 ? allowCustom : undefined }
              : m
          );
          return {
            ...prev,
            messages: newMessages,
            questionCount: countQuestions(newMessages),
            phase: 'questioning',
          };
        });
      }

    } catch (error: unknown) {
      console.error('Send error:', error);

      // If streaming bubble was created but is empty, remove it
      setSession((prev) => {
        const withoutEmpty = prev.messages.filter((m) => m.content !== '' || m.role === 'user');
        return {
          ...prev,
          messages: [
            ...withoutEmpty,
            {
              id: nanoid(),
              role: 'assistant' as const,
              content:
                error instanceof Error && error.name === 'AbortError'
                  ? 'Request timed out after 60 seconds. Please try again.'
                  : 'Something went wrong. Please try again.',
              isError: true,
              timestamp: Date.now(),
            },
          ],
        };
      });
    } finally {
      setLoading(false);
    }
  }, [loading]);

  // ── lockChoice ────────────────────────────────────────────────────────────

  const lockChoice = useCallback((messageId: string, choiceIndex: number) => {
    setSession((prev) => ({
      ...prev,
      messages: prev.messages.map((m) =>
        m.id === messageId ? { ...m, selectedChoice: choiceIndex } : m
      ),
    }));
  }, []);

  // ── retryLastMessage ──────────────────────────────────────────────────────
  // FIX: Properly recover the last user message and re-send it,
  // instead of just clearing the error and leaving the user to retype.

  const retryLastMessage = useCallback(() => {
    const messages    = sessionRef.current.messages;
    const errorIdx    = messages.findLastIndex((m) => m.isError);
    if (errorIdx < 0) return;

    const lastUserIdx = messages.findLastIndex((m, i) => m.role === 'user' && i < errorIdx);
    if (lastUserIdx < 0) {
      // Just remove error if no user message to retry
      setSession((prev) => ({ ...prev, messages: prev.messages.filter((m) => !m.isError) }));
      return;
    }

    const lastUserContent = messages[lastUserIdx].content;

    // Roll back to before the user message and resend
    setSession((prev) => ({
      ...prev,
      messages: prev.messages.slice(0, lastUserIdx),
    }));

    // Small delay to let state settle, then resend
    setTimeout(() => sendMessage(lastUserContent), 80);
  }, [sendMessage]);

  // ── newSession ────────────────────────────────────────────────────────────

  const newSession = useCallback((mode: 'standard' | 'mcq' = 'standard') => {
    setHistory(loadHistory());
    setSession(makeSession(mode));
  }, []);

  // ── loadSessionById ───────────────────────────────────────────────────────

  const loadSessionById = useCallback((id: string) => {
    const loaded = loadFullSession(id);
    if (loaded) setSession(loaded);
  }, []);

  return { session, loading, history, sendMessage, lockChoice, retryLastMessage, newSession, loadSessionById };
}