'use client';

import { useState } from 'react';

interface Props {
  choices: string[];
  allowCustom: boolean;
  onSelect: (value: string) => void;
  disabled: boolean;
}

/**
 * MCQInput renders clickable choice pills.
 * The last option (if allowCustom) becomes a text-input toggle instead.
 */
export default function MCQInput({ choices, allowCustom, onSelect, disabled }: Props) {
  const [showCustom, setShowCustom] = useState(false);
  const [customText, setCustomText] = useState('');

  const mainChoices = allowCustom ? choices.slice(0, -1) : choices;
  const customLabel = allowCustom ? choices[choices.length - 1] : null;

  const handleChoice = (choice: string) => {
    if (!disabled) onSelect(choice);
  };

  const handleCustomSubmit = () => {
    if (customText.trim() && !disabled) {
      onSelect(customText.trim());
      setCustomText('');
      setShowCustom(false);
    }
  };

  return (
    <div className="mt-2.5 flex flex-col gap-1.5">
      {/* Main choices */}
      {mainChoices.map((choice, i) => (
        <button
          key={i}
          onClick={() => handleChoice(choice)}
          disabled={disabled}
          className="
            text-left border border-[#ddd] rounded-xl px-4 py-2.5
            text-[13px] text-[#333] bg-white
            hover:border-[#6b6ef9] hover:text-[#5254cc] hover:bg-[#f8f8ff]
            active:scale-[0.98]
            transition-all duration-150
            disabled:opacity-40 disabled:cursor-not-allowed
            flex items-center gap-2.5 group
          "
        >
          <span className="
            w-5 h-5 rounded-full border border-[#ddd] flex items-center justify-center
            text-[10px] font-bold text-[#aaa]
            group-hover:border-[#6b6ef9] group-hover:text-[#6b6ef9]
            transition-colors shrink-0
          ">
            {String.fromCharCode(65 + i)}
          </span>
          {choice}
        </button>
      ))}

      {/* Custom input toggle */}
      {customLabel && !showCustom && (
        <button
          onClick={() => setShowCustom(true)}
          disabled={disabled}
          className="
            text-left border border-dashed border-[#ccc] rounded-xl px-4 py-2.5
            text-[13px] text-[#888] bg-white
            hover:border-[#6b6ef9] hover:text-[#5254cc] hover:bg-[#f8f8ff]
            transition-all duration-150
            disabled:opacity-40 disabled:cursor-not-allowed
            flex items-center gap-2.5
          "
        >
          <span className="
            w-5 h-5 rounded-full border border-dashed border-[#ccc] flex items-center justify-center
            text-[10px] font-bold
          ">
            ✎
          </span>
          {customLabel}
        </button>
      )}

      {/* Custom text input */}
      {showCustom && (
        <div className="flex gap-2 mt-1">
          <input
            autoFocus
            type="text"
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCustomSubmit();
              if (e.key === 'Escape') { setShowCustom(false); setCustomText(''); }
            }}
            placeholder="Type your answer..."
            className="
              flex-1 border border-[#6b6ef9] rounded-lg px-3 py-2
              text-[13px] text-[#333] outline-none
              focus:ring-2 focus:ring-[#6b6ef9]/20
            "
          />
          <button
            onClick={handleCustomSubmit}
            disabled={!customText.trim()}
            className="
              px-3 py-2 bg-[#6b6ef9] text-white rounded-lg text-[13px] font-medium
              hover:bg-[#5254cc] transition-colors
              disabled:opacity-40 disabled:cursor-not-allowed
            "
          >
            Send
          </button>
        </div>
      )}
    </div>
  );
}