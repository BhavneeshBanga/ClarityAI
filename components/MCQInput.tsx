'use client';

import { useState } from 'react';

interface MCQInputProps {
  choices: string[];
  allowCustom: boolean;
  onSelect: (choice: string, index: number) => void;
  disabled?: boolean;
  locked?: boolean;
  selectedIndex?: number;
}

export default function MCQInput({
  choices,
  allowCustom,
  onSelect,
  disabled = false,
  locked = false,
  selectedIndex,
}: MCQInputProps) {
  const [customMode, setCustomMode] = useState(false);
  const [customText, setCustomText] = useState('');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const isInteractive = !disabled && !locked;
  const showCustomInput = customMode && isInteractive;

  const handleChoiceClick = (choice: string, idx: number) => {
    if (!isInteractive) return;
    const isOther = allowCustom && idx === choices.length - 1;
    if (isOther) {
      setCustomMode(true);
      return;
    }
    onSelect(choice, idx);
  };

  const handleCustomSubmit = () => {
    if (!customText.trim()) return;
    onSelect(customText.trim(), choices.length - 1);
    setCustomMode(false);
    setCustomText('');
  };

  return (
    <div className="mt-3 space-y-2">
      {/* Choice buttons */}
      <div className="flex flex-wrap gap-2">
        {choices.map((choice, idx) => {
          const isOther = allowCustom && idx === choices.length - 1;
          const isSelected = selectedIndex === idx;

          let buttonClass =
            'inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-[12.5px] font-medium border transition-all duration-200 ';

          if (locked) {
            if (isSelected) {
              buttonClass += 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-200/50 cursor-default';
            } else {
              buttonClass += 'bg-gray-50 border-gray-150 text-gray-350 cursor-default opacity-40';
            }
          } else if (disabled) {
            buttonClass += 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed opacity-60';
          } else if (isOther) {
            buttonClass += customMode
              ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
              : 'bg-white border-dashed border-gray-300 text-gray-500 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/40 cursor-pointer';
          } else {
            buttonClass += hoveredIndex === idx
              ? 'bg-indigo-50 border-indigo-300 text-indigo-700 cursor-pointer shadow-sm'
              : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-200 hover:bg-indigo-50/30 hover:text-indigo-600 cursor-pointer';
          }

          return (
            <button
              key={idx}
              onClick={() => handleChoiceClick(choice, idx)}
              onMouseEnter={() => !locked && !disabled && setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
              disabled={locked || disabled}
              className={buttonClass}
              style={{ transition: 'all 0.18s ease' }}
            >
              {locked && isSelected && (
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none" className="shrink-0">
                  <polyline points="2 6 5 9 10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              {isOther && !locked && (
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none" className="shrink-0 opacity-60">
                  <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              )}
              {choice}
            </button>
          );
        })}
      </div>

      {/* Custom text input */}
      {showCustomInput && (
        <div className="flex gap-2 mt-2 animate-fade-in-up">
          <input
            autoFocus
            type="text"
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCustomSubmit();
              if (e.key === 'Escape') { setCustomMode(false); setCustomText(''); }
            }}
            placeholder="Describe your situation…"
            className="flex-1 border border-indigo-200 rounded-lg px-3 py-2 text-[13px] text-[#333] placeholder-[#bbb] bg-white outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
          />
          <button
            onClick={handleCustomSubmit}
            disabled={!customText.trim()}
            className="px-3.5 py-2 rounded-lg bg-indigo-600 text-white text-[12.5px] font-semibold disabled:opacity-40 hover:bg-indigo-700 transition-colors shrink-0"
          >
            Send
          </button>
          <button
            onClick={() => { setCustomMode(false); setCustomText(''); }}
            className="px-2.5 py-2 rounded-lg border border-gray-200 text-gray-500 text-[12px] hover:bg-gray-50 transition-colors shrink-0"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Locked indicator */}
      {locked && selectedIndex !== undefined && (
        <div className="flex items-center gap-1.5 mt-1">
          <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 opacity-60" />
          <span className="text-[11px] text-gray-400">Answer recorded</span>
        </div>
      )}
    </div>
  );
}