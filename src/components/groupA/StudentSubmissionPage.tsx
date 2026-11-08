import React, { useState } from 'react';
import { ScreenId } from '../../types';
import { MOCK_STUDENTS, CURRENT_TEACHER } from '../../mockData';
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

interface StudentSubmissionPageProps {
  onNavigate: (screen: ScreenId) => void;
}

interface PageImage {
  id: string;
  name: string;
  thumbnail: string;
  isDark?: boolean;
}

export const StudentSubmissionPage: React.FC<StudentSubmissionPageProps> = ({ onNavigate }) => {
  // The student types a private 4-digit code. The page never lists other students' names.
  const [studentCodeInput, setStudentCodeInput] = useState<string>('');
  const [pages, setPages] = useState<PageImage[]>([
    {
      id: 'p1',
      name: 'الصفحة 1 - حل مسائل الاشتقاق الضمني',
      thumbnail: 'math_paper_scan_1',
      isDark: false,
    },
    {
      id: 'p2',
      name: 'الصفحة 2 - مسألة إيجاد المشتقة الثانية',
      thumbnail: 'math_paper_scan_2',
      isDark: true, // triggers warning
    },
  ]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  const codeComplete = studentCodeInput.length === 4;
  const selectedStudent = codeComplete ? MOCK_STUDENTS.find(s => s.studentCode === studentCodeInput) : undefined;
  const codeNotFound = codeComplete && !selectedStudent;

  const handleAddPage = () => {
    const newPageNum = pages.length + 1;
    setPages(prev => [
      ...prev,
      {
        id: `p${Date.now()}`,
        name: `الصفحة ${newPageNum} - إجابة السؤال ${newPageNum}`,
        thumbnail: `math_paper_scan_${newPageNum}`,
        isDark: false,
      }
    ]);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
    }, 1200);
  };

  if (isSubmitted) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center space-y-6">
        <div className="bg-white border border-emerald-200 rounded-3xl p-8 shadow-sm space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-[#1E3A5F]">وصلت ورقتك بنجاح ✓</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            تم استلام <strong>{pages.length} صفحات</strong> للطالب <strong>{selectedStudent?.name}</strong> في امتحان <strong>التفاضل والاشتقاق الضمني</strong> بنجاح.
          </p>

          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs text-right space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <span>ماذا بعد التسليم؟</span>
            </div>
            <p className="text-[11px] text-emerald-800 leading-normal">
              يراجع {CURRENT_TEACHER.name} التصحيح ويعتمده، وستصلك ورقتك الأصلية محبرة بالقلم الأحمر مع تفاصيل درجاتك عبر رسالة واتساب على رقم هاتفك المسجل فوراً.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={() => setIsSubmitted(false)}
              className="text-xs text-[#1E3A5F] hover:underline font-bold cursor-pointer"
            >
              تسليم ورقة إضافية أو تعديل الصفحات
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-5 text-right">
      {/* Top Card: Teacher, Exam info & Deadline */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
              رابط تسليم الواجب
            </span>
            <h1 className="font-extrabold text-base text-[#1E3A5F] mt-1">
              واجب منزلي: الاشتقاق الضمني والمعادلات
            </h1>
            <p className="text-xs text-slate-500 font-medium">{CURRENT_TEACHER.name} · الرياضيات</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#E8F0F8] text-[#1E3A5F] flex items-center justify-center font-bold">
            د✓
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-600">
          <span className="flex items-center gap-1 text-red-600 font-semibold">
            <Clock className="w-3.5 h-3.5" />
            <span>آخر موعد: اليوم حتى 10:00 م</span>
          </span>
          <span className="text-slate-400">الدرجة الكلية: 20 علامة</span>
        </div>
      </div>

      {/* Offline Status Simulation Indicator */}
      <div className="flex items-center justify-between bg-slate-100 p-2.5 rounded-xl text-xs text-slate-700 border border-slate-200">
        <div className="flex items-center gap-2">
          {isOffline ? (
            <WifiOff className="w-4 h-4 text-red-500" />
          ) : (
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          )}
          <span className="text-[11px]">
            {isOffline
              ? 'إنترنت ضعيف: سيتم حفظ ورقتك وإرسالها تلقائياً عند عودة الاتصال'
              : 'متصل بالشبكة (نظام حفظ محلي ضد انقطاع الكهرباء والإنترنت)'}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsOffline(!isOffline)}
          className="text-[10px] text-blue-700 underline font-medium cursor-pointer"
        >
          {isOffline ? 'محاكاة عودة الشبكة' : 'محاكاة انقطاع'}
        </button>
      </div>

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
            onChange={(e) => setStudentCodeInput(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
            className="w-full p-3 text-center bg-[#F7F8FA] border border-slate-300 rounded-xl font-bold text-xl tracking-[0.5em] tabular-nums focus:bg-white focus:border-[#1E3A5F] focus:outline-none"
            placeholder="••••"
            dir="ltr"
          />

          {selectedStudent && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                أهلاً <strong>{selectedStudent.name}</strong>. إذا لم يكن هذا اسمك، تأكد من الرمز.
              </span>
            </div>
          )}

          {codeNotFound && (
            <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>هذا الرمز غير مسجّل في هذه المجموعة. تأكد منه أو اسأل المدرّس.</span>
            </div>
          )}

          {!codeComplete && (
            <p className="text-[10px] text-slate-400">للتجربة: جرّب الرمز {MOCK_STUDENTS[0].studentCode}</p>
          )}
        </div>

        {/* Step 2: Camera / Upload Pages */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800">
              صفحات الورقة المحلولة ({pages.length} صفحات مضافة):
            </label>
            <span className="text-[10px] text-slate-500">JPG أو PNG واضحة</span>
          </div>

          {/* Big Camera / Add Pages Button */}
          <button
            type="button"
            onClick={handleAddPage}
            className="w-full bg-[#1E3A5F] hover:bg-[#152a45] text-white p-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-xs active:scale-98"
          >
            <Camera className="w-5 h-5 text-emerald-400" />
            <span>صوّر صفحات ورقتك بالكاميرا / أضف صفحة</span>
          </button>

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

                {/* Simulated Paper Preview Thumbnail */}
                <div className="h-20 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-400 font-mono text-[11px] relative overflow-hidden">
                  <div className="absolute inset-0 p-2 opacity-50 font-serif text-[10px] leading-tight select-none pointer-events-none">
                    2س + 2ص ص' = 0 <br />
                    ص' = -س / ص <br />
                    ص'' = (-ص - س ص') / ص²
                  </div>
                  <span className="bg-slate-800/60 text-white px-2 py-0.5 rounded text-[10px] z-10 backdrop-blur-xs">
                    معاينة الصفحة {idx + 1}
                  </span>
                </div>

                {/* Tilt / Dark Photo Warning (PDF requirement) */}
                {p.isDark && (
                  <div className="p-2 bg-amber-50 border border-amber-300 rounded-lg text-amber-800 text-[11px] flex items-center gap-1.5 font-medium">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>تنبيه: الصورة مظلمة أو مائلة قليلاً — يفضل إعادة التصوير في مكان ذي إضاءة أوضح لضمان دقة القراءة.</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={pages.length === 0 || isSubmitting || !selectedStudent}
          className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-3.5 rounded-xl font-bold text-sm transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <span>جارِ الرفع والتحقق...</span>
          ) : (
            <>
              <span>{selectedStudent ? `إرسال الورقة إلى ${CURRENT_TEACHER.name}` : 'اكتب رمزك أولاً'}</span>
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
