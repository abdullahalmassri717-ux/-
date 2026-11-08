import React, { useState } from 'react';
import { ScreenId } from '../../types';
import {
  Camera,
  Upload,
  ArrowRight,
  FileCheck2,
  Sparkles,
  BookOpen,
  Edit3,
  Check,
  Plus
} from 'lucide-react';
import { notify } from '../../lib/notify';

interface ConvertOldExamToolProps {
  onNavigate: (screen: ScreenId) => void;
}

export const ConvertOldExamTool: React.FC<ConvertOldExamToolProps> = ({ onNavigate }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedQuestions, setExtractedQuestions] = useState([
    {
      id: 'eq1',
      text: 'إذا كان س² + ص² = 25، أوجد د²ص / دس² عند النقطة (3, 4).',
      suggestedLesson: 'الاشتقاق الضمني',
      suggestedScore: 20,
    },
    {
      id: 'eq2',
      text: 'جد معادلة المماس لمنحنى الاقتران ص = هـ^(2س) عند س = 0.',
      suggestedLesson: 'مشتقات الاقترانات الأسية',
      suggestedScore: 15,
    },
    {
      id: 'eq3',
      text: 'احسب نها(س→0) [ (جا 5س) / (ظا 2س) ].',
      suggestedLesson: 'النهايات الدائرية',
      suggestedScore: 10,
    },
  ]);

  const handleUploadOld = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      notify('تم استخراج الأسئلة وتحديد الدروس والدرجات المقترحة بنجاح من ورقة الامتحان القديمة!');
    }, 1200);
  };

  return (
    <div className="space-y-6 text-right max-w-5xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <button
            onClick={() => onNavigate('C_HUB')}
            className="text-xs text-slate-500 hover:text-[#1E3A5F] flex items-center gap-1 cursor-pointer font-medium mb-1"
          >
            <ArrowRight className="w-4 h-4" />
            <span>العودة لمركز الأدوات الذكية</span>
          </button>
          <h1 className="text-xl font-extrabold text-[#1E3A5F]">
            تحويل امتحان ورقي قديم أو ملزمة إلى أسئلة رقمية
          </h1>
          <p className="text-xs text-slate-500">
            صوّر أو ارفع امتحاناً قديماً لديك ليقوم الذكاء الاصطناعي باستخراج الأسئلة واقتراح سلم التصحيح.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => notify('تمت إضافة الأسئلة المستخرجة إلى بنك الأسئلة بنجاح!')}
            className="bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer"
          >
            + أضف لبنك الأسئلة
          </button>

          <button
            onClick={() => onNavigate('B5')}
            className="bg-[#1E3A5F] hover:bg-[#152a45] text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <FileCheck2 className="w-4 h-4 text-emerald-400" />
            <span>احفظ كامتحان وتابع الإعداد ←</span>
          </button>
        </div>
      </div>

      {/* Upload Old Paper Button (PDF requirement: زر "صوّر أو ارفع امتحاناً قديماً") */}
      <div className="bg-white border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center space-y-3 hover:border-[#1E3A5F] transition-colors cursor-pointer">
        <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#1E3A5F] flex items-center justify-center mx-auto">
          <Camera className="w-6 h-6" />
        </div>
        <div>
          <button
            type="button"
            onClick={handleUploadOld}
            className="bg-[#1E3A5F] hover:bg-[#152a45] text-white px-6 py-2.5 rounded-xl font-bold text-xs cursor-pointer inline-flex items-center gap-2"
          >
            <Upload className="w-4 h-4 text-emerald-400" />
            <span>{isProcessing ? 'جارِ القراءة والاستخراج...' : 'صوّر أو ارفع امتحاناً قديماً (PDF أو صورة)'}</span>
          </button>
        </div>
        <p className="text-[11px] text-slate-400">
          يدعم الخط المطبوع ونماذج امتحانات التوجيهي السابقة والمذكرات المصورة
        </p>
      </div>

      {/* Side-by-Side: Original Scanned Exam vs Extracted Editable Questions (PDF requirement) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Right (Original Scanned Image) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2 text-xs">
            <span className="font-bold text-slate-800">صورة الامتحان الورقي الأصلي (للمقارنة)</span>
            <span className="font-mono text-[10px] text-slate-400">OLD_EXAM_SCAN_2023.jpg</span>
          </div>

          <div className="bg-[#FAF9F6] border border-slate-200 rounded-xl p-6 min-h-[350px] font-mono text-xs text-slate-600 space-y-4">
            <div className="border-b border-slate-300 pb-2 text-center font-bold text-slate-800 font-sans">
              دولة فلسطين · مديرية التربية والتعليم · اختبار الرياضيات الفصلي 2023
            </div>
            <div className="space-y-3 leading-relaxed opacity-80">
              <p>س1) إذا كان س² + ص² = 25، أوجد د²ص / دس² عند النقطة (3, 4) ... [20 علامة]</p>
              <p>س2) جد معادلة المماس لمنحنى الاقتران ص = هـ^(2س) عند س = 0 ... [15 علامة]</p>
              <p>س3) احسب نها(س←0) [ (جا 5س) / (ظا 2س) ] ... [10 علامات]</p>
            </div>
          </div>
        </div>

        {/* Left (Extracted Editable Questions with suggested lessons & marks) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-[#1E3A5F]">الأسئلة المستخرجة بالذكاء الاصطناعي (قابلة للتعديل):</span>
            <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold">
              تم التعرف على 3 أسئلة ✓
            </span>
          </div>

          <div className="space-y-3">
            {extractedQuestions.map((q, idx) => (
              <div
                key={q.id}
                className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">سؤال {idx + 1}</span>
                  <div className="flex items-center gap-2">
                    <span className="bg-blue-50 text-[#1E3A5F] px-2 py-0.5 rounded font-bold">
                      {q.suggestedLesson}
                    </span>
                    <span className="bg-slate-100 text-slate-800 font-mono font-bold px-2 py-0.5 rounded tabular-nums">
                      {q.suggestedScore} علامة
                    </span>
                  </div>
                </div>

                <textarea
                  rows={2}
                  defaultValue={q.text}
                  className="w-full p-2 bg-[#F7F8FA] border border-slate-300 rounded-lg text-xs"
                />

                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>تم استخراج النص وسلّم التصحيح تلقائياً</span>
                  <button className="text-blue-700 hover:underline font-bold cursor-pointer">
                    تعديل المعايير
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export const ClusterGradingTool: React.FC<{ onNavigate: (screen: ScreenId) => void }> = ({ onNavigate }) => {
  const [clusters, setClusters] = useState([
    {
      id: 'cl1',
      representativeAnswer: '2س + 2ص(ص\') = 0  ⇒  ص\' = -س/ص  ⇒  ص\'\' = -25/64',
      studentCount: 34,
      suggestedScore: 20,
      maxScore: 20,
      applied: true,
      label: 'حل نموذجي كامل (مجموعة الإجابات الصحيحة)',
    },
    {
      id: 'cl2',
      representativeAnswer: 'ص\'\' = (-4 + 9/4)/16 = -7/64 (خطأ في توحيد المقامات بالبسط)',
      studentCount: 12,
      suggestedScore: 14,
      maxScore: 20,
      applied: false,
      label: 'خطأ مشترك في توحيد المقامات',
    },
    {
      id: 'cl3',
      representativeAnswer: 'نسيان اشتقاق ص بالنسبة لـ س (كتب 2ص بدلاً من 2ص ص\')',
      studentCount: 6,
      suggestedScore: 4,
      maxScore: 20,
      applied: false,
      label: 'خلل جوهري في مفهوم الاشتقاق الضمني',
    },
  ]);

  const handleApplyGrade = (id: string) => {
    setClusters(prev => prev.map(c => c.id === id ? { ...c, applied: true } : c));
  };

  return (
    <div className="space-y-6 text-right max-w-5xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <button
            onClick={() => onNavigate('B8')}
            className="text-xs text-slate-500 hover:text-[#1E3A5F] flex items-center gap-1 cursor-pointer font-medium mb-1"
          >
            <ArrowRight className="w-4 h-4" />
            <span>العودة لشاشة مراجعة التصحيح</span>
          </button>
          <h1 className="text-xl font-extrabold text-[#1E3A5F]">
            تجميع الإجابات المتشابهة والتصحيح بالكتل
          </h1>
          <p className="text-xs text-slate-500">
            السؤال الأول: الاشتقاق الضمني (س² + ص² = 25) · تم فرز وتجميع إجابات 52 طالباً في 3 مجموعات متطابقة.
          </p>
        </div>

        <button
          onClick={() => onNavigate('B8')}
          className="bg-[#1E3A5F] hover:bg-[#152a45] text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer shadow-2xs"
        >
          العودة للمراجعة الفردية ←
        </button>
      </div>

      {/* Top Banner (PDF requirement: مؤشر أعلى الشاشة: صحّحت 180 إجابة بـ 6 نقرات) */}
      <div className="bg-gradient-to-r from-emerald-700 to-[#1E3A5F] text-white p-4 rounded-2xl shadow-sm flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-emerald-300" />
          <span className="text-sm font-black">
            إنجاز التصحيح الذكي: «صحّحت 180 إجابة بـ 6 نقرات فقط»
          </span>
        </div>
        <span className="bg-white/20 text-white px-2.5 py-1 rounded-lg font-mono font-bold tabular-nums">
          وفرت 45 دقيقة
        </span>
      </div>

      {/* Clusters List (PDF requirement: بطاقة لكل مجموعة مع الإجابة الممثلة، عدد الطلاب مثلاً 34، صور مصغرة لأول 3، والدرجة المقترحة، وأزرار تطبيق وافصل) */}
      <div className="space-y-4">
        {clusters.map((cl) => (
          <div
            key={cl.id}
            className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4 text-xs"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="space-y-0.5">
                <span className="font-extrabold text-slate-900 text-sm">{cl.label}</span>
                <span className="text-slate-500 block">
                  تشمل حلول: <strong className="text-[#1E3A5F] font-mono text-sm tabular-nums">{cl.studentCount} طالباً</strong> بنفس النمط تماماً
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-left">
                  <span className="text-[10px] text-slate-400 block">الدرجة المقترحة للكتلة</span>
                  <span className="text-xl font-black text-emerald-600 font-mono tabular-nums">
                    {cl.suggestedScore} / {cl.maxScore}
                  </span>
                </div>

                {/* Apply Score to Whole Cluster Button */}
                <button
                  onClick={() => handleApplyGrade(cl.id)}
                  className={`px-4 py-2 rounded-xl font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs ${
                    cl.applied ? 'bg-slate-100 text-slate-700' : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  <span>{cl.applied ? 'تم تطبيق الدرجة على الـ 34 طالباً ✓' : 'طبّق الدرجة على المجموعة كلها'}</span>
                </button>

                <button
                  onClick={() => notify('تم فصل هذه الإجابة وتخصيصها لمجموعة مراجعة منفصلة.')}
                  className="bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 px-3 py-2 rounded-xl font-bold cursor-pointer"
                >
                  افصل إجابة
                </button>
              </div>
            </div>

            {/* Representative Answer */}
            <div className="p-3 bg-slate-50 rounded-xl space-y-1">
              <span className="font-bold text-slate-700 text-[11px]">صيغة الإجابة الممثلة لهذه المجموعة:</span>
              <p className="font-mono text-slate-800 text-xs leading-relaxed">{cl.representativeAnswer}</p>
            </div>

            {/* Thumbnails of First 3 Answers in this cluster (PDF requirement) */}
            <div className="space-y-1.5">
              <span className="text-slate-500 font-medium text-[11px]">صور مصغّرة لأول 3 إجابات في هذه الكتلة:</span>
              <div className="grid grid-cols-3 gap-3">
                {['طالب 1 (أحمد)', 'طالب 2 (رزان)', 'طالب 3 (يوسف)'].map((stLabel, i) => (
                  <div key={i} className="h-20 bg-[#FAF9F6] border border-slate-200 rounded-lg p-2 font-mono text-[9px] text-slate-500 flex flex-col justify-between">
                    <span className="font-bold text-slate-700 font-sans">{stLabel}</span>
                    <span className="opacity-70">2س + 2ص ص' = 0 ...</span>
                    <span className="text-emerald-700 text-[8px] font-bold">تطابق 98%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
