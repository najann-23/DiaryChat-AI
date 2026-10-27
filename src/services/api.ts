import { Conversation, Memory, EventItem, PlanItem, CoreMemory, ScrapbookItem, UserProfile } from '../types/index.ts';

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const devUid = localStorage.getItem('diarychat_dev_uid');
  if (devUid) {
    headers['x-user-id'] = devUid;
  }

  return headers;
}

export const api = {
  async getHealth() {
    const res = await fetch('/api/health');
    return res.json();
  },

  async getConversations(): Promise<Conversation[]> {
    const res = await fetch('/api/conversations', { credentials: 'include', headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Không thể tải danh sách cuộc trò chuyện');
    return res.json();
  },

  async createConversation(title?: string, date?: string): Promise<Conversation> {
    const res = await fetch('/api/conversations', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ title, date }),
    });
    if (!res.ok) throw new Error('Không thể tạo cuộc trò chuyện mới');
    return res.json();
  },

  async getConversation(id: number): Promise<Conversation> {
    const res = await fetch(`/api/conversations/${id}`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Không thể tải chi tiết cuộc trò chuyện');
    return res.json();
  },

  async sendMessage(conversationId: number, content: string) {
    const res = await fetch(`/api/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ content }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Lỗi khi gửi tin nhắn');
    }
    return res.json();
  },

  async sendSupplement(conversationId: number, content: string, targetDate: string) {
    const res = await fetch(`/api/conversations/${conversationId}/supplement`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ content, targetDate }),
    });
    if (!res.ok) throw new Error('Không thể gửi thông tin bổ sung');
    return res.json();
  },

  async generateSummary(conversationId: number) {
    const res = await fetch(`/api/conversations/${conversationId}/summary`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Không thể tạo bản tóm tắt');
    return res.json();
  },

  async getMemories(status?: string, type?: string): Promise<Memory[]> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (type) params.append('type', type);
    const res = await fetch(`/api/memories?${params.toString()}`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Không thể tải danh sách ký ức');
    return res.json();
  },

  async updateMemoryStatus(id: number, status: string, title?: string, content?: string) {
    const res = await fetch(`/api/memories/${id}/status`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status, title, content }),
    });
    if (!res.ok) throw new Error('Không thể cập nhật trạng thái ký ức');
    return res.json();
  },

  async deleteMemory(id: number) {
    const res = await fetch(`/api/memories/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Không thể xóa ký ức');
    return res.json();
  },

  async getEvents(): Promise<EventItem[]> {
    const res = await fetch('/api/events', { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Không thể tải danh sách sự kiện');
    return res.json();
  },

  async getPlans(): Promise<PlanItem[]> {
    const res = await fetch('/api/plans', { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Không thể tải danh sách kế hoạch');
    return res.json();
  },

  async updatePlanStatus(id: number, status: string) {
    const res = await fetch(`/api/plans/${id}/status`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error('Không thể cập nhật kế hoạch');
    return res.json();
  },

  async getCoreMemories(): Promise<CoreMemory[]> {
    const res = await fetch('/api/core-memories', { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Không thể tải ký ức cốt lõi');
    return res.json();
  },

  async createCoreMemory(title: string, content: string, sourceReferences?: string) {
    const res = await fetch('/api/core-memories', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ title, content, sourceReferences }),
    });
    if (!res.ok) throw new Error('Không thể tạo ký ức cốt lõi');
    return res.json();
  },

  async getScrapbooks(): Promise<ScrapbookItem[]> {
    const res = await fetch('/api/scrapbooks', { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Không thể tải sổ kỷ niệm');
    return res.json();
  },

  async createScrapbook(data: { title: string; description?: string; date?: string; imageUrl?: string; memoryId?: number }) {
    const res = await fetch('/api/scrapbooks', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Không thể tạo trang kỷ niệm');
    return res.json();
  },

  async deleteScrapbook(id: number) {
    const res = await fetch(`/api/scrapbooks/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Không thể xóa thẻ kỷ niệm');
    return res.json();
  },

  async search(keyword: string, startDate?: string, endDate?: string) {
    const params = new URLSearchParams({ q: keyword });
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const res = await fetch(`/api/search?${params.toString()}`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Không thể tìm kiếm');
    return res.json();
  },

  async recallMemory(question: string): Promise<{ answer: string }> {
    const res = await fetch('/api/memories/recall', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ question }),
    });
    if (!res.ok) throw new Error('Không thể tra cứu ký ức');
    return res.json();
  },

  async deleteAccount() {
    const res = await fetch('/api/user/account', {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Không thể xóa tài khoản');
    return res.json();
  },
};
