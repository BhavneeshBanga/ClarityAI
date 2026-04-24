'use client';

import { useChat } from '@/hooks/useChat';
import { useState, useRef, useEffect } from 'react';
import FinalReport from '@/components/FinalReport';
import MCQInput from '@/components/MCQInput';
import { Message } from '@/lib/types';

// ─── Phase config (matches actual Phase type) ───────────────────────────────

const PHASE_LABELS: Record<string, string> = {
  welcome: 'Getting Started',
  questioning: 'Gathering Clarity',
  analyzing: 'Analyzing Responses',
  final: 'Report Complete',
};

const PHASE_ICONS: Record<string, string> = {
  welcome: '👋',
  questioning: '🔍',
  analyzing: '⚡',
  final: '✅',
};

// ─── Safe markdown renderer (no dangerouslySetInnerHTML) ─────────────────────

function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];

  lines.forEach((line, lineIdx) => {
    if (lineIdx > 0) elements.push(<br key={`br-${lineIdx}`} />);

    // Process inline formatting
    const parts: React.ReactNode[] = [];
    let remaining = line;
    let partIdx = 0;

    // Bold: **text**
    while (remaining.length > 0) {
      const boldMatch = remaining.match(/\*\*(.*?)\*\*/);
      if (boldMatch && boldMatch.index !== undefined) {
        // Text before bold
        if (boldMatch.index > 0) {
          parts.push(
            <span key={`${lineIdx}-${partIdx++}`}>
              {remaining.slice(0, boldMatch.index)}
            </span>
          );
        }
        // Bold text
        parts.push(
          <strong key={`${lineIdx}-${partIdx++}`} className="font-semibold">
            {boldMatch[1]}
          </strong>
        );
        remaining = remaining.slice(boldMatch.index + boldMatch[0].length);
      } else {
        // No more bold — push remaining text
        if (remaining) {
          parts.push(
            <span key={`${lineIdx}-${partIdx++}`}>{remaining}</span>
          );
        }
        break;
      }
    }

    // Check if line is a bullet point
    const bulletMatch = line.match(/^[\s]*[-•]\s+(.*)/);
    if (bulletMatch) {
      elements.pop(); // Remove the br we just added
      elements.push(
        <div key={`bullet-${lineIdx}`} className="flex gap-2 mt-1">
          <span className="text-[#6b6ef9] shrink-0 mt-[1px]">•</span>
          <span>{parts}</span>
        </div>
      );
    } else if (line.match(/^[\s]*\d+\.\s+/)) {
      // Numbered list
      const numMatch = line.match(/^[\s]*(\d+)\.\s+(.*)/);
      if (numMatch) {
        elements.pop();
        elements.push(
          <div key={`num-${lineIdx}`} className="flex gap-2 mt-1">
            <span className="text-[#6b6ef9] font-medium shrink-0 text-[12px] mt-[2px] w-4 text-right">
              {numMatch[1]}.
            </span>
            <span>{parts}</span>
          </div>
        );
      }
    } else {
      // Replace the br + raw text with proper spans
      if (lineIdx > 0) {
        elements.pop(); // Remove the br
        elements.push(
          <span key={`line-${lineIdx}`}>
            <br />
            {parts}
          </span>
        );
      } else {
        elements.push(...parts);
      }
    }
  });

  return elements;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function Page() {
  const {
    session,
    loading,
    history,
    sendMessage,
    lockChoice,
    retryLastMessage,
    newSession,
    loadSessionById,
  } = useChat();
  const [input, setInput] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session.messages]);

  // Auto-focus textarea on mount and after loading finishes
  useEffect(() => {
    if (!loading && textareaRef.current && session.phase !== 'final') {
      textareaRef.current.focus();
    }
  }, [loading, session.phase]);

  const handleSend = () => {
    if (input.trim() && !loading) {
      sendMessage(input);
      setInput('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      if (e.nativeEvent.isComposing) return;
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 180) + 'px';
  };

  const handleMCQSelect = (
    messageId: string,
    choice: string,
    choiceIndex: number
  ) => {
    lockChoice(messageId, choiceIndex);
    sendMessage(choice);
  };

  // Dynamic progress calculation
  const getProgress = (): number => {
    switch (session.phase) {
      case 'welcome':
        return 5;
      case 'questioning':
        // Scale from 10% to 80% based on question count
        return Math.min(
          80,
          10 + (session.questionCount / session.totalQuestions) * 70
        );
      case 'analyzing':
        return 88;
      case 'final':
        return 100;
      default:
        return 5;
    }
  };

  const phaseLabel = PHASE_LABELS[session.phase] ?? session.phase;
  const phaseIcon = PHASE_ICONS[session.phase] ?? '💬';
  const progress = getProgress();

  return (
    <div className="flex h-screen w-full bg-[#f5f5f5] font-sans">
      {/* ── Mobile overlay ──────────────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside
        className={`
          fixed md:relative z-40 md:z-auto
          w-[260px] md:w-[220px] flex-shrink-0 flex-col
          border-r border-[#e5e5e5] bg-[#fafafa]
          transition-transform duration-300 ease-out
          h-full
          ${sidebarOpen ? 'translate-x-0 flex' : '-translate-x-full md:translate-x-0 md:flex hidden md:flex'}
        `}
      >
        {/* Logo */}
        <div className="px-4 pt-5 pb-5 flex items-center justify-between">
          <span className="text-[20px] font-bold tracking-tight text-[#111]">
            Clarity<span className="text-[#6b6ef9]">AI</span>
          </span>
          {/* Close button (mobile only) */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden w-7 h-7 flex items-center justify-center text-[#999] hover:text-[#333] transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* New session buttons */}
        <div className="px-3 mb-3 flex flex-col gap-2">
          <button
            onClick={() => { newSession('standard'); setSidebarOpen(false); }}
            className="w-full flex items-center gap-2 rounded-lg border border-[#e0e0e0] bg-white px-3 py-2 text-[12.5px] text-[#555] hover:bg-[#f5f5f5] transition-colors"
          >
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            New session
          </button>

          <button
            onClick={() => { newSession('mcq'); setSidebarOpen(false); }}
            className="w-full flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50/50 px-3 py-2 text-[12.5px] font-medium text-indigo-700 hover:bg-indigo-100/50 hover:border-indigo-300 transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
            </svg>
            New MCQ session
          </button>
        </div>

        {/* History */}
        <div className="px-4 mb-2 text-[10.5px] font-medium uppercase tracking-wider text-[#aaa]">
          Recent
        </div>
        <div className="flex-1 overflow-y-auto px-3 space-y-0.5">
          {/* Current active session */}
          <div className="rounded-md bg-[#ededff] px-2.5 py-1.5 text-[12px] text-[#5254cc] truncate cursor-pointer font-medium">
            {session.title}
          </div>

          {/* Past sessions from localStorage */}
          {history
            .filter((h) => h.id !== session.id)
            .map((h) => (
              <div
                key={h.id}
                onClick={() => { loadSessionById(h.id); setSidebarOpen(false); }}
                className="rounded-md px-2.5 py-1.5 text-[12px] text-[#666] truncate cursor-pointer hover:bg-[#f0f0f0] transition-colors flex items-center gap-1.5"
              >
                {h.mode === 'mcq' && (
                  <span className="text-[9px] bg-indigo-100 text-indigo-600 px-1 py-0.5 rounded font-bold shrink-0">
                    MCQ
                  </span>
                )}
                <span className="truncate">{h.title}</span>
              </div>
            ))}

          {history.filter((h) => h.id !== session.id).length === 0 && (
            <div className="text-[11px] text-[#ccc] px-2.5 py-3 italic">
              No past sessions yet
            </div>
          )}
        </div>

        {/* Phase info footer */}
        <div className="p-3">
          <div className="rounded-lg border border-[#e5e5e5] bg-white px-3 py-2.5 text-[11.5px] text-[#999]">
            <p className="font-medium text-[#555] mb-0.5">Current phase</p>
            <div className="flex items-center gap-1.5">
              <span>{phaseIcon}</span>
              <span>{phaseLabel}</span>
            </div>
            {session.phase === 'questioning' && (
              <div className="mt-1.5 text-[10.5px] text-[#aaa]">
                Question {session.questionCount} / {session.totalQuestions}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ── Main panel ──────────────────────────────────────── */}
      <main className="flex flex-1 flex-col min-w-0 bg-white">
        {/* Top bar */}
        <header className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-[#f0f0f0]">
          <div className="flex items-center gap-3">
            {/* Hamburger (mobile) */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden w-8 h-8 flex items-center justify-center text-[#666] hover:text-[#333] hover:bg-[#f0f0f0] rounded-lg transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path
                  d="M3 5h12M3 9h12M3 13h12"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            {/* Mobile logo */}
            <span className="md:hidden text-[16px] font-bold tracking-tight text-[#111]">
              Clarity<span className="text-[#6b6ef9]">AI</span>
            </span>

            <span className="hidden md:inline text-[13.5px] font-medium text-[#111]">
              {session.title}
            </span>
          </div>

          <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] bg-[#ededff] text-[#5254cc] rounded-full px-3 py-1 whitespace-nowrap">
            <span>{phaseIcon}</span>
            {phaseLabel}
          </span>
        </header>

        {/* Progress bar */}
        <div className="h-[2px] bg-[#f0f0f0]">
          <div
            className="h-full bg-[#6b6ef9] rounded-full transition-all duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Chat area */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-5 space-y-4">
          {session.messages.map((msg, msgIdx) => (
            <MessageBubble
              key={msg.id}
              msg={msg}
              session={session}
              loading={loading}
              isLast={msgIdx === session.messages.length - 1}
              onMCQSelect={handleMCQSelect}
              onRetry={retryLastMessage}
              sendMessage={sendMessage}
            />
          ))}

          {/* Loading indicator */}
          {loading && (
            <div className="flex gap-2.5 max-w-[92%] animate-fade-in">
              <div className="w-[26px] h-[26px] rounded-full bg-[#ededff] text-[#5254cc] flex items-center justify-center text-[10.5px] font-medium shrink-0 mt-0.5">
                C
              </div>
              <div className="bg-[#f7f7f8] border border-[#ececec] rounded-[2px_10px_10px_10px] px-4 py-3 flex items-center gap-1.5">
                {[0, 150, 300].map((delay) => (
                  <div
                    key={delay}
                    className="w-1.5 h-1.5 bg-[#bbb] rounded-full animate-bounce"
                    style={{ animationDelay: `${delay}ms` }}
                  />
                ))}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ── Input bar ───────────────────────────────────────── */}
        <div className="border-t border-[#f0f0f0] px-4 py-3 flex items-end gap-2.5">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            disabled={loading || session.phase === 'final'}
            placeholder={
              session.phase === 'final'
                ? 'Session completed — start a new one to continue.'
                : session.phase === 'welcome'
                  ? 'Describe your big decision or challenge...'
                  : 'Type your answer...'
            }
            rows={1}
            style={{ minHeight: '38px', maxHeight: '180px' }}
            className="flex-1 resize-none border border-[#e0e0e0] rounded-[8px] px-3.5 py-2.5 text-[13px] text-[#333] placeholder-[#bbb] bg-white outline-none focus:border-[#aab] focus:ring-2 focus:ring-[#6b6ef9]/10 transition-all"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading || session.phase === 'final'}
            className="w-[34px] h-[34px] flex-shrink-0 rounded-lg flex items-center justify-center transition-all duration-200 disabled:opacity-30"
            style={{
              backgroundColor:
                input.trim() && !loading && session.phase !== 'final'
                  ? '#6b6ef9'
                  : '#e5e5e5',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M1 7h12M7 1l6 6-6 6"
                stroke={
                  input.trim() && !loading && session.phase !== 'final'
                    ? '#fff'
                    : '#999'
                }
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        {/* Disclaimer */}
        <div className="text-center text-[11px] text-[#bbb] pb-2">
          ClarityAI can make mistakes. Consider verifying important information.
        </div>
      </main>
    </div>
  );
}

// ─── Message Bubble Sub-Component ───────────────────────────────────────────

function MessageBubble({
  msg,
  session,
  loading,
  isLast,
  onMCQSelect,
  onRetry,
}: {
  msg: Message;
  session: { phase: string; questionCount: number; totalQuestions: number; messages: Message[] };
  loading: boolean;
  isLast: boolean;
  onMCQSelect: (messageId: string, choice: string, choiceIndex: number) => void;
  onRetry: () => void;
}) {
  return (
    <div
      className={`flex gap-2.5 animate-fade-in-up ${
        msg.role === 'user'
          ? 'justify-end flex-row-reverse'
          : 'justify-start'
      } max-w-[92%] ${msg.role === 'user' ? 'ml-auto' : ''}`}
    >
      {/* Avatar */}
      <div
        className={`w-[26px] h-[26px] rounded-full flex items-center justify-center text-[10.5px] font-medium shrink-0 mt-0.5 ${
          msg.role === 'assistant'
            ? 'bg-[#ededff] text-[#5254cc]'
            : 'bg-[#f0f0f0] text-[#666]'
        }`}
      >
        {msg.role === 'assistant' ? 'C' : 'Y'}
      </div>

      {/* Bubble */}
      <div className="min-w-0">
        {msg.role === 'user' ? (
          <div className="bg-[#6b6ef9] text-white text-[13px] leading-relaxed px-3.5 py-2 rounded-[10px_2px_10px_10px]">
            <div className="whitespace-pre-wrap">{msg.content}</div>
          </div>
        ) : (
          <div>
            {/* ── Error message with retry ──────────────── */}
            {msg.isError ? (
              <div className="bg-red-50 border border-red-100 text-red-700 text-[13px] leading-relaxed px-3.5 py-2.5 rounded-[2px_10px_10px_10px] flex items-center gap-2.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                <span>{msg.content}</span>
                <button
                  onClick={onRetry}
                  className="ml-auto shrink-0 px-2.5 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded-md text-[11px] font-medium transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : msg.isReport ? (
              /* ── Final report ─────────────────────────── */
              <FinalReport content={msg.content} />
            ) : session.phase === 'analyzing' && isLast && !msg.isReport ? (
              /* ── Analyzing placeholder ─────────────────── */
              <div className="bg-[#f7f7f8] border border-[#ececec] text-[#222] px-4 py-3.5 rounded-[2px_10px_10px_10px] flex items-center gap-3">
                <div className="w-2 h-2 bg-[#6b6ef9] rounded-full animate-pulse-soft" />
                <span className="text-[13px] font-medium text-[#666]">
                  Analyzing your responses and generating your decision report…
                </span>
              </div>
            ) : (
              /* ── Normal AI message ────────────────────── */
              <>
                <div className="bg-[#f7f7f8] border border-[#ececec] text-[#222] text-[13px] leading-relaxed px-3.5 py-2.5 rounded-[2px_10px_10px_10px]">
                  <div className="whitespace-pre-wrap">
                    {renderMarkdown(msg.content)}
                  </div>
                </div>

                {/* Choice buttons */}
                {msg.choices && msg.choices.length > 0 && (
                  <MCQInput
                    choices={msg.choices}
                    allowCustom={msg.allowCustom ?? false}
                    onSelect={(choice, idx) => onMCQSelect(msg.id, choice, idx)}
                    disabled={loading}
                    locked={msg.selectedChoice !== undefined}
                    selectedIndex={msg.selectedChoice}
                  />
                )}

                {/* Question counter tag */}
                {session.phase === 'questioning' &&
                  isLast &&
                  msg.role === 'assistant' &&
                  !loading && (
                    <div className="inline-flex items-center gap-1.5 mt-2 text-[11px] bg-[#f0faf5] text-[#1a7a52] rounded-full px-2.5 py-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#1a7a52]" />
                      Question {session.questionCount} of {session.totalQuestions}
                    </div>
                  )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}