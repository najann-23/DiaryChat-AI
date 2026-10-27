import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { dbRepo } from './src/db/repo.ts';
import { requireAuth, AuthRequest } from './src/middleware/auth.ts';
import { generateChatResponse, generateDailySummary, answerMemoryQuestion } from './src/lib/gemini.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

app.use(express.json());

// HEALTH & DATABASE STATUS
app.get('/api/health', async (_req: Request, res: Response) => {
  const isPg = await dbRepo.isConnectedToPostgres();
  res.json({
    status: 'ok',
    database: isPg ? 'PostgreSQL (Connected)' : 'Local Persistent Engine (Awaiting External Postgres URL)',
    geminiConfigured: !!process.env.GEMINI_API_KEY,
  });
});

// AUTH & USER PROFILE
app.post('/api/auth/sync', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const profile = await dbRepo.getOrCreateUser(user.uid, user.email, user.name);
    res.json({ success: true, user: profile });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/user/profile', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const profile = await dbRepo.getOrCreateUser(user.uid, user.email, user.name);
    res.json(profile);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/user/preferences', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const updated = await dbRepo.updateUserPreferences(user.uid, req.body);
    res.json({ success: true, user: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/user/account', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    await dbRepo.deleteUserData(user.uid);
    res.json({ success: true, message: 'Đã xóa toàn bộ tài khoản và dữ liệu cá nhân theo yêu cầu.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// CONVERSATIONS
app.get('/api/conversations', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const convs = await dbRepo.getConversations(req.user!.uid);
    res.json(convs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/conversations', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { title, date } = req.body;
    const conv = await dbRepo.createConversation(req.user!.uid, title, date);
    res.json(conv);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/conversations/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const conv = await dbRepo.getConversation(id, req.user!.uid);
    if (!conv) {
      return res.status(404).json({ error: 'Không tìm thấy cuộc trò chuyện' });
    }
    res.json(conv);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// CHAT & MESSAGES
app.post('/api/conversations/:id/messages', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const convId = parseInt(req.params.id, 10);
    const userId = req.user!.uid;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Nội dung tin nhắn không được để trống' });
    }

    const conv = await dbRepo.getConversation(convId, userId);
    if (!conv) {
      return res.status(404).json({ error: 'Không tìm thấy cuộc trò chuyện' });
    }

    // 1. Save original user message
    const userMessage = await dbRepo.addMessage(convId, userId, 'user', content.trim());

    // 2. Fetch user preferences and grounded context
    const userProfile = await dbRepo.getOrCreateUser(userId, req.user!.email, req.user!.name);
    const aiContext = await dbRepo.getAiContext(userId, content);

    // 3. Call Gemini AI via server
    const aiResult = await generateChatResponse(
      userProfile,
      content,
      conv.messages || [],
      aiContext
    );

    // 4. Save AI reply message
    const assistantMessage = await dbRepo.addMessage(convId, userId, 'assistant', aiResult.reply);

    // 5. If conversation doesn't have a specific title and AI suggested one, update title
    if (aiResult.suggestedTitle && (!conv.title || conv.title.startsWith('Trò chuyện ngày') || conv.title === 'Cuộc trò chuyện mới')) {
      await dbRepo.updateConversationSummary(convId, userId, conv.summary || '', aiResult.suggestedTitle, conv.isCompleted);
    }

    // 6. If AI suggested a memory proposal, save it as PENDING (consent gate)
    let savedProposal = null;
    if (aiResult.memoryProposal) {
      savedProposal = await dbRepo.createMemory({
        userId,
        type: aiResult.memoryProposal.type,
        title: aiResult.memoryProposal.title,
        content: aiResult.memoryProposal.content,
        eventDate: aiResult.memoryProposal.eventDate || conv.date,
        datePrecision: aiResult.memoryProposal.datePrecision || 'exact',
        certainty: aiResult.memoryProposal.certainty || 'confirmed',
        status: 'pending',
        conversationId: convId,
        messageId: userMessage.id,
        sourceQuote: aiResult.memoryProposal.sourceQuote || content.slice(0, 160),
      });
    }

    res.json({
      userMessage,
      assistantMessage,
      memoryProposal: savedProposal,
    });
  } catch (error: any) {
    console.error('Error handling chat message:', error);
    res.status(500).json({ error: error.message || 'Lỗi khi xử lý tin nhắn của bạn' });
  }
});

// SUPPLEMENT TO A PAST DAY
app.post('/api/conversations/:id/supplement', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const convId = parseInt(req.params.id, 10);
    const userId = req.user!.uid;
    const { content, targetDate } = req.body;

    const conv = await dbRepo.getConversation(convId, userId);
    if (!conv) {
      return res.status(404).json({ error: 'Không tìm thấy cuộc trò chuyện' });
    }

    const supplementMsg = await dbRepo.addMessage(
      convId,
      userId,
      'user',
      `[Bổ sung cho ngày ${targetDate || conv.date} - Ghi nhận lúc ${new Date().toLocaleTimeString('vi-VN')}]: ${content}`,
      true,
      targetDate || conv.date
    );

    const userProfile = await dbRepo.getOrCreateUser(userId, req.user!.email, req.user!.name);
    const aiContext = await dbRepo.getAiContext(userId, content);

    const aiResult = await generateChatResponse(
      userProfile,
      `Tôi bổ sung thông tin cho ngày ${targetDate || conv.date}: ${content}`,
      conv.messages || [],
      aiContext
    );

    const assistantMsg = await dbRepo.addMessage(convId, userId, 'assistant', aiResult.reply);

    let savedProposal = null;
    if (aiResult.memoryProposal) {
      savedProposal = await dbRepo.createMemory({
        userId,
        type: aiResult.memoryProposal.type,
        title: aiResult.memoryProposal.title,
        content: aiResult.memoryProposal.content,
        eventDate: targetDate || conv.date,
        datePrecision: 'exact',
        certainty: 'confirmed',
        status: 'pending',
        conversationId: convId,
        messageId: supplementMsg.id,
        sourceQuote: content,
      });
    }

    res.json({
      userMessage: supplementMsg,
      assistantMessage: assistantMsg,
      memoryProposal: savedProposal,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DAILY SUMMARY
app.post('/api/conversations/:id/summary', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const convId = parseInt(req.params.id, 10);
    const userId = req.user!.uid;
    const conv = await dbRepo.getConversation(convId, userId);
    if (!conv) {
      return res.status(404).json({ error: 'Không tìm thấy cuộc trò chuyện' });
    }

    const user = await dbRepo.getOrCreateUser(userId, req.user!.email, req.user!.name);
    const summaryData = await generateDailySummary(user.name || 'bạn', conv.date, conv.messages || []);

    const updated = await dbRepo.updateConversationSummary(
      convId,
      userId,
      summaryData.summary,
      summaryData.title,
      true
    );

    res.json({
      conversation: updated,
      summaryData,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// MEMORIES LIFECYCLE (Layer 2)
app.get('/api/memories', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { status, type } = req.query as { status?: string; type?: string };
    const mems = await dbRepo.getMemories(req.user!.uid, { status, type });
    res.json(mems);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/memories', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const memory = await dbRepo.createMemory({
      ...req.body,
      userId: req.user!.uid,
      status: req.body.status || 'accepted',
    });
    res.json(memory);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/memories/:id/status', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { status, title, content } = req.body;
    const updated = await dbRepo.updateMemoryStatus(id, req.user!.uid, status, { title, content });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/memories/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    await dbRepo.deleteMemory(id, req.user!.uid);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// EVENTS & PLANS
app.get('/api/events', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const evts = await dbRepo.getEvents(req.user!.uid);
    res.json(evts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/plans', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const pls = await dbRepo.getPlans(req.user!.uid);
    res.json(pls);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/plans/:id/status', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { status } = req.body;
    const updated = await dbRepo.updatePlanStatus(id, req.user!.uid, status);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// CORE MEMORIES (Layer 3)
app.get('/api/core-memories', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const cores = await dbRepo.getCoreMemories(req.user!.uid);
    res.json(cores);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/core-memories', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { title, content, sourceReferences } = req.body;
    const core = await dbRepo.createCoreMemory(req.user!.uid, title, content, sourceReferences);
    res.json(core);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// SCRAPBOOKS
app.get('/api/scrapbooks', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const scrs = await dbRepo.getScrapbooks(req.user!.uid);
    res.json(scrs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/scrapbooks', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const scr = await dbRepo.createScrapbook(req.user!.uid, req.body);
    res.json(scr);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/scrapbooks/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    await dbRepo.deleteScrapbook(id, req.user!.uid);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// SEARCH & RECALL
app.get('/api/search', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { q, startDate, endDate } = req.query as { q?: string; startDate?: string; endDate?: string };
    if (!q) {
      return res.json({ memories: [], conversations: [] });
    }
    const results = await dbRepo.search(req.user!.uid, q, startDate, endDate);
    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/memories/recall', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { question } = req.body;
    const userId = req.user!.uid;
    const user = await dbRepo.getOrCreateUser(userId, req.user!.email, req.user!.name);
    const memories = await dbRepo.getMemories(userId, { status: 'accepted' });
    const conversations = await dbRepo.getConversations(userId);

    const answer = await answerMemoryQuestion(user.name || 'bạn', question, memories, conversations);
    res.json({ answer });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// VITE MIDDLEWARE OR STATIC SERVING
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist/index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`DiaryChat AI server running on port ${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
