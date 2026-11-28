import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { SCREEN_PATHS, pathForScreen, roleForPath, screenForPath } from './routes';
import { UserRole, ScreenId, Entity } from './types';
import { DataProvider } from './data/DataContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { MobileBottomNav } from './components/MobileBottomNav';
import { AIAssistantDrawer } from './components/AIAssistantDrawer';
import { MOCK_ENTITIES, PLATFORM_CONFIG } from './mockData';
import { useAuth } from './lib/auth';

// Group A Components
import { LandingPage } from './components/groupA/LandingPage';

// Group B Components
import { getSelected, setSelected } from './data/selection';
import { getExamScope, setExamScope } from './data/examScope';

// Common Components
import { Toaster } from './components/common/Toaster';
import { InstallAppBanner } from './components/common/InstallAppBanner';
import { OrgStatusGate } from './components/common/OrgStatusGate';
import { BillingBanner } from './components/common/BillingBanner';
import { ScreenErrorBoundary } from './components/common/ScreenErrorBoundary';

// Group C Components

// Group D Components

// Group E Components

// Floating AI trigger icon
import { Loader2, Sparkles } from 'lucide-react';
import { notify } from './lib/notify';

// Each screen loads on first visit only, so the app opens fast on a slow
// connection (the first page no longer downloads every screen).
const PricingPage = lazy(() => import('./components/groupA/PricingPage').then((m) => ({ default: m.PricingPage })));
const RegisterPage = lazy(() => import('./components/groupA/RegisterPage').then((m) => ({ default: m.RegisterPage })));
const LoginPage = lazy(() => import('./components/groupA/LoginPage').then((m) => ({ default: m.LoginPage })));
const StudentSubmissionPage = lazy(() => import('./components/groupA/StudentSubmissionPage').then((m) => ({ default: m.StudentSubmissionPage })));
const TeacherDashboard = lazy(() => import('./components/groupB/TeacherDashboard').then((m) => ({ default: m.TeacherDashboard })));
const GroupsStudentsPage = lazy(() => import('./components/groupB/GroupsStudentsPage').then((m) => ({ default: m.GroupsStudentsPage })));
const StudentProfilePage = lazy(() => import('./components/groupB/StudentProfilePage').then((m) => ({ default: m.StudentProfilePage })));
const ExamsListPage = lazy(() => import('./components/groupB/ExamsListPage').then((m) => ({ default: m.ExamsListPage })));
const ExamQuestionsPage = lazy(() => import('./components/groupB/ExamQuestionsPage').then((m) => ({ default: m.ExamQuestionsPage })));
const CreateExamPage = lazy(() => import('./components/groupB/CreateExamPage').then((m) => ({ default: m.CreateExamPage })));
const PrintAnswerSheetsPage = lazy(() => import('./components/groupB/PrintAnswerSheetsPage').then((m) => ({ default: m.PrintAnswerSheetsPage })));
const UploadPapersPage = lazy(() => import('./components/groupB/UploadPapersPage').then((m) => ({ default: m.UploadPapersPage })));
const GradingReviewPage = lazy(() => import('./components/groupB/GradingReviewPage').then((m) => ({ default: m.GradingReviewPage })));
const ExamAnalyticsPage = lazy(() => import('./components/groupB/ExamAnalyticsPage').then((m) => ({ default: m.ExamAnalyticsPage })));
const ParentReportPage = lazy(() => import('./components/groupB/ParentReportPage').then((m) => ({ default: m.ParentReportPage })));
const SubscriptionPage = lazy(() => import('./components/groupB/SubscriptionPage').then((m) => ({ default: m.SubscriptionPage })));
const CorrectedPaperViewPage = lazy(() => import('./components/groupB/CorrectedPaperViewPage').then((m) => ({ default: m.CorrectedPaperViewPage })));
const WhereWeReachedPage = lazy(() => import('./components/groupB/WhereWeReachedPage'));
const TeacherDiagnosticAnalyticsPage = lazy(() => import('./components/groupB/TeacherDiagnosticAnalyticsPage').then((m) => ({ default: m.TeacherDiagnosticAnalyticsPage })));
const TechnicalSupportPage = lazy(() => import('./components/common/TechnicalSupportPage').then((m) => ({ default: m.TechnicalSupportPage })));
const AIToolsHubPage = lazy(() => import('./components/groupC/AIToolsHubPage').then((m) => ({ default: m.AIToolsHubPage })));
const GenerateExamTool = lazy(() => import('./components/groupC/GenerateExamTool').then((m) => ({ default: m.GenerateExamTool })));
const RemedialExercisesTool = lazy(() => import('./components/groupC/RemedialExercisesTool').then((m) => ({ default: m.RemedialExercisesTool })));
const QuestionBankTool = lazy(() => import('./components/groupC/QuestionBankTool').then((m) => ({ default: m.QuestionBankTool })));
const ConvertOldExamTool = lazy(() => import('./components/groupC/ConvertOldExamTool').then((m) => ({ default: m.ConvertOldExamTool })));
const ClusterGradingTool = lazy(() => import('./components/groupC/ConvertOldExamTool').then((m) => ({ default: m.ClusterGradingTool })));
const StudyPlanTool = lazy(() => import('./components/groupC/AdvancedTools').then((m) => ({ default: m.StudyPlanTool })));
const AtRiskStudentsTool = lazy(() => import('./components/groupC/AdvancedTools').then((m) => ({ default: m.AtRiskStudentsTool })));
const ParentAutoReplyTool = lazy(() => import('./components/groupC/AdvancedTools').then((m) => ({ default: m.ParentAutoReplyTool })));
const TeacherFilesSection = lazy(() => import('./components/groupC/TeacherFilesSection').then((m) => ({ default: m.TeacherFilesSection })));
const SchoolDashboard = lazy(() => import('./components/groupD/SchoolViews').then((m) => ({ default: m.SchoolDashboard })));
const TeachersClassesPage = lazy(() => import('./components/groupD/SchoolViews').then((m) => ({ default: m.TeachersClassesPage })));
const SchoolReportPage = lazy(() => import('./components/groupD/SchoolViews').then((m) => ({ default: m.SchoolReportPage })));
const TeacherComparisonPage = lazy(() => import('./components/groupD/SchoolViews').then((m) => ({ default: m.TeacherComparisonPage })));
const PlatformAdminDashboard = lazy(() => import('./components/groupE/PlatformAdminViews').then((m) => ({ default: m.PlatformAdminDashboard })));
const AdminBillingPage = lazy(() => import('./components/groupE/PlatformAdminViews').then((m) => ({ default: m.AdminBillingPage })));
const GradingQualityPage = lazy(() => import('./components/groupE/PlatformAdminViews').then((m) => ({ default: m.GradingQualityPage })));
const AdminSectionGate = lazy(() => import('./components/groupE/PlatformAdminViews').then((m) => ({ default: m.AdminSectionGate })));
const CurriculumManagementPage = lazy(() => import('./components/groupE/CurriculumManagementPage').then((m) => ({ default: m.CurriculumManagementPage })));

// After the first page shows, quietly download the other screens in the
// background, so they open instantly later and still work offline.
let prefetched = false;
function prefetchScreens() {
  if (prefetched) return;
  prefetched = true;
  const all = [
    () => import('./components/common/TechnicalSupportPage'),
    () => import('./components/groupA/LoginPage'),
    () => import('./components/groupA/PricingPage'),
    () => import('./components/groupA/RegisterPage'),
    () => import('./components/groupA/StudentSubmissionPage'),
    () => import('./components/groupB/CorrectedPaperViewPage'),
    () => import('./components/groupB/CreateExamPage'),
    () => import('./components/groupB/ExamAnalyticsPage'),
    () => import('./components/groupB/ExamQuestionsPage'),
    () => import('./components/groupB/ExamsListPage'),
    () => import('./components/groupB/GradingReviewPage'),
    () => import('./components/groupB/GroupsStudentsPage'),
    () => import('./components/groupB/ParentReportPage'),
    () => import('./components/groupB/PrintAnswerSheetsPage'),
    () => import('./components/groupB/StudentProfilePage'),
    () => import('./components/groupB/SubscriptionPage'),
    () => import('./components/groupB/TeacherDashboard'),
    () => import('./components/groupB/TeacherDiagnosticAnalyticsPage'),
    () => import('./components/groupB/UploadPapersPage'),
    () => import('./components/groupB/WhereWeReachedPage'),
    () => import('./components/groupC/AIToolsHubPage'),
    () => import('./components/groupC/AdvancedTools'),
    () => import('./components/groupC/ConvertOldExamTool'),
    () => import('./components/groupC/GenerateExamTool'),
    () => import('./components/groupC/QuestionBankTool'),
    () => import('./components/groupC/RemedialExercisesTool'),
    () => import('./components/groupC/TeacherFilesSection'),
    () => import('./components/groupD/SchoolViews'),
    () => import('./components/groupE/CurriculumManagementPage'),
    () => import('./components/groupE/PlatformAdminViews'),
  ];
  const conn = (navigator as { connection?: { saveData?: boolean } }).connection;
  if (conn?.saveData) return;
  let i = 0;
  const next = () => {
    if (i >= all.length) return;
    all[i++]()
      .catch(() => {})
      .finally(() => setTimeout(next, 200));
  };
  setTimeout(next, 3000);
}

function ScreenLoading() {
  return (
    <div className="py-16 text-center text-xs text-slate-500 flex items-center justify-center gap-2" role="status">
      <Loader2 className="w-4 h-4 animate-spin" /> جارٍ التحميل…
    </div>
  );
}

const ACTIVE_ENTITY_KEY = 'daqa.activeEntityId';

function readSavedEntityId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_ENTITY_KEY);
  } catch {
    return null;
  }
}

function saveEntityId(id: string) {
  try {
    localStorage.setItem(ACTIVE_ENTITY_KEY, id);
  } catch {
    // Private browsing: the choice just isn't remembered.
  }
}

// A teacher who is a member (not the owner) of a school or centre.
const isOrgTeacher = (entity: Entity | undefined) => !!entity && entity.role === 'teacher';
const BILLING_OWNER_ONLY = 'الاشتراك والفواتير خاصة بإدارة الجهة فقط، ولا تظهر لمعلميها.';

// Org owners of a school or centre manage it from the school dashboard.
const isOrgOwner = (entity: Entity | undefined) =>
  !!entity && entity.role === 'owner' && entity.type !== 'individual_teacher';

export default function App() {
  // The web address decides the screen and the role's area. With a real Supabase
  // project, the signed-in account also decides which areas may be opened.
  const location = useLocation();
  const navigate = useNavigate();

  // Only inside the teacher/school/admin areas: students and visitors on a
  // public page do not spend their data on screens they never open.
  const inAccountArea = roleForPath(location.pathname) !== 'visitor';
  useEffect(() => {
    if (inAccountArea) prefetchScreens();
  }, [inAccountArea]);
  const auth = useAuth();
  const isReal = auth.mode === 'real';
  const currentScreen: ScreenId = screenForPath(location.pathname);
  const [currentRole, setCurrentRole] = useState<UserRole>(() => roleForPath(location.pathname));
  const setCurrentScreen = (screen: ScreenId) =>
    navigate(pathForScreen(screen, roleForPath(location.pathname) === 'school_principal'));
  const [selectedStudentId, setSelectedStudentId] = useState<string>('s1');
  const [isEnglish, setIsEnglish] = useState<boolean>(false);
  const [isAIOpen, setIsAIOpen] = useState<boolean>(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<boolean>(false);

  // Active Entity state for multi-tenancy & account switcher (demo mode)
  const [demoEntity, setDemoEntity] = useState<Entity>(() =>
    roleForPath(location.pathname) === 'school_principal'
      ? MOCK_ENTITIES.find(isOrgOwner) || MOCK_ENTITIES[0]
      : MOCK_ENTITIES[0]
  );
  // Real mode: the organizations come from the account; we remember the chosen one.
  const [activeEntityId, setActiveEntityId] = useState<string | null>(readSavedEntityId);
  const entities: Entity[] = isReal ? auth.entities : MOCK_ENTITIES;
  const activeEntity: Entity = useMemo(() => {
    if (!isReal) return demoEntity;
    return (
      auth.entities.find((e) => e.id === activeEntityId) ??
      auth.entities[0] ?? {
        // Signed in without any organization yet (e.g. platform admin only).
        id: '',
        name: auth.profile?.fullName || 'حسابي',
        type: 'individual_teacher',
        logo: '/dequa-logo.png',
        role: 'owner',
        billingPlan: 'monthly_per_student',
        pricePerStudent: PLATFORM_CONFIG.pricing.tutorMonthlyPerStudent,
        currency: PLATFORM_CONFIG.currencySymbol,
        activeStudentsCount: 0,
        region: '',
        principalOrOwnerName: auth.profile?.fullName || '',
      }
    );
  }, [isReal, demoEntity, auth.entities, auth.profile, activeEntityId]);
  // «صفحتي كأستاذ»: the owner of a school or centre who opens the teacher area works
  // there as a teacher: only the classes assigned to them, and no billing.
  const isOwnerTeacherView = isOrgOwner(activeEntity) && roleForPath(location.pathname) === 'teacher';
  const viewEntity: Entity = useMemo(
    () => (isOwnerTeacherView ? { ...activeEntity, role: 'teacher' } : activeEntity),
    [isOwnerTeacherView, activeEntity],
  );
  const setActiveEntity = (entity: Entity) => {
    if (isReal) {
      setActiveEntityId(entity.id);
      saveEntityId(entity.id);
    } else {
      setDemoEntity(entity);
    }
  };

  // Where a signed-in account starts.
  // Platform admins start in the admin dashboard; the «حسابي» button in its header
  // takes them to their own organization.
  const homePath = (): string => {
    if (auth.profile?.isPlatformAdmin) return '/admin';
    if (auth.entities.length === 0) return '/register';
    return isOrgOwner(activeEntity) ? '/school' : '/app';
  };

  // A notification link carries ?org=<id>: open that organization first, then the page.
  const orgParam = new URLSearchParams(location.search).get('org');
  const pendingOrgSwitch =
    isReal && !!orgParam && orgParam !== activeEntity.id && auth.entities.some((e) => e.id === orgParam);
  useEffect(() => {
    if (!isReal || !orgParam || auth.status !== 'signed_in') return;
    const ent = auth.entities.find((e) => e.id === orgParam);
    if (ent && ent.id !== activeEntity.id) {
      setActiveEntityId(ent.id);
      saveEntityId(ent.id);
      return;
    }
    const params = new URLSearchParams(location.search);
    params.delete('org');
    const rest = params.toString();
    navigate(`${location.pathname}${rest ? `?${rest}` : ''}`, { replace: true });
  }, [isReal, orgParam, auth.status, auth.entities, activeEntity.id]);

  // Real mode: keep people inside the areas their account may open.
  useEffect(() => {
    if (!isReal || auth.status === 'loading' || pendingOrgSwitch) return;
    const path = location.pathname.replace(/\/+$/, '') || '/';
    const area = roleForPath(path);
    const isProtected = area === 'teacher' || area === 'school_principal' || area === 'platform_admin';

    if (auth.status === 'signed_out') {
      if (isProtected) navigate(`/login?next=${encodeURIComponent(path)}`, { replace: true });
      return;
    }

    // Signed in
    if (path === '/login') {
      const next = new URLSearchParams(location.search).get('next');
      const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : null;
      navigate(safeNext && roleForPath(safeNext) !== 'visitor' ? safeNext : homePath(), { replace: true });
      return;
    }
    if (area === 'platform_admin' && !auth.profile?.isPlatformAdmin) {
      navigate(homePath(), { replace: true });
      return;
    }
    if ((area === 'teacher' || area === 'school_principal') && auth.entities.length === 0) {
      navigate(homePath(), { replace: true });
      return;
    }
    if (area === 'school_principal' && !isOrgOwner(activeEntity)) {
      navigate('/app', { replace: true });
    }
  }, [isReal, auth.status, auth.entities, auth.profile, activeEntity, location.pathname, location.search, pendingOrgSwitch]);

  // Opening the billing address directly (bookmark, shared link) is blocked too.
  useEffect(() => {
    if (currentScreen === 'B11' && isOrgTeacher(viewEntity) && roleForPath(location.pathname) === 'teacher') {
      notify(BILLING_OWNER_ONLY, 'warning');
      navigate(pathForScreen('B1'), { replace: true });
    }
  }, [currentScreen, viewEntity, location.pathname]);

  // Keep the role in step with the area of the site the address points to
  // (e.g. opening a student link, or pressing the browser's back button).
  useEffect(() => {
    const areaRole = roleForPath(location.pathname);
    if (areaRole === 'visitor') {
      // Public pages keep whoever is signed in. With real sign-in, someone who is
      // signed out (or has no organization yet) sees the visitor header.
      const hasAccountArea = auth.status === 'signed_in' && auth.entities.length > 0;
      if (isReal && !hasAccountArea && currentRole !== 'visitor') setCurrentRole('visitor');
      return;
    }
    if (areaRole === 'teacher' && currentRole === 'teacher') return;
    if (areaRole !== currentRole) setCurrentRole(areaRole);
  }, [location.pathname, isReal, auth.status, auth.entities]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
    setIsMobileDrawerOpen(false);
  }, [location.pathname]);

  const handleNavigate = (screen: ScreenId) => {
    // Teachers of a school or centre never see its subscription and invoices.
    if (screen === 'B11' && isOrgTeacher(viewEntity)) {
      notify(BILLING_OWNER_ONLY, 'warning');
      return;
    }
    setExamScope(null);
    setCurrentScreen(screen);
  };

  const handleRoleChange = (role: UserRole) => {
    setCurrentRole(role);
    if (role === 'school_admin') {
      const schoolEntity = MOCK_ENTITIES.find(e => e.type === 'school' && e.role === 'owner') || MOCK_ENTITIES[1];
      setActiveEntity(schoolEntity);
    } else if (role === 'teacher') {
      // Default to private tutor or teacher
      setActiveEntity(MOCK_ENTITIES[0]);
    }
  };

  const handleSwitchEntity = (entity: Entity) => {
    setActiveEntity(entity);
    if (entity.type !== 'individual_teacher') {
      if (entity.role === 'owner') {
        setCurrentRole('school_principal');
        navigate(pathForScreen('D1'));
      } else {
        setCurrentRole('teacher');
        navigate(pathForScreen('B1'));
      }
    } else {
      setCurrentRole('teacher');
      navigate(pathForScreen('B1'));
    }
  };

  const renderScreen = () => {
    switch (currentScreen) {
      // Group A
      case 'A1':
        return <LandingPage onNavigate={handleNavigate} onOpenAI={() => setIsAIOpen(true)} />;
      case 'A2':
        return <PricingPage onNavigate={handleNavigate} />;
      case 'A3':
        return (
          <RegisterPage
            onNavigate={handleNavigate}
            onRoleChange={handleRoleChange}
            onOrganizationCreated={(id, kind) => {
              setActiveEntityId(id);
              saveEntityId(id);
              setCurrentRole(kind === 'individual_teacher' ? 'teacher' : 'school_principal');
              navigate(kind === 'individual_teacher' ? '/app' : '/school');
            }}
          />
        );
      case 'A4':
        return <LoginPage onNavigate={handleNavigate} onRoleChange={handleRoleChange} />;
      case 'A5':
        return <StudentSubmissionPage onNavigate={handleNavigate} />;

      // Group B
      case 'B1':
        return <TeacherDashboard onNavigate={handleNavigate} onOpenAI={() => setIsAIOpen(true)} />;
      case 'B2':
        return (
          <GroupsStudentsPage
            onNavigate={handleNavigate}
            onSelectStudent={(id) => {
              setSelected('student', id);
              setSelectedStudentId(id);
            }}
          />
        );
      case 'B3':
        return <StudentProfilePage studentId={getSelected('student') ?? selectedStudentId} onNavigate={handleNavigate} />;
      case 'B4':
        return <ExamsListPage onNavigate={handleNavigate} />;
      case 'B5':
        return <CreateExamPage onNavigate={handleNavigate} />;
      case 'B6':
        return <PrintAnswerSheetsPage onNavigate={handleNavigate} />;
      case 'B7':
        return <UploadPapersPage onNavigate={handleNavigate} />;
      case 'B8':
        return <GradingReviewPage onNavigate={handleNavigate} />;
      case 'B9':
        return <ExamAnalyticsPage onNavigate={handleNavigate} />;
      case 'B10':
        return <ParentReportPage onNavigate={handleNavigate} />;
      case 'B11':
        return <SubscriptionPage onNavigate={handleNavigate} activeEntity={viewEntity} />;
      case 'B13':
        return <ExamQuestionsPage onNavigate={handleNavigate} />;
      case 'B12':
        return <CorrectedPaperViewPage onNavigate={handleNavigate} />;
      case 'B14':
        return (
          <WhereWeReachedPage 
            onNavigate={handleNavigate} 
            onOpenExamGen={(scope) => {
              setExamScope(scope);
              setCurrentScreen('C1');
            }}
          />
        );
      case 'B15':
        return <TeacherDiagnosticAnalyticsPage onNavigate={handleNavigate} />;

      // Group C
      case 'C_HUB':
        return <AIToolsHubPage onNavigate={handleNavigate} onOpenAI={() => setIsAIOpen(true)} />;
      case 'C1':
        return <GenerateExamTool onNavigate={handleNavigate} scope={getExamScope()} />;
      case 'C2':
        return <RemedialExercisesTool onNavigate={handleNavigate} />;
      case 'C3':
        return <QuestionBankTool onNavigate={handleNavigate} />;
      case 'C4':
        return <AIToolsHubPage onNavigate={handleNavigate} onOpenAI={() => setIsAIOpen(true)} />;
      case 'C5':
        return <ConvertOldExamTool onNavigate={handleNavigate} />;
      case 'C6':
        return <ClusterGradingTool onNavigate={handleNavigate} />;
      case 'C7':
        return <StudyPlanTool onNavigate={handleNavigate} />;
      case 'C8':
        return <AtRiskStudentsTool onNavigate={handleNavigate} />;
      case 'C9':
        return <ParentAutoReplyTool onNavigate={handleNavigate} />;
      case 'C_FILES':
        return <TeacherFilesSection onOpenExamGenWithFiles={() => handleNavigate('C1')} />;

      // Group D: School Views
      case 'D1':
        return <SchoolDashboard onNavigate={handleNavigate} />;
      case 'D2':
        return <TeachersClassesPage onNavigate={handleNavigate} />;
      case 'D3':
        return <SchoolReportPage onNavigate={handleNavigate} />;
      case 'D4':
        return <TeacherComparisonPage onNavigate={handleNavigate} />;

      // Group E: Platform Admin Views
      case 'E1':
        return <PlatformAdminDashboard onNavigate={handleNavigate} />;
      case 'E2':
        return <AdminBillingPage onNavigate={handleNavigate} />;
      case 'E3':
        return <GradingQualityPage onNavigate={handleNavigate} />;
      case 'E4':
        return (
          <AdminSectionGate need="curricula">
            <CurriculumManagementPage onNavigate={handleNavigate} />
          </AdminSectionGate>
        );
      case 'E5':
        return <PlatformAdminDashboard onNavigate={handleNavigate} initialTab="support" />;
      case 'E6':
        return <PlatformAdminDashboard onNavigate={handleNavigate} initialTab="landing" />;
      case 'E7':
        return <PlatformAdminDashboard onNavigate={handleNavigate} initialTab="staff" />;

      // Common / Global
      case 'SUPPORT':
        return <TechnicalSupportPage onNavigate={handleNavigate} activeEntity={viewEntity} />;

      default:
        return <LandingPage onNavigate={handleNavigate} onOpenAI={() => setIsAIOpen(true)} />;
    }
  };

  return (
    <div
      dir={isEnglish ? 'ltr' : 'rtl'}
      className="min-h-screen bg-[#F7F8FA] text-[#1F2937] flex flex-col font-sans"
    >
      {/* 1. Top Header / Navbar (Sticky at Top) */}
      <Navbar
        currentRole={currentRole}
        currentScreen={currentScreen}
        activeEntity={activeEntity}
        isTeacherView={isOwnerTeacherView}
        onSwitchView={(asTeacher) => navigate(asTeacher ? SCREEN_PATHS.B1 : SCREEN_PATHS.D1)}
        availableEntities={entities}
        onSwitchEntity={(entityId: string) => {
          const ent = entities.find(e => e.id === entityId);
          if (ent) handleSwitchEntity(ent);
        }}
        onNavigate={handleNavigate}
        onOpenAI={() => setIsAIOpen(true)}
        onOpenMobileMenu={() => setIsMobileDrawerOpen(true)}
        onLogout={() => {
          // Leave the private area first, so signing out doesn't bounce to the login page.
          setCurrentRole('visitor');
          navigate('/');
          if (isReal) void auth.signOut();
        }}
      />

      {/* 2. Main Workspace Layout with Right Sidebar for Desktop & Mobile Drawer */}
      <div className={`flex-1 flex w-full mx-auto ${currentScreen === 'A1' ? '' : 'max-w-7xl'}`}>
        {/* Main Content Viewport */}
        <main
          className={`${currentScreen === 'A1' ? 'flex-1 min-w-0' : 'flex-1 p-3 sm:p-6 lg:p-8 min-w-0'} ${
            // Room for the fixed bottom bar on phones, so the end of the page is not hidden behind it.
            currentRole !== 'visitor' && currentRole !== 'student' ? 'pb-24 sm:pb-24 lg:pb-8' : ''
          }`}
        >
          {isReal && roleForPath(location.pathname) !== 'visitor' && roleForPath(location.pathname) !== 'student' && auth.status !== 'signed_in' ? (
            <div className="py-24 text-center text-sm text-slate-500">جاري التحميل...</div>
          ) : isReal &&
            activeEntity.id &&
            activeEntity.status &&
            activeEntity.status !== 'active' &&
            (roleForPath(location.pathname) === 'teacher' || roleForPath(location.pathname) === 'school_principal') ? (
            <OrgStatusGate entity={activeEntity} onRefresh={auth.refresh} />
          ) : (
            <DataProvider org={viewEntity} real={isReal} teacherView={isReal && isOwnerTeacherView}>
              {isReal &&
                activeEntity.id &&
                (roleForPath(location.pathname) === 'teacher' || roleForPath(location.pathname) === 'school_principal') && (
                  <BillingBanner orgId={activeEntity.id} onNavigate={handleNavigate} />
                )}
              <ScreenErrorBoundary resetKey={location.pathname}>
                <Suspense fallback={<ScreenLoading />}>{renderScreen()}</Suspense>
              </ScreenErrorBoundary>
            </DataProvider>
          )}
        </main>

        {/* Right Desktop Sidebar & Mobile Full Drawer */}
        <Sidebar
          currentRole={currentRole}
          currentScreen={currentScreen}
          activeEntity={viewEntity}
          onNavigate={handleNavigate}
          isMobileOpen={isMobileDrawerOpen}
          onMobileClose={() => setIsMobileDrawerOpen(false)}
        />
      </div>

      {/* 3. Mobile Bottom Navigation Bar (For touch screens) */}
      <MobileBottomNav
        currentRole={currentRole}
        currentScreen={currentScreen}
        onNavigate={handleNavigate}
        onOpenAI={() => setIsAIOpen(true)}
        onOpenDrawer={() => setIsMobileDrawerOpen(true)}
      />

      {/* 4. Global Floating AI Assistant Button (signed-in users only) */}
      {currentRole !== 'visitor' && currentRole !== 'student' && (
      <button
        onClick={() => setIsAIOpen(true)}
        className="fixed bottom-20 lg:bottom-6 left-5 z-40 bg-[#1E3A5F] hover:bg-[#152a45] text-white p-3 sm:p-3.5 rounded-full shadow-2xl flex items-center gap-2 cursor-pointer transition-all active:scale-95 group border-2 border-emerald-400"
        title="افتح المساعد الذكي"
      >
        <Sparkles className="w-5 h-5 text-emerald-400 animate-pulse" />
        <span className="hidden sm:inline font-bold text-xs pr-1">مساعد دِقّـة الذكي</span>
      </button>
      )}

      <Toaster />

      {/* Install-as-app invitation (not on the student submission page) */}
      {currentRole !== 'student' && (
        <InstallAppBanner aboveBottomNav={currentRole !== 'visitor'} />
      )}

      {/* 5. Contextual AI Drawer */}
      {currentRole !== 'visitor' && currentRole !== 'student' && (
      <DataProvider org={viewEntity} real={isReal} teacherView={isReal && isOwnerTeacherView}>
      <AIAssistantDrawer
        isOpen={isAIOpen || currentScreen === 'C4'}
        onClose={() => {
          setIsAIOpen(false);
          if (currentScreen === 'C4') {
            setCurrentScreen('C_HUB');
          }
        }}
        currentScreen={currentScreen}
        onNavigate={handleNavigate}
      />
      </DataProvider>
      )}
    </div>
  );
}
