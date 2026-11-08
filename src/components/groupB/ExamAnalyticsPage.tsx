import React, { useState } from 'react';
import { ScreenId } from '../../types';
import { MOCK_STUDENTS } from '../../mockData';
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Send,
  FileSpreadsheet,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Users,
  Copy,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';

interface ExamAnalyticsPageProps {
  onNavigate: (screen: ScreenId) => void;
}

export const ExamAnalyticsPage: React.FC<ExamAnalyticsPageProps> = ({ onNavigate }) => {
  const [showSimilarityModal, setShowSimilarityModal] = useState(false);

  // Score distribution histogram buckets
  const scoreBuckets = [
    { range: '90 - 100', count: 18, pct: '35%' },
    { range: '80 - 89', count: 16, pct: '30%' },
    { range: '70 - 79', count: 10, pct: '19%' },
    { range: '60 - 69', count: 5, pct: '10%' },
    { range: 'أقل من 60', count: 3, pct: '6%' },
  ];

  return (
    <div className="space-y-6 text-right max-w-6xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <button
            onClick={() => onNavigate('B4')}
            className="text-xs text-slate-500 hover:text-[#1E3A5F] flex items-center gap-1 cursor-pointer font-medium mb-1"
          >
            <ArrowRight className="w-4 h-4" />
            <span>العودة لقائمة الامتحانات</span>
          </button>
          <h1 className="text-xl font-extrabold text-[#1E3A5F]">
            نتائج الامتحان وتحليل المجموعة
          </h1>
          <p className="text-xs text-slate-500">
            امتحان التفاضل وقواعد الاشتقاق · مجموعة الأحد والثلاثاء (علمي - أ) · 52 ورقة مصححة
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => alert('تم تصدير سجل درجات طلاب المجموعة إلى ملف Excel بنجاح!')}
            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>تصدير Excel</span>
          </button>

          <button
            onClick={() => onNavigate('C2')}
            className="bg-[#E8F0F8] hover:bg-[#d8e6f4] text-[#1E3A5F] px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>تمارين علاجية للمجموعة</span>
          </button>

          <button
            onClick={() => onNavigate('B10')}
            className="bg-[#1E3A5F] hover:bg-[#152a45] text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <Send className="w-4 h-4 text-emerald-400" />
            <span>إرسال التقارير للأهالي ←</span>
          </button>
        </div>
      </div>

      {/* 4 Summary Stats: متوسط المجموعة، أعلى وأدنى درجة، نسبة النجاح (PDF requirement) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1 shadow-2xs">
          <span className="text-xs text-slate-500">متوسط درجات المجموعة</span>
          <div className="text-2xl font-black text-[#1E3A5F] font-mono tabular-nums">84.5%</div>
          <span className="text-[11px] text-emerald-600 font-bold">+4% عن الاختبار السابق</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1 shadow-2xs">
          <span className="text-xs text-slate-500">أعلى درجة</span>
          <div className="text-2xl font-black text-emerald-600 font-mono tabular-nums">98 / 100</div>
          <span className="text-[11px] text-slate-500">الطالبة سارة البردويل</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1 shadow-2xs">
          <span className="text-xs text-slate-500">أدنى درجة</span>
          <div className="text-2xl font-black text-red-600 font-mono tabular-nums">54 / 100</div>
          <span className="text-[11px] text-slate-500">الطالب عمر قاسم</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1 shadow-2xs">
          <span className="text-xs text-slate-500">نسبة النجاح العامة</span>
          <div className="text-2xl font-black text-[#1E3A5F] font-mono tabular-nums">94.2%</div>
          <span className="text-[11px] text-slate-500">49 طالباً ناجحاً من أصل 52</span>
        </div>
      </div>

      {/* Score Histogram & Lessons Mastery Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Score Distribution Bar Chart (PDF requirement: رسم أعمدة لتوزيع الدرجات) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-[#1E3A5F] text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              <span>رسم بياني لتوزيع فئات الدرجات في الامتحان</span>
            </h3>
            <span className="text-xs text-slate-400">52 طالباً</span>
          </div>

          <div className="space-y-3 pt-2">
            {scoreBuckets.map((bucket, idx) => (
              <div key={idx} className="space-y-1 text-xs">
                <div className="flex items-center justify-between text-slate-700">
                  <span className="font-bold">{bucket.range} علامة</span>
                  <span className="font-mono tabular-nums text-slate-500">
                    {bucket.count} طلاب ({bucket.pct})
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      idx === 0 ? 'bg-emerald-600' : idx === 1 ? 'bg-blue-600' : idx === 2 ? 'bg-blue-400' : 'bg-amber-500'
                    }`}
                    style={{ width: bucket.pct }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Lesson Mastery & Lessons Needing Re-explanation (PDF requirement) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-[#1E3A5F] text-sm">
                نسبة الإتقان بحسب موضوعات الامتحان
              </h3>
              <span className="text-[10px] bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded">
                دروس تحتاج إعادة شرح
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-red-50/60 border border-red-200 rounded-xl space-y-1">
                <div className="flex items-center justify-between font-bold text-red-950">
                  <span>1. الاشتقاق الضمني والمشتقات العليا</span>
                  <span className="font-mono tabular-nums text-red-600">40% إتقان (ضعيف)</span>
                </div>
                <p className="text-[11px] text-red-800">
                  ⚠️ أكثر سؤال أخطأ فيه الطلاب: <strong>السؤال الأول (ص² + س² = 25)</strong>، وأشيع خطأ هو <strong>نسيان توحيد المقامات بالبسط عند تطبيق المشتقة الثانية</strong>.
                </p>
              </div>

              <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl space-y-1">
                <div className="flex items-center justify-between font-bold text-amber-950">
                  <span>2. قاعدة السلسلة ومشتقات الاقترانات الأسية</span>
                  <span className="font-mono tabular-nums text-amber-600">68% إتقان (متوسط)</span>
                </div>
                <p className="text-[11px] text-amber-800">
                  أشيع خطأ: نسيان ضرب مشتقة الأس (مشتقة هـ^(2س) كُتبت هـ^(2س) بدلاً من 2 هـ^(2س)).
                </p>
              </div>

              <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-1">
                <div className="flex items-center justify-between font-bold text-emerald-950">
                  <span>3. معادلة المماس والعمودي على المماس</span>
                  <span className="font-mono tabular-nums text-emerald-700">92% إتقان (ممتاز)</span>
                </div>
                <p className="text-[11px] text-emerald-800">
                  إتقان كامل لخطوات حساب الميل ونقطة التماس.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigate('C2')}
            className="w-full bg-[#1E3A5F] hover:bg-[#152a45] text-white py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>توليد ورقة تمارين علاجية للأخطاء الشائعة</span>
          </button>
        </div>
      </div>

      {/* Suspicious Answer Similarity Card [قريباً] (PDF page 12) */}
      <div className="bg-white border border-amber-200 rounded-2xl p-5 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-100 pb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-600" />
            <h3 className="font-extrabold text-slate-900 text-sm">
              إجابات متشابهة بشكل مريب (كشف الغش وتطابق الحلول)
            </h3>
            <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded">
              قريباً
            </span>
          </div>
          <span className="text-[11px] text-slate-500 italic">
            «هذا تنبيه للمراجعة، ليس حكماً قطعياً».
          </span>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          <div className="py-2.5 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="font-bold text-slate-800">
                زوج الطلاب: أحمد محمود المصري ↔ محمود خليل البطش
              </span>
              <p className="text-[11px] text-slate-500">
                تطابق في خطوات السؤال الأول (الاشتقاق الضمني) بنسبة تشابه <strong>94%</strong>، بما في ذلك نفس الخطأ الحسابي بالهامش.
              </p>
            </div>
            <button
              onClick={() => setShowSimilarityModal(true)}
              className="bg-amber-100 hover:bg-amber-200 text-amber-900 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              قارن الورقتين جنباً إلى جنب
            </button>
          </div>
        </div>
      </div>

      {/* Side-by-side similarity modal */}
      {showSimilarityModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 text-right space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-[#1E3A5F] text-base">مقارنة الورقتين جنباً إلى جنب (كشف التشابه)</h3>
              <button onClick={() => setShowSimilarityModal(false)} className="text-slate-400 hover:text-slate-700 text-sm font-bold">✕</button>
            </div>
            <p className="text-xs text-slate-600">
              يقارن النظام ترتيب الخطوات والرموز الرياضية والأخطاء المشتركة لمساعدة المعلم في اتخاذ القرار التربوي المناسب.
            </p>
            <div className="grid grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-3 bg-slate-50 border rounded-lg space-y-1">
                <strong className="block text-slate-800 font-sans">ورقة الطالب 1: أحمد المصري</strong>
                <div className="text-[11px] leading-relaxed text-slate-700">
                  2س + 2ص ص' = 0 <br />
                  ص' = -س/ص = -3/4 <br />
                  ص'' = (-4 - 3(-3/4))/16 = -7/64
                </div>
              </div>
              <div className="p-3 bg-slate-50 border rounded-lg space-y-1">
                <strong className="block text-slate-800 font-sans">ورقة الطالب 2: محمود البطش</strong>
                <div className="text-[11px] leading-relaxed text-slate-700">
                  2س + 2ص ص' = 0 <br />
                  ص' = -س/ص = -3/4 <br />
                  ص'' = (-4 - 3(-3/4))/16 = -7/64
                </div>
              </div>
            </div>
            <div className="p-2.5 bg-amber-50 text-amber-900 text-xs rounded border border-amber-200">
              تطابق تام في الخطوات والكسور (توصية: إعادة اختبار السؤال للطالبين حضورياً).
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowSimilarityModal(false)}
                className="bg-[#1E3A5F] text-white px-5 py-2 rounded-lg text-xs font-bold"
              >
                إغلاق المقارنة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
