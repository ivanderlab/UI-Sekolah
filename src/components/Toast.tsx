import React from 'react';

export interface ToastData {
  title: string;
  description: string;
  type?: 'success' | 'warning' | 'info' | 'error';
}

interface ToastProps {
  toast: ToastData | null;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  if (!toast) return null;

  const icons = {
    success: 'done_all',
    warning: 'notifications_active',
    info: 'info',
    error: 'error',
  };

  const bgColors = {
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    info: 'bg-sky-500',
    error: 'bg-rose-500',
  };

  return (
    <div
      onClick={onClose}
      className="fixed bottom-24 left-1/2 -translate-x-1/2 md:bottom-auto md:top-20 md:right-6 md:left-auto md:translate-x-0 w-max max-w-[calc(100vw-2rem)] md:max-w-sm z-50 bg-[#213145] text-[#eaf1ff] px-3.5 py-2 rounded-2xl md:rounded-full shadow-2xl flex items-center gap-2.5 border border-white/10 animate-in slide-in-from-bottom-4 md:slide-in-from-top-6 duration-200 cursor-pointer"
    >
      <div
        className={`w-7 h-7 rounded-full ${
          bgColors[toast.type || 'success']
        } text-white flex items-center justify-center shrink-0 shadow-sm`}
      >
        <span className="material-symbols-outlined notranslate text-[16px]">
          {icons[toast.type || 'success']}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-label-md text-[12px] font-bold text-white tracking-wide">
          {toast.title}
        </h4>
        <p className="font-body-sm text-[11px] text-slate-300 truncate">
          {toast.description}
        </p>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="text-slate-400 hover:text-white p-1"
      >
        <span className="material-symbols-outlined notranslate text-[18px]">close</span>
      </button>
    </div>
  );
};
