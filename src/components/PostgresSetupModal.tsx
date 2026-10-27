import React, { useState } from 'react';
import { Database, X, CheckCircle2, AlertCircle, Copy, Check, ExternalLink } from 'lucide-react';

interface PostgresSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  dbStatus: { isPg: boolean; label: string };
  onRefresh: () => void;
}

export const PostgresSetupModal: React.FC<PostgresSetupModalProps> = ({
  isOpen,
  onClose,
  dbStatus,
  onRefresh,
}) => {
  const [copiedVar, setCopiedVar] = useState(false);

  if (!isOpen) return null;

  const exampleEnv = `POSTGRES_URL="postgresql://username:password@ep-name.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"`;

  const handleCopy = () => {
    navigator.clipboard.writeText(exampleEnv);
    setCopiedVar(true);
    setTimeout(() => setCopiedVar(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-[#FAF7F2] rounded-2xl border border-[#E5DAC4] p-6 max-w-lg w-full shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-[#E8DFC8] pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#8B6B58] text-white flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif text-base font-bold text-[#3B342D]">
                Cơ Sở Dữ Liệu PostgreSQL
              </h3>
              <p className="text-[11px] text-[#8C8074]">
                Phương án B: Kết nối cơ sở dữ liệu PostgreSQL độc lập
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-1 rounded-lg text-stone-500 hover:bg-stone-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current Connection Status */}
        <div className={`p-4 rounded-xl border mb-4 flex items-start gap-3 ${
          dbStatus.isPg
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
            : 'bg-amber-50 border-amber-200 text-amber-900'
        }`}>
          {dbStatus.isPg ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          )}
          <div className="text-xs">
            <span className="font-bold block text-sm mb-0.5">
              {dbStatus.isPg ? 'Đã kết nối PostgreSQL thành công' : 'Đang dùng bộ lưu trữ bền vững dự phòng'}
            </span>
            <p className="leading-relaxed">
              {dbStatus.isPg
                ? 'Hệ thống đang lưu trữ trực tiếp các bảng 3 lớp (Conversations, Memories, Core Memories, Events, Plans) vào cơ sở dữ liệu PostgreSQL của bạn.'
                : 'Ứng dụng đã sẵn sàng chạy với đầy đủ tính năng và bảo toàn dữ liệu bằng tệp lưu trữ nội bộ (data/persistent_store.json) trong khi bạn cấu hình PostgreSQL bên ngoài.'}
            </p>
          </div>
        </div>

        {/* Instructions */}
        <div className="space-y-3 text-xs text-[#52463B] leading-relaxed">
          <h4 className="font-bold text-[#3A3229] uppercase tracking-wider text-[11px]">
            Cách kết nối PostgreSQL độc lập (Neon, Supabase, hoặc Cloud SQL Public IP):
          </h4>
          <ol className="list-decimal pl-4 space-y-1.5 text-xs">
            <li>
              Tạo một cơ sở dữ liệu PostgreSQL miễn phí tại{' '}
              <a
                href="https://neon.tech"
                target="_blank"
                rel="noreferrer"
                className="text-[#8B6B58] font-bold underline inline-flex items-center gap-0.5"
              >
                Neon.tech <ExternalLink className="w-2.5 h-2.5" />
              </a>{' '}
              hoặc Supabase.
            </li>
            <li>Sao chép đường dẫn kết nối (Connection String).</li>
            <li>
              Thêm biến môi trường <code className="bg-[#EAE0D0] px-1.5 py-0.5 rounded font-mono font-bold text-[#352D26]">POSTGRES_URL</code> vào bảng điều khiển <strong>Secrets / Environment Variables</strong> của Google AI Studio.
            </li>
          </ol>

          <div className="mt-3 p-3 bg-white rounded-xl border border-[#D9CDB8] relative">
            <span className="text-[10px] text-[#8A7E73] font-mono block mb-1">Ví dụ định dạng POSTGRES_URL:</span>
            <code className="text-[11px] font-mono text-[#382F27] break-all block">
              {exampleEnv}
            </code>
            <button
              onClick={handleCopy}
              className="mt-2 flex items-center gap-1 text-[11px] font-medium text-[#8B6B58] hover:underline"
            >
              {copiedVar ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              <span>{copiedVar ? 'Đã sao chép' : 'Sao chép mẫu'}</span>
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-[#E8DFC8] mt-4">
          <button
            onClick={onRefresh}
            className="text-xs font-semibold text-[#8B6B58] hover:underline"
          >
            Kiểm tra lại kết nối
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[#8B6B58] text-white text-xs font-medium hover:bg-[#785947]"
          >
            Đã hiểu
          </button>
        </div>
      </div>
    </div>
  );
};
