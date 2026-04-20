export type Phase = 'welcome' | 'questioning' | 'analyzing' | 'final';

export type MessageRole = 'user' | 'assistant';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  choices?: string[];        // MCQ options shown as buttons
  allowCustom?: boolean;     // Show "Other – type your own" input
  isReport?: boolean;
  timestamp: number;
}

export interface Session {
  id: string;
  title: string;
  messages: Message[];
  phase: Phase;
  questionCount: number;     // # of AI questions asked (not counting welcome)
  totalQuestions: number;    // max cap (20)
  category: string;
  createdAt: number;
}

export interface FinalReport {
  type: 'final_report';
  summary: string;
  pros: string[];
  cons: string[];
  risks: string[];
  verdict: string;
  score: number;             // 1-10
  next_steps?: string[];
}