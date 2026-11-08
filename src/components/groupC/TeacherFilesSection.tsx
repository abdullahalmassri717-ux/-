import React, { useState } from 'react';
import { 
  FileText, 
  Upload, 
  Trash2, 
  Eye, 
  Sparkles, 
  BookOpen, 
  CheckCircle2, 
  Plus, 
  FileCode,
  Tag
} from 'lucide-react';
import { MOCK_TEACHER_FILES, CURRICULA_DATA } from '../../mockData';
import { TeacherFile } from '../../types';
import { notify } from '../../lib/notify';

interface TeacherFilesSectionProps {
  onOpenExamGenWithFiles?: (fileIds: string[]) => void;
}

export const TeacherFilesSection: React.FC<TeacherFilesSectionProps> = ({ 
  onOpenExamGenWithFiles 
}) => {
  const [files, setFiles] = useState<TeacherFile[]>(MOCK_TEACHER_FILES);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [filterLesson, setFilterLesson] = useState<string>('all');

  // Upload modal form state
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<'summary' | 'worksheet' | 'notes' | 'exam'>('summary');
  const [selectedCurriculumId, setSelectedCurriculumId] = useState('curr_ps');
  const [selectedGradeId, setSelectedGradeId] = useState('g_12_sci');
  const [selectedSubjectId, setSelectedSubjectId] = useState('s_math_12');
  const [selectedLessonId, setSelectedLessonId] = useState('l_1_1');

  // Available lessons from chosen subject
  const currentSubject = CURRICULA_DATA.find(c => c.id === selectedCurriculumId)
    ?.grades.find(g => g.id === selectedGradeId)
    ?.subjects.find(s => s.id === selectedSubjectId);

  const allAvailableLessons = currentSubject?.units.flatMap(u => u.lessons) || [];

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      notify('يرجى إدخال عنوان الملف');
      return;
    }

    const matchedLesson = allAvailableLessons.find(l => l.id === selectedLessonId);

    const newFile: TeacherFile = {
      id: `tf_${Date.now()}`,
      title: newTitle,
      type: newType,
      fileType: 'pdf',
      fileSize: '1.4 ميغابايت',
      uploadDate: 'اليوم',
      curriculumId: selectedCurriculumId,
      gradeId: selectedGradeId,
      subjectId: selectedSubjectId,
      lessonId: selectedLessonId,
      lessonName: matchedLesson?.title || 'درس محدد بالمنهاج',
    };

    setFiles([newFile, ...files]);
    setShowUploadModal(false);
    setNewTitle('');
    notify('تم رفع الملف وربطه بالدرس بنجاح! سيتم اعتماده كمرجع عند توليد الأسئلة.');
  };

  const handleDelete = (id: string) => {
    setFiles(files.filter(f => f.id !== id));
  };

  const filteredFiles = files.filter(f => {
    if (filterLesson === 'all') return true;
    return f.lessonId === filterLesson;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs bg-indigo-50 text-indigo-700 font-bold px-2.5 py-0.5 rounded-full border border-indigo-100">
              الأدوات الذكية المرجعية
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-[#1E3A5F]" />
            ملفاتي التعليمية (مراجع الذكاء الاصطناعي)
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            ارفع ملخصاتك، أوراق عملك، وأسئلتك الخاصة واربطها بدروس المنهاج. عند توليد أسئلة جديدة، يعتمد الذكاء الاصطناعي على أسلوبك وصيغك وأمثلتك الخاصة دون خروج عن المنهاج.
          </p>
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="bg-[#1E3A5F] hover:bg-[#152a45] text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm transition-colors cursor-pointer self-start md:self-auto"
        >
          <Upload className="w-4 h-4" />
          <span>رفع ملف جديد وربطه بدرس</span>
        </button>
      </div>

      {/* Filter by lesson */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        <button
          onClick={() => setFilterLesson('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
            filterLesson === 'all'
              ? 'bg-[#1E3A5F] text-white'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          جميع الملفات ({files.length})
        </button>

        {Array.from(new Set(files.map(f => f.lessonName))).map((lName, idx) => {
          const sampleFile = files.find(f => f.lessonName === lName);
          const lid = sampleFile?.lessonId || '';
          return (
            <button
              key={idx}
              onClick={() => setFilterLesson(lid)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                filterLesson === lid
                  ? 'bg-[#1E3A5F] text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {lName}
            </button>
          );
        })}
      </div>

      {/* Files Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredFiles.map((file) => {
          const fileTypeKey = (file.type || 'summary') as 'summary' | 'worksheet' | 'notes' | 'exam';
          const typeBadge = {
            summary: { label: 'ملخص شامل', color: 'bg-blue-50 text-blue-700 border-blue-200' },
            worksheet: { label: 'ورقة عمل', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
            notes: { label: 'ملاحظات تدريس', color: 'bg-amber-50 text-amber-700 border-amber-200' },
            exam: { label: 'نماذج اختبار', color: 'bg-purple-50 text-purple-700 border-purple-200' },
          }[fileTypeKey] || { label: 'ملف تعليمي', color: 'bg-slate-50 text-slate-700 border-slate-200' };

          return (
            <div 
              key={file.id} 
              className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${typeBadge.color}`}>
                    {typeBadge.label}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">{file.fileSize || file.size || '1.2 ميغابايت'}</span>
                </div>

                <h3 className="font-bold text-slate-900 text-sm mb-2 leading-snug">
                  {file.title}
                </h3>

                <div className="space-y-1 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5 text-[#1E3A5F] font-semibold">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>مرتبط بـ: {file.lessonName}</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    رُفع بتاريخ: {file.uploadDate} · صيغة {file.fileType.toUpperCase()}
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => notify(`معاينة الملف: ${file.title}`)}
                    className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                    title="معاينة"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(file.id)}
                    className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                    title="حذف الملف"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <button
                  onClick={() => {
                    if (onOpenExamGenWithFiles) {
                      onOpenExamGenWithFiles([file.id]);
                    } else {
                      notify(`تم اختيار "${file.title}" كمرجع مباشر لتوليد الامتحان.`);
                    }
                  }}
                  className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>توليد بالاعتماد عليه</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 text-right space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-[#1E3A5F] flex items-center gap-2">
                <Upload className="w-5 h-5" />
                <span>رفع ملف تعليمي وربطه بالمنهاج</span>
              </h3>
            </div>

            <form onSubmit={handleUpload} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">عنوان الملف أو المرجع</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="مثال: ملخص قواعد الاشتقاق وأسئلة إثرائية للأستاذ محمد"
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">نوع المرجع</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'summary', label: 'ملخص' },
                    { id: 'worksheet', label: 'ورقة عمل' },
                    { id: 'notes', label: 'ملاحظات' },
                    { id: 'exam', label: 'امتحان سابق' },
                  ].map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setNewType(t.id as any)}
                      className={`p-2 rounded-lg font-bold text-center border transition-all ${
                        newType === t.id
                          ? 'bg-[#1E3A5F] text-white border-[#1E3A5F]'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Linked Curriculum / Subject / Lesson */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-3">
                <span className="font-bold text-slate-800 block text-xs">ربط الملف بالدرس المحدد:</span>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-600 text-[11px] mb-1">المنهاج</label>
                    <select
                      value={selectedCurriculumId}
                      onChange={(e) => setSelectedCurriculumId(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white text-slate-800"
                    >
                      {CURRICULA_DATA.filter(c => c.isAvailable).map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-600 text-[11px] mb-1">الصف والمادة</label>
                    <select
                      value={selectedSubjectId}
                      onChange={(e) => setSelectedSubjectId(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white text-slate-800"
                    >
                      {currentSubject && (
                        <option value={currentSubject.id}>{currentSubject.name}</option>
                      )}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 text-[11px] mb-1">الدرس المستهدف</label>
                  <select
                    value={selectedLessonId}
                    onChange={(e) => setSelectedLessonId(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white text-slate-800 font-bold"
                  >
                    {allAvailableLessons.map(l => (
                      <option key={l.id} value={l.id}>{l.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* File Dropzone */}
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-5 text-center space-y-2 bg-slate-50 hover:bg-slate-100/60 transition-colors cursor-pointer">
                <FileCode className="w-8 h-8 text-slate-400 mx-auto" />
                <div className="text-xs font-bold text-slate-700">اضغط لاختيار ملف PDF أو صور أوراق العمل</div>
                <div className="text-[11px] text-slate-400">يدعم صيغ PDF، PNG، JPG حتى حجم 25MB</div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <button
                  type="submit"
                  className="flex-1 bg-[#1E3A5F] hover:bg-[#152a45] text-white py-2.5 rounded-xl font-bold text-xs transition-colors shadow-sm"
                >
                  رفع الملف واعتماده
                </button>
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 px-4 rounded-xl font-medium text-xs transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
