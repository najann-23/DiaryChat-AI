import React, { useState, useEffect } from 'react';
import { Conversation, Message } from '../types/index.ts';
import { api } from '../services/api.ts';
import { Calendar, Sparkles, MessageCircle, Clock, ChevronRight, BookOpen, BookmarkCheck } from 'lucide-react';

interface DiaryViewProps {
  initialDate?: string;
  onOpenChatWithDate?: (id: number) => void;
}

export const DiaryView: React.FC<DiaryViewProps> = ({ initialDate, onOpenChatWithDate }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDiaryEntries();
  }, []);

  const loadDiaryEntries = async () => {
    try {
      setLoading(true);
      const list = await api.getConversations();
      setConversations(list);

      if (initialDate) {
        const found = list.find((c) => c.date === initialDate);
        if (found) {
          const detailed = await api.getConversation(found.id);
          setSelectedConv(detailed);
        }
      } else if (list.length > 0) {
        const detailed = await api.getConversation(list[0].id);
        setSelectedConv(detailed);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectConv = async (c: Conversation) => {
    try {
      const detailed = await api.getConversation(c.id);
      setSelectedConv(detailed);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex h-full bg-[#FAF7F2]">
      {/* Calendar / Day Entry List (Left side) */}
      <div className="w-80 border-r border-[#E8DFC8] bg-[#F7F2EA] flex flex-col h-full shrink-0">
        <div className="p-4 border-b border-[#E8DFC8]">
          <h2 className="font-serif text-base font-bold text-[#3B342D] flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#8B6B58]" />
            <span>Sổ Nhật Ký Hằng Ngày</span>
          </h2>
          <p className="text-xs text-[#84786C] mt-0.5">
            Lịch sử từng ngày bạn đã chia sẻ và đúc kết
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {conversations.length === 0 && !loading && (
            <div className="text-center py-8 text-xs text-[#8F8274]">
              Chưa có trang nhật ký nào. Hãy bắt đầu trò chuyện để tạo trang đầu tiên nhé!
            </div>
          )}

          {conversations.map((c) => {
            const isSelected = selectedConv?.id === c.id;
            return (
              <button
                key={c.id}
                onClick={() => handleSelectConv(c)}
                className={`w-full text-left p-3 rounded-xl border transition-all ${
                  isSelected
                    ? 'bg-white border-[#CDBEAA] shadow-xs'
                    : 'bg-[#FAF7F2] border-[#E8DFC8] hover:bg-white text-[#52463C]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono font-semibold text-[#8B6B58] flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {c.date}
                  </span>
                  {c.isCompleted && (
                    <span className="flex items-center gap-1 text-[10px] text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded font-medium">
                      <BookmarkCheck className="w-3 h-3" />
                      Đã đúc kết
                    </span>
                  )}
                </div>
                <h4 className="text-xs font-bold text-[#382E26] truncate">{c.title}</h4>
                {c.summary && (
                  <p className="text-[11px] text-[#7A6E62] line-clamp-2 mt-1 leading-relaxed">
                    {c.summary}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Diary Entry Content (Right side) */}
      <div className="flex-1 overflow-y-auto p-8">
        {selectedConv ? (
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Header */}
            <div className="border-b border-[#E8DFC8] pb-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-[#8B6B58] uppercase font-bold tracking-wider">
                  Trang nhật ký ngày {selectedConv.date}
                </span>
                {onOpenChatWithDate && (
                  <button
                    onClick={() => onOpenChatWithDate(selectedConv.id)}
                    className="flex items-center gap-1 text-xs text-[#8B6B58] hover:underline font-medium"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Mở đoạn chat gốc</span>
                  </button>
                )}
              </div>
              <h1 className="font-serif text-2xl font-bold text-[#352D26] mt-1">
                {selectedConv.title}
              </h1>
            </div>

            {/* AI Summary Section */}
            {selectedConv.summary ? (
              <div className="p-6 rounded-2xl bg-white border border-[#E5DAC4] shadow-xs">
                <div className="flex items-center gap-2 mb-3 text-amber-800 text-xs font-bold uppercase tracking-wider">
                  <Sparkles className="w-4 h-4" />
                  <span>Bản đúc kết của ngày</span>
                </div>
                <p className="font-serif text-base text-[#3C3229] leading-relaxed whitespace-pre-wrap">
                  {selectedConv.summary}
                </p>
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-[#F4ECDE] border border-[#E5DAC4] text-center">
                <p className="text-sm text-[#6C5F53] font-medium">
                  Ngày này chưa được tạo bản đúc kết tóm tắt.
                </p>
                <p className="text-xs text-[#8C8074] mt-1">
                  Bạn có thể nhấn vào nút "Đúc kết ngày hôm nay" trong màn hình trò chuyện để AI giúp bạn tóm tắt nhé!
                </p>
              </div>
            )}

            {/* Original transcript / Supplement logs */}
            <div>
              <h3 className="font-serif text-sm font-bold text-[#4B4035] mb-3 uppercase tracking-wide">
                Lịch sử lời kể trong ngày
              </h3>
              <div className="space-y-3">
                {selectedConv.messages &&
                  selectedConv.messages
                    .filter((m) => m.role === 'user')
                    .map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-4 rounded-xl border text-xs leading-relaxed ${
                          msg.isSupplement
                            ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                            : 'bg-white border-[#E8DFC8] text-[#3D332A]'
                        }`}
                      >
                        {msg.isSupplement && (
                          <div className="text-[10px] font-bold uppercase text-amber-800 mb-1">
                            Bổ sung vào {new Date(msg.createdAt).toLocaleString('vi-VN')}
                          </div>
                        )}
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-sm text-[#8A7D70]">
            Chọn một ngày ở danh sách bên trái để đọc nhật ký.
          </div>
        )}
      </div>
    </div>
  );
};
