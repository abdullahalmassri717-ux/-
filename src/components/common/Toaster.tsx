import React, { useEffect, useState } from 'react';
import { CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';
import { onNotify, NotifyDetail } from '../../lib/notify';

const DISPLAY_MS = 4500;

export const Toaster: React.FC = () => {
  const [items, setItems] = useState<NotifyDetail[]>([]);

  useEffect(() => {
    return onNotify((detail) => {
      setItems((prev) => [...prev.slice(-2), detail]);
      window.setTimeout(() => {
        setItems((prev) => prev.filter((i) => i.id !== detail.id));
      }, DISPLAY_MS);
    });
  }, []);

  if (items.length === 0) return null;

  return (
    <div
      className="fixed top-20 inset-x-3 sm:inset-x-auto sm:left-6 sm:w-96 z-[60] space-y-2"
      role="status"
      aria-live="polite"
    >
      {items.map((item) => {
        const tone =
          item.kind === 'success'
            ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
            : item.kind === 'warning'
            ? 'bg-amber-50 border-amber-300 text-amber-950'
            : 'bg-white border-slate-200 text-slate-800';
        const Icon = item.kind === 'success' ? CheckCircle2 : item.kind === 'warning' ? AlertTriangle : Info;
        const iconTone =
          item.kind === 'success' ? 'text-emerald-600' : item.kind === 'warning' ? 'text-amber-600' : 'text-[#1E3A5F]';
        return (
          <div
            key={item.id}
            className={`flex items-start gap-2.5 p-3 rounded-xl border shadow-lg text-xs leading-relaxed text-right ${tone}`}
          >
            <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${iconTone}`} />
            <span className="flex-1 font-medium">{item.message}</span>
            <button
              onClick={() => setItems((prev) => prev.filter((i) => i.id !== item.id))}
              className="text-slate-400 hover:text-slate-600 cursor-pointer shrink-0"
              title="إغلاق"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
