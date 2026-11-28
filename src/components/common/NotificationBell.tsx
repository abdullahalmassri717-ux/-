import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, BellRing, CheckCheck, Smartphone, X } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import {
  AppNotification,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../../lib/notifications';
import { timeAgo } from '../../lib/timeAgo';
import { PushState, disablePush, enablePush, getPushState, sendTestPush } from '../../lib/push';
import { notify } from '../../lib/notify';

const REFRESH_MS = 60_000;

/** The bell in the top bar: the person's notifications + turning on phone notifications. */
export const NotificationBell: React.FC = () => {
  const auth = useAuth();
  const navigate = useNavigate();
  const enabled = auth.mode === 'real' && auth.status === 'signed_in';
  const [items, setItems] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const [pushState, setPushState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!enabled) return;
    setItems(await fetchNotifications());
  }, [enabled]);

  // Refresh every minute while the page is visible, and when coming back to it.
  useEffect(() => {
    if (!enabled) return;
    void load();
    const tick = () => {
      if (document.visibilityState === 'visible') void load();
    };
    const timer = window.setInterval(tick, REFRESH_MS);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [enabled, load]);

  useEffect(() => {
    if (!open) return;
    void load();
    void getPushState().then(setPushState);
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open, load]);

  if (!enabled) return null;

  const unread = items.filter((n) => !n.readAt).length;

  const openItem = (n: AppNotification) => {
    setOpen(false);
    if (!n.readAt) {
      setItems((list) => list.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)));
      void markNotificationRead(n.id);
    }
    if (n.link && n.link.startsWith('/') && !n.link.startsWith('//')) navigate(n.link);
  };

  const readAll = () => {
    setItems((list) => list.map((x) => (x.readAt ? x : { ...x, readAt: new Date().toISOString() })));
    void markAllNotificationsRead();
  };

  const turnOn = async () => {
    setBusy(true);
    const error = await enablePush();
    setBusy(false);
    setPushState(await getPushState());
    if (error) notify(error, 'warning');
    else notify('تم تفعيل الإشعارات على هذا الجهاز ✓', 'success');
  };

  const turnOff = async () => {
    setBusy(true);
    await disablePush();
    setBusy(false);
    setPushState(await getPushState());
    notify('أوقفنا الإشعارات على هذا الجهاز.', 'info');
  };

  const test = async () => {
    setBusy(true);
    const error = await sendTestPush();
    setBusy(false);
    notify(error ?? 'أرسلنا إشعار تجربة، سيظهر على جهازك خلال ثوانٍ.', error ? 'warning' : 'success');
  };

  return (
    <div className="relative" ref={boxRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`relative p-2 rounded-xl border transition-colors cursor-pointer ${
          open ? 'bg-blue-50 border-blue-300 text-[#1E3A5F]' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
        }`}
        title="الإشعارات"
        aria-label={unread > 0 ? `الإشعارات، ${unread} غير مقروءة` : 'الإشعارات'}
      >
        {unread > 0 ? <BellRing className="w-4 h-4 text-[#1E3A5F]" /> : <Bell className="w-4 h-4" />}
        {unread > 0 && (
          <span className="absolute -top-1.5 -left-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center leading-none">
            {unread > 9 ? '+9' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed top-16 left-3 right-3 sm:absolute sm:top-auto sm:right-auto sm:left-0 sm:mt-2 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 text-right overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-2">
            <span className="font-bold text-sm text-slate-800">الإشعارات</span>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <button
                  onClick={readAll}
                  className="text-[11px] font-bold text-blue-700 hover:bg-blue-50 rounded-lg px-2 py-1 flex items-center gap-1 cursor-pointer"
                >
                  <CheckCheck className="w-3.5 h-3.5" /> تعليم الكل كمقروء
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
                aria-label="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="max-h-[55vh] overflow-y-auto divide-y divide-slate-100">
            {items.length === 0 ? (
              <div className="py-10 px-6 text-center text-xs text-slate-500">
                <Bell className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                لا توجد إشعارات بعد. سننبّهك هنا عندما تحتاج أوراقك أو اشتراكك إلى انتباهك.
              </div>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => openItem(n)}
                  className={`w-full text-right px-4 py-3 flex gap-2.5 items-start cursor-pointer transition-colors ${
                    n.readAt ? 'hover:bg-slate-50' : 'bg-blue-50/60 hover:bg-blue-50'
                  }`}
                >
                  <span
                    className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${n.readAt ? 'bg-transparent' : 'bg-blue-600'}`}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-bold text-slate-900">{n.title}</span>
                    {n.body && <span className="block text-[11px] text-slate-600 mt-0.5 leading-relaxed break-words">{n.body}</span>}
                    <span className="block text-[10px] text-slate-400 mt-1">{timeAgo(n.createdAt)}</span>
                  </span>
                </button>
              ))
            )}
          </div>

          <div className="border-t border-slate-100 bg-slate-50 px-4 py-3 text-xs">
            {pushState === null ? null : pushState === 'on' ? (
              <div className="flex items-center justify-between gap-2">
                <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4" /> الإشعارات مفعّلة على هذا الجهاز
                </span>
                <span className="flex gap-1 shrink-0">
                  <button
                    onClick={test}
                    disabled={busy}
                    className="px-2 py-1 rounded-lg border border-slate-200 bg-white font-bold text-slate-700 hover:bg-slate-100 cursor-pointer disabled:opacity-50"
                  >
                    جرّب
                  </button>
                  <button
                    onClick={turnOff}
                    disabled={busy}
                    className="px-2 py-1 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer disabled:opacity-50"
                  >
                    إيقاف
                  </button>
                </span>
              </div>
            ) : pushState === 'off' ? (
              <button
                onClick={turnOn}
                disabled={busy}
                className="w-full flex items-center justify-center gap-1.5 bg-[#1E3A5F] hover:bg-[#152a45] text-white rounded-xl py-2 font-bold cursor-pointer disabled:opacity-60"
              >
                <Smartphone className="w-4 h-4" />
                {busy ? 'جارٍ التفعيل…' : 'فعّل الإشعارات على هذا الجهاز'}
              </button>
            ) : pushState === 'needs_install' ? (
              <p className="text-slate-600 leading-relaxed">
                <span className="font-bold text-slate-800">لتصلك الإشعارات على الآيفون:</span> ثبّت دقة على الشاشة الرئيسية
                (زر المشاركة ثم «إضافة إلى الشاشة الرئيسية»)، افتحها من الأيقونة، ثم فعّل الإشعارات من هذا الجرس.
              </p>
            ) : pushState === 'denied' ? (
              <p className="text-slate-600 leading-relaxed">
                الإشعارات محظورة لهذا الموقع. اسمح بها من إعدادات المتصفح أو الجوال، ثم ارجع هنا.
              </p>
            ) : (
              <p className="text-slate-600">هذا المتصفح لا يدعم إشعارات الجوال. ستبقى الإشعارات تظهر هنا في الجرس.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
