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
          <span className="text-[#5b5cf6] shrink-0 mt-[1px]">•</span>
          <span>{parts}</span>
        </div>
      );
    } else if (line.match(/^[\s]*\d+\.\s+/)) {
      const numMatch = line.match(/^[\s]*(\d+)\.\s+(.*)/);
      if (numMatch) {
        elements.pop();
        elements.push(
          <div key={`num-${lineIdx}`} className="flex gap-2 mt-1">
            <span className="text-[#5b5cf6] font-medium shrink-0 text-[12px] mt-[2px] w-4 text-right">{numMatch[1]}.</span>
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
    retryLastMessage, newSession, loadSessionById, deleteSession, renameSession,
    rateLimitHit,
  } = useChat();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const [showRateLimitBanner, setShowRateLimitBanner] = useState(true);
  const [input, setInput] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null);
  const [audioVisuals, setAudioVisuals] = useState<number[]>(Array(30).fill(10));
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const requestRef = useRef<number>(0);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [session.messages]);
  useEffect(() => {
    if (!loading && textareaRef.current && session.phase !== 'final') textareaRef.current.focus();
  }, [loading, session.phase]);

  const updateVisuals = () => {
    if (!analyserRef.current) return;
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    const step = Math.floor(dataArray.length / 80);
    const visuals = [];
    for (let i = 0; i < 80; i++) {
      visuals.push(Math.max(4, (dataArray[i * step] / 255) * 30));
    }
    setAudioVisuals(visuals);
    requestRef.current = requestAnimationFrame(updateVisuals);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      sourceRef.current = source;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      updateVisuals();
    } catch (err) {
      console.error('Microphone access denied:', err);
      setTranscriptionError('Could not access microphone. Please check your browser permissions.');
    }
  };

  const stopRecording = (submit: boolean) => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = async () => {
        mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
        if (audioContextRef.current) audioContextRef.current.close();

        if (submit) {
          setIsTranscribing(true);
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const formData = new FormData();
          formData.append('file', audioBlob, 'recording.webm');

          try {
            const res = await fetch('/api/transcribe', {
              method: 'POST',
              body: formData
            });
            const data = await res.json();
            if (data.transcript) {
              setInput(prev => prev ? prev + ' ' + data.transcript : data.transcript);
              setTimeout(() => {
                if (textareaRef.current) {
                  textareaRef.current.style.height = 'auto';
                  textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 180) + 'px';
                  textareaRef.current.focus();
                }
              }, 0);
            }
            else if (data.error) {
              setTranscriptionError(data.error);
            }
          }
          catch (e) {
            console.error(e);
            setTranscriptionError('Failed to transcribe audio.');
          } finally {
            setIsTranscribing(false);
          }
        }
      };
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        if (isRecording) {
          stopRecording(true);
        } else if (!isTranscribing && !loading && session.phase !== 'final' && !rateLimitHit) {
          startRecording();
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  });

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

  const handleRename = (e: React.MouseEvent, id: string, currentTitle: string) => {
    e.stopPropagation();
    setEditingId(id);
    setEditValue(currentTitle);
  };

  const handleSaveRename = async (id: string) => {
    if (editValue.trim() && editValue !== history.find(h => h.id === id)?.title) {
      await renameSession(id, editValue.trim());
    }
    setEditingId(null);
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') handleSaveRename(id);
    if (e.key === 'Escape') setEditingId(null);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeletingId(id);
    await deleteSession(id);
    setDeletingId(null);
  };

  const getProgress = (): number => {
    switch (session.phase) {
      case 'welcome': return 5;
      case 'questioning': return Math.min(80, 10 + (session.questionCount / session.totalQuestions) * 70);
      case 'analyzing': return 88;
      case 'final': return 100;
      default: return 5;
    }
  };

  const phaseLabel = PHASE_LABELS[session.phase] ?? session.phase;
  const phaseIcon = PHASE_ICONS[session.phase] ?? '💬';
  const progress = getProgress();
  const isBranch = !!session.branchedFrom;
  const user = authSession?.user;

  const canSend = input.trim() && !loading && session.phase !== 'final' && !rateLimitHit;

  return (
    <div className="flex h-screen w-full font-sans" style={{ background: '#f5f5f5' }}>
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 md:hidden" style={{ background: 'rgba(10,10,15,0.25)' }} onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className={`
        fixed md:relative z-40 md:z-auto w-[260px] md:w-[220px]
        flex-shrink-0 flex-col h-full
        transition-transform duration-300 ease-out
        ${sidebarOpen ? 'translate-x-0 flex' : '-translate-x-full md:translate-x-0 md:flex hidden md:flex'}
      `} style={{ background: '#f5f5f5', borderRight: '1px solid rgba(10,10,15,0.08)' }}>

        {/* Logo */}
        <div className="px-4 pt-5 pb-4 flex items-center justify-between">
          <span className="text-[20px] font-bold tracking-tight" style={{ color: '#0a0a0f' }}>
            Clarity<span style={{ color: '#5b5cf6' }}>AI</span>
          </span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden w-7 h-7 flex items-center justify-center transition-colors"
            style={{ color: '#aaa' }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          </button>
        </div>

        {/* New session buttons */}
        <div className="px-3 mb-3 flex flex-col gap-2">
          <button
            onClick={() => { newSession('standard'); setSidebarOpen(false); }}
            className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-[12.5px] transition-colors"
            style={{ border: '1px solid rgba(10,10,15,0.1)', background: '#ffffff', color: '#555' }}
          >
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
            New session
          </button>
          <button
            onClick={() => { newSession('mcq'); setSidebarOpen(false); }}
            className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-[12.5px] font-medium transition-colors"
            style={{ border: '1px solid #c4c4fd', background: '#eeeeff', color: '#4a4ab8' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
            New MCQ session
          </button>
        </div>

        {/* History label */}
        <div className="px-4 mb-1.5 flex items-center justify-between" style={{ fontSize: 10.5, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#aaa' }}>
          <span>Recent</span>
          {!dbReady && <span style={{ fontSize: 10, color: '#ccc' }} className="animate-pulse">syncing…</span>}
        </div>

        {/* History list */}
        <div className="flex-1 overflow-y-auto px-3 space-y-0.5">
          {/* Active session */}
          <div
            className="group/hist rounded-md px-2.5 py-1.5 text-[12px] font-medium flex items-center gap-1.5"
            style={{ background: '#eeeeff', color: '#4a4ab8' }}
          >
            {isBranch && <BranchIcon />}
            {editingId === session.id ? (
              <input
                autoFocus
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={() => handleSaveRename(session.id)}
                onKeyDown={(e) => handleRenameKeyDown(e, session.id)}
                className="flex-1 bg-white border border-[#c4c4fd] rounded px-1.5 py-0.5 text-[12px] outline-none"
                style={{ color: '#333' }}
              />
            ) : (
              <>
                <span className="truncate flex-1">{session.title}</span>
                <button
                  onClick={(e) => handleRename(e, session.id, session.title)}
                  className="opacity-0 group-hover/hist:opacity-100 transition-opacity w-5 h-5 flex items-center justify-center rounded shrink-0"
                  style={{ color: '#4a4ab8' }}
                  title="Rename session"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                </button>
              </>
            )}
          </div>

          {/* Past sessions */}
          {history.filter((h) => h.id !== session.id).map((h) => (
            <div
              key={h.id}
              onClick={() => { loadSessionById(h.id); setSidebarOpen(false); }}
              className="group/hist rounded-md px-2.5 py-1.5 text-[12px] cursor-pointer flex items-center gap-1.5 transition-colors"
              style={{ color: '#666' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(10,10,15,0.05)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {h.branchedFrom && <BranchIcon />}
              {h.mode === 'mcq' && (
                <span className="text-[9px] px-1 py-0.5 rounded font-bold shrink-0" style={{ background: '#eeeeff', color: '#5b5cf6' }}>MCQ</span>
              )}
              {editingId === h.id ? (
                <input
                  autoFocus
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={() => handleSaveRename(h.id)}
                  onKeyDown={(e) => handleRenameKeyDown(e, h.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 bg-white border border-[#c4c4fd] rounded px-1.5 py-0.5 text-[12px] outline-none shadow-[0_0_0_2px_rgba(91,92,246,0.1)]"
                  style={{ color: '#333' }}
                />
              ) : (
                <>
                  <span className="truncate flex-1">{h.title}</span>
                  <button
                    onClick={(e) => handleRename(e, h.id, h.title)}
                    className="opacity-0 group-hover/hist:opacity-100 transition-opacity w-5 h-5 flex items-center justify-center rounded shrink-0"
                    style={{ color: '#aaa' }}
                    title="Rename session"
                    onMouseEnter={e => (e.currentTarget.style.color = '#5b5cf6')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#aaa')}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                  </button>
                </>
              )}
              <button
                onClick={(e) => handleDelete(e, h.id)}
                disabled={deletingId === h.id}
                className="opacity-0 group-hover/hist:opacity-100 transition-opacity w-5 h-5 flex items-center justify-center rounded shrink-0"
                style={{ color: '#ccc' }}
                title="Delete session"
                onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                onMouseLeave={e => (e.currentTarget.style.color = '#ccc')}
              >
                {deletingId === h.id
                  ? <span className="text-[9px] animate-spin">◌</span>
                  : <svg width="11" height="11" viewBox="0 0 16 16" fill="none"><path d="M3 4h10M6 4V2h4v2M5 4l.5 9h5L11 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                }
              </button>
            </div>
          ))}

          {history.filter((h) => h.id !== session.id).length === 0 && dbReady && (
            <div className="px-2.5 py-3 italic" style={{ fontSize: 11, color: '#ccc' }}>No past sessions yet</div>
          )}
        </div>

        {/* User profile footer */}
        <div className="p-3" style={{ borderTop: '1px solid rgba(10,10,15,0.07)' }}>
          <div className="flex items-center gap-2.5 rounded-lg px-2.5 py-2">
            {user?.image
              ? <Image src={user.image} alt={user.name ?? ''} width={28} height={28} className="rounded-full shrink-0" />
              : <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0" style={{ background: '#eeeeff', color: '#4a4ab8' }}>{user?.name?.[0] ?? '?'}</div>
            }
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-medium truncate" style={{ color: '#333' }}>{user?.name ?? 'User'}</div>
              <div className="text-[10.5px] truncate" style={{ color: '#aaa' }}>{user?.email}</div>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              title="Sign out"
              className="w-6 h-6 flex items-center justify-center transition-colors shrink-0"
              style={{ color: '#bbb' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main panel ──────────────────────────────────────────────────── */}
      <main className="flex flex-1 flex-col min-w-0" style={{ background: '#ffffff' }}>

        {/* Header */}
        <header className="flex items-center justify-between px-4 sm:px-5 py-3" style={{ borderBottom: '1px solid rgba(10,10,15,0.07)' }}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
              style={{ color: '#666' }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 5h12M3 9h12M3 13h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
            </button>
            <span className="md:hidden text-[16px] font-bold tracking-tight" style={{ color: '#0a0a0f' }}>
              Clarity<span style={{ color: '#5b5cf6' }}>AI</span>
            </span>
            <div className="hidden md:flex items-center gap-2">
              {isBranch && (
                <span className="inline-flex items-center gap-1 text-[10.5px] rounded-full px-2 py-0.5" style={{ color: '#5b5cf6', background: '#eeeeff', border: '1px solid #c4c4fd' }}>
                  <BranchIcon /> branch
                </span>
              )}
              <span className="text-[13.5px] font-medium" style={{ color: '#0a0a0f' }}>{session.title}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] rounded-full px-3 py-1 whitespace-nowrap" style={{ background: '#eeeeff', color: '#4a4ab8' }}>
              <span>{phaseIcon}</span>{phaseLabel}
            </span>
            {user?.image
              ? <Image src={user.image} alt="" width={26} height={26} className="rounded-full md:hidden" />
              : <div className="w-[26px] h-[26px] rounded-full flex items-center justify-center text-[10px] font-bold md:hidden" style={{ background: '#eeeeff', color: '#4a4ab8' }}>{user?.name?.[0] ?? '?'}</div>
            }
          </div>
        </header>

        {/* Progress bar */}
        <div className="h-[2px]" style={{ background: 'rgba(10,10,15,0.06)' }}>
          <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${progress}%`, background: '#5b5cf6' }} />
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
              <div className="w-[26px] h-[26px] rounded-full flex items-center justify-center text-[10.5px] font-medium shrink-0 mt-0.5" style={{ background: '#eeeeff', color: '#4a4ab8' }}>C</div>
              <div className="flex items-center gap-1.5 px-4 py-3 rounded-[2px_10px_10px_10px]" style={{ background: 'rgba(10,10,15,0.04)', border: '1px solid rgba(10,10,15,0.07)' }}>
                {[0, 150, 300].map((delay) => (
                  <div key={delay} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: '#bbb', animationDelay: `${delay}ms` }} />
                ))}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="px-4 py-3 flex items-end gap-2.5" style={{ borderTop: '1px solid rgba(10,10,15,0.07)' }}>
          {isRecording ? (
            <div
              className="flex-1 flex items-center gap-2.5"
              style={{
                minHeight: 46,
                border: '1.5px solid #5b5cf6',
                borderRadius: 10,
                padding: '8px 12px',
                background: '#f8f8ff',
              }}
            >
              {/* REC dot */}
              <span
                style={{
                  width: 8, height: 8,
                  borderRadius: '50%',
                  background: '#ef4444',
                  flexShrink: 0,
                  animation: 'pulse-rec-dot 1.2s ease-in-out infinite',
                  display: 'inline-block',
                }}
              />

              {/* REC label */}
              <span style={{ fontSize: 12, color: '#5b5cf6', fontWeight: 500, flexShrink: 0, letterSpacing: '0.01em' }}>
                REC
              </span>

              {/* Waveform bars */}
              <div className="flex-1 flex items-center gap-[2px] h-7 overflow-hidden">
                {audioVisuals.map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-full transition-all duration-75"
                    style={{
                      background: '#5b5cf6',
                      height: `${Math.max(3, h * 0.9)}px`,
                      minWidth: 2,
                      maxWidth: 6,
                      opacity: 0.85,
                    }}
                  />
                ))}
              </div>

              {/* Timer */}
              <span style={{ fontSize: 12, color: '#888', fontVariantNumeric: 'tabular-nums', flexShrink: 0, minWidth: 32, textAlign: 'right' }}>
                {/* optional: add a timer state if needed */}
              </span>

              {/* Divider */}
              <div style={{ width: 1, height: 22, background: 'rgba(91,92,246,0.18)', flexShrink: 0 }} />

              {/* Discard button */}
              <button
                onClick={() => stopRecording(false)}
                title="Discard"
                style={{
                  width: 30, height: 30,
                  borderRadius: '50%',
                  background: '#fee2e2',
                  color: '#dc2626',
                  border: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', flexShrink: 0,
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>

              {/* Submit button */}
              <button
                onClick={() => stopRecording(true)}
                title="Submit (Ctrl+Shift+D)"
                style={{
                  width: 30, height: 30,
                  borderRadius: '50%',
                  background: '#22c55e',
                  color: '#fff',
                  border: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', flexShrink: 0,
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </button>
            </div>
          ) : (
            // ... baaki wala textarea block same rahega
            <>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                disabled={loading || session.phase === 'final' || rateLimitHit || isTranscribing}
                placeholder={
                  rateLimitHit ? 'Rate limit reached. Please wait 48 hours...' :
                    session.phase === 'final' ? 'Session complete — start a new one to continue.' :
                      session.phase === 'welcome' ? 'Describe your big decision or challenge...' :
                        isTranscribing ? 'Transcribing audio...' :
                          'Type your answer...'
                }
                rows={1}
                style={{
                  flex: 1, resize: 'none', minHeight: 38, maxHeight: 180,
                  border: '1px solid rgba(10,10,15,0.12)',
                  borderRadius: 8, padding: '10px 14px',
                  fontSize: 13, color: '#0a0a0f',
                  background: '#ffffff',
                  outline: 'none',
                  fontFamily: 'inherit',
                  transition: 'border-color 0.15s',
                  opacity: isTranscribing ? 0.7 : 1,
                }}
                onFocus={e => (e.target.style.borderColor = '#5b5cf6')}
                onBlur={e => (e.target.style.borderColor = 'rgba(10,10,15,0.12)')}
              />
              <button
                onClick={startRecording}
                disabled={loading || session.phase === 'final' || rateLimitHit || isTranscribing}
                title="Dictate ctrl + shift + D"
                className="w-[34px] h-[34px] flex-shrink-0 rounded-lg flex items-center justify-center transition-all duration-200 hover:bg-gray-100 group relative"
                style={{ border: '1px solid rgba(10,10,15,0.12)' }}
              >
                {isTranscribing ? (
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-[#5b5cf6] border-t-transparent animate-spin" />
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="22" />
                  </svg>
                )}
              </button>
            </>
          )}

          {!isRecording && (
            <button
              onClick={handleSend}
              disabled={!canSend}
              className="w-[34px] h-[34px] flex-shrink-0 rounded-lg flex items-center justify-center transition-all duration-200"
              style={{ background: canSend ? '#5b5cf6' : 'rgba(10,10,15,0.08)' }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1 7h12M7 1l6 6-6 6" stroke={canSend ? '#fff' : 'rgba(10,10,15,0.3)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>

        {/* Rate limit banner */}
        {rateLimitHit && showRateLimitBanner && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none">
            <div className="shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-2xl p-6 w-full max-w-sm flex flex-col items-center text-center animate-fade-in-up relative pointer-events-auto" style={{ background: '#fff8f8', border: '1px solid rgba(220,38,38,0.15)' }}>
              <button
                onClick={() => setShowRateLimitBanner(false)}
                className="absolute top-3.5 right-3.5 rounded-full p-1.5 transition-colors"
                style={{ color: '#dc2626', background: '#fee2e2' }}
                title="Close"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
              <div className="mb-3.5 p-2.5 rounded-full" style={{ background: '#fee2e2', color: '#dc2626' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <h3 className="text-[17px] font-bold mb-2" style={{ color: '#7f1d1d' }}>Limit Reached</h3>
              <p className="text-[13.5px] leading-relaxed" style={{ color: '#b91c1c' }}>
                You have used your 2 free complete chats. Please wait <strong>48 hours</strong> from your first chat to continue.
              </p>
            </div>
          </div>
        )}

        {/* Transcription Error Modal */}
        {transcriptionError && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none">
            <div className="shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-2xl p-6 w-full max-w-sm flex flex-col items-center text-center animate-fade-in-up relative pointer-events-auto" style={{ background: '#fff8f8', border: '1px solid rgba(220,38,38,0.15)' }}>
              <button
                onClick={() => setTranscriptionError(null)}
                className="absolute top-3.5 right-3.5 rounded-full p-1.5 transition-colors"
                style={{ color: '#dc2626', background: '#fee2e2' }}
                title="Close"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
              <div className="mb-3.5 p-2.5 rounded-full" style={{ background: '#fee2e2', color: '#dc2626' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <h3 className="text-[17px] font-bold mb-2" style={{ color: '#7f1d1d' }}>Transcription Error</h3>
              <p className="text-[13.5px] leading-relaxed" style={{ color: '#b91c1c' }}>
                {transcriptionError}
              </p>
            </div>
          </div>
        )}

        <div className="text-center pb-2" style={{ fontSize: 11, color: 'rgba(10,10,15,0.25)' }}>
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
  const canEdit = msg.role === 'user' && !loading && session.phase !== 'final';
  const canBranch = msg.role === 'assistant' && !msg.isError && !msg.isReport &&
    msg.content.length > 0 && msgIdx < totalMessages - 1 && !loading;

  return (
    <div className={`flex gap-2.5 animate-fade-in-up ${msg.role === 'user' ? 'justify-end flex-row-reverse' : 'justify-start'} max-w-[92%] ${msg.role === 'user' ? 'ml-auto' : ''}`}>
      {/* Avatar */}
      <div
        className="w-[26px] h-[26px] rounded-full flex items-center justify-center text-[10.5px] font-medium shrink-0 mt-0.5"
        style={msg.role === 'assistant'
          ? { background: '#eeeeff', color: '#4a4ab8' }
          : { background: 'rgba(10,10,15,0.07)', color: '#555' }}
      >
        {msg.role === 'assistant' ? 'C' : 'Y'}
      </div>

      <div className="min-w-0 max-w-full">
        {msg.role === 'user' ? (
          <EditableUserMessage content={msg.content} onEdit={(c) => onEditMessage(msg.id, c)} disabled={!canEdit} />
        ) : (
          <div className="group/aimsg relative">
            {msg.isError ? (
              <div className="text-[13px] leading-relaxed px-3.5 py-2.5 rounded-[2px_10px_10px_10px] flex items-center gap-2.5" style={{ background: '#fff5f5', border: '1px solid rgba(220,38,38,0.15)', color: '#dc2626' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                <span>{msg.content}</span>
                <button
                  onClick={onRetry}
                  className="ml-auto shrink-0 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors"
                  style={{ background: '#fee2e2', color: '#dc2626' }}
                >Retry</button>
              </div>
            ) : msg.isReport ? (
              <FinalReport content={msg.content} />
            ) : session.phase === 'analyzing' && isLast ? (
              <div className="flex items-center gap-3 px-4 py-3.5 rounded-[2px_10px_10px_10px]" style={{ background: 'rgba(10,10,15,0.04)', border: '1px solid rgba(10,10,15,0.07)' }}>
                <div className="w-2 h-2 rounded-full animate-pulse-soft" style={{ background: '#5b5cf6' }} />
                <span className="text-[13px] font-medium" style={{ color: '#666' }}>Analyzing your responses and generating your decision report…</span>
              </div>
            ) : (
              <>
                <div className="text-[13px] leading-relaxed px-3.5 py-2.5 rounded-[2px_10px_10px_10px]" style={{ background: 'rgba(10,10,15,0.04)', border: '1px solid rgba(10,10,15,0.07)', color: '#0a0a0f' }}>
                  <div className="whitespace-pre-wrap">{renderMarkdown(msg.content)}</div>
                </div>

                {canBranch && (
                  <button
                    onClick={() => onBranchFrom(msg.id)}
                    className="mt-1.5 opacity-0 group-hover/aimsg:opacity-100 transition-opacity duration-150 inline-flex items-center gap-1.5 text-[11px] rounded-full px-2.5 py-1"
                    style={{ color: '#888', border: '1px solid transparent' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#5b5cf6'; (e.currentTarget as HTMLElement).style.background = '#eeeeff'; (e.currentTarget as HTMLElement).style.borderColor = '#c4c4fd'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#888'; (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.borderColor = 'transparent'; }}
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
                  <div className="inline-flex items-center gap-1.5 mt-2 text-[11px] rounded-full px-2.5 py-1" style={{ background: '#f0faf5', color: '#1a7a52' }}>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#1a7a52' }} />
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