import React, { useState } from 'react';
import { ScreenId } from '../../types';
import { MOCK_STUDENTS } from '../../mockData';
import {
  Calendar,
  Sparkles,
  Download,
  Send,
  ArrowRight,
  AlertTriangle,
  TrendingDown,
  MessageCircle,
  Bot,
  ToggleLeft,
  ToggleRight,
  Check,
  CheckCircle2,
  Clock,
  BookOpen
} from 'lucide-react';
import { notify } from '../../lib/notify';

// C7: Study Plan & Flashcards [قريباً]
export const StudyPlanTool: React.FC<{ onNavigate: (screen: ScreenId) => void }> = ({ onNavigate }) => {
  const [selectedStudent, setSelectedStudent] = useState(MOCK_STUDENTS[1]); // محمود البطش
  const [examDate, setExamDate] = useState('2026-11-20');
  const [activeTab, setActiveTab] = useState<'schedule' | 'flashcards'>('schedule');

  const weeklySchedule = [
    { day: 'الأحد', lesson: 'الاشتقاق الضمني والمشتقات العليا', task: '10 تمارين علاجية متدرجة', duration: '40 دقيقة' },
    { day: 'الإثنين', lesson: 'قاعدة السلسلة والمعادلات الوسيطية', task: 'مراجعة أمثلة الكتاب وحل 6 مسائل', duration: '35 دقيقة' },
    { day: 'الثلاثاء', lesson: 'المعدلات المرتبطة بالزمن', task: 'حل مسائل المخروط والأسطوانة', duration: '50 دقيقة' },
    { day: 'الأربعاء', lesson: 'تطبيقات القيم القصوى', task: 'مسائل المستطيل والدائرة', duration: '45 دقيقة' },
    { day: 'الخميس', lesson: 'امتحان تجريبي شامل', task: 'حل نموذج وزاري سابق مؤقت بساعة', duration: '60 دقيقة' },
  ];

  return (
    <div className="space-y-6 text-right max-w-5xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <button
            onClick={() => onNavigate('C_HUB')}
            className="text-xs text-slate-500 hover:text-[#1E3A5F] flex items-center gap-1 cursor-pointer font-medium mb-1"
          >
            <ArrowRight className="w-4 h-4" />
            <span>العودة لمركز الأدوات الذكية</span>
          </button>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-[#1E3A5F]">
              خطة المذاكرة الذكية وبطاقات المراجعة
            </h1>
            <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded">
              قريباً
            </span>
          </div>
          <p className="text-xs text-slate-500">
            توليد جدول دراسي أسبوعي وبطاقات تلخيصية من صفحة واحدة موجهة لعلاج نقاط ضعف الطالب.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => notify('تم تصدير خطة المذاكرة وبطاقات المراجعة بصيغة PDF!')}
            className="bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5"
          >
            <Download className="w-4 h-4 text-blue-600" />
            <span>تحميل PDF</span>
          </button>
          <button
            onClick={() => notify(`تم إرسال خطة المذاكرة الأسبوعية للطالب ${selectedStudent.name} عبر واتساب!`)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <MessageCircle className="w-4 h-4" />
            <span>إرسال للطالب على واتساب</span>
          </button>
        </div>
      </div>

      {/* Target Selector */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-700">اختر الطالب:</span>
          <select
            value={selectedStudent.id}
            onChange={(e) => {
              const s = MOCK_STUDENTS.find(it => it.id === e.target.value);
              if (s) setSelectedStudent(s);
            }}
            className="p-2 bg-[#F7F8FA] border border-slate-300 rounded-lg font-bold"
          >
            {MOCK_STUDENTS.map(st => (
              <option key={st.id} value={st.id}>{st.name} ({st.latestScore}%)</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 font-mono">
          <span className="font-sans font-bold text-slate-700">موعد الامتحان القادم:</span>
          <input
            type="date"
            value={examDate}
            onChange={(e) => setExamDate(e.target.value)}
            className="p-1.5 bg-[#F7F8FA] border border-slate-300 rounded-lg text-xs"
          />
        </div>
      </div>

      {/* Tabs: Weekly Table vs Flashcards */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-xs">
        <button
          onClick={() => setActiveTab('schedule')}
          className={`px-4 py-2 rounded-lg font-bold transition-colors cursor-pointer ${
            activeTab === 'schedule' ? 'bg-[#1E3A5F] text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          الجدول الأسبوعي المقترح
        </button>
        <button
          onClick={() => setActiveTab('flashcards')}
          className={`px-4 py-2 rounded-lg font-bold transition-colors cursor-pointer ${
            activeTab === 'flashcards' ? 'bg-[#1E3A5F] text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          بطاقات المراجعة السريعة (ملخصات مركزة)
        </button>
      </div>

      {activeTab === 'schedule' ? (
        /* Weekly Schedule Table (PDF requirement: كل يوم درس ومهمة ومدة) */
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#F7F8FA] text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3.5">اليوم</th>
                <th className="p-3.5">الدرس المستهدف</th>
                <th className="p-3.5">المهمة العلاجية</th>
                <th className="p-3.5 text-center">المدة الموصى بها</th>
                <th className="p-3.5 text-center">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {weeklySchedule.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="p-3.5 font-bold text-[#1E3A5F]">{row.day}</td>
                  <td className="p-3.5 text-slate-800 font-semibold">{row.lesson}</td>
                  <td className="p-3.5 text-slate-600">{row.task}</td>
                  <td className="p-3.5 text-center font-mono font-bold text-slate-700 tabular-nums">
                    {row.duration}
                  </td>
                  <td className="p-3.5 text-center">
                    <span className="text-[10px] bg-blue-50 text-blue-800 px-2 py-0.5 rounded font-bold">
                      مجدولة
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Flashcards Tab: 1-Page Summary for each weak lesson (PDF requirement: قانون، مثال محلول، خطأ شائع) */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="font-bold text-[#1E3A5F] text-sm">بطاقة 1: الاشتقاق الضمني</span>
              <span className="text-[10px] bg-amber-50 text-amber-800 px-2 py-0.5 rounded font-bold">
                إتقان 40%
              </span>
            </div>

            <div className="space-y-2">
              <div className="p-2.5 bg-blue-50/60 rounded-lg">
                <strong className="block text-[#1E3A5F] font-bold mb-0.5">القانون الوزاري الذهبي:</strong>
                <p className="font-mono text-slate-800">
                  عند اشتقاق أي حد يحوي (ص) بالنسبة لـ (س)، نضرب الناتج في ص' (قاعدة السلسلة).
                </p>
              </div>

              <div className="p-2.5 bg-emerald-50/60 rounded-lg">
                <strong className="block text-emerald-900 font-bold mb-0.5">مثال محلول سريع:</strong>
                <p className="font-mono text-slate-800">
                  س² + ص² = 25  ⇒  2س + 2ص ص' = 0  ⇒  ص' = -س/ص
                </p>
              </div>

              <div className="p-2.5 bg-red-50/60 rounded-lg">
                <strong className="block text-red-900 font-bold mb-0.5">أشيع خطأ يقع فيه الطلاب:</strong>
                <p className="text-red-800 text-[11px]">
                  نسيان كتابة ص' واعتبار مشتقة ص² هي 2ص فقط.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="font-bold text-[#1E3A5F] text-sm">بطاقة 2: نهايات الاقترانات الدائرية</span>
              <span className="text-[10px] bg-amber-50 text-amber-800 px-2 py-0.5 rounded font-bold">
                إتقان 55%
              </span>
            </div>

            <div className="space-y-2">
              <div className="p-2.5 bg-blue-50/60 rounded-lg">
                <strong className="block text-[#1E3A5F] font-bold mb-0.5">القانون الوزاري الذهبي:</strong>
                <p className="font-mono text-slate-800">
                  نها(س→0) [جا أ س / ب س] = أ / ب ، ونها(س→0) [ظا أ س / ب س] = أ / ب.
                </p>
              </div>

              <div className="p-2.5 bg-emerald-50/60 rounded-lg">
                <strong className="block text-emerald-900 font-bold mb-0.5">مثال محلول سريع:</strong>
                <p className="font-mono text-slate-800">
                  نها(س→0) [ (1 - جتا 2س) / س² ] = 2² / 2 = 2 (بالضرب في المرافق أو المتطابقة).
                </p>
              </div>

              <div className="p-2.5 bg-red-50/60 rounded-lg">
                <strong className="block text-red-900 font-bold mb-0.5">أشيع خطأ يقع فيه الطلاب:</strong>
                <p className="text-red-800 text-[11px]">
                  تطبيق النظرية عندما س تؤول لقيمة لا تجعل الزاوية صفراً.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// C8: At-Risk Students Tool [قريباً]
export const AtRiskStudentsTool: React.FC<{ onNavigate: (screen: ScreenId) => void }> = ({ onNavigate }) => {
  const atRiskList = [
    {
      id: 'ar1',
      studentName: 'عمر شريف قاسم',
      group: 'مجموعة الخميس (صناعي)',
      reason: 'تراجع مستمر في آخر 3 امتحانات (من 74% إلى 54%) + لم يسلّم واجبين',
      trend: 'down',
      suggestedAction: 'إرسال تمارين علاجية في قاعدة السلسلة وتنبيه ولي الأمر هاتفياً',
      phone: '0599556677',
      severity: 'high',
    },
    {
      id: 'ar2',
      studentName: 'خليل سمير شعت',
      group: 'مجموعة الخميس (صناعي)',
      reason: 'ضعف مستمر في درس الاشتقاق الضمني (درجة الامتحان 58/100)',
      trend: 'down',
      suggestedAction: 'جلسة تقوية علاجية قصيرة وإعادة اختبار السؤال الأول',
      phone: '0598889900',
      severity: 'medium',
    },
    {
      id: 'ar3',
      studentName: 'محمود خليل البطش',
      group: 'مجموعة الأحد والثلاثاء (علمي - أ)',
      reason: 'تراجع طفيف من 78% إلى 62% بسبب الأخطاء الحسابية في توحيد المقامات',
      trend: 'down',
      suggestedAction: 'تزويده ببطاقة المراجعة المركزة C7 وإرسال إشعار ولي الأمر',
      phone: '0598223344',
      severity: 'medium',
    },
  ];

  return (
    <div className="space-y-6 text-right max-w-5xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <button
            onClick={() => onNavigate('C_HUB')}
            className="text-xs text-slate-500 hover:text-[#1E3A5F] flex items-center gap-1 cursor-pointer font-medium mb-1"
          >
            <ArrowRight className="w-4 h-4" />
            <span>العودة لمركز الأدوات الذكية</span>
          </button>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-[#1E3A5F]">
              نظام رصد الطلاب المعرّضين للخطر والتراجع
            </h1>
            <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded">
              قريباً
            </span>
          </div>
          <p className="text-xs text-slate-500">
            تنبيهات استباقية مرتبة بحسب الأهمية ترصد التراجع قبل فوات الأوان في سنة التوجيهي.
          </p>
        </div>
      </div>

      {/* Alert Cards List (PDF requirement: السبب، رسم صغير للاتجاه، إجراء مقترح، أزرار: أرسل تمارين، راسل ولي الأمر، تجاهل) */}
      <div className="space-y-4">
        {atRiskList.map((item) => (
          <div
            key={item.id}
            className={`bg-white border rounded-2xl p-5 shadow-2xs space-y-4 text-xs ${
              item.severity === 'high' ? 'border-red-300 ring-1 ring-red-200' : 'border-slate-200'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className={`w-5 h-5 ${item.severity === 'high' ? 'text-red-600' : 'text-amber-600'}`} />
                <div>
                  <h3 className="font-black text-slate-900 text-sm">{item.studentName}</h3>
                  <span className="text-slate-400 text-[11px]">{item.group} · ولي الأمر: {item.phone}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded font-bold text-[11px] flex items-center gap-1">
                  <TrendingDown className="w-3.5 h-3.5" />
                  مسار هابط (تراجع)
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                  item.severity === 'high' ? 'bg-red-600 text-white' : 'bg-amber-100 text-amber-800'
                }`}>
                  {item.severity === 'high' ? 'أولوية قصوى' : 'متابعة'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <strong className="block text-slate-800 font-bold">سبب الرصد التلقائي:</strong>
                <p className="text-slate-600 leading-relaxed">{item.reason}</p>
              </div>

              <div className="p-3 bg-blue-50/60 rounded-xl space-y-1">
                <strong className="block text-[#1E3A5F] font-bold">الإجراء التربوي المقترح:</strong>
                <p className="text-blue-900 leading-relaxed">{item.suggestedAction}</p>
              </div>
            </div>

            {/* Action Buttons: أرسل تمارين علاجية، راسل ولي الأمر، تجاهل (PDF requirement) */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onNavigate('C2')}
                  className="bg-[#1E3A5F] hover:bg-[#152a45] text-white px-3.5 py-1.5 rounded-lg font-bold cursor-pointer transition-colors"
                >
                  أرسل تمارين علاجية
                </button>
                <button
                  onClick={() => notify(`تم فتح محادثة واتساب مع ولي أمر الطالب ${item.studentName} (${item.phone})!`)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-lg font-bold cursor-pointer transition-colors flex items-center gap-1"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>راسل ولي الأمر</span>
                </button>
              </div>

              <button
                onClick={() => notify('تم تجاهل التنبيه لهذا الأسبوع')}
                className="text-slate-400 hover:text-slate-600 text-[11px] cursor-pointer"
              >
                تجاهل مؤقتاً
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// C9: Parent Auto-Reply Bot [تجريبي]
export const ParentAutoReplyTool: React.FC<{ onNavigate: (screen: ScreenId) => void }> = ({ onNavigate }) => {
  const [isEnabled, setIsEnabled] = useState(true);
  const [allowLatestScore, setAllowLatestScore] = useState(true);
  const [allowWeakPoints, setAllowWeakPoints] = useState(true);
  const [allowExamDates, setAllowExamDates] = useState(true);

  return (
    <div className="space-y-6 text-right max-w-5xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <button
            onClick={() => onNavigate('C_HUB')}
            className="text-xs text-slate-500 hover:text-[#1E3A5F] flex items-center gap-1 cursor-pointer font-medium mb-1"
          >
            <ArrowRight className="w-4 h-4" />
            <span>العودة لمركز الأدوات الذكية</span>
          </button>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-[#1E3A5F]">
              المجيب الآلي الذكي لأولياء الأمور على واتساب
            </h1>
            <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded">
              تجريبي
            </span>
          </div>
          <p className="text-xs text-slate-500">
            يرد تلقائياً على استفسارات الأهالي المتكررة وفق صلاحيات محددة ومن واقع سجلات الدرجات فقط.
          </p>
        </div>

        {/* Master ON/OFF Switch (PDF requirement: مفتاح تشغيل/إيقاف) */}
        <div className="flex items-center gap-3 bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-2xs">
          <span className="text-xs font-bold text-slate-800">
            حالة الرد الآلي: {isEnabled ? 'مفعّل 🟢' : 'متوقف ⚪'}
          </span>
          <button
            onClick={() => setIsEnabled(!isEnabled)}
            className="text-[#1E3A5F] cursor-pointer"
          >
            {isEnabled ? <ToggleRight className="w-8 h-8 text-emerald-600" /> : <ToggleLeft className="w-8 h-8 text-slate-400" />}
          </button>
        </div>
      </div>

      {/* Permissions Checkboxes (PDF requirement: ماذا يُسمح للرد الآلي أن يقوله: آخر درجة، نقاط الضعف، مواعيد الامتحانات) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3 text-xs">
        <h3 className="font-extrabold text-slate-900 text-sm">
          ماذا يُسمح للرد الآلي الإفصاح عنه للأهالي عند السؤال؟
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <label className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={allowLatestScore}
              onChange={() => setAllowLatestScore(!allowLatestScore)}
              className="accent-[#1E3A5F] w-4 h-4"
            />
            <span className="font-bold text-slate-800">آخر درجة محققة في الامتحان</span>
          </label>

          <label className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={allowWeakPoints}
              onChange={() => setAllowWeakPoints(!allowWeakPoints)}
              className="accent-[#1E3A5F] w-4 h-4"
            />
            <span className="font-bold text-slate-800">نقاط القوة والضعف المحددة</span>
          </label>

          <label className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={allowExamDates}
              onChange={() => setAllowExamDates(!allowExamDates)}
              className="accent-[#1E3A5F] w-4 h-4"
            />
            <span className="font-bold text-slate-800">مواعيد الامتحانات والجلسات القادمة</span>
          </label>
        </div>
      </div>

      {/* Interactive WhatsApp Chat Simulation (PDF requirement: معاينة محادثة واتساب مثال: ولي أمر يسأل والرد من البيانات) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#EFEAE2] border border-slate-300 rounded-2xl p-4 shadow-inner space-y-3 text-xs text-right">
          <div className="bg-emerald-800 text-white p-2.5 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-emerald-300" />
              <span className="font-bold">المجيب الآلي الذكي · أ. محمد المصري</span>
            </div>
            <span className="text-[10px] text-emerald-200">متصل الآن</span>
          </div>

          <div className="space-y-3 pt-2">
            {/* Parent Message */}
            <div className="flex justify-start">
              <div className="bg-white rounded-lg p-2.5 max-w-[80%] shadow-2xs space-y-1">
                <span className="font-bold text-[10px] text-slate-500 block">أم أحمد المصري</span>
                <p className="text-slate-800">«السلام عليكم يا أستاذ، كيف مستوى ابني أحمد في امتحان التفاضل الأخير؟»</p>
                <span className="text-[9px] text-slate-400 block text-left font-mono">10:14 ص</span>
              </div>
            </div>

            {/* AI Auto-reply from verified data */}
            <div className="flex justify-end">
              <div className="bg-[#DCF8C6] rounded-lg p-3 max-w-[85%] shadow-2xs space-y-1.5 text-slate-900 border border-emerald-200">
                <div className="flex items-center gap-1 text-[10px] text-emerald-800 font-bold">
                  <Bot className="w-3 h-3" />
                  <span>رد آلي موثق من سجلات الأستاذ محمد</span>
                </div>
                <p className="leading-relaxed text-[11px]">
                  أهلاً بكِ أختي الكريمة 🌸<br />
                  الطالب <strong>أحمد محمود المصري</strong> حصل في امتحان التفاضل الأخير على <strong>88 / 100 (مستوى ممتاز ↗)</strong>.<br />
                  💪 أتقن قواعد الاشتقاق بالكامل، ونوصيه بالتركيز على مسائل توحيد المقامات.<br />
                  📅 موعد الامتحان التجريبي القادم: <strong>الأحد 15 نوفمبر</strong>.
                </p>
                <span className="text-[9px] text-emerald-700 block text-left font-mono">10:14 ص ✓✓</span>
              </div>
            </div>
          </div>
        </div>

        {/* Forwarded Questions Queue (PDF requirement: قائمة "أسئلة حوّلها الرد الآلي لك" التي لم يستطع الإجابة عنها) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3 text-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <h3 className="font-bold text-slate-900 text-sm">
              أسئلة حوّلها الرد الآلي إليك (تتطلب قرارك الشخصي)
            </h3>
            <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded">
              سؤالان بانتظار ردك
            </span>
          </div>

          <div className="space-y-3">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <strong className="text-slate-800">ولي أمر الطالب: عمر قاسم (0599556677)</strong>
                <span className="text-[10px] text-slate-400 font-mono">اليوم، 09:20 ص</span>
              </div>
              <p className="text-slate-600 italic">
                "أستاذ محمد، هل يمكن تأجيل تسليم واجب النهايات إلى يوم الجمعة لظروف انقطاع الكهرباء؟"
              </p>
              <button
                onClick={() => notify('فتح محادثة واتساب للرد على ولي الأمر')}
                className="bg-[#1E3A5F] text-white px-3 py-1 rounded-md text-[11px] font-bold cursor-pointer"
              >
                رد الآن على واتساب
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
