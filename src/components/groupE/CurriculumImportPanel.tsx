import React, { useState } from 'react';
import { Download, FileSpreadsheet, Loader2, Upload, X } from 'lucide-react';
import type { CCurriculum, CurriculumAdminApi } from '../../data/curriculumAdmin';
import {
  IMPORT_COLUMNS,
  IMPORT_TEMPLATE_URL,
  applyImport,
  parseImportRows,
  rowsFromFile,
  rowsFromText,
  type ImportSummary,
  type ParsedImport,
} from '../../data/curriculumImport';
import { notify } from '../../lib/notify';

const errText = (e: unknown, fallback: string) => (e instanceof Error && /[؀-ۿ]/.test(e.message) ? e.message : fallback);

const SummaryLine: React.FC<{ s: ImportSummary }> = ({ s }) => (
  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
    {[
      ['صفوف', s.grades],
      ['مواد', s.subjects],
      ['وحدات', s.units],
      ['دروس', s.lessons],
      ['نواتج تعلّم', s.outcomes],
      ['موجود مسبقاً', s.existing],
    ].map(([label, n], i) => (
      <div key={label} className={`rounded-xl p-2 border ${i === 5 ? 'bg-slate-50 border-slate-200 text-slate-500' : 'bg-blue-50 border-blue-200 text-[#1E3A5F]'}`}>
        <div className="text-lg font-black tabular-nums">{n}</div>
        <div className="text-[10px] font-bold">{label}</div>
      </div>
    ))}
  </div>
);

/** Import many grades / subjects / units / lessons at once from Excel or CSV. */
export const CurriculumImportPanel: React.FC<{
  curriculum: CCurriculum;
  api: CurriculumAdminApi;
  onClose: () => void;
  onImported: () => Promise<void>;
}> = ({ curriculum, api, onClose, onImported }) => {
  const [pasted, setPasted] = useState('');
  const [fileName, setFileName] = useState('');
  const [parsed, setParsed] = useState<ParsedImport | null>(null);
  const [preview, setPreview] = useState<ImportSummary | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const showPreview = async (rows: string[][]) => {
    setError(null);
    const p = parseImportRows(rows);
    if (!p.grades.size) {
      setParsed(null);
      setPreview(null);
      setError(p.problems[0] ?? 'لم نجد أي بيانات. تأكد أن الأعمدة بالترتيب: ' + IMPORT_COLUMNS.join('، ') + '.');
      return;
    }
    setParsed(p);
    setPreview(await applyImport(p, curriculum, null));
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setFileName(file.name);
    try {
      await showPreview(await rowsFromFile(file));
    } catch (e) {
      setError(errText(e, 'تعذّرت قراءة الملف. احفظه بصيغة ‎.xlsx‎ أو CSV وجرّب مرة ثانية.'));
    }
  };

  const save = async () => {
    if (!parsed) return;
    setProgress({ done: 0, total: 1 });
    try {
      const s = await applyImport(parsed, curriculum, api, (done, total) => setProgress({ done, total }));
      await onImported();
      notify(`تمت الإضافة: ${s.grades} صف، ${s.subjects} مادة، ${s.units} وحدة، ${s.lessons} درس، ${s.outcomes} ناتج تعلّم.`);
      onClose();
    } catch (e) {
      // Whatever was saved before the error stays; importing the same file again adds only the rest.
      await onImported();
      setError(errText(e, 'تعذّر إكمال الحفظ.') + ' ما حُفظ قبل الخطأ بقي محفوظاً، وإعادة استيراد نفس الملف تضيف الباقي فقط.');
    } finally {
      setProgress(null);
    }
  };

  const nothingNew = preview && preview.grades + preview.subjects + preview.units + preview.lessons + preview.outcomes === 0;

  return (
    <div className="bg-white border-2 border-blue-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4 text-xs">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <h3 className="font-extrabold text-[#1E3A5F] text-sm flex items-center gap-1.5">
            <FileSpreadsheet className="w-4 h-4" /> استيراد إلى منهج «{curriculum.name}»
          </h3>
          <p className="text-slate-500 leading-relaxed">
            سطر لكل درس أو لكل ناتج تعلّم. الأعمدة بالترتيب: <b>{IMPORT_COLUMNS.join(' | ')}</b>. آخر عمودين اختياريان.
            الخانة الفارغة تأخذ قيمة السطر الذي فوقها، فاكتب اسم الصف والمادة مرة واحدة فقط. الموجود مسبقاً لا يتكرر.
          </p>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-700 shrink-0" title="إغلاق">
          <X className="w-4 h-4" />
        </button>
      </div>

      <a
        href={IMPORT_TEMPLATE_URL}
        download="نموذج-المنهج.csv"
        className="inline-flex items-center gap-1.5 text-blue-700 font-bold border border-blue-200 bg-blue-50 rounded-lg px-3 py-1.5"
      >
        <Download className="w-3.5 h-3.5" /> تحميل النموذج (يفتح في Excel)
      </a>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="border-2 border-dashed border-slate-300 rounded-xl p-4 flex flex-col items-center justify-center gap-1.5 text-center cursor-pointer hover:bg-slate-50">
          <Upload className="w-5 h-5 text-slate-500" />
          <span className="font-bold text-slate-700">{fileName || 'اختر ملف Excel أو CSV'}</span>
          <span className="text-[10px] text-slate-400">‎.xlsx‎ أو ‎.csv‎</span>
          <input type="file" accept=".xlsx,.csv,text/csv" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        </label>
        <div className="space-y-1.5">
          <textarea
            rows={4}
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            placeholder="أو انسخ الخلايا من Excel والصقها هنا"
            className="w-full p-2 border border-slate-300 rounded-xl"
          />
          <button
            disabled={!pasted.trim()}
            onClick={() => (setFileName(''), showPreview(rowsFromText(pasted)))}
            className="bg-slate-100 border border-slate-300 text-slate-800 px-3 py-1.5 rounded-lg font-bold disabled:opacity-50"
          >
            معاينة الملصوق
          </button>
        </div>
      </div>

      {error && <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-900">{error}</div>}

      {parsed && preview && (
        <div className="space-y-3 border-t border-slate-100 pt-3">
          <div className="font-bold text-slate-700">
            قرأنا {parsed.rows} سطراً. هذا ما سيُضاف:
          </div>
          <SummaryLine s={preview} />
          {parsed.problems.length > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 space-y-1">
              <div className="font-bold">أسطر لن تُضاف ({parsed.problems.length}):</div>
              {parsed.problems.slice(0, 8).map((p) => (
                <div key={p}>{p}</div>
              ))}
              {parsed.problems.length > 8 && <div>…</div>}
            </div>
          )}
          <p className="text-slate-500">المواد الجديدة تُحفظ «مسودة». انشرها بعد مراجعتها ليراها المعلمون.</p>
          <button
            disabled={!!progress || !!nothingNew}
            onClick={save}
            className="bg-[#1E3A5F] text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 disabled:opacity-50"
          >
            {progress ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> جارٍ الحفظ… {Math.min(100, Math.round((progress.done / Math.max(progress.total, 1)) * 100))}%
              </>
            ) : nothingNew ? (
              'كل ما في الملف موجود مسبقاً'
            ) : (
              'حفظ في المنهج'
            )}
          </button>
        </div>
      )}
    </div>
  );
};
