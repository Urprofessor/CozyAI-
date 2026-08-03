// Shared types for CozyAI chat.

export type Persona = 'qa' | 'support';

export interface CozyMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  persona?: Persona;
  images?: string[]; // data URLs while in session; stripped before persist
  avatar?: string; // support persona: which agent avatar was picked
  reference?: string; // QA reply footer (e.g. "From Professional literature")
  suggestions?: string[]; // QA follow-up chips ("猜你想问"), from a [[SUGGEST]] tag
  createdAt?: number;
}

export type HandoffState = 'idle' | 'connecting' | 'queuing' | 'assigning' | 'joined';

export interface CozySession {
  id: string;
  title: string; // first user message, truncated
  createdAt: number;
  updatedAt: number;
  messages: CozyMessage[];
}
