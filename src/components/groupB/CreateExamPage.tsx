import React, { useState } from 'react';
import { ScreenId, QuestionRubric } from '../../types';
import { MOCK_GROUPS, MOCK_RUBRICS } from '../../mockData';
import {
  ArrowRight,
  Sparkles,
  Plus,
  Trash2,
  Copy,
  UploadCloud,
  FileText,
  Clock,
  CheckCircle2,
  Share2,
  Layers,
  Camera,
  RotateCw,
  Eye,
  Check,
  AlertCircle
} from 'lucide-react';

interface CreateExamPageProps {
  onNavigate: (screen: ScreenId) => void;
}

export const CreateExamPage: React.FC<CreateExamPageProps> = ({ onNavigate }) => {
  const [examType, setExamType] = useState<'exam' | 'homework'>('exam');
  const [title, setTitle] = useState('امتحان الحساب التفاضلي وتطبيقات المشتقة الأولى');
  const [selectedGroup, setSelectedGroup] = useState(MOCK_GROUPS[0].name);
  const [examDate, setExamDate] = useState('2026-11-10');
  const [totalScore, setTotalScore] = useState(100);
  const [submissionMode, setSubmissionMode] = useState<'link' | 'teacher_scan'>('teacher_scan');
  const [autoSendReports, setAutoSendReports] = useState<'after_review' | 'auto'>('after_review');
  const [questions, setQuestions] = useState<QuestionRubric[]>(MOCK_RUBRICS);
  const [multiFormEnabled, setMultiFormEnabled] = useState(false);
  const [multiFormCount, setMultiFormCount] = useState<'A_B' | 'A_B_C'>('A_B');
  const [copiedLink, setCopiedLink] = useState(false);
  const [isAiSuggesting, setIsAiSuggesting] = useState<string | null>(null);

  // Camera Photo-capture state
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [isScanningPhoto, setIsScanningPhoto] = useState(false);
  const [photoExtractedSuccess, setPhotoExtractedSuccess] = useState(false);

  const handleCapturePaper = () => {
    const newPhotoId = `photo_${Date.now()}`;
    setCapturedPhotos(prev => [...prev, newPhotoId]);
  };

  const handleProcessCapturedPhotos = () => {
    setIsScanningPhoto(true);
    setTimeout(() => {
      setIsScanningPhoto(false);
      // Generate questions from the scanned photos
      const scannedQuestions: QuestionRubric[] = [
        {
          id: `sc_q1_${Date.now()}`,
          questionNumber: 1,
          text: 'السؤال 1 (مستخرج من الصورة): إذا كان ص = س³ - 3س² + 4، جد فترات التزايد والتناقص والقيم القصوى المحلية لمنحنى ق.',
          type: 'problem_solving',
          maxScore: 20,
          lesson: 'تطبيقات القيم القصوى والتزايد والتناقص',
          modelAnswer: 'ق\'(س) = 3س² - 6س = 3س(س - 2) = 0. النقط الحرجة س = 0، س = 2. متزايد على (-∞, 0] و [2, ∞)، متناقص على [0, 2]. عظمى محلية ق(0)=4، صغرى محلية ق(2)=0.',
          criteria: [
            { description: 'إيجاد المشتقة الأولى ومساواتها بالصفر (ق\'(س) = 3س² - 6س = 0)', points: 6 },
            { description: 'تحديد النقط الحرجة (س = 0، س = 2) وبحث إشارة المشتقة', points: 6 },
            { description: 'كتابة فترات التزايد والتناقص بدقة', points: 4 },
            { description: 'تحديد القيم العظمى والصغرى المحلية بالتعويض', points: 4 },
          ],
        },
        {
          id: `sc_q2_${Date.now()}`,
          questionNumber: 2,
          text: 'السؤال 2 (مستخرج من الصورة): أوجد نها(س→0) [ (1 - جتا 4س) / س² ] باستخدام المتطابقات المثلثية وقاعدة لوبيتال.',
          type: 'short_answer',
          maxScore: 15,
          lesson: 'النهايات الدائرية والاتصال',
          modelAnswer: '1 - جتا 4س = 2 جا²(2س). النهاية = نها 2 [جا(2س)/س]² = 2 * (2)² = 8.',
          criteria: [
            { description: 'تطبيق متطابقة نصف الزاوية أو قاعدة لوبيتال', points: 6 },
            { description: 'التعويض وتوزيع النهاية على التربيع', points: 5 },
            { description: 'الناتج النهائي المبسط (8)', points: 4 },
          ],
        },
        {
          id: `sc_q3_${Date.now()}`,
          questionNumber: 3,
          text: 'السؤال 3 (مستخرج من الصورة): إذا كان س² + ص² = 25، أوجد د²ص / دس² عند النقطة (3, 4).',
          type: 'problem_solving',
          maxScore: 15,
          lesson: 'الاشتقاق الضمني',
          modelAnswer: 'ص\' = -س/ص = -3/4. ص\'\' = -25/ص³ = -25/64.',
          criteria: [
            { description: 'الاشتقاق الضمني الأولي الصحيح', points: 5 },
            { description: 'اشتقاق المشتقة الثانية بقاعدة القسمة', points: 6 },
            { description: 'الناتج النهائي المبسط (-25/64)', points: 4 },
          ],
        },
      ];

      setQuestions(scannedQuestions);
      setTitle('امتحان التفاضل والنهايات (تم إنشاؤه بالتصوير بالكاميرا)');
      setTotalScore(50);
      setShowCameraModal(false);
      setPhotoExtractedSuccess(true);
      setTimeout(() => setPhotoExtractedSuccess(false), 5000);
    }, 1500);
  };

  const handleAddQuestion = () => {
    const qNum = questions.length + 1;
    const newQ: QuestionRubric = {
      id: `q${Date.now()}`,
      questionNumber: qNum,
      text: `سؤال ${qNum}: إذا كان ص = ق(س)، جد مشتقة الاقتران المركب...`,
      type: 'problem_solving',
      maxScore: 15,
      lesson: 'قاعدة السلسلة والاشتقاق الضمني',
      modelAnswer: 'ق\'(س) = 3س² + 4س. عند س = 1 المشتقة تساوي 7.',
      criteria: [
        { description: 'كتابة القانون الوزاري المعتمد للاشتقاق', points: 5 },
        { description: 'التعويض العددي السليم بقيم المعطيات', points: 6 },
        { description: 'استخراج الناتج النهائي المبسط', points: 4 },
      ],
    };
    setQuestions([...questions, newQ]);
  };

  const handleRemoveQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const handleAiSuggestCriteria = (qId: string) => {
    setIsAiSuggesting(qId);
    setTimeout(() => {
      setIsAiSuggesting(null);
      setQuestions(prev => prev.map(q => {
        if (q.id === qId) {
          return {
            ...q,
            criteria: [
              { description: 'تطبيق القانون والاشتقاق الأولي الدقيق', points: Math.floor(q.maxScore * 0.4) },
              { description: 'التعويض الرياضي الخالي من الأخطاء الحسابية', points: Math.floor(q.maxScore * 0.4) },
              { description: 'الناتج النهائي المبسط مع الوحدات إن وجدت', points: Math.ceil(q.maxScore * 0.2) },
            ]
          };
        }
        return q;
      }));
    }, 900);
  };

  return (
    <div className="space-y-6 text-right max-w-4xl mx-auto pb-12">
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
            إنشاء واجب أو امتحان جديد وسلالم التصحيح
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Prominent Camera Capture Button */}
          <button
            onClick={() => setShowCameraModal(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <Camera className="w-4 h-4" />
            <span>تصوير ورقة الامتحان بالكاميرا</span>
          </button>

          <button
            onClick={() => onNavigate('C5')}
            className="bg-[#E8F0F8] hover:bg-[#d8e6f4] text-[#1E3A5F] px-3 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
            title="استيراد من امتحان ورقي قديم عبر الذكاء الاصطناعي"
          >
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>استيراد ملف PDF قديم</span>
          </button>

          <button
            onClick={() => {
              alert('تم حفظ الامتحان ومعايير تصحيحه بنجاح! تم تجهيز نماذج أوراق الإجابة.');
              onNavigate('B6');
            }}
            className="bg-[#1E3A5F] hover:bg-[#152a45] text-white px-5 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-2xs"
          >
            حفظ وتجهيز أوراق الإجابة للطباعة
          </button>
        </div>
      </div>

      {photoExtractedSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-900 text-xs flex items-center gap-2.5 shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <strong className="block text-sm">تم إنشاء الامتحان من صورة الكاميرا بنجاح! ✓</strong>
            <span>تم استخراج الأسئلة، وتحديد الدرجات وسلالم التصحيح التلقائية وفق المنهاج. يمكنك مراجعتها وتعديلها أدناه.</span>
          </div>
        </div>
      )}

      {/* Prominent Camera Feature Callout Banner */}
      <div className="bg-gradient-to-r from-emerald-800 to-[#1E3A5F] text-white rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              ميزة جديدة سريعة للمعلمين
            </span>
            <span className="text-emerald-300 text-xs font-bold">بدون كتابة أو تفريغ يدوي</span>
          </div>
          <h3 className="font-extrabold text-sm sm:text-base">
            هل كتبت الامتحان على ورقة بخط يدك أو على الحاسوب؟
          </h3>
          <p className="text-xs text-blue-100">
            التقط صورة لورقة الامتحان بكاميرا الهاتف، وسيتولى الذكاء الاصطناعي قراءة الأسئلة وصياغة المعايير وتوزيع الدرجات فوراً.
          </p>
        </div>

        <button
          onClick={() => setShowCameraModal(true)}
          className="bg-white text-[#1E3A5F] hover:bg-emerald-50 px-4 py-2.5 rounded-xl font-extrabold text-xs transition-transform active:scale-95 cursor-pointer flex items-center gap-2 shrink-0 shadow-sm"
        >
          <Camera className="w-4 h-4 text-emerald-600" />
          <span>افتح الكاميرا وصوّر الورقة الآن</span>
        </button>
      </div>

      {/* Main Metadata Form */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-5">
        <h2 className="font-bold text-[#1E3A5F] text-sm">1. البيانات الأساسية للامتحان</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-slate-700 font-bold mb-1">نوع الاختبار</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setExamType('exam')}
                className={`flex-1 py-2 rounded-lg font-bold border transition-colors cursor-pointer ${
                  examType === 'exam' ? 'bg-[#1E3A5F] text-white border-[#1E3A5F]' : 'bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                امتحان رئيسي
              </button>
              <button
                type="button"
                onClick={() => setExamType('homework')}
                className={`flex-1 py-2 rounded-lg font-bold border transition-colors cursor-pointer ${
                  examType === 'homework' ? 'bg-[#1E3A5F] text-white border-[#1E3A5F]' : 'bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                واجب منزلي
              </button>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">المجموعة المستهدفة</label>
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="w-full p-2 bg-[#F7F8FA] border border-slate-300 rounded-lg font-medium"
            >
              {MOCK_GROUPS.map((g) => (
                <option key={g.id} value={g.name}>{g.name}</option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-slate-700 font-bold mb-1">عنوان الامتحان / الواجب</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-2.5 bg-[#F7F8FA] border border-slate-300 rounded-lg font-bold text-slate-900"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">التاريخ</label>
            <input
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              className="w-full p-2 bg-[#F7F8FA] border border-slate-300 rounded-lg font-mono tabular-nums"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">الدرجة الكلية</label>
            <input
              type="number"
              value={totalScore}
              onChange={(e) => setTotalScore(Number(e.target.value))}
              className="w-full p-2 bg-[#F7F8FA] border border-slate-300 rounded-lg font-mono font-bold tabular-nums"
            />
          </div>
        </div>

        {/* Submission Mode (PDF requirement: الطلاب يسلمون عبر رابط أو أنا أصور الأوراق) */}
        <div className="pt-2 border-t border-slate-100 space-y-3">
          <label className="block text-xs font-bold text-slate-700">طريقة تسليم ورفع الأوراق:</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <label className={`p-3 rounded-xl border-2 flex items-start gap-2.5 cursor-pointer ${
              submissionMode === 'teacher_scan' ? 'border-[#1E3A5F] bg-[#E8F0F8]/30' : 'border-slate-200 bg-white'
            }`}>
              <input
                type="radio"
                name="subMode"
                checked={submissionMode === 'teacher_scan'}
                onChange={() => setSubmissionMode('teacher_scan')}
                className="mt-0.5 accent-[#1E3A5F]"
              />
              <div>
                <strong className="block text-slate-900">أنا أصوّر الأوراق بكاميرا الهاتف أو أرفعها</strong>
                <span className="text-[11px] text-slate-500">
                  يحل الطلاب على ورق الإجابة المطبوع (QR) وتصوّر أنت الرزمة بكاميرا هاتفك في ثوانٍ.
                </span>
              </div>
            </label>

            <label className={`p-3 rounded-xl border-2 flex items-start gap-2.5 cursor-pointer ${
              submissionMode === 'link' ? 'border-[#1E3A5F] bg-[#E8F0F8]/30' : 'border-slate-200 bg-white'
            }`}>
              <input
                type="radio"
                name="subMode"
                checked={submissionMode === 'link'}
                onChange={() => setSubmissionMode('link')}
                className="mt-0.5 accent-[#1E3A5F]"
              />
              <div>
                <strong className="block text-slate-900">الطلاب يسلّمون مباشرة عبر رابط واتساب</strong>
                <span className="text-[11px] text-slate-500">
                  يرسل رابط للطلاب يرفعون منه صور أوراقهم دون الحاجة لتسجيل دخول.
                </span>
              </div>
            </label>
          </div>

          {submissionMode === 'link' && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-xs text-blue-900">
              <span className="font-mono text-[11px] truncate max-w-sm">
                https://daqqa.ps/submit?exam=ex_tawjihi_diff_2026
              </span>
              <button
                type="button"
                onClick={() => {
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 2000);
                }}
                className="bg-[#1E3A5F] text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>{copiedLink ? 'تم نسخ الرابط لواتساب ✓' : 'انسخ الرابط لواتساب'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Auto Dispatch Toggle (PDF requirement: أرسل النتائج تلقائياً بعد التصحيح أو بعد مراجعتي) */}
        <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <span className="font-bold text-slate-700">إرسال تقارير واتساب للأهالي:</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAutoSendReports('after_review')}
              className={`px-3 py-1.5 rounded-lg font-bold border transition-colors cursor-pointer ${
                autoSendReports === 'after_review' ? 'bg-[#1E3A5F] text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              بعد مراجعتي واعتمادي (موصى به)
            </button>
            <button
              type="button"
              onClick={() => setAutoSendReports('auto')}
              className={`px-3 py-1.5 rounded-lg font-bold border transition-colors cursor-pointer ${
                autoSendReports === 'auto' ? 'bg-[#1E3A5F] text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              أرسل تلقائياً فور انتهاء التصحيح
            </button>
          </div>
        </div>

        {/* Multi-Form Version Switch [قريباً] (PDF page 12) */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-600" />
            <span className="font-bold text-slate-800">توليد نسخ متعددة (نماذج أ / ب / ج لمنع الغش)</span>
            <span className="text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded font-bold">قريباً</span>
          </div>
          <button
            type="button"
            onClick={() => setMultiFormEnabled(!multiFormEnabled)}
            className={`px-3 py-1 rounded-md text-xs font-semibold cursor-pointer ${
              multiFormEnabled ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {multiFormEnabled ? 'مفعّل (نماذج أ/ب/ج مع QR مختلف)' : 'تفعيل النماذج المتعددة'}
          </button>
        </div>
      </div>

      {/* Questions & Rubrics Builder */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-extrabold text-[#1E3A5F] text-base">2. تفريغ الأسئلة ومعايير التصحيح الوزارية</h2>
            <p className="text-xs text-slate-500">
              يقوم الذكاء الاصطناعي بمطابقة كل خطوة بحل الطالب مقابل هذه المعايير.
            </p>
          </div>

          <button
            type="button"
            onClick={handleAddQuestion}
            className="bg-[#E8F0F8] hover:bg-[#d8e6f4] text-[#1E3A5F] px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ إضافة سؤال جديد</span>
          </button>
        </div>

        <div className="space-y-4">
          {questions.map((q, idx) => (
            <div
              key={q.id}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#1E3A5F] text-white flex items-center justify-center font-bold text-xs font-mono">
                    {idx + 1}
                  </span>
                  <span className="font-bold text-slate-900 text-sm">السؤال {idx + 1}</span>
                  <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                    الدرس: {q.lesson}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleAiSuggestCriteria(q.id)}
                    disabled={isAiSuggesting === q.id}
                    className="bg-[#E8F0F8] hover:bg-blue-100 text-[#1E3A5F] px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    <span>{isAiSuggesting === q.id ? 'جارِ الاقتراح...' : 'اقترح معايير بالذكاء الاصطناعي'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRemoveQuestion(q.id)}
                    className="text-slate-400 hover:text-red-600 p-1 cursor-pointer"
                    title="حذف هذا السؤال"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Question Text & Max Score */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                <div className="sm:col-span-3">
                  <label className="block text-slate-700 font-bold mb-1">نص السؤال</label>
                  <input
                    type="text"
                    value={q.text}
                    onChange={(e) => {
                      const val = e.target.value;
                      setQuestions(questions.map(item => item.id === q.id ? { ...item, text: val } : item));
                    }}
                    className="w-full p-2 bg-[#F7F8FA] border border-slate-300 rounded-lg font-medium"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">الدرجة المخصصة</label>
                  <input
                    type="number"
                    value={q.maxScore}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setQuestions(questions.map(item => item.id === q.id ? { ...item, maxScore: val } : item));
                    }}
                    className="w-full p-2 bg-[#F7F8FA] border border-slate-300 rounded-lg font-mono font-bold tabular-nums"
                  />
                </div>
              </div>

              {/* Model Answer */}
              <div className="text-xs">
                <label className="block text-slate-700 font-bold mb-1">الإجابة النموذجية الكاملة</label>
                <textarea
                  rows={2}
                  value={q.modelAnswer}
                  onChange={(e) => {
                    const val = e.target.value;
                    setQuestions(questions.map(item => item.id === q.id ? { ...item, modelAnswer: val } : item));
                  }}
                  className="w-full p-2 bg-[#F7F8FA] border border-slate-300 rounded-lg font-mono"
                />
              </div>

              {/* Rubric Breakdown Criteria */}
              <div className="bg-[#F7F8FA] border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">سلم توزيع الدرجات التفصيلي (الروبريك):</span>
                  <span className="text-[11px] text-slate-500">
                    مجموع النقاط: {q.criteria.reduce((acc, c) => acc + c.points, 0)} / {q.maxScore}
                  </span>
                </div>

                <div className="space-y-1.5">
                  {q.criteria.map((crit, cIdx) => (
                    <div key={cIdx} className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200 gap-2">
                      <span className="text-slate-800 flex-1 font-medium">{crit.description}</span>
                      <span className="bg-blue-50 text-[#1E3A5F] px-2 py-0.5 rounded font-bold font-mono tabular-nums">
                        {crit.points} علامات
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Camera Capture Modal Popup */}
      {showCameraModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-200 flex flex-col my-auto max-h-[92vh]">
            {/* Header */}
            <div className="bg-[#1E3A5F] text-white p-4 sm:p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base">تصوير ورقة الامتحان بالكاميرا</h3>
                  <p className="text-[11px] text-blue-200">التقط صورة لورقة الامتحان المكتوبة بخط اليد أو المطبوعة لاستخراج الأسئلة تلقائياً</p>
                </div>
              </div>
              <button
                onClick={() => setShowCameraModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm font-bold cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
              {/* Camera Viewfinder Box */}
              <div className="relative bg-slate-950 rounded-2xl aspect-[4/3] sm:aspect-[16/10] overflow-hidden flex flex-col items-center justify-center text-white border-2 border-emerald-500/40 shadow-inner group">
                {/* Viewfinder Grid & Corner Guidelines */}
                <div className="absolute inset-4 border border-white/20 rounded-xl pointer-events-none">
                  {/* Corner markers */}
                  <div className="absolute -top-1 -right-1 w-5 h-5 border-t-2 border-r-2 border-emerald-400"></div>
                  <div className="absolute -top-1 -left-1 w-5 h-5 border-t-2 border-l-2 border-emerald-400"></div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-2 border-r-2 border-emerald-400"></div>
                  <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-2 border-l-2 border-emerald-400"></div>
                  
                  {/* Central Crosshair */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 border border-emerald-400/40 rounded-full flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></div>
                    </div>
                  </div>

                  {/* Scanning Laser Animation */}
                  {isScanningPhoto && (
                    <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399] animate-bounce"></div>
                  )}
                </div>

                {/* Simulated Camera Feed Background Graphic */}
                <div className="text-center p-4 z-10 max-w-sm">
                  {isScanningPhoto ? (
                    <div className="space-y-3">
                      <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center animate-spin">
                        <Sparkles className="w-7 h-7 text-emerald-400" />
                      </div>
                      <h4 className="font-bold text-sm text-emerald-300">جاري مسح وتحليل الورقة بالذكاء الاصطناعي...</h4>
                      <p className="text-[11px] text-slate-300">
                        التعرف على خط يد الأستاذ • استخراج نص المسائل • تفكيك خطوات الحل إلى روبريك معتمد
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="w-12 h-12 mx-auto rounded-full bg-white/10 flex items-center justify-center text-slate-300 mb-2">
                        <Camera className="w-6 h-6 text-emerald-400" />
                      </div>
                      <p className="text-xs font-semibold text-slate-200">
                        ضع ورقة الامتحان داخل الإطار بشكل مستوٍ ومستقيم
                      </p>
                      <p className="text-[10px] text-slate-400">
                        تدعم المنصة الخط اليدوي للأساتذة في غزة والمسائل الرياضية والفيزيائية بالرموز العربية والإنجليزية
                      </p>
                    </div>
                  )}
                </div>

                {/* Camera Top Controls */}
                <div className="absolute top-3 inset-x-4 flex items-center justify-between text-xs text-slate-300 z-10">
                  <span className="bg-black/60 px-2.5 py-1 rounded-full text-[10px] font-mono flex items-center gap-1.5 border border-white/10">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    كاميرا عالية الدقة HD (نشطة)
                  </span>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => alert('تم تفعيل الفلاش والإضاءة المعززة للورقة')} 
                      className="bg-black/60 hover:bg-black/80 px-2 py-1 rounded-full text-[10px] border border-white/10 cursor-pointer"
                      title="فلاش الكاميرا"
                    >
                      ⚡ فلاش تلقائي
                    </button>
                    <button 
                      onClick={() => alert('تم التبديل بين الكاميرا الخلفية والأمامية')}
                      className="bg-black/60 hover:bg-black/80 p-1.5 rounded-full border border-white/10 cursor-pointer"
                      title="تبديل الكاميرا"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Bottom Viewfinder Action Bar */}
                <div className="absolute bottom-3 inset-x-4 flex items-center justify-center gap-3 z-10">
                  <button
                    disabled={isScanningPhoto}
                    onClick={handleCapturePaper}
                    className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-full shadow-lg flex items-center gap-2 text-xs transition-transform active:scale-95 cursor-pointer"
                  >
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-white flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                    </div>
                    <span>التقاط صورة الصفحة {capturedPhotos.length + 1}</span>
                  </button>
                </div>
              </div>

              {/* Sample Quick-Test helper for demo */}
              <div className="flex items-center justify-between p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-xs">
                <div className="flex items-center gap-2 text-[#1E3A5F]">
                  <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="text-[11px] font-medium">لتجربة الميزة فوراً بدون تصوير فعلي، يمكنك التقاط نموذج ورقة جاهزة:</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    handleCapturePaper();
                    if (capturedPhotos.length === 0) {
                      setCapturedPhotos(['sample_paper_1', 'sample_paper_2']);
                    }
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer shrink-0 transition-colors"
                >
                  + التقاط ورقة تجريبية
                </button>
              </div>

              {/* Captured Photos Gallery Strip */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800">
                    الصفحات الملتقطة ({capturedPhotos.length} {capturedPhotos.length === 1 ? 'صفحة' : 'صفحات'}):
                  </span>
                  {capturedPhotos.length > 0 && (
                    <button
                      onClick={() => setCapturedPhotos([])}
                      className="text-rose-600 hover:underline text-[11px] cursor-pointer"
                    >
                      مسح الكل
                    </button>
                  )}
                </div>

                {capturedPhotos.length === 0 ? (
                  <div className="border border-dashed border-slate-300 rounded-xl p-4 text-center text-xs text-slate-400">
                    لم تقم بالتقاط أي صفحة بعد. انقر على زر "التقاط صورة" أعلاه لأخذ لقطة لصفحة الامتحان الأولى.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {capturedPhotos.map((photo, idx) => (
                      <div key={photo} className="relative group bg-slate-100 rounded-xl border-2 border-emerald-500/60 p-2 flex flex-col items-center justify-between">
                        <div className="w-full aspect-[3/4] bg-white rounded-lg border border-slate-200 flex flex-col p-2 text-[9px] text-slate-600 shadow-2xs font-mono select-none overflow-hidden">
                          <div className="border-b border-slate-200 pb-1 font-bold text-[#1E3A5F] flex justify-between">
                            <span>امتحان رياضيات</span>
                            <span>ص {idx + 1}</span>
                          </div>
                          <div className="mt-2 space-y-1 text-[8px] text-slate-500">
                            <div className="h-1.5 bg-slate-200 rounded w-4/5"></div>
                            <div className="h-1.5 bg-slate-200 rounded w-full"></div>
                            <div className="h-1.5 bg-slate-200 rounded w-3/4"></div>
                            <div className="h-2 bg-emerald-100 rounded w-1/2 my-1"></div>
                            <div className="h-1.5 bg-slate-200 rounded w-5/6"></div>
                          </div>
                          <div className="mt-auto text-center font-bold text-emerald-700 bg-emerald-50 rounded py-0.5">
                            تمت المعاينة ✓
                          </div>
                        </div>

                        <div className="w-full flex items-center justify-between mt-1 text-[11px]">
                          <span className="font-bold text-slate-700">الصفحة {idx + 1}</span>
                          <button
                            onClick={() => setCapturedPhotos(capturedPhotos.filter(p => p !== photo))}
                            className="text-rose-500 hover:text-rose-700 p-0.5 cursor-pointer"
                            title="حذف هذه الصفحة"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}

                    <button
                      onClick={handleCapturePaper}
                      className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-4 flex flex-col items-center justify-center text-slate-500 hover:text-emerald-700 transition-colors cursor-pointer text-xs gap-1.5"
                    >
                      <Plus className="w-5 h-5 text-slate-400" />
                      <span>إضافة صفحة ثانية</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-[11px] text-slate-500 text-center sm:text-right">
                سيتعرف الذكاء الاصطناعي على الأسئلة ومستويات الصعوبة وفق منهاج فلسطين
              </span>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setShowCameraModal(false)}
                  className="w-1/2 sm:w-auto px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  disabled={capturedPhotos.length === 0 || isScanningPhoto}
                  onClick={handleProcessCapturedPhotos}
                  className="w-1/2 sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-emerald-200" />
                  <span>
                    {isScanningPhoto ? 'جاري التحليل...' : `تحليل ${capturedPhotos.length} ${capturedPhotos.length === 1 ? 'صفحة' : 'صفحات'} واستخراج الأسئلة`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
