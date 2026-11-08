import React, { useEffect, useMemo, useState } from 'react';
import { ScreenId } from '../../types';
import {
  Send,
  MessageCircle,
  CheckCircle2,
  Copy,
  ArrowRight,
  TrendingUp,
  ExternalLink,
} from 'lucide-react';
import { notify } from '../../lib/notify';
import { useActiveOrg, useData, useLoad, errorMessage } from '../../data/DataContext';
import { useSelected } from '../../data/selection';
import type { QuestionGradeRow, StudentHistory, StudentRow, SubmissionRow } from '../../data/types';
import { buildReport } from '../../lib/reportText';
import { toInternationalPhone } from '../../lib/phone';

interface ParentReportPageProps {
  onNavigate: (screen: ScreenId) => void;
}

const STATUS_CHIP: Record<string, { text: string; cls: string }> = {
  sent: { text: 'أُرسلت ✓', cls: 'text-emerald-700 bg-emerald-50' },
  failed: { text: 'فشلت', cls: 'text-red-700 bg-red-50' },
  queued: { text: 'في الانتظار', cls: 'text-blue-700 bg-blue-50' },
};

export const ParentReportPage: React.FC<ParentReportPageProps> = ({ onNavigate }) => {
  const store = useData();
  const org = useActiveOrg();
  const [savedExamId, setSavedExamId] = useSelected('exam');
  const [selectedSubId, setSelectedSubId] = useState<string>('');
  const [checked, setChecked] = useState<string[]>([]);
  const [advice, setAdvice] = useState('');
  const [isSending, setIsSending] = useState(false);

  const examsQ = useLoad((st) => st.listAssessments());
  const exams = examsQ.data ?? [];
  const examId = exams.some((e) => e.id === savedExamId) ? savedExamId! : exams[0]?.id ?? '';
  const exam = exams.find((e) => e.id === examId);
  const subsQ = useLoad((st) => (examId ? st.listSubmissions(examId) : Promise.resolve([] as SubmissionRow[])), [examId]);
  const gradesQ = useLoad((st) => (examId ? st.listAssessmentGrades(examId) : Promise.resolve([] as QuestionGradeRow[])), [examId]);
  const studentsQ = useLoad((st) => st.listStudents());
  // Only approved papers can be reported (the teacher must approve first).
  const approved = useMemo(() => (subsQ.data ?? []).filter((s) => s.status === 'approved' && s.studentId), [subsQ.data]);
  const statusesQ = useLoad((st) => st.listReportStatuses(approved.map((s) => s.id)), [approved.map((s) => s.id).join(',')]);
  const statuses = statusesQ.data ?? {};
  const studentOf = (s: SubmissionRow): StudentRow | undefined => (studentsQ.data ?? []).find((x) => x.id === s.studentId);

  useEffect(() => {
    setChecked(approved.filter((s) => statuses[s.id] !== 'sent').map((s) => s.id));
    if (!approved.some((s) => s.id === selectedSubId)) setSelectedSubId(approved[0]?.id ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approved, statusesQ.data]);

  const current = approved.find((s) => s.id === selectedSubId);
  const currentStudent = current ? studentOf(current) : undefined;
  const historyQ = useLoad(
    (st) => (current?.studentId ? st.getStudentHistory(current.studentId) : Promise.resolve({ papers: [], lessons: [] } as StudentHistory)),
    [current?.studentId],
  );
  const orgName = org.name;

  const reportFor = (s: SubmissionRow, history?: StudentHistory) => {
    const papers = history?.papers ?? [];
    const prev = papers.find((p) => p.assessmentId !== examId);
    return buildReport({
      studentName: s.studentName,
      examTitle: exam?.title ?? '',
      organizationName: orgName,
      score: s.totalScore,
      total: exam?.totalScore ?? 0,
      previousPct: prev && prev.total ? Math.round((prev.score / prev.total) * 100) : null,
      grades: (gradesQ.data ?? []).filter((g) => g.submissionId === s.id),
      advice,
    });
  };
  const preview = current ? reportFor(current, historyQ.data) : null;

  const handleBatchSend = async () => {
    const items = approved
      .filter((s) => checked.includes(s.id))
      .map((s) => {
        const st = studentOf(s);
        return { studentId: s.studentId!, submissionId: s.id, phone: st?.parentPhone || '', body: reportFor(s).text, consent: st?.parentApproval };
      });
    const noPhone = items.filter((i) => !toInternationalPhone(i.phone));
    if (noPhone.length) return notify(`${noPhone.length} من الطلاب المحددين بلا رقم ولي أمر صحيح. صحّحه من شاشة الطلاب.`, 'warning');
    const noConsent = items.filter((i) => !i.consent).length;
    if (noConsent) notify(`تنبيه: ${noConsent} من أولياء الأمور لم تُسجَّل موافقتهم على رسائل واتساب.`, 'warning');
    setIsSending(true);
    try {
      const r = await store.queueReports(items);
      notify(r.error ?? `أُرسل ${r.sent} تقريراً على واتساب`, r.error ? 'info' : 'success');
      statusesQ.reload();
      if (exam && r.sent && exam.status === 'completed') await store.updateAssessment(exam.id, { status: 'reports_sent' });
    } catch (e) {
      notify(errorMessage(e));
    } finally {
      setIsSending(false);
    }
  };

  const manualLink = (() => {
    const phone = toInternationalPhone(currentStudent?.parentPhone ?? '');
    return phone && preview ? `https://wa.me/${phone.slice(1)}?text=${encodeURIComponent(preview.text)}` : null;
  })();

  return (
    <div className="space-y-6 text-right max-w-6xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="min-w-0">
          <button
            onClick={() => onNavigate('B9')}
            className="text-xs text-slate-500 hover:text-[#1E3A5F] flex items-center gap-1 cursor-pointer font-medium mb-1"
          >
            <ArrowRight className="w-4 h-4" />
            <span>العودة لنتائج الامتحان</span>
          </button>
          <h1 className="text-xl font-extrabold text-[#1E3A5F]">تقارير أولياء الأمور على واتساب</h1>
          <select
            value={examId}
            onChange={(e) => setSavedExamId(e.target.value)}
            className="mt-1 max-w-full text-xs p-1.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-700"
          >
            {exams.map((ex) => (
              <option key={ex.id} value={ex.id}>{ex.title} · {ex.group}</option>
            ))}
          </select>
        </div>

        <button
          onClick={handleBatchSend}
          disabled={checked.length === 0 || isSending}
          className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-2 self-start sm:self-auto"
        >
          <Send className="w-4 h-4" />
          <span>{isSending ? 'جارِ الإرسال...' : `إرسال للمحددين (${checked.length})`}</span>
        </button>
      </div>

      <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900">
        تظهر هنا فقط الأوراق التي اعتمدتها. لا يصل أي تقرير لولي الأمر قبل اعتمادك.
      </div>

      {approved.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center space-y-3">
          <p className="text-sm text-slate-600">{subsQ.loading ? 'جاري التحميل...' : 'لا توجد أوراق معتمدة في هذا الامتحان بعد.'}</p>
          <button onClick={() => onNavigate('B8')} className="bg-[#1E3A5F] text-white px-4 py-2 rounded-lg text-xs font-bold cursor-pointer">مراجعة التصحيح</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-[#1E3A5F] text-sm">الطلاب وحالة الرسائل</h3>
              <button
                onClick={() => setChecked(checked.length === approved.length ? [] : approved.map((s) => s.id))}
                className="text-[11px] text-blue-700 hover:underline font-bold cursor-pointer"
              >
                {checked.length === approved.length ? 'إلغاء التحديد' : 'تحديد الكل'}
              </button>
            </div>
            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
              {approved.map((s) => {
                const st = studentOf(s);
                const chip = STATUS_CHIP[statuses[s.id] ?? ''];
                return (
                  <div
                    key={s.id}
                    onClick={() => setSelectedSubId(s.id)}
                    className={`p-2.5 rounded-xl flex items-center justify-between gap-2 cursor-pointer transition-colors ${selectedSubId === s.id ? 'bg-[#E8F0F8]' : 'hover:bg-slate-50'}`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <input
                        type="checkbox"
                        checked={checked.includes(s.id)}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => setChecked((prev) => (prev.includes(s.id) ? prev.filter((x) => x !== s.id) : [...prev, s.id]))}
                        className="accent-[#1E3A5F] w-4 h-4 cursor-pointer"
                      />
                      <div className="min-w-0">
                        <span className="font-bold text-xs text-slate-800 block truncate">{s.studentName}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{st?.parentPhone || 'بلا رقم'} · {s.totalScore}/{exam?.totalScore}</span>
                      </div>
                    </div>
                    {chip ? (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0 ${chip.cls}`}>{chip.text}</span>
                    ) : (
                      <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">جاهز</span>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="text-xs space-y-1 pt-2 border-t border-slate-100">
              <label className="font-bold text-slate-700">نصيحة عامة تُضاف لكل التقارير (اختياري)</label>
              <textarea
                rows={2}
                value={advice}
                onChange={(e) => setAdvice(e.target.value)}
                placeholder="مثال: نوصي بمراجعة الدرس يومياً 20 دقيقة"
                className="w-full p-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          {current && preview && (
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white border-2 border-slate-300 rounded-2xl p-5 sm:p-8 shadow-md space-y-5 text-right font-sans">
                <div className="flex items-center justify-between gap-3 border-b-2 border-slate-900 pb-4">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-[#1E3A5F] text-white flex items-center justify-center font-bold text-base shrink-0">د✓</div>
                    <div className="min-w-0">
                      <h3 className="font-black text-lg text-[#1E3A5F]">تقرير الأداء</h3>
                      <p className="text-xs text-slate-500 truncate">{exam?.title}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-0.5 min-w-0">
                    <span className="text-xs text-slate-400">اسم الطالب:</span>
                    <h4 className="text-base font-extrabold text-slate-900 break-words">{current.studentName}</h4>
                    <p className="text-xs text-slate-500">{exam?.group}</p>
                  </div>
                  <div className="flex items-center gap-4 text-left">
                    <div>
                      <span className="text-[10px] text-slate-400 block">الدرجة</span>
                      <span className="text-3xl font-black text-[#1E3A5F] font-mono tabular-nums">{current.totalScore} / {exam?.totalScore}</span>
                    </div>
                    {preview.change !== null && (
                      <div className={`border-r border-slate-300 pr-3 text-xs font-bold ${preview.change >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                        <span>{preview.change >= 0 ? `↗ +${preview.change}%` : `↘ ${preview.change}%`}</span>
                        <span className="block text-[10px] text-slate-500 font-normal">مقارنة بالامتحان السابق</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3.5 space-y-2">
                    <strong className="block text-emerald-950 font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>نقاط القوة:</span>
                    </strong>
                    <ul className="space-y-1 text-[11px] text-emerald-900">
                      {preview.strengths.length ? preview.strengths.map((x) => <li key={x}>• {x}</li>) : <li>—</li>}
                    </ul>
                  </div>
                  <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3.5 space-y-2">
                    <strong className="block text-amber-950 font-bold flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-[#D97706]" />
                      <span>ما يحتاج تطويره:</span>
                    </strong>
                    <ul className="space-y-1 text-[11px] text-amber-900">
                      {preview.weaknesses.length ? preview.weaknesses.map((x) => <li key={x} className="break-words">• {x}</li>) : <li>—</li>}
                    </ul>
                  </div>
                </div>

                {advice.trim() && (
                  <div className="p-3.5 bg-blue-50/60 border border-blue-200 rounded-xl text-xs text-blue-950 space-y-1">
                    <strong className="block font-bold">نصيحة المدرّس:</strong>
                    <p className="text-[11px] leading-relaxed text-blue-900 break-words">{advice}</p>
                  </div>
                )}
              </div>

              <div className="bg-emerald-900/10 border border-emerald-300 rounded-2xl p-4 text-right space-y-2 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 text-emerald-950 font-bold">
                  <span className="flex items-center gap-1.5">
                    <MessageCircle className="w-4 h-4 text-emerald-700" />
                    <span>الرسالة التي تصل ولي الأمر ({currentStudent?.parentPhone || 'بلا رقم'})</span>
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(preview.text);
                          notify('تم نسخ نص الرسالة');
                        } catch {
                          notify('تعذّر النسخ', 'warning');
                        }
                      }}
                      className="text-[11px] text-emerald-800 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>نسخ</span>
                    </button>
                    {manualLink && (
                      <a href={manualLink} target="_blank" rel="noreferrer" className="text-[11px] text-emerald-800 hover:underline flex items-center gap-1">
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>أرسل يدوياً من واتساب</span>
                      </a>
                    )}
                  </div>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200 text-slate-700 font-sans leading-relaxed text-[11px] whitespace-pre-wrap break-words">
                  {preview.text}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
