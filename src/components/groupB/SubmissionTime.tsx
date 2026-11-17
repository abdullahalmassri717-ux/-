// The time window of the student submission link (/s/<code>): the teacher picks
// when it closes (and optionally when it opens), and can extend, reopen or close it.
import React, { useState } from 'react';
import { Clock, X } from 'lucide-react';
import { useData, errorMessage } from '../../data/DataContext';
import { notify } from '../../lib/notify';
import type { AssessmentRow } from '../../data/types';
import { formatWhen, linkState, type LinkState } from '../../../supabase/functions/_shared/submissionWindow.ts';

export type ClosePreset = '2h' | '1d' | '3d' | '1w' | 'custom' | 'none';

const PRESETS: { id: ClosePreset; label: string; hours?: number }[] = [
  { id: '2h', label: 'ساعتين', hours: 2 },
  { id: '1d', label: 'يوم', hours: 24 },
  { id: '3d', label: '3 أيام', hours: 72 },
  { id: '1w', label: 'أسبوع', hours: 168 },
  { id: 'custom', label: 'وقت محدد' },
  { id: 'none', label: 'بدون موعد' },
];

/** A sensible default: an exam closes after a day, homework after 3 days. */
export const defaultClosePreset = (kind: 'exam' | 'homework'): ClosePreset => (kind === 'homework' ? '3d' : '1d');

/** «2026-11-20T20:00» (the phone's local time) ⇄ ISO. */
export const toLocalInput = (d: Date): string => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
export const fromLocalInput = (v: string): string | null => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

/** The closing time for a choice. Throws an Arabic message when it is not valid. */
export function resolveClose(preset: ClosePreset, custom: string, from: Date): string | null {
  if (preset === 'none') return null;
  if (preset === 'custom') {
    const iso = fromLocalInput(custom);
    if (!iso) throw new Error('اختر تاريخ ووقت إغلاق رابط التسليم.');
    if (new Date(iso).getTime() <= Math.max(from.getTime(), Date.now())) throw new Error('وقت الإغلاق يجب أن يكون بعد وقت الفتح وبعد الآن.');
    return iso;
  }
  const hours = PRESETS.find((p) => p.id === preset)?.hours ?? 24;
  return new Date(from.getTime() + hours * 3600_000).toISOString();
}

/** Chips: close after 2 hours / a day / 3 days / a week / at a set time / no end. */
export const ClosePicker: React.FC<{
  preset: ClosePreset;
  custom: string;
  onChange: (preset: ClosePreset, custom: string) => void;
  label?: string;
}> = ({ preset, custom, onChange, label = 'يُغلق رابط التسليم بعد:' }) => (
  <div className="space-y-2">
    <span className="block font-bold text-slate-700 text-xs">{label}</span>
    <div className="flex flex-wrap gap-1.5">
      {PRESETS.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onChange(p.id, p.id === 'custom' && !custom ? toLocalInput(new Date(Date.now() + 24 * 3600_000)) : custom)}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer ${
            preset === p.id ? 'bg-[#1E3A5F] text-white border-[#1E3A5F]' : 'bg-slate-50 text-slate-700 border-slate-200'
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
    {preset === 'custom' && (
      <input
        type="datetime-local"
        value={custom}
        onChange={(e) => onChange('custom', e.target.value)}
        className="w-full p-2 bg-[#F7F8FA] border border-slate-300 rounded-lg text-xs"
      />
    )}
    {preset === 'none' && (
      <p className="text-[11px] text-amber-700">يبقى الرابط مفتوحاً حتى تغلقه بنفسك.</p>
    )}
  </div>
);

const examWindow = (e: AssessmentRow) => ({ open: e.submissionOpen, opensAt: e.submissionOpensAt, closesAt: e.submissionClosesAt });

/** One line for the teacher: open until …, ended …, opens …, closed. */
export function windowText(e: AssessmentRow): { state: LinkState; text: string } {
  const w = examWindow(e);
  const state = linkState(w);
  if (state === 'closed_by_teacher') return { state, text: 'رابط التسليم مغلق' };
  if (state === 'not_started') return { state, text: `يفتح ${formatWhen(w.opensAt!)}` };
  if (state === 'ended') return { state, text: `انتهى وقت التسليم (${formatWhen(w.closesAt!)})` };
  return { state, text: w.closesAt ? `مفتوح حتى ${formatWhen(w.closesAt)}` : 'مفتوح بدون موعد إغلاق' };
}

export const WindowBadge: React.FC<{ exam: AssessmentRow }> = ({ exam }) => {
  const { state, text } = windowText(exam);
  const color =
    state === 'open' ? 'bg-emerald-50 text-emerald-800' : state === 'not_started' ? 'bg-amber-50 text-amber-800' : 'bg-red-50 text-red-700';
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${color}`}>
      <Clock className="w-3 h-3 shrink-0" />
      <span>{text}</span>
    </span>
  );
};

/** Change the link's time: extend, reopen, open now, or close now. */
export const SubmissionTimeModal: React.FC<{ exam: AssessmentRow; onClose: () => void; onSaved: () => void }> = ({
  exam,
  onClose,
  onSaved,
}) => {
  const store = useData();
  const { state } = windowText(exam);
  const [preset, setPreset] = useState<ClosePreset>(defaultClosePreset(exam.type));
  const [custom, setCustom] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async (patch: Parameters<typeof store.updateAssessment>[1], done: string) => {
    setSaving(true);
    try {
      await store.updateAssessment(exam.id, patch);
      notify(done);
      onSaved();
      onClose();
    } catch (e) {
      notify(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const extend = () => {
    // Waiting to open: keep the opening time and count from it. Otherwise count from now.
    const keepOpensAt = state === 'not_started' && exam.submissionOpensAt;
    const from = keepOpensAt ? new Date(exam.submissionOpensAt!) : new Date();
    let closesAt: string | null;
    try {
      closesAt = resolveClose(preset, custom, from);
    } catch (e) {
      notify(e instanceof Error ? e.message : String(e), 'warning');
      return;
    }
    void save(
      { submissionOpen: true, submissionClosesAt: closesAt, ...(keepOpensAt ? {} : { submissionOpensAt: null }) },
      closesAt ? `رابط التسليم مفتوح حتى ${formatWhen(closesAt)}` : 'رابط التسليم مفتوح بدون موعد إغلاق',
    );
  };

  const openNow = () => void save({ submissionOpen: true, submissionOpensAt: null }, 'فُتح رابط التسليم الآن');
  const closeNow = () =>
    void save(
      // Keep the window valid: an opening time in the future is cleared.
      { submissionClosesAt: new Date().toISOString(), submissionOpensAt: null },
      'أُغلق رابط التسليم. لن يقبل أوراقاً جديدة.',
    );

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-5 w-full max-w-sm space-y-4 text-right shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="font-extrabold text-[#1E3A5F] text-base">وقت التسليم</h2>
            <p className="text-xs text-slate-500 break-words">{exam.title} ({exam.group})</p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer" aria-label="إغلاق">
            <X className="w-5 h-5" />
          </button>
        </div>

        <WindowBadge exam={exam} />

        <div className="p-3 bg-slate-50 rounded-xl space-y-3">
          <ClosePicker
            preset={preset}
            custom={custom}
            onChange={(p, c) => {
              setPreset(p);
              setCustom(c);
            }}
            label={state === 'open' ? 'مدّد الوقت، يُغلق بعد (من الآن):' : 'أعد فتح الرابط، يُغلق بعد (من الآن):'}
          />
          <button
            onClick={extend}
            disabled={saving}
            className="w-full bg-[#1E3A5F] hover:bg-[#152a45] disabled:bg-slate-300 text-white py-2.5 rounded-xl text-xs font-bold cursor-pointer"
          >
            {state === 'open' ? 'حفظ الوقت الجديد' : 'أعد فتح رابط التسليم'}
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {state === 'not_started' && (
            <button onClick={openNow} disabled={saving} className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 py-2 rounded-lg text-xs font-bold cursor-pointer">
              افتحه الآن
            </button>
          )}
          {(state === 'open' || state === 'not_started') && (
            <button onClick={closeNow} disabled={saving} className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 py-2 rounded-lg text-xs font-bold cursor-pointer">
              أغلق الرابط الآن
            </button>
          )}
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          بعد انتهاء الوقت يرى الطالب «انتهى وقت التسليم» ولا يقبل الرابط أي ورقة. أنت تستطيع دائماً رفع أوراق متأخرة بنفسك من شاشة رفع الأوراق.
        </p>
      </div>
    </div>
  );
};
