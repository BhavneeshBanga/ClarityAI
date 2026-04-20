'use client';

import { useChat } from '@/hooks/useChat';
import { useState, useRef, useEffect } from 'react';
import FinalReport from '@/components/FinalReport';
import MCQInput from '@/components/MCQInput';

const PHASE_LABELS: Record<string, string> = {
  intro: 'Phase 1 of 4 — Introduction',
  questions: 'Phase 2 of 4 — Clarity Questions',
  analysis: 'Phase 3 of 4 — Analysis',
  final: 'Phase 4 of 4 — Final Report',
};

const PHASE_PROGRESS: Record<string, string> = {
  intro: '10%',
  questions: '45%',
  analysis: '75%',
  final: '100%',
};

export default function Page() {
  const { session, loading, sendMessage, newSession } = useChat();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [session.messages]);

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

  const phaseLabel = PHASE_LABELS[session.phase] ?? `Phase: ${session.phase}`;
  const phaseProgress = PHASE_PROGRESS[session.phase] ?? '10%';

  return (
    <div className="flex h-screen w-full bg-[#f5f5f5] font-sans">

      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside className="hidden md:flex w-[220px] flex-shrink-0 flex-col border-r border-[#e5e5e5] bg-[#fafafa]">

        {/* Logo */}
        <div className="px-4 pt-5 pb-5">
          <span className="text-[20px] font-bold tracking-tight text-[#111]">
            Clarity<span className="text-[#6b6ef9]">AI</span>
          </span>
        </div>

        {/* New session */}
        <div className="px-3 mb-3 flex flex-col gap-2">
          <button
            onClick={() => newSession('standard')}
            className="w-full flex items-center gap-2 rounded-lg border border-[#e0e0e0] bg-white px-3 py-2 text-[12.5px] text-[#555] hover:bg-[#f5f5f5] transition-colors"
          >
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            New session
          </button>
          
          <button
            onClick={() => newSession('mcq')}
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
          {/* Active item */}
          <div className="rounded-md bg-[#ededff] px-2.5 py-1.5 text-[12px] text-[#5254cc] truncate cursor-pointer">
            {session.title}
          </div>
          {/* Past sessions – placeholders; replace with real data if available */}
          {['Career switch to product...', 'Co-founder equity split', 'Relocate to Bangalore?'].map(
            (t) => (
              <div
                key={t}
                className="rounded-md px-2.5 py-1.5 text-[12px] text-[#666] truncate cursor-pointer hover:bg-[#f0f0f0] transition-colors"
              >
                {t}
              </div>
            )
          )}
        </div>

        {/* Phase info footer */}
        <div className="p-3">
          <div className="rounded-lg border border-[#e5e5e5] bg-white px-3 py-2.5 text-[11.5px] text-[#999]">
            <p className="font-medium text-[#555] mb-0.5">Current phase</p>
            {phaseLabel}
          </div>
        </div>
      </aside>

      {/* ── Main panel ──────────────────────────────────────── */}
      <main className="flex flex-1 flex-col min-w-0 bg-white">

        {/* Top bar */}
        <header className="flex items-center justify-between px-5 py-3 border-b border-[#f0f0f0]">
          <span className="text-[13.5px] font-medium text-[#111]">{session.title}</span>
          <span className="hidden sm:inline-flex text-[11px] bg-[#ededff] text-[#5254cc] rounded-full px-3 py-1 whitespace-nowrap">
            {phaseLabel}
          </span>
        </header>

        {/* Progress bar */}
        <div className="h-[2px] bg-[#f0f0f0]">
          <div
            className="h-full bg-[#6b6ef9] rounded-full transition-all duration-500"
            style={{ width: phaseProgress }}
          />
        </div>

        {/* Chat area */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          {session.messages.map((msg) => (
            <div key={msg.id} className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end flex-row-reverse' : 'justify-start'} max-w-[92%] ${msg.role === 'user' ? 'ml-auto' : ''}`}>

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
                    {msg.isReport ? (
                      <FinalReport content={msg.content} />
                    ) : msg.content.includes('"type": "final_report"') || msg.content.includes('"type":"final_report"') ? (
                      <div className="bg-[#f7f7f8] border border-[#ececec] text-[#222] px-4 py-3.5 rounded-[2px_10px_10px_10px] flex items-center gap-3">
                        <div className="w-2 h-2 bg-[#6b6ef9] rounded-full animate-ping" />
                        <span className="text-[13px] font-medium text-[#666]">Generating Final Assessment...</span>
                      </div>
                    ) : (
                      <>
                        <div
                          className="bg-[#f7f7f8] border border-[#ececec] text-[#222] text-[13px] leading-relaxed px-3.5 py-2.5 rounded-[2px_10px_10px_10px]"
                          dangerouslySetInnerHTML={{
                            __html: msg.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'),
                          }}
                        />

                        {/* Choice buttons */}
                        {msg.choices && msg.choices.length > 0 && (
                          <MCQInput 
                            choices={msg.choices}
                            allowCustom={msg.allowCustom ?? false}
                            onSelect={sendMessage}
                            disabled={loading}
                          />
                        )}

                        {/* Question counter tag */}
                        {session.phase === 'questioning' && msg === session.messages[session.messages.length - 1] && (
                          <div className="inline-flex items-center gap-1.5 mt-2 text-[11px] bg-[#f0faf5] text-[#1a7a52] rounded-full px-2.5 py-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#1a7a52]" />
                            Question {session.questionCount} (Max {session.totalQuestions})
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {loading && (
            <div className="flex gap-2.5 max-w-[92%]">
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
                ? 'Session completed.'
                : 'Type your answer or ask anything...'
            }
            rows={1}
            style={{ minHeight: '38px', maxHeight: '180px' }}
            className="flex-1 resize-none border border-[#e0e0e0] rounded-[8px] px-3.5 py-2.5 text-[13px] text-[#333] placeholder-[#bbb] bg-white outline-none focus:border-[#aab] focus:ring-2 focus:ring-[#6b6ef9]/10 transition-all"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading || session.phase === 'final'}
            className="w-[34px] h-[34px] flex-shrink-0 rounded-lg flex items-center justify-center transition-colors disabled:opacity-30"
            style={{
              backgroundColor:
                input.trim() && !loading && session.phase !== 'final' ? '#6b6ef9' : '#e5e5e5',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M1 7h12M7 1l6 6-6 6"
                stroke={input.trim() && !loading && session.phase !== 'final' ? '#fff' : '#999'}
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