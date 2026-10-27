import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Sidebar, ActiveTab } from './components/Sidebar.tsx';
import { ChatView } from './components/ChatView.tsx';
import { DiaryView } from './components/DiaryView.tsx';
import { MemoryManager } from './components/MemoryManager.tsx';
import { CoreMemoryView } from './components/CoreMemoryView.tsx';
import { TimelineView } from './components/TimelineView.tsx';
import { ScrapbookView } from './components/ScrapbookView.tsx';
import { SettingsView } from './components/SettingsView.tsx';
import { PostgresSetupModal } from './components/PostgresSetupModal.tsx';
import { api } from './services/api.ts';
import {
  MessageSquare,
  BookOpen,
  Brain,
  Sparkles,
  Calendar,
  Image as ImageIcon,
  Settings as SettingsIcon,
} from 'lucide-react';

function AppContent() {
  const { loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('chat');
  const [pendingCount, setPendingCount] = useState(0);
  const [dbStatus, setDbStatus] = useState<{ isPg: boolean; label: string }>({
    isPg: false,
    label: 'Đang kiểm tra kết nối...',
  });
  const [isDbModalOpen, setIsDbModalOpen] = useState(false);
  const [diaryDateToOpen, setDiaryDateToOpen] = useState<string | undefined>(undefined);
  const [chatConvIdToOpen, setChatConvIdToOpen] = useState<number | undefined>(undefined);

  const checkHealth = async () => {
    try {
      const data = await api.getHealth();
      const isPg = data.database?.includes('Connected');
      setDbStatus({
        isPg,
        label: isPg ? 'PostgreSQL (Đã kết nối)' : 'Lưu trữ bền vững (Chờ URL Postgres)',
      });
    } catch {
      setDbStatus({
        isPg: false,
        label: 'Lưu trữ cục bộ bền vững',
      });
    }
  };

  const refreshPendingCount = async () => {
    try {
      const pending = await api.getMemories('pending');
      setPendingCount(pending.length);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    checkHealth();
    refreshPendingCount();
    const interval = setInterval(() => {
      refreshPendingCount();
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleGoToDiary = (date: string) => {
    setDiaryDateToOpen(date);
    setActiveTab('diary');
  };

  const handleOpenChatWithDate = (convId: number) => {
    setChatConvIdToOpen(convId);
    setActiveTab('chat');
  };

  if (authLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#FAF7F2] text-[#554A3E]">
        <div className="w-10 h-10 rounded-2xl bg-[#8B6B58] text-[#FAF7F2] flex items-center justify-center font-serif text-xl font-bold shadow-sm animate-pulse mb-3">
          D
        </div>
        <p className="font-serif text-sm font-semibold">Đang mở DiaryChat AI...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#FAF7F2] text-[#2D2A26] font-sans antialiased">
      {/* Desktop Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingCount={pendingCount}
        dbStatus={dbStatus}
        onOpenDbModal={() => setIsDbModalOpen(true)}
      />

      {/* Main View Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {activeTab === 'chat' && (
          <ChatView
            onGoToDiary={handleGoToDiary}
            onRefreshMemories={refreshPendingCount}
          />
        )}
        {activeTab === 'diary' && (
          <DiaryView
            initialDate={diaryDateToOpen}
            onOpenChatWithDate={handleOpenChatWithDate}
          />
        )}
        {activeTab === 'memories' && (
          <MemoryManager onRefreshCount={refreshPendingCount} />
        )}
        {activeTab === 'core' && <CoreMemoryView />}
        {activeTab === 'timeline' && <TimelineView />}
        {activeTab === 'scrapbook' && <ScrapbookView />}
        {activeTab === 'settings' && (
          <SettingsView
            dbStatus={dbStatus}
            onOpenDbModal={() => setIsDbModalOpen(true)}
          />
        )}

        {/* Mobile Navigation Bar */}
        <div className="md:hidden border-t border-[#E8DFC8] bg-[#F5EFE6] flex items-center justify-around py-2 px-1 shrink-0 z-20">
          {[
            { id: 'chat', label: 'Chat', icon: MessageSquare },
            { id: 'diary', label: 'Nhật ký', icon: BookOpen },
            { id: 'memories', label: 'Ký ức', icon: Brain, badge: pendingCount },
            { id: 'timeline', label: 'Dòng TG', icon: Calendar },
            { id: 'settings', label: 'Cài đặt', icon: SettingsIcon },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as ActiveTab)}
                className={`flex flex-col items-center gap-0.5 relative py-1 px-2.5 rounded-lg text-[10px] font-medium transition-colors ${
                  isActive ? 'text-[#8B6B58] font-bold' : 'text-[#85796E]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
                {item.badge && item.badge > 0 ? (
                  <span className="absolute top-0 right-1 w-2 h-2 rounded-full bg-[#D46B4F]" />
                ) : null}
              </button>
            );
          })}
        </div>
      </main>

      {/* Database Connection Modal */}
      <PostgresSetupModal
        isOpen={isDbModalOpen}
        onClose={() => setIsDbModalOpen(false)}
        dbStatus={dbStatus}
        onRefresh={checkHealth}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
