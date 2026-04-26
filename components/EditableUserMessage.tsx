'use client';

import { useState, useRef, useEffect } from 'react';

interface EditableUserMessageProps {
  content: string;
  onEdit: (newContent: string) => void;
  disabled?: boolean;
}

export default function EditableUserMessage({
  content,
  onEdit,
  disabled = false,
}: EditableUserMessageProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
      // Place cursor at end
      const len = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(len, len);
    }
  }, [editing]);

  const handleSubmit = () => {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === content) {
      setEditing(false);
      setDraft(content);
      return;
    }
    onEdit(trimmed);
    setEditing(false);
  };

  const handleCancel = () => {
    setEditing(false);
    setDraft(content);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') handleCancel();
  };

  if (editing) {
    return (
      <div className="flex flex-col gap-2 w-full">
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
          }}
          onKeyDown={handleKeyDown}
          rows={1}
          className="w-full resize-none border border-indigo-300 rounded-xl px-3.5 py-2.5 text-[13px] text-[#333] bg-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all shadow-sm"
          style={{ minHeight: '38px', maxHeight: '200px' }}
        />
        <div className="flex items-center justify-end gap-2">
          <span className="text-[10.5px] text-[#aaa] mr-1">
            ↵ send · Esc cancel
          </span>
          <button
            onClick={handleCancel}
            className="px-3 py-1.5 rounded-lg border border-[#e0e0e0] text-[12px] text-[#666] hover:bg-[#f5f5f5] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!draft.trim() || draft.trim() === content}
            className="px-3 py-1.5 rounded-lg bg-[#6b6ef9] text-white text-[12px] font-medium disabled:opacity-40 hover:bg-[#5254cc] transition-colors"
          >
            Save &amp; Resend
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group/usermsg relative">
      <div className="bg-[#6b6ef9] text-white text-[13px] leading-relaxed px-3.5 py-2 rounded-[10px_2px_10px_10px]">
        <div className="whitespace-pre-wrap">{content}</div>
      </div>

      {/* Edit button — appears on hover */}
      {!disabled && (
        <button
          onClick={() => { setDraft(content); setEditing(true); }}
          title="Edit message"
          className="
            absolute -left-8 top-1/2 -translate-y-1/2
            opacity-0 group-hover/usermsg:opacity-100
            transition-opacity duration-150
            w-6 h-6 flex items-center justify-center
            rounded-md bg-white border border-[#e5e5e5]
            text-[#888] hover:text-[#5254cc] hover:border-indigo-300 hover:bg-indigo-50
            shadow-sm
          "
        >
          <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
            <path
              d="M9.5 1.5l3 3L4 13H1v-3L9.5 1.5z"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}
    </div>
  );
}