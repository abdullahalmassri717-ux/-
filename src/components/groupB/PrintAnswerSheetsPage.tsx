import React, { useState } from 'react';
import { ScreenId } from '../../types';
import { MOCK_STUDENTS, CURRENT_TEACHER } from '../../mockData';
import {
  Printer,
  Download,
  QrCode,
  ArrowRight,
  CheckCircle2,
  FileText,
  Users
} from 'lucide-react';

interface PrintAnswerSheetsPageProps {
  onNavigate: (screen: ScreenId) => void;
}

export const PrintAnswerSheetsPage: React.FC<PrintAnswerSheetsPageProps> = ({ onNavigate }) => {
  const [selectedStudent, setSelectedStudent] = useState(MOCK_STUDENTS[0]);

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

        <div className="flex items-center gap-2">
          <button
            onClick={() => alert('تم تجهيز ملف PDF جاهز للطباعة لـ 52 طالباً في المجموعة!')}
            className="bg-[#1E3A5F] hover:bg-[#152a45] text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 shadow-2xs"
          >
            <Download className="w-4 h-4" />
            <span>تحميل PDF لكل الطلاب (52 ورقة)</span>
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
            «الرمز يعرّف صاحب الورقة ورقم السؤال تلقائياً بدقة 100% دون الحاجة لقراءة اسم الطالب يدوياً».
          </span>
        </div>
      </div>

      {/* Sheet Student Selector */}
      <div className="flex items-center gap-2 text-xs">
        <span className="font-bold text-slate-700">معاينة ورقة الطالب:</span>
        <select
          value={selectedStudent.id}
          onChange={(e) => {
            const found = MOCK_STUDENTS.find(s => s.id === e.target.value);
            if (found) setSelectedStudent(found);
          }}
          className="p-2 bg-white border border-slate-300 rounded-lg text-xs font-medium"
        >
          {MOCK_STUDENTS.map((st) => (
            <option key={st.id} value={st.id}>
              {st.name} (رمز: {st.studentCode})
            </option>
          ))}
        </select>
      </div>

      {/* Realistic A4 Paper Sheet Preview Container */}
      <div className="bg-white border-2 border-slate-300 shadow-xl rounded-xl p-8 max-w-2xl mx-auto space-y-6 min-h-[700px] text-right font-sans relative">
        {/* Paper Header with QR Code & Student Name */}
        <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-black text-lg text-slate-900">منصة دِقّـة · ورقة إجابة رسمية</span>
              <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded font-mono">
                A4-STANDARD
              </span>
            </div>
            <p className="text-xs text-slate-600 font-bold">
              امتحان مبحث: <strong>الرياضيات (علمي)</strong> · المعلم: <strong>{CURRENT_TEACHER.name}</strong>
            </p>
            <div className="text-xs text-slate-800 space-x-3 rtl:space-x-reverse pt-1">
              <span>الطالب: <strong className="text-sm text-[#1E3A5F]">{selectedStudent.name}</strong></span>
              <span>المجموعة: <strong>{selectedStudent.group.split('(')[0]}</strong></span>
              <span>الرمز: <strong className="font-mono text-sm tabular-nums">{selectedStudent.studentCode}</strong></span>
            </div>
          </div>

          {/* QR Code Graphic Box */}
          <div className="border-2 border-slate-900 p-2 rounded-lg bg-white text-center space-y-1 shrink-0">
            <div className="w-16 h-16 bg-slate-900 text-white flex flex-col items-center justify-center font-mono text-[8px] tracking-widest p-1">
              <div className="grid grid-cols-4 gap-0.5 w-full h-full">
                {Array.from({ length: 16 }).map((_, i) => (
                  <div key={i} className={`${i % 2 === 0 ? 'bg-white' : 'bg-transparent'}`} />
                ))}
              </div>
            </div>
            <span className="text-[9px] font-mono text-slate-800 block tabular-nums">
              ID: {selectedStudent.studentCode}
            </span>
          </div>
        </div>

        {/* Instructions for Student */}
        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-600 space-y-0.5">
          <strong className="block text-slate-800">تعليمات حل الورقة:</strong>
          <span>1. أجب داخل المربعات المخصصة لكل سؤال فقط. 2. اكتب بالقلم الجاف الأزرق أو الأسود بخط واضح. 3. لا تطوِ رمز QR الموجود بالأعلى.</span>
        </div>

        {/* Question Answer Box 1 */}
        <div className="border border-slate-300 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-800 border-b border-slate-200 pb-1.5">
            <span>إجابة السؤال الأول (الاشتقاق الضمني)</span>
            <span className="font-mono text-slate-500 tabular-nums">الدرجة المخصصة: [ 20 ]</span>
          </div>
          <div className="h-44 border border-dashed border-slate-200 rounded p-2 text-slate-300 text-xs flex items-center justify-center font-mono">
            [ مخصص لحل خطوات واشتقاق الطالب اليدوية ]
          </div>
        </div>

        {/* Question Answer Box 2 */}
        <div className="border border-slate-300 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-800 border-b border-slate-200 pb-1.5">
            <span>إجابة السؤال الثاني (مشتقات الاقترانات الأسية والمماس)</span>
            <span className="font-mono text-slate-500 tabular-nums">الدرجة المخصصة: [ 15 ]</span>
          </div>
          <div className="h-44 border border-dashed border-slate-200 rounded p-2 text-slate-300 text-xs flex items-center justify-center font-mono">
            [ مخصص لحل خطوات واشتقاق الطالب اليدوية ]
          </div>
        </div>

        <div className="border-t border-slate-200 pt-3 flex items-center justify-between text-[10px] text-slate-400 font-mono">
          <span>منصة دقة - فلسطين © 2026</span>
          <span>PAGE 1 OF 1 · EXAM_REF_2026_MATH</span>
        </div>
      </div>
    </div>
  );
};
