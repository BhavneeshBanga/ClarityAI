'use client';

import { FinalReport as FinalReportType } from '@/lib/types';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

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
      <div className={`p-5 bg-red-50/50 border border-red-100 rounded-xl space-y-3 ${inter.className}`}>
        <h3 className="text-red-800 font-semibold text-sm">Formatting Error</h3>
        <p className="text-sm text-red-600/80">
          The AI generated an assessment, but it wasn&apos;t formatted correctly. Raw response:
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

  const scoreColor =
    score >= 8
      ? { ring: 'bg-emerald-500', label: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'Strong' }
      : score >= 5
      ? { ring: 'bg-amber-400', label: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', text: 'Moderate' }
      : { ring: 'bg-rose-500', label: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200', text: 'Weak' };

  return (
    <div className={`${inter.className} mt-4 space-y-4 text-[#111]`}>

      {/* ── TOP CARD: Header + Score ── */}
      <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden shadow-sm">

        {/* Thin accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-violet-500 via-indigo-500 to-sky-400" />

        <div className="px-7 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6">

          {/* Left: badge + title */}
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-500 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
              </svg>
              Final Assessment
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">Decision Report</h2>
          </div>

          {/* Right: Score ring */}
          <div className="flex items-center gap-5">
            <div className="relative w-20 h-20 shrink-0">
              <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
                <circle cx="40" cy="40" r="34" strokeWidth="7" stroke="#f1f5f9" fill="none" />
                <circle
                  cx="40" cy="40" r="34"
                  strokeWidth="7"
                  fill="none"
                  stroke={score >= 8 ? '#10b981' : score >= 5 ? '#f59e0b' : '#f43f5e'}
                  strokeLinecap="round"
                  strokeDasharray={`${(score / 10) * 213.6} 213.6`}
                  className="transition-all duration-700"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-black text-gray-900 leading-none">{score}</span>
                <span className="text-[10px] text-gray-400 font-semibold">/10</span>
              </div>
            </div>
            <div className="space-y-0.5">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">Readiness</p>
              <p className={`text-lg font-bold ${scoreColor.label}`}>{scoreColor.text}</p>
              <div className="flex gap-1 mt-1">
                {[...Array(10)].map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 w-4 rounded-full transition-all duration-300 ${
                      i < score
                        ? score >= 8 ? 'bg-emerald-400' : score >= 5 ? 'bg-amber-400' : 'bg-rose-400'
                        : 'bg-gray-100'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── SUMMARY ── */}
      <div className="rounded-2xl border border-gray-100 bg-white px-7 py-6 shadow-sm">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-3">Situation Overview</p>
        <p className="text-[17px] leading-[1.7] text-gray-700">{report.summary}</p>
      </div>

      {/* ── PROS & CONS GRID ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Pros */}
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 px-6 py-5 shadow-sm">
          <div className="flex items-center gap-2.5 mb-5">
            <span className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
            <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700">Key Advantages</h3>
          </div>
          <ul className="space-y-3.5">
            {report.pros?.map((p, i) => (
              <li key={i} className="flex gap-3 text-[14px] text-gray-700 leading-snug">
                <span className="mt-1 shrink-0 w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Cons */}
        <div className="rounded-2xl border border-rose-100 bg-rose-50/50 px-6 py-5 shadow-sm">
          <div className="flex items-center gap-2.5 mb-5">
            <span className="w-6 h-6 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </span>
            <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-rose-700">Major Drawbacks</h3>
          </div>
          <ul className="space-y-3.5">
            {report.cons?.map((c, i) => (
              <li key={i} className="flex gap-3 text-[14px] text-gray-700 leading-snug">
                <span className="mt-1 shrink-0 w-1.5 h-1.5 rounded-full bg-rose-400" />
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── RISKS ── */}
      {report.risks && report.risks.length > 0 && (
        <div className="rounded-2xl border border-amber-100 bg-amber-50/50 px-6 py-5 shadow-sm">
          <div className="flex items-center gap-2.5 mb-5">
            <span className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </span>
            <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-700">Critical Risks</h3>
          </div>
          <ul className="space-y-3.5">
            {report.risks.map((r, i) => (
              <li key={i} className="flex gap-3 text-[14px] text-gray-700 leading-snug">
                <span className="mt-1 shrink-0 w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── VERDICT ── */}
      <div className="rounded-2xl bg-gray-950 text-white px-7 py-7 shadow-lg relative overflow-hidden">
        {/* Subtle corner glow */}
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-indigo-600/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-40 h-40 rounded-full bg-violet-600/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex items-start gap-4">
          <div className="mt-0.5 shrink-0 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40 mb-2">Executive Verdict</p>
            <p className="text-[17px] sm:text-[19px] leading-[1.65] font-medium text-white/90">{report.verdict}</p>
          </div>
        </div>
      </div>

      {/* ── NEXT STEPS ── */}
      {report.next_steps && report.next_steps.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white px-7 py-6 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-5">Recommended Action Plan</p>
          <div className="space-y-4">
            {report.next_steps.map((step, i) => (
              <div key={i} className="flex gap-4 items-start group">
                <div className="w-7 h-7 rounded-full border border-gray-200 bg-gray-50 group-hover:bg-indigo-600 group-hover:border-indigo-600 flex items-center justify-center text-[12px] font-bold text-gray-400 group-hover:text-white transition-all duration-200 shrink-0 mt-0.5">
                  {i + 1}
                </div>
                <div className="flex-1 pt-0.5 pb-4 border-b border-gray-50 last:border-0">
                  <p className="text-[15px] text-gray-700 leading-relaxed">{step}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}