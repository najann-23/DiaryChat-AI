import React, { useState, useEffect } from 'react';
import { CoreMemory } from '../types/index.ts';
import { api } from '../services/api.ts';
import { Sparkles, Plus, Bookmark, Link, X } from 'lucide-react';

export const CoreMemoryView: React.FC = () => {
  const [coreMemories, setCoreMemories] = useState<CoreMemory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newSource, setNewSource] = useState('');

  useEffect(() => {
    loadCoreMemories();
  }, []);

  const loadCoreMemories = async () => {
    try {
      setLoading(true);
      const data = await api.getCoreMemories();
      setCoreMemories(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    try {
      await api.createCoreMemory(newTitle.trim(), newContent.trim(), newSource.trim());
      setShowAddModal(false);
      setNewTitle('');
      setNewContent('');
      setNewSource('');
      await loadCoreMemories();
    } catch (e: any) {
      alert(`Lỗi tạo ký ức cốt lõi: ${e.message}`);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#FAF7F2] overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-[#E8DFC8] bg-[#FAF7F2] shrink-0 flex items-center justify-between">
        <div>
          <h2 className="font-serif text-xl font-bold text-[#3B342D] flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#8B6B58]" />
            <span>Ký Ức Cốt Lõi (Core Memory)</span>
          </h2>
          <p className="text-xs text-[#84786C] mt-0.5">
            Lớp 3: Những giá trị dài hạn, thói quen, mục tiêu xuyên suốt và mối quan hệ quan trọng nhất của bạn
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#8B6B58] text-[#FAF7F2] text-xs font-medium hover:bg-[#785947] transition-all shadow-2xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Tạo ký ức cốt lõi</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full">
        {loading ? (
          <div className="py-12 text-center text-xs text-[#8A7D70]">Đang tải ký ức cốt lõi...</div>
        ) : coreMemories.length === 0 ? (
          <div className="py-16 text-center max-w-sm mx-auto space-y-2">
            <Sparkles className="w-8 h-8 text-[#B0A292] mx-auto" />
            <h4 className="text-sm font-bold text-[#4B4035]">Chưa có ký ức cốt lõi nào</h4>
            <p className="text-xs text-[#8A7D70]">
              Ký ức cốt lõi là những điều nền tảng để AI luôn thấu hiểu con người bạn khi trò chuyện. Bạn có thể tự tạo hoặc để AI đúc kết sau nhiều cuộc trò chuyện.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {coreMemories.map((core) => (
              <div
                key={core.id}
                className="p-5 rounded-2xl bg-white border border-[#E5DAC4] shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2 h-2 rounded-full bg-amber-600" />
                    <h3 className="font-serif text-base font-bold text-[#382E26]">
                      {core.title}
                    </h3>
                  </div>
                  <p className="text-xs text-[#52463B] leading-relaxed mb-3">
                    {core.content}
                  </p>

                  {core.sourceReferences && (
                    <div className="p-2.5 rounded-lg bg-[#F8F3EA] border border-[#EAE0CE] text-[11px] text-[#695D51] leading-relaxed">
                      <div className="flex items-center gap-1 font-bold text-[#8B6B58] text-[10px] mb-0.5">
                        <Link className="w-3 h-3" />
                        <span>Nguồn liên kết:</span>
                      </div>
                      {core.sourceReferences}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-[#EFE5D5] mt-3 flex items-center justify-between text-[11px] text-[#9A8D7E]">
                  <span>Cập nhật: {new Date(core.updatedAt).toLocaleDateString('vi-VN')}</span>
                  <span className="font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    Đang hoạt động
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-[#FAF7F2] rounded-2xl border border-[#E5DAC4] p-6 max-w-md w-full shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-serif text-base font-bold text-[#3B332A]">
                Tạo Ký Ức Cốt Lõi Mới
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-stone-500">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-[#6D6052] uppercase block mb-1">
                  Chủ đề / Tiêu đề:
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Mục tiêu trở thành lập trình viên, Sở thích pha cà phê thủ công"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 bg-white border border-[#D9CDB8] rounded-xl focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-[#6D6052] uppercase block mb-1">
                  Nội dung chi tiết đúc kết:
                </label>
                <textarea
                  rows={3}
                  placeholder="Mô tả thông tin dài hạn quan trọng về bạn..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white border border-[#D9CDB8] rounded-xl focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-[#6D6052] uppercase block mb-1">
                  Nguồn tham chiếu (tùy chọn):
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Đúc kết từ các câu chuyện tháng 10/2026"
                  value={newSource}
                  onChange={(e) => setNewSource(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white border border-[#D9CDB8] rounded-xl focus:outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-3 py-1.5 rounded-xl text-xs text-[#6A5E52] hover:bg-[#EFE5D5]"
              >
                Hủy
              </button>
              <button
                onClick={handleCreate}
                disabled={!newTitle.trim() || !newContent.trim()}
                className="px-4 py-1.5 rounded-xl bg-[#8B6B58] text-white text-xs font-medium hover:bg-[#785947] disabled:opacity-50"
              >
                Tạo ký ức
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
