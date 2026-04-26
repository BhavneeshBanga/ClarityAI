'use client';

import { useChat } from '@/hooks/useChat';
import { useSession, signOut } from 'next-auth/react';
import { useState, useRef, useEffect } from 'react';
import FinalReport from '@/components/FinalReport';
import MCQInput from '@/components/MCQInput';
import EditableUserMessage from '@/components/EditableUserMessage';
import { Message } from '@/lib/types';
import Image from 'next/image';

// ─── Phase config ─────────────────────────────────────────────────────────────

const PHASE_LABELS: Record<string, string> = {
  welcome:    'Getting Started',
  questioning: 'Gathering Clarity',
  analyzing:  'Analyzing Responses',
  final:      'Report Complete',
};

const PHASE_ICONS: Record<string, string> = {
  welcome:    '👋',
  questioning: '🔍',
  analyzing:  '⚡',
  final:      '✅',
};

// ─── Markdown renderer ────────────────────────────────────────────────────────

function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];

  lines.forEach((line, lineIdx) => {
    if (lineIdx > 0) elements.push(<br key={`br-${lineIdx}`} />);

    const parts: React.ReactNode[] = [];
    let remaining = line;
    let partIdx = 0;

    while (remaining.length > 0) {
      const boldMatch = remaining.match(/\*\*(.*?)\*\*/);
      if (boldMatch && boldMatch.index !== undefined) {
        if (boldMatch.index > 0) parts.push(<span key={`${lineIdx}-${partIdx++}`}>{remaining.slice(0, boldMatch.index)}</span>);
        parts.push(<strong key={`${lineIdx}-${partIdx++}`} className="font-semibold">{boldMatch[1]}</strong>);
        remaining = remaining.slice(boldMatch.index + boldMatch[0].length);
      } else {
        if (remaining) parts.push(<span key={`${lineIdx}-${partIdx++}`}>{remaining}</span>);
        break;
      }
    }

    const bulletMatch = line.match(/^[\s]*[-•]\s+(.*)/);
    if (bulletMatch) {
      elements.pop();
      elements.push(
        <div key={`bullet-${lineIdx}`} className="flex gap-2 mt-1">
          <span className="text-[#6b6ef9] shrink-0 mt-[1px]">•</span>
          <span>{parts}</span>
        </div>
      );
    } else if (line.match(/^[\s]*\d+\.\s+/)) {
      const numMatch = line.match(/^[\s]*(\d+)\.\s+(.*)/);
      if (numMatch) {
        elements.pop();
        elements.push(
          <div key={`num-${lineIdx}`} className="flex gap-2 mt-1">
            <span className="text-[#6b6ef9] font-medium shrink-0 text-[12px] mt-[2px] w-4 text-right">{numMatch[1]}.</span>
            <span>{parts}</span>
          </div>
        );
      }
    } else {
      if (lineIdx > 0) { elements.pop(); elements.push(<span key={`line-${lineIdx}`}><br />{parts}</span>); }
      else elements.push(...parts);
    }
  });

  return elements;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Page() {
  const { data: authSession } = useSession();
  const {
    session, loading, history, dbReady,
    sendMessage, editMessage, branchFromMessage, lockChoice,
    retryLastMessage, newSession, loadSessionById, deleteSession,
  } = useChat();

  const [input, setInput]           = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [deletingId, setDeletingId]  = useState<string | null>(null);
  const messagesEndRef  = useRef<HTMLDivElement>(null);
  const textareaRef     = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [session.messages]);
  useEffect(() => {
    if (!loading && textareaRef.current && session.phase !== 'final') textareaRef.current.focus();
  }, [loading, session.phase]);

  const handleSend = () => {
    if (input.trim() && !loading) { sendMessage(input); setInput(''); if (textareaRef.current) textareaRef.current.style.height = 'auto'; }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { if (e.nativeEvent.isComposing) return; e.preventDefault(); handleSend(); }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 180) + 'px';
  };

  const handleMCQSelect = (messageId: string, choice: string, choiceIndex: number) => {
    lockChoice(messageId, choiceIndex);
    sendMessage(choice);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeletingId(id);
    await deleteSession(id);
    setDeletingId(null);
  };

  const getProgress = (): number => {
    switch (session.phase) {
      case 'welcome':     return 5;
      case 'questioning': return Math.min(80, 10 + (session.questionCount / session.totalQuestions) * 70);
      case 'analyzing':   return 88;
      case 'final':       return 100;
      default:            return 5;
    }
  };

  const phaseLabel = PHASE_LABELS[session.phase] ?? session.phase;
  const phaseIcon  = PHASE_ICONS[session.phase]  ?? '💬';
  const progress   = getProgress();
  const isBranch   = !!session.branchedFrom;
  const user       = authSession?.user;

  return (
    <div className="flex h-screen w-full bg-[#f5f5f5] font-sans">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/20 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className={`
        fixed md:relative z-40 md:z-auto w-[260px] md:w-[220px]
        flex-shrink-0 flex-col border-r border-[#e5e5e5] bg-[#fafafa]
        transition-transform duration-300 ease-out h-full
        ${sidebarOpen ? 'translate-x-0 flex' : '-translate-x-full md:translate-x-0 md:flex hidden md:flex'}
      `}>
        {/* Logo */}
        <div className="px-4 pt-5 pb-4 flex items-center justify-between">
          <span className="text-[20px] font-bold tracking-tight text-[#111]">
            Clarity<span className="text-[#6b6ef9]">AI</span>
          </span>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden w-7 h-7 flex items-center justify-center text-[#999] hover:text-[#333] transition-colors">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          </button>
        </div>

        {/* New session buttons */}
        <div className="px-3 mb-3 flex flex-col gap-2">
          <button onClick={() => { newSession('standard'); setSidebarOpen(false); }} className="w-full flex items-center gap-2 rounded-lg border border-[#e0e0e0] bg-white px-3 py-2 text-[12.5px] text-[#555] hover:bg-[#f5f5f5] transition-colors">
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
            New session
          </button>
          <button onClick={() => { newSession('mcq'); setSidebarOpen(false); }} className="w-full flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50/50 px-3 py-2 text-[12.5px] font-medium text-indigo-700 hover:bg-indigo-100/50 hover:border-indigo-300 transition-colors">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
            New MCQ session
          </button>
        </div>

        {/* History */}
        <div className="px-4 mb-1.5 text-[10.5px] font-medium uppercase tracking-wider text-[#aaa] flex items-center justify-between">
          <span>Recent</span>
          {!dbReady && <span className="text-[10px] text-[#ccc] animate-pulse">syncing…</span>}
        </div>

        <div className="flex-1 overflow-y-auto px-3 space-y-0.5">
          {/* Active session */}
          <div className="rounded-md bg-[#ededff] px-2.5 py-1.5 text-[12px] text-[#5254cc] cursor-default font-medium flex items-center gap-1.5">
            {isBranch && <BranchIcon />}
            <span className="truncate flex-1">{session.title}</span>
          </div>

          {/* Past sessions */}
          {history.filter((h) => h.id !== session.id).map((h) => (
            <div
              key={h.id}
              onClick={() => { loadSessionById(h.id); setSidebarOpen(false); }}
              className="group/hist rounded-md px-2.5 py-1.5 text-[12px] text-[#666] cursor-pointer hover:bg-[#f0f0f0] transition-colors flex items-center gap-1.5"
            >
              {h.branchedFrom && <BranchIcon />}
              {h.mode === 'mcq' && <span className="text-[9px] bg-indigo-100 text-indigo-600 px-1 py-0.5 rounded font-bold shrink-0">MCQ</span>}
              <span className="truncate flex-1">{h.title}</span>
              {/* Delete button */}
              <button
                onClick={(e) => handleDelete(e, h.id)}
                disabled={deletingId === h.id}
                className="opacity-0 group-hover/hist:opacity-100 transition-opacity w-5 h-5 flex items-center justify-center rounded text-[#ccc] hover:text-red-400 hover:bg-red-50 shrink-0"
                title="Delete session"
              >
                {deletingId === h.id
                  ? <span className="text-[9px] animate-spin">◌</span>
                  : <svg width="11" height="11" viewBox="0 0 16 16" fill="none"><path d="M3 4h10M6 4V2h4v2M5 4l.5 9h5L11 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                }
              </button>
            </div>
          ))}

          {history.filter((h) => h.id !== session.id).length === 0 && dbReady && (
            <div className="text-[11px] text-[#ccc] px-2.5 py-3 italic">No past sessions yet</div>
          )}
        </div>

        {/* User profile footer */}
        <div className="p-3 border-t border-[#eeeeee]">
          <div className="flex items-center gap-2.5 rounded-lg px-2.5 py-2">
            {user?.image
              ? <Image src={user.image} alt={user.name ?? ''} width={28} height={28} className="rounded-full shrink-0" />
              : <div className="w-7 h-7 rounded-full bg-[#ededff] flex items-center justify-center text-[11px] font-bold text-[#5254cc] shrink-0">{user?.name?.[0] ?? '?'}</div>
            }
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-medium text-[#333] truncate">{user?.name ?? 'User'}</div>
              <div className="text-[10.5px] text-[#aaa] truncate">{user?.email}</div>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              title="Sign out"
              className="w-6 h-6 flex items-center justify-center text-[#bbb] hover:text-[#666] transition-colors shrink-0"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main panel ──────────────────────────────────────────────────── */}
      <main className="flex flex-1 flex-col min-w-0 bg-white">
        {/* Header */}
        <header className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-[#f0f0f0]">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden w-8 h-8 flex items-center justify-center text-[#666] hover:text-[#333] hover:bg-[#f0f0f0] rounded-lg transition-colors">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 5h12M3 9h12M3 13h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
            </button>
            <span className="md:hidden text-[16px] font-bold tracking-tight text-[#111]">Clarity<span className="text-[#6b6ef9]">AI</span></span>
            <div className="hidden md:flex items-center gap-2">
              {isBranch && (
                <span className="inline-flex items-center gap-1 text-[10.5px] text-[#8b8ff5] bg-indigo-50 border border-indigo-100 rounded-full px-2 py-0.5">
                  <BranchIcon /> branch
                </span>
              )}
              <span className="text-[13.5px] font-medium text-[#111]">{session.title}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] bg-[#ededff] text-[#5254cc] rounded-full px-3 py-1 whitespace-nowrap">
              <span>{phaseIcon}</span>{phaseLabel}
            </span>
            {/* Mobile user avatar */}
            {user?.image
              ? <Image src={user.image} alt="" width={26} height={26} className="rounded-full md:hidden" />
              : <div className="w-[26px] h-[26px] rounded-full bg-[#ededff] flex items-center justify-center text-[10px] font-bold text-[#5254cc] md:hidden">{user?.name?.[0] ?? '?'}</div>
            }
          </div>
        </header>

        {/* Progress */}
        <div className="h-[2px] bg-[#f0f0f0]">
          <div className="h-full bg-[#6b6ef9] rounded-full transition-all duration-700 ease-out" style={{ width: `${progress}%` }} />
        </div>

        {/* Chat area */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-5 space-y-4">
          {session.messages.map((msg, msgIdx) => (
            <MessageBubble
              key={msg.id}
              msg={msg}
              msgIdx={msgIdx}
              totalMessages={session.messages.length}
              session={session}
              loading={loading}
              isLast={msgIdx === session.messages.length - 1}
              onMCQSelect={handleMCQSelect}
              onRetry={retryLastMessage}
              onEditMessage={editMessage}
              onBranchFrom={branchFromMessage}
            />
          ))}

          {loading && (
            <div className="flex gap-2.5 max-w-[92%] animate-fade-in">
              <div className="w-[26px] h-[26px] rounded-full bg-[#ededff] text-[#5254cc] flex items-center justify-center text-[10.5px] font-medium shrink-0 mt-0.5">C</div>
              <div className="bg-[#f7f7f8] border border-[#ececec] rounded-[2px_10px_10px_10px] px-4 py-3 flex items-center gap-1.5">
                {[0, 150, 300].map((delay) => (
                  <div key={delay} className="w-1.5 h-1.5 bg-[#bbb] rounded-full animate-bounce" style={{ animationDelay: `${delay}ms` }} />
                ))}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-[#f0f0f0] px-4 py-3 flex items-end gap-2.5">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            disabled={loading || session.phase === 'final'}
            placeholder={
              session.phase === 'final'    ? 'Session complete — start a new one to continue.' :
              session.phase === 'welcome'  ? 'Describe your big decision or challenge...' :
              'Type your answer...'
            }
            rows={1}
            style={{ minHeight: '38px', maxHeight: '180px' }}
            className="flex-1 resize-none border border-[#e0e0e0] rounded-[8px] px-3.5 py-2.5 text-[13px] text-[#333] placeholder-[#bbb] bg-white outline-none focus:border-[#aab] focus:ring-2 focus:ring-[#6b6ef9]/10 transition-all"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading || session.phase === 'final'}
            className="w-[34px] h-[34px] flex-shrink-0 rounded-lg flex items-center justify-center transition-all duration-200 disabled:opacity-30"
            style={{ backgroundColor: input.trim() && !loading && session.phase !== 'final' ? '#6b6ef9' : '#e5e5e5' }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 7h12M7 1l6 6-6 6" stroke={input.trim() && !loading && session.phase !== 'final' ? '#fff' : '#999'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <div className="text-center text-[11px] text-[#bbb] pb-2">
          ClarityAI can make mistakes. Consider verifying important information.
        </div>
      </main>
    </div>
  );
}

// ─── Branch Icon ──────────────────────────────────────────────────────────────

function BranchIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 16 16" fill="none" className="shrink-0 opacity-70">
      <path d="M4 2v8a2 2 0 002 2h6M10 9l3 3-3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

function MessageBubble({
  msg, msgIdx, totalMessages, session, loading, isLast,
  onMCQSelect, onRetry, onEditMessage, onBranchFrom,
}: {
  msg: Message;
  msgIdx: number;
  totalMessages: number;
  session: { phase: string; questionCount: number; totalQuestions: number; messages: Message[] };
  loading: boolean;
  isLast: boolean;
  onMCQSelect: (messageId: string, choice: string, choiceIndex: number) => void;
  onRetry: () => void;
  onEditMessage: (messageId: string, newContent: string) => void;
  onBranchFrom: (messageId: string) => void;
}) {
  const canEdit   = msg.role === 'user' && !loading && session.phase !== 'final';
  const canBranch = msg.role === 'assistant' && !msg.isError && !msg.isReport &&
                    msg.content.length > 0 && msgIdx < totalMessages - 1 && !loading;

  return (
    <div className={`flex gap-2.5 animate-fade-in-up ${msg.role === 'user' ? 'justify-end flex-row-reverse' : 'justify-start'} max-w-[92%] ${msg.role === 'user' ? 'ml-auto' : ''}`}>
      <div className={`w-[26px] h-[26px] rounded-full flex items-center justify-center text-[10.5px] font-medium shrink-0 mt-0.5 ${msg.role === 'assistant' ? 'bg-[#ededff] text-[#5254cc]' : 'bg-[#f0f0f0] text-[#666]'}`}>
        {msg.role === 'assistant' ? 'C' : 'Y'}
      </div>

      <div className="min-w-0 max-w-full">
        {msg.role === 'user' ? (
          <EditableUserMessage content={msg.content} onEdit={(c) => onEditMessage(msg.id, c)} disabled={!canEdit} />
        ) : (
          <div className="group/aimsg relative">
            {msg.isError ? (
              <div className="bg-red-50 border border-red-100 text-red-700 text-[13px] leading-relaxed px-3.5 py-2.5 rounded-[2px_10px_10px_10px] flex items-center gap-2.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                <span>{msg.content}</span>
                <button onClick={onRetry} className="ml-auto shrink-0 px-2.5 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded-md text-[11px] font-medium transition-colors">Retry</button>
              </div>
            ) : msg.isReport ? (
              <FinalReport content={msg.content} />
            ) : session.phase === 'analyzing' && isLast ? (
              <div className="bg-[#f7f7f8] border border-[#ececec] text-[#222] px-4 py-3.5 rounded-[2px_10px_10px_10px] flex items-center gap-3">
                <div className="w-2 h-2 bg-[#6b6ef9] rounded-full animate-pulse-soft" />
                <span className="text-[13px] font-medium text-[#666]">Analyzing your responses and generating your decision report…</span>
              </div>
            ) : (
              <>
                <div className="bg-[#f7f7f8] border border-[#ececec] text-[#222] text-[13px] leading-relaxed px-3.5 py-2.5 rounded-[2px_10px_10px_10px]">
                  <div className="whitespace-pre-wrap">{renderMarkdown(msg.content)}</div>
                </div>

                {canBranch && (
                  <button
                    onClick={() => onBranchFrom(msg.id)}
                    className="mt-1.5 opacity-0 group-hover/aimsg:opacity-100 transition-opacity duration-150 inline-flex items-center gap-1.5 text-[11px] text-[#888] hover:text-[#5254cc] border border-transparent hover:border-indigo-200 hover:bg-indigo-50 rounded-full px-2.5 py-1"
                  >
                    <BranchIcon /> Branch from here
                  </button>
                )}

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

                {session.phase === 'questioning' && isLast && msg.role === 'assistant' && !loading && (
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