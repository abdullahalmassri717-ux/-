// Shown instead of the dashboard while an organization waits for the platform
// admin's approval, or after the admin disabled it.
import React, { useState } from 'react';
import { Clock, Ban, RefreshCw, MessageCircle } from 'lucide-react';
import type { Entity } from '../../types';
import { usePublicSetting } from '../../lib/settings';

export const OrgStatusGate: React.FC<{ entity: Entity; onRefresh: () => Promise<void> }> = ({ entity, onRefresh }) => {
  const [busy, setBusy] = useState(false);
  const support = usePublicSetting<{ whatsapp?: string }>('support', {});
  const wa = (support.whatsapp ?? '').replace(/[^\d]/g, '');
  const pending = entity.status === 'pending';
  const Icon = pending ? Clock : Ban;

  return (
    <div className="max-w-lg mx-auto py-12 px-4 text-center space-y-5">
      <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center ${pending ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-600'}`}>
        <Icon className="w-8 h-8" />
      </div>
      <h1 className="text-xl font-black text-[#1E3A5F]">{pending ? 'حسابك بانتظار موافقة إدارة المنصة' : 'هذا الحساب موقوف حالياً'}</h1>
      <p className="text-sm text-slate-600 leading-relaxed">
        {pending
          ? `استلمنا تسجيل «${entity.name}». ستراجعه إدارة دقة وتفعّله قريباً، وبعدها تدخل لوحة التحكم مباشرة.`
          : `أوقفت إدارة المنصة حساب «${entity.name}». بياناتك محفوظة ولم تُحذف.`}
      </p>
      {!pending && entity.statusNote && <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3">السبب: {entity.statusNote}</p>}
      <div className="flex flex-wrap justify-center gap-2">
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await onRefresh().finally(() => setBusy(false));
          }}
          className="bg-[#1E3A5F] text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${busy ? 'animate-spin' : ''}`} /> تحقق مرة أخرى
        </button>
        {wa && (
          <a
            href={`https://wa.me/${wa}?text=${encodeURIComponent(`مرحباً، بخصوص حساب «${entity.name}» على منصة دقة.`)}`}
            target="_blank"
            rel="noreferrer"
            className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5"
          >
            <MessageCircle className="w-4 h-4" /> تواصل مع الدعم
          </a>
        )}
      </div>
    </div>
  );
};
