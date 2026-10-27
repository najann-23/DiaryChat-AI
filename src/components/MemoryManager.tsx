import React, { useState, useEffect } from 'react';
import { Memory, MemoryType, MemoryStatus } from '../types/index.ts';
import { api } from '../services/api.ts';
import {
  Brain,
  Search,
  Filter,
  Check,
  X,
  Archive,
  Trash2,
  Edit2,
  Calendar,
  Sparkles,
  Link,
  Tag,
  AlertCircle,
} from 'lucide-react';

export const MemoryManager: React.FC<{ onRefreshCount?: () => void }> = ({ onRefreshCount }) => {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');

  const [editingMem, setEditingMem] = useState<Memory | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  useEffect(() => {
    loadMemories();
  }, [selectedStatus, selectedType]);

  const loadMemories = async () => {
    try {
      setLoading(true);
      const statusParam = selectedStatus === 'all' ? undefined : selectedStatus;
      const typeParam = selectedType === 'all' ? undefined : selectedType;
      const data = await api.getMemories(statusParam, typeParam);
      setMemories(data);
      if (onRefreshCount) onRefreshCount();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: number, status: 'accepted' | 'rejected' | 'archived') => {
    try {
      await api.updateMemoryStatus(id, status);
      await loadMemories();
    } catch (e: any) {
      alert(`Lỗi: ${e.message}`);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa vĩnh viễn ký ức này không?')) return;
    try {
      await api.deleteMemory(id);
      await loadMemories();
    } catch (e: any) {
      alert(`Lỗi: ${e.message}`);
    }
  };

  const handleStartEdit = (mem: Memory) => {
    setEditingMem(mem);
    setEditTitle(mem.title);
    setEditContent(mem.content);
  };

  const handleSaveEdit = async () => {
    if (!editingMem) return;
    try {
      await api.updateMemoryStatus(editingMem.id, editingMem.status, editTitle, editContent);
      setEditingMem(null);
      await loadMemories();
    } catch (e: any) {
      alert(`Lỗi lưu: ${e.message}`);
    }
  };

  const filteredMemories = memories.filter((m) => {
    if (!searchKeyword.trim()) return true;
    const term = searchKeyword.toLowerCase();
    return (
      m.title.toLowerCase().includes(term) ||
      m.content.toLowerCase().includes(term) ||
      (m.sourceQuote && m.sourceQuote.toLowerCase().includes(term))
    );
  });

  const getTypeBadge = (type: MemoryType) => {
    const config: Record<MemoryType, { label: string; bg: string; text: string }> = {
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
      <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${c.bg} ${c.text}`}>
        {c.label}
      </span>
    );
  };

  const getStatusBadge = (status: MemoryStatus) => {
    const config: Record<MemoryStatus, { label: string; bg: string; text: string }> = {
      accepted: { label: 'Đã duyệt', bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700' },
      pending: { label: 'Chờ duyệt', bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700' },
      rejected: { label: 'Từ chối', bg: 'bg-rose-50 border-rose-200', text: 'text-rose-700' },
      archived: { label: 'Lưu trữ', bg: 'bg-stone-50 border-stone-200', text: 'text-stone-600' },
    };
    const s = config[status] || config.pending;
    return (
      <span className={`px-2 py-0.5 rounded border text-[10px] font-medium ${s.bg} ${s.text}`}>
        {s.label}
      </span>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#FAF7F2] overflow-hidden">
      {/* Top Header & Search Bar */}
      <div className="p-6 border-b border-[#E8DFC8] bg-[#FAF7F2] shrink-0 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-xl font-bold text-[#3B342D] flex items-center gap-2">
              <Brain className="w-5 h-5 text-[#8B6B58]" />
              <span>Kho Ký Ức Cá Nhân (Memory Objects)</span>
            </h2>
            <p className="text-xs text-[#84786C] mt-0.5">
              Toàn quyền xem, sửa, lưu hoặc xóa những ký ức mà AI đã trích xuất từ cuộc trò chuyện của bạn
            </p>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-[#94877A] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm kiếm ký ức hoặc trích dẫn..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs bg-white border border-[#D8CCB5] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#8B6B58] w-64 text-[#352E28]"
            />
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#E8DFC8]/60">
          <div className="flex items-center gap-1 bg-[#EFE6D6] p-1 rounded-xl">
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'accepted', label: 'Đã duyệt' },
              { id: 'pending', label: 'Chờ duyệt' },
              { id: 'archived', label: 'Đã lưu trữ' },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setSelectedStatus(st.id)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  selectedStatus === st.id
                    ? 'bg-white text-[#3E352B] shadow-2xs font-bold'
                    : 'text-[#6F6457] hover:text-[#2E2721]'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-[#D9CDB8]" />

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="text-xs bg-white border border-[#D8CCB5] rounded-xl px-2.5 py-1.5 text-[#55493D] focus:outline-none"
          >
            <option value="all">Tất cả phân loại</option>
            <option value="event">Sự kiện (Event)</option>
            <option value="person">Con người (Person)</option>
            <option value="place">Địa điểm (Place)</option>
            <option value="emotion">Cảm xúc (Emotion)</option>
            <option value="plan">Kế hoạch (Plan)</option>
            <option value="reflection">Suy ngẫm (Reflection)</option>
          </select>
        </div>
      </div>

      {/* Memory Cards Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="py-12 text-center text-xs text-[#8A7D70]">Đang tải kho ký ức...</div>
        ) : filteredMemories.length === 0 ? (
          <div className="py-16 text-center max-w-sm mx-auto space-y-2">
            <Sparkles className="w-8 h-8 text-[#B0A292] mx-auto" />
            <h4 className="text-sm font-bold text-[#4B4035]">Chưa có ký ức nào phù hợp</h4>
            <p className="text-xs text-[#8A7D70]">
              Khi bạn trò chuyện, AI sẽ tự động đề xuất những sự kiện, kế hoạch hoặc con người đáng nhớ để bạn duyệt.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMemories.map((mem) => (
              <div
                key={mem.id}
                className="p-5 rounded-2xl bg-white border border-[#E5DAC4] shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    {getTypeBadge(mem.type)}
                    {getStatusBadge(mem.status)}
                  </div>

                  <h3 className="font-serif text-base font-bold text-[#3B3229] mb-1">
                    {mem.title}
                  </h3>

                  <p className="text-xs text-[#52463B] leading-relaxed mb-3">
                    {mem.content}
                  </p>

                  {mem.eventDate && (
                    <div className="flex items-center gap-1.5 text-[11px] text-[#86796D] mb-2 font-mono">
                      <Calendar className="w-3.5 h-3.5 text-[#8B6B58]" />
                      <span>{mem.eventDate} ({mem.datePrecision || 'chính xác'})</span>
                    </div>
                  )}

                  {mem.sourceQuote && (
                    <div className="p-2.5 rounded-lg bg-[#F8F3EA] border border-[#EAE0CE] text-[11px] text-[#695D51] italic leading-relaxed my-2">
                      <div className="flex items-center gap-1 text-[10px] not-italic font-bold text-[#8B6B58] mb-0.5">
                        <Link className="w-3 h-3" />
                        <span>Trích dẫn nguồn gốc:</span>
                      </div>
                      "{mem.sourceQuote}"
                    </div>
                  )}
                </div>

                {/* Actions Toolbar */}
                <div className="flex items-center justify-between pt-3 border-t border-[#EFE5D5] mt-3">
                  <div className="flex items-center gap-1">
                    {mem.status === 'pending' && (
                      <button
                        onClick={() => handleUpdateStatus(mem.id, 'accepted')}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-700 text-white text-xs font-medium hover:bg-emerald-800 transition-all shadow-2xs"
                        title="Duyệt ký ức này"
                      >
                        <Check className="w-3 h-3" />
                        <span>Duyệt</span>
                      </button>
                    )}
                    {mem.status === 'accepted' && (
                      <button
                        onClick={() => handleUpdateStatus(mem.id, 'archived')}
                        className="p-1.5 rounded-lg text-[#7F7366] hover:text-[#3B3229] hover:bg-stone-100"
                        title="Lưu trữ ký ức này"
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleStartEdit(mem)}
                      className="p-1.5 rounded-lg text-[#7F7366] hover:text-[#3B3229] hover:bg-stone-100"
                      title="Chỉnh sửa nội dung"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={() => handleDelete(mem.id)}
                    className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                    title="Xóa ký ức"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Memory Modal */}
      {editingMem && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-[#FAF7F2] rounded-2xl border border-[#E5DAC4] p-6 max-w-md w-full shadow-xl">
            <h3 className="font-serif text-base font-bold text-[#3B332A] mb-3">
              Chỉnh sửa ký ức
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-[#6D6052] uppercase block mb-1">
                  Tiêu đề ký ức:
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 bg-white border border-[#D9CDB8] rounded-xl focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-[#6D6052] uppercase block mb-1">
                  Nội dung đúc kết:
                </label>
                <textarea
                  rows={4}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white border border-[#D9CDB8] rounded-xl focus:outline-none leading-relaxed"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setEditingMem(null)}
                className="px-3 py-1.5 rounded-xl text-xs text-[#6A5E52] hover:bg-[#EFE5D5]"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-1.5 rounded-xl bg-[#8B6B58] text-white text-xs font-medium hover:bg-[#785947]"
              >
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
