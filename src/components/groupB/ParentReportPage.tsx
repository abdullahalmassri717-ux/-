import React, { useState } from 'react';
import { ScreenId } from '../../types';
import { MOCK_STUDENTS, CURRENT_TEACHER } from '../../mockData';
import {
  Send,
  MessageCircle,
  FileText,
  Volume2,
  Play,
  Pause,
  CheckCircle2,
  XCircle,
  Download,
  Copy,
  ArrowRight,
  TrendingUp,
  Award
} from 'lucide-react';

interface ParentReportPageProps {
  onNavigate: (screen: ScreenId) => void;
}

export const ParentReportPage: React.FC<ParentReportPageProps> = ({ onNavigate }) => {
  const [reportTab, setReportTab] = useState<'parent' | 'student' | 'teacher_summary'>('parent');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('s1');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>(['s1', 's2', 's3', 's4']);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(25);
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);

  const currentStudent = MOCK_STUDENTS.find(s => s.id === selectedStudentId) || MOCK_STUDENTS[0];

  const handleToggleSelectAll = () => {
    if (selectedStudentIds.length === MOCK_STUDENTS.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(MOCK_STUDENTS.map(s => s.id));
    }
  };

  const handleToggleStudent = (id: string) => {
    if (selectedStudentIds.includes(id)) {
      setSelectedStudentIds(selectedStudentIds.filter(i => i !== id));
    } else {
      setSelectedStudentIds([...selectedStudentIds, id]);
    }
  };

  const handleBatchSend = () => {
    setIsSending(true);
    setTimeout(() => {
      setIsSending(false);
      setSendSuccess(true);
      setTimeout(() => setSendSuccess(false), 3000);
    }, 1200);
  };

  return (
    <div className="space-y-6 text-right max-w-6xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <button
            onClick={() => onNavigate('B9')}
            className="text-xs text-slate-500 hover:text-[#1E3A5F] flex items-center gap-1 cursor-pointer font-medium mb-1"
          >
            <ArrowRight className="w-4 h-4" />
            <span>العودة لنتائج الامتحان</span>
          </button>
          <h1 className="text-xl font-extrabold text-[#1E3A5F]">
            معاينة تقرير ولي الأمر وإرسال رسائل واتساب
          </h1>
          <p className="text-xs text-slate-500">
            توليد تقرير شخصي ملخص من صفحة واحدة لكل طالب مع رسالة واتساب وتسجيل صوتي مقروء.
          </p>
        </div>

        <button
          onClick={handleBatchSend}
          disabled={selectedStudentIds.length === 0 || isSending}
          className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-2 self-start sm:self-auto"
        >
          <Send className="w-4 h-4" />
          <span>
            {isSending
              ? 'جارِ الإرسال عبر واتساب...'
              : `إرسال للمحددين (${selectedStudentIds.length} طلاب)`}
          </span>
        </button>
      </div>

      {sendSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>تم إرسال التقارير ورسائل الواتساب بنجاح لجميع أولياء الأمور المحددين!</span>
        </div>
      )}

      {/* Report Types Tabs (PDF requirement: الطالب، ولي الأمر، المدرّس) */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-xs">
        <button
          onClick={() => setReportTab('parent')}
          className={`px-4 py-2 rounded-lg font-bold transition-colors cursor-pointer ${
            reportTab === 'parent' ? 'bg-[#1E3A5F] text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          تقرير ولي الأمر (PDF + واتساب)
        </button>
        <button
          onClick={() => setReportTab('student')}
          className={`px-4 py-2 rounded-lg font-bold transition-colors cursor-pointer ${
            reportTab === 'student' ? 'bg-[#1E3A5F] text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          تقرير الطالب (الورقة المصححة + ما يحتاج أن يعمل عليه)
        </button>
        <button
          onClick={() => setReportTab('teacher_summary')}
          className={`px-4 py-2 rounded-lg font-bold transition-colors cursor-pointer ${
            reportTab === 'teacher_summary' ? 'bg-[#1E3A5F] text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          المدرّس (ملخّص المجموعة الشامل)
        </button>
      </div>

      {/* Main Grid: Student Selection Table (Left) + 1-Page PDF & WhatsApp Preview (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Student Checklist Column (1 col) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-[#1E3A5F] text-sm">قائمة الطلاب وحالة الرسائل</h3>
            <button
              onClick={handleToggleSelectAll}
              className="text-[11px] text-blue-700 hover:underline font-bold cursor-pointer"
            >
              {selectedStudentIds.length === MOCK_STUDENTS.length ? 'إلغاء التحديد' : 'تحديد الكل'}
            </button>
          </div>

          <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto space-y-1">
            {MOCK_STUDENTS.map((st) => {
              const isChecked = selectedStudentIds.includes(st.id);
              const isCurrent = selectedStudentId === st.id;

              return (
                <div
                  key={st.id}
                  onClick={() => setSelectedStudentId(st.id)}
                  className={`p-2.5 rounded-xl flex items-center justify-between cursor-pointer transition-colors ${
                    isCurrent ? 'bg-[#E8F0F8]' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleToggleStudent(st.id);
                      }}
                      className="accent-[#1E3A5F] w-4 h-4 cursor-pointer"
                    />
                    <div>
                      <span className="font-bold text-xs text-slate-800 block">{st.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {st.parentPhone} · {st.latestScore}%
                      </span>
                    </div>
                  </div>

                  {/* Status indicator: أُرسلت / فشلت / معلق (PDF requirement) */}
                  <div>
                    {st.id === 's1' || st.id === 's3' ? (
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-bold">
                        أُرسلت ✓
                      </span>
                    ) : st.id === 's5' ? (
                      <span className="text-[10px] text-red-700 bg-red-50 px-1.5 py-0.5 rounded font-bold">
                        فشلت (عدم اتصال)
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        جاهز للإرسال
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 1-Page PDF Layout Preview & WhatsApp Bubble (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Audio voice note player [قريباً] (PDF page 13: مشغل صوت لمعاينة التقرير مقروءاً بصوت عربي) */}
          <div className="bg-gradient-to-r from-blue-900 to-[#1E3A5F] text-white rounded-xl p-4 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                className="w-10 h-10 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center transition-transform active:scale-95 cursor-pointer shadow-md"
              >
                {isPlayingAudio ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 mr-0.5 rtl:ml-0.5" />}
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-xs">
                    استماع للتقرير الصوتي المقروء لولي الأمر (دقيقة واحدة)
                  </span>
                  <span className="text-[10px] bg-white/20 text-blue-100 px-1.5 py-0.2 rounded">
                    قريباً
                  </span>
                </div>
                <p className="text-[11px] text-blue-200">
                  تسجيل صوتي ذكي يقرأ نقاط القوة والضعف بصوت عربي واضح ومطمئن لولي الأمر.
                </p>
              </div>
            </div>

            <span className="font-mono text-xs text-blue-200 tabular-nums">00:48 / 01:00</span>
          </div>

          {/* 1-Page PDF Report Card Preview (PDF requirement: من صفحة واحدة PDF مع مقارنة ونقطتا قوة وضعف ونصيحة وشعار) */}
          <div className="bg-white border-2 border-slate-300 rounded-2xl p-6 sm:p-8 shadow-md space-y-5 text-right font-sans relative">
            {/* Report Header */}
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#1E3A5F] text-white flex items-center justify-center font-bold text-base">
                  د✓
                </div>
                <div>
                  <h3 className="font-black text-lg text-[#1E3A5F]">منصة دِقّـة · بطاقة تقرير الأداء الفردي</h3>
                  <p className="text-xs text-slate-500">
                    تقرير اختبار الثانوية العامة الدوري · المعلم: <strong>{CURRENT_TEACHER.name}</strong>
                  </p>
                </div>
              </div>
              <div className="text-left font-mono text-xs text-slate-400">
                DATE: 2026-11-06 <br />
                DOC_REF: REP-1042
              </div>
            </div>

            {/* Student Info & Score Strip */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-0.5">
                <span className="text-xs text-slate-400">اسم الطالب:</span>
                <h4 className="text-base font-extrabold text-slate-900">{currentStudent.name}</h4>
                <p className="text-xs text-slate-500">{currentStudent.group}</p>
              </div>

              {/* Score and Comparison with previous exam (PDF requirement: مقارنة بالامتحان السابق) */}
              <div className="flex items-center gap-4 text-left">
                <div>
                  <span className="text-[10px] text-slate-400 block">الدرجة المحققة</span>
                  <span className="text-3xl font-black text-[#1E3A5F] font-mono tabular-nums">
                    {currentStudent.latestScore} / {currentStudent.totalScore}
                  </span>
                </div>
                <div className="border-r border-slate-300 pr-3 text-emerald-700 text-xs font-bold">
                  <span>↗ +6 علامات</span>
                  <span className="block text-[10px] text-slate-500 font-normal">مقارنة بالاختبار السابق</span>
                </div>
              </div>
            </div>

            {/* 2 Strengths & 2 Weaknesses (PDF requirement) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Strengths */}
              <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3.5 space-y-2">
                <strong className="block text-emerald-950 font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>نقطتا القوة في الامتحان:</span>
                </strong>
                <ul className="space-y-1 text-[11px] text-emerald-900">
                  <li>• إتقان ممتاز لقواعد الاشتقاق الأساسية والاقترانات المثلثية.</li>
                  <li>• خطوات مرتبة ونموذجية في كتابة القانون الرياضي والتعويض.</li>
                </ul>
              </div>

              {/* Weaknesses */}
              <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3.5 space-y-2">
                <strong className="block text-amber-950 font-bold flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-[#D97706]" />
                  <span>نقطتا الضعف (ما يحتاج تطويره):</span>
                </strong>
                <ul className="space-y-1 text-[11px] text-amber-900">
                  <li>• خطأ حسابي في توحيد المقامات بالبسط عند إيجاد المشتقة الثانية.</li>
                  <li>• التسرع في التبسيط النهائي لمسائل الاشتقاق الضمني.</li>
                </ul>
              </div>
            </div>

            {/* 2-line advice from teacher (PDF requirement: نصيحة من سطرين) */}
            <div className="p-3.5 bg-blue-50/60 border border-blue-200 rounded-xl text-xs text-blue-950 space-y-1">
              <strong className="block font-bold">نصيحة الأستاذ محمد لولي الأمر والطالب:</strong>
              <p className="text-[11px] leading-relaxed text-blue-900">
                «مستوى الطالب أحمد في تطور ملحوظ ودرجاته تؤهله للتفوق في التوجيهي بإذن الله. نوصي بحل تمارين علاجية إضافية في توحيد مقامات الكسور الجبرية والمراجعة الهادئة قبل تسليم الورقة».
              </p>
            </div>

            {/* Footer with Daqqa logo and teacher signature */}
            <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-[11px] text-slate-500">
              <span>توقيع المعلم المعتمد: <strong>أ. محمد المصري</strong></span>
              <span className="font-bold text-[#1E3A5F]">منصة دِقّـة · فلسطين 🇵🇸</span>
            </div>
          </div>

          {/* WhatsApp Message Preview Bubble (PDF requirement) */}
          <div className="bg-emerald-900/10 border border-emerald-300 rounded-2xl p-4 text-right space-y-2 text-xs">
            <div className="flex items-center justify-between text-emerald-950 font-bold">
              <span className="flex items-center gap-1.5">
                <MessageCircle className="w-4 h-4 text-emerald-700" />
                <span>نص رسالة الواتساب التي ستصل هاتف ولي الأمر ({currentStudent.parentPhone})</span>
              </span>
              <button
                onClick={() => alert('تم نسخ نص الرسالة إلى الحافظة!')}
                className="text-[11px] text-emerald-800 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>نسخ النص</span>
              </button>
            </div>
            <div className="bg-white p-3 rounded-xl border border-slate-200 text-slate-700 font-sans leading-relaxed text-[11px]">
              السلام عليكم ولي أمر الطالب: <strong>{currentStudent.name}</strong> 🌸 <br />
              نرفق لكم نتيجة ورقة اختبار الرياضيات (التفاضل وقواعد الاشتقاق): <br />
              📊 <strong>الدرجة: {currentStudent.latestScore} / {currentStudent.totalScore}</strong> (مستوى ممتاز ↗ أعلى بـ 6 درجات عن السابق)<br />
              💪 <strong>أهم نقاط القوة:</strong> إتقان ممتاز لقواعد الاشتقاق وتطبيق القوانين الوزارية.<br />
              🎯 <strong>يحتاج تركيزاً على:</strong> توحيد المقامات والتبسيط النهائي لمسائل الاشتقاق الضمني.<br />
              📎 مرفق أعلاه ملف PDF يحتوي على الورقة المصححة وملاحظات الأستاذ محمد المصري.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
