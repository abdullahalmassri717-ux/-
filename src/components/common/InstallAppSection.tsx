import React, { useEffect, useState } from 'react';
import { CheckCircle2, Copy, Download, EllipsisVertical, Share, Smartphone, SquarePlus } from 'lucide-react';
import { canPromptInstall, isAndroid, isInstalled, isIos, isIosSafari, onInstallChange, promptInstall } from '../../lib/pwa';
import { notify } from '../../lib/notify';

// Landing page section: «نزّل تطبيق دقة».
// Daqa is a web app (PWA), so it installs straight from the site, no store needed.
// - Android/desktop Chrome: one button opens the browser's install window.
// - iPhone: step-by-step Safari instructions (Apple has no install button).
// - Otherwise: instructions for both phones, so the visitor can do it on their own phone.

type Tab = 'android' | 'iphone';

export const INSTALL_SECTION_ID = 'install-app';

export function InstallAppSection() {
  const [, rerender] = useState(0);
  const [installed, setInstalled] = useState(() => isInstalled());
  const [tab, setTab] = useState<Tab>(() => (isIos() ? 'iphone' : 'android'));
  const ios = isIos();
  const iosSafari = isIosSafari();

  useEffect(
    () =>
      onInstallChange(() => {
        setInstalled(isInstalled());
        rerender((n) => n + 1);
      }),
    []
  );

  const canPrompt = canPromptInstall();
  const onPhone = ios || isAndroid();

  const install = async () => {
    const ok = await promptInstall();
    if (ok) {
      setInstalled(true);
      notify('تم تثبيت تطبيق دقة. ستجده على الشاشة الرئيسية.', 'success');
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      notify('تم نسخ رابط الموقع. افتحه على جوالك.', 'success');
    } catch {
      notify(window.location.origin, 'info');
    }
  };

  return (
    <section id={INSTALL_SECTION_ID} className="max-w-5xl mx-auto px-4 sm:px-6 scroll-mt-24">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="grid md:grid-cols-5">
          {/* Intro */}
          <div className="md:col-span-2 bg-[#1E3A5F] text-white p-6 sm:p-8 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <img src="/icons/icon-192.png" alt="" className="w-14 h-14 rounded-2xl bg-white shrink-0" />
              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold">نزّل تطبيق دقة</h2>
                <p className="text-blue-100 text-xs mt-0.5">على الجوال أو الكمبيوتر</p>
              </div>
            </div>
            <ul className="space-y-2 text-sm text-blue-50">
              <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-300 shrink-0" />أيقونة على الشاشة الرئيسية وتفتح مثل أي تطبيق</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-300 shrink-0" />مجاني، حجمه صغير، وبدون متجر تطبيقات</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-300 shrink-0" />يتحدّث تلقائياً، ولا يحتاج تنزيل نسخ جديدة</li>
            </ul>

            {installed ? (
              <div className="mt-auto bg-emerald-600/90 rounded-xl px-4 py-3 text-sm font-bold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                التطبيق مثبّت على هذا الجهاز
              </div>
            ) : canPrompt ? (
              <button
                onClick={install}
                className="mt-auto bg-white text-[#1E3A5F] hover:bg-blue-50 px-5 py-3.5 rounded-xl font-bold text-sm transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-md"
              >
                <Download className="w-5 h-5" />
                تثبيت التطبيق الآن
              </button>
            ) : !onPhone ? (
              <button
                onClick={copyLink}
                className="mt-auto bg-white/10 hover:bg-white/20 border border-white/30 px-4 py-3 rounded-xl font-bold text-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <Copy className="w-4 h-4" />
                انسخ رابط الموقع وافتحه على جوالك
              </button>
            ) : null}
          </div>

          {/* Steps */}
          <div className="md:col-span-3 p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-[#1E3A5F]" />
              <h3 className="font-bold text-slate-800">طريقة التثبيت خطوة بخطوة</h3>
            </div>

            <div role="tablist" className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl text-sm font-bold">
              {(
                [
                  ['android', 'أندرويد'],
                  ['iphone', 'آيفون'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  role="tab"
                  aria-selected={tab === id}
                  onClick={() => setTab(id)}
                  className={`py-2 rounded-lg cursor-pointer transition-colors ${
                    tab === id ? 'bg-white text-[#1E3A5F] shadow-xs' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {tab === 'android' ? (
              <ol className="space-y-3 text-sm text-slate-700">
                <Step n={1}>افتح موقع دقة من متصفح <strong>Chrome</strong>.</Step>
                {canPrompt ? (
                  <Step n={2}>اضغط زر «تثبيت التطبيق الآن».</Step>
                ) : (
                  <Step n={2}>
                    اضغط زر القائمة
                    <EllipsisVertical className="inline w-4 h-4 mx-1 text-[#1E3A5F]" aria-label="القائمة" />
                    أعلى الشاشة.
                  </Step>
                )}
                <Step n={3}>{canPrompt ? 'اضغط «تثبيت» في النافذة التي تظهر.' : 'اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».'}</Step>
                <Step n={4}>ستجد أيقونة دقة على الشاشة الرئيسية. افتحها وسجّل دخولك.</Step>
              </ol>
            ) : (
              <ol className="space-y-3 text-sm text-slate-700">
                <Step n={1}>
                  افتح موقع دقة من متصفح <strong>Safari</strong>
                  {ios && !iosSafari && <span className="text-amber-700 font-semibold"> (أنت الآن في متصفح آخر، انسخ الرابط وافتحه في Safari)</span>}.
                </Step>
                <Step n={2}>
                  اضغط زر المشاركة
                  <Share className="inline w-4 h-4 mx-1 text-[#1E3A5F]" aria-label="مشاركة" />
                  أسفل الشاشة.
                </Step>
                <Step n={3}>
                  اختر «إضافة إلى الشاشة الرئيسية»
                  <SquarePlus className="inline w-4 h-4 mx-1 text-[#1E3A5F]" aria-hidden="true" />
                  ثم اضغط «إضافة».
                </Step>
                <Step n={4}>افتح أيقونة دقة من الشاشة الرئيسية وسجّل دخولك مرة واحدة داخلها.</Step>
              </ol>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="w-6 h-6 rounded-full bg-[#E8F0F8] text-[#1E3A5F] text-xs font-bold flex items-center justify-center shrink-0 tabular-nums">
        {n}
      </span>
      <span className="leading-relaxed pt-0.5">{children}</span>
    </li>
  );
}
