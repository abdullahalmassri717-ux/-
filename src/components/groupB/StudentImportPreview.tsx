import { Sparkles } from 'lucide-react';
import { COLUMN_ROLES, type ColumnMap, type ColumnRole, type ImportedStudent } from '../../lib/studentImport';

export type AiReadState = 'idle' | 'reading' | 'done' | 'failed';

/**
 * Shows how the file was read before anything is saved: what each column
 * holds (changeable by hand) and the first students as they will be saved.
 */
export default function StudentImportPreview({
  rows,
  map,
  students,
  aiState,
  onChange,
  onAskAi,
}: {
  rows: string[][];
  map: ColumnMap;
  students: ImportedStudent[];
  aiState: AiReadState;
  onChange: (map: ColumnMap) => void;
  onAskAi: () => void;
}) {
  const width = map.roles.length;
  const header = map.headerRow >= 0 ? rows[map.headerRow] ?? [] : [];
  const firstData = rows.slice(map.headerRow + 1);
  const sample = (i: number) => firstData.map((r) => (r[i] ?? '').trim()).find(Boolean) ?? '';
  const cols = Array.from({ length: width }, (_, i) => i).filter((i) => header[i]?.trim() || sample(i));
  const noPhone = students.filter((s) => !s.parentPhone && !s.studentPhone).length;
  const noClass = students.some((s) => s.classLabel) ? students.filter((s) => !s.classLabel).length : 0;
  const setRole = (i: number, role: ColumnRole) => onChange({ ...map, roles: map.roles.map((r, k) => (k === i ? role : r)) });

  return (
    <div className="text-xs space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50/60">
      <div className="flex items-start justify-between gap-2">
        <p className="font-bold text-slate-800 leading-relaxed">
          {aiState === 'reading'
            ? 'الذكاء الاصطناعي عم يقرأ أعمدة ملفك…'
            : aiState === 'done'
              ? '✨ الذكاء الاصطناعي قرأ أعمدة ملفك. تأكد إنها صح:'
              : 'هيك قرأنا أعمدة ملفك. إذا في عمود غلط، غيّره:'}
        </p>
        {width > 1 && aiState !== 'reading' && aiState !== 'done' && (
          <button
            type="button"
            onClick={onAskAi}
            className="shrink-0 flex items-center gap-1 text-[11px] font-bold text-violet-700 border border-violet-300 bg-white rounded-lg px-2 py-1 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>اقرأه بالذكاء الاصطناعي</span>
          </button>
        )}
      </div>
      {aiState === 'failed' && (
        <p className="text-[11px] text-amber-800">ما قدر الذكاء الاصطناعي يقرأ الملف هلأ، فاعتمدنا قراءتنا العادية. راجع الأعمدة تحت.</p>
      )}

      <ul className="space-y-1.5">
        {cols.map((i) => (
          <li key={i} className="flex items-center gap-2">
            <span className="flex-1 min-w-0 truncate text-slate-600" title={header[i] || sample(i)}>
              {header[i]?.trim() ? <b className="text-slate-800">{header[i]}</b> : <span>عمود فيه «{sample(i)}»</span>}
            </span>
            <select
              aria-label={`محتوى العمود ${i + 1}`}
              value={map.roles[i]}
              onChange={(e) => setRole(i, e.target.value as ColumnRole)}
              className={`w-40 shrink-0 p-1.5 border rounded-lg bg-white ${map.roles[i] === 'ignore' ? 'border-slate-200 text-slate-400' : 'border-slate-300 text-slate-800'}`}
            >
              {COLUMN_ROLES.map((r) => (
                <option key={r.role} value={r.role}>{r.label}</option>
              ))}
            </select>
          </li>
        ))}
      </ul>

      {students.length > 0 ? (
        <>
          <p className="font-bold text-slate-800 pt-1">أول الطلاب مثل ما رح ينحفظوا ({students.length} طالب):</p>
          <ul className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
            {students.slice(0, 4).map((s, k) => (
              <li key={k} className="p-2 flex items-center justify-between gap-2">
                <span className="min-w-0">
                  <span className="block font-bold text-slate-800 truncate">{s.name}</span>
                  {s.classLabel && <span className="block text-[11px] text-slate-500 truncate">{s.classLabel}</span>}
                </span>
                <span dir="ltr" className="text-slate-500 shrink-0">{s.parentPhone || s.studentPhone || 'بدون رقم'}</span>
              </li>
            ))}
          </ul>
          {(noPhone > 0 || noClass > 0) && (
            <p className="text-[11px] text-amber-800 leading-relaxed">
              {noPhone > 0 && `${noPhone} طالب بدون رقم جوال. `}
              {noClass > 0 && `${noClass} طالب بدون صف.`}
            </p>
          )}
        </>
      ) : (
        <p className="text-amber-800 font-bold">ما لقينا أسماء طلاب. اختر أي عمود فيه «اسم الطالب».</p>
      )}
    </div>
  );
}
