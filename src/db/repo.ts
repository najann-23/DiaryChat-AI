import { pool, initPostgresTables } from './index.ts';
import fs from 'fs';
import path from 'path';

// Local backup storage file to ensure data safety if external DB is connecting
const DATA_DIR = path.resolve(process.cwd(), 'data');
const LOCAL_STORE_FILE = path.join(DATA_DIR, 'persistent_store.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface StoreData {
  users: Record<string, any>;
  conversations: any[];
  messages: any[];
  memories: any[];
  events: any[];
  plans: any[];
  coreMemories: any[];
  scrapbooks: any[];
}

function loadLocalStore(): StoreData {
  try {
    if (fs.existsSync(LOCAL_STORE_FILE)) {
      const raw = fs.readFileSync(LOCAL_STORE_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to read local store:', e);
  }
  return {
    users: {},
    conversations: [],
    messages: [],
    memories: [],
    events: [],
    plans: [],
    coreMemories: [],
    scrapbooks: [],
  };
}

function saveLocalStore(data: StoreData) {
  try {
    fs.writeFileSync(LOCAL_STORE_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to write local store:', e);
  }
}

// Track if PostgreSQL tables have been initialized
let isPgInitialized = false;
let lastCheckTime = 0;
let pgAvailable = false;

async function checkPg() {
  if (!pool) return false;
  if (isPgInitialized) return true;

  const now = Date.now();
  if (now - lastCheckTime < 30000 && !pgAvailable) {
    return false;
  }
  lastCheckTime = now;

  try {
    const client = await pool.connect();
    client.release();
    isPgInitialized = await initPostgresTables(pool);
    pgAvailable = isPgInitialized;
    return isPgInitialized;
  } catch (err: any) {
    console.warn('PostgreSQL currently unavailable, running on local persistent engine:', err.message);
    pgAvailable = false;
    isPgInitialized = false;
    return false;
  }
}

export const dbRepo = {
  async isConnectedToPostgres(): Promise<boolean> {
    return checkPg();
  },

  // USERS
  async getOrCreateUser(uid: string, email: string, name?: string) {
    const isPg = await checkPg();
    if (isPg && pool) {
      try {
        const query = `
          INSERT INTO users (uid, email, name)
          VALUES ($1, $2, $3)
          ON CONFLICT (uid)
          DO UPDATE SET email = EXCLUDED.email, name = COALESCE(EXCLUDED.name, users.name), updated_at = NOW()
          RETURNING *;
        `;
        const res = await pool.query(query, [uid, email, name || email.split('@')[0]]);
        return res.rows[0];
      } catch (e) {
        console.error('PG getOrCreateUser error, falling back:', e);
      }
    }

    // Local persistent store
    const store = loadLocalStore();
    if (!store.users[uid]) {
      store.users[uid] = {
        id: Object.keys(store.users).length + 1,
        uid,
        email,
        name: name || email.split('@')[0],
        aiStyle: 'companion',
        proactivity: 'moderate',
        useOldMemories: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      saveLocalStore(store);
    }
    return store.users[uid];
  },

  async updateUserPreferences(uid: string, prefs: { name?: string; aiStyle?: string; proactivity?: string; useOldMemories?: boolean }) {
    const isPg = await checkPg();
    if (isPg && pool) {
      try {
        const res = await pool.query(`
          UPDATE users
          SET name = COALESCE($2, name),
              ai_style = COALESCE($3, ai_style),
              proactivity = COALESCE($4, proactivity),
              use_old_memories = COALESCE($5, use_old_memories),
              updated_at = NOW()
          WHERE uid = $1
          RETURNING *;
        `, [uid, prefs.name, prefs.aiStyle, prefs.proactivity, prefs.useOldMemories]);
        if (res.rows.length) return res.rows[0];
      } catch (e) {
        console.error('PG updateUserPreferences error:', e);
      }
    }

    const store = loadLocalStore();
    if (store.users[uid]) {
      if (prefs.name !== undefined) store.users[uid].name = prefs.name;
      if (prefs.aiStyle !== undefined) store.users[uid].aiStyle = prefs.aiStyle;
      if (prefs.proactivity !== undefined) store.users[uid].proactivity = prefs.proactivity;
      if (prefs.useOldMemories !== undefined) store.users[uid].useOldMemories = prefs.useOldMemories;
      store.users[uid].updatedAt = new Date().toISOString();
      saveLocalStore(store);
      return store.users[uid];
    }
    return null;
  },

  // CONVERSATIONS
  async getConversations(userId: string) {
    const isPg = await checkPg();
    if (isPg && pool) {
      try {
        const res = await pool.query(`
          SELECT * FROM conversations
          WHERE user_id = $1
          ORDER BY created_at DESC;
        `, [userId]);
        return res.rows;
      } catch (e) {
        console.error('PG getConversations error:', e);
      }
    }

    const store = loadLocalStore();
    return store.conversations
      .filter((c) => c.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async getConversation(id: number, userId: string) {
    const isPg = await checkPg();
    if (isPg && pool) {
      try {
        const convRes = await pool.query('SELECT * FROM conversations WHERE id = $1 AND user_id = $2', [id, userId]);
        if (!convRes.rows.length) return null;
        const msgRes = await pool.query('SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC', [id]);
        return { ...convRes.rows[0], messages: msgRes.rows };
      } catch (e) {
        console.error('PG getConversation error:', e);
      }
    }

    const store = loadLocalStore();
    const conv = store.conversations.find((c) => c.id === id && c.userId === userId);
    if (!conv) return null;
    const msgs = store.messages.filter((m) => m.conversationId === id).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return { ...conv, messages: msgs };
  },

  async createConversation(userId: string, title?: string, date?: string) {
    const today = date || new Date().toISOString().split('T')[0];
    const convTitle = title || `Trò chuyện ngày ${today}`;

    const isPg = await checkPg();
    if (isPg && pool) {
      try {
        const res = await pool.query(`
          INSERT INTO conversations (user_id, title, date)
          VALUES ($1, $2, $3)
          RETURNING *;
        `, [userId, convTitle, today]);
        return res.rows[0];
      } catch (e) {
        console.error('PG createConversation error:', e);
      }
    }

    const store = loadLocalStore();
    const newConv = {
      id: Date.now(),
      userId,
      title: convTitle,
      date: today,
      summary: null,
      isCompleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.conversations.unshift(newConv);
    saveLocalStore(store);
    return newConv;
  },

  async updateConversationSummary(id: number, userId: string, summary: string, title?: string, isCompleted = true) {
    const isPg = await checkPg();
    if (isPg && pool) {
      try {
        const res = await pool.query(`
          UPDATE conversations
          SET summary = $3,
              title = COALESCE($4, title),
              is_completed = $5,
              updated_at = NOW()
          WHERE id = $1 AND user_id = $2
          RETURNING *;
        `, [id, userId, summary, title, isCompleted]);
        return res.rows[0];
      } catch (e) {
        console.error('PG updateConversationSummary error:', e);
      }
    }

    const store = loadLocalStore();
    const idx = store.conversations.findIndex((c) => c.id === id && c.userId === userId);
    if (idx !== -1) {
      store.conversations[idx].summary = summary;
      if (title) store.conversations[idx].title = title;
      store.conversations[idx].isCompleted = isCompleted;
      store.conversations[idx].updatedAt = new Date().toISOString();
      saveLocalStore(store);
      return store.conversations[idx];
    }
    return null;
  },

  // MESSAGES
  async addMessage(
    conversationId: number,
    userId: string,
    role: 'user' | 'assistant',
    content: string,
    isSupplement = false,
    supplementForDate?: string
  ) {
    const isPg = await checkPg();
    if (isPg && pool) {
      try {
        const res = await pool.query(`
          INSERT INTO messages (conversation_id, user_id, role, content, is_supplement, supplement_for_date)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *;
        `, [conversationId, userId, role, content, isSupplement, supplementForDate]);
        return res.rows[0];
      } catch (e) {
        console.error('PG addMessage error:', e);
      }
    }

    const store = loadLocalStore();
    const newMsg = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      conversationId,
      userId,
      role,
      content,
      isSupplement,
      supplementForDate: supplementForDate || null,
      createdAt: new Date().toISOString(),
    };
    store.messages.push(newMsg);
    saveLocalStore(store);
    return newMsg;
  },

  // MEMORIES (Layer 2)
  async getMemories(userId: string, filter?: { status?: string; type?: string }) {
    const isPg = await checkPg();
    if (isPg && pool) {
      try {
        let sql = 'SELECT * FROM memories WHERE user_id = $1';
        const params: any[] = [userId];
        if (filter?.status) {
          params.push(filter.status);
          sql += ` AND status = $${params.length}`;
        }
        if (filter?.type) {
          params.push(filter.type);
          sql += ` AND type = $${params.length}`;
        }
        sql += ' ORDER BY created_at DESC';
        const res = await pool.query(sql, params);
        return res.rows;
      } catch (e) {
        console.error('PG getMemories error:', e);
      }
    }

    const store = loadLocalStore();
    return store.memories.filter((m) => {
      if (m.userId !== userId) return false;
      if (filter?.status && m.status !== filter.status) return false;
      if (filter?.type && m.type !== filter.type) return false;
      return true;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async createMemory(data: {
    userId: string;
    type: string;
    title: string;
    content: string;
    eventDate?: string;
    datePrecision?: string;
    certainty?: string;
    status?: string;
    conversationId?: number;
    messageId?: number;
    sourceQuote?: string;
    tags?: string;
  }) {
    const isPg = await checkPg();
    if (isPg && pool) {
      try {
        const res = await pool.query(`
          INSERT INTO memories (
            user_id, type, title, content, event_date, date_precision,
            certainty, status, conversation_id, message_id, source_quote, tags
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          RETURNING *;
        `, [
          data.userId,
          data.type,
          data.title,
          data.content,
          data.eventDate || null,
          data.datePrecision || 'exact',
          data.certainty || 'confirmed',
          data.status || 'pending',
          data.conversationId || null,
          data.messageId || null,
          data.sourceQuote || null,
          data.tags || null,
        ]);
        const memory = res.rows[0];

        // Also sync to events or plans table if accepted
        if (data.status === 'accepted') {
          if (data.type === 'event') {
            await pool.query(`
              INSERT INTO events (user_id, memory_id, title, description, event_date, date_precision)
              VALUES ($1, $2, $3, $4, $5, $6)
            `, [data.userId, memory.id, data.title, data.content, data.eventDate, data.datePrecision || 'exact']);
          } else if (data.type === 'plan') {
            await pool.query(`
              INSERT INTO plans (user_id, memory_id, title, description, target_date, status)
              VALUES ($1, $2, $3, $4, $5, 'pending')
            `, [data.userId, memory.id, data.title, data.content, data.eventDate]);
          }
        }

        return memory;
      } catch (e) {
        console.error('PG createMemory error:', e);
      }
    }

    const store = loadLocalStore();
    const newMem = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      userId: data.userId,
      type: data.type,
      title: data.title,
      content: data.content,
      eventDate: data.eventDate || null,
      datePrecision: data.datePrecision || 'exact',
      certainty: data.certainty || 'confirmed',
      status: data.status || 'pending',
      conversationId: data.conversationId || null,
      messageId: data.messageId || null,
      sourceQuote: data.sourceQuote || null,
      tags: data.tags || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.memories.unshift(newMem);

    if (data.status === 'accepted') {
      if (data.type === 'event') {
        store.events.unshift({
          id: Date.now() + 1,
          userId: data.userId,
          memoryId: newMem.id,
          title: data.title,
          description: data.content,
          eventDate: data.eventDate || null,
          datePrecision: data.datePrecision || 'exact',
          createdAt: new Date().toISOString(),
        });
      } else if (data.type === 'plan') {
        store.plans.unshift({
          id: Date.now() + 2,
          userId: data.userId,
          memoryId: newMem.id,
          title: data.title,
          description: data.content,
          targetDate: data.eventDate || null,
          status: 'pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }

    saveLocalStore(store);
    return newMem;
  },

  async updateMemoryStatus(id: number, userId: string, status: 'accepted' | 'rejected' | 'archived', edits?: { title?: string; content?: string }) {
    const isPg = await checkPg();
    if (isPg && pool) {
      try {
        const res = await pool.query(`
          UPDATE memories
          SET status = $3,
              title = COALESCE($4, title),
              content = COALESCE($5, content),
              updated_at = NOW()
          WHERE id = $1 AND user_id = $2
          RETURNING *;
        `, [id, userId, status, edits?.title, edits?.content]);
        const mem = res.rows[0];

        // If newly accepted, ensure event/plan entry exists
        if (status === 'accepted' && mem) {
          if (mem.type === 'event') {
            await pool.query(`
              INSERT INTO events (user_id, memory_id, title, description, event_date, date_precision)
              SELECT $1, $2, $3, $4, $5, $6
              WHERE NOT EXISTS (SELECT 1 FROM events WHERE memory_id = $2)
            `, [userId, mem.id, mem.title, mem.content, mem.event_date, mem.date_precision]);
          } else if (mem.type === 'plan') {
            await pool.query(`
              INSERT INTO plans (user_id, memory_id, title, description, target_date, status)
              SELECT $1, $2, $3, $4, $5, 'pending'
              WHERE NOT EXISTS (SELECT 1 FROM plans WHERE memory_id = $2)
            `, [userId, mem.id, mem.title, mem.content, mem.event_date]);
          }
        }
        return mem;
      } catch (e) {
        console.error('PG updateMemoryStatus error:', e);
      }
    }

    const store = loadLocalStore();
    const mem = store.memories.find((m) => m.id === id && m.userId === userId);
    if (mem) {
      mem.status = status;
      if (edits?.title) mem.title = edits.title;
      if (edits?.content) mem.content = edits.content;
      mem.updatedAt = new Date().toISOString();

      if (status === 'accepted') {
        if (mem.type === 'event' && !store.events.some((e) => e.memoryId === id)) {
          store.events.unshift({
            id: Date.now() + 1,
            userId,
            memoryId: id,
            title: mem.title,
            description: mem.content,
            eventDate: mem.eventDate,
            datePrecision: mem.datePrecision,
            createdAt: new Date().toISOString(),
          });
        } else if (mem.type === 'plan' && !store.plans.some((p) => p.memoryId === id)) {
          store.plans.unshift({
            id: Date.now() + 2,
            userId,
            memoryId: id,
            title: mem.title,
            description: mem.content,
            targetDate: mem.eventDate,
            status: 'pending',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      }

      saveLocalStore(store);
      return mem;
    }
    return null;
  },

  async deleteMemory(id: number, userId: string) {
    const isPg = await checkPg();
    if (isPg && pool) {
      try {
        await pool.query('DELETE FROM memories WHERE id = $1 AND user_id = $2', [id, userId]);
        await pool.query('DELETE FROM events WHERE memory_id = $1 AND user_id = $2', [id, userId]);
        await pool.query('DELETE FROM plans WHERE memory_id = $1 AND user_id = $2', [id, userId]);
        return true;
      } catch (e) {
        console.error('PG deleteMemory error:', e);
      }
    }

    const store = loadLocalStore();
    store.memories = store.memories.filter((m) => !(m.id === id && m.userId === userId));
    store.events = store.events.filter((e) => !(e.memoryId === id && e.userId === userId));
    store.plans = store.plans.filter((p) => !(p.memoryId === id && p.userId === userId));
    saveLocalStore(store);
    return true;
  },

  // EVENTS & PLANS
  async getEvents(userId: string) {
    const isPg = await checkPg();
    if (isPg && pool) {
      try {
        const res = await pool.query('SELECT * FROM events WHERE user_id = $1 ORDER BY event_date DESC, created_at DESC', [userId]);
        return res.rows;
      } catch (e) {
        console.error('PG getEvents error:', e);
      }
    }
    const store = loadLocalStore();
    return store.events.filter((e) => e.userId === userId).sort((a, b) => (b.eventDate || '').localeCompare(a.eventDate || ''));
  },

  async getPlans(userId: string) {
    const isPg = await checkPg();
    if (isPg && pool) {
      try {
        const res = await pool.query('SELECT * FROM plans WHERE user_id = $1 ORDER BY target_date ASC, created_at DESC', [userId]);
        return res.rows;
      } catch (e) {
        console.error('PG getPlans error:', e);
      }
    }
    const store = loadLocalStore();
    return store.plans.filter((p) => p.userId === userId).sort((a, b) => (a.targetDate || '').localeCompare(b.targetDate || ''));
  },

  async updatePlanStatus(id: number, userId: string, status: 'pending' | 'in_progress' | 'completed' | 'cancelled') {
    const isPg = await checkPg();
    if (isPg && pool) {
      try {
        const res = await pool.query('UPDATE plans SET status = $3, updated_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING *', [id, userId, status]);
        return res.rows[0];
      } catch (e) {
        console.error('PG updatePlanStatus error:', e);
      }
    }
    const store = loadLocalStore();
    const plan = store.plans.find((p) => p.id === id && p.userId === userId);
    if (plan) {
      plan.status = status;
      plan.updatedAt = new Date().toISOString();
      saveLocalStore(store);
      return plan;
    }
    return null;
  },

  // CORE MEMORIES (Layer 3)
  async getCoreMemories(userId: string) {
    const isPg = await checkPg();
    if (isPg && pool) {
      try {
        const res = await pool.query('SELECT * FROM core_memories WHERE user_id = $1 AND status = $2 ORDER BY updated_at DESC', [userId, 'active']);
        return res.rows;
      } catch (e) {
        console.error('PG getCoreMemories error:', e);
      }
    }
    const store = loadLocalStore();
    return store.coreMemories.filter((c) => c.userId === userId && c.status === 'active');
  },

  async createCoreMemory(userId: string, title: string, content: string, sourceReferences?: string) {
    const isPg = await checkPg();
    if (isPg && pool) {
      try {
        const res = await pool.query(`
          INSERT INTO core_memories (user_id, title, content, source_references)
          VALUES ($1, $2, $3, $4)
          RETURNING *;
        `, [userId, title, content, sourceReferences]);
        return res.rows[0];
      } catch (e) {
        console.error('PG createCoreMemory error:', e);
      }
    }
    const store = loadLocalStore();
    const newCore = {
      id: Date.now(),
      userId,
      title,
      content,
      status: 'active',
      sourceReferences: sourceReferences || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.coreMemories.unshift(newCore);
    saveLocalStore(store);
    return newCore;
  },

  // SCRAPBOOKS
  async getScrapbooks(userId: string) {
    const isPg = await checkPg();
    if (isPg && pool) {
      try {
        const res = await pool.query('SELECT * FROM scrapbooks WHERE user_id = $1 ORDER BY date DESC, created_at DESC', [userId]);
        return res.rows;
      } catch (e) {
        console.error('PG getScrapbooks error:', e);
      }
    }
    const store = loadLocalStore();
    return store.scrapbooks.filter((s) => s.userId === userId).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  },

  async createScrapbook(userId: string, data: { title: string; description?: string; date?: string; imageUrl?: string; memoryId?: number }) {
    const isPg = await checkPg();
    if (isPg && pool) {
      try {
        const res = await pool.query(`
          INSERT INTO scrapbooks (user_id, title, description, date, image_url, memory_id)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *;
        `, [userId, data.title, data.description || null, data.date || null, data.imageUrl || null, data.memoryId || null]);
        return res.rows[0];
      } catch (e) {
        console.error('PG createScrapbook error:', e);
      }
    }
    const store = loadLocalStore();
    const newScrap = {
      id: Date.now(),
      userId,
      title: data.title,
      description: data.description || null,
      date: data.date || new Date().toISOString().split('T')[0],
      imageUrl: data.imageUrl || null,
      memoryId: data.memoryId || null,
      createdAt: new Date().toISOString(),
    };
    store.scrapbooks.unshift(newScrap);
    saveLocalStore(store);
    return newScrap;
  },

  async deleteScrapbook(id: number, userId: string) {
    const isPg = await checkPg();
    if (isPg && pool) {
      try {
        await pool.query('DELETE FROM scrapbooks WHERE id = $1 AND user_id = $2', [id, userId]);
        return true;
      } catch (e) {
        console.error('PG deleteScrapbook error:', e);
      }
    }
    const store = loadLocalStore();
    store.scrapbooks = store.scrapbooks.filter((s) => !(s.id === id && s.userId === userId));
    saveLocalStore(store);
    return true;
  },

  // SEARCH AND CONTEXT RETRIEVAL
  async search(userId: string, keyword: string, startDate?: string, endDate?: string) {
    const cleanKw = keyword.toLowerCase().trim();
    const allMemories = await this.getMemories(userId);
    const allConversations = await this.getConversations(userId);

    const filteredMemories = allMemories.filter((m: any) => {
      const matchText = (m.title + ' ' + m.content + ' ' + (m.sourceQuote || '')).toLowerCase().includes(cleanKw);
      if (!matchText) return false;
      if (startDate && m.eventDate && m.eventDate < startDate) return false;
      if (endDate && m.eventDate && m.eventDate > endDate) return false;
      return true;
    });

    const filteredConversations = allConversations.filter((c: any) => {
      const matchText = (c.title + ' ' + (c.summary || '')).toLowerCase().includes(cleanKw);
      if (!matchText) return false;
      if (startDate && c.date < startDate) return false;
      if (endDate && c.date > endDate) return false;
      return true;
    });

    return {
      memories: filteredMemories,
      conversations: filteredConversations,
    };
  },

  // GROUNDED CONTEXT FOR GEMINI AI (Only accepted memories, plans, and core memories)
  async getAiContext(userId: string, userMessage: string) {
    const acceptedMemories = await this.getMemories(userId, { status: 'accepted' });
    const coreMems = await this.getCoreMemories(userId);
    const activePlans = await this.getPlans(userId);

    // Filter relevant memories by keyword matching or include recent verified memories
    const tokens = userMessage.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
    const relevantMemories = acceptedMemories.filter((m: any) => {
      const combined = `${m.title} ${m.content} ${m.type}`.toLowerCase();
      return tokens.some((token) => combined.includes(token));
    });

    // Pick top 5 relevant or top 3 recent if none specific
    const selectedMemories = relevantMemories.length > 0 ? relevantMemories.slice(0, 6) : acceptedMemories.slice(0, 4);

    return {
      memories: selectedMemories,
      coreMemories: coreMems.slice(0, 3),
      plans: activePlans.filter((p: any) => p.status === 'pending' || p.status === 'in_progress').slice(0, 3),
    };
  },

  // PRIVACY: FULL USER DATA DELETION
  async deleteUserData(userId: string) {
    const isPg = await checkPg();
    if (isPg && pool) {
      try {
        await pool.query('DELETE FROM users WHERE uid = $1', [userId]);
        return true;
      } catch (e) {
        console.error('PG deleteUserData error:', e);
      }
    }
    const store = loadLocalStore();
    delete store.users[userId];
    store.conversations = store.conversations.filter((c) => c.userId !== userId);
    store.messages = store.messages.filter((m) => m.userId !== userId);
    store.memories = store.memories.filter((m) => m.userId !== userId);
    store.events = store.events.filter((e) => e.userId !== userId);
    store.plans = store.plans.filter((p) => p.userId !== userId);
    store.coreMemories = store.coreMemories.filter((c) => c.userId !== userId);
    store.scrapbooks = store.scrapbooks.filter((s) => s.userId !== userId);
    saveLocalStore(store);
    return true;
  },
};
