import React, { useEffect, useState } from 'react';
import { Download, Share, SquarePlus, X } from 'lucide-react';
import { canPromptInstall, isInstalled, isIosSafari, onInstallChange, promptInstall } from '../../lib/pwa';

// A small card inviting the user to install Daqa on their phone.
// Android: one button that opens the browser's install window.
// iPhone Safari: a short how-to (Share ← «إضافة إلى الشاشة الرئيسية»), since Apple has no install button.

const DISMISS_KEY = 'daqa.installBanner.dismissedAt';
const HIDE_FOR_MS = 30 * 24 * 60 * 60 * 1000;

function dismissedRecently() {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY));
    return Number.isFinite(at) && at > 0 && Date.now() - at < HIDE_FOR_MS;
  } catch {
    return false;
  }
}

export function InstallAppBanner({ aboveBottomNav }: { aboveBottomNav: boolean }) {
  const [, rerender] = useState(0);
  const [hidden, setHidden] = useState(() => isInstalled() || dismissedRecently());
  const ios = isIosSafari();

  useEffect(() => onInstallChange(() => rerender((n) => n + 1)), []);

  if (hidden) return null;
  const android = canPromptInstall();
  if (!android && !ios) return null;

  const close = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // Private browsing: it will just show again next time.
    }
    setHidden(true);
  };

  return (
    <div
      role="dialog"
      aria-label="ثبّت تطبيق دقة"
      className={`fixed inset-x-3 sm:inset-x-auto sm:right-6 sm:w-96 z-50 ${aboveBottomNav ? 'bottom-20 lg:bottom-6' : 'bottom-4'}`}
      style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xl p-4 flex items-start gap-3">
        <img src="/icons/icon-192.png" alt="" className="w-11 h-11 rounded-xl border border-slate-100 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-[#1E3A5F]">ثبّت تطبيق دقة على جوالك</p>
          {android ? (
            <>
              <p className="text-xs text-slate-500 mt-1">افتحه من أيقونة على الشاشة الرئيسية مثل أي تطبيق.</p>
              <button
                onClick={async () => {
                  const ok = await promptInstall();
                  if (ok) setHidden(true);
                }}
                className="mt-3 inline-flex items-center gap-1.5 bg-[#1E3A5F] hover:bg-[#152a45] text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer"
              >
                <Download className="w-4 h-4" />
                تثبيت التطبيق
              </button>
            </>
          ) : (
            <ol className="text-xs text-slate-600 mt-1.5 space-y-1.5">
              <li className="flex items-center gap-1.5 flex-wrap">
                ١. اضغط زر المشاركة
                <Share className="w-4 h-4 text-[#1E3A5F]" aria-label="مشاركة" />
                أسفل الشاشة
              </li>
              <li className="flex items-center gap-1.5 flex-wrap">
                ٢. اختر «إضافة إلى الشاشة الرئيسية»
                <SquarePlus className="w-4 h-4 text-[#1E3A5F]" aria-hidden="true" />
              </li>
              <li>٣. اضغط «إضافة»</li>
            </ol>
          )}
        </div>
        <button onClick={close} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer shrink-0" aria-label="إغلاق">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
