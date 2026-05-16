export type Phase =
  | 'welcome' 
  | 'questioning' 
  | 'analyzing'
  | 'final';

export type MessageRole = 
  |'user' 
  | 'assistant';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  choices?: string[];
  allowCustom?: boolean;
  selectedChoice?: number;
  isReport?: boolean;
  isError?: boolean;
  timestamp: number;
}

export interface Session {
  id: string;
  title: string;
  messages: Message[];
  phase: Phase;
  questionCount: number;
  totalQuestions: number;
  category: string;
  mode: 'standard' | 'mcq';
  createdAt: number;
  /** ID of the session this was branched from, if any */
  branchedFrom?: string;
}

export interface SessionSummary {
  id: string;
  title: string;
  phase: Phase;
  mode: 'standard' | 'mcq';
  createdAt: number;
  messageCount: number;
  /** ID of the session this was branched from, if any */
  branchedFrom?: string;
}

export interface FinalReport {
  type: 'final_report';
  summary: string;
  pros: string[];
  cons: string[];
  risks: string[];
  verdict: string;
  score: number;
  next_steps?: string[];
}