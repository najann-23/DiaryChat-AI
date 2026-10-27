import React, { useState, useEffect } from 'react';
import { EventItem, PlanItem, PlanStatus } from '../types/index.ts';
import { api } from '../services/api.ts';
import { Calendar, CheckCircle2, Clock, ListTodo, Sparkles, Plus, AlertCircle } from 'lucide-react';

export const TimelineView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'events' | 'plans'>('events');
  const [events, setEvents] = useState<EventItem[]>([]);
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [evts, pls] = await Promise.all([api.getEvents(), api.getPlans()]);
      setEvents(evts);
      setPlans(pls);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePlanStatus = async (id: number, status: PlanStatus) => {
    try {
      await api.updatePlanStatus(id, status);
      await loadData();
    } catch (e: any) {
      alert(`Lỗi cập nhật kế hoạch: ${e.message}`);
    }
  };

  const getPlanStatusBadge = (status: PlanStatus) => {
    const config: Record<PlanStatus, { label: string; bg: string; text: string }> = {
      pending: { label: 'Chờ thực hiện', bg: 'bg-amber-100', text: 'text-amber-800' },
      in_progress: { label: 'Đang làm', bg: 'bg-blue-100', text: 'text-blue-800' },
      completed: { label: 'Hoàn thành', bg: 'bg-emerald-100', text: 'text-emerald-800' },
      cancelled: { label: 'Đã hủy', bg: 'bg-stone-100', text: 'text-stone-700' },
    };
    const c = config[status] || config.pending;
    return (
      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${c.bg} ${c.text}`}>
        {c.label}
      </span>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#FAF7F2] overflow-hidden">
      {/* Top Header */}
      <div className="p-6 border-b border-[#E8DFC8] bg-[#FAF7F2] shrink-0 space-y-4">
        <div>
          <h2 className="font-serif text-xl font-bold text-[#3B342D] flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#8B6B58]" />
            <span>Dòng Thời Gian & Kế Hoạch</span>
          </h2>
          <p className="text-xs text-[#84786C] mt-0.5">
            Phân định rõ ràng: Sự kiện đã xảy ra (Events) vs Dự định tương lai (Plans)
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-1 bg-[#EFE6D6] p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveSubTab('events')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeSubTab === 'events'
                ? 'bg-white text-[#3E352B] shadow-2xs'
                : 'text-[#6F6457] hover:text-[#2E2721]'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-[#8B6B58]" />
            <span>Sự kiện đã xảy ra ({events.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('plans')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeSubTab === 'plans'
                ? 'bg-white text-[#3E352B] shadow-2xs'
                : 'text-[#6F6457] hover:text-[#2E2721]'
            }`}
          >
            <ListTodo className="w-3.5 h-3.5 text-purple-700" />
            <span>Kế hoạch tương lai ({plans.length})</span>
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6 max-w-3xl mx-auto w-full">
        {loading ? (
          <div className="py-12 text-center text-xs text-[#8A7D70]">Đang tải dữ liệu...</div>
        ) : activeSubTab === 'events' ? (
          // EVENTS TIMELINE
          events.length === 0 ? (
            <div className="py-16 text-center max-w-sm mx-auto space-y-2">
              <Sparkles className="w-8 h-8 text-[#B0A292] mx-auto" />
              <h4 className="text-sm font-bold text-[#4B4035]">Chưa có sự kiện nào được ghi nhận</h4>
              <p className="text-xs text-[#8A7D70]">
                Khi bạn kể cho AI về những sự việc diễn ra và duyệt đề xuất, dòng thời gian sẽ tự động xuất hiện tại đây.
              </p>
            </div>
          ) : (
            <div className="relative border-l-2 border-[#E5DAC4] ml-4 pl-6 space-y-6">
              {events.map((evt) => (
                <div key={evt.id} className="relative group">
                  {/* Timeline dot */}
                  <div className="absolute -left-[31px] top-1.5 w-3.5 h-3.5 rounded-full bg-[#8B6B58] border-2 border-[#FAF7F2] shadow-2xs" />

                  <div className="p-4 rounded-2xl bg-white border border-[#E5DAC4] shadow-2xs hover:shadow-xs transition-all">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono font-bold text-[#8B6B58]">
                        {evt.eventDate || 'Thời điểm tương đối'}
                      </span>
                      <span className="text-[10px] text-[#9A8D7E]">
                        {evt.datePrecision === 'exact' ? 'Ngày chính xác' : 'Áng chừng'}
                      </span>
                    </div>
                    <h3 className="font-serif text-base font-bold text-[#3B3229] mb-1">
                      {evt.title}
                    </h3>
                    {evt.description && (
                      <p className="text-xs text-[#5C5043] leading-relaxed">
                        {evt.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          // PLANS LIST
          plans.length === 0 ? (
            <div className="py-16 text-center max-w-sm mx-auto space-y-2">
              <ListTodo className="w-8 h-8 text-[#B0A292] mx-auto" />
              <h4 className="text-sm font-bold text-[#4B4035]">Chưa có kế hoạch nào</h4>
              <p className="text-xs text-[#8A7D70]">
                Hãy chia sẻ với AI về những dự định, mục tiêu hay kế hoạch sắp tới của bạn nhé!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {plans.map((pl) => (
                <div
                  key={pl.id}
                  className="p-4 rounded-2xl bg-white border border-[#E5DAC4] shadow-2xs hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {getPlanStatusBadge(pl.status)}
                      {pl.targetDate && (
                        <span className="text-xs font-mono text-[#8B6B58] font-medium">
                          Mục tiêu: {pl.targetDate}
                        </span>
                      )}
                    </div>
                    <h3 className={`font-serif text-sm font-bold text-[#3B3229] ${pl.status === 'completed' ? 'line-through opacity-70' : ''}`}>
                      {pl.title}
                    </h3>
                    {pl.description && (
                      <p className="text-xs text-[#635749] mt-0.5">{pl.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {pl.status !== 'completed' && (
                      <button
                        onClick={() => handleUpdatePlanStatus(pl.id, 'completed')}
                        className="px-2.5 py-1 rounded-lg bg-emerald-700 text-white text-xs font-medium hover:bg-emerald-800 transition-all flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Xong</span>
                      </button>
                    )}
                    {pl.status === 'pending' && (
                      <button
                        onClick={() => handleUpdatePlanStatus(pl.id, 'in_progress')}
                        className="px-2.5 py-1 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-all"
                      >
                        Bắt đầu
                      </button>
                    )}
                    {pl.status === 'completed' && (
                      <button
                        onClick={() => handleUpdatePlanStatus(pl.id, 'pending')}
                        className="px-2 py-1 rounded-lg text-xs text-stone-600 hover:bg-stone-100"
                      >
                        Làm lại
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
};
