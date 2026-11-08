import React, { useState } from 'react';
import { ScreenId } from '../../types';
import { MOCK_EXAMS, MOCK_STUDENTS } from '../../mockData';
import {
  Camera,
  Upload,
  AlertTriangle,
  CheckCircle2,
  Send,
  MessageCircle,
  FileCheck2,
  Sparkles,
  QrCode,
  WifiOff,
  Clock,
  ArrowRight
} from 'lucide-react';

interface UploadPapersPageProps {
  onNavigate: (screen: ScreenId) => void;
}

interface ScannedSheet {
  id: string;
  studentName: string;
  studentCode: string;
  isUnclear?: boolean;
  status: 'recognized' | 'warning';
}

export const UploadPapersPage: React.FC<UploadPapersPageProps> = ({ onNavigate }) => {
  const [selectedExamId, setSelectedExamId] = useState<string>('ex1');
  const [activeTab, setActiveTab] = useState<'scanned' | 'student_submissions'>('scanned');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(100);

  const [sheets, setSheets] = useState<ScannedSheet[]>([
    { id: 'sh1', studentName: 'أحمد محمود المصري', studentCode: '1042', status: 'recognized' },
    { id: 'sh2', studentName: 'محمود خليل البطش', studentCode: '1043', status: 'recognized' },
    { id: 'sh3', studentName: 'سارة عبد الرحمن البردويل', studentCode: '2011', status: 'recognized' },
    { id: 'sh4', studentName: 'ورقة غير واضحة (الرمز مائل)', studentCode: '????', isUnclear: true, status: 'warning' },
    { id: 'sh5', studentName: 'مريم إياد النجار', studentCode: '2012', status: 'recognized' },
    { id: 'sh6', studentName: 'يوسف هاني اليازجي', studentCode: '4019', status: 'recognized' },
  ]);

  const selectedExam = MOCK_EXAMS.find(e => e.id === selectedExamId) || MOCK_EXAMS[0];

  const handleCapture = () => {
    setIsUploading(true);
    setUploadProgress(40);
    setTimeout(() => {
      setUploadProgress(100);
      setIsUploading(false);
      setSheets(prev => [
        ...prev,
        {
          id: `sh${Date.now()}`,
          studentName: 'رزان كمال الدلو',
          studentCode: '1044',
          status: 'recognized'
        }
      ]);
    }, 1000);
  };

  return (
    <div className="space-y-6 text-right max-w-4xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-extrabold text-[#1E3A5F]">رفع وتصوير أوراق الإجابة</h1>
          <p className="text-xs text-slate-500">
            صوّر رزمة أوراق طلابك بالكاميرا أو استقبل حلولهم برابط مباشر مع التعرف التلقائي بـ QR.
          </p>
        </div>

        <button
          onClick={() => onNavigate('B8')}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-2 self-start sm:self-auto"
        >
          <Sparkles className="w-4 h-4" />
          <span>ابدأ التصحيح بالذكاء الاصطناعي ←</span>
        </button>
      </div>

      {/* Select Exam Dropdown */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-700 shrink-0">اختر الامتحان المستهدف:</span>
          <select
            value={selectedExamId}
            onChange={(e) => setSelectedExamId(e.target.value)}
            className="p-2 bg-[#F7F8FA] border border-slate-300 rounded-lg font-bold text-slate-900"
          >
            {MOCK_EXAMS.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.title} ({ex.group})
              </option>
            ))}
          </select>
        </div>

        <div className="text-slate-500 font-mono text-xs tabular-nums">
          الأوراق المرفوعة حتى الآن: <strong>{sheets.length}</strong> ورقة
        </div>
      </div>

      {/* 2 Big Action Buttons (Camera & Upload) - PDF requirement */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={handleCapture}
          className="bg-[#1E3A5F] hover:bg-[#152a45] text-white p-6 rounded-2xl flex flex-col items-center justify-center gap-2.5 shadow-sm transition-all active:scale-98 cursor-pointer"
        >
          <Camera className="w-8 h-8 text-emerald-400" />
          <span className="text-base font-extrabold">صوّر بالكاميرا (مسح مستمر)</span>
          <span className="text-[11px] text-blue-200">
            التقط صور أوراق الرزمة واحدة تلو الأخرى مع قراءة تلقائية لكود QR
          </span>
        </button>

        <button
          onClick={handleCapture}
          className="bg-white hover:bg-slate-50 border-2 border-dashed border-slate-300 text-slate-800 p-6 rounded-2xl flex flex-col items-center justify-center gap-2.5 shadow-2xs transition-all active:scale-98 cursor-pointer"
        >
          <Upload className="w-8 h-8 text-blue-600" />
          <span className="text-base font-extrabold">ارفع ملفات (صور أو PDF)</span>
          <span className="text-[11px] text-slate-500">
            ارفع ملف PDF مجمّع أو ملفات صور ممسوحة بالماسح الضوئي
          </span>
        </button>
      </div>

      {/* Progress & Offline Resilience Banner (PDF requirement) */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-2 text-xs">
        <div className="flex items-center justify-between text-blue-900 font-bold">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>نظام الحفظ دون اتصال فعال: «إذا انقطع الإنترنت، تُحفظ الأوراق وتُرفع تلقائياً لاحقاً».</span>
          </div>
          <span className="font-mono tabular-nums">{uploadProgress}%</span>
        </div>
        <div className="w-full bg-blue-200 h-1.5 rounded-full overflow-hidden">
          <div className="bg-[#1E3A5F] h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
        </div>
      </div>

      {/* Tabs: Scanned Grid vs Received from Students (PDF requirement) */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-xs">
          <button
            onClick={() => setActiveTab('scanned')}
            className={`px-4 py-2 rounded-lg font-bold transition-colors cursor-pointer ${
              activeTab === 'scanned' ? 'bg-[#1E3A5F] text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            الأوراق الممسوحة ضوئياً ({sheets.length})
          </button>
          <button
            onClick={() => setActiveTab('student_submissions')}
            className={`px-4 py-2 rounded-lg font-bold transition-colors cursor-pointer ${
              activeTab === 'student_submissions' ? 'bg-[#1E3A5F] text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            وصلت من الطلاب (حالة التسليم عبر واتساب)
          </button>
        </div>

        {activeTab === 'scanned' ? (
          /* Scanned Thumbnails Grid (PDF requirement: شبكة صور مصغرة مع اسم الطالب المحسوب من الرمز وتحذير لغير الواضح) */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {sheets.map((sh, idx) => (
              <div
                key={sh.id}
                className={`bg-white border rounded-xl p-3 space-y-2 relative shadow-2xs overflow-hidden ${
                  sh.isUnclear ? 'border-amber-400 bg-amber-50/30' : 'border-slate-200'
                }`}
              >
                {/* Paper thumbnail simulation */}
                <div className="h-28 bg-[#FAF9F6] border border-slate-200 rounded-lg p-2 font-mono text-[9px] text-slate-500 overflow-hidden relative">
                  <div className="flex justify-between border-b border-slate-200 pb-1 font-bold text-slate-700">
                    <span>QR: {sh.studentCode}</span>
                    <span># {idx + 1}</span>
                  </div>
                  <div className="pt-1.5 opacity-60 leading-tight">
                    2س + 2ص ص' = 0 <br />
                    ص' = -س / ص <br />
                    ص'' = (-ص - س ص') / ص²
                  </div>

                  {sh.isUnclear ? (
                    <div className="absolute inset-0 bg-amber-500/20 backdrop-blur-[0.5px] flex items-center justify-center">
                      <span className="bg-amber-600 text-white font-sans text-[10px] font-bold px-2 py-0.5 rounded shadow-xs flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        صورة غير واضحة
                      </span>
                    </div>
                  ) : (
                    <span className="absolute bottom-1 right-1 bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.2 rounded">
                      ✓ رمز متعرف عليه
                    </span>
                  )}
                </div>

                {/* Student Name */}
                <div className="text-right">
                  <h4 className="font-bold text-xs text-slate-900 truncate">{sh.studentName}</h4>
                  <span className="text-[10px] text-slate-400 font-mono">رمز الطالب: {sh.studentCode}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Tab: وصل من الطلاب / لم يسلم بعد + ذكّر من لم يسلم على واتساب (PDF requirement) */
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">متابعة تسليم الطلاب عبر الرابط</h3>
                <p className="text-xs text-slate-500">سلّم 46 طالباً · لم يسلّم 2 من طلاب المجموعة حتى الآن</p>
              </div>

              {/* Remind non-submitters via WhatsApp button */}
              <button
                onClick={() => alert('تم إرسال رسالة تذكيرية بنقرة واحدة عبر واتساب لجميع الطلاب المتأخرين وأولياء أمورهم!')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>ذكّر من لم يسلّم على واتساب (طالبان)</span>
              </button>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              <div className="py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="font-bold text-slate-800">أحمد محمود المصري</span>
                  <span className="text-slate-400 font-mono text-[11px]">(رمز 1042)</span>
                </div>
                <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                  تم التسليم (3 صفحات)
                </span>
              </div>

              <div className="py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="font-bold text-slate-800">محمود خليل البطش</span>
                  <span className="text-slate-400 font-mono text-[11px]">(رمز 1043)</span>
                </div>
                <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                  تم التسليم (صفحتان)
                </span>
              </div>

              <div className="py-2.5 flex items-center justify-between bg-red-50/50 px-2 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  <span className="font-bold text-red-900">عمر شريف قاسم</span>
                  <span className="text-slate-500 font-mono text-[11px]">(هاتف ولي الأمر: 0599556677)</span>
                </div>
                <span className="text-red-700 font-bold bg-red-100 px-2 py-0.5 rounded text-[11px]">
                  لم يسلّم بعد
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
