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
  Search,
  Check,
  ChevronDown,
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
  const [selectedStudentId, setSelectedStudentId] = useState<string>('s1');
  const [studentCodeInput, setStudentCodeInput] = useState<string>('1042');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
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

  const selectedStudent = MOCK_STUDENTS.find(s => s.id === selectedStudentId) || MOCK_STUDENTS[0];

  const filteredStudents = MOCK_STUDENTS.filter(s =>
    s.name.includes(searchQuery) || s.studentCode.includes(searchQuery)
  );

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
            تم استلام <strong>{pages.length} صفحات</strong> للطالب <strong>{selectedStudent.name}</strong> في امتحان <strong>التفاضل والاشتقاق الضمني</strong> بنجاح.
          </p>

          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs text-right space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <span>ماذا بعد التسليم؟</span>
            </div>
            <p className="text-[11px] text-emerald-800 leading-normal">
              يقوم أ. محمد بمراجعة التصحيح واعتماده، وستصلك ورقتك الأصلية محبرة بالقلم الأحمر مع تفاصيل درجاتك عبر رسالة واتساب على رقم هاتفك المسجل فوراً.
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
              رابط تسليم التوجيهي
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
        {/* Step 1: Select student name or enter 4-digit code */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
          <label className="block text-xs font-bold text-slate-800">
            حدد اسمك من قائمة طلاب الأستاذ محمد:
          </label>

          {/* Student Selector Dropdown with search */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowDropdown(!showDropdown)}
              className="w-full p-2.5 bg-[#F7F8FA] border border-slate-300 rounded-lg text-xs font-semibold text-right flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span>{selectedStudent.name}</span>
                <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-mono tabular-nums">
                  رمز: {selectedStudent.studentCode}
                </span>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>

            {showDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 p-2 space-y-2 max-h-56 overflow-y-auto">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ابحث باسمك أو برقمك..."
                    className="w-full p-1.5 pr-7 bg-slate-50 border border-slate-200 rounded-md text-xs"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute top-2 right-2" />
                </div>
                <div className="space-y-1">
                  {filteredStudents.map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => {
                        setSelectedStudentId(st.id);
                        setStudentCodeInput(st.studentCode);
                        setShowDropdown(false);
                      }}
                      className={`w-full text-right p-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                        selectedStudentId === st.id ? 'bg-[#E8F0F8] text-[#1E3A5F] font-bold' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span>{st.name}</span>
                      <span className="font-mono text-[10px] text-slate-500 tabular-nums">{st.studentCode}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-500">
            <span>أو اكتب رمزك الخاص (4 أرقام):</span>
            <input
              type="text"
              maxLength={4}
              value={studentCodeInput}
              onChange={(e) => {
                const val = e.target.value;
                setStudentCodeInput(val);
                const found = MOCK_STUDENTS.find(s => s.studentCode === val);
                if (found) setSelectedStudentId(found.id);
              }}
              className="w-16 p-1 text-center bg-[#F7F8FA] border border-slate-300 rounded font-mono font-bold text-xs tabular-nums"
            />
          </div>
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
          disabled={pages.length === 0 || isSubmitting}
          className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-3.5 rounded-xl font-bold text-sm transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <span>جارِ الرفع والتحقق...</span>
          ) : (
            <>
              <span>إرسال الورقة للأستاذ محمد الآن</span>
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
