import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../services/api.ts';
import { Settings, User, Bot, Sparkles, Shield, Trash2, Database, Check, RefreshCw } from 'lucide-react';
import { AiStyle, Proactivity } from '../types/index.ts';

interface SettingsViewProps {
  dbStatus: { isPg: boolean; label: string };
  onOpenDbModal: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ dbStatus, onOpenDbModal }) => {
  const { profile, updatePreferences, signOut } = useAuth();

  const [name, setName] = useState(profile?.name || '');
  const [aiStyle, setAiStyle] = useState<AiStyle>(profile?.aiStyle || 'companion');
  const [proactivity, setProactivity] = useState<Proactivity>(profile?.proactivity || 'moderate');
  const [useOldMemories, setUseOldMemories] = useState<boolean>(profile?.useOldMemories !== false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = async () => {
    try {
      setSaving(true);
      await updatePreferences({
        name,
        aiStyle,
        proactivity,
        useOldMemories,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e: any) {
      alert(`Lỗi lưu cài đặt: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmation = prompt(
      'CẢNH BÁO: Hành động này sẽ xóa vĩnh viễn toàn bộ nhật ký, tin nhắn và kho ký ức của bạn trên hệ thống. Nhập "XÓA" để xác nhận:'
    );
    if (confirmation === 'XÓA') {
      try {
        await api.deleteAccount();
        alert('Toàn bộ dữ liệu của bạn đã được xóa sạch theo chính sách bảo mật quyền riêng tư.');
        signOut();
      } catch (e: any) {
        alert(`Lỗi xóa: ${e.message}`);
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#FAF7F2] overflow-y-auto p-6 md:p-8">
      <div className="max-w-2xl mx-auto w-full space-y-6">
        {/* Header */}
        <div>
          <h2 className="font-serif text-2xl font-bold text-[#3B342D] flex items-center gap-2">
            <Settings className="w-6 h-6 text-[#8B6B58]" />
            <span>Cá Nhân Hóa & Quyền Riêng Tư</span>
          </h2>
          <p className="text-xs text-[#84786C] mt-1">
            Điều chỉnh tính cách của DiaryChat AI và toàn quyền kiểm soát dữ liệu cá nhân của bạn
          </p>
        </div>

        {/* Database Status Card */}
        <div className="p-5 rounded-2xl bg-white border border-[#E5DAC4] shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F5EFE6] text-[#8B6B58] flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#382E26]">Cơ sở dữ liệu (PostgreSQL)</h4>
              <p className="text-xs text-[#7A6E62]">{dbStatus.label}</p>
            </div>
          </div>
          <button
            onClick={onOpenDbModal}
            className="px-3 py-1.5 rounded-xl border border-[#D9CDB8] bg-[#FAF7F2] text-xs font-semibold text-[#554A3E] hover:bg-white transition-all shadow-2xs"
          >
            Cấu hình kết nối
          </button>
        </div>

        {/* Profile Card */}
        <div className="p-6 rounded-2xl bg-white border border-[#E5DAC4] shadow-xs space-y-5">
          <h3 className="font-serif text-base font-bold text-[#382E26] flex items-center gap-2 border-b border-[#F0E6D6] pb-3">
            <User className="w-4 h-4 text-[#8B6B58]" />
            <span>Thông tin người dùng</span>
          </h3>

          <div>
            <label className="text-xs font-bold text-[#6D6052] uppercase block mb-1">
              Tên gọi của bạn (AI xưng hô khi trò chuyện):
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ví dụ: Quỳnh Trang, Minh, ..."
              className="w-full text-sm font-medium px-3.5 py-2 bg-[#FAF7F2] border border-[#D9CDB8] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#8B6B58]"
            />
          </div>
        </div>

        {/* AI Personality & Proactivity */}
        <div className="p-6 rounded-2xl bg-white border border-[#E5DAC4] shadow-xs space-y-5">
          <h3 className="font-serif text-base font-bold text-[#382E26] flex items-center gap-2 border-b border-[#F0E6D6] pb-3">
            <Bot className="w-4 h-4 text-[#8B6B58]" />
            <span>Tính cách & Phong cách AI</span>
          </h3>

          <div>
            <label className="text-xs font-bold text-[#6D6052] uppercase block mb-2">
              Phong cách trò chuyện:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[
                {
                  id: 'companion',
                  label: 'Người bạn tri kỷ',
                  desc: 'Ấm áp, tự nhiên, gần gũi, lắng nghe chân thành.',
                },
                {
                  id: 'gentle',
                  label: 'Dịu dàng & An ủi',
                  desc: 'Từ tốn, tạo cảm giác an toàn và nhẹ nhàng xoa dịu.',
                },
                {
                  id: 'curious',
                  label: 'Gợi mở & Tò mò',
                  desc: 'Hứng thú lắng nghe chi tiết, khơi gợi câu chuyện.',
                },
                {
                  id: 'reflective',
                  label: 'Chiêm nghiệm',
                  desc: 'Sâu sắc, nhìn nhận bài học và ý nghĩa cuộc sống.',
                },
              ].map((style) => (
                <button
                  key={style.id}
                  onClick={() => setAiStyle(style.id as AiStyle)}
                  className={`p-3 text-left rounded-xl border transition-all ${
                    aiStyle === style.id
                      ? 'border-[#8B6B58] bg-[#F7F2EA] shadow-2xs'
                      : 'border-[#EAE0CE] bg-[#FAF7F2] hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#382E26]">{style.label}</span>
                    {aiStyle === style.id && <Check className="w-3.5 h-3.5 text-[#8B6B58]" />}
                  </div>
                  <p className="text-[11px] text-[#7A6E62] mt-1 leading-normal">{style.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-[#6D6052] uppercase block mb-2">
              Mức độ chủ động hỏi han:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'low', label: 'Thấp', desc: 'Chỉ trả lời, không hỏi dồn' },
                { id: 'moderate', label: 'Vừa phải', desc: 'Hỏi 1 câu tự nhiên' },
                { id: 'high', label: 'Tích cực', desc: 'Chủ động gợi mở thêm' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setProactivity(p.id as Proactivity)}
                  className={`p-2.5 text-center rounded-xl border transition-all ${
                    proactivity === p.id
                      ? 'border-[#8B6B58] bg-[#F7F2EA] font-bold text-[#352C25] shadow-2xs'
                      : 'border-[#EAE0CE] bg-[#FAF7F2] text-[#695D51] hover:bg-white'
                  }`}
                >
                  <div className="text-xs font-semibold">{p.label}</div>
                  <div className="text-[10px] text-[#8C8073] mt-0.5">{p.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={useOldMemories}
                onChange={(e) => setUseOldMemories(e.target.checked)}
                className="w-4 h-4 text-[#8B6B58] rounded border-stone-300 focus:ring-0 accent-[#8B6B58]"
              />
              <div>
                <span className="text-xs font-bold text-[#3E342B]">
                  Cho phép AI sử dụng ký ức cũ để kết nối câu chuyện
                </span>
                <p className="text-[11px] text-[#84786C]">
                  AI chỉ tham chiếu các ký ức mà bạn đã duyệt chấp nhận lưu trữ.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Save button banner */}
        <div className="flex items-center justify-between">
          {saveSuccess ? (
            <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
              <Check className="w-4 h-4" />
              Đã lưu cài đặt thành công!
            </span>
          ) : (
            <span />
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#8B6B58] text-white text-xs font-bold hover:bg-[#785947] disabled:opacity-50 transition-all shadow-xs"
          >
            {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            <span>Lưu thay đổi</span>
          </button>
        </div>

        {/* Privacy & Account Deletion */}
        <div className="p-6 rounded-2xl bg-rose-50/70 border border-rose-200 shadow-2xs space-y-3">
          <h3 className="font-serif text-sm font-bold text-rose-900 flex items-center gap-2">
            <Shield className="w-4 h-4 text-rose-700" />
            <span>Quyền làm chủ dữ liệu & Xóa tài khoản</span>
          </h3>
          <p className="text-xs text-rose-800 leading-relaxed">
            Dữ liệu của bạn là của riêng bạn. DiaryChat AI không chia sẻ ký ức của bạn với bất kỳ ai. Nếu bạn muốn dừng sử dụng, bạn có thể xóa toàn bộ dữ liệu ngay lập tức.
          </p>

          <div className="pt-2">
            <button
              onClick={handleDeleteAccount}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-700 text-white text-xs font-semibold hover:bg-rose-800 transition-all shadow-2xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa vĩnh viễn tài khoản và ký ức</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
