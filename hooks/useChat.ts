'use client';

import { useState, useCallback } from 'react';
import { Message, Session, Phase } from '@/lib/types';
import { WELCOME_MESSAGE } from '@/lib/prompts';
import { nanoid } from 'nanoid';

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Detect whether the fully-accumulated stream is a final report JSON.
 * We only check AFTER streaming completes to avoid false positives on
 * partial chunks that happen to contain those strings.
 */
function isFinalReport(text: string): boolean {
  // Must contain the type field somewhere in the text
  return /"type"\s*:\s*"final_report"/.test(text);
}

/**
 * Parse CHOICES: ["a", "b", "c"] appended by the LLM.
 * Returns the clean message text and the array of choice strings.
 */
function parseChoices(content: string): { text: string; choices: string[]; allowCustom: boolean } {
  const match = content.match(/CHOICES:\s*\[([^\]]+)\]\s*$/m);
  if (!match) return { text: content.trim(), choices: [], allowCustom: false };

  // Parse individual options — handle both single and double quotes
  const raw = match[1];
  const choices: string[] = [];
  const regex = /["']([^"']+)["']/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(raw)) !== null) {
    choices.push(m[1]);
  }

  // Strip the CHOICES line from the display text
  const text = content.replace(/(?:\r?\n)?CHOICES:\s*\[([^\]]+)\]\s*$/m, '').trim();

  // If the last choice contains "other" or "describe", mark allowCustom
  const lastChoice = choices[choices.length - 1]?.toLowerCase() ?? '';
  const allowCustom = lastChoice.includes('other') || lastChoice.includes('describe') || lastChoice.includes('type');

  return { text, choices, allowCustom };
}

/**
 * Count only genuine AI *questions* in the message history.
 * We skip: the welcome message, the report message, and messages that
 * don't end with a question mark (i.e. pure acknowledgements).
 */
function countQuestions(messages: Message[]): number {
  return messages.filter(
    (m) =>
      m.role === 'assistant' &&
      !m.isReport &&
      m.content !== WELCOME_MESSAGE &&
      // A message is a "question" if it has choices OR ends with ?
      (m.choices !== undefined || m.content.trimEnd().endsWith('?'))
  ).length;
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
  const [session, setSession] = useState<Session>(makeSession);
  const [loading, setLoading] = useState(false);

  const sendMessage = useCallback(
    async (userInput: string) => {
      if (!userInput.trim() || loading) return;

      const userMessage: Message = {
        id: nanoid(),
        role: 'user',
        content: userInput.trim(),
        timestamp: Date.now(),
      };

      // Snapshot current messages + append user message
      const updatedMessages = [...session.messages, userMessage];

      setSession((prev) => ({
        ...prev,
        messages: updatedMessages,
        // Set title from first real user message
        title:
          prev.title === 'New Session'
            ? userInput.slice(0, 45) + (userInput.length > 45 ? '…' : '')
            : prev.title,
        // Move out of welcome phase once user sends their first message
        phase: prev.phase === 'welcome' ? 'questioning' : prev.phase,
      }));

      setLoading(true);

      try {
        // Build API messages — strip welcome message and report blobs
        const apiMessages = updatedMessages
          .filter((m) => !m.isReport && m.content !== WELCOME_MESSAGE)
          .map((m) => ({ role: m.role, content: m.content }));

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: apiMessages,
            // Tell the LLM how many questions it has already asked
            questionCount: session.questionCount,
            mode: session.mode,
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

              // While streaming: hide the raw CHOICES line from display,
              // also don't show partial JSON blobs for the final report
              const isLikelyReport = streamedResponse.trimStart().startsWith('{');
              const displayContent = isLikelyReport
                ? '' // Show nothing until stream completes and we parse it properly
                : streamedResponse.replace(/\nCHOICES:\s*\[.*$/ms, '').trim();

              setSession((prev) => ({
                ...prev,
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
          // Parse and display the structured report
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
            // Recount questions from the updated messages
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
        setSession((prev) => ({
          ...prev,
          messages: [
            ...updatedMessages,
            {
              id: nanoid(),
              role: 'assistant',
              content: 'Sorry, something went wrong. Please try again.',
              timestamp: Date.now(),
            },
          ],
        }));
      } finally {
        setLoading(false);
      }
    },
    [session, loading]
  );

  const newSession = useCallback((mode: 'standard' | 'mcq' = 'standard') => {
    setSession(makeSession(mode));
  }, []);

  return { session, loading, sendMessage, newSession };
}