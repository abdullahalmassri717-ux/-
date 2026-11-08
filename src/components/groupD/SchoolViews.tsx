import React, { useState } from 'react';
import { ScreenId } from '../../types';
import {
  MOCK_SCHOOL_INFO,
  MOCK_SCHOOL_TEACHERS,
  MOCK_SCHOOL_CLASSES
} from '../../mockData';
import {
  Building2,
  Users,
  GraduationCap,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Send,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  Clock,
  MessageCircle,
  FileText,
  Plus,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { notify } from '../../lib/notify';

// D1: School Principal Dashboard
export const SchoolDashboard: React.FC<{ onNavigate: (screen: ScreenId) => void }> = ({ onNavigate }) => {
  return (
    <div className="space-y-6 text-right max-w-6xl mx-auto pb-16">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
              لوحة الإدارة المدرسية
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs text-slate-500">الصفوف 1 - 9 الأساسية (غزة)</span>
          </div>
          <h1 className="text-2xl font-black text-[#1E3A5F] mt-1">
            {MOCK_SCHOOL_INFO.name}
          </h1>
          <p className="text-xs text-slate-600">
            المديرة: <strong>{MOCK_SCHOOL_INFO.principalName}</strong> · إشراف تربوي متكامل على <strong>{MOCK_SCHOOL_INFO.totalTeachers} معلماً</strong> و <strong>{MOCK_SCHOOL_INFO.totalStudents} طالباً</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('D3')}
            className="bg-[#1E3A5F] hover:bg-[#152a45] text-white px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all shadow-2xs"
          >
            تقرير المدرسة والجدول الحراري ←
          </button>
        </div>
      </div>

      {/* 4 Metrics Cards (PDF requirement: عدد الطلاب، امتحانات هذا الشهر، متوسط الأداء، تقارير أرسلت) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1 shadow-2xs">
          <span className="text-xs text-slate-500">إجمالي طلاب المدرسة</span>
          <div className="text-2xl font-black text-[#1E3A5F] font-mono tabular-nums">280 طالب</div>
          <span className="text-[11px] text-slate-400">موزعون على 9 صفوف</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1 shadow-2xs">
          <span className="text-xs text-slate-500">امتحانات هذا الشهر</span>
          <div className="text-2xl font-black text-[#1E3A5F] font-mono tabular-nums">18 امتحاناً</div>
          <span className="text-[11px] text-emerald-600 font-bold">كل الأوراق ممسوحة</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1 shadow-2xs">
          <span className="text-xs text-slate-500">متوسط الأداء العام</span>
          <div className="text-2xl font-black text-[#1E3A5F] font-mono tabular-nums">82.4%</div>
          <span className="text-[11px] text-emerald-600 font-bold">+2.8% مقارنة بالفصل الماضي</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1 shadow-2xs">
          <span className="text-xs text-slate-500">تقارير أُرسلت للأهالي</span>
          <div className="text-2xl font-black text-emerald-600 font-mono tabular-nums">264 تقرير</div>
          <span className="text-[11px] text-slate-400">نسبة وصول 94.2%</span>
        </div>
      </div>

      {/* Comparative Performance Chart Grades 1-9 in English & Math (PDF requirement) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="font-extrabold text-[#1E3A5F] text-sm flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-600" />
            <span>رسم بياني لمتوسط الأداء لكل صف (1 - 9) في مادتي الرياضيات واللغة الإنجليزية</span>
          </h3>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 font-bold text-blue-900">
              <span className="w-3 h-3 rounded-full bg-blue-600"></span> الرياضيات
            </span>
            <span className="flex items-center gap-1 font-bold text-emerald-900">
              <span className="w-3 h-3 rounded-full bg-emerald-600"></span> اللغة الإنجليزية
            </span>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          {MOCK_SCHOOL_CLASSES.map((cls, idx) => {
            const mathScore = Math.max(70, Math.min(95, cls.avgScore + (idx % 2 === 0 ? 3 : -4)));
            const engScore = Math.max(68, Math.min(96, cls.avgScore + (idx % 3 === 0 ? -3 : 4)));

            return (
              <div key={cls.id} className="space-y-1 text-xs">
                <div className="flex items-center justify-between text-slate-700">
                  <span className="font-bold">{cls.grade} ({cls.section})</span>
                  <div className="flex items-center gap-3 font-mono tabular-nums">
                    <span className="text-blue-700 font-bold">رياضيات: {mathScore}%</span>
                    <span className="text-emerald-700 font-bold">إنجليزية: {engScore}%</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-blue-600 h-full rounded-full" style={{ width: `${mathScore}%` }} />
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${engScore}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Alerts & Teachers Activity (PDF requirement: تنبيهات: الصف السادس الكسور إتقان 42%، معلم لم يرفع أوراقاً منذ أسبوعين) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* School Alerts */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
          <h3 className="font-extrabold text-red-900 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span>تنبيهات الإدارة والفاقد التعليمي</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div className="p-3.5 bg-red-50/70 border border-red-200 rounded-xl space-y-1">
              <div className="flex items-center justify-between font-bold text-red-950">
                <span>الصف السادس – مبحث الكسور العشرية والاعتيادية</span>
                <span className="bg-red-200 text-red-900 px-2 py-0.5 rounded font-mono tabular-nums">
                  إتقان 42% فقط
                </span>
              </div>
              <p className="text-red-800 text-[11px] leading-relaxed">
                تراجع ملحوظ في شعبة السادس (أ). توصية بتكليف أ. خلود دلول بإعطاء حصص تقوية علاجية مستهدفة.
              </p>
            </div>

            <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1">
              <div className="flex items-center justify-between font-bold text-amber-950">
                <span>تنبيه التزام المعلمين: أ. خلود دلول</span>
                <span className="bg-amber-200 text-amber-900 px-2 py-0.5 rounded font-mono">
                  تأخير رفع
                </span>
              </div>
              <p className="text-amber-800 text-[11px] leading-relaxed">
                «معلم لم يرفع أوراق امتحانات أو واجبات منذ أسبوعين». يُرجى المتابعة الإدارية.
              </p>
            </div>
          </div>
        </div>

        {/* Teachers Activity Log (PDF requirement: نشاط المعلمين: من رفع ومن راجع) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-[#1E3A5F] text-sm">نشاط المعلمين ومعدلات التصحيح</h3>
            <button onClick={() => onNavigate('D2')} className="text-xs text-blue-700 hover:underline font-bold">
              إدارة المعلمين والصفوف ←
            </button>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {MOCK_SCHOOL_TEACHERS.map((tc) => (
              <div key={tc.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <strong className="block text-slate-900">{tc.name}</strong>
                  <span className="text-[11px] text-slate-500">{tc.subject} · {tc.classes.join(', ')}</span>
                </div>
                <div className="text-left font-mono text-[11px]">
                  <span className="text-slate-400 block">آخر رفع أوراق:</span>
                  <span className={tc.status === 'inactive' ? 'text-red-600 font-bold' : 'text-emerald-700 font-bold'}>
                    {tc.lastPaperUpload}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// D2: Teachers & Classes Page
export const TeachersClassesPage: React.FC<{ onNavigate: (screen: ScreenId) => void }> = ({ onNavigate }) => {
  const [tab, setTab] = useState<'teachers' | 'classes'>('teachers');

  return (
    <div className="space-y-6 text-right max-w-6xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <button
            onClick={() => onNavigate('D1')}
            className="text-xs text-slate-500 hover:text-[#1E3A5F] flex items-center gap-1 cursor-pointer font-medium mb-1"
          >
            <ArrowRight className="w-4 h-4" />
            <span>العودة للوحة المدرسة</span>
          </button>
          <h1 className="text-xl font-extrabold text-[#1E3A5F]">
            المعلمون والصفوف والشعب
          </h1>
          <p className="text-xs text-slate-500">
            إدارة طاقم المعلمين وتوزيع الصفوف واستيراد قوائم الطلاب من ملفات Excel.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {tab === 'teachers' ? (
            <button
              onClick={() => notify('تم إرسال رابط دعوة المعلم للانضمام لكادر المدرسة عبر واتساب!')}
              className="bg-[#1E3A5F] text-white px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5"
            >
              <MessageCircle className="w-4 h-4 text-emerald-400" />
              <span>+ دعوة معلم عبر واتساب</span>
            </button>
          ) : (
            <button
              onClick={() => notify('نافذة استيراد قوائم طلاب الصفوف من ملف Excel')}
              className="bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>استيراد طلاب من Excel</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-xs">
        <button
          onClick={() => setTab('teachers')}
          className={`px-4 py-2 rounded-lg font-bold cursor-pointer ${
            tab === 'teachers' ? 'bg-[#1E3A5F] text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          طاقم المعلمين ({MOCK_SCHOOL_TEACHERS.length})
        </button>
        <button
          onClick={() => setTab('classes')}
          className={`px-4 py-2 rounded-lg font-bold cursor-pointer ${
            tab === 'classes' ? 'bg-[#1E3A5F] text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          الصفوف والشعب ({MOCK_SCHOOL_CLASSES.length})
        </button>
      </div>

      {tab === 'teachers' ? (
        /* Teachers Table (PDF requirement) */
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#F7F8FA] text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3.5">اسم المعلم</th>
                <th className="p-3.5">المادة</th>
                <th className="p-3.5">الصفوف المسندة</th>
                <th className="p-3.5">رقم الواتساب</th>
                <th className="p-3.5 text-center">الحالة</th>
                <th className="p-3.5 text-center">الإجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {MOCK_SCHOOL_TEACHERS.map((tc) => (
                <tr key={tc.id} className="hover:bg-slate-50">
                  <td className="p-3.5 font-bold text-slate-900">{tc.name}</td>
                  <td className="p-3.5 text-slate-700">{tc.subject}</td>
                  <td className="p-3.5 text-slate-600">{tc.classes.join('، ')}</td>
                  <td className="p-3.5 font-mono text-slate-600 tabular-nums">{tc.phone}</td>
                  <td className="p-3.5 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                      tc.status === 'active' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'
                    }`}>
                      {tc.status === 'active' ? 'نشط' : 'متأخر في الرفع'}
                    </span>
                  </td>
                  <td className="p-3.5 text-center">
                    <button
                      onClick={() => notify(`مراسلة المعلم ${tc.name} عبر واتساب`)}
                      className="text-blue-700 hover:underline font-bold cursor-pointer"
                    >
                      مراسلة واتساب
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Classes Table (PDF requirement) */
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#F7F8FA] text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3.5">الصف الدراسي والشعبة</th>
                <th className="p-3.5 text-center">عدد الطلاب</th>
                <th className="p-3.5">المعلم المسؤول</th>
                <th className="p-3.5 text-center">متوسط درجات الصف</th>
                <th className="p-3.5 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {MOCK_SCHOOL_CLASSES.map((cls) => (
                <tr key={cls.id} className="hover:bg-slate-50">
                  <td className="p-3.5 font-bold text-slate-900">{cls.grade} ({cls.section})</td>
                  <td className="p-3.5 text-center font-mono tabular-nums">{cls.studentCount} طالب</td>
                  <td className="p-3.5 text-slate-700">{cls.assignedTeacher}</td>
                  <td className="p-3.5 text-center font-mono font-bold text-[#1E3A5F] tabular-nums">
                    {cls.avgScore}%
                  </td>
                  <td className="p-3.5 text-center">
                    <button
                      onClick={() => onNavigate('D3')}
                      className="text-blue-700 hover:underline font-bold cursor-pointer"
                    >
                      الجدول الحراري للفاقد
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// D3: School Report & Heatmap Page
export const SchoolReportPage: React.FC<{ onNavigate: (screen: ScreenId) => void }> = ({ onNavigate }) => {
  const [period, setPeriod] = useState<'month' | 'term'>('month');

  // Heatmap rows: Classes x Lessons with % mastery (PDF requirement: جدول حراري: الصفوف × الدروس، اللون حسب نسبة الإتقان)
  const heatmapData = [
    { grade: 'الصف الأول (أ)', l1: 94, l2: 92, l3: 88, l4: 90 },
    { grade: 'الصف الثاني (أ)', l1: 91, l2: 89, l3: 85, l4: 87 },
    { grade: 'الصف الثالث (أ)', l1: 88, l2: 86, l3: 82, l4: 84 },
    { grade: 'الصف الرابع (أ)', l1: 85, l2: 80, l3: 79, l4: 81 },
    { grade: 'الصف الخامس (أ)', l1: 82, l2: 78, l3: 74, l4: 76 },
    { grade: 'الصف السادس (أ)', l1: 75, l2: 42, l3: 68, l4: 70 }, // Notice l2 = 42% (Fractions Alert)
    { grade: 'الصف السابع (أ)', l1: 84, l2: 82, l3: 79, l4: 83 },
    { grade: 'الصف الثامن (أ)', l1: 80, l2: 76, l3: 75, l4: 78 },
    { grade: 'الصف التاسع (أ)', l1: 82, l2: 79, l3: 78, l4: 81 },
  ];

  const getHeatmapColor = (pct: number) => {
    if (pct >= 85) return 'bg-emerald-600 text-white font-bold';
    if (pct >= 70) return 'bg-emerald-200 text-emerald-950 font-bold';
    if (pct >= 55) return 'bg-amber-200 text-amber-950 font-bold';
    return 'bg-red-500 text-white font-bold'; // Critical
  };

  return (
    <div className="space-y-6 text-right max-w-6xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <button
            onClick={() => onNavigate('D1')}
            className="text-xs text-slate-500 hover:text-[#1E3A5F] flex items-center gap-1 cursor-pointer font-medium mb-1"
          >
            <ArrowRight className="w-4 h-4" />
            <span>العودة للوحة المدرسة</span>
          </button>
          <h1 className="text-xl font-extrabold text-[#1E3A5F]">
            تقرير المدرسة الشامل والجدول الحراري للفاقد التعليمي
          </h1>
          <p className="text-xs text-slate-500">
            تحليل درجات 280 طالباً عبر شبكة تقاطع الصفوف × الدروس لرصد الخلل الأكاديمي فوراً.
          </p>
        </div>

        {/* Buttons: إرسال التقارير الشهرية لكل الأهالي PDF، وزر تحميل تقرير الإدارة (PDF requirement) */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => notify('تم تحميل التقرير الإداري الشامل للمدرسة بصيغة PDF!')}
            className="bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5"
          >
            <Download className="w-4 h-4 text-blue-600" />
            <span>تحميل تقرير الإدارة (PDF)</span>
          </button>

          <button
            onClick={() => notify('تم إرسال التقارير الشهرية PDF تلقائياً لجميع أولياء أمور طلاب المدرسة (264 ولي أمر) عبر واتساب!')}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <Send className="w-4 h-4" />
            <span>إرسال التقارير الشهرية لكل الأهالي (PDF)</span>
          </button>
        </div>
      </div>

      {/* Period Filter (PDF requirement: اختيار الفترة: شهر / فصل) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-700">الفترة الزمنية للتقرير:</span>
          <div className="flex gap-1.5">
            <button
              onClick={() => setPeriod('month')}
              className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer ${
                period === 'month' ? 'bg-[#1E3A5F] text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              التقرير الشهري (نوفمبر 2026)
            </button>
            <button
              onClick={() => setPeriod('term')}
              className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer ${
                period === 'term' ? 'bg-[#1E3A5F] text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              التقرير الفصلي الشامل (الفصل الأول)
            </button>
          </div>
        </div>

        {/* Heatmap Legend */}
        <div className="flex items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-emerald-600 inline-block"></span> ممتاز (85%+)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-emerald-200 inline-block"></span> جيد (70 - 84%)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-amber-200 inline-block"></span> متوسط (55 - 69%)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-red-500 inline-block"></span> فاقد تعليمي ضعيف (&lt;55%)
          </span>
        </div>
      </div>

      {/* Heatmap Matrix Table (PDF requirement) */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
        <table className="w-full text-center text-xs">
          <thead className="bg-[#1E3A5F] text-white font-bold">
            <tr>
              <th className="p-3.5 text-right">الصف والشعبة</th>
              <th className="p-3.5">الدرس 1 (العمليات الحسابية)</th>
              <th className="p-3.5">الدرس 2 (الكسور والنسب)</th>
              <th className="p-3.5">الدرس 3 (الهندسة والقياس)</th>
              <th className="p-3.5">الدرس 4 (المسائل الكلامية)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono">
            {heatmapData.map((row, idx) => (
              <tr key={idx} className="hover:bg-slate-50/70">
                <td className="p-3.5 text-right font-sans font-bold text-slate-900">
                  {row.grade}
                </td>
                <td className="p-2">
                  <span className={`px-3 py-1 rounded-md text-xs inline-block ${getHeatmapColor(row.l1)}`}>
                    {row.l1}%
                  </span>
                </td>
                <td className="p-2">
                  <span className={`px-3 py-1 rounded-md text-xs inline-block ${getHeatmapColor(row.l2)}`}>
                    {row.l2}%
                  </span>
                </td>
                <td className="p-2">
                  <span className={`px-3 py-1 rounded-md text-xs inline-block ${getHeatmapColor(row.l3)}`}>
                    {row.l3}%
                  </span>
                </td>
                <td className="p-2">
                  <span className={`px-3 py-1 rounded-md text-xs inline-block ${getHeatmapColor(row.l4)}`}>
                    {row.l4}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// D4: Compare Groups & Teachers Tool [قريباً] (PDF page 12)
export const TeacherComparisonPage: React.FC<{ onNavigate: (screen: ScreenId) => void }> = ({ onNavigate }) => {
  return (
    <div className="space-y-6 text-right max-w-5xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <button
            onClick={() => onNavigate('D1')}
            className="text-xs text-slate-500 hover:text-[#1E3A5F] flex items-center gap-1 cursor-pointer font-medium mb-1"
          >
            <ArrowRight className="w-4 h-4" />
            <span>العودة للوحة المدرسة</span>
          </button>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-[#1E3A5F]">
              مقارنة المجموعات والمعلمين
            </h1>
            <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded">
              قريباً
            </span>
          </div>
          <p className="text-xs text-slate-500">
            مقارنة أداء الشعب والمعلمين عبر الأسابيع مع ملخص ذكي بسطرين يوضح أين الفجوة الأكبر ولماذا.
          </p>
        </div>
      </div>

      {/* 2-line AI Diagnostic Summary (PDF page 12 requirement: ملخص بسطرين من الذكاء الاصطناعي: أين الفجوة الأكبر ولماذا) */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-950 space-y-1">
        <strong className="block font-bold text-[#1E3A5F] flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-blue-600" />
          <span>ملخص الذكاء الاصطناعي التشخيصي (أين الفجوة ولماذا):</span>
        </strong>
        <p className="leading-relaxed text-blue-900 text-[12px]">
          «الفجوة الأكبر تظهر في الصف السادس (شعبة أ) في موضوع الكسور بمعدل إتقان 42%، ويعود السبب إلى غياب الاختبارات التشخيصية الأسبوعية مقارنة بباقي الصفوف، مع تأخر رفع أوراق الواجبات».
        </p>
      </div>

      {/* Comparison Table (PDF requirement: المجموعة/المعلم، المتوسط، التغير، أضعف درس، نسبة التسليم) */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
        <table className="w-full text-right text-xs">
          <thead className="bg-[#F7F8FA] text-slate-700 font-bold border-b border-slate-200">
            <tr>
              <th className="p-3.5">المعلم / الشعبة</th>
              <th className="p-3.5 text-center">المتوسط العام</th>
              <th className="p-3.5 text-center">التغيّر الأسبوعي</th>
              <th className="p-3.5">أضعف درس مرصود</th>
              <th className="p-3.5 text-center">نسبة تسليم الأوراق</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            <tr className="hover:bg-slate-50">
              <td className="p-3.5 font-bold text-slate-900">أ. أحمد حلس (التاسع أ)</td>
              <td className="p-3.5 text-center font-mono font-bold text-emerald-600 tabular-nums">82.4%</td>
              <td className="p-3.5 text-center text-emerald-700 font-bold">+3.1% ↗</td>
              <td className="p-3.5 text-slate-600">المتباينات الخطية</td>
              <td className="p-3.5 text-center font-mono tabular-nums">98%</td>
            </tr>
            <tr className="hover:bg-slate-50">
              <td className="p-3.5 font-bold text-slate-900">أ. ريم شملخ (السابع أ)</td>
              <td className="p-3.5 text-center font-mono font-bold text-emerald-600 tabular-nums">83.1%</td>
              <td className="p-3.5 text-center text-emerald-700 font-bold">+1.8% ↗</td>
              <td className="p-3.5 text-slate-600">Past Perfect Tense</td>
              <td className="p-3.5 text-center font-mono tabular-nums">96%</td>
            </tr>
            <tr className="hover:bg-slate-50 bg-red-50/30">
              <td className="p-3.5 font-bold text-red-950">أ. خلود دلول (السادس أ)</td>
              <td className="p-3.5 text-center font-mono font-bold text-red-600 tabular-nums">64.2%</td>
              <td className="p-3.5 text-center text-red-700 font-bold">-5.4% ↘</td>
              <td className="p-3.5 text-red-800 font-bold">الكسور والعمليات عليها</td>
              <td className="p-3.5 text-center font-mono tabular-nums">72%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
