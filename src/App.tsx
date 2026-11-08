import React, { useState } from 'react';
import { UserRole, ScreenId, Entity } from './types';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { MobileBottomNav } from './components/MobileBottomNav';
import { AIAssistantDrawer } from './components/AIAssistantDrawer';
import { MOCK_ENTITIES } from './mockData';

// Group A Components
import { LandingPage } from './components/groupA/LandingPage';
import { PricingPage } from './components/groupA/PricingPage';
import { RegisterPage } from './components/groupA/RegisterPage';
import { LoginPage } from './components/groupA/LoginPage';
import { StudentSubmissionPage } from './components/groupA/StudentSubmissionPage';

// Group B Components
import { TeacherDashboard } from './components/groupB/TeacherDashboard';
import { GroupsStudentsPage } from './components/groupB/GroupsStudentsPage';
import { StudentProfilePage } from './components/groupB/StudentProfilePage';
import { ExamsListPage } from './components/groupB/ExamsListPage';
import { CreateExamPage } from './components/groupB/CreateExamPage';
import { PrintAnswerSheetsPage } from './components/groupB/PrintAnswerSheetsPage';
import { UploadPapersPage } from './components/groupB/UploadPapersPage';
import { GradingReviewPage } from './components/groupB/GradingReviewPage';
import { ExamAnalyticsPage } from './components/groupB/ExamAnalyticsPage';
import { ParentReportPage } from './components/groupB/ParentReportPage';
import { SubscriptionPage } from './components/groupB/SubscriptionPage';
import { CorrectedPaperViewPage } from './components/groupB/CorrectedPaperViewPage';
import WhereWeReachedPage from './components/groupB/WhereWeReachedPage';
import { TeacherDiagnosticAnalyticsPage } from './components/groupB/TeacherDiagnosticAnalyticsPage';

// Common Components
import { TechnicalSupportPage } from './components/common/TechnicalSupportPage';

// Group C Components
import { AIToolsHubPage } from './components/groupC/AIToolsHubPage';
import { GenerateExamTool } from './components/groupC/GenerateExamTool';
import { RemedialExercisesTool } from './components/groupC/RemedialExercisesTool';
import { QuestionBankTool } from './components/groupC/QuestionBankTool';
import { ConvertOldExamTool, ClusterGradingTool } from './components/groupC/ConvertOldExamTool';
import { StudyPlanTool, AtRiskStudentsTool, ParentAutoReplyTool } from './components/groupC/AdvancedTools';
import { TeacherFilesSection } from './components/groupC/TeacherFilesSection';

// Group D Components
import { SchoolDashboard, TeachersClassesPage, SchoolReportPage, TeacherComparisonPage } from './components/groupD/SchoolViews';

// Group E Components
import { PlatformAdminDashboard, AdminBillingPage, GradingQualityPage } from './components/groupE/PlatformAdminViews';
import { CurriculumManagementPage } from './components/groupE/CurriculumManagementPage';

// Floating AI trigger icon
import { Sparkles } from 'lucide-react';

export default function App() {
  // Production default: starts on Landing Page as visitor
  const [currentRole, setCurrentRole] = useState<UserRole>('visitor');
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('A1');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('s1');
  const [isEnglish, setIsEnglish] = useState<boolean>(false);
  const [isAIOpen, setIsAIOpen] = useState<boolean>(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<boolean>(false);

  // Active Entity state for multi-tenancy & account switcher
  const [activeEntity, setActiveEntity] = useState<Entity>(MOCK_ENTITIES[0]);

  const handleNavigate = (screen: ScreenId) => {
    // School teachers cannot navigate to B11 (Subscriptions & Invoices)
    if (screen === 'B11' && activeEntity.type === 'school' && activeEntity.role === 'teacher') {
      alert('إدارة الاشتراكات والفواتير خاصة بإدارة المدرسة فقط وغير متاحة لمعلمي المدرسة.');
      return;
    }
    setCurrentScreen(screen);
    setIsMobileDrawerOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    if (entity.type === 'school') {
      if (entity.role === 'owner') {
        setCurrentRole('school_admin');
        setCurrentScreen('D1');
      } else {
        setCurrentRole('teacher');
        setCurrentScreen('B1');
      }
    } else {
      setCurrentRole('teacher');
      setCurrentScreen('B1');
    }
  };

  const renderScreen = () => {
    switch (currentScreen) {
      // Group A
      case 'A1':
        return <LandingPage onNavigate={handleNavigate} onOpenAI={() => setIsAIOpen(true)} currentRole={currentRole} />;
      case 'A2':
        return <PricingPage onNavigate={handleNavigate} />;
      case 'A3':
        return <RegisterPage onNavigate={handleNavigate} onRoleChange={handleRoleChange} />;
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
            onSelectStudent={(id) => setSelectedStudentId(id)}
          />
        );
      case 'B3':
        return <StudentProfilePage studentId={selectedStudentId} onNavigate={handleNavigate} />;
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
        return <SubscriptionPage onNavigate={handleNavigate} activeEntity={activeEntity} />;
      case 'B12':
        return <CorrectedPaperViewPage onNavigate={handleNavigate} />;
      case 'B14':
        return (
          <WhereWeReachedPage 
            onNavigate={handleNavigate} 
            onOpenExamGen={() => handleNavigate('C1')} 
          />
        );
      case 'B15':
        return <TeacherDiagnosticAnalyticsPage onNavigate={handleNavigate} />;

      // Group C
      case 'C_HUB':
        return <AIToolsHubPage onNavigate={handleNavigate} onOpenAI={() => setIsAIOpen(true)} />;
      case 'C1':
        return <GenerateExamTool onNavigate={handleNavigate} />;
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
        return <CurriculumManagementPage onNavigate={handleNavigate} />;
      case 'E5':
        return <PlatformAdminDashboard onNavigate={handleNavigate} initialTab="support" />;
      case 'E6':
        return <PlatformAdminDashboard onNavigate={handleNavigate} initialTab="landing" />;

      // Common / Global
      case 'SUPPORT':
        return <TechnicalSupportPage onNavigate={handleNavigate} activeEntity={activeEntity} />;

      default:
        return <LandingPage onNavigate={handleNavigate} onOpenAI={() => setIsAIOpen(true)} currentRole={currentRole} />;
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
        onSwitchEntity={(entityId: string) => {
          const ent = MOCK_ENTITIES.find(e => e.id === entityId) || MOCK_ENTITIES[0];
          handleSwitchEntity(ent);
        }}
        onNavigate={handleNavigate}
        onOpenAI={() => setIsAIOpen(true)}
        onOpenMobileMenu={() => setIsMobileDrawerOpen(true)}
        onLogout={() => {
          setCurrentRole('visitor');
          setCurrentScreen('A1');
        }}
      />

      {/* 2. Main Workspace Layout with Right Sidebar for Desktop & Mobile Drawer */}
      <div className={`flex-1 flex w-full mx-auto ${currentScreen === 'A1' ? '' : 'max-w-7xl'}`}>
        {/* Main Content Viewport */}
        <main className={currentScreen === 'A1' ? 'flex-1 min-w-0' : 'flex-1 p-3 sm:p-6 lg:p-8 min-w-0'}>
          {renderScreen()}
        </main>

        {/* Right Desktop Sidebar & Mobile Full Drawer */}
        <Sidebar
          currentRole={currentRole}
          currentScreen={currentScreen}
          activeEntity={activeEntity}
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

      {/* 4. Global Floating AI Assistant Button */}
      <button
        onClick={() => setIsAIOpen(true)}
        className="fixed bottom-20 lg:bottom-6 left-5 z-40 bg-[#1E3A5F] hover:bg-[#152a45] text-white p-3 sm:p-3.5 rounded-full shadow-2xl flex items-center gap-2 cursor-pointer transition-all active:scale-95 group border-2 border-emerald-400"
        title="افتح المساعد الذكي"
      >
        <Sparkles className="w-5 h-5 text-emerald-400 animate-pulse" />
        <span className="hidden sm:inline font-bold text-xs pr-1">مساعد دِقّـة الذكي</span>
      </button>

      {/* 5. Contextual AI Drawer */}
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
    </div>
  );
}
