import React, { useState } from 'react';
import { ScreenId } from '../../types';
import { useLoad } from '../../data/DataContext';
import { setSelected } from '../../data/selection';
import { notify } from '../../lib/notify';
import {
  FileText,
  Plus,
  Sparkles,
  UploadCloud,
  CheckCircle2,
  Clock,
  Printer,
  Calendar,
  Users,
  ChevronDown,
  Camera
} from 'lucide-react';

interface ExamsListPageProps {
  onNavigate: (screen: ScreenId) => void;
}

export const ExamsListPage: React.FC<ExamsListPageProps> = ({ onNavigate }) => {
  const [tab, setTab] = useState<'all' | 'exam' | 'homework'>('all');
  const [showNewModal, setShowNewModal] = useState(false);

  const examsQ = useLoad((st) => st.listAssessments());
  const exams = examsQ.data ?? [];
  const filteredExams = exams.filter(e => tab === 'all' || e.type === tab);
  const open = (examId: string, screen: ScreenId) => {
    setSelected('exam', examId);
    onNavigate(screen);
  };
  const copyLink = async (code: string) => {
    const url = `${window.location.origin}/s/${code}`;
    try {
      await navigator.clipboard.writeText(url);
      notify('تم نسخ رابط التسليم. أرسله للطلاب على واتساب.');
    } catch {
      notify(url, 'info');
    }
  };

  return (
    <div className="space-y-6 text-right">
      {/* Top Header with + New Exam Modal Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-[#1E3A5F]">الواجبات والامتحانات</h1>
          <p className="text-xs text-slate-500">إدارة وتقييم اختبارات مجموعات التوجيهي والواجبات المنزلية</p>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowNewModal(!showNewModal)}
            className="bg-[#1E3A5F] hover:bg-[#152a45] text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer transition-all shadow-2xs"
          >
            <Plus className="w-4 h-4" />
            <span>+ إنشاء جديد</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>

          {/* Modal dropdown choices */}
          {showNewModal && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShowNewModal(false)} />
              <div className="absolute left-0 sm:right-0 sm:left-auto mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-xl p-2 z-40 space-y-1">
                <button
                  onClick={() => {
                    setShowNewModal(false);
                    onNavigate('B5');
                  }}
                  className="w-full text-right p-3 rounded-lg hover:bg-slate-50 transition-colors flex items-start gap-2.5 cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-[#1E3A5F] shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-xs text-slate-900">أنشئه بنفسي</strong>
                    <span className="text-[11px] text-slate-500">
                      إدخال الأسئلة وتحديد معايير توزيع الدرجات يدوياً.
                    </span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setShowNewModal(false);
                    onNavigate('B5');
                  }}
                  className="w-full text-right p-3 rounded-lg hover:bg-emerald-50 transition-colors flex items-start gap-2.5 cursor-pointer bg-emerald-50/60 border border-emerald-200/60"
                >
                  <Camera className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <strong className="block text-xs text-emerald-900">تصوير ورقة الامتحان بالكاميرا</strong>
                      <span className="bg-emerald-600 text-white text-[9px] px-1.5 py-0.2 rounded-full font-bold">فوري</span>
                    </div>
                    <span className="text-[11px] text-emerald-700">
                      صوّر الامتحان المكتوب بخط يدك وسيقوم الذكاء الاصطناعي باستخراج الأسئلة وصياغة الروبريك.
                    </span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setShowNewModal(false);
                    onNavigate('C1');
                  }}
                  className="w-full text-right p-3 rounded-lg hover:bg-blue-50 transition-colors flex items-start gap-2.5 cursor-pointer bg-blue-50/50"
                >
                  <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-xs text-[#1E3A5F]">ولّده بالذكاء الاصطناعي</strong>
                    <span className="text-[11px] text-blue-700">
                      توليد امتحان وزاري فوري من دروس المنهاج مع سلم التصحيح.
                    </span>
                  </div>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Tabs Filter */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setTab('all')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
            tab === 'all' ? 'bg-[#1E3A5F] text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          الكل ({exams.length})
        </button>
        <button
          onClick={() => setTab('exam')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
            tab === 'exam' ? 'bg-[#1E3A5F] text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          الامتحانات الرسمية
        </button>
        <button
          onClick={() => setTab('homework')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
            tab === 'homework' ? 'bg-[#1E3A5F] text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          الواجبات المنزلية
        </button>
      </div>

      {examsQ.loading && !exams.length && <div className="text-center text-xs text-slate-500 py-10">جاري التحميل...</div>}
      {examsQ.error && <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3">{examsQ.error}</div>}
      {!examsQ.loading && !examsQ.error && filteredExams.length === 0 && (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-8 text-center space-y-2">
          <FileText className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-slate-700">لا توجد واجبات أو امتحانات بعد</p>
          <button onClick={() => onNavigate('B5')} className="mt-2 bg-[#1E3A5F] text-white px-4 py-2 rounded-lg text-xs font-bold cursor-pointer">إنشاء أول امتحان</button>
        </div>
      )}

      {/* Exam Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredExams.map((exam) => (
          <div
            key={exam.id}
            className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4 hover:border-blue-300 transition-colors flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  exam.type === 'exam' ? 'bg-blue-100 text-[#1E3A5F]' : 'bg-purple-100 text-purple-800'
                }`}>
                  {exam.type === 'exam' ? 'امتحان رئيسي' : 'واجب منزلي'}
                </span>

                {/* Status Pill */}
                {exam.status === 'needs_review' && (
                  <span className="text-xs bg-amber-100 text-amber-900 font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[#D97706]" />
                    يحتاج مراجعة
                  </span>
                )}
                {exam.status === 'completed' && (
                  <span className="text-xs bg-blue-100 text-blue-900 font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-blue-700" />
                    مكتمل التصحيح
                  </span>
                )}
                {exam.status === 'reports_sent' && (
                  <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    أُرسلت التقارير للأهالي
                  </span>
                )}
                {exam.status === 'awaiting_papers' && (
                  <span className="text-xs bg-slate-100 text-slate-600 font-bold px-2.5 py-0.5 rounded-full">
                    بانتظار رفع الأوراق
                  </span>
                )}
              </div>

              <h3 className="font-extrabold text-slate-900 text-base">{exam.title}</h3>

              <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 pt-1">
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  <span>{exam.group}</span>
                </div>
                <div className="flex items-center gap-1.5 font-mono tabular-nums">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>{exam.date}</span>
                </div>
              </div>

              {/* Progress bar of uploaded papers */}
              <div className="pt-2 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">الأوراق المرفوعة:</span>
                  <span className="font-bold text-[#1E3A5F] font-mono tabular-nums">
                    {exam.uploadedCount} من {exam.totalStudents} ({exam.totalStudents ? Math.round((exam.uploadedCount / exam.totalStudents) * 100) : 0}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#1E3A5F] h-full rounded-full"
                    style={{ width: `${exam.totalStudents ? Math.min(100, (exam.uploadedCount / exam.totalStudents) * 100) : 0}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Actions for this exam */}
            <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100 text-xs">
              {exam.status === 'needs_review' ? (
                <button
                  onClick={() => open(exam.id, 'B8')}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-2 px-3 rounded-lg font-bold text-center transition-colors cursor-pointer"
                >
                  مراجعة التصحيح
                </button>
              ) : (
                <button
                  onClick={() => open(exam.id, 'B9')}
                  className="flex-1 bg-[#1E3A5F] hover:bg-[#152a45] text-white py-2 px-3 rounded-lg font-bold text-center transition-colors cursor-pointer"
                >
                  النتائج والتحليل
                </button>
              )}

              <button
                onClick={() => open(exam.id, 'B7')}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 px-3 rounded-lg font-semibold cursor-pointer"
                title="رفع أوراق إضافية"
              >
                رفع أوراق
              </button>

              {exam.submissionMode === 'link' && (
                <button
                  onClick={() => copyLink(exam.submissionCode)}
                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 py-2 px-3 rounded-lg font-semibold cursor-pointer"
                  title="نسخ رابط تسليم الطلاب"
                >
                  رابط التسليم
                </button>
              )}

              <button
                onClick={() => open(exam.id, 'B6')}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-2 rounded-lg cursor-pointer"
                title="طباعة أوراق الإجابة مع كود QR"
              >
                <Printer className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
