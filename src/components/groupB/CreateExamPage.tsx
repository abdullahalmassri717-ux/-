import React, { useEffect, useMemo, useState } from 'react';
import { ScreenId, QuestionRubric } from '../../types';
import { useData, useLoad, errorMessage } from '../../data/DataContext';
import { setSelected } from '../../data/selection';
import { takeExamDraft } from '../../data/examDraft';
import type { DraftQuestion as AiDraft } from '../../data/ai';
import { prepareImageForGrading, type PreparedImage } from '../../lib/imageResize';

type DraftQuestion = QuestionRubric & { lessonId: string | null };

const blankQuestion = (n: number): DraftQuestion => ({
  id: `q${Date.now()}_${n}`,
  questionNumber: n,
  text: '',
  type: 'problem_solving',
  maxScore: 10,
  lesson: '',
  lessonId: null,
  modelAnswer: '',
  criteria: [{ description: '', points: 10 }],
});
const fromDraft = (q: AiDraft, i: number): DraftQuestion => ({
  id: `q${Date.now()}_${i}`,
  questionNumber: i + 1,
  text: q.text,
  type: q.type,
  maxScore: q.maxScore,
  lesson: '',
  lessonId: q.lessonId,
  modelAnswer: q.modelAnswer,
  criteria: q.criteria.length ? q.criteria : [{ description: '', points: q.maxScore }],
});
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
import { notify } from '../../lib/notify';

interface CreateExamPageProps {
  onNavigate: (screen: ScreenId) => void;
}

export const CreateExamPage: React.FC<CreateExamPageProps> = ({ onNavigate }) => {
  const [examType, setExamType] = useState<'exam' | 'homework'>('exam');
  const store = useData();
  const groupsQ = useLoad((st) => st.listGroups());
  const curriculaQ = useLoad((st) => st.listCurricula());
  const groups = groupsQ.data ?? [];
  const [title, setTitle] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [examDate, setExamDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!selectedGroup && groups.length) setSelectedGroup(groups[0].id);
  }, [groups, selectedGroup]);
  const group = groups.find((g) => g.id === selectedGroup);
  // Lessons of the group's subject, for linking each question to a lesson.
  const subjectLessons = useMemo(() => {
    for (const c of curriculaQ.data ?? []) for (const gr of c.grades) for (const sb of gr.subjects)
      if (sb.id === group?.subjectId) return sb.units.flatMap((u) => u.lessons.map((l) => ({ id: l.id, title: l.title, unit: u.title })));
    return [];
  }, [curriculaQ.data, group?.subjectId]);
  const [submissionMode, setSubmissionMode] = useState<'link' | 'teacher_scan'>('teacher_scan');
  const [autoSendReports, setAutoSendReports] = useState<'after_review' | 'auto'>('after_review');
  const [questions, setQuestions] = useState<DraftQuestion[]>(() => [blankQuestion(1)]);
  const totalScore = questions.reduce((n, q) => n + (Number(q.maxScore) || 0), 0);
  const updateQ = (id: string, patch: Partial<DraftQuestion>) =>
    setQuestions((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  const [multiFormEnabled, setMultiFormEnabled] = useState(false);
  const [multiFormCount, setMultiFormCount] = useState<'A_B' | 'A_B_C'>('A_B');
  const [copiedLink, setCopiedLink] = useState(false);
  const [isAiSuggesting, setIsAiSuggesting] = useState<string | null>(null);

  // Photographed exam paper → questions (read by AI on the server).
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [capturedPhotos, setCapturedPhotos] = useState<PreparedImage[]>([]);
  const [isScanningPhoto, setIsScanningPhoto] = useState(false);
  const [photoExtractedSuccess, setPhotoExtractedSuccess] = useState(false);

  // Questions handed over from an AI tool or the question bank.
  useEffect(() => {
    const draft = takeExamDraft();
    if (!draft) return;
    if (draft.title) setTitle(draft.title);
    if (draft.groupId) setSelectedGroup(draft.groupId);
    setExamType(draft.kind);
    if (draft.questions.length) setQuestions(draft.questions.map((q, i) => fromDraft(q, i)));
  }, []);

  const handleAddPhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    const room = 6 - capturedPhotos.length;
    const picked = [...files].slice(0, Math.max(room, 0));
    if (files.length > picked.length) notify('يمكن رفع 6 صفحات كحد أقصى', 'warning');
    try {
      const prepared = await Promise.all(picked.map((f) => prepareImageForGrading(f)));
      setCapturedPhotos((prev) => [...prev, ...prepared]);
    } catch {
      notify('أحد الملفات ليس صورة. اختر صوراً فقط.', 'warning');
    }
  };

  const handleProcessCapturedPhotos = async () => {
    if (!group?.subjectId) return notify('اختر مجموعة لها مادة أولاً، حتى نربط الأسئلة بدروسها.');
    setIsScanningPhoto(true);
    try {
      const r = await store.aiExtractExam(group.subjectId, capturedPhotos);
      if (!r.readable || !r.questions.length) {
        notify('لم نتمكن من قراءة أسئلة من الصور. صوّر الورقة بإضاءة جيدة ومن الأعلى.', 'warning');
        return;
      }
      setQuestions(r.questions.map((q, i) => fromDraft(q, i)));
      setShowCameraModal(false);
      setCapturedPhotos([]);
      setPhotoExtractedSuccess(true);
      setTimeout(() => setPhotoExtractedSuccess(false), 6000);
    } catch (e) {
      notify(errorMessage(e));
    } finally {
      setIsScanningPhoto(false);
    }
  };

  const handleAddQuestion = () => {
    setQuestions([...questions, blankQuestion(questions.length + 1)]);
  };

  const handleSave = async () => {
    if (!title.trim()) return notify('اكتب عنوان الامتحان أو الواجب');
    if (!selectedGroup) return notify('أنشئ مجموعة أولاً من شاشة المجموعات والطلاب');
    if (!questions.length) return notify('أضف سؤالاً واحداً على الأقل');
    const bad = questions.findIndex((q) => !q.text.trim() || !(Number(q.maxScore) > 0));
    if (bad !== -1) return notify(`أكمل نص السؤال ${bad + 1} ودرجته`);
    const mismatch = questions.findIndex((q) => {
      const used = q.criteria.filter((c) => c.description.trim());
      return used.length > 0 && used.reduce((n, c) => n + (Number(c.points) || 0), 0) !== Number(q.maxScore);
    });
    if (mismatch !== -1) return notify(`مجموع نقاط معايير السؤال ${mismatch + 1} لا يساوي درجته`, 'warning');
    setSaving(true);
    try {
      const id = await store.createAssessment({
        title,
        kind: examType,
        groupId: selectedGroup,
        subjectId: group?.subjectId || null,
        scheduledOn: examDate || null,
        submissionMode,
        autoSendReports: autoSendReports === 'auto',
        questions: questions.map((q) => ({
          text: q.text,
          type: q.type,
          maxScore: Number(q.maxScore),
          modelAnswer: q.modelAnswer,
          lessonId: q.lessonId,
          criteria: q.criteria.map((c) => ({ description: c.description, points: Number(c.points) || 0 })),
        })),
      });
      setSelected('exam', id);
      notify(submissionMode === 'link' ? 'تم حفظ الامتحان. انسخ رابط التسليم من قائمة الامتحانات.' : 'تم حفظ الامتحان ومعايير تصحيحه. جهّز أوراق الإجابة للطباعة.');
      onNavigate(submissionMode === 'link' ? 'B4' : 'B6');
    } catch (e) {
      notify(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const handleAiSuggestCriteria = async (qId: string) => {
    const q = questions.find((x) => x.id === qId);
    if (!q) return;
    if (!q.text.trim()) return notify('اكتب نص السؤال أولاً');
    if (!group?.subjectId) return notify('اختر المجموعة أولاً');
    setIsAiSuggesting(qId);
    try {
      const r = await store.aiSuggestRubric({ subjectId: group.subjectId, lessonId: q.lessonId, text: q.text, maxScore: Number(q.maxScore) || 10 });
      updateQ(qId, { modelAnswer: q.modelAnswer.trim() ? q.modelAnswer : r.modelAnswer, criteria: r.criteria });
    } catch (e) {
      notify(errorMessage(e));
    } finally {
      setIsAiSuggesting(null);
    }
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
            <span>تحويل امتحان قديم</span>
          </button>

          <button
            disabled={saving}
            onClick={handleSave}
            className="disabled:opacity-60 bg-[#1E3A5F] hover:bg-[#152a45] text-white px-5 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-2xs"
          >
            {saving ? 'جاري الحفظ...' : 'حفظ الامتحان ومعايير التصحيح'}
          </button>
        </div>
      </div>

      {photoExtractedSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-900 text-xs flex items-center gap-2.5 shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <strong className="block text-sm">تمت قراءة الأسئلة من الصور ✓</strong>
            <span>راجع نص كل سؤال ودرجته ومعاييره أدناه وعدّلها قبل الحفظ.</span>
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
              {groups.length === 0 && <option value="">لا توجد مجموعات بعد</option>}
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-slate-700 font-bold mb-1">عنوان الامتحان / الواجب</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: امتحان الشهر الأول في التفاضل"
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
            <label className="block text-slate-700 font-bold mb-1">الدرجة الكلية (مجموع درجات الأسئلة)</label>
            <input
              type="number"
              value={totalScore}
              readOnly
              className="w-full p-2 bg-slate-100 border border-slate-300 rounded-lg font-mono font-bold tabular-nums"
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
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-2 text-xs text-blue-900">
              <Share2 className="w-4 h-4 shrink-0" />
              <span>بعد الحفظ يتولّد رابط تسليم خاص بهذا الامتحان، تنسخه من قائمة الامتحانات وترسله للطلاب. كل طالب يدخل رمزه الخاص (4 أرقام).</span>
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
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-6 h-6 rounded-full bg-[#1E3A5F] text-white flex items-center justify-center font-bold text-xs font-mono">
                    {idx + 1}
                  </span>
                  <span className="font-bold text-slate-900 text-sm">السؤال {idx + 1}</span>
                  <select
                    value={q.lessonId ?? ''}
                    onChange={(e) => {
                      const l = subjectLessons.find((x) => x.id === e.target.value);
                      updateQ(q.id, { lessonId: l?.id ?? null, lesson: l?.title ?? '' });
                    }}
                    aria-label="درس السؤال"
                    className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded max-w-[11rem] sm:max-w-xs"
                  >
                    <option value="">الدرس: غير محدد</option>
                    {subjectLessons.map((l) => (
                      <option key={l.id} value={l.id}>{l.title}</option>
                    ))}
                  </select>
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
                    onChange={(e) => updateQ(q.id, { text: e.target.value })}
                    placeholder="اكتب نص السؤال كما في الورقة"
                    className="w-full p-2 bg-[#F7F8FA] border border-slate-300 rounded-lg font-medium"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">الدرجة المخصصة</label>
                  <input
                    type="number"
                    value={q.maxScore}
                    min={0.5}
                    step={0.5}
                    onChange={(e) => updateQ(q.id, { maxScore: Number(e.target.value) })}
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
                  onChange={(e) => updateQ(q.id, { modelAnswer: e.target.value })}
                  placeholder="الحل الكامل الذي يقارن به التصحيح"
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
                      <input
                        type="text"
                        value={crit.description}
                        onChange={(e) => updateQ(q.id, { criteria: q.criteria.map((c, i) => (i === cIdx ? { ...c, description: e.target.value } : c)) })}
                        placeholder="مثال: كتابة القانون الصحيح"
                        className="text-slate-800 flex-1 min-w-0 font-medium bg-transparent focus:outline-none"
                      />
                      <input
                        type="number"
                        value={crit.points}
                        min={0}
                        step={0.5}
                        onChange={(e) => updateQ(q.id, { criteria: q.criteria.map((c, i) => (i === cIdx ? { ...c, points: Number(e.target.value) } : c)) })}
                        aria-label="النقاط"
                        className="w-14 bg-blue-50 text-[#1E3A5F] px-1 py-0.5 rounded font-bold font-mono tabular-nums text-center"
                      />
                      <button
                        type="button"
                        onClick={() => updateQ(q.id, { criteria: q.criteria.filter((_, i) => i !== cIdx) })}
                        className="text-slate-400 hover:text-red-600 cursor-pointer"
                        title="حذف المعيار"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => updateQ(q.id, { criteria: [...q.criteria, { description: '', points: 0 }] })}
                    className="text-[11px] text-blue-700 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> إضافة معيار
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Photograph the exam paper */}
      {showCameraModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden my-auto">
            <div className="bg-[#1E3A5F] text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Camera className="w-5 h-5 text-emerald-300" />
                <div>
                  <h3 className="font-extrabold text-sm">تصوير ورقة الامتحان</h3>
                  <p className="text-[11px] text-blue-200">صوّر كل صفحة من الأعلى وبإضاءة جيدة (حتى 6 صفحات)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !isScanningPhoto && setShowCameraModal(false)}
                aria-label="إغلاق"
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-4 text-right">
              <div className="grid grid-cols-3 gap-2">
                {capturedPhotos.map((p, i) => (
                  <div key={i} className="relative aspect-[3/4] rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                    <img src={p.dataUrl} alt={`صفحة ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setCapturedPhotos((prev) => prev.filter((_, j) => j !== i))}
                      aria-label={`حذف الصفحة ${i + 1}`}
                      className="absolute top-1 left-1 w-6 h-6 rounded-full bg-black/60 text-white text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                    <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1.5 rounded">{i + 1}</span>
                  </div>
                ))}
                {capturedPhotos.length < 6 && (
                  <label className="aspect-[3/4] rounded-lg border-2 border-dashed border-emerald-300 bg-emerald-50 flex flex-col items-center justify-center gap-1 text-emerald-800 text-[11px] font-bold cursor-pointer">
                    <Camera className="w-6 h-6" />
                    <span>{capturedPhotos.length ? 'صفحة أخرى' : 'صوّر أو اختر صورة'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      multiple
                      className="sr-only"
                      onChange={(e) => {
                        void handleAddPhotos(e.target.files);
                        e.target.value = '';
                      }}
                    />
                  </label>
                )}
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                يقرأ الذكاء الاصطناعي الأسئلة ويقترح الدرجات ونموذج الإجابة ومعايير التصحيح. ستراجعها وتعدّلها قبل الحفظ. الأسئلة الحالية في النموذج ستُستبدل.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={capturedPhotos.length === 0 || isScanningPhoto}
                  onClick={handleProcessCapturedPhotos}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isScanningPhoto ? <RotateCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  <span>{isScanningPhoto ? 'جاري قراءة الورقة...' : 'استخراج الأسئلة'}</span>
                </button>
                <button
                  type="button"
                  disabled={isScanningPhoto}
                  onClick={() => setShowCameraModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
