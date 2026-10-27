import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Sparkles,
  Plus,
  BookMarked,
  Check,
  X,
  Edit2,
  Calendar,
  Search,
  Clock,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  FileText,
  BookmarkPlus,
} from 'lucide-react';
import { Conversation, Message, Memory } from '../types/index.ts';
import { api } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface ChatViewProps {
  onGoToDiary?: (date: string) => void;
  onRefreshMemories?: () => void;
}

export const ChatView: React.FC<ChatViewProps> = ({ onGoToDiary, onRefreshMemories }) => {
  const { profile } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConv, setCurrentConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pending memory proposals in current chat
  const [pendingProposals, setPendingProposals] = useState<Memory[]>([]);
  const [editingMemory, setEditingMemory] = useState<{ id: number; title: string; content: string } | null>(null);

  // Supplement modal state
  const [showSupplementModal, setShowSupplementModal] = useState(false);
  const [supplementDate, setSupplementDate] = useState('');
  const [supplementText, setSupplementText] = useState('');

  // Daily Summary state
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [dailySummary, setDailySummary] = useState<{ title: string; summary: string; highlights: string[] } | null>(null);

  // Recall search over past memories
  const [showRecallBox, setShowRecallBox] = useState(false);
  const [recallQuestion, setRecallQuestion] = useState('');
  const [recallAnswer, setRecallAnswer] = useState<string | null>(null);
  const [recallLoading, setRecallLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load conversations
  const loadConversations = async (selectId?: number) => {
    try {
      const list = await api.getConversations();
      setConversations(list);

      const today = new Date().toISOString().split('T')[0];
      if (selectId) {
        await loadConversation(selectId);
      } else if (list.length > 0) {
        // Find today's or pick the first
        const todayConv = list.find((c) => c.date === today);
        await loadConversation(todayConv ? todayConv.id : list[0].id);
      } else {
        // Create today's conversation automatically
        const newC = await api.createConversation(`Ngày ${today}`, today);
        setConversations([newC]);
        await loadConversation(newC.id);
      }
    } catch (err: any) {
      console.error('Failed to load conversations:', err);
    }
  };

  const loadConversation = async (id: number) => {
    try {
      setError(null);
      const data = await api.getConversation(id);
      setCurrentConv(data);
      setMessages(data.messages || []);
      setSupplementDate(data.date);

      // Load pending memories for this conversation
      const mems = await api.getMemories('pending');
      const convMems = mems.filter((m) => m.conversationId === id);
      setPendingProposals(convMems);
    } catch (err: any) {
      setError('Không thể tải cuộc trò chuyện');
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleCreateNewChat = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const newC = await api.createConversation(`Trò chuyện mới ngày ${today}`, today);
      await loadConversations(newC.id);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || !currentConv || loading) return;

    const messageContent = inputText.trim();
    setInputText('');
    setError(null);
    setLoading(true);

    // Optimistic UI for user message
    const tempUserMsg: Message = {
      id: Date.now(),
      conversationId: currentConv.id,
      userId: currentConv.userId,
      role: 'user',
      content: messageContent,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const result = await api.sendMessage(currentConv.id, messageContent);
      setMessages((prev) => [...prev.slice(0, -1), result.userMessage, result.assistantMessage]);

      if (result.memoryProposal) {
        setPendingProposals((prev) => [result.memoryProposal, ...prev]);
        if (onRefreshMemories) onRefreshMemories();
      }

      // Update current conversation title if updated
      const updated = await api.getConversation(currentConv.id);
      setCurrentConv(updated);
    } catch (err: any) {
      setError(err.message || 'Lỗi khi gửi tin nhắn');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Memory proposal approval flow (Lưu / Từ chối / Sửa)
  const handleApproveMemory = async (memId: number) => {
    try {
      await api.updateMemoryStatus(memId, 'accepted');
      setPendingProposals((prev) => prev.filter((m) => m.id !== memId));
      if (onRefreshMemories) onRefreshMemories();
    } catch (e: any) {
      alert(`Không thể duyệt ký ức: ${e.message}`);
    }
  };

  const handleRejectMemory = async (memId: number) => {
    try {
      await api.updateMemoryStatus(memId, 'rejected');
      setPendingProposals((prev) => prev.filter((m) => m.id !== memId));
      if (onRefreshMemories) onRefreshMemories();
    } catch (e: any) {
      alert(`Không thể từ chối ký ức: ${e.message}`);
    }
  };

  const handleSaveMemoryEdit = async () => {
    if (!editingMemory) return;
    try {
      await api.updateMemoryStatus(editingMemory.id, 'accepted', editingMemory.title, editingMemory.content);
      setPendingProposals((prev) => prev.filter((m) => m.id !== editingMemory.id));
      setEditingMemory(null);
      if (onRefreshMemories) onRefreshMemories();
    } catch (e: any) {
      alert(`Lỗi khi lưu chỉnh sửa: ${e.message}`);
    }
  };

  // Supplement submission
  const handleSendSupplement = async () => {
    if (!supplementText.trim() || !currentConv) return;
    try {
      setLoading(true);
      setShowSupplementModal(false);
      const res = await api.sendSupplement(currentConv.id, supplementText, supplementDate);
      setMessages((prev) => [...prev, res.userMessage, res.assistantMessage]);
      if (res.memoryProposal) {
        setPendingProposals((prev) => [res.memoryProposal, ...prev]);
        if (onRefreshMemories) onRefreshMemories();
      }
      setSupplementText('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Daily Summary trigger
  const handleGenerateSummary = async () => {
    if (!currentConv) return;
    try {
      setSummaryLoading(true);
      setShowSummaryModal(true);
      const res = await api.generateSummary(currentConv.id);
      setDailySummary(res.summaryData);
      setCurrentConv(res.conversation);
    } catch (e: any) {
      alert(`Lỗi tạo bản tóm tắt: ${e.message}`);
      setShowSummaryModal(false);
    } finally {
      setSummaryLoading(false);
    }
  };

  // Recall memory search
  const handleRecallMemory = async () => {
    if (!recallQuestion.trim()) return;
    try {
      setRecallLoading(true);
      setRecallAnswer(null);
      const res = await api.recallMemory(recallQuestion.trim());
      setRecallAnswer(res.answer);
    } catch (e: any) {
      setRecallAnswer(`Không thể tra cứu: ${e.message}`);
    } finally {
      setRecallLoading(false);
    }
  };

  const getMemoryTypeBadge = (type: string) => {
    const config: Record<string, { label: string; bg: string; text: string }> = {
      event: { label: 'Sự kiện', bg: 'bg-amber-100', text: 'text-amber-800' },
      person: { label: 'Con người', bg: 'bg-emerald-100', text: 'text-emerald-800' },
      place: { label: 'Địa điểm', bg: 'bg-blue-100', text: 'text-blue-800' },
      emotion: { label: 'Cảm xúc', bg: 'bg-rose-100', text: 'text-rose-800' },
      plan: { label: 'Kế hoạch', bg: 'bg-purple-100', text: 'text-purple-800' },
      reflection: { label: 'Suy ngẫm', bg: 'bg-teal-100', text: 'text-teal-800' },
      memory: { label: 'Ký ức', bg: 'bg-stone-100', text: 'text-stone-800' },
    };
    const c = config[type] || config.memory;
    return (
      <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${c.bg} ${c.text}`}>
        {c.label}
      </span>
    );
  };

  return (
    <div className="flex h-full bg-[#FAF7F2]">
      {/* Conversation List Drawer (Left sub-panel) */}
      <div className="w-64 border-r border-[#E8DFC8] bg-[#F7F2EA] flex flex-col h-full shrink-0 hidden md:flex">
        <div className="p-3.5 border-b border-[#E8DFC8] flex items-center justify-between">
          <span className="text-xs font-bold text-[#63574A] uppercase tracking-wider">
            Nhật ký trò chuyện
          </span>
          <button
            onClick={handleCreateNewChat}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#8B6B58] text-[#FAF7F2] text-xs font-medium hover:bg-[#785947] transition-all shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Mới</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.map((conv) => {
            const isSelected = currentConv?.id === conv.id;
            return (
              <button
                key={conv.id}
                onClick={() => loadConversation(conv.id)}
                className={`w-full text-left p-2.5 rounded-xl transition-all ${
                  isSelected
                    ? 'bg-[#EAE0D0] text-[#362E27] font-medium shadow-2xs'
                    : 'text-[#6C6156] hover:bg-[#F0E6D6]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#8A7E72] font-mono">{conv.date}</span>
                  {conv.isCompleted && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-medium">
                      Đã đúc kết
                    </span>
                  )}
                </div>
                <p className="text-xs truncate font-medium mt-0.5 text-[#3E362E]">
                  {conv.title || 'Cuộc trò chuyện'}
                </p>
              </button>
            );
          })}
        </div>

        {/* Quick Recall prompt trigger */}
        <div className="p-3 border-t border-[#E8DFC8] bg-[#F1E9DC]">
          <button
            onClick={() => setShowRecallBox(!showRecallBox)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white/80 border border-[#E0D5BE] text-xs font-medium text-[#5C5044] hover:bg-white transition-all shadow-2xs"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-[#8B6B58]" />
              <span>Tìm lại chuyện cũ...</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-[#9A8F83]" />
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Header Bar */}
        <div className="px-6 py-3.5 border-b border-[#E8DFC8] bg-[#FAF7F2] flex items-center justify-between shrink-0">
          <div>
            <h2 className="font-serif text-base font-bold text-[#3B342D] tracking-tight">
              {currentConv ? currentConv.title : 'Đang tải nhật ký...'}
            </h2>
            <div className="flex items-center gap-2 text-xs text-[#84786D]">
              <Calendar className="w-3.5 h-3.5" />
              <span>Ngày {currentConv?.date}</span>
              {currentConv?.isCompleted && (
                <span className="text-emerald-700 font-medium">• Đã hoàn thành ngày</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Supplement info button */}
            <button
              onClick={() => setShowSupplementModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#DFD3BE] bg-white/70 text-xs font-medium text-[#5E5246] hover:bg-white transition-all shadow-2xs"
              title="Kể thêm hoặc bổ sung thông tin cho ngày này mà không làm xáo trộn nhật ký cũ"
            >
              <BookmarkPlus className="w-3.5 h-3.5 text-[#8B6B58]" />
              <span className="hidden sm:inline">Bổ sung thông tin</span>
            </button>

            {/* Daily Summary Button */}
            <button
              onClick={handleGenerateSummary}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#8B6B58] text-[#FAF7F2] text-xs font-medium hover:bg-[#785947] transition-all shadow-xs"
              title="Đúc kết lại những điều đã tâm sự hôm nay thành một trang nhật ký hoàn chỉnh"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Đúc kết ngày hôm nay</span>
            </button>
          </div>
        </div>

        {/* Recall Dialog Dropdown (if toggled) */}
        {showRecallBox && (
          <div className="p-4 bg-[#F2EBDE] border-b border-[#DFD3BE] animate-in fade-in duration-150">
            <div className="max-w-2xl mx-auto space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#5A4E42]">
                  🔍 Tìm lại chuyện cũ (Hỏi AI dựa trên ký ức đã lưu)
                </span>
                <button
                  onClick={() => setShowRecallBox(false)}
                  className="text-xs text-[#8C8074] hover:text-[#3E352B]"
                >
                  Đóng
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ví dụ: Lần đầu mình nhắc về chuyến đi Đà Lạt? Hôm đó mình đã kể gì?"
                  value={recallQuestion}
                  onChange={(e) => setRecallQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRecallMemory()}
                  className="flex-1 px-3 py-1.5 text-xs bg-white border border-[#D8CCB5] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#8B6B58]"
                />
                <button
                  onClick={handleRecallMemory}
                  disabled={recallLoading}
                  className="px-3 py-1.5 bg-[#8B6B58] text-white text-xs font-medium rounded-lg hover:bg-[#785947] disabled:opacity-50"
                >
                  {recallLoading ? 'Đang tìm...' : 'Tra cứu'}
                </button>
              </div>
              {recallAnswer && (
                <div className="p-3 bg-white rounded-lg border border-[#E0D5BE] text-xs text-[#3D352D] leading-relaxed whitespace-pre-wrap">
                  {recallAnswer}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
          {/* Welcome greeting card if conversation is empty */}
          {messages.length === 0 && !loading && (
            <div className="max-w-lg mx-auto my-8 p-6 rounded-2xl bg-[#F6EFE3] border border-[#E5DAC4] text-center shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-[#E8DAC2] text-[#8B6B58] flex items-center justify-center mx-auto mb-3">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-lg font-bold text-[#3E362E]">
                Chào {profile?.name || 'bạn'}!
              </h3>
              <p className="text-sm text-[#6A5F54] mt-1 leading-relaxed">
                Hôm nay của bạn thế nào? Có chuyện gì vui, một kỷ niệm đáng nhớ hay điều gì khiến bạn băn khoăn không?
              </p>
              <p className="text-xs text-[#8C8176] mt-3 italic">
                Cứ kể tự nhiên như đang trò chuyện với một người bạn lắng nghe nhé.
              </p>
            </div>
          )}

          {/* Render Messages */}
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-2xl px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-2xs ${
                    isUser
                      ? 'bg-[#8B6B58] text-[#FAF7F2] rounded-br-xs'
                      : 'bg-white border border-[#EADFCB] text-[#342D26] rounded-bl-xs'
                  }`}
                >
                  {msg.isSupplement && (
                    <div className="mb-1.5 px-2 py-0.5 rounded bg-amber-500/20 text-amber-200 text-[10px] font-bold uppercase tracking-wider w-fit">
                      Nội dung bổ sung sau
                    </div>
                  )}
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
                <span className="text-[10px] text-[#A2978A] mt-1 px-1">
                  {new Date(msg.createdAt).toLocaleTimeString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            );
          })}

          {/* Pending Memory Proposals (Consent Gate) */}
          {pendingProposals.length > 0 && (
            <div className="space-y-3 my-4">
              {pendingProposals.map((mem) => (
                <div
                  key={mem.id}
                  className="max-w-2xl mx-auto p-4 rounded-2xl bg-amber-50/90 border border-amber-200/90 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-700" />
                      <span className="text-xs font-bold text-amber-900">
                        Đề xuất ghi nhớ
                      </span>
                      {getMemoryTypeBadge(mem.type)}
                      {mem.eventDate && (
                        <span className="text-[11px] text-amber-800/80 font-mono">
                          • {mem.eventDate}
                        </span>
                      )}
                    </div>
                  </div>

                  {editingMemory?.id === mem.id ? (
                    <div className="space-y-2 mt-2">
                      <input
                        type="text"
                        value={editingMemory.title}
                        onChange={(e) => setEditingMemory({ ...editingMemory, title: e.target.value })}
                        className="w-full text-xs font-semibold px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg focus:outline-none"
                      />
                      <textarea
                        value={editingMemory.content}
                        onChange={(e) => setEditingMemory({ ...editingMemory, content: e.target.value })}
                        rows={2}
                        className="w-full text-xs px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg focus:outline-none"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditingMemory(null)}
                          className="px-2.5 py-1 rounded text-xs text-stone-600 hover:bg-stone-200"
                        >
                          Hủy
                        </button>
                        <button
                          onClick={handleSaveMemoryEdit}
                          className="px-3 py-1 rounded bg-[#8B6B58] text-white text-xs font-medium hover:bg-[#785947]"
                        >
                          Lưu & Duyệt
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <h4 className="text-xs font-bold text-[#3B3229] mb-1">{mem.title}</h4>
                      <p className="text-xs text-[#52463B] leading-relaxed mb-2">{mem.content}</p>

                      {mem.sourceQuote && (
                        <blockquote className="text-[11px] italic text-[#7A6D60] border-l-2 border-amber-300 pl-2.5 my-2">
                          "{mem.sourceQuote}"
                        </blockquote>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-amber-200/60 mt-3">
                        <span className="text-[10px] text-amber-800 italic">
                          Chỉ được lưu vào ký ức lâu dài khi bạn đồng ý:
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setEditingMemory({ id: mem.id, title: mem.title, content: mem.content })}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-[#685C4F] hover:bg-amber-100/80 transition-all"
                            title="Sửa tên hoặc nội dung ký ức"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Sửa</span>
                          </button>
                          <button
                            onClick={() => handleRejectMemory(mem.id)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-rose-700 hover:bg-rose-100/80 transition-all"
                            title="Không lưu điều này vào ký ức"
                          >
                            <X className="w-3 h-3" />
                            <span>Bỏ qua</span>
                          </button>
                          <button
                            onClick={() => handleApproveMemory(mem.id)}
                            className="flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-700 text-white text-xs font-medium hover:bg-emerald-800 transition-all shadow-2xs"
                            title="Đồng ý lưu vào kho ký ức"
                          >
                            <Check className="w-3 h-3" />
                            <span>Lưu vào ký ức</span>
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Loading indicator */}
          {loading && (
            <div className="flex items-center gap-2 text-xs text-[#8A7D70] italic px-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#8B6B58]" />
              <span>AI đang lắng nghe và suy ngẫm...</span>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between text-xs text-rose-800">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-xs underline text-rose-700 hover:text-rose-900"
              >
                Đóng
              </button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Bottom Input Area */}
        <div className="p-4 border-t border-[#E8DFC8] bg-[#FAF7F2] shrink-0">
          <div className="max-w-3xl mx-auto flex items-end gap-2.5 bg-white p-2 rounded-2xl border border-[#DFD4BF] shadow-xs focus-within:border-[#8B6B58] transition-all">
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Kể chuyện hôm nay... (Enter để gửi, Shift + Enter xuống dòng)"
              className="flex-1 max-h-36 resize-none p-2 text-sm text-[#352E28] placeholder-[#9E9285] bg-transparent focus:outline-none"
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputText.trim() || loading}
              className="p-2.5 rounded-xl bg-[#8B6B58] text-[#FAF7F2] hover:bg-[#785947] disabled:opacity-40 transition-all shadow-2xs shrink-0"
              title="Gửi tin nhắn"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Supplement Modal */}
      {showSupplementModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-[#FAF7F2] rounded-2xl border border-[#E5DAC4] p-6 max-w-md w-full shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-serif text-base font-bold text-[#3B332A] mb-1">
              Bổ sung thông tin cho ngày {currentConv?.date}
            </h3>
            <p className="text-xs text-[#7A6E62] mb-4">
              Thông tin bổ sung sẽ được lưu kèm mốc thời gian ghi nhận riêng và không ghi đè nội dung gốc.
            </p>
            <textarea
              rows={4}
              value={supplementText}
              onChange={(e) => setSupplementText(e.target.value)}
              placeholder="Ví dụ: Bổ sung: Lúc chiều sau khi về mình còn gặp lại bạn cũ..."
              className="w-full text-xs p-3 bg-white border border-[#D9CDB8] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#8B6B58] mb-4 text-[#352E28]"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowSupplementModal(false)}
                className="px-3 py-1.5 rounded-xl text-xs text-[#6A5E52] hover:bg-[#EFE5D5]"
              >
                Hủy
              </button>
              <button
                onClick={handleSendSupplement}
                disabled={!supplementText.trim()}
                className="px-4 py-1.5 rounded-xl bg-[#8B6B58] text-white text-xs font-medium hover:bg-[#785947] disabled:opacity-50"
              >
                Gửi bổ sung
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Daily Summary Modal */}
      {showSummaryModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-[#FAF7F2] rounded-2xl border border-[#E5DAC4] p-6 max-w-lg w-full shadow-xl max-h-[85vh] overflow-y-auto">
            {summaryLoading ? (
              <div className="py-12 text-center space-y-3">
                <RefreshCw className="w-8 h-8 animate-spin text-[#8B6B58] mx-auto" />
                <p className="text-sm font-medium text-[#4B4035]">
                  AI đang đúc kết trang nhật ký ngày {currentConv?.date}...
                </p>
              </div>
            ) : dailySummary ? (
              <div>
                <div className="flex items-center justify-between border-b border-[#E8DFC8] pb-3 mb-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                      Trang nhật ký đã đúc kết
                    </span>
                    <h3 className="font-serif text-lg font-bold text-[#3B332A]">
                      {dailySummary.title}
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowSummaryModal(false)}
                    className="p-1 rounded-lg text-stone-500 hover:bg-stone-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-white border border-[#E5DAC4]">
                    <p className="text-sm text-[#3E342B] leading-relaxed whitespace-pre-wrap font-serif">
                      {dailySummary.summary}
                    </p>
                  </div>

                  {dailySummary.highlights && dailySummary.highlights.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-[#5C5043] mb-2 uppercase tracking-wide">
                        Điểm nhấn hôm nay:
                      </h4>
                      <ul className="space-y-1 text-xs text-[#554A3E]">
                        {dailySummary.highlights.map((h, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-amber-600 font-bold">•</span>
                            <span>{h}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="pt-3 border-t border-[#E8DFC8] flex justify-between items-center">
                    <span className="text-xs text-[#8A7D70]">
                      Đã lưu vào danh mục Nhật ký ngày
                    </span>
                    {onGoToDiary && (
                      <button
                        onClick={() => {
                          setShowSummaryModal(false);
                          onGoToDiary(currentConv!.date);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-[#8B6B58] text-white text-xs font-medium hover:bg-[#785947]"
                      >
                        Mở xem trong Sổ nhật ký
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
