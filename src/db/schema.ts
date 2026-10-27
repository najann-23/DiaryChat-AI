import { relations } from 'drizzle-orm';
import { boolean, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

// 1. Users table (synced from Firebase Auth UID)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  name: text('name'),
  aiStyle: text('ai_style').default('companion'), // 'companion' | 'gentle' | 'curious' | 'reflective'
  proactivity: text('proactivity').default('moderate'), // 'low' | 'moderate' | 'high'
  useOldMemories: boolean('use_old_memories').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 2. Layer 1: Conversations
export const conversations = pgTable('conversations', {
  id: serial('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.uid, { onDelete: 'cascade' }),
  title: text('title').notNull().default('Cuộc trò chuyện mới'),
  date: text('date').notNull(), // Format: YYYY-MM-DD
  summary: text('summary'),
  isCompleted: boolean('is_completed').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 3. Layer 1: Messages (Original and inviolable transcript)
export const messages = pgTable('messages', {
  id: serial('id').primaryKey(),
  conversationId: integer('conversation_id')
    .notNull()
    .references(() => conversations.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull(),
  role: text('role').notNull(), // 'user' | 'assistant'
  content: text('content').notNull(),
  isSupplement: boolean('is_supplement').default(false),
  supplementForDate: text('supplement_for_date'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 4. Layer 2: Memory Objects (With consent lifecycle: pending, accepted, rejected, archived)
export const memories = pgTable('memories', {
  id: serial('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.uid, { onDelete: 'cascade' }),
  type: text('type').notNull(), // 'event' | 'person' | 'place' | 'emotion' | 'plan' | 'reflection' | 'memory'
  title: text('title').notNull(),
  content: text('content').notNull(),
  eventDate: text('event_date'), // e.g. "2026-10-27" or "Mùa hè năm ngoái"
  datePrecision: text('date_precision').default('exact'), // 'exact' | 'approximate' | 'unknown'
  certainty: text('certainty').default('confirmed'), // 'confirmed' | 'inferred'
  status: text('status').default('pending'), // 'pending' | 'accepted' | 'rejected' | 'archived'
  conversationId: integer('conversation_id').references(() => conversations.id, { onDelete: 'set null' }),
  messageId: integer('message_id').references(() => messages.id, { onDelete: 'set null' }),
  sourceQuote: text('source_quote'), // Original quote snippet
  tags: text('tags'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 5. Explicit Events table (Past or ongoing occurrences)
export const events = pgTable('events', {
  id: serial('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.uid, { onDelete: 'cascade' }),
  memoryId: integer('memory_id').references(() => memories.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  description: text('description'),
  eventDate: text('event_date'),
  datePrecision: text('date_precision').default('exact'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 6. Explicit Plans table (Future intentions, targets, goals)
export const plans = pgTable('plans', {
  id: serial('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.uid, { onDelete: 'cascade' }),
  memoryId: integer('memory_id').references(() => memories.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  description: text('description'),
  targetDate: text('target_date'),
  status: text('status').default('pending'), // 'pending' | 'in_progress' | 'completed' | 'cancelled'
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 7. Layer 3: Core Memories (Synthesized long-term insights with traced sources)
export const coreMemories = pgTable('core_memories', {
  id: serial('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.uid, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  content: text('content').notNull(),
  status: text('status').default('active'), // 'active' | 'archived'
  sourceReferences: text('source_references'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 8. Scrapbook / Milestone cards (Photos & visual memory cards)
export const scrapbooks = pgTable('scrapbooks', {
  id: serial('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.uid, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  date: text('date'),
  imageUrl: text('image_url'),
  memoryId: integer('memory_id').references(() => memories.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow(),
});

// Relationships
export const usersRelations = relations(users, ({ many }) => ({
  conversations: many(conversations),
  memories: many(memories),
  events: many(events),
  plans: many(plans),
  coreMemories: many(coreMemories),
  scrapbooks: many(scrapbooks),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  user: one(users, {
    fields: [conversations.userId],
    references: [users.uid],
  }),
  messages: many(messages),
  memories: many(memories),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}));

export const memoriesRelations = relations(memories, ({ one }) => ({
  conversation: one(conversations, {
    fields: [memories.conversationId],
    references: [conversations.id],
  }),
  message: one(messages, {
    fields: [memories.messageId],
    references: [messages.id],
  }),
}));
