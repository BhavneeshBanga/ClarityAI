export type Phase = 'welcome' | 'questioning' | 'analyzing' | 'final';

export type MessageRole = 'user' | 'assistant';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  choices?: string[];        // MCQ options shown as buttons
  allowCustom?: boolean;     // Show "Other – type your own" input
  selectedChoice?: number;   // Index of selected MCQ choice (locks buttons)
  isReport?: boolean;
  isError?: boolean;         // Whether this is an error message (shows retry)
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
  mode: 'standard' | 'mcq';
  createdAt: number;
}

export interface SessionSummary {
  id: string;
  title: string;
  phase: Phase;
  mode: 'standard' | 'mcq';
  createdAt: number;
  messageCount: number;
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