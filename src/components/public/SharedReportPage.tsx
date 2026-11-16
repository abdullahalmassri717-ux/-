import { useEffect, useState } from 'react';
import { FileText } from 'lucide-react';
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

const dateText = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('ar-PS-u-nu-latn', { day: 'numeric', month: 'long' }) : '';

export default function SharedReportPage({ code }: { code: string }) {
  const [report, setReport] = useState<SharedReport | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');

  useEffect(() => {
    if (code === 'demo') {
      setReport(SAMPLE);
      setState('ready');
      return;
    }
    if (!supabase || !/^[0-9a-f]{16}$/.test(code)) {
      setState('missing');
      return;
    }
    supabase.rpc('get_shared_report', { p_code: code }).then(({ data, error }) => {
      if (error) return setState('error');
      const row = (Array.isArray(data) ? data[0] : data) as SharedReport | undefined;
      if (!row) return setState('missing');
      setReport(row);
      setState('ready');
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
            </>
          )}
        </div>
        <p className="text-[11px] text-slate-400 text-center">منصة دقة لتصحيح الواجبات والامتحانات</p>
      </div>
    </div>
  );
}
