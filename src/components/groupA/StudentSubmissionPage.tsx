import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ScreenId } from '../../types';
import {
  Camera,
  Upload,
  CheckCircle2,
  Trash2,
  AlertTriangle,
  WifiOff,
  Clock,
  Check,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { filesToPageImages, pdfErrorText, PAGE_FILE_ACCEPT } from '../../lib/pdfPages';
import { prepareImageForGrading } from '../../lib/imageResize';
import { getLinkInfo, isTooDark, LinkError, submitPaper, type LinkInfo } from '../../lib/studentLink';
import { listQueued, queuePaper, removeQueued } from '../../lib/offlineQueue';
import { notify } from '../../lib/notify';

interface StudentSubmissionPageProps {
  onNavigate: (screen: ScreenId) => void;
}

interface PageImage {
  id: string;
  name: string;
  dataUrl: string;
  base64: string;
  isDark?: boolean;
}

export const StudentSubmissionPage: React.FC<StudentSubmissionPageProps> = () => {
  const location = useLocation();
  const linkCode = decodeURIComponent(location.pathname.replace(/^\/s\//, '').replace(/\/+$/, ''));
  // The student types a private 4-digit code. The page never lists students' names.
  const [studentCodeInput, setStudentCodeInput] = useState<string>('');
  const [pages, setPages] = useState<PageImage[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOffline, setIsOffline] = useState(typeof navigator !== 'undefined' && !navigator.onLine);
  const [info, setInfo] = useState<LinkInfo | null>(null);
  const [infoError, setInfoError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [savedOffline, setSavedOffline] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const filesRef = useRef<HTMLInputElement>(null);

  const codeComplete = studentCodeInput.length === 4;
  const maxPages = info?.maxPages ?? 6;

  useEffect(() => {
    getLinkInfo(linkCode)
      .then(setInfo)
      .catch((e) => setInfoError(e instanceof LinkError && !e.offline ? e.message : 'تعذّر فتح الرابط. تأكد من الإنترنت ثم أعد المحاولة.'));
  }, [linkCode]);

  // Papers saved while offline are sent once the connection is back.
  useEffect(() => {
    const flush = async () => {
      for (const item of await listQueued('student', linkCode)) {
        try {
          const r = await submitPaper(item.target, item.studentCode ?? '', item.pages);
          await removeQueued(item.id);
          setFirstName(r.firstName);
          setSavedOffline(false);
          notify('وصلت ورقتك المحفوظة بنجاح ✓');
        } catch (e) {
          if (e instanceof LinkError && e.offline) return;
          await removeQueued(item.id);
          setError(e instanceof Error ? e.message : 'تعذّر إرسال الورقة المحفوظة.');
        }
      }
    };
    const on = () => {
      setIsOffline(false);
      void flush();
    };
    const off = () => setIsOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    if (navigator.onLine) void flush();
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, [linkCode]);

  const handleAddFiles = async (list: FileList | null) => {
    const picked = Array.from(list ?? []);
    if (!picked.length) return;
    const room = Math.max(0, maxPages - pages.length);
    let files: File[];
    try {
      const r = await filesToPageImages(picked, room);
      files = r.images;
      if (r.truncated) notify(`الحد الأقصى ${maxPages} صفحات.`, 'warning');
      if (r.skipped) notify('اختر صوراً أو ملف PDF فقط.', 'warning');
    } catch (e) {
      notify(pdfErrorText(e, 'تعذّرت قراءة الملف. جرّب صورة أو ملفاً آخر.'), 'warning');
      return;
    }
    const added: PageImage[] = [];
    for (const file of files) {
      try {
        const p = await prepareImageForGrading(file);
        added.push({ id: `p${Date.now()}${added.length}`, name: `الصفحة ${pages.length + added.length + 1}`, dataUrl: p.dataUrl, base64: p.base64, isDark: await isTooDark(p.dataUrl) });
      } catch {
        notify('تعذّرت قراءة إحدى الصور. جرّب صورة أخرى.', 'warning');
      }
    }
    setPages((prev) => [...prev, ...added]);
  };

  const handleDeletePage = (id: string) => {
    setPages(prev => prev.filter(p => p.id !== id));
  };

  const handleMovePage = (index: number, direction: 'up' | 'down') => {
    const newPages = [...pages];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx >= 0 && targetIdx < newPages.length) {
      const temp = newPages[index];
      newPages[index] = newPages[targetIdx];
      newPages[targetIdx] = temp;
      setPages(newPages);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codeComplete || !pages.length) return;
    setError(null);
    setIsSubmitting(true);
    const payload = pages.map((p) => ({ base64: p.base64, mediaType: 'image/jpeg' as const }));
    try {
      const r = await submitPaper(linkCode, studentCodeInput, payload);
      setFirstName(r.firstName);
      setIsSubmitted(true);
    } catch (err) {
      if (err instanceof LinkError && err.offline) {
        const ok = await queuePaper({
          id: `s_${Date.now()}`,
          kind: 'student',
          target: linkCode,
          studentCode: studentCodeInput,
          pages: pages.map((p) => ({ base64: p.base64, dataUrl: p.dataUrl, mediaType: 'image/jpeg' })),
          createdAt: new Date().toISOString(),
        });
        if (ok) {
          setSavedOffline(true);
          setIsSubmitted(true);
        } else {
          setError('لا يوجد إنترنت. حاول مرة أخرى عند عودة الاتصال.');
        }
      } else {
        setError(err instanceof Error ? err.message : 'حدث خطأ. حاول مرة أخرى.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (infoError) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-3">
        <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
        <p className="text-sm font-bold text-slate-800">{infoError}</p>
      </div>
    );
  }
  if (!info) {
    return <div className="max-w-md mx-auto px-4 py-16 text-center text-sm text-slate-500">جاري فتح الرابط...</div>;
  }
  if (!info.open && !isSubmitted) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-3">
        <Clock className="w-10 h-10 text-slate-400 mx-auto" />
        <h1 className="font-extrabold text-base text-[#1E3A5F]">{info.title}</h1>
        <p className="text-sm text-slate-600">أغلق المدرّس التسليم لهذا {info.kind === 'homework' ? 'الواجب' : 'الامتحان'}.</p>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center space-y-6">
        <div className="bg-white border border-emerald-200 rounded-3xl p-8 shadow-sm space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-[#1E3A5F]">{savedOffline ? 'حُفظت ورقتك على جهازك' : 'وصلت ورقتك بنجاح ✓'}</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            {savedOffline ? (
              <>لا يوجد إنترنت الآن. ستُرسل ورقتك تلقائياً عند عودة الاتصال، أبقِ هذه الصفحة مفتوحة أو افتحها لاحقاً من نفس الجهاز.</>
            ) : (
              <>شكراً {firstName}، استلمنا <strong>{pages.length} صفحات</strong> في <strong>{info.title}</strong>.</>
            )}
          </p>

          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs text-right space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <span>ماذا بعد التسليم؟</span>
            </div>
            <p className="text-[11px] text-emerald-800 leading-normal">
              يراجع المدرّس التصحيح ويعتمده، ثم تصلك ورقتك مصحّحة بالقلم الأحمر على واتساب.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={() => {
                setIsSubmitted(false);
                setPages([]);
              }}
              className="text-xs text-[#1E3A5F] hover:underline font-bold cursor-pointer"
            >
              إعادة التسليم (تستبدل الورقة السابقة)
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-5 text-right">
      {/* Top Card: exam info */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
              {info.kind === 'homework' ? 'رابط تسليم الواجب' : 'رابط تسليم الامتحان'}
            </span>
            <h1 className="font-extrabold text-base text-[#1E3A5F] mt-1 break-words">{info.title}</h1>
            <p className="text-xs text-slate-500 font-medium">{info.organizationName}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#E8F0F8] text-[#1E3A5F] flex items-center justify-center font-bold shrink-0">
            د✓
          </div>
        </div>
      </div>

      {isOffline && (
        <div className="flex items-center gap-2 bg-amber-50 p-2.5 rounded-xl text-xs text-amber-900 border border-amber-200">
          <WifiOff className="w-4 h-4 text-amber-600 shrink-0" />
          <span className="text-[11px]">لا يوجد إنترنت: عند الإرسال تُحفظ ورقتك على جهازك وتُرسل تلقائياً عند عودة الاتصال.</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Step 1: Student enters their private 4-digit code */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
          <label htmlFor="student-code" className="block text-xs font-bold text-slate-800">
            اكتب رمزك الخاص (4 أرقام):
          </label>
          <p className="text-[11px] text-slate-500 -mt-1">
            الرمز مطبوع على ورقة الإجابة، أو أرسله لك المدرّس على واتساب.
          </p>
          <input
            id="student-code"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            maxLength={4}
            value={studentCodeInput}
            onChange={(e) => setStudentCodeInput(e.target.value.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)).replace(/[^0-9]/g, '').slice(0, 4))}
            className="w-full p-3 text-center bg-[#F7F8FA] border border-slate-300 rounded-xl font-bold text-xl tracking-[0.5em] tabular-nums focus:bg-white focus:border-[#1E3A5F] focus:outline-none"
            placeholder="••••"
            dir="ltr"
          />

        </div>

        {/* Step 2: Camera / Upload Pages */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800">
              صفحات الورقة المحلولة ({pages.length} من {maxPages}):
            </label>
            <span className="text-[10px] text-slate-500">JPG أو PNG واضحة</span>
          </div>

          <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { void handleAddFiles(e.target.files); e.target.value = ''; }} />
          <input ref={filesRef} type="file" accept={PAGE_FILE_ACCEPT} multiple className="hidden" onChange={(e) => { void handleAddFiles(e.target.files); e.target.value = ''; }} />
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={pages.length >= maxPages}
              onClick={() => cameraRef.current?.click()}
              className="bg-[#1E3A5F] hover:bg-[#152a45] disabled:opacity-50 text-white p-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-xs active:scale-98"
            >
              <Camera className="w-5 h-5 text-emerald-400" />
              <span>صوّر صفحة</span>
            </button>
            <button
              type="button"
              disabled={pages.length >= maxPages}
              onClick={() => filesRef.current?.click()}
              className="bg-white border-2 border-dashed border-slate-300 disabled:opacity-50 text-slate-800 p-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <Upload className="w-5 h-5 text-blue-600" />
              <span>صور أو ملف PDF</span>
            </button>
          </div>

          {/* Uploaded Pages List with reorder and delete */}
          <div className="space-y-3">
            {pages.map((p, idx) => (
              <div
                key={p.id}
                className="border border-slate-200 rounded-xl p-3 bg-slate-50/70 space-y-2 relative"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#1E3A5F] text-white flex items-center justify-center font-mono text-[10px] tabular-nums font-bold">
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-slate-800">{p.name}</span>
                  </div>

                  {/* Actions: Reorder & Delete */}
                  <div className="flex items-center gap-1">
                    {idx > 0 && (
                      <button
                        type="button"
                        onClick={() => handleMovePage(idx, 'up')}
                        className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                        title="تحريك لأعلى"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {idx < pages.length - 1 && (
                      <button
                        type="button"
                        onClick={() => handleMovePage(idx, 'down')}
                        className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                        title="تحريك لأسفل"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeletePage(p.id)}
                      className="p-1 text-red-500 hover:text-red-700 cursor-pointer"
                      title="حذف هذه الصفحة"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <img src={p.dataUrl} alt={`الصفحة ${idx + 1}`} className="w-full max-h-48 object-contain bg-white border border-slate-200 rounded-lg" />

                {/* Tilt / Dark Photo Warning (PDF requirement) */}
                {p.isDark && (
                  <div className="p-2 bg-amber-50 border border-amber-300 rounded-lg text-amber-800 text-[11px] flex items-center gap-1.5 font-medium">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>تنبيه: الصورة مظلمة — يفضّل إعادة التصوير في إضاءة أوضح لضمان دقة القراءة.</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={pages.length === 0 || isSubmitting || !codeComplete}
          className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-3.5 rounded-xl font-bold text-sm transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <span>جارِ الرفع والتحقق...</span>
          ) : (
            <>
              <span>{!codeComplete ? 'اكتب رمزك أولاً' : !pages.length ? 'أضف صورة ورقتك' : 'إرسال الورقة للمدرّس'}</span>
              <Check className="w-4 h-4" />
            </>
          )}
        </button>

        <p className="text-[11px] text-slate-400 text-center">
          بالضغط على إرسال، تُرفع صور الورقة لنظام التصحيح وتُسجل تحت اسمك ورقمك.
        </p>
      </form>
    </div>
  );
};
