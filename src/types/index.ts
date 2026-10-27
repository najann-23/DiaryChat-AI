export type MemoryType = 'event' | 'person' | 'place' | 'emotion' | 'plan' | 'reflection' | 'memory';
export type MemoryStatus = 'pending' | 'accepted' | 'rejected' | 'archived';
export type DatePrecision = 'exact' | 'approximate' | 'unknown';
export type CertaintyLevel = 'confirmed' | 'inferred';
export type PlanStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type AiStyle = 'companion' | 'gentle' | 'curious' | 'reflective';
export type Proactivity = 'low' | 'moderate' | 'high';

export interface UserProfile {
  id: number;
  uid: string;
  email: string;
  name?: string;
  aiStyle: AiStyle;
  proactivity: Proactivity;
  useOldMemories: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: number;
  conversationId: number;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  isSupplement?: boolean;
  supplementForDate?: string;
  createdAt: string;
}

export interface Conversation {
  id: number;
  userId: string;
  title: string;
  date: string;
  summary?: string | null;
  isCompleted?: boolean;
  createdAt: string;
  updatedAt: string;
  messages?: Message[];
}

export interface Memory {
  id: number;
  userId: string;
  type: MemoryType;
  title: string;
  content: string;
  eventDate?: string | null;
  datePrecision?: DatePrecision;
  certainty?: CertaintyLevel;
  status: MemoryStatus;
  conversationId?: number | null;
  messageId?: number | null;
  sourceQuote?: string | null;
  tags?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EventItem {
  id: number;
  userId: string;
  memoryId?: number | null;
  title: string;
  description?: string | null;
  eventDate?: string | null;
  datePrecision?: DatePrecision;
  createdAt: string;
}

export interface PlanItem {
  id: number;
  userId: string;
  memoryId?: number | null;
  title: string;
  description?: string | null;
  targetDate?: string | null;
  status: PlanStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CoreMemory {
  id: number;
  userId: string;
  title: string;
  content: string;
  status: 'active' | 'archived';
  sourceReferences?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScrapbookItem {
  id: number;
  userId: string;
  title: string;
  description?: string | null;
  date?: string | null;
  imageUrl?: string | null;
  memoryId?: number | null;
  createdAt: string;
}
