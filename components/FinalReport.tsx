'use client';

import { FinalReport as FinalReportType } from '@/lib/types';
import { Outfit } from 'next/font/google';

const outfit = Outfit({ subsets: ['latin'], display: 'swap' });

interface Props {
  content: string;
}

function parseReport(content: string): (FinalReportType & { next_steps?: string[] }) | null {
  try {
    const stripped = content.replace(/```(?:json)?\s*([\s\S]*?)\s*```/, '$1').trim();
    const match = stripped.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

export default function FinalReport({ content }: Props) {
  const report = parseReport(content);

  if (!report) {
    return (
      <div className={`p-5 bg-red-50/50 border border-red-100 rounded-xl space-y-3 ${outfit.className}`}>
        <h3 className="text-red-800 font-semibold text-sm">Formatting Error</h3>
        <p className="text-sm text-red-600/80">
          The AI generated an assessment, but it wasn't formatted correctly. Raw response:
        </p>
        <div className="bg-white border border-red-100 rounded-lg p-4 max-h-[400px] overflow-auto">
          <pre className="text-[13px] text-[#222] whitespace-pre-wrap leading-relaxed">
            {content}
          </pre>
        </div>
      </div>
    );
  }

  const score = Math.min(10, Math.max(1, report.score || 5));

  return (
    <div className={`relative mt-4 border border-gray-200/60 rounded-[28px] p-6 sm:p-10 space-y-10 bg-white/70 backdrop-blur-xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] ${outfit.className} text-[#111]`}>
      
      {/* Subtle shine effect */}
      <div className="absolute inset-0 rounded-[28px] bg-gradient-to-br from-white/80 to-transparent pointer-events-none" />

      {/* Header & Score */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 relative z-10 border-b border-gray-100 pb-8">
        <div>
           <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50/80 border border-indigo-100/50 text-indigo-600 text-[11px] font-bold uppercase tracking-widest mb-4">
             <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
             Assessment Complete
           </div>
           <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 leading-tight">
             Decision Report
           </h2>
        </div>

        <div className="flex flex-col items-start sm:items-end">
          <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2">Readiness Score</span>
          <div className="flex items-center gap-4">
            <span className="text-4xl sm:text-5xl font-black text-gray-900 tracking-tighter">{score}<span className="text-2xl sm:text-3xl text-gray-300 font-medium tracking-normal">/10</span></span>
            <div className="flex flex-col gap-[3px]">
              {[...Array(10)].map((_, i) => (
                <div key={i} className={`h-[3px] w-6 sm:w-8 rounded-full transition-all duration-500 delay-100 ${10-i <= score ? 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.4)]' : 'bg-gray-100'}`} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="relative z-10 bg-gradient-to-r from-gray-50 to-white border border-gray-100 rounded-2xl p-6 sm:p-7 shadow-sm">
        <h3 className="text-[12px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Situation Overview</h3>
        <p className="text-[17px] sm:text-[19px] leading-relaxed text-gray-700 font-medium">
          {report.summary}
        </p>
      </div>

      {/* Grid: Pros & Cons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 relative z-10 w-full">
        {/* Pros */}
        <div className="bg-emerald-50/40 border border-emerald-100/60 rounded-2xl p-6 sm:p-7 shadow-sm">
          <h3 className="text-[13px] font-black text-emerald-700 uppercase tracking-widest mb-5 flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
            Key Advantages
          </h3>
          <ul className="space-y-4">
            {report.pros?.map((p, i) => (
              <li key={i} className="flex gap-3.5 text-[15px] font-medium text-gray-700 leading-snug">
                <span className="text-emerald-500 mt-[3px] shrink-0">✦</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Cons */}
        <div className="bg-rose-50/40 border border-rose-100/60 rounded-2xl p-6 sm:p-7 shadow-sm">
          <h3 className="text-[13px] font-black text-rose-700 uppercase tracking-widest mb-5 flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 shadow-sm">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </div>
            Major Drawbacks
          </h3>
          <ul className="space-y-4">
            {report.cons?.map((c, i) => (
              <li key={i} className="flex gap-3.5 text-[15px] font-medium text-gray-700 leading-snug">
                <span className="text-rose-400 mt-[3px] shrink-0">❖</span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Risks */}
      {report.risks && report.risks.length > 0 && (
        <div className="bg-amber-50/40 border border-amber-100/60 rounded-2xl p-6 sm:p-7 relative z-10 shadow-sm">
          <h3 className="text-[13px] font-black text-amber-700 uppercase tracking-widest mb-5 flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 shadow-sm">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
            </div>
            Critical Risks to Mitigate
          </h3>
          <ul className="space-y-4">
            {report.risks.map((r, i) => (
              <li key={i} className="flex gap-3.5 text-[15px] font-medium text-gray-700 leading-snug">
                <span className="text-amber-500 mt-[2px] shrink-0 text-lg">⚠️</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Verdict */}
      <div className="relative z-10 rounded-[24px] bg-[#0f111a] text-white p-8 sm:p-10 shadow-2xl overflow-hidden mt-8 border border-gray-800">
        <div className="absolute top-0 right-0 -mr-24 -mt-24 w-80 h-80 bg-indigo-600 rounded-full blur-[120px] opacity-40 pointer-events-none" />
        <h3 className="text-[12px] font-black uppercase tracking-[0.25em] text-indigo-300 mb-5 flex items-center gap-4">
          <span className="w-10 h-[1px] bg-indigo-400" /> Executive Verdict
        </h3>
        <p className="text-[20px] sm:text-[23px] font-semibold leading-relaxed tracking-tight text-white/95 relative z-10">
          {report.verdict}
        </p>
      </div>

      {/* Next Steps */}
      {report.next_steps && report.next_steps.length > 0 && (
        <div className="pt-6 relative z-10 w-full">
          <h3 className="text-[14px] font-black text-gray-900 uppercase tracking-widest mb-6">
            Recommended Action Plan
          </h3>
          <div className="space-y-5">
            {report.next_steps.map((step, i) => (
              <div key={i} className="flex gap-4 sm:gap-5 items-start group">
                <div className="w-9 h-9 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-[14px] font-bold text-gray-500 shrink-0 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-all duration-300">
                  {i + 1}
                </div>
                <p className="text-[16px] font-medium text-gray-700 leading-relaxed pt-[6px]">
                  {step}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}