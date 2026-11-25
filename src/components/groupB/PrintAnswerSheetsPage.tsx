import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import QRCode from 'qrcode';
import { ScreenId } from '../../types';
import { Printer, QrCode, ArrowRight, Minus, Plus, RotateCcw, Loader2 } from 'lucide-react';
import { notify } from '../../lib/notify';
import { useData, useLoad } from '../../data/DataContext';
import { useSelected } from '../../data/selection';
import type { AssessmentDetail, StudentRow } from '../../data/types';
import {
  fitToPages,
  fitsIn,
  linesFor,
  MAX_LINES,
  MAX_PAGES,
  normalizePrintLayout,
  packPages,
  type PageMetrics,
  type PrintLayout,
} from '../../lib/printLayout';

interface PrintAnswerSheetsPageProps {
  onNavigate: (screen: ScreenId) => void;
}

const ORDINALS = ['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس', 'السابع', 'الثامن', 'التاسع', 'العاشر'];
const TYPE_NAMES: Record<string, string> = {
  multiple_choice: 'اختيار من متعدد',
  short_answer: 'إجابة قصيرة',
  problem_solving: 'حل مسألة',
  essay: 'مقالي',
};

// Sizes in mm. The browser prints with a 12 mm margin (index.css @page), so
// the printable area of an A4 page is 186 × 273 mm.
const PAGE_W = 186;
const PAGE_H = 273;
const LINE_MM = 8;
const GAP_MM = 3;
const SAFETY_MM = 3;

const INSTRUCTIONS = 'أجب في المساحة المخصصة لكل سؤال. اكتب بقلم أزرق أو أسود بخط واضح. لا تكتب فوق رمز QR ولا تطوِ الورقة.';

const pagesWord = (n: number) => (n === 1 ? 'صفحة واحدة' : n === 2 ? 'صفحتان' : n <= 10 ? `${n} صفحات` : `${n} صفحة`);

/** QR + the big 4-digit code: grading uses them to know whose paper it is. */
const IdBox: React.FC<{ qr: string; code: string; small?: boolean }> = ({ qr, code, small }) => (
  <div className="border-2 border-slate-900 p-1 rounded-lg bg-white text-center shrink-0">
    {qr ? <img src={qr} alt="رمز QR" className={small ? 'w-11 h-11' : 'w-20 h-20'} /> : <div className={small ? 'w-11 h-11' : 'w-20 h-20'} />}
    <span className={`${small ? 'text-xs' : 'text-base'} font-black font-mono text-slate-900 block tabular-nums tracking-widest`} dir="ltr">
      {code}
    </span>
    {!small && <span className="text-[9px] text-slate-500 block">رمز الطالب</span>}
  </div>
);

const FirstHeader: React.FC<{ exam: AssessmentDetail; name: string; code: string; qr: string }> = ({ exam, name, code, qr }) => (
  <div className="pb-3 space-y-3">
    <div className="flex items-start justify-between gap-3 border-b-2 border-slate-900 pb-3">
      <div className="space-y-1 min-w-0">
        <span className="font-black text-lg text-slate-900 block break-words">{exam.title}</span>
        <p className="text-xs text-slate-600 font-bold break-words">
          {exam.subject && <>المادة: <strong>{exam.subject}</strong> · </>}المجموعة: <strong>{exam.group}</strong> · العلامة: ____ / {exam.totalScore}
        </p>
        <p className="text-xs text-slate-800 pt-1 break-words">
          الطالب: <strong className="text-sm text-[#1E3A5F]">{name}</strong>
        </p>
      </div>
      <IdBox qr={qr} code={code} />
    </div>
    <div className="p-2 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-600">
      <strong className="text-slate-800">تعليمات: </strong>
      {INSTRUCTIONS}
    </div>
  </div>
);

/** Small header on pages 2+, so a loose page still shows whose it is. */
const NextHeader: React.FC<{ exam: AssessmentDetail; name: string; code: string; qr: string }> = ({ exam, name, code, qr }) => (
  <div className="pb-3">
    <div className="flex items-center justify-between gap-3 border-b border-slate-400 pb-2 text-[11px] text-slate-700">
      <span className="min-w-0 break-words">
        <strong>{exam.title}</strong> · الطالب: <strong>{name}</strong>
      </span>
      <IdBox qr={qr} code={code} small />
    </div>
  </div>
);

const Footer: React.FC<{ exam: AssessmentDetail; code: string; page: number; pages: number }> = ({ exam, code, page, pages }) => (
  <div className="border-t border-slate-200 pt-1.5 flex items-center justify-between text-[10px] text-slate-500 font-mono">
    <span>دقة</span>
    <span className="font-sans font-bold">صفحة {page} من {pages}</span>
    <span dir="ltr">{exam.submissionCode} · {code}</span>
  </div>
);

const AnswerSpace: React.FC<{ lines: number; style: PrintLayout['style'] }> = ({ lines, style }) => {
  // An empty div even with no lines, so the measured block keeps the same spacing.
  if (lines <= 0) return <div />;
  if (style === 'box') return <div className="w-full border border-dashed border-slate-400 rounded" style={{ height: `${lines * LINE_MM}mm` }} />;
  return (
    <div className="w-full">
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="border-b border-slate-400" style={{ height: `${LINE_MM}mm` }} />
      ))}
    </div>
  );
};

const QuestionBlock: React.FC<{
  q: AssessmentDetail['questions'][number];
  index: number;
  lines: number;
  style: PrintLayout['style'];
  first: boolean;
}> = ({ q, index, lines, style, first }) => (
  <div className="border border-slate-300 rounded-lg p-2.5 space-y-1.5" style={{ marginTop: first ? 0 : `${GAP_MM}mm` }}>
    <div className="flex items-center justify-between gap-2 text-xs font-bold text-slate-800 border-b border-slate-200 pb-1">
      <span className="min-w-0 break-words">السؤال {ORDINALS[index] ?? index + 1}{q.lesson ? ` (${q.lesson})` : ''}</span>
      <span className="font-mono text-slate-500 tabular-nums shrink-0">[ {q.maxScore} ]</span>
    </div>
    {q.text && <p className="text-xs text-slate-900 leading-relaxed whitespace-pre-wrap break-words">{q.text}</p>}
    <AnswerSpace lines={lines} style={style} />
  </div>
);

/** One printed page of one student's paper (the 186 × 273 mm printable area). */
const SheetPage: React.FC<{
  exam: AssessmentDetail;
  student: StudentRow;
  qr: string;
  layout: PrintLayout;
  lines: number[];
  questions: number[];
  page: number;
  pages: number;
  className?: string;
}> = ({ exam, student, qr, layout, lines, questions, page, pages, className = '' }) => (
  <div className={`bg-white text-right font-sans flex flex-col ${className}`} style={{ width: `${PAGE_W}mm`, height: `${PAGE_H}mm` }}>
    {page === 1 ? (
      <FirstHeader exam={exam} name={student.name} code={student.studentCode} qr={qr} />
    ) : (
      <NextHeader exam={exam} name={student.name} code={student.studentCode} qr={qr} />
    )}
    <div>
      {questions.map((i, k) => (
        <QuestionBlock key={exam.questions[i].id} q={exam.questions[i]} index={i} lines={lines[i]} style={layout.style} first={k === 0} />
      ))}
    </div>
    <div className="flex-1" />
    <Footer exam={exam} code={student.studentCode} page={page} pages={pages} />
  </div>
);

/** Renders the parts off screen at print size and reports their heights in px. */
const Measurer: React.FC<{ exam: AssessmentDetail; longestName: string; onMeasure: (m: PageMetrics) => void }> = ({ exam, longestName, onMeasure }) => {
  const root = useRef<HTMLDivElement>(null);
  const [fontsTick, setFontsTick] = useState(0);
  useEffect(() => {
    let alive = true;
    document.fonts?.ready.then(() => alive && setFontsTick((t) => t + 1));
    return () => {
      alive = false;
    };
  }, []);
  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const h = (sel: string) => el.querySelector(sel)?.getBoundingClientRect().height ?? 0;
    const mm = h('[data-m="probe"]') / 100;
    if (!mm) return;
    const questions = [...el.querySelectorAll('[data-m="q"]')].map((n) => n.getBoundingClientRect().height);
    onMeasure({
      page: (PAGE_H - SAFETY_MM) * mm - h('[data-m="foot"]'),
      firstHeader: h('[data-m="first"]'),
      nextHeader: h('[data-m="next"]'),
      gap: GAP_MM * mm,
      line: LINE_MM * mm,
      questions,
    });
  }, [exam, longestName, fontsTick, onMeasure]);
  return (
    <div aria-hidden className="print:hidden" style={{ position: 'fixed', top: 0, right: 0, width: 0, height: 0, overflow: 'hidden', visibility: 'hidden' }}>
      <div ref={root} className="bg-white text-right font-sans" style={{ width: `${PAGE_W}mm` }}>
        <div data-m="probe" style={{ height: '100mm' }} />
        <div data-m="first"><FirstHeader exam={exam} name={longestName} code="0000" qr="" /></div>
        <div data-m="next"><NextHeader exam={exam} name={longestName} code="0000" qr="" /></div>
        <div data-m="foot"><Footer exam={exam} code="0000" page={1} pages={1} /></div>
        {exam.questions.map((q, i) => (
          <div data-m="q" key={q.id}>
            <QuestionBlock q={q} index={i} lines={0} style="lines" first />
          </div>
        ))}
      </div>
    </div>
  );
};

/** A full A4 page shown shrunk to fit the screen width. */
const ScaledPage: React.FC<{ width: number; children: React.ReactNode }> = ({ width, children }) => {
  const a4 = (210 / 25.4) * 96; // px
  const scale = width ? Math.min(1, width / a4) : 0;
  return (
    <div className="relative mx-auto bg-white border border-slate-300 shadow-md overflow-hidden" style={{ width: a4 * scale, height: a4 * (297 / 210) * scale }}>
      <div className="absolute top-0 right-0" style={{ width: '210mm', height: '297mm', padding: '12mm', transform: `scale(${scale})`, transformOrigin: 'top right' }}>
        {children}
      </div>
    </div>
  );
};

export const PrintAnswerSheetsPage: React.FC<PrintAnswerSheetsPageProps> = ({ onNavigate }) => {
  const store = useData();
  const [savedExamId, setSavedExamId] = useSelected('exam');
  const examsQ = useLoad((st) => st.listAssessments());
  const exams = examsQ.data ?? [];
  const examId = exams.some((e) => e.id === savedExamId) ? savedExamId! : exams[0]?.id ?? '';
  const examQ = useLoad((st) => (examId ? st.getAssessment(examId) : Promise.resolve(null)), [examId]);
  const layoutQ = useLoad((st) => (examId ? st.getPrintLayout(examId) : Promise.resolve(normalizePrintLayout(null))), [examId]);
  const studentsQ = useLoad((st) => st.listStudents());
  const exam = examQ.data && examQ.data.id === examId ? examQ.data : null;
  const students = useMemo(
    () => (studentsQ.data ?? []).filter((s) => !!exam && s.groupIds.includes(exam.groupId)),
    [studentsQ.data, exam?.groupId],
  );
  const [selectedId, setSelectedId] = useState('');
  const selectedStudent = students.find((s) => s.id === selectedId) ?? students[0];
  const [qrs, setQrs] = useState<Record<string, string>>({});

  // Layout being edited; saved a moment after each change.
  const [layout, setLayout] = useState<PrintLayout | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const dirty = useRef(false);
  useEffect(() => {
    dirty.current = false;
    setLayout(layoutQ.data ?? null);
    setSaveState('idle');
  }, [layoutQ.data]);
  useEffect(() => {
    if (!layout || !examId || !dirty.current) return;
    setSaveState('saving');
    const t = setTimeout(() => {
      store
        .savePrintLayout(examId, layout)
        .then(() => setSaveState('saved'))
        .catch((e: unknown) => {
          setSaveState('idle');
          notify(e instanceof Error ? e.message : 'تعذّر حفظ تنسيق الورقة.', 'warning');
        });
    }, 700);
    return () => clearTimeout(t);
  }, [layout, examId, store]);
  const change = (next: PrintLayout) => {
    dirty.current = true;
    setLayout(next);
  };

  // QR holds only the exam link code and the student's 4-digit code (no names).
  useEffect(() => {
    if (!exam) return;
    let alive = true;
    Promise.all(
      students.map(async (s) => [s.id, await QRCode.toDataURL(`daqa:${exam.submissionCode}:${s.studentCode}`, { margin: 0, width: 160 })] as const),
    ).then((pairs) => alive && setQrs(Object.fromEntries(pairs)));
    return () => {
      alive = false;
    };
  }, [exam, students]);

  // Page metrics are measured with the longest name, so every student's paper splits the same way.
  const longestName = useMemo(() => students.reduce((a, s) => (s.name.length > a.length ? s.name : a), 'اسم الطالب'), [students]);
  const [metrics, setMetrics] = useState<PageMetrics | null>(null);
  const onMeasure = React.useCallback((m: PageMetrics) => {
    setMetrics((old) => (old && JSON.stringify(old) === JSON.stringify(m) ? old : m));
  }, []);

  const lines = useMemo(() => (exam && layout ? exam.questions.map((q) => linesFor(layout, q)) : []), [exam, layout]);
  const pages = useMemo(
    () => (exam && metrics && metrics.questions.length === exam.questions.length ? packPages(metrics, lines) : exam ? [exam.questions.map((_, i) => i)] : []),
    [exam, metrics, lines],
  );
  const minPages = useMemo(() => {
    if (!exam || !metrics || metrics.questions.length !== exam.questions.length) return 1;
    const least = lines.map((n) => (n > 0 ? 1 : 0));
    for (let n = 1; n <= MAX_PAGES; n++) if (fitsIn(metrics, least, n)) return n;
    return MAX_PAGES + 1;
  }, [exam, metrics, lines]);

  const setLines = (index: number, value: number) => {
    if (!exam || !layout) return;
    const q = exam.questions[index];
    const n = Math.max(0, Math.min(MAX_LINES, value));
    change({ ...layout, pages: null, lines: { ...layout.lines, [String(q.questionNumber)]: n } });
  };

  const fit = (target: number) => {
    if (!exam || !layout || !metrics) return;
    const out = fitToPages(metrics, lines, target);
    if (!out) return notify(`الأسئلة لا تتسع في ${pagesWord(target)}. أقل عدد ممكن: ${pagesWord(minPages)}.`, 'warning');
    const next: Record<string, number> = {};
    exam.questions.forEach((q, i) => (next[String(q.questionNumber)] = out[i]));
    change({ ...layout, pages: target, lines: next });
  };

  const reset = () => layout && change({ ...layout, pages: null, lines: {} });

  // Preview width follows the screen.
  const previewRef = useRef<HTMLDivElement>(null);
  const [previewWidth, setPreviewWidth] = useState(0);
  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setPreviewWidth(el.clientWidth));
    ro.observe(el);
    setPreviewWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const printAll = () => {
    if (!students.length) return notify('لا يوجد طلاب في مجموعة هذا الامتحان', 'warning');
    window.print();
  };

  const tooTall = exam && metrics && metrics.questions.length === exam.questions.length
    ? pages.some((idx, p) => {
        const room = metrics.page - (p === 0 ? metrics.firstHeader : metrics.nextHeader);
        return idx.length === 1 && metrics.questions[idx[0]] + lines[idx[0]] * metrics.line > room;
      })
    : false;

  return (
    <div className="space-y-6 text-right max-w-4xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <button
            onClick={() => onNavigate('B5')}
            className="text-xs text-slate-500 hover:text-[#1E3A5F] flex items-center gap-1 cursor-pointer font-medium mb-1"
          >
            <ArrowRight className="w-4 h-4" />
            <span>العودة لإعدادات الامتحان</span>
          </button>
          <h1 className="text-xl font-extrabold text-[#1E3A5F]">طباعة أوراق الإجابة مع رموز QR الذكية</h1>
          <p className="text-xs text-slate-500">
            حدّد مساحة الإجابة لكل سؤال وعدد صفحات الورقة، ثم اطبع ورقة A4 لكل طالب.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={printAll}
            className="bg-[#1E3A5F] hover:bg-[#152a45] text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 shadow-2xs"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة / حفظ PDF لكل الطلاب ({students.length} ورقة)</span>
          </button>
          <button
            onClick={() => onNavigate('B7')}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            الانتقال لرفع وتصوير الأوراق ←
          </button>
        </div>
      </div>

      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-950 flex items-center gap-3">
        <QrCode className="w-6 h-6 text-[#1E3A5F] shrink-0" />
        <span>
          رمز الطالب (4 أرقام) ورمز QR مطبوعان على كل صفحة، فيتعرّف التصحيح على صاحب الورقة حتى لو انفصلت الصفحات. لحفظ ملف PDF اختر «حفظ كـ PDF» من نافذة الطباعة.
        </span>
      </div>

      {/* Exam & student selectors */}
      <div className="flex flex-col sm:flex-row gap-2 text-xs">
        <select
          value={examId}
          onChange={(e) => setSavedExamId(e.target.value)}
          className="min-w-0 flex-1 p-2 bg-white border border-slate-300 rounded-lg font-bold"
        >
          {exams.length === 0 && <option value="">لا توجد امتحانات بعد</option>}
          {exams.map((ex) => (
            <option key={ex.id} value={ex.id}>{ex.title} ({ex.group})</option>
          ))}
        </select>
        <select
          value={selectedStudent?.id ?? ''}
          onChange={(e) => setSelectedId(e.target.value)}
          className="min-w-0 flex-1 p-2 bg-white border border-slate-300 rounded-lg"
        >
          {students.map((st) => (
            <option key={st.id} value={st.id}>معاينة: {st.name} ({st.studentCode})</option>
          ))}
        </select>
      </div>

      {exam && !exam.questions.length && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">هذا الامتحان بلا أسئلة بعد، لذلك الورقة بلا مساحات إجابة.</p>
      )}
      {!students.length && exam && <p className="text-xs text-slate-500 text-center">لا يوجد طلاب في مجموعة هذا الامتحان بعد.</p>}

      {/* Layout controls */}
      {exam && layout && exam.questions.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-4 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-extrabold text-sm text-[#1E3A5F]">تنسيق الورقة</h2>
            <span className="text-slate-500 flex items-center gap-1">
              {saveState === 'saving' && <><Loader2 className="w-3.5 h-3.5 animate-spin" /> يُحفظ…</>}
              {saveState === 'saved' && 'تم الحفظ مع الامتحان'}
            </span>
          </div>

          <div className="space-y-2">
            <p className="font-bold text-slate-800">
              عدد الصفحات لكل طالب: <span className="text-[#1E3A5F]">الآن {pagesWord(pages.length)}</span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: Math.min(MAX_PAGES, 6) }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => fit(n)}
                  disabled={!metrics || n < minPages}
                  className={`min-w-10 px-3 py-2 rounded-lg border font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    layout.pages === n ? 'bg-[#1E3A5F] text-white border-[#1E3A5F]' : 'bg-white border-slate-300 text-slate-700 hover:border-[#1E3A5F]'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <p className="text-slate-500">
              اختر عدد الصفحات، فتتوزّع مساحات الإجابة تلقائياً لتملأها، مع الحفاظ على أن الأسئلة الطويلة تأخذ مساحة أكبر. بعدها تقدر تعدّل أي سؤال بنفسك.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-800">شكل مساحة الإجابة:</span>
            {(['lines', 'box'] as const).map((s) => (
              <button
                key={s}
                onClick={() => change({ ...layout, style: s })}
                className={`px-3 py-1.5 rounded-lg border font-bold cursor-pointer ${
                  layout.style === s ? 'bg-[#1E3A5F] text-white border-[#1E3A5F]' : 'bg-white border-slate-300 text-slate-700'
                }`}
              >
                {s === 'lines' ? 'أسطر' : 'مربع فارغ'}
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            <p className="font-bold text-slate-800">مساحة الإجابة لكل سؤال (بالأسطر، السطر 8 ملم):</p>
            <ul className="divide-y divide-slate-100 border border-slate-200 rounded-xl">
              {exam.questions.map((q, i) => (
                <li key={q.id} className="flex items-center justify-between gap-2 p-2">
                  <div className="min-w-0">
                    <span className="font-bold text-slate-800">السؤال {ORDINALS[i] ?? i + 1}</span>
                    <span className="text-slate-500"> · {TYPE_NAMES[q.type] ?? ''}</span>
                    {q.text && <span className="block text-[11px] text-slate-500 truncate">{q.text}</span>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setLines(i, lines[i] - 1)}
                      disabled={lines[i] <= 0}
                      aria-label="أقل"
                      className="w-8 h-8 rounded-lg border border-slate-300 flex items-center justify-center cursor-pointer disabled:opacity-40"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-16 text-center font-bold tabular-nums">{lines[i] === 0 ? 'بلا فراغ' : `${lines[i]} ${lines[i] <= 2 ? (lines[i] === 1 ? 'سطر' : 'سطران') : lines[i] <= 10 ? 'أسطر' : 'سطراً'}`}</span>
                    <button
                      onClick={() => setLines(i, lines[i] + 1)}
                      disabled={lines[i] >= MAX_LINES}
                      aria-label="أكثر"
                      className="w-8 h-8 rounded-lg border border-slate-300 flex items-center justify-center cursor-pointer disabled:opacity-40"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-slate-500">
                «بلا فراغ» مناسب لأسئلة الاختيار التي يضع فيها الطالب دائرة على الإجابة داخل نص السؤال.
              </span>
              <button onClick={reset} className="flex items-center gap-1 text-slate-600 hover:text-[#1E3A5F] font-bold cursor-pointer">
                <RotateCcw className="w-3.5 h-3.5" /> المساحات الافتراضية
              </button>
            </div>
            {tooTall && (
              <p className="text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2">
                أحد الأسئلة أطول من صفحة كاملة، فسيتجاوز حدود الصفحة عند الطباعة. قلّل أسطر إجابته.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Preview: every page of the chosen student */}
      <div ref={previewRef} className="space-y-3">
        {exam && layout && selectedStudent &&
          pages.map((idx, p) => (
            <div key={p} className="space-y-1">
              <p className="text-[11px] text-slate-500 text-center">صفحة {p + 1} من {pages.length}</p>
              <ScaledPage width={previewWidth}>
                <SheetPage
                  exam={exam}
                  student={selectedStudent}
                  qr={qrs[selectedStudent.id] ?? ''}
                  layout={layout}
                  lines={lines}
                  questions={idx}
                  page={p + 1}
                  pages={pages.length}
                />
              </ScaledPage>
            </div>
          ))}
      </div>

      {exam && <Measurer exam={exam} longestName={longestName} onMeasure={onMeasure} />}

      {/* Every student's pages, shown only when printing. Rendered at the end of
          <body> so each page starts on a fresh sheet of paper. */}
      {exam &&
        layout &&
        createPortal(
          <div className="print-area print-only print-portal">
            {students.flatMap((st) =>
              pages.map((idx, p) => (
                <SheetPage
                  key={`${st.id}-${p}`}
                  exam={exam}
                  student={st}
                  qr={qrs[st.id] ?? ''}
                  layout={layout}
                  lines={lines}
                  questions={idx}
                  page={p + 1}
                  pages={pages.length}
                  className="print-page"
                />
              )),
            )}
          </div>,
          document.body,
        )}
    </div>
  );
};
