import React, { useMemo, useState } from 'react';
import { Download, Link2, Upload, X, CheckCircle2, AlertTriangle } from 'lucide-react';
import { errorMessage, useData, useLoad } from '../../data/DataContext';
import type { AssessmentRow, MoodleIdKind, MoodleLink, SubmissionRow } from '../../data/types';
import { rowsFromFile } from '../../data/curriculumImport';
import { notify } from '../../lib/notify';
import { MOODLE_KIND_LABEL, buildGradeCsv, matchStudents, parseMoodleUsers, pickKind, type MoodleUser } from '../../lib/moodle';

interface Props {
  exam: AssessmentRow;
  submissions: SubmissionRow[];
  onClose: () => void;
}

function download(name: string, csv: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/** Exports approved grades as a CSV that Moodle's gradebook can import. */
export const MoodleExportDialog: React.FC<Props> = ({ exam, submissions, onClose }) => {
  const store = useData();
  const studentsQ = useLoad((st) => st.listStudents(), []);
  const [mode, setMode] = useState<'score' | 'percent'>('score');
  const [linking, setLinking] = useState(false);
  const [users, setUsers] = useState<MoodleUser[] | null>(null);
  const [kind, setKind] = useState<MoodleIdKind>('email');
  const [picks, setPicks] = useState<Record<string, string>>({}); // studentId -> user index ('' = none)
  const [saving, setSaving] = useState(false);
  const [showSteps, setShowSteps] = useState(false);

  const subStudentIds = new Set(submissions.map((s) => s.studentId).filter(Boolean) as string[]);
  const students = (studentsQ.data ?? []).filter((s) => s.groupIds.includes(exam.groupId) || subStudentIds.has(s.id));
  const total = exam.totalScore || 0;

  // Students' links decide which identifier the file uses (the most common one).
  const exportKind = useMemo<MoodleIdKind | null>(() => {
    const count = new Map<MoodleIdKind, number>();
    students.forEach((s) => s.moodle && count.set(s.moodle.kind, (count.get(s.moodle.kind) ?? 0) + 1));
    return [...count.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  }, [students]);

  const byStudent = new Map(students.map((s) => [s.id, s]));
  const approved = submissions.filter((s) => s.status === 'approved' && s.studentId);
  const ready = approved.filter((s) => byStudent.get(s.studentId!)?.moodle?.kind === exportKind);
  const notLinked = approved.length - ready.length;
  const notApproved = submissions.filter((s) => s.status !== 'approved').length;

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const list = parseMoodleUsers(await rowsFromFile(file));
      if (!list.length) throw new Error('الملف ما فيه طلاب.');
      const k = pickKind(list) ?? 'email';
      const matched = matchStudents(students, list);
      const next: Record<string, string> = {};
      students.forEach((s) => {
        const m = matched.get(s.id);
        if (m !== undefined) next[s.id] = String(m);
        else if (s.moodle) {
          const i = list.findIndex((u) => u[s.moodle!.kind] === s.moodle!.value);
          next[s.id] = i >= 0 ? String(i) : '';
        } else next[s.id] = '';
      });
      setUsers(list);
      setKind(k);
      setPicks(next);
      notify(`لقينا ${list.length} طالب بملف Moodle، وربطنا ${matched.size} منهم تلقائياً بالاسم.`, 'success');
    } catch (e) {
      notify(errorMessage(e, 'تعذّر قراءة الملف.'), 'warning');
    }
  };

  const saveLinks = async () => {
    if (!users) return;
    setSaving(true);
    try {
      let n = 0;
      for (const s of students) {
        const i = picks[s.id];
        const u = i ? users[Number(i)] : null;
        const link: MoodleLink | null = u && u[kind] ? { kind, value: u[kind] } : null;
        if ((link?.value ?? null) === (s.moodle?.value ?? null) && (link?.kind ?? null) === (s.moodle?.kind ?? null)) continue;
        await store.updateStudent(s.id, { moodle: link });
        n++;
      }
      notify(n ? `تم حفظ ربط ${n} طالب مع Moodle.` : 'ما في تغييرات.', 'success');
      setLinking(false);
      setUsers(null);
      studentsQ.reload();
    } catch (e) {
      notify(errorMessage(e), 'warning');
    } finally {
      setSaving(false);
    }
  };

  const exportFile = () => {
    if (!exportKind || !ready.length) return;
    const header = mode === 'percent' ? `${exam.title} (%)` : exam.title;
    const rows = ready.map((s) => ({
      id: byStudent.get(s.studentId!)!.moodle!.value,
      grade: mode === 'percent' && total ? Math.round((s.totalScore / total) * 1000) / 10 : s.totalScore,
    }));
    download(`${exam.title}-moodle.csv`, buildGradeCsv(MOODLE_KIND_LABEL[exportKind].moodle, header, rows));
    setShowSteps(true);
  };

  const linkedCount = students.filter((s) => s.moodle).length;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 space-y-4 text-right shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-extrabold text-[#1E3A5F]">تصدير العلامات إلى Moodle</h2>
            <p className="text-xs text-slate-500 mt-0.5 truncate">{exam.title} · {exam.group}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 cursor-pointer" aria-label="إغلاق">
            <X className="w-5 h-5" />
          </button>
        </div>

        {studentsQ.loading ? (
          <p className="text-xs text-slate-500">جاري التحميل...</p>
        ) : !linking ? (
          <>
            {/* Step 1: link students */}
            <div className="rounded-xl border border-slate-200 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold text-slate-800">١. ربط الطلاب بحساباتهم على Moodle</p>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${linkedCount === students.length && students.length ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}`}>
                  {linkedCount} من {students.length}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                مرة وحدة لكل مجموعة: نزّل قائمة طلاب الكورس من Moodle وارفعها هون، ودقة بتربط كل طالب بحسابه بالاسم.
              </p>
              <button
                onClick={() => setLinking(true)}
                className="w-full bg-[#E8F0F8] hover:bg-[#d8e6f4] text-[#1E3A5F] py-2 rounded-lg text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Link2 className="w-4 h-4" />
                <span>{linkedCount ? 'تعديل الربط' : 'ربط الطلاب'}</span>
              </button>
            </div>

            {/* Step 2: export */}
            <div className="rounded-xl border border-slate-200 p-3 space-y-3">
              <p className="text-xs font-bold text-slate-800">٢. تنزيل ملف العلامات</p>
              <div className="flex gap-2 text-xs">
                <label className={`flex-1 border rounded-lg p-2 cursor-pointer ${mode === 'score' ? 'border-[#1E3A5F] bg-[#E8F0F8] font-bold' : 'border-slate-200'}`}>
                  <input type="radio" className="hidden" checked={mode === 'score'} onChange={() => setMode('score')} />
                  العلامة كما هي (من {total})
                </label>
                <label className={`flex-1 border rounded-lg p-2 cursor-pointer ${mode === 'percent' ? 'border-[#1E3A5F] bg-[#E8F0F8] font-bold' : 'border-slate-200'}`}>
                  <input type="radio" className="hidden" checked={mode === 'percent'} onChange={() => setMode('percent')} />
                  نسبة مئوية (من 100)
                </label>
              </div>
              <ul className="text-[11px] space-y-1">
                <li className="flex items-center gap-1.5 text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> {ready.length} علامة جاهزة للتصدير
                </li>
                {notLinked > 0 && (
                  <li className="flex items-center gap-1.5 text-amber-800">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {notLinked} طالب معتمد بس مش مربوط بـ Moodle
                  </li>
                )}
                {notApproved > 0 && (
                  <li className="flex items-center gap-1.5 text-slate-500">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {notApproved} ورقة لسا ما اعتمدتها، ما بتنصدّر
                  </li>
                )}
              </ul>
              <button
                onClick={exportFile}
                disabled={!ready.length}
                className="w-full bg-[#1E3A5F] hover:bg-[#152a45] disabled:opacity-50 text-white py-2.5 rounded-lg text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                <span>تنزيل ملف Moodle</span>
              </button>
            </div>

            {/* Step 3: how to import in Moodle */}
            <div className="rounded-xl border border-slate-200 p-3">
              <button onClick={() => setShowSteps((v) => !v)} className="w-full text-right text-xs font-bold text-slate-800 cursor-pointer">
                ٣. كيف أرفع الملف على Moodle؟ {showSteps ? '▴' : '▾'}
              </button>
              {showSteps && (
                <ol className="list-decimal pr-5 mt-2 space-y-1.5 text-[11px] text-slate-600 leading-relaxed">
                  <li>افتح الكورس على Moodle، وروح على <b>العلامات</b> (Grades).</li>
                  <li>من القائمة اختار <b>استيراد</b> ثم <b>ملف CSV</b> (Import → CSV file).</li>
                  <li>ارفع الملف اللي نزل هلأ، وخلي الترميز <b>UTF-8</b> والفاصل <b>فاصلة</b>، واضغط «رفع العلامات».</li>
                  <li>
                    عند «تحديد المستخدم»: اختار العمود <b dir="ltr">{exportKind ? MOODLE_KIND_LABEL[exportKind].moodle : 'Email address'}</b> واربطه بـ{' '}
                    <b>{exportKind ? MOODLE_KIND_LABEL[exportKind].ar : 'البريد الإلكتروني'}</b>.
                  </li>
                  <li>
                    عند عمود «{exam.title}»: اختار الواجب الموجود بالكورس، أو «عنصر تقييم جديد».
                    {mode === 'score' && total !== 100 && <> إذا اخترت عنصر جديد، عدّل علامته القصوى لـ <b>{total}</b> بعد الاستيراد.</>}
                  </li>
                  <li>اضغط <b>استيراد العلامات</b>، وخلص.</li>
                </ol>
              )}
            </div>
          </>
        ) : (
          /* Linking view */
          <div className="space-y-3">
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-[11px] text-slate-600 leading-relaxed space-y-1">
              <p className="font-bold text-slate-800">من وين بجيب الملف؟</p>
              <p>على Moodle: افتح الكورس ← العلامات ← <b>تصدير</b> ← <b>ملف نصي</b> (أو Excel)، ونزّله. أو من صفحة <b>المشاركون</b> ← اختار الكل ← «تنزيل البيانات».</p>
            </div>
            <label className="block border-2 border-dashed border-slate-300 rounded-xl p-4 text-center text-xs text-slate-600 cursor-pointer hover:bg-slate-50">
              <Upload className="w-5 h-5 mx-auto mb-1 text-slate-400" />
              ارفع ملف طلاب الكورس من Moodle (CSV أو Excel)
              <input type="file" accept=".csv,.txt,.xlsx" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
            </label>

            {users && (
              <>
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="text-slate-600">نربط عن طريق:</span>
                  <select value={kind} onChange={(e) => setKind(e.target.value as MoodleIdKind)} className="border border-slate-300 rounded-lg p-1 font-bold">
                    {(['email', 'username', 'idnumber'] as const)
                      .filter((k) => users.some((u) => u[k]))
                      .map((k) => (
                        <option key={k} value={k}>{MOODLE_KIND_LABEL[k].ar}</option>
                      ))}
                  </select>
                </div>
                <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-72 overflow-y-auto">
                  {students.map((s) => (
                    <div key={s.id} className="p-2 flex flex-col sm:flex-row sm:items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-800 sm:w-2/5 truncate">{s.name}</span>
                      <select
                        value={picks[s.id] ?? ''}
                        onChange={(e) => setPicks((p) => ({ ...p, [s.id]: e.target.value }))}
                        className={`flex-1 min-w-0 text-[11px] border rounded-lg p-1.5 ${picks[s.id] ? 'border-emerald-300 bg-emerald-50' : 'border-amber-300 bg-amber-50'}`}
                      >
                        <option value="">— غير مربوط —</option>
                        {users.map((u, i) => (
                          <option key={i} value={String(i)}>{u.name}{u[kind] ? ` · ${u[kind]}` : ''}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="flex gap-2">
              <button
                onClick={saveLinks}
                disabled={!users || saving}
                className="flex-1 bg-emerald-700 text-white py-2 rounded-lg font-bold text-xs cursor-pointer disabled:opacity-50"
              >
                {saving ? 'جاري الحفظ...' : 'حفظ الربط'}
              </button>
              <button
                onClick={() => { setLinking(false); setUsers(null); }}
                className="bg-slate-100 text-slate-700 py-2 px-4 rounded-lg font-medium text-xs cursor-pointer"
              >
                رجوع
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
