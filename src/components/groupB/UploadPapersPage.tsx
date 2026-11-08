import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScreenId } from '../../types';
import {
  Camera,
  Upload,
  AlertTriangle,
  CheckCircle2,
  MessageCircle,
  Sparkles,
  WifiOff,
  Loader2,
  XCircle,
  RotateCw,
  Trash2,
  FileImage,
} from 'lucide-react';
import { notify } from '../../lib/notify';
import { prepareImageForGrading } from '../../lib/imageResize';
import { useData, useLoad, errorMessage } from '../../data/DataContext';
import { useSelected } from '../../data/selection';
import type { PaperPage, SubmissionRow } from '../../data/types';
import { isOfflineError, listQueued, queuePaper, removeQueued, type QueuedPaper } from '../../lib/offlineQueue';
import { toInternationalPhone } from '../../lib/phone';

interface UploadPapersPageProps {
  onNavigate: (screen: ScreenId) => void;
}

const STATUS_LABEL: Record<SubmissionRow['status'], { text: string; cls: string }> = {
  uploaded: { text: 'بانتظار التصحيح', cls: 'bg-slate-100 text-slate-700' },
  grading: { text: 'يصحّح الآن…', cls: 'bg-blue-100 text-blue-800' },
  needs_review: { text: 'يحتاج مراجعتك', cls: 'bg-amber-100 text-amber-900' },
  approved: { text: 'معتمد', cls: 'bg-emerald-100 text-emerald-800' },
  failed: { text: 'تعذّر التصحيح', cls: 'bg-red-100 text-red-800' },
};

export const UploadPapersPage: React.FC<UploadPapersPageProps> = ({ onNavigate }) => {
  const store = useData();
  const [savedExamId, setSavedExamId] = useSelected('exam');
  const [, setSelectedSubmission] = useSelected('submission');
  const [activeTab, setActiveTab] = useState<'scanned' | 'student_submissions'>('scanned');
  const [studentForNext, setStudentForNext] = useState<string>('');
  const [multiPage, setMultiPage] = useState(false);
  const [busy, setBusy] = useState(0);
  const [queued, setQueued] = useState<QueuedPaper[]>([]);
  const [localThumbs, setLocalThumbs] = useState<Record<string, string>>({});
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const filesInputRef = useRef<HTMLInputElement>(null);

  const examsQ = useLoad((st) => st.listAssessments());
  const exams = examsQ.data ?? [];
  const selectedExamId = exams.some((e) => e.id === savedExamId) ? savedExamId! : exams[0]?.id ?? '';
  const selectedExam = exams.find((e) => e.id === selectedExamId);
  const subsQ = useLoad((st) => (selectedExamId ? st.listSubmissions(selectedExamId) : Promise.resolve([] as SubmissionRow[])), [selectedExamId]);
  const studentsQ = useLoad((st) => st.listStudents());
  const submissions = subsQ.data ?? [];
  const groupStudents = useMemo(
    () => (studentsQ.data ?? []).filter((s) => s.groupId === selectedExam?.groupId),
    [studentsQ.data, selectedExam?.groupId],
  );

  // Refresh while the server is grading.
  const grading = submissions.some((s) => s.status === 'grading' || s.status === 'uploaded');
  useEffect(() => {
    if (!grading || store.mode === 'demo') return;
    const t = setInterval(() => subsQ.reload(), 5000);
    return () => clearInterval(t);
  }, [grading, store.mode, subsQ.reload]);

  const refreshQueue = useCallback(async () => setQueued(await listQueued('teacher')), []);

  const sendPaper = useCallback(
    async (examId: string, pages: PaperPage[], studentId: string | null) => {
      const id = await store.uploadPaper(examId, pages, studentId);
      setLocalThumbs((prev) => ({ ...prev, [id]: pages[0]?.dataUrl ?? '' }));
      subsQ.reload();
      const result = await store.gradeSubmission(id);
      if (!result.ok && result.error) notify(result.error, 'warning');
      subsQ.reload();
      examsQ.reload();
    },
    [store, subsQ.reload, examsQ.reload],
  );

  // Send papers saved while offline.
  const flushQueue = useCallback(async () => {
    const items = await listQueued('teacher');
    for (const item of items) {
      try {
        await sendPaper(item.target, item.pages, item.studentId ?? null);
        await removeQueued(item.id);
      } catch (e) {
        if (isOfflineError(e)) break;
        notify(errorMessage(e), 'warning');
        await removeQueued(item.id);
      }
    }
    void refreshQueue();
  }, [sendPaper, refreshQueue]);

  useEffect(() => {
    void refreshQueue();
    const goOnline = () => {
      setOnline(true);
      void flushQueue();
    };
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    if (navigator.onLine) void flushQueue();
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, [flushQueue, refreshQueue]);

  const handleFiles = async (fileList: FileList | null) => {
    const files = Array.from(fileList ?? []);
    if (!files.length || !selectedExamId) return;
    const images = files.filter((f) => f.type.startsWith('image/'));
    if (images.length < files.length) {
      notify('ملفات PDF غير مدعومة بعد. صوّر الورقة أو ارفعها كصورة.', 'warning');
    }
    const prepared: PaperPage[] = [];
    for (const file of images) {
      try {
        prepared.push(await prepareImageForGrading(file));
      } catch {
        notify(`تعذّرت قراءة الصورة ${file.name}`, 'warning');
      }
    }
    if (!prepared.length) return;
    // Either all photos are pages of one student's paper, or each photo is one paper.
    const papers = multiPage ? [prepared.slice(0, 6)] : prepared.map((p) => [p]);
    const studentId = studentForNext || null;
    setStudentForNext('');
    setBusy((n) => n + papers.length);
    await Promise.all(
      papers.map(async (pages, i) => {
        const forStudent = i === 0 ? studentId : null;
        try {
          await sendPaper(selectedExamId, pages, forStudent);
        } catch (e) {
          if (isOfflineError(e)) {
            const ok = await queuePaper({
              id: `q_${Date.now()}_${i}`,
              kind: 'teacher',
              target: selectedExamId,
              studentId: forStudent,
              pages,
              createdAt: new Date().toISOString(),
            });
            notify(ok ? 'لا يوجد إنترنت. حفظنا الورقة على جهازك وسنرفعها تلقائياً عند عودة الاتصال.' : 'لا يوجد إنترنت، وتعذّر حفظ الورقة على الجهاز.', 'warning');
          } else {
            notify(errorMessage(e, 'تعذّر رفع الورقة.'), 'warning');
          }
        } finally {
          setBusy((n) => n - 1);
        }
      }),
    );
    void refreshQueue();
  };

  const regrade = async (id: string) => {
    subsQ.setData((prev) => prev?.map((s) => (s.id === id ? { ...s, status: 'grading' } : s)));
    const r = await store.gradeSubmission(id);
    if (!r.ok && r.error) notify(r.error, 'warning');
    subsQ.reload();
  };

  const remove = async (id: string) => {
    try {
      await store.deleteSubmission(id);
      subsQ.setData((prev) => prev?.filter((s) => s.id !== id));
    } catch (e) {
      notify(errorMessage(e));
    }
  };

  const assign = async (id: string, studentId: string) => {
    try {
      await store.assignStudent(id, studentId || null);
      subsQ.reload();
    } catch (e) {
      notify(errorMessage(e));
    }
  };

  const openReview = (id: string) => {
    setSelectedSubmission(id);
    onNavigate('B8');
  };

  const submittedIds = new Set(submissions.map((s) => s.studentId).filter(Boolean));
  const notSubmitted = groupStudents.filter((s) => !submittedIds.has(s.id));
  const reminderLink = (phone: string, name: string) => {
    const intl = toInternationalPhone(phone);
    if (!intl || !selectedExam) return null;
    const link = `${window.location.origin}/s/${selectedExam.submissionCode}`;
    const text = `السلام عليكم، نذكّركم بتسليم ورقة «${selectedExam.title}» للطالب ${name.split(' ')[0]} من هذا الرابط: ${link}`;
    return `https://wa.me/${intl.slice(1)}?text=${encodeURIComponent(text)}`;
  };

  const needsReview = submissions.filter((s) => s.status === 'needs_review').length;

  return (
    <div className="space-y-6 text-right max-w-4xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-extrabold text-[#1E3A5F]">رفع وتصوير أوراق الإجابة</h1>
          <p className="text-xs text-slate-500">
            صوّر أوراق طلابك بالكاميرا أو ارفعها، وتُصحَّح بالذكاء الاصطناعي ثم تراجعها قبل إرسال أي درجة.
          </p>
        </div>

        <button
          onClick={() => onNavigate('B8')}
          disabled={!needsReview}
          className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-2 self-start sm:self-auto"
        >
          <Sparkles className="w-4 h-4" />
          <span>مراجعة التصحيح ({needsReview}) ←</span>
        </button>
      </div>

      {/* Select Exam Dropdown */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3 text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-bold text-slate-700 shrink-0">الامتحان:</span>
            <select
              value={selectedExamId}
              onChange={(e) => setSavedExamId(e.target.value)}
              className="min-w-0 flex-1 truncate p-2 bg-[#F7F8FA] border border-slate-300 rounded-lg font-bold text-slate-900"
            >
              {exams.length === 0 && <option value="">لا توجد امتحانات بعد</option>}
              {exams.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.title} ({ex.group})
                </option>
              ))}
            </select>
          </div>
          <div className="text-slate-500 font-mono text-xs tabular-nums">
            الأوراق المرفوعة: <strong>{submissions.length}</strong> من {groupStudents.length}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="font-bold text-slate-700 shrink-0">الورقة القادمة لـ:</span>
            <select
              value={studentForNext}
              onChange={(e) => setStudentForNext(e.target.value)}
              className="min-w-0 flex-1 p-2 bg-[#F7F8FA] border border-slate-300 rounded-lg"
            >
              <option value="">اقرأ رمز الطالب من الورقة تلقائياً</option>
              {groupStudents.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.studentCode})
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer text-slate-700">
            <input type="checkbox" checked={multiPage} onChange={(e) => setMultiPage(e.target.checked)} />
            <span>كل الصور صفحات لورقة طالب واحد</span>
          </label>
        </div>
      </div>

      {exams.length === 0 && !examsQ.loading && (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-8 text-center space-y-2">
          <p className="text-sm font-bold text-slate-700">أنشئ امتحاناً أولاً مع أسئلته ومعايير تصحيحه</p>
          <button onClick={() => onNavigate('B5')} className="bg-[#1E3A5F] text-white px-4 py-2 rounded-lg text-xs font-bold cursor-pointer">إنشاء امتحان</button>
        </div>
      )}

      {/* 2 Big Action Buttons (Camera & Upload) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            void handleFiles(e.target.files);
            e.target.value = '';
          }}
        />
        <input
          ref={filesInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            void handleFiles(e.target.files);
            e.target.value = '';
          }}
        />
        <button
          disabled={!selectedExamId}
          onClick={() => cameraInputRef.current?.click()}
          className="bg-[#1E3A5F] hover:bg-[#152a45] disabled:opacity-50 text-white p-6 rounded-2xl flex flex-col items-center justify-center gap-2.5 shadow-sm transition-all active:scale-98 cursor-pointer"
        >
          <Camera className="w-8 h-8 text-emerald-400" />
          <span className="text-base font-extrabold">صوّر بالكاميرا</span>
          <span className="text-[11px] text-blue-200">صورة واضحة لكل ورقة، ورمز الطالب ظاهر أعلاها</span>
        </button>

        <button
          disabled={!selectedExamId}
          onClick={() => filesInputRef.current?.click()}
          className="bg-white hover:bg-slate-50 disabled:opacity-50 border-2 border-dashed border-slate-300 text-slate-800 p-6 rounded-2xl flex flex-col items-center justify-center gap-2.5 shadow-2xs transition-all active:scale-98 cursor-pointer"
        >
          <Upload className="w-8 h-8 text-blue-600" />
          <span className="text-base font-extrabold">ارفع صوراً من الجهاز</span>
          <span className="text-[11px] text-slate-500">يمكنك اختيار عدة صور مرة واحدة</span>
        </button>
      </div>

      {/* Upload progress & offline status */}
      {(busy > 0 || queued.length > 0 || !online) && (
        <div className={`p-3 border rounded-xl text-xs flex items-center gap-2 ${online ? 'bg-blue-50 border-blue-200 text-blue-900' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
          {online ? <Loader2 className={`w-4 h-4 ${busy ? 'animate-spin' : ''}`} /> : <WifiOff className="w-4 h-4" />}
          <span className="font-bold">
            {busy > 0 && `جاري رفع ${busy} ورقة… `}
            {queued.length > 0 && `${queued.length} ورقة محفوظة على جهازك بانتظار الإنترنت. `}
            {!online && 'لا يوجد اتصال: الأوراق تُحفظ على الجهاز وتُرفع تلقائياً لاحقاً.'}
          </span>
        </div>
      )}

      {/* Tabs */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-xs overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('scanned')}
            className={`px-4 py-2 rounded-lg font-bold transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'scanned' ? 'bg-[#1E3A5F] text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            الأوراق ({submissions.length})
          </button>
          <button
            onClick={() => setActiveTab('student_submissions')}
            className={`px-4 py-2 rounded-lg font-bold transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'student_submissions' ? 'bg-[#1E3A5F] text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            من سلّم ومن لم يسلّم
          </button>
        </div>

        {activeTab === 'scanned' ? (
          submissions.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-8">لم تُرفع أي ورقة لهذا الامتحان بعد.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {submissions.map((sub) => {
                const label = STATUS_LABEL[sub.status];
                const unknown = !sub.studentId;
                return (
                  <div
                    key={sub.id}
                    className={`bg-white border rounded-xl p-3 space-y-2 relative shadow-2xs overflow-hidden min-w-0 ${
                      unknown || sub.status === 'failed' ? 'border-amber-400 bg-amber-50/30' : 'border-slate-200'
                    }`}
                  >
                    <div className="h-28 bg-[#FAF9F6] border border-slate-200 rounded-lg overflow-hidden relative flex items-center justify-center">
                      {localThumbs[sub.id] ? (
                        <img src={localThumbs[sub.id]} alt="صورة الورقة" className="w-full h-full object-cover" />
                      ) : (
                        <FileImage className="w-8 h-8 text-slate-300" />
                      )}
                      {sub.status === 'grading' && (
                        <div className="absolute inset-0 bg-white/70 flex items-center justify-center gap-1 font-bold text-[#1E3A5F] text-xs">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>يصحّح الآن…</span>
                        </div>
                      )}
                      <span className={`absolute bottom-1 right-1 text-[9px] font-bold px-1.5 py-0.5 rounded ${label.cls}`}>{label.text}</span>
                    </div>

                    <div className="text-right space-y-1">
                      {unknown ? (
                        <>
                          <div className="flex items-center gap-1 text-[11px] font-bold text-amber-800">
                            <AlertTriangle className="w-3 h-3" /> لم نتعرف على الطالب
                          </div>
                          <select
                            value=""
                            onChange={(e) => assign(sub.id, e.target.value)}
                            className="w-full text-[11px] p-1 border border-amber-300 rounded bg-white"
                          >
                            <option value="">اختر الطالب…</option>
                            {notSubmitted.map((s) => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        </>
                      ) : (
                        <>
                          <h4 className="font-bold text-xs text-slate-900 truncate">{sub.studentName}</h4>
                          <span className="text-[10px] text-slate-400 font-mono">رمز: {sub.studentCode}</span>
                        </>
                      )}
                      {(sub.status === 'needs_review' || sub.status === 'approved') && (
                        <div className="text-[11px] font-extrabold text-[#1E3A5F] tabular-nums">
                          {sub.totalScore} / {selectedExam?.totalScore ?? ''}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 pt-1">
                      {(sub.status === 'needs_review' || sub.status === 'approved') && (
                        <button onClick={() => openReview(sub.id)} className="flex-1 bg-[#1E3A5F] text-white text-[11px] font-bold py-1 rounded cursor-pointer">
                          {sub.status === 'approved' ? 'عرض' : 'مراجعة'}
                        </button>
                      )}
                      {(sub.status === 'uploaded' || sub.status === 'failed') && (
                        <button onClick={() => regrade(sub.id)} className="flex-1 bg-blue-50 text-blue-800 text-[11px] font-bold py-1 rounded flex items-center justify-center gap-1 cursor-pointer">
                          <RotateCw className="w-3 h-3" /> صحّح
                        </button>
                      )}
                      {sub.status !== 'approved' && (
                        <button onClick={() => remove(sub.id)} title="حذف الورقة" className="text-slate-400 hover:text-red-600 p-1 cursor-pointer">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">متابعة التسليم</h3>
                <p className="text-xs text-slate-500">
                  سلّم {groupStudents.length - notSubmitted.length} طالباً · لم يسلّم {notSubmitted.length} حتى الآن
                </p>
              </div>
              {selectedExam?.submissionMode !== 'link' && (
                <span className="text-[11px] text-slate-500">التذكير متاح للامتحانات التي تُسلَّم برابط.</span>
              )}
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              {groupStudents.map((st) => {
                const sub = submissions.find((s) => s.studentId === st.id);
                const link = !sub && selectedExam?.submissionMode === 'link' ? reminderLink(st.parentPhone || st.studentPhone || '', st.name) : null;
                return (
                  <div key={st.id} className={`py-2.5 flex items-center justify-between gap-2 ${sub ? '' : 'bg-red-50/40 px-2 rounded-lg'}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${sub ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                      <span className="font-bold text-slate-800 truncate">{st.name}</span>
                      <span className="text-slate-400 font-mono text-[11px]">({st.studentCode})</span>
                    </div>
                    {sub ? (
                      <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded text-[11px] shrink-0 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> سلّم ({sub.pageCount} ص)
                      </span>
                    ) : link ? (
                      <a href={link} target="_blank" rel="noreferrer" className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded text-[11px] shrink-0 flex items-center gap-1">
                        <MessageCircle className="w-3 h-3" /> ذكّر على واتساب
                      </a>
                    ) : (
                      <span className="text-red-700 font-bold bg-red-100 px-2 py-0.5 rounded text-[11px] shrink-0 flex items-center gap-1">
                        <XCircle className="w-3 h-3" /> لم يسلّم
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
