import React, { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { ScreenId } from '../../types';
import {
  Printer,
  QrCode,
  ArrowRight,
} from 'lucide-react';
import { notify } from '../../lib/notify';
import { useLoad } from '../../data/DataContext';
import { useSelected } from '../../data/selection';
import type { AssessmentDetail, StudentRow } from '../../data/types';

interface PrintAnswerSheetsPageProps {
  onNavigate: (screen: ScreenId) => void;
}

const ORDINALS = ['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس', 'السابع', 'الثامن', 'التاسع', 'العاشر'];

/** One printable A4 answer sheet for one student. */
const AnswerSheet: React.FC<{ exam: AssessmentDetail; student: StudentRow; qr: string; className?: string }> = ({ exam, student, qr, className = '' }) => (
  <div className={`bg-white border-2 border-slate-300 shadow-xl rounded-xl p-6 sm:p-8 max-w-2xl mx-auto space-y-5 text-right font-sans relative ${className}`}>
    <div className="flex items-start justify-between gap-3 border-b-2 border-slate-900 pb-4">
      <div className="space-y-1 min-w-0">
        <span className="font-black text-lg text-slate-900 block">{exam.title}</span>
        <p className="text-xs text-slate-600 font-bold">
          {exam.subject && <>المادة: <strong>{exam.subject}</strong> · </>}المجموعة: <strong>{exam.group}</strong>
        </p>
        <div className="text-xs text-slate-800 flex flex-wrap gap-x-3 pt-1">
          <span>الطالب: <strong className="text-sm text-[#1E3A5F]">{student.name}</strong></span>
        </div>
      </div>
      <div className="border-2 border-slate-900 p-1.5 rounded-lg bg-white text-center shrink-0">
        {qr ? <img src={qr} alt="رمز QR" className="w-20 h-20" /> : <div className="w-20 h-20" />}
        <span className="text-base font-black font-mono text-slate-900 block tabular-nums tracking-widest" dir="ltr">
          {student.studentCode}
        </span>
        <span className="text-[9px] text-slate-500 block">رمز الطالب</span>
      </div>
    </div>

    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-600 space-y-0.5">
      <strong className="block text-slate-800">تعليمات:</strong>
      <span>1. أجب داخل المربع المخصص لكل سؤال. 2. اكتب بقلم أزرق أو أسود بخط واضح. 3. لا تكتب فوق رمز QR ولا تطوِه.</span>
    </div>

    {exam.questions.map((q, i) => (
      <div key={q.id} className="border border-slate-300 rounded-lg p-3 space-y-2 break-inside-avoid">
        <div className="flex items-center justify-between gap-2 text-xs font-bold text-slate-800 border-b border-slate-200 pb-1.5">
          <span className="min-w-0 break-words">إجابة السؤال {ORDINALS[i] ?? i + 1}{q.lesson ? ` (${q.lesson})` : ''}</span>
          <span className="font-mono text-slate-500 tabular-nums shrink-0">[ {q.maxScore} ]</span>
        </div>
        <div className={`${q.type === 'multiple_choice' ? 'h-14' : q.type === 'short_answer' ? 'h-24' : 'h-44'} border border-dashed border-slate-200 rounded`} />
      </div>
    ))}

    <div className="border-t border-slate-200 pt-3 flex items-center justify-between text-[10px] text-slate-400 font-mono">
      <span>دقة</span>
      <span dir="ltr">{exam.submissionCode} · {student.studentCode}</span>
    </div>
  </div>
);

export const PrintAnswerSheetsPage: React.FC<PrintAnswerSheetsPageProps> = ({ onNavigate }) => {
  const [savedExamId, setSavedExamId] = useSelected('exam');
  const examsQ = useLoad((st) => st.listAssessments());
  const exams = examsQ.data ?? [];
  const examId = exams.some((e) => e.id === savedExamId) ? savedExamId! : exams[0]?.id ?? '';
  const examQ = useLoad((st) => (examId ? st.getAssessment(examId) : Promise.resolve(null)), [examId]);
  const studentsQ = useLoad((st) => st.listStudents());
  const exam = examQ.data;
  const students = useMemo(
    () => (studentsQ.data ?? []).filter((s) => s.groupId === exam?.groupId),
    [studentsQ.data, exam?.groupId],
  );
  const [selectedId, setSelectedId] = useState('');
  const selectedStudent = students.find((s) => s.id === selectedId) ?? students[0];
  const [qrs, setQrs] = useState<Record<string, string>>({});

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

  const printAll = () => {
    if (!students.length) return notify('لا يوجد طلاب في مجموعة هذا الامتحان', 'warning');
    window.print();
  };

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
          <h1 className="text-xl font-extrabold text-[#1E3A5F]">
            طباعة أوراق الإجابة مع رموز QR الذكية
          </h1>
          <p className="text-xs text-slate-500">
            توليد أوراق إجابة قياسية A4 لكل طالب، يقرؤها الذكاء الاصطناعي ويميز صاحبها والأسئلة فورياً.
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

      {/* Note about QR code (PDF requirement) */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-950 flex items-center gap-3">
        <QrCode className="w-6 h-6 text-[#1E3A5F] shrink-0" />
        <div>
          <strong className="block">ملاحظة تقنية حول رمز QR المطبوع:</strong>
          <span>
            رمز الطالب (4 أرقام) مطبوع بخط كبير بجانب رمز QR، فيتعرّف التصحيح على صاحب الورقة تلقائياً. لحفظ ملف PDF اختر «حفظ كـ PDF» من نافذة الطباعة.
          </span>
        </div>
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
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">هذا الامتحان بلا أسئلة بعد، لذلك الورقة بلا مربعات إجابة.</p>
      )}
      {!students.length && exam && <p className="text-xs text-slate-500 text-center">لا يوجد طلاب في مجموعة هذا الامتحان بعد.</p>}

      {exam && selectedStudent && <AnswerSheet exam={exam} student={selectedStudent} qr={qrs[selectedStudent.id] ?? ''} />}

      {/* Every student's sheet, shown only when printing */}
      {exam && (
        <div className="print-area print-only">
          {students.map((st) => (
            <AnswerSheet key={st.id} exam={exam} student={st} qr={qrs[st.id] ?? ''} className="print-sheet" />
          ))}
        </div>
      )}
    </div>
  );
};
