'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Message, Session, SessionSummary } from '@/lib/types';
import { WELCOME_MESSAGE, buildMemorySummaryPrompt } from '@/lib/prompts';
import { nanoid } from 'nanoid';

// ─── Constants ────────────────────────────────────────────────────────────────

const FETCH_TIMEOUT    = 60_000;
const SAVE_DEBOUNCE_MS = 1_200; // debounce DB writes to avoid hammering on every keystroke

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isFinalReport(text: string): boolean {
  return /\"type\"\s*:\s*\"final_report\"/.test(text);
}

function parseChoices(content: string): {
  text: string;
  choices: string[];
  allowCustom: boolean;
} {
  const match = content.match(/\nCHOICES:\s*(\[[\s\S]*?\])\s*$/m);
  if (!match) return { 
    text: content.trim(), 
    choices: [], 
    allowCustom: false 
  };
    

  let choices: string[] = [];
  try {
    choices = JSON.parse(match[1]);
  } 
  catch {
    const regex = /"([^"\\]*(\\.[^"\\]*)*)"/g;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(match[1])) !== null) choices.push(m[1].replace(/\\"/g, '"'));
  }

  const text = content.replace(/\nCHOICES:\s*\[[\s\S]*?\]\s*$/m, '').trim();
  const lastChoice = choices[choices.length - 1]?.toLowerCase() ?? '';
  const allowCustom = lastChoice.includes('other') || lastChoice.includes('describe') || lastChoice.includes('type your own');

  return { text, choices, allowCustom };
}

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

function collectUserMessages(messages: Message[]): string[] {
  return messages.filter((m) => m.role === 'user').map((m) => m.content.trim());
}

// ─── Factory ─────────────────────────────────────────────────────────────────

function makeSession(mode: 'standard' | 'mcq' = 'standard'): Session {
  return {
    id:            nanoid(),
    title:         'New Session',
    messages: [{
      id:        nanoid(),
      role:      'assistant',
      content:   WELCOME_MESSAGE,
      timestamp: Date.now(),
    }],
    phase:         'welcome',
    questionCount: 0,
    totalQuestions: 20,
    category:      '',
    mode,
    createdAt:     Date.now(),
  };
}

// ─── DB persistence helpers ──────────────────────────────────────────────────

async function persistSession(session: Session): Promise<void> {
  try {
    await fetch('/api/sessions', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(session),
    });
  } 
  catch (e) {
    console.error('Failed to persist session:', e);
  }
}

async function fetchSessionList(): Promise<SessionSummary[]> {
  try {
    const res = await fetch('/api/sessions');
    if (!res.ok) return [];
    const data = await res.json();
    return (data.sessions ?? []).map((s: {
      id: string; title: string; phase: string; mode: string;
      branchedFrom?: string; createdAt: string; _count: { messages: number };
    }) => ({
      id:           s.id,
      title:        s.title,
      phase:        s.phase,
      mode:         s.mode,
      branchedFrom: s.branchedFrom,
      createdAt:    new Date(s.createdAt).getTime(),
      messageCount: s._count.messages,
    }));
  } 
  catch {
    return [];
  }
}

async function fetchFullSession(id: string): Promise<Session | null> {
  try {
    const res = await fetch(`/api/sessions/${id}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.session ?? null;
  } 
  catch {
    return null;
  }
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useChat() {
  const { data: authSession } = useSession();
  const userId = (authSession?.user as any)?.id;

  const [session, setSession]   = useState<Session>(makeSession);
  const [loading, setLoading]   = useState(false);
  const [history, setHistory]   = useState<SessionSummary[]>([]);
  const [dbReady, setDbReady]   = useState(false);
  const [rateLimitHit, setRateLimitHit] = useState(false);

  const sessionRef  = useRef(session);
  sessionRef.current = session;

  // Debounce timer ref for DB saves
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load history from DB on mount (once user is authenticated) ─────────────
  useEffect(() => {
    if (!userId) return;
    fetchSessionList().then((list) => {
      setHistory(list);
      setDbReady(true);
    });
  }, [userId]);

  // ── Debounced DB persist on every session change ──────────────────────────
  useEffect(() => {
    if (!userId || !dbReady) return;
    if (session.messages.length <= 1) return; // don't save empty sessions

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      persistSession(session).then(() => {
        // Refresh history list after saving
        fetchSessionList().then(setHistory);
      });
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [session, userId, dbReady]);

  // ── sendMessage ───────────────────────────────────────────────────────────

  const sendMessage = useCallback(async (userInput: string, overrideSession?: Session) => {
    if (!userInput.trim() || loading) return;

    const userMessage: Message = {
      id:        nanoid(),
      role:      'user',
      content:   userInput.trim(),
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
      const currentSession = overrideSession ?? sessionRef.current;
      const allMessages    = [...currentSession.messages, userMessage];

      const apiMessages = allMessages
        .filter((m) => !m.isReport && !m.isError && m.content !== WELCOME_MESSAGE && m.content.length > 0)
        .map((m) => ({ role: m.role, content: m.content }));

      const userMsgs = collectUserMessages(allMessages);
      let memoryNote: string | undefined;
      if (userMsgs.length >= 10) memoryNote = buildMemorySummaryPrompt(userMsgs);

      const controller = new AbortController();
      const timeoutId  = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

      let response: Response;
      try {
        response = await fetch('/api/chat', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            sessionId: currentSession.id,
            messages: apiMessages,
            questionCount: currentSession.questionCount,
            mode: currentSession.mode,
            memoryNote,
          }),
          signal: controller.signal,
        });
      } 
      finally {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        if (response.status === 429) {
          setRateLimitHit(true);
        }
        let errStr = `Server error (${response.status})`;
        try { const d = await response.json(); errStr = d.error || errStr; } catch { /* ignore */ }
        throw new Error(errStr);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No stream available');

      const decoder        = new TextDecoder();
      let streamedResponse = '';
      const aiMessageId    = nanoid();

      setSession((prev) => ({
        ...prev,
        messages: [...prev.messages, { id: aiMessageId, role: 'assistant', content: '', timestamp: Date.now() }],
      }));

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
            const isLikelyReport = streamedResponse.trimStart().startsWith('{');
            const displayContent = isLikelyReport
              ? '⏳ Analyzing your responses and generating your personalized decision report…'
              : streamedResponse.replace(/\nCHOICES:\s*\[[\s\S]*$/m, '').trim();

            setSession((prev) => ({
              ...prev,
              phase: isLikelyReport ? 'analyzing' : prev.phase,
              messages: prev.messages.map((m) => m.id === aiMessageId ? { ...m, content: displayContent } : m),
            }));
          } catch { /* partial chunk */ }
        }
      }

      if (isFinalReport(streamedResponse)) {
        setSession((prev) => ({
          ...prev,
          phase: 'final',
          messages: prev.messages.map((m) =>
            m.id === aiMessageId ? { ...m, content: streamedResponse, isReport: true } : m
          ),
        }));
      } 
      else {
        const { text, choices, allowCustom } = parseChoices(streamedResponse);
        setSession((prev) => {
          const newMessages = prev.messages.map((m) =>
            m.id === aiMessageId
              ? { ...m, content: text, choices: choices.length > 0 ? choices : undefined, allowCustom: choices.length > 0 ? allowCustom : undefined }
              : m
          );
          return { ...prev, messages: newMessages, questionCount: countQuestions(newMessages), phase: 'questioning' };
        });
      }
    } 
    catch (error: unknown) {
      setSession((prev) => {
        const withoutEmpty = prev.messages.filter((m) => m.content !== '' || m.role === 'user');
        return {
          ...prev,
          messages: [
            ...withoutEmpty,
            {
              id: nanoid(), role: 'assistant' as const,
              content: error instanceof Error && error.name === 'AbortError'
                ? 'Request timed out after 60 seconds. Please try again.'
                : 'Something went wrong. Please try again.',
              isError: true, timestamp: Date.now(),
            },
          ],
        };
      });
    } 
    finally {
      setLoading(false);
    }
  }, [loading]);

  // ── editMessage ───────────────────────────────────────────────────────────

  const editMessage = useCallback((messageId: string, newContent: string) => {
    const messages = sessionRef.current.messages;
    const msgIdx   = messages.findIndex((m) => m.id === messageId);
    if (msgIdx < 0) return;

    const truncated = messages.slice(0, msgIdx);
    const newSession: Session = {
      ...sessionRef.current,
      messages:      truncated,
      phase:         truncated.length <= 1 ? 'welcome' : 'questioning',
      questionCount: countQuestions(truncated),
    };

    setSession(newSession);
    setTimeout(() => sendMessage(newContent, newSession), 60);
  }, [sendMessage]);

  // ── branchFromMessage ─────────────────────────────────────────────────────

  const branchFromMessage = useCallback((messageId: string) => {
    const messages = sessionRef.current.messages;
    const msgIdx   = messages.findIndex((m) => m.id === messageId);
    if (msgIdx < 0) return;

    const branchMessages = messages.slice(0, msgIdx + 1).map((m) => ({
      ...m, 
      id: nanoid(), 
      selectedChoice: undefined,
    }));

    const parentTitle    = sessionRef.current.title;
    const branchedSession: Session = {
      id:            nanoid(),
      title:         `Branch of "${parentTitle.slice(0, 32)}${parentTitle.length > 32 ? '…' : ''}"`,
      messages:      branchMessages,
      phase:         branchMessages.length <= 1 ? 'welcome' : 'questioning',
      questionCount: countQuestions(branchMessages),
      totalQuestions: 20,
      category:      sessionRef.current.category,
      mode:          sessionRef.current.mode,
      createdAt:     Date.now(),
      branchedFrom:  sessionRef.current.id,
    };

    setSession(branchedSession);
    // Immediately persist the branch to DB
    if (userId) persistSession(branchedSession).then(() => fetchSessionList().then(setHistory));
  }, [userId]);

  // ── lockChoice ────────────────────────────────────────────────────────────

  const lockChoice = useCallback((messageId: string, choiceIndex: number) => {
    setSession((prev) => ({
      ...prev,
      messages: prev.messages.map((m) => m.id === messageId ? { ...m, selectedChoice: choiceIndex } : m),
    }));
  }, []);

  // ── retryLastMessage ──────────────────────────────────────────────────────

  const retryLastMessage = useCallback(() => {
    const messages    = sessionRef.current.messages;
    const errorIdx    = messages.findLastIndex((m) => m.isError);
    if (errorIdx < 0) return;

    const lastUserIdx = messages.findLastIndex((m, i) => m.role === 'user' && i < errorIdx);
    if (lastUserIdx < 0) {
      setSession((prev) => ({ ...prev, messages: prev.messages.filter((m) => !m.isError) }));
      return;
    }

    const lastUserContent = messages[lastUserIdx].content;
    setSession((prev) => ({ ...prev, messages: prev.messages.slice(0, lastUserIdx) }));
    setTimeout(() => sendMessage(lastUserContent), 80);
  }, [sendMessage]);

  // ── newSession ────────────────────────────────────────────────────────────

  const newSession = useCallback((mode: 'standard' | 'mcq' = 'standard') => {
    setSession(makeSession(mode));
  }, []);

  // ── loadSessionById ───────────────────────────────────────────────────────

  const loadSessionById = useCallback(async (id: string) => {
    const loaded = await fetchFullSession(id);
    if (loaded) setSession(loaded);
  }, []);

  // ── deleteSession ─────────────────────────────────────────────────────────

  const deleteSession = useCallback(async (id: string) => {
    await fetch(`/api/sessions/${id}`, { method: 'DELETE' });
    setHistory((prev) => prev.filter((h) => h.id !== id));
    // If we deleted the current session, start fresh
    if (sessionRef.current.id === id) setSession(makeSession());
  }, []);

  // ── renameSession ─────────────────────────────────────────────────────────

  const renameSession = useCallback(async (id: string, newTitle: string) => {
    await fetch(`/api/sessions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle }),
    });
    setHistory((prev) => prev.map((h) => h.id === id ? { ...h, title: newTitle } : h));
    if (sessionRef.current.id === id) {
      setSession((prev) => ({ ...prev, title: newTitle }));
    }
  }, []);

  return {
    session,
    loading,
    history,
    dbReady,
    sendMessage,
    editMessage,
    branchFromMessage,
    lockChoice,
    retryLastMessage,
    newSession,
    loadSessionById,
    deleteSession,
    renameSession,
    rateLimitHit,
    setRateLimitHit,
  };
}