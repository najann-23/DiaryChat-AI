import React from 'react';
import {
  MessageSquare,
  BookOpen,
  Brain,
  Sparkles,
  Calendar,
  Image,
  Settings,
  LogOut,
  LogIn,
  Database,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

export type ActiveTab = 'chat' | 'diary' | 'memories' | 'core' | 'timeline' | 'scrapbook' | 'settings';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  pendingCount?: number;
  dbStatus: { isPg: boolean; label: string };
  onOpenDbModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  pendingCount = 0,
  dbStatus,
  onOpenDbModal,
}) => {
  const { user, profile, signIn, signOut } = useAuth();

  const navItems = [
    { id: 'chat', label: 'Trò chuyện', icon: MessageSquare },
    { id: 'diary', label: 'Nhật ký ngày', icon: BookOpen },
    {
      id: 'memories',
      label: 'Kho ký ức',
      icon: Brain,
      badge: pendingCount > 0 ? pendingCount : undefined,
    },
    { id: 'core', label: 'Ký ức cốt lõi', icon: Sparkles },
    { id: 'timeline', label: 'Dòng thời gian', icon: Calendar },
    { id: 'scrapbook', label: 'Sổ kỷ niệm', icon: Image },
    { id: 'settings', label: 'Cá nhân hóa', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-[#F5EFE6] border-r border-[#E8DFC8] flex flex-col justify-between h-full select-none shrink-0 transition-all">
      {/* Brand & Slogan */}
      <div className="p-5 border-b border-[#E8DFC8]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#8B6B58] text-[#FAF7F2] flex items-center justify-center font-serif text-lg font-bold shadow-sm">
            D
          </div>
          <div>
            <h1 className="font-serif text-lg font-bold text-[#3E3832] tracking-tight">
              DiaryChat AI
            </h1>
            <p className="text-[10px] text-[#8C827A] italic leading-tight">
              Kể chuyện hôm nay, tìm lại điều đã qua
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="p-3 space-y-1 overflow-y-auto flex-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as ActiveTab)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[#EBDDC8] text-[#3A332C] font-semibold shadow-xs'
                  : 'text-[#6B6157] hover:bg-[#EFE5D3] hover:text-[#2E2822]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#8B6B58]' : 'text-[#9A8F83]'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="px-2 py-0.5 text-[11px] font-bold bg-[#D46B4F] text-white rounded-full">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Database connection badge & User Info */}
      <div className="p-3.5 border-t border-[#E8DFC8] space-y-3 bg-[#EFE7DA]/50">
        {/* DB Status Badge */}
        <button
          onClick={onOpenDbModal}
          className="w-full flex items-center justify-between p-2 rounded-lg bg-white/70 border border-[#E0D5BE] text-[11px] text-[#63584E] hover:bg-white transition-all text-left"
          title="Xem thông tin kết nối cơ sở dữ liệu PostgreSQL"
        >
          <div className="flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-[#8B6B58]" />
            <span className="font-medium truncate max-w-[140px]">{dbStatus.label}</span>
          </div>
          {dbStatus.isPg ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          )}
        </button>

        {/* User Card / Sign-in */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#DED1BE] border border-[#CBBDA8] flex items-center justify-center text-xs font-bold text-[#564C42] shrink-0">
              {profile?.name ? profile.name.charAt(0).toUpperCase() : 'B'}
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-[#3A332C] truncate">
                {profile?.name || 'Bạn'}
              </p>
              <p className="text-[10px] text-[#8A7F74] truncate">
                {user ? user.email : 'Tài khoản cá nhân'}
              </p>
            </div>
          </div>

          {user ? (
            <button
              onClick={signOut}
              title="Đăng xuất"
              className="p-1.5 rounded-lg text-[#8C827A] hover:text-[#A84234] hover:bg-white/80 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={signIn}
              title="Đăng nhập Google"
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#8B6B58] text-[#FAF7F2] text-xs font-medium hover:bg-[#785947] transition-all shadow-2xs"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Đăng nhập</span>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
