'use client';

import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { useState, Suspense } from 'react';
function handleTermsClick() {
  window.open("/terms", "_blank");
}
function handlePolicyClick() {
  window.open("/Policy", "_blank");
}

function LoginContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/';
  const error = searchParams.get('error');
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    await signIn('google', { callbackUrl });
    // Loading stays true while redirect happens
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex flex-col items-center justify-center px-4">

      {/* Card */}
      <div className="w-full max-w-[400px] bg-white rounded-[24px] border border-[#e8e8e8] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] p-8 flex flex-col items-center gap-6">

        {/* Logo */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-2xl bg-[#ededff] flex items-center justify-center mb-1">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2L3 7l9 5 9-5-9-5zM3 17l9 5 9-5M3 12l9 5 9-5"
                stroke="#6b6ef9"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h1 className="text-[22px] font-bold tracking-tight text-[#111]">
            Clarity<span className="text-[#6b6ef9]">AI</span>
          </h1>
          <p className="text-[13px] text-[#999] text-center leading-snug">
            Your personal decision advisor
          </p>
        </div>

        {/* Divider */}
        <div className="w-full h-px bg-[#f0f0f0]" />

        {/* Headline */}
        <div className="text-center space-y-1.5">
          <h2 className="text-[18px] font-semibold text-[#111] tracking-tight">
            Welcome back
          </h2>
          <p className="text-[13px] text-[#888] leading-relaxed">
            Sign in to access your sessions and decision history across all your devices.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="w-full bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-[12.5px] text-red-600 flex items-center gap-2.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            {error === 'OAuthAccountNotLinked'
              ? 'This email is already linked to another provider.'
              : 'Something went wrong. Please try again.'}
          </div>
        )}

        {/* Google Sign-in Button */}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="
            w-full flex items-center justify-center gap-3
            border border-[#e0e0e0] bg-white hover:bg-[#fafafa]
            rounded-xl px-4 py-3
            text-[14px] font-medium text-[#333]
            transition-all duration-200
            disabled:opacity-60 disabled:cursor-not-allowed
            shadow-sm hover:shadow
            active:scale-[0.99]
          "
        >
          {loading ? (
            <>
              <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="#e0e0e0" strokeWidth="3" />
                <path d="M12 2a10 10 0 0 1 10 10" stroke="#6b6ef9" strokeWidth="3" strokeLinecap="round" />
              </svg>
              <span>Signing in…</span>
            </>
          ) : (
            <>
              {/* Google logo SVG */}
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              <span>Continue with Google</span>
            </>
          )}
        </button>

        {/* Fine print */}
        <p className="text-[11.5px] text-[#bbb] text-center leading-relaxed">
          By signing in, you agree to our{' '}
          <span className="underline cursor-pointer hover:text-[#999] transition-colors"
            onClick={handleTermsClick}
            style={{
              // color: "blue",
              cursor: "pointer",
              // textDecoration: "underline"
            }}
          >Terms</span>
          {' '}and{' '}
          <span className="underline cursor-pointer hover:text-[#999] transition-colors" onClick={() => window.open("/privacy", "_blank")}
          >Privacy Policy</span>.
        </p>
      </div>

      {/* Feature bullets below the card */}
      <div className="mt-8 flex flex-col sm:flex-row gap-4 text-center text-[12px] text-[#aaa]">
        {[
          { icon: '🔒', text: 'Sessions saved securely' },
          { icon: '📱', text: 'Access across devices' },
          { icon: '🌿', text: 'Branch & replay decisions' },
        ].map(({ icon, text }) => (
          <div key={text} className="flex items-center justify-center gap-1.5">
            <span>{icon}</span>
            <span>{text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}