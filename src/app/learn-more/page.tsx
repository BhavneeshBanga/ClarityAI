export default function LearnMorePage() {
  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      {/* Header */}
      <div className="bg-white border-b border-[#ebebeb]">
        <div className="max-w-[780px] mx-auto px-6 py-5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#ededff] flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2L3 7l9 5 9-5-9-5zM3 17l9 5 9-5M3 12l9 5 9-5"
                stroke="#6b6ef9"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span className="text-[17px] font-bold tracking-tight text-[#111]">
            Clarity<span className="text-[#6b6ef9]">AI</span>
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[780px] mx-auto px-6 py-14">

        {/* Hero */}
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 bg-[#ededff] text-[#6b6ef9] text-[12px] font-semibold px-3 py-1.5 rounded-full mb-5 tracking-wide uppercase">
            About
          </div>
          <h1 className="text-[38px] font-bold tracking-tight text-[#0f0f0f] leading-tight mb-3">
            What is ClarityAI?
          </h1>
          <p className="text-[15px] text-[#999] font-medium">
            Your AI-powered decision companion — built to help you think clearly.
          </p>
        </div>

        {/* Intro card */}
        <div className="bg-[#ededff] border border-[#d8d8ff] rounded-2xl px-6 py-5 mb-10">
          <p className="text-[14.5px] text-[#4a4a9a] leading-relaxed">
            ClarityAI helps you make better decisions by breaking down complex choices, surfacing trade-offs, and guiding you through structured thinking — all powered by AI.
          </p>
        </div>

        {/* Feature Sections */}
        <div className="flex flex-col gap-3">

          <FeatureSection
            number="01"
            title="What We Do"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="#6b6ef9" strokeWidth="2" />
                <path d="M12 8v4l3 3" stroke="#6b6ef9" strokeWidth="2" strokeLinecap="round" />
              </svg>
            }
          >
            <p>
              ClarityAI is a decision-support tool that uses AI to help you weigh options, organize your thoughts, and arrive at confident conclusions — faster and with less mental fatigue.
            </p>
            <p>
              Whether you're making a career move, a financial decision, or just trying to pick the right path forward, ClarityAI gives you a structured space to think it through.
            </p>
          </FeatureSection>

          <FeatureSection
            number="02"
            title="How It Works"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M9 11l3 3L22 4" stroke="#6b6ef9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" stroke="#6b6ef9" strokeWidth="2" strokeLinecap="round" />
              </svg>
            }
          >
            <p>You describe your decision or dilemma in plain language. ClarityAI then asks clarifying questions, identifies key factors, and helps you explore each option from multiple angles.</p>
            <ul>
              <li>Describe your situation in your own words</li>
              <li>AI identifies trade-offs and blind spots</li>
              <li>Work through a guided decision framework</li>
              <li>Save your session and revisit it anytime</li>
            </ul>
          </FeatureSection>

          <FeatureSection
            number="03"
            title="Who It's For"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="#6b6ef9" strokeWidth="2" strokeLinecap="round" />
                <circle cx="9" cy="7" r="4" stroke="#6b6ef9" strokeWidth="2" />
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="#6b6ef9" strokeWidth="2" strokeLinecap="round" />
              </svg>
            }
          >
            <p>ClarityAI is designed for anyone who wants to think more clearly — whether you're a solo founder navigating a tough call, a professional weighing job offers, or simply someone who overthinks decisions.</p>
            <p>No special knowledge required. Just bring your problem.</p>
          </FeatureSection>

          <FeatureSection
            number="04"
            title="Privacy & Your Data"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="#6b6ef9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
          >
            <p>Your decision sessions are private and securely stored. We use Google OAuth so we never handle your password. You own your data and can delete it at any time.</p>
            <p>We do not sell your data or use your sessions to train AI models without your explicit consent.</p>
          </FeatureSection>

          <FeatureSection
            number="05"
            title="Get Started"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M5 12h14M12 5l7 7-7 7" stroke="#6b6ef9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
          >
            <p>
              Getting started is free. Sign in with your Google account and begin your first decision session in under a minute.
            </p>
            <p>
              Have questions? Reach us at{" "}
              <a
                href="mailto:support@clarityai.app"
                style={{ color: "#6b6ef9", textDecoration: "none", fontWeight: 500 }}
              >
                support@clarityai.app
              </a>
            </p>
          </FeatureSection>

        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-[#e8e8e8] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[12.5px] text-[#bbb]">
            © 2026 ClarityAI. All rights reserved.
          </p>
          <a
            href="/login"
            className="text-[13px] text-[#6b6ef9] font-medium hover:underline"
          >
            ← Back to login
          </a>
        </div>

      </div>
    </div>
  );
}

function FeatureSection({
  number,
  title,
  icon,
  children,
}: {
  number: string;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#ebebeb] overflow-hidden">
      <div className="flex items-center gap-4 px-6 py-4 border-b border-[#f3f3f3]">
        <span className="text-[11px] font-bold text-[#6b6ef9] bg-[#ededff] px-2.5 py-1 rounded-lg tracking-widest">
          {number}
        </span>
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-[15.5px] font-semibold text-[#111] tracking-tight">
            {title}
          </h2>
        </div>
      </div>
      <div
        className="px-6 py-5 text-[14px] text-[#555] leading-relaxed flex flex-col gap-3"
        style={{ listStylePosition: "inside" }}
      >
        {children}
      </div>
    </div>
  );
}