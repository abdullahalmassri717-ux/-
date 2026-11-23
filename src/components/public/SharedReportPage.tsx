import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase';

// The parent's report page, opened from the short SMS link dequa.study/r/<code>.
// No account: the random 16-character code is the key, and it works for 60 days.
// It shows only the organisation name, the week and the report text.

interface SharedReport {
  org_name: string;
  period_start: string | null;
  period_end: string | null;
  body: string | null;
  created_at: string;
}

// dequa.study/r/demo: a made-up example, so anyone can see what a parent receives.
const SAMPLE: SharedReport = {
  org_name: 'مدرسة المستقبل (مثال توضيحي)',
  period_start: '2026-11-08',
  period_end: '2026-11-14',
  created_at: '2026-11-14T16:00:00Z',
  body: [
    '📋 التقرير الأسبوعي',
    '🏫 المدرسة: مدرسة المستقبل',
    '👤 الطالب: أحمد محمود | الصف: التاسع – شعبة أ',
    '🗓️ من 08/11 إلى 14/11',
    '',
    '📘 الرياضيات',
    '• اختبار المعادلات: 17 من 20 (85%)',
    '• واجب الكسور الجبرية: 8 من 10 (80%)',
    '📊 المعدل هذا الأسبوع: 83% (⬆️ 6% عن قبل)',
    '💪 نقاط القوة: حل المعادلات الخطية',
    '🎯 نقاط تحتاج تقوية: تبسيط الكسور الجبرية',
    '📝 ملاحظات المعلم: ينتبه لإشارة السالب عند فك الأقواس',
    '💡 نصيحة للبيت: راجعوا مع الطالب «تبسيط الكسور الجبرية»، وخلّوه يحلّ تمرينين إضافيين على كل درس.',
    '📚 شُرح هذا الأسبوع: المعادلات الخطية، الكسور الجبرية',
    '',
    '📘 العلوم',
    '• اختبار الخلية: 9 من 10 (90%)',
    '💪 نقاط القوة: تركيب الخلية',
    '💡 نصيحة للبيت: أداء ممتاز، شجّعوه واستمروا على نفس المراجعة.',
  ].join('\n'),
};

interface PaperQuestion {
  number: number;
  lesson: string | null;
  score: number;
  max: number;
  note: string | null;
}

interface SharedPaper {
  id: string;
  title: string;
  subject: string;
  score: number;
  total: number;
  approvedAt: string;
  questions: PaperQuestion[];
  pageUrls: string[];
}

// 7.50 -> 7.5, 8.00 -> 8
const num = (n: number) => String(Number(Number(n).toFixed(2)));
const isCorrect = (q: PaperQuestion) => Number(q.score) >= Number(q.max) * 0.7;

function PaperCard({ paper }: { paper: SharedPaper }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-slate-200 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full p-3.5 bg-slate-50 hover:bg-slate-100 cursor-pointer text-right space-y-2.5"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="block text-[11px] font-bold text-slate-500 break-words">{paper.subject}</span>
            <span className="block text-sm font-extrabold text-[#1E3A5F] break-words">{paper.title}</span>
          </div>
          <span className="text-sm font-black text-red-700 font-mono tabular-nums shrink-0" dir="ltr">
            {num(paper.score)} / {num(paper.total)}
          </span>
        </div>
        <span className="w-full text-xs font-bold text-white bg-[#1E3A5F] rounded-xl px-3 py-2 flex items-center justify-center gap-1.5">
          {open ? 'إخفاء الورقة' : 'شوف الورقة المصحّحة'}
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </button>
      {open && (
        <div className="p-3 space-y-3">
          {paper.pageUrls.map((url, i) => (
            <div key={url} className="relative border border-slate-300 rounded-xl overflow-hidden bg-white">
              <img src={url} alt={`صفحة ${i + 1} من الورقة`} className="w-full h-auto block" />
              {i === 0 && (
                <div className="absolute top-2 left-2 w-16 h-16 rounded-full border-4 border-red-600 bg-white/85 text-red-700 flex flex-col items-center justify-center font-black font-mono tabular-nums rotate-[-8deg]">
                  <span className="text-base leading-none">{num(paper.score)}</span>
                  <span className="text-[10px] border-t-2 border-red-600 px-1.5">{num(paper.total)}</span>
                </div>
              )}
            </div>
          ))}
          {paper.pageUrls.length === 0 && (
            <p className="text-xs text-slate-500 text-center">صورة الورقة غير متوفرة، وهذه درجات كل سؤال.</p>
          )}
          <ul className="divide-y divide-slate-100">
            {paper.questions.map((q) => (
              <li key={q.number} className="py-2.5 flex items-start gap-3">
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center font-black shrink-0 ${
                    isCorrect(q) ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                  }`}
                >
                  {isCorrect(q) ? '✓' : '✗'}
                </span>
                <div className="min-w-0 flex-1">
                  <span className="block text-xs font-bold text-slate-800 break-words">
                    السؤال {q.number}
                    {q.lesson ? ` · ${q.lesson}` : ''}
                  </span>
                  {q.note && <span className="block text-xs text-red-700 font-medium break-words">✍️ {q.note}</span>}
                </div>
                <span className="text-xs font-bold text-red-700 font-mono tabular-nums shrink-0" dir="ltr">
                  {num(q.score)}/{num(q.max)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

const dateText = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('ar-PS-u-nu-latn', { day: 'numeric', month: 'long' }) : '';

export default function SharedReportPage({ code }: { code: string }) {
  const [report, setReport] = useState<SharedReport | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');
  const [papers, setPapers] = useState<SharedPaper[]>([]);

  useEffect(() => {
    if (code === 'demo') {
      setReport(SAMPLE);
      setState('ready');
      return;
    }
    if (!supabase || !/^[0-9a-f]{12}([0-9a-f]{4})?$/.test(code)) {
      setState('missing');
      return;
    }
    supabase.rpc('get_shared_report', { p_code: code }).then(({ data, error }) => {
      if (error) return setState('error');
      const row = (Array.isArray(data) ? data[0] : data) as SharedReport | undefined;
      if (!row) return setState('missing');
      setReport(row);
      setState('ready');
      // The corrected papers of that week (photos come as short-lived private links).
      supabase!.functions
        .invoke('shared-report-papers', { body: { code } })
        .then(({ data: res }) => setPapers(Array.isArray(res?.papers) ? (res.papers as SharedPaper[]) : []))
        .catch(() => setPapers([]));
    });
  }, [code]);

  return (
    <div dir="rtl" className="min-h-screen bg-[#F7F8FA] px-4 py-8 text-right">
      <div className="max-w-xl mx-auto space-y-4">
        <img src="/dequa-logo.png" alt="منصة دقة" className="h-10 w-auto mx-auto object-contain" />
        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-7 shadow-sm space-y-4">
          {state === 'loading' && <p className="text-sm text-slate-500 text-center">جاري فتح التقرير...</p>}
          {state === 'missing' && (
            <p className="text-sm text-slate-600 text-center">
              هذا الرابط غير صحيح أو انتهت مدته (60 يوماً). اطلب من المدرّس أو المدرسة تقريراً جديداً.
            </p>
          )}
          {state === 'error' && (
            <p className="text-sm text-slate-600 text-center">تعذّر فتح التقرير. تأكد من الإنترنت ثم أعد المحاولة.</p>
          )}
          {state === 'ready' && report && (
            <>
              <div className="flex items-start gap-3 border-b border-slate-100 pb-4">
                <div className="bg-blue-50 text-[#1E3A5F] p-2.5 rounded-xl shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-lg font-black text-[#1E3A5F] break-words">{report.org_name}</h1>
                  <p className="text-xs text-slate-500">
                    {report.period_start && report.period_end
                      ? `التقرير الأسبوعي: ${dateText(report.period_start)} إلى ${dateText(report.period_end)}`
                      : `تقرير بتاريخ ${dateText(report.created_at)}`}
                  </p>
                </div>
              </div>
              <div className="text-sm leading-7 text-slate-800 whitespace-pre-line break-words">{report.body}</div>
              {papers.length > 0 && (
                <div className="border-t border-slate-100 pt-4 space-y-3">
                  <h2 className="text-sm font-black text-[#1E3A5F]">📄 الأوراق المصحّحة</h2>
                  {papers.map((p) => (
                    <PaperCard key={p.id} paper={p} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
        <p className="text-[11px] text-slate-400 text-center">منصة دقة لتصحيح الواجبات والامتحانات</p>
      </div>
    </div>
  );
}
