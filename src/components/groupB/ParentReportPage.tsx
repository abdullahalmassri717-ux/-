import React, { useEffect, useState } from 'react';
import { ScreenId } from '../../types';
import { MessageCircle, Copy, ArrowRight, ExternalLink, CalendarClock } from 'lucide-react';
import { notify } from '../../lib/notify';
import { useActiveOrg, useData, useLoad, errorMessage } from '../../data/DataContext';
import type { WeeklyReportRow } from '../../data/types';
import { toInternationalPhone } from '../../lib/phone';

interface ParentReportPageProps {
  onNavigate: (screen: ScreenId) => void;
}

const STATUS_CHIP: Record<string, { text: string; cls: string }> = {
  sent: { text: 'أُرسل ✓', cls: 'text-emerald-700 bg-emerald-50' },
  failed: { text: 'فشل الإرسال', cls: 'text-red-700 bg-red-50' },
  queued: { text: 'بانتظار الإرسال', cls: 'text-blue-700 bg-blue-50' },
};

const keyOf = (r: WeeklyReportRow) => `${r.studentId}:${r.subjectName}`;

/** Weekly parent reports: one WhatsApp message per student each week, instead of one per paper. */
export const ParentReportPage: React.FC<ParentReportPageProps> = ({ onNavigate }) => {
  const store = useData();
  const org = useActiveOrg();
  const isTeacherOrg = org.type === 'individual_teacher';
  const isOwner = org.role === 'owner';
  const [selected, setSelected] = useState('');
  const [saving, setSaving] = useState(false);

  const rowsQ = useLoad((st) => st.weeklyReportPreview(org.type), [org.type]);
  const enabledQ = useLoad((st) => st.getWeeklyReportsEnabled());
  const rows = rowsQ.data ?? [];
  const enabled = enabledQ.data ?? true;

  useEffect(() => {
    if (!rows.some((r) => keyOf(r) === selected)) setSelected(rows[0] ? keyOf(rows[0]) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowsQ.data]);

  const current = rows.find((r) => keyOf(r) === selected);
  // A status counts for this week only if that report was prepared in the last 7 days.
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const statusOf = (r: WeeklyReportRow) => (r.lastPeriodEnd && r.lastPeriodEnd > weekAgo ? r.lastStatus : null);
  const noPhone = rows.filter((r) => !toInternationalPhone(r.parentPhone)).length;
  const noConsent = rows.filter((r) => !r.consent).length;

  const toggle = async () => {
    setSaving(true);
    try {
      await store.setWeeklyReportsEnabled(!enabled);
      enabledQ.reload();
      notify(enabled ? 'أُوقف الإرسال الأسبوعي التلقائي' : 'فُعّل الإرسال الأسبوعي التلقائي', 'success');
    } catch (e) {
      notify(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const manualLink = (() => {
    const phone = toInternationalPhone(current?.parentPhone ?? '');
    return phone && current ? `https://wa.me/${phone.slice(1)}?text=${encodeURIComponent(current.body)}` : null;
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
          <h1 className="text-xl font-extrabold text-[#1E3A5F]">التقرير الأسبوعي لأولياء الأمور على واتساب</h1>
          <p className="text-xs text-slate-500 mt-1">
            {isTeacherOrg
              ? 'كل طالب يصل ولي أمره تقرير واحد في الأسبوع لكل مادة، عنوانه اسم المادة.'
              : 'كل طالب يصل ولي أمره تقرير واحد في الأسبوع، فيه قسم منفصل لكل مادة.'}
          </p>
        </div>

        {isOwner && (
          <button
            onClick={toggle}
            disabled={saving || enabledQ.loading}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-2 self-start sm:self-auto disabled:opacity-50 ${
              enabled ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
            }`}
          >
            <CalendarClock className="w-4 h-4" />
            <span>{enabled ? 'الإرسال الأسبوعي مفعّل (اضغط للإيقاف)' : 'الإرسال الأسبوعي متوقف (اضغط للتفعيل)'}</span>
          </button>
        )}
      </div>

      <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 space-y-1">
        <p>
          {enabled
            ? 'يُرسل التقرير تلقائياً كل خميس مساءً، ويضم الأوراق التي اعتمدتها في آخر 7 أيام فقط.'
            : 'الإرسال التلقائي متوقف لهذه الجهة. ما زال بإمكانك إرسال التقرير يدوياً من واتساب.'}{' '}
          الطالب الذي لا ورقة معتمدة له هذا الأسبوع لا تصله رسالة.
        </p>
        {!isTeacherOrg && !isOwner && <p>تظهر لك هنا مواد صفوفك فقط. التقرير الذي يصل ولي الأمر يجمع كل المواد.</p>}
        {(noPhone > 0 || noConsent > 0) && (
          <p className="text-amber-800 font-bold">
            {noPhone > 0 && `${noPhone} بلا رقم ولي أمر صحيح (لن يصلهم شيء). `}
            {noConsent > 0 && `${noConsent} لم تُسجَّل موافقة ولي أمرهم على رسائل واتساب.`} صحّح ذلك من شاشة الطلاب.
          </p>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center space-y-3">
          <p className="text-sm text-slate-600">
            {rowsQ.loading ? 'جاري التحميل...' : rowsQ.error ? rowsQ.error : 'لا توجد أوراق معتمدة في آخر 7 أيام بعد.'}
          </p>
          <button onClick={() => onNavigate('B8')} className="bg-[#1E3A5F] text-white px-4 py-2 rounded-lg text-xs font-bold cursor-pointer">
            مراجعة التصحيح
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-[#1E3A5F] text-sm">تقارير هذا الأسبوع ({rows.length})</h3>
            </div>
            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
              {rows.map((r) => {
                const chip = STATUS_CHIP[statusOf(r) ?? ''];
                return (
                  <div
                    key={keyOf(r)}
                    onClick={() => setSelected(keyOf(r))}
                    className={`p-2.5 rounded-xl flex items-center justify-between gap-2 cursor-pointer transition-colors ${selected === keyOf(r) ? 'bg-[#E8F0F8]' : 'hover:bg-slate-50'}`}
                  >
                    <div className="min-w-0">
                      <span className="font-bold text-xs text-slate-800 block truncate">{r.studentName}</span>
                      <span className="text-[10px] text-slate-500 block truncate">
                        {r.subjectName ? `${r.subjectName} · ` : ''}
                        {r.papers} {r.papers === 1 ? 'ورقة' : 'أوراق'} · <span className="font-mono">{r.parentPhone || 'بلا رقم'}</span>
                      </span>
                    </div>
                    {chip ? (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0 ${chip.cls}`}>{chip.text}</span>
                    ) : (
                      <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">يُرسل الخميس</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {current && (
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-emerald-900/10 border border-emerald-300 rounded-2xl p-4 text-right space-y-2 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 text-emerald-950 font-bold">
                  <span className="flex items-center gap-1.5 min-w-0">
                    <MessageCircle className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span className="truncate">الرسالة التي تصل ولي الأمر ({current.parentPhone || 'بلا رقم'})</span>
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(current.body);
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
                <div className="bg-white p-3 rounded-xl border border-slate-200 text-slate-700 font-sans leading-relaxed text-[12px] whitespace-pre-wrap break-words">
                  {current.body}
                </div>
                <p className="text-[10px] text-emerald-900/80">
                  هذا تقرير الأسبوع حتى الآن. أي ورقة تعتمدها قبل موعد الإرسال تُضاف إليه تلقائياً.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
