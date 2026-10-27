import React, { useState, useEffect } from 'react';
import { ScrapbookItem } from '../types/index.ts';
import { api } from '../services/api.ts';
import { Image, Plus, Trash2, Calendar, Sparkles, X, Camera } from 'lucide-react';

export const ScrapbookView: React.FC = () => {
  const [items, setItems] = useState<ScrapbookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [imageUrl, setImageUrl] = useState('');

  useEffect(() => {
    loadScrapbooks();
  }, []);

  const loadScrapbooks = async () => {
    try {
      setLoading(true);
      const data = await api.getScrapbooks();
      setItems(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!title.trim()) return;
    try {
      await api.createScrapbook({
        title: title.trim(),
        description: description.trim(),
        date,
        imageUrl: imageUrl.trim() || undefined,
      });
      setShowAddModal(false);
      setTitle('');
      setDescription('');
      setImageUrl('');
      await loadScrapbooks();
    } catch (e: any) {
      alert(`Lỗi tạo thẻ kỷ niệm: ${e.message}`);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có muốn xóa thẻ kỷ niệm này?')) return;
    try {
      await api.deleteScrapbook(id);
      await loadScrapbooks();
    } catch (e: any) {
      alert(`Lỗi xóa: ${e.message}`);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#FAF7F2] overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-[#E8DFC8] bg-[#FAF7F2] shrink-0 flex items-center justify-between">
        <div>
          <h2 className="font-serif text-xl font-bold text-[#3B342D] flex items-center gap-2">
            <Image className="w-5 h-5 text-[#8B6B58]" />
            <span>Sổ Kỷ Niệm (Scrapbook)</span>
          </h2>
          <p className="text-xs text-[#84786C] mt-0.5">
            Lưu giữ các cột mốc và hình ảnh kỷ niệm đáng nhớ dưới dạng thẻ trực quan
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#8B6B58] text-[#FAF7F2] text-xs font-medium hover:bg-[#785947] transition-all shadow-2xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Thêm cột mốc kỷ niệm</span>
        </button>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto w-full">
        {loading ? (
          <div className="py-12 text-center text-xs text-[#8A7D70]">Đang tải sổ kỷ niệm...</div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center max-w-sm mx-auto space-y-2">
            <Sparkles className="w-8 h-8 text-[#B0A292] mx-auto" />
            <h4 className="text-sm font-bold text-[#4B4035]">Sổ kỷ niệm đang trống</h4>
            <p className="text-xs text-[#8A7D70]">
              Hãy lưu lại những khoảnh khắc, bức ảnh hoặc cột mốc đặc biệt của cuộc đời bạn tại đây.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-[#E5DAC4] overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  {item.imageUrl ? (
                    <div className="w-full h-44 bg-[#F2EADA] overflow-hidden relative">
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-full h-24 bg-[#F6EFE3] border-b border-[#EADFCB] flex items-center justify-center text-[#B2A494]">
                      <Camera className="w-6 h-6 stroke-[1.5]" />
                    </div>
                  )}

                  <div className="p-4">
                    <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#8B6B58] mb-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{item.date || 'Cột mốc'}</span>
                    </div>

                    <h3 className="font-serif text-base font-bold text-[#382E26] mb-1">
                      {item.title}
                    </h3>

                    {item.description && (
                      <p className="text-xs text-[#5C5043] leading-relaxed line-clamp-3">
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="px-4 pb-3 pt-1 flex justify-end border-t border-[#F2EBDE]">
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1 rounded text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Xóa cột mốc này"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
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
                Thêm Cột Mốc Kỷ Niệm
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-stone-500">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-[#6D6052] uppercase block mb-1">
                  Tiêu đề cột mốc:
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Ngày đầu tiên nhận việc, Buổi dã ngoại ngắm hoàng hôn"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 bg-white border border-[#D9CDB8] rounded-xl focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-[#6D6052] uppercase block mb-1">
                  Ngày diễn ra:
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white border border-[#D9CDB8] rounded-xl focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-[#6D6052] uppercase block mb-1">
                  Mô tả ngắn:
                </label>
                <textarea
                  rows={2}
                  placeholder="Cảm xúc hoặc câu chuyện nhỏ đáng nhớ..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white border border-[#D9CDB8] rounded-xl focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-[#6D6052] uppercase block mb-1">
                  Link ảnh kỷ niệm (tùy chọn):
                </label>
                <input
                  type="url"
                  placeholder="https://... hoặc để trống nếu chỉ lưu chữ"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
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
                disabled={!title.trim()}
                className="px-4 py-1.5 rounded-xl bg-[#8B6B58] text-white text-xs font-medium hover:bg-[#785947] disabled:opacity-50"
              >
                Lưu vào sổ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
