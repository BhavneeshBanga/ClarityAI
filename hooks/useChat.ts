'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Message, Session, SessionSummary, Phase } from '@/lib/types';
import { WELCOME_MESSAGE } from '@/lib/prompts';
import { nanoid } from 'nanoid';

// ─── Constants ──────────────────────────────────────────────────────────────

const STORAGE_KEY = 'clarityai_current_session';
const HISTORY_KEY = 'clarityai_session_history';
const MAX_HISTORY = 20;

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Detect whether the fully-accumulated stream is a final report JSON.
 * We only check AFTER streaming completes to avoid false positives.
 */
function isFinalReport(text: string): boolean {
  return /\"type\"\s*:\s*\"final_report\"/.test(text);
}

/**
 * Parse CHOICES: ["a", "b", "c"] appended by the LLM.
 * Returns the clean message text and the array of choice strings.
 */
function parseChoices(content: string): { text: string; choices: string[]; allowCustom: boolean } {
  const match = content.match(/CHOICES:\s*\[([^\]]+)\]\s*$/m);
  if (!match) return { text: content.trim(), choices: [], allowCustom: false };

  const raw = match[1];
  const choices: string[] = [];
  const regex = /["']([^"']+)["']/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(raw)) !== null) {
    choices.push(m[1]);
  }

  const text = content.replace(/(?:\r?\n)?CHOICES:\s*\[([^\]]+)\]\s*$/m, '').trim();

  const lastChoice = choices[choices.length - 1]?.toLowerCase() ?? '';
  const allowCustom =
    lastChoice.includes('other') ||
    lastChoice.includes('describe') ||
    lastChoice.includes('type');

  return { text, choices, allowCustom };
}

/**
 * Count only genuine AI *questions* in the message history.
 */
function countQuestions(messages: Message[]): number {
  return messages.filter(
    (m) =>
      m.role === 'assistant' &&
      !m.isReport &&
      !m.isError &&
      m.content !== WELCOME_MESSAGE &&
      (m.choices !== undefined || m.content.trimEnd().endsWith('?'))
  ).length;
}

// ─── LocalStorage helpers ───────────────────────────────────────────────────

function saveSession(session: Session): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch (_) {
    // Storage full or unavailable — fail silently
  }
}

function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Session;
  } catch (_) {
    return null;
  }
}

function saveToHistory(session: Session): void {
  try {
    const history = loadHistory();
    // Don't save empty sessions (only welcome message)
    if (session.messages.length <= 1) return;

    const summary: SessionSummary = {
      id: session.id,
      title: session.title,
      phase: session.phase,
      mode: session.mode,
      createdAt: session.createdAt,
      messageCount: session.messages.length,
    };

    // Replace if exists, otherwise prepend
    const idx = history.findIndex((h) => h.id === session.id);
    if (idx >= 0) {
      history[idx] = summary;
    } else {
      history.unshift(summary);
    }

    // Keep only the most recent
    const trimmed = history.slice(0, MAX_HISTORY);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
  } catch (_) {}
}

function loadHistory(): SessionSummary[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SessionSummary[];
  } catch (_) {
    return [];
  }
}

function loadFullSession(id: string): Session | null {
  try {
    const raw = localStorage.getItem(`clarityai_session_${id}`);
    if (!raw) return null;
    return JSON.parse(raw) as Session;
  } catch (_) {
    return null;
  }
}

function saveFullSession(session: Session): void {
  try {
    localStorage.setItem(`clarityai_session_${session.id}`, JSON.stringify(session));
  } catch (_) {}
}

// ─── Initial session factory ────────────────────────────────────────────────

function makeSession(mode: 'standard' | 'mcq' = 'standard'): Session {
  return {
    id: nanoid(),
    title: 'New Session',
    messages: [
      {
        id: nanoid(),
        role: 'assistant',
        content: WELCOME_MESSAGE,
        timestamp: Date.now(),
      },
    ],
    phase: 'welcome',
    questionCount: 0,
    totalQuestions: 20,
    category: '',
    mode,
    createdAt: Date.now(),
  };
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useChat() {
  const [session, setSession] = useState<Session>(() => {
    // Try to restore from localStorage on mount
    if (typeof window !== 'undefined') {
      const saved = loadSession();
      if (saved) return saved;
    }
    return makeSession();
  });
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<SessionSummary[]>([]);

  // Ref to always have current session without stale closures
  const sessionRef = useRef(session);
  sessionRef.current = session;

  // Load history on mount
  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  // Persist session to localStorage on every change
  useEffect(() => {
    saveSession(session);
    saveFullSession(session);
    saveToHistory(session);
  }, [session]);

  // ── Send message ────────────────────────────────────────────────────────

  const sendMessage = useCallback(
    async (userInput: string) => {
      if (!userInput.trim() || loading) return;

      const userMessage: Message = {
        id: nanoid(),
        role: 'user',
        content: userInput.trim(),
        timestamp: Date.now(),
      };

      // Use functional updates to avoid stale closure issues
      setSession((prev) => ({
        ...prev,
        messages: [...prev.messages, userMessage],
        title:
          prev.title === 'New Session'
            ? userInput.slice(0, 45) + (userInput.length > 45 ? '…' : '')
            : prev.title,
        phase: prev.phase === 'welcome' ? 'questioning' : prev.phase,
      }));

      setLoading(true);

      try {
        // Build API messages — use ref for current state
        const currentSession = sessionRef.current;
        const allMessages = [...currentSession.messages, userMessage];
        const apiMessages = allMessages
          .filter((m) => !m.isReport && !m.isError && m.content !== WELCOME_MESSAGE)
          .map((m) => ({ role: m.role, content: m.content }));

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: apiMessages,
            questionCount: currentSession.questionCount,
            mode: currentSession.mode,
          }),
        });

        if (!response.ok) {
          let errStr = 'API error';
          try {
            const d = await response.json();
            errStr = d.error || errStr;
          } catch (_) {}
          throw new Error(errStr);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No stream available');

        const decoder = new TextDecoder();
        let streamedResponse = '';
        const aiMessageId = nanoid();

        // Add the AI bubble immediately (empty) so the user sees it stream in
        setSession((prev) => ({
          ...prev,
          messages: [
            ...prev.messages,
            {
              id: aiMessageId,
              role: 'assistant',
              content: '',
              timestamp: Date.now(),
            },
          ],
        }));

        // ── Stream loop ──────────────────────────────────────────────────
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter((l) => l.trim() !== '');

          for (const line of lines) {
            if (line.includes('[DONE]')) continue;
            if (!line.startsWith('data: ')) continue;

            try {
              const data = JSON.parse(line.slice(6));
              const delta = data.choices?.[0]?.delta?.content;
              if (!delta) continue;

              streamedResponse += delta;

              // While streaming: hide raw CHOICES line from display,
              // show a placeholder for report JSON instead of blank
              const isLikelyReport = streamedResponse.trimStart().startsWith('{');
              const displayContent = isLikelyReport
                ? '⏳ Analyzing your responses and generating your personalized decision report…'
                : streamedResponse.replace(/\nCHOICES:\s*\[[\s\S]*$/m, '').trim();

              setSession((prev) => ({
                ...prev,
                phase: isLikelyReport ? 'analyzing' : prev.phase,
                messages: prev.messages.map((m) =>
                  m.id === aiMessageId ? { ...m, content: displayContent } : m
                ),
              }));
            } catch (_) {
              // Partial JSON chunk — ignore
            }
          }
        }

        // ── Post-stream: finalize the message ────────────────────────────
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
                ? {
                    ...m,
                    content: text,
                    choices: choices.length > 0 ? choices : undefined,
                    allowCustom: choices.length > 0 ? allowCustom : undefined,
                  }
                : m
            );
            const newQuestionCount = countQuestions(newMessages);
            return {
              ...prev,
              messages: newMessages,
              questionCount: newQuestionCount,
              phase: 'questioning',
            };
          });
        }
      } catch (error) {
        console.error('Send error:', error);
        const errorMessageId = nanoid();
        setSession((prev) => ({
          ...prev,
          messages: [
            ...prev.messages.filter((m) => m.content !== ''), // Remove empty streaming bubble
            {
              id: errorMessageId,
              role: 'assistant',
              content: 'Something went wrong. Please try again.',
              isError: true,
              timestamp: Date.now(),
            },
          ],
        }));
      } finally {
        setLoading(false);
      }
    },
    [loading]
  );

  // ── Lock MCQ choice ─────────────────────────────────────────────────────

  const lockChoice = useCallback((messageId: string, choiceIndex: number) => {
    setSession((prev) => ({
      ...prev,
      messages: prev.messages.map((m) =>
        m.id === messageId ? { ...m, selectedChoice: choiceIndex } : m
      ),
    }));
  }, []);

  // ── Retry last failed message ───────────────────────────────────────────

  const retryLastMessage = useCallback(() => {
    setSession((prev) => {
      // Find the last user message before the error
      const messages = [...prev.messages];
      // Remove the error message
      const errorIdx = messages.findLastIndex((m) => m.isError);
      if (errorIdx < 0) return prev;

      const lastUserIdx = messages.findLastIndex(
        (m, i) => m.role === 'user' && i < errorIdx
      );
      if (lastUserIdx < 0) return prev;

      const userMsg = messages[lastUserIdx];
      // Remove everything from the user message onward
      const cleaned = messages.slice(0, lastUserIdx);
      return { ...prev, messages: cleaned };
    });

    // After cleaning, we need to resend. Use a timeout to let state settle.
    setTimeout(() => {
      const current = sessionRef.current;
      const lastUserMsg = [...current.messages]
        .reverse()
        .find((m) => m.role === 'user');
      // Actually, let's approach this differently — just remove the error
      // and let the user click send again from their existing input.
    }, 50);

    // Simpler approach: just remove the error message so user can resend
    setSession((prev) => ({
      ...prev,
      messages: prev.messages.filter((m) => !m.isError),
    }));
  }, []);

  // ── New session ─────────────────────────────────────────────────────────

  const newSession = useCallback(
    (mode: 'standard' | 'mcq' = 'standard') => {
      // Save current session to history before switching
      setHistory(loadHistory());
      const fresh = makeSession(mode);
      setSession(fresh);
    },
    []
  );

  // ── Load a past session ─────────────────────────────────────────────────

  const loadSessionById = useCallback((id: string) => {
    const loaded = loadFullSession(id);
    if (loaded) {
      setSession(loaded);
    }
  }, []);

  return {
    session,
    loading,
    history,
    sendMessage,
    lockChoice,
    retryLastMessage,
    newSession,
    loadSessionById,
  };
}