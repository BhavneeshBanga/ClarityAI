export default function PrivacyPage() {
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
            Legal
          </div>
          <h1 className="text-[38px] font-bold tracking-tight text-[#0f0f0f] leading-tight mb-3">
            Privacy Policy
          </h1>
          <p className="text-[15px] text-[#999] font-medium">
            Last updated: <span className="text-[#666]">April 27, 2026</span>
          </p>
        </div>

        {/* Intro card */}
        <div className="bg-[#ededff] border border-[#d8d8ff] rounded-2xl px-6 py-5 mb-10">
          <p className="text-[14.5px] text-[#4a4a9a] leading-relaxed">
            At ClarityAI, your privacy is a priority — not an afterthought. This policy explains what data we collect, why we collect it, and how we protect it. We will never sell your personal data.
          </p>
        </div>

        {/* Sections */}
        <div className="flex flex-col gap-3">

          <Section number="01" title="Information We Collect">
            <p>We collect only the information necessary to provide and improve the Service:</p>
            <ul>
              <li><strong>Account data:</strong> Your name, email address, and profile photo via Google OAuth when you sign in.</li>
              <li><strong>Usage data:</strong> Your decision sessions, inputs, conversation history, and preferences within the app.</li>
              <li><strong>Technical data:</strong> Browser type, device type, IP address, and pages visited — used for security and performance monitoring.</li>
            </ul>
            <p>We do not collect payment information directly. If billing is introduced in the future, it will be handled by a certified third-party processor.</p>
          </Section>

          <Section number="02" title="How We Use Your Information">
            <p>We use the data we collect to:</p>
            <ul>
              <li>Provide, operate, and improve the ClarityAI Service</li>
              <li>Sync your sessions and decision history across your devices</li>
              <li>Personalize your experience and remember your preferences</li>
              <li>Respond to your support requests or feedback</li>
              <li>Monitor for abuse, fraud, or security threats</li>
              <li>Send you important service-related notifications (not marketing)</li>
            </ul>
            <p>We do not use your decision session content to train AI models without your explicit consent.</p>
          </Section>

          <Section number="03" title="Google OAuth & Third-Party Sign-In">
            <p>ClarityAI uses Google OAuth 2.0 for authentication. When you sign in with Google, we receive your name, email address, and profile photo from Google. We do not receive or store your Google password.</p>
            <p>Your use of Google sign-in is also subject to Google's own Privacy Policy and Terms of Service. We encourage you to review those separately.</p>
          </Section>

          <Section number="04" title="Data Storage & Security">
            <p>Your data is stored on secure servers with industry-standard encryption in transit (TLS) and at rest. Access to your data is restricted to authorized personnel only.</p>
            <p>While we take all reasonable measures to protect your data, no method of electronic storage is 100% secure. We will notify you promptly in the event of a data breach that affects your personal information.</p>
          </Section>

          <Section number="05" title="Cookies & Local Storage">
            <p>We use cookies and browser storage to keep you signed in and remember your session preferences. These are essential for the Service to function correctly.</p>
            <p>We do not use third-party advertising cookies or tracking pixels. You may clear cookies at any time through your browser settings, though this will sign you out of the Service.</p>
          </Section>

          <Section number="06" title="Data Sharing">
            <p>We do not sell, rent, or trade your personal data to any third party. We may share your data only in the following limited circumstances:</p>
            <ul>
              <li><strong>Service providers:</strong> Trusted vendors who help us operate the Service (e.g., hosting, analytics), bound by confidentiality agreements.</li>
              <li><strong>Legal requirements:</strong> If required by law, court order, or to protect the rights, property, or safety of ClarityAI or its users.</li>
              <li><strong>Business transfer:</strong> In the event of a merger, acquisition, or sale of assets, your data may be transferred — you will be notified in advance.</li>
            </ul>
          </Section>

          <Section number="07" title="Your Rights">
            <p>Depending on your location, you may have the following rights regarding your personal data:</p>
            <ul>
              <li><strong>Access:</strong> Request a copy of the personal data we hold about you.</li>
              <li><strong>Correction:</strong> Ask us to correct inaccurate or incomplete data.</li>
              <li><strong>Deletion:</strong> Request that we delete your account and associated data.</li>
              <li><strong>Portability:</strong> Request your data in a structured, machine-readable format.</li>
              <li><strong>Objection:</strong> Object to certain types of processing, such as analytics.</li>
            </ul>
            <p>To exercise any of these rights, please contact us at the email below. We will respond within 30 days.</p>
          </Section>

          <Section number="08" title="Data Retention">
            <p>We retain your account data for as long as your account is active. If you delete your account, we will delete your personal data within 30 days, except where we are required to retain it for legal or compliance purposes.</p>
            <p>Anonymized, aggregated usage data (with no personally identifiable information) may be retained indefinitely to improve the Service.</p>
          </Section>

          <Section number="09" title="Children's Privacy">
            <p>ClarityAI is not intended for use by individuals under the age of 13. We do not knowingly collect personal data from children. If we become aware that a child under 13 has provided us with personal data, we will delete it immediately.</p>
            <p>If you believe a child has provided us with their information, please contact us right away.</p>
          </Section>

          <Section number="10" title="Changes to This Policy">
            <p>We may update this Privacy Policy from time to time. When we do, we will revise the "Last updated" date at the top of this page and, where appropriate, notify you by email or an in-app notice.</p>
            <p>Your continued use of ClarityAI after any changes constitutes your acceptance of the updated policy.</p>
          </Section>

          <Section number="11" title="Contact Us">
            <p>If you have any questions, concerns, or requests regarding this Privacy Policy or how we handle your data, please get in touch — we take every inquiry seriously.</p>
            <p>
              Email us at{" "}
              <a
                href="mailto:privacy@clarityai.app"
                style={{ color: "#6b6ef9", textDecoration: "none", fontWeight: 500 }}
              >
                privacy@clarityai.app
              </a>
            </p>
          </Section>

        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-[#e8e8e8] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[12.5px] text-[#bbb]">
            © 2026 ClarityAI. All rights reserved.
          </p>
          <div className="flex items-center gap-5">
            <a href="/terms" className="text-[13px] text-[#aaa] hover:text-[#6b6ef9] transition-colors">
              Terms & Conditions
            </a>
            <a href="/login" className="text-[13px] text-[#6b6ef9] font-medium hover:underline">
              ← Back to login
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}

function Section({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#ebebeb] overflow-hidden">
      <div className="flex items-center gap-4 px-6 py-4 border-b border-[#f3f3f3]">
        <span className="text-[11px] font-bold text-[#6b6ef9] bg-[#ededff] px-2.5 py-1 rounded-lg tracking-widest">
          {number}
        </span>
        <h2 className="text-[15.5px] font-semibold text-[#111] tracking-tight">
          {title}
        </h2>
      </div>
      <div className="px-6 py-5 text-[14px] text-[#555] leading-relaxed flex flex-col gap-3">
        {children}
      </div>
    </div>
  );
}