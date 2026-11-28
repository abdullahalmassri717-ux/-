import React, { useEffect, useState } from 'react';
import { ScreenId, UserRole, EntityType, Entity } from '../../types';
import {
  Check,
  ArrowRight,
  GraduationCap,
  Building2,
  Briefcase,
  Smartphone,
  Lock,
  User,
  School,
  BookOpen,
  Calendar,
  MessageCircle,
  Plus,
  Trash2,
  Sparkles,
  PhoneCall
} from 'lucide-react';
import { CURRICULA_DATA, PLATFORM_CONFIG } from '../../mockData';
import { curriculumAdminApi } from '../../data/curriculumAdmin';

type RegCurriculum = {
  id: string;
  name: string;
  country: string;
  grades: { id: string; name: string; subjects: { id: string; name: string; code?: string; status: 'draft' | 'published' }[] }[];
};
import { useAuth } from '../../lib/auth';
import { FinishSignupWithWhatsApp } from './FinishSignupWithWhatsApp';
import { adminApi, type AdminPlan } from '../../data/admin';
import { codeChannelWords, useCodeChannel, usePublicSetting } from '../../lib/settings';

interface RegisterPageProps {
  onNavigate: (screen: ScreenId) => void;
  onRoleChange: (role: UserRole) => void;
  onRegisterEntity?: (entity: Entity) => void;
  /** Real sign-in only: called after the organization was created in the database. */
  onOrganizationCreated?: (organizationId: string, kind: EntityType) => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({
  onNavigate,
  onRoleChange,
  onRegisterEntity,
  onOrganizationCreated,
}) => {
  const auth = useAuth();
  const isReal = auth.mode === 'real';
  // Account Type
  const [entityType, setEntityType] = useState<EntityType>('individual_teacher');
  // «/register?type=tutor»: a signed-in teacher (e.g. at a school) asks for their own
  // private-tutor page. It goes straight to the tutor form and waits for approval.
  const tutorRequest = isReal && auth.status === 'signed_in' && auth.entities.length > 0 &&
    new URLSearchParams(window.location.search).get('type') === 'tutor';
  const [step, setStep] = useState<number>(tutorRequest ? 2 : 1);

  // Prices, currency, trial length and the login-code channel come from the
  // platform admin's settings (same source as the pricing page), never from code.
  const words = codeChannelWords(useCodeChannel());
  const trial = usePublicSetting<{ days?: number }>('trial', { days: 30 });
  const currency = usePublicSetting<{ symbol?: string }>('currency', { symbol: PLATFORM_CONFIG.currencySymbol });
  const sym = currency.symbol ?? PLATFORM_CONFIG.currencySymbol;
  const [plans, setPlans] = useState<AdminPlan[]>([]);
  useEffect(() => {
    let alive = true;
    adminApi()
      .listPlans()
      .then((all) => alive && setPlans(all.filter((p) => p.isActive && p.isPublic)))
      .catch(() => alive && setPlans([]));
    return () => {
      alive = false;
    };
  }, []);
  const cheapest = (target: AdminPlan['target'][]) =>
    plans
      .filter((p) => target.includes(p.target) && p.pricePerStudent > 0)
      .sort((a, b) => a.pricePerStudent - b.pricePerStudent)[0];
  const priceText = (p?: AdminPlan) =>
    p
      ? `${p.pricePerStudent} ${sym} ${p.billingCycle === 'yearly' ? 'سنوياً' : 'شهرياً'} لكل ${p.pricingModel === 'per_paper' ? 'ورقة مصحّحة' : 'طالب'}`
      : '';
  const teacherPlan = cheapest(['teachers']);
  const schoolPlan = cheapest(['schools', 'enterprise']);
  const trialText = trial.days ? `تجربة مجانية ${trial.days} يوماً` : '';

  // Teacher Form State
  // The curriculum list is data: the real one comes from the database (available curricula only).
  const [curricula, setCurricula] = useState<RegCurriculum[]>(isReal ? [] : CURRICULA_DATA);
  const [selectedCurriculumId, setSelectedCurriculumId] = useState<string>(isReal ? '' : CURRICULA_DATA[0].id);
  const [selectedGradeIds, setSelectedGradeIds] = useState<string[]>(isReal ? [] : ['grade_12']);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>(isReal ? [] : ['math_scientific']);
  useEffect(() => {
    if (!isReal) return;
    curriculumAdminApi()
      .load()
      .then((all) => {
        const list = all.filter((c) => c.isAvailable);
        setCurricula(list);
        if (list[0]) {
          setSelectedCurriculumId(list[0].id);
          if (list[0].grades[0]) setSelectedGradeIds([list[0].grades[0].id]);
        }
      })
      .catch(() => setCurricula([]));
  }, [isReal]);
  // Demo mode keeps sample values so the prototype can be clicked through quickly.
  const [teacherName, setTeacherName] = useState(isReal ? auth.profile?.fullName ?? '' : 'أ. محمد المصري');
  const [teacherPhone, setTeacherPhone] = useState(isReal ? '' : '0599123456');

  // School / Center Form State
  const [orgName, setOrgName] = useState(isReal ? '' : 'مدرسة الأمل الخاصة');
  const [orgRegion, setOrgRegion] = useState(isReal ? '' : 'غزة - الرمال الجنوبي');
  const [studentEstimate, setStudentEstimate] = useState('280');
  const [teachersToInvite, setTeachersToInvite] = useState(
    isReal
      ? []
      : [
          { name: 'أ. أحمد حلس', phone: '0599110011', subject: 'الرياضيات' },
          { name: 'أ. ريم شملخ', phone: '0599220022', subject: 'اللغة الإنجليزية' },
        ]
  );
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherPhone, setNewTeacherPhone] = useState('');
  const [newTeacherSubject, setNewTeacherSubject] = useState('');

  // Active Curriculum Data
  const currentCurriculum: RegCurriculum = curricula.find((c) => c.id === selectedCurriculumId) ?? curricula[0] ?? { id: '', name: '', country: '', grades: [] };

  // Filter available grades in curriculum
  const availableGrades = currentCurriculum.grades;

  // Filter available subjects across selected grades (exclude draft subjects)
  const availableSubjects = availableGrades
    .filter((g) => selectedGradeIds.includes(g.id))
    .flatMap((g) => g.subjects)
    .filter((s) => s.status === 'published'); // DRAFT subjects do not show to teachers

  const handleToggleGrade = (gradeId: string) => {
    if (selectedGradeIds.includes(gradeId)) {
      if (selectedGradeIds.length > 1) {
        setSelectedGradeIds(selectedGradeIds.filter((id) => id !== gradeId));
      }
    } else {
      setSelectedGradeIds([...selectedGradeIds, gradeId]);
    }
  };

  const handleToggleSubject = (subjectId: string) => {
    if (selectedSubjectIds.includes(subjectId)) {
      if (selectedSubjectIds.length > 1) {
        setSelectedSubjectIds(selectedSubjectIds.filter((id) => id !== subjectId));
      }
    } else {
      setSelectedSubjectIds([...selectedSubjectIds, subjectId]);
    }
  };

  const handleAddTeacherToInvite = () => {
    if (newTeacherName && newTeacherPhone) {
      setTeachersToInvite([
        ...teachersToInvite,
        {
          name: newTeacherName,
          phone: newTeacherPhone,
          subject: newTeacherSubject || 'عام',
        },
      ]);
      setNewTeacherName('');
      setNewTeacherPhone('');
      setNewTeacherSubject('');
    }
  };

  const handleRemoveTeacherToInvite = (index: number) => {
    setTeachersToInvite(teachersToInvite.filter((_, i) => i !== index));
  };

  const handleCompleteTeacherRegistration = () => {
    const newEntity: Entity = {
      id: `e_tutor_${Date.now()}`,
      name: `أكاديمية ${teacherName}`,
      type: 'individual_teacher',
      logo: '/dequa-logo.png',
      role: 'owner',
      billingPlan: 'monthly_per_student',
      pricePerStudent: PLATFORM_CONFIG.pricing.tutorMonthlyPerStudent,
      currency: PLATFORM_CONFIG.currencySymbol,
      activeStudentsCount: 52,
      region: 'فلسطين',
      principalOrOwnerName: teacherName,
    };

    onRegisterEntity?.(newEntity);
    onRoleChange('teacher');
    onNavigate('B1');
  };

  const handleCompleteOrgRegistration = () => {
    const newEntity: Entity = {
      id: `e_org_${Date.now()}`,
      name: orgName,
      type: entityType,
      logo: '/dequa-logo.png',
      role: 'owner',
      billingPlan: 'yearly_contract',
      pricePerStudent: PLATFORM_CONFIG.pricing.schoolYearlyPerStudent,
      currency: PLATFORM_CONFIG.currencySymbol,
      activeStudentsCount: parseInt(studentEstimate) || 200,
      region: orgRegion,
      principalOrOwnerName: orgName,
    };

    onRegisterEntity?.(newEntity);
    onRoleChange('school_principal');
    onNavigate('D1');
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 text-right">
        {/* Progress header */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>الخطوة {step} من {entityType === 'individual_teacher' ? '3' : '3'}</span>
            <span>
              {step === 1 && 'اختيار نوع الحساب'}
              {step === 2 && (entityType === 'individual_teacher' ? 'المنهج والصفوف والمواد' : 'بيانات المؤسسة والشعار')}
              {step === 3 && (entityType === 'individual_teacher' ? 'معلومات المعلم والبدء' : 'دعوة المعلمين ومكالمة التجهيز')}
            </span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className="bg-[#1E3A5F] h-full transition-all duration-300 rounded-full"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* STEP 1: نوع الحساب (مدرّس فردي / مدرسة / مركز تعليمي) */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-black text-[#1E3A5F]">اختر نوع حسابك في منصة دقة</h2>
              <p className="text-xs text-slate-500 mt-1">
                منصة عامة مهيأة للتعليم الفردي والمؤسسي لكافة المناهج والصفوف.
              </p>
            </div>

            {trialText && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs font-bold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{trialText} لكل حساب جديد، بدون دفع وبدون أي التزام.</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Option 1: مدرّس فردي */}
              <button
                type="button"
                onClick={() => setEntityType('individual_teacher')}
                className={`p-4 rounded-2xl border-2 text-right transition-all cursor-pointer space-y-3 ${
                  entityType === 'individual_teacher'
                    ? 'border-[#1E3A5F] bg-[#E8F0F8]/50 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-[#1E3A5F] flex items-center justify-center font-bold">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">مدرّس فردي</h3>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    للمعلمين الخصوصيين والمستقلين.{teacherPlan ? ` يبدأ من ${priceText(teacherPlan)}.` : ''}
                  </p>
                </div>
              </button>

              {/* Option 2: مدرسة */}
              <button
                type="button"
                onClick={() => setEntityType('school')}
                className={`p-4 rounded-2xl border-2 text-right transition-all cursor-pointer space-y-3 ${
                  entityType === 'school'
                    ? 'border-[#1E3A5F] bg-[#E8F0F8]/50 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">مدرسة</h3>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    خاصة أو حكومية، مع ربط المعلمين والشعب.{schoolPlan ? ` يبدأ من ${priceText(schoolPlan)}.` : ''}
                  </p>
                </div>
              </button>

              {/* Option 3: مركز تعليمي */}
              <button
                type="button"
                onClick={() => setEntityType('learning_center')}
                className={`p-4 rounded-2xl border-2 text-right transition-all cursor-pointer space-y-3 ${
                  entityType === 'learning_center'
                    ? 'border-[#1E3A5F] bg-[#E8F0F8]/50 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">مركز تعليمي</h3>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    للمعاهد والمراكز التي تشمل معلمين متعددين ودورات للمناهج المختلفة.
                  </p>
                </div>
              </button>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                onClick={() => setStep(2)}
                className="bg-[#1E3A5F] hover:bg-[#152a45] text-white px-6 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer transition-colors shadow-2xs"
              >
                <span>المتابعة للخطوة التالية</span>
                <ArrowRight className="w-4 h-4 rtl:rotate-180" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: TEACHER (Curriculum, Grades, Subjects) */}
        {tutorRequest && entityType === 'individual_teacher' && step > 1 && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed">
            <strong className="block mb-0.5">طلب صفحة دروس خصوصية خاصة بك</strong>
            هذا حساب مستقل عن حساب مدرستك، ببياناته وطلابه واشتراكه الشهري الخاص. يصل طلبك لإدارة المنصة، وتُفتح الصفحة بعد موافقتها.
          </div>
        )}

        {step === 2 && entityType === 'individual_teacher' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-black text-[#1E3A5F]">اختر المنهج والصفوف والمواد</h2>
              <p className="text-xs text-slate-500 mt-1">
                تُقرأ القوائم ديناميكياً من المناهج المعتمدة في المنصة، ويمكنك إضافة المزيد لاحقاً.
              </p>
            </div>

            {/* Select Curriculum */}
            <div className="space-y-1.5 text-xs">
              <label className="block font-bold text-slate-700">1. المنهج الدراسي</label>
              <select
                value={selectedCurriculumId}
                onChange={(e) => {
                  setSelectedCurriculumId(e.target.value);
                  const curr = curricula.find((c) => c.id === e.target.value);
                  if (curr && curr.grades.length > 0) {
                    setSelectedGradeIds([curr.grades[0].id]);
                    if (curr.grades[0].subjects.length > 0) {
                      setSelectedSubjectIds([curr.grades[0].subjects[0].id]);
                    }
                  }
                }}
                className="w-full p-2.5 bg-[#F7F8FA] border border-slate-300 rounded-xl font-bold text-slate-800"
              >
                {curricula.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.country})
                  </option>
                ))}
              </select>
            </div>

            {/* Select Grade(s) */}
            <div className="space-y-1.5 text-xs">
              <label className="block font-bold text-slate-700">
                2. الصفوف التي تدرّسها (يمكنك اختيار أكثر من صف):
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {availableGrades.map((g) => (
                  <label
                    key={g.id}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                      selectedGradeIds.includes(g.id)
                        ? 'bg-[#E8F0F8] border-blue-300 text-[#1E3A5F] font-bold'
                        : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    <span>{g.name}</span>
                    <input
                      type="checkbox"
                      checked={selectedGradeIds.includes(g.id)}
                      onChange={() => handleToggleGrade(g.id)}
                      className="accent-[#1E3A5F] w-4 h-4 cursor-pointer"
                    />
                  </label>
                ))}
              </div>
            </div>

            {/* Select Subject(s) - excludes drafts */}
            <div className="space-y-1.5 text-xs">
              <label className="block font-bold text-slate-700">
                3. المواد الدراسية (مستخرجة من الصفوف المختارة):
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {availableSubjects.map((s) => (
                  <label
                    key={s.id}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                      selectedSubjectIds.includes(s.id)
                        ? 'bg-[#E8F0F8] border-blue-300 text-[#1E3A5F] font-bold'
                        : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-bold">{s.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{s.code}</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={selectedSubjectIds.includes(s.id)}
                      onChange={() => handleToggleSubject(s.id)}
                      className="accent-[#1E3A5F] w-4 h-4 cursor-pointer"
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between">
              <button
                onClick={() => setStep(1)}
                className="text-xs text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
              >
                ← السابق
              </button>
              <button
                onClick={() => setStep(3)}
                className="bg-[#1E3A5F] hover:bg-[#152a45] text-white px-6 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer transition-colors shadow-2xs"
              >
                <span>المتابعة لبيانات الحساب</span>
                <ArrowRight className="w-4 h-4 rtl:rotate-180" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: TEACHER (Details & Start Instantly) */}
        {step === 3 && entityType === 'individual_teacher' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-black text-[#1E3A5F]">بيانات المعلم والبدء الفوري</h2>
              <p className="text-xs text-slate-500 mt-1">
                حسابك جاهز للانطلاق وتصحيح أول ورقة امتحان في دقائق.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">اسم المعلم الكامل</label>
                <input
                  type="text"
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  className="w-full p-2.5 bg-[#F7F8FA] border border-slate-300 rounded-xl font-bold text-slate-900"
                />
              </div>

              {isReal && auth.status === 'signed_in' ? (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700">
                  أنت مسجّل الدخول برقم{' '}
                  <span dir="ltr" className="font-bold tabular-nums">{auth.profile?.phone}</span>، وسيُضاف الحساب الجديد إلى حساباتك.
                </div>
              ) : (
              <div>
                <label className="block font-bold text-slate-700 mb-1">{words.phoneLabel}</label>
                <input
                  type="tel"
                  inputMode="tel"
                  dir="ltr"
                  placeholder="0599123456"
                  value={teacherPhone}
                  onChange={(e) => setTeacherPhone(e.target.value)}
                  className="w-full p-2.5 bg-[#F7F8FA] border border-slate-300 rounded-xl text-left tabular-nums text-slate-900"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  تدخل لاحقاً بهذا الرقم ورمز تحقق يصلك {words.by}، بدون كلمة مرور.
                </p>
              </div>
              )}

              {/* Trial + price summary (from the admin's settings) */}
              {(trialText || teacherPlan) && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs space-y-1">
                  {trialText && (
                    <div className="font-bold flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span>تبدأ بـ{trialText}، بدون دفع.</span>
                    </div>
                  )}
                  {teacherPlan && (
                    <p className="text-[11px] text-emerald-800">
                      بعد التجربة: {priceText(teacherPlan)}، دون أي التزام مسبق.
                    </p>
                  )}
                </div>
              )}
            </div>

            {isReal ? (
              <FinishSignupWithWhatsApp
                phone={teacherPhone}
                fullName={teacherName}
                orgName={`أكاديمية ${teacherName.trim()}`}
                kind="individual_teacher"
                buttonLabel={tutorRequest ? 'أرسل الطلب لإدارة المنصة' : 'ابدأ الآن وادخل للوحة التحكم'}
                onBack={() => setStep(2)}
                onCreated={(id, kind) => onOrganizationCreated?.(id, kind)}
              />
            ) : (
            <div className="pt-4 flex items-center justify-between">
              <button
                onClick={() => setStep(2)}
                className="text-xs text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
              >
                ← السابق
              </button>
              <button
                onClick={handleCompleteTeacherRegistration}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-7 py-3 rounded-xl font-black text-sm flex items-center gap-2 cursor-pointer transition-all shadow-md active:scale-95"
              >
                <Sparkles className="w-4 h-4" />
                <span>ابدأ الآن وادخل للوحة التحكم</span>
              </button>
            </div>
            )}
          </div>
        )}

        {/* STEP 2: SCHOOL / CENTER (Org details, region, students, logo) */}
        {step === 2 && entityType !== 'individual_teacher' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-black text-[#1E3A5F]">
                بيانات {entityType === 'school' ? 'المدرسة' : 'المركز التعليمي'}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                سيظهر اسم جهتك التعليمية على الأوراق المصححة وتقارير أولياء الأمور.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  اسم {entityType === 'school' ? 'المدرسة' : 'المركز التعليمي'}
                </label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full p-2.5 bg-[#F7F8FA] border border-slate-300 rounded-xl font-bold text-slate-900"
                  placeholder="مثال: مدرسة الأمل الخاصة"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">المنطقة والمدينة</label>
                  <input
                    type="text"
                    value={orgRegion}
                    onChange={(e) => setOrgRegion(e.target.value)}
                    className="w-full p-2.5 bg-[#F7F8FA] border border-slate-300 rounded-xl text-slate-900"
                    placeholder="مثال: غزة - الرمال"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">عدد الطلاب التقريبي</label>
                  <input
                    type="number"
                    value={studentEstimate}
                    onChange={(e) => setStudentEstimate(e.target.value)}
                    className="w-full p-2.5 bg-[#F7F8FA] border border-slate-300 rounded-xl font-mono text-slate-900"
                    placeholder="280"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between">
              <button
                onClick={() => setStep(1)}
                className="text-xs text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
              >
                ← السابق
              </button>
              <button
                onClick={() => setStep(3)}
                className="bg-[#1E3A5F] hover:bg-[#152a45] text-white px-6 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer transition-colors shadow-2xs"
              >
                <span>المتابعة لشاشة دعوة المعلمين</span>
                <ArrowRight className="w-4 h-4 rtl:rotate-180" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: SCHOOL / CENTER («ادعُ معلميك» + «احجز مكالمة تجهيز») */}
        {step === 3 && entityType !== 'individual_teacher' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-black text-[#1E3A5F]">ادعُ معلميك وجهّز المنظومة</h2>
              <p className="text-xs text-slate-500 mt-1">
                أضف أرقام جوالات معلميك لربطهم بمدرستك، ويمكنك إضافتهم لاحقاً من لوحة الإدارة أيضاً.
              </p>
            </div>

            {/* Quick Add Teacher to Invite Form */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 text-xs">
              <span className="font-bold text-slate-800 block">إضافة معلم للدعوة:</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="اسم المعلم"
                  value={newTeacherName}
                  onChange={(e) => setNewTeacherName(e.target.value)}
                  className="p-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                />
                <input
                  type="text"
                  placeholder="رقم الجوال (059...)"
                  value={newTeacherPhone}
                  onChange={(e) => setNewTeacherPhone(e.target.value)}
                  className="p-2 bg-white border border-slate-300 rounded-lg font-mono text-slate-900"
                />
                <input
                  type="text"
                  placeholder="المادة (رياضيات، علوم...)"
                  value={newTeacherSubject}
                  onChange={(e) => setNewTeacherSubject(e.target.value)}
                  className="p-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                />
              </div>
              <button
                type="button"
                onClick={handleAddTeacherToInvite}
                className="bg-[#1E3A5F] text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Plus className="w-4 h-4" />
                <span>+ أضف لقائمة الدعوة</span>
              </button>
            </div>

            {/* Invited Teachers List */}
            <div className="space-y-2 text-xs">
              <span className="font-bold text-slate-700 block">قائمة المعلمين المرشحين للإرسال ({teachersToInvite.length}):</span>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                {teachersToInvite.map((tc, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between">
                    <div>
                      <strong className="block text-slate-900">{tc.name}</strong>
                      <span className="text-[11px] text-slate-500 font-mono">{tc.phone} · {tc.subject}</span>
                    </div>
                    <button
                      onClick={() => handleRemoveTeacherToInvite(idx)}
                      className="text-slate-400 hover:text-red-600 p-1 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Setup help: the Daqa team reaches out after sign-up */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl text-xs space-y-0.5">
              <span className="font-bold text-[#1E3A5F] flex items-center gap-1.5">
                <PhoneCall className="w-4 h-4 text-blue-600" />
                <span>جلسة تجهيز مجانية لطاقمك</span>
              </span>
              <p className="text-slate-600 text-[11px]">
                بعد التسجيل يتواصل معك فريق دقة لمساعدتك في إدخال قوائم الطلاب وربط الشعب وطباعة النماذج الأولى.
              </p>
            </div>

            {isReal ? (
              <div className="space-y-3 text-xs border-t border-slate-100 pt-4">
                <div className="font-bold text-[#1E3A5F]">بيانات مدير الحساب</div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">الاسم الكامل</label>
                  <input
                    type="text"
                    value={teacherName}
                    onChange={(e) => setTeacherName(e.target.value)}
                    className="w-full p-2.5 bg-[#F7F8FA] border border-slate-300 rounded-xl font-bold text-slate-900"
                  />
                </div>
                {auth.status === 'signed_in' ? (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700">
                    أنت مسجّل الدخول برقم{' '}
                    <span dir="ltr" className="font-bold tabular-nums">{auth.profile?.phone}</span>، وسيُضاف الحساب الجديد إلى حساباتك.
                  </div>
                ) : (
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">{words.phoneLabel}</label>
                    <input
                      type="tel"
                      inputMode="tel"
                      dir="ltr"
                      placeholder="0599123456"
                      value={teacherPhone}
                      onChange={(e) => setTeacherPhone(e.target.value)}
                      className="w-full p-2.5 bg-[#F7F8FA] border border-slate-300 rounded-xl text-left tabular-nums text-slate-900"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      تدخل لاحقاً بهذا الرقم ورمز تحقق يصلك {words.by}، بدون كلمة مرور.
                    </p>
                  </div>
                )}
                <FinishSignupWithWhatsApp
                  phone={teacherPhone}
                  fullName={teacherName}
                  orgName={orgName}
                  kind={entityType}
                  region={orgRegion}
                  invites={teachersToInvite}
                  buttonLabel="إتمام التسجيل والدخول للوحة الإدارة"
                  onBack={() => setStep(2)}
                  onCreated={(id, kind) => onOrganizationCreated?.(id, kind)}
                />
              </div>
            ) : (
            <div className="pt-4 flex items-center justify-between">
              <button
                onClick={() => setStep(2)}
                className="text-xs text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
              >
                ← السابق
              </button>
              <button
                onClick={handleCompleteOrgRegistration}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-7 py-3 rounded-xl font-black text-sm flex items-center gap-2 cursor-pointer transition-all shadow-md active:scale-95"
              >
                <Sparkles className="w-4 h-4" />
                <span>إتمام التسجيل والدخول للوحة الإدارة</span>
              </button>
            </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
