import React, { useState } from 'react';
import { ScreenId } from '../../types';
import { MOCK_STUDENTS, CURRENT_TEACHER } from '../../mockData';
import {
  Download,
  Send,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Edit3,
  MessageCircle,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
  Check,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface CorrectedPaperViewPageProps {
  onNavigate: (screen: ScreenId) => void;
}

interface QuestionCorrection {
  qNum: number;
  title: string;
  isCorrect: boolean;
  score: number;
  maxScore: number;
  handwrittenNote: string;
  studentSteps: string[];
}

export const CorrectedPaperViewPage: React.FC<CorrectedPaperViewPageProps> = ({ onNavigate }) => {
  const [studentIndex, setStudentIndex] = useState<number>(0);
  const [zoom, setZoom] = useState<number>(1);
  const [isEditingNote, setIsEditingNote] = useState<number | null>(null);

  const student = MOCK_STUDENTS[studentIndex] || MOCK_STUDENTS[0];

  const [questions, setQuestions] = useState<QuestionCorrection[]>([
    {
      qNum: 1,
      title: 'السؤال الأول: الاشتقاق الضمني والمعادلات الوسيطية',
      isCorrect: true,
      score: 18,
      maxScore: 20,
      handwrittenNote: 'ممتاز! خطوة اشتقاق صحيحة لكن انتبه لتوحيد المقامات بالبسط.',
      studentSteps: [
        'س² + ص² = 25',
        '2س + 2ص(ص\') = 0  ⇒  ص\' = -س / ص = -3/4',
        'ص\'\' = (-ص - س ص\') / ص² = (-4 + 9/4) / 16 = -7/64',
      ],
    },
    {
      qNum: 2,
      title: 'السؤال الثاني: مشتقة الاقتران الأسي الطبيعي والمماس',
      isCorrect: true,
      score: 15,
      maxScore: 15,
      handwrittenNote: 'حل نموذجي كامل ومتقن، بارك الله فيك.',
      studentSteps: [
        'ص = هـ^(2س)  ⇒  عند س = 0 تكون ص = 1 (نقطة التماس)',
        'الميل م = ص\' = 2 هـ^(2س)  ⇒  عند س = 0  م = 2',
        'معادلة المماس: ص - 1 = 2(س - 0)  ⇒  ص = 2س + 1',
      ],
    },
    {
      qNum: 3,
      title: 'السؤال الثالث: المعدلات المرتبطة بالزمن (المخروط الدائري القائم)',
      isCorrect: false,
      score: 8,
      maxScore: 15,
      handwrittenNote: 'أخطأت في العلاقة المساعدة بين نصف القطر والارتفاع (تشابه المثلثات).',
      studentSteps: [
        'ح = 1/3 ط نق² ع',
        'نق = 1/2 ع  ⇒  ح = 1/3 ط (1/4 ع²) ع = 1/12 ط ع³',
        'دح/دن = 1/4 ط ع² (دع/دن) ... تعويض خاطئ في قيمة ع',
      ],
    },
  ]);

  const totalCurrentScore = questions.reduce((sum, q) => sum + q.score, 0);
  const totalMaxScore = questions.reduce((sum, q) => sum + q.maxScore, 0);

  // Direct editing capabilities (PDF requirement: الضغط على علامة لقلبها، تغيير الدرجة، تعديل الملاحظة)
  const toggleQuestionStatus = (index: number) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i === index) {
        const nextCorrect = !q.isCorrect;
        return {
          ...q,
          isCorrect: nextCorrect,
          score: nextCorrect ? q.maxScore : Math.floor(q.maxScore / 2),
        };
      }
      return q;
    }));
  };

  const updateQuestionScore = (index: number, newScore: number) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i === index) {
        return {
          ...q,
          score: Math.max(0, Math.min(q.maxScore, newScore)),
          isCorrect: newScore >= q.maxScore * 0.7,
        };
      }
      return q;
    }));
  };

  const updateQuestionNote = (index: number, newNote: string) => {
    setQuestions(prev => prev.map((q, i) => i === index ? { ...q, handwrittenNote: newNote } : q));
  };

  const handleNextStudent = () => {
    if (studentIndex < MOCK_STUDENTS.length - 1) {
      setStudentIndex(studentIndex + 1);
    } else {
      setStudentIndex(0);
    }
  };

  const handlePrevStudent = () => {
    if (studentIndex > 0) {
      setStudentIndex(studentIndex - 1);
    }
  };

  return (
    <div className="space-y-5 text-right max-w-5xl mx-auto pb-16">
      {/* Top Bar with Student Navigation & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <button
            onClick={() => onNavigate('B8')}
            className="text-xs text-slate-500 hover:text-[#1E3A5F] flex items-center gap-1 cursor-pointer font-medium mb-1"
          >
            <ArrowRight className="w-4 h-4" />
            <span>العودة لشاشة المراجعة</span>
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-extrabold text-[#1E3A5F]">
              الورقة المصححة بملاحظات الحبر الأحمر
            </h1>
            <span className="text-xs bg-blue-100 text-[#1E3A5F] px-2.5 py-0.5 rounded-full font-bold font-mono">
              طالب {studentIndex + 1} من {MOCK_STUDENTS.length}
            </span>
          </div>
        </div>

        {/* Buttons: PDF, Next Student, WhatsApp (PDF requirement) */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handlePrevStudent}
            disabled={studentIndex === 0}
            className="p-2 border border-slate-300 rounded-xl hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
            title="الطالب السابق"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={handleNextStudent}
            className="bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
          >
            <span>الطالب التالي</span>
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            onClick={() => alert(`تم تحميل ورقة ${student.name} بصيغة PDF عالية الدقة!`)}
            className="bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Download className="w-4 h-4 text-blue-600" />
            <span>تحميل PDF</span>
          </button>

          <button
            onClick={() => alert(`تم إرسال الورقة المصححة وملاحظات المعلم عبر واتساب للطالب (${student.parentPhone}) بنجاح!`)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <MessageCircle className="w-4 h-4" />
            <span>إرسال للطالب على واتساب</span>
          </button>
        </div>
      </div>

      {/* Top Header of Paper: Final Grade & "What You Need To Work On" (PDF requirement: شريط أعلى الورقة: الدرجة النهائية وما تحتاج أن تعمل عليه في نقطتين أو ثلاث) */}
      <div className="bg-[#1E3A5F] text-white rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-blue-900/60 pb-3">
          <div>
            <span className="text-blue-200 text-xs font-bold block">ورقة إجابة امتحان التفاضل والاشتقاق</span>
            <h2 className="text-2xl font-black">{student.name}</h2>
            <span className="text-xs text-blue-300 font-mono">
              المجموعة: {student.group} · رمز QR: {student.studentCode}
            </span>
          </div>

          <div className="bg-white text-slate-900 px-5 py-2.5 rounded-xl text-center shadow-xs">
            <span className="text-[10px] text-slate-500 font-bold block">الدرجة النهائية المعتمدة</span>
            <span className="text-3xl font-black text-emerald-600 font-mono tabular-nums">
              {totalCurrentScore} <span className="text-sm text-slate-400">/ {totalMaxScore}</span>
            </span>
          </div>
        </div>

        {/* What You Need To Work On (ما تحتاج أن تعمل عليه) */}
        <div className="bg-white/10 rounded-xl p-3.5 space-y-1.5 text-xs">
          <strong className="block text-emerald-300 font-bold flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>ما تحتاج أن تعمل عليه لتطوير علامتك (ملاحظات المعلم):</span>
          </strong>
          <ul className="space-y-1 text-blue-100 text-[11px] list-disc list-inside">
            <li>التدرب المكثف على مسائل المعدلات المرتبطة بالزمن وتحديد العلاقة الهندسية المساعدة.</li>
            <li>عدم التسرع في توحيد مقامات الكسور الجبرية عند حساب المشتقة الثانية.</li>
            <li>إعادة حل تمارين درس قاعدة السلسلة ومشتقات الدوال الأسية.</li>
          </ul>
        </div>
      </div>

      {/* Notice on Direct Editing (PDF requirement: المدرّس يستطيع التعديل مباشرة: الضغط على علامة لقلبها، تغيير الدرجة، تعديل الملاحظة) */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Edit3 className="w-4 h-4 text-blue-700 shrink-0" />
          <span>
            <strong>التعديل التفاعلي المباشر:</strong> اضغط على علامة (✓/✗) لقلبها، أو عدل الدرجة الدائرية، أو انقر على ملاحظة القلم الأحمر لتعديل صياغتها.
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => setZoom(Math.min(1.5, zoom + 0.15))} className="p-1 hover:bg-blue-100 rounded cursor-pointer">
            <ZoomIn className="w-4 h-4" />
          </button>
          <button onClick={() => setZoom(Math.max(0.85, zoom - 0.15))} className="p-1 hover:bg-blue-100 rounded cursor-pointer">
            <ZoomOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* The Corrected Paper Container: Scanned Page with Simulated Red Pen Layer */}
      <div
        className="bg-[#FFFDF9] border-2 border-slate-300 rounded-2xl shadow-xl p-6 sm:p-10 space-y-8 font-sans relative transition-all"
        style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
      >
        {/* Paper Watermark / Header */}
        <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3 text-xs">
          <div className="font-bold text-slate-800">
            <span>ثانوية فلسطين العامة · مساق الرياضيات العلمي</span>
          </div>
          <div className="font-mono text-slate-500 font-bold">
            QR-CODE: {student.studentCode} · PAGE 1/1
          </div>
        </div>

        {/* Questions with Handwritten Red Ink Overlay */}
        <div className="space-y-8">
          {questions.map((q, idx) => (
            <div
              key={idx}
              className="border-b border-slate-200 pb-6 relative space-y-3"
            >
              {/* Question Header & Interactive Marks */}
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-sm text-slate-900">{q.title}</h4>

                {/* Right side: Clickable Status (✓ or ✗) + Circled Fractional Score Badge (PDF requirement: الدرجة الجزئية في دائرة مثل 3/4 أو 18/20) */}
                <div className="flex items-center gap-3">
                  {/* Clickable Status */}
                  <button
                    onClick={() => toggleQuestionStatus(idx)}
                    className="cursor-pointer transition-transform active:scale-90"
                    title="انقر لقلب علامة التصحيح"
                  >
                    {q.isCorrect ? (
                      <span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-base shadow-xs">
                        ✓
                      </span>
                    ) : (
                      <span className="w-7 h-7 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-black text-base shadow-xs">
                        ✗
                      </span>
                    )}
                  </button>

                  {/* Red Circled Fractional Mark Badge (e.g. 18/20) */}
                  <div className="relative group">
                    <div className="w-12 h-12 rounded-full border-2 border-red-600 bg-red-50/40 text-red-700 flex items-center justify-center font-bold font-mono text-xs tabular-nums shadow-xs">
                      {q.score}/{q.maxScore}
                    </div>
                    {/* Score Quick Adjuster Tooltip */}
                    <div className="hidden group-hover:flex absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg p-1 shadow-lg gap-1 z-20">
                      <button
                        onClick={() => updateQuestionScore(idx, q.score - 1)}
                        className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-xs font-bold"
                      >
                        -1
                      </button>
                      <button
                        onClick={() => updateQuestionScore(idx, q.score + 1)}
                        className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-xs font-bold"
                      >
                        +1
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Student's Simulated Solution Steps */}
              <div className="p-4 bg-white/70 border border-slate-200 rounded-xl font-serif text-slate-800 text-xs sm:text-sm space-y-2 leading-relaxed">
                {q.studentSteps.map((step, sIdx) => (
                  <div key={sIdx} className="flex items-center justify-between">
                    <span>{step}</span>
                    <span className="text-red-500 font-bold font-mono text-xs opacity-70">
                      {q.isCorrect || sIdx < 2 ? '✓' : '✗'}
                    </span>
                  </div>
                ))}
              </div>

              {/* Red Handwritten Margin Annotation (PDF requirement: وملاحظة قصيرة بخط يدوي مكتوب بالأحمر في الهامش قابلة للتعديل) */}
              <div className="p-3 bg-red-50/70 border-r-4 border-red-600 rounded-l-lg text-xs text-red-800 font-serif space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-sans font-bold text-red-900">
                    ملاحظة المعلم بالقلم الأحمر (انقر للتعديل):
                  </span>
                  <button
                    onClick={() => setIsEditingNote(isEditingNote === idx ? null : idx)}
                    className="text-[10px] text-red-700 hover:underline font-sans cursor-pointer"
                  >
                    {isEditingNote === idx ? 'حفظ' : 'تعديل الصياغة ✎'}
                  </button>
                </div>

                {isEditingNote === idx ? (
                  <input
                    type="text"
                    value={q.handwrittenNote}
                    onChange={(e) => updateQuestionNote(idx, e.target.value)}
                    className="w-full p-2 bg-white border border-red-300 rounded text-xs text-red-900 font-sans"
                    autoFocus
                  />
                ) : (
                  <p className="text-xs italic leading-relaxed text-red-700">
                    "{q.handwrittenNote}"
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Paper Bottom Stamp */}
        <div className="pt-4 flex items-center justify-between text-xs text-slate-500 border-t border-slate-200">
          <span>المعلم المعتمد: <strong>{CURRENT_TEACHER.name}</strong></span>
          <span className="text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded">
            ✓ تم الاعتماد عبر منصة دِقّـة
          </span>
        </div>
      </div>
    </div>
  );
};
