export type UserRole = 
  | 'visitor' 
  | 'student' 
  | 'teacher' 
  | 'school_principal' 
  | 'school_admin' 
  | 'platform_admin';

export type EntityType = 'individual_teacher' | 'school' | 'learning_center';
export type EntityRole = 'owner' | 'teacher';

export interface Entity {
  id: string;
  name: string;
  type: EntityType;
  logo?: string;
  role: EntityRole;
  billingPlan: 'monthly_per_student' | 'yearly_contract';
  pricePerStudent: number;
  currency: string;
  activeStudentsCount: number;
  region: string;
  principalOrOwnerName: string;
  /** Real mode: new sign-ups wait for platform-admin approval; an admin can disable an organization. */
  status?: 'pending' | 'active' | 'disabled';
  statusNote?: string;
}

export type ScreenId = 
  // Group A: Visitor & Student
  | 'A1' // الصفحة التعريفية
  | 'A2' // الأسعار
  | 'A3' // إنشاء حساب
  | 'A4' // تسجيل الدخول
  | 'A5' // صفحة تسليم الطالب
  // Group B: Teacher & School
  | 'B1' // الرئيسية (لوحة المتابعة)
  | 'B2' // المجموعات والصفوف
  | 'B3' // ملف الطالب
  | 'B4' // الواجبات والامتحانات
  | 'B5' // إنشاء واجب/امتحان ومعايير التصحيح
  | 'B6' // طباعة أوراق الإجابة QR
  | 'B7' // رفع الأوراق
  | 'B8' // مراجعة التصحيح
  | 'B9' // نتائج الامتحان وتحليل المجموعة
  | 'B10' // معاينة تقرير ولي الأمر والإرسال
  | 'B11' // الاشتراك والفواتير (للمدرس أو مدير المدرسة فقط)
  | 'B12' // الورقة المصححة
  | 'B14' // شاشة وين وصلنا في المنهاج
  | 'B15' // تشخيص وتحليلات الأستاذ الشاملة (افهم طلابك، أين تركز، والشيء الذي يحتاج تقوية)
  | 'SUPPORT' // الدعم الفني والمساعدة (للمعلم والمدرسة)
  // Group C: AI Tools
  | 'C_HUB' // مركز الأدوات الذكية
  | 'C1' // توليد امتحان
  | 'C2' // تمارين علاجية وشرح الخطأ
  | 'C3' // بنك الأسئلة
  | 'C4' // المساعد الذكي (نافذة محادثة)
  | 'C5' // تحويل امتحان ورقي قديم
  | 'C6' // تجميع الإجابات المتشابهة
  | 'C7' // خطة مذاكرة وبطاقات مراجعة
  | 'C8' // الطلاب المعرّضون للخطر
  | 'C9' // الرد الآلي لأولياء الأمور
  | 'C_FILES' // ملفاتي ومراجعي
  // Group D: School Principal
  | 'D1' // لوحة مدير المدرسة
  | 'D2' // المعلمون والصفوف
  | 'D3' // تقرير المدرسة
  | 'D4' // مقارنة المجموعات والمعلمين
  // Group E: Platform Super Admin
  | 'E1' // لوحة مدير المنصة
  | 'E2' // العملاء والفواتير والباقات
  | 'E3' // جودة التصحيح والتكلفة
  | 'E4' // إدارة المناهج والكتب
  | 'E5' // إدارة تذاكر الدعم الفني ومساندة المعلمين
  | 'E6'; // إدارة وإعدادات الصفحة التعريفية (Landing Page CMS)

// --- Curriculum Structure: منهج ← صف ← مادة ← وحدة ← درس ← نواتج تعلّم ---
export type LessonProgressStatus = 'not_taught' | 'taught' | 'taught_and_examined' | 'examined';

export interface Lesson {
  id: string;
  title: string;
  order: number;
  learningOutcomes?: string[];
  outcomes?: string[];
  keyTerms?: string[];
  termsAndSymbols?: string[];
  symbols?: string[];
  questionBankCount?: number;
  questionCount?: number;
  avgMastery?: number;
}

export interface Unit {
  id: string;
  title: string;
  order: number;
  lessons: Lesson[];
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  status: 'published' | 'draft';
  units: Unit[];
}

export interface Grade {
  id: string;
  name: string;
  stage: 'elementary' | 'middle' | 'secondary';
  subjects: Subject[];
}

export interface Curriculum {
  id: string;
  name: string;
  country: string;
  currency: string;
  currencySymbol: string;
  isAvailable?: boolean;
  grades: Grade[];
}

export interface TeacherFile {
  id: string;
  title: string;
  type?: 'summary' | 'worksheet' | 'notes' | 'exam';
  fileType: 'pdf' | 'image' | 'doc';
  curriculumId: string;
  gradeId: string;
  subjectId: string;
  lessonId: string;
  lessonName: string;
  uploadDate: string;
  size?: string;
  fileSize?: string;
}

export type QuestionSource = 'past_ministerial' | 'ministerial' | 'teacher_file' | 'teacher' | 'ai_generated';

export interface BankQuestion {
  id: string;
  text: string;
  curriculumId: string;
  gradeId: string;
  subjectId: string;
  unitId?: string;
  lessonId: string;
  lesson?: string;
  lessonName?: string;
  unit?: string;
  learningOutcome: string;
  source: QuestionSource;
  ministerialYear?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  type?: string;
  historicalPassRate?: number;
  isVerifiedInCurriculum?: boolean;
}

export interface Student {
  id: string;
  name: string;
  group: string;
  parentPhone: string;
  studentPhone?: string;
  studentCode: string;
  latestScore: number;
  totalScore: number;
  trend: 'up' | 'down' | 'steady';
  parentApproval: boolean;
  expectedTawjihiRange?: string; // e.g. "78 - 85"
  status: 'active' | 'at_risk' | 'excellent';
  weakLessons: string[];
}

export interface Group {
  id: string;
  name: string;
  type: string; // e.g. توجيهي علمي، توجيهي صناعي
  curriculumId: string;
  gradeId: string;
  subjectId: string;
  curriculumName: string;
  gradeName: string;
  subjectName: string;
  studentCount: number;
  avgScore: number;
  schedule: string;
  totalLessonsCount: number;
  taughtLessonsCount: number;
}

export interface Exam {
  id: string;
  title: string;
  type: 'exam' | 'homework';
  subject: string;
  group: string;
  date: string;
  totalScore: number;
  uploadedCount: number;
  totalStudents: number;
  status: 'awaiting_papers' | 'grading' | 'needs_review' | 'completed' | 'reports_sent';
  submissionMode: 'link' | 'teacher_scan';
  autoSendReports: boolean;
  questionsCount: number;
}

export interface QuestionRubric {
  id: string;
  questionNumber: number;
  text: string;
  type: 'multiple_choice' | 'short_answer' | 'problem_solving' | 'essay';
  maxScore: number;
  lesson: string;
  modelAnswer: string;
  criteria: {
    description: string;
    points: number;
  }[];
}

export interface GradingItem {
  id: string;
  examId: string;
  studentId: string;
  studentName: string;
  studentCode: string;
  questionNumber: number;
  questionText: string;
  lesson: string;
  studentAnswerImage: string;
  aiTranscription: string;
  modelAnswer: string;
  maxScore: number;
  aiSuggestedScore: number;
  teacherScore: number;
  confidence: 'high' | 'medium' | 'low';
  isReviewed: boolean;
  criteriaChecks: {
    criterion: string;
    met: boolean;
    points: number;
  }[];
  handwrittenNote: string;
  /** Why the AI gave this score (shown to the teacher only). */
  aiReason?: string;
  subjectType?: 'math' | 'science' | 'english_writing';
  writingFeedback?: {
    grammarErrors: { text: string; correction: string; note: string }[];
    spellingErrors: { text: string; correction: string }[];
    vocabSuggestions: { original: string; suggested: string }[];
    structureBand: number; // e.g. 4/5
    rephrasedVersion: string;
  };
}

export interface SchoolTeacher {
  id: string;
  name: string;
  subject: string;
  classes: string[];
  status: 'active' | 'inactive';
  phone: string;
  lastPaperUpload: string;
}

export interface SchoolClass {
  id: string;
  grade: string; // e.g. الصف السادس
  section: string; // أ
  studentCount: number;
  assignedTeacher: string;
  avgScore: number;
}

export interface PlatformClient {
  id: string;
  name: string;
  type: 'teacher' | 'school';
  studentsCount: number;
  plan: string;
  paymentStatus: 'paid' | 'pending_confirmation' | 'overdue';
  lastPaymentDate: string;
  receiptImage?: string;
  amount: number;
}

export interface StudentTuitionRecord {
  id: string;
  studentId: string;
  studentName: string;
  group: string;
  parentPhone: string;
  monthlyFee: number; // e.g. 150 ILS
  paidAmount: number;
  status: 'paid' | 'partial' | 'unpaid';
  lastPaymentDate?: string;
  receiptNumber?: string;
  notes?: string;
}

export interface CustomSubscriptionPlan {
  id: string;
  name: string;
  target: 'schools' | 'teachers' | 'enterprise';
  billingCycle: 'monthly' | 'yearly';
  pricePerStudent: number; // in ILS
  minStudents?: number;
  features: string[];
  isActive: boolean;
  isPopular?: boolean;
  notes?: string;
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  senderName: string;
  senderRole: 'teacher' | 'school' | 'student';
  entityName: string;
  entityType: 'individual_teacher' | 'school' | 'learning_center';
  phone: string;
  subject: string;
  category: 'ai_grading' | 'qr_printing' | 'whatsapp_reports' | 'financial' | 'curriculum' | 'other';
  priority: 'urgent' | 'high' | 'normal';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  createdAt: string;
  description: string;
  attachedExamOrPaper?: string;
  replies?: Array<{
    id: string;
    sender: 'user' | 'support_agent';
    senderName: string;
    message: string;
    time: string;
  }>;
}

// --- Landing Page CMS Configuration ---
export interface LandingHeroConfig {
  announcementBadge: string;
  headline: string;
  subheadline: string;
  primaryCtaText: string;
  secondaryCtaText: string;
  sampleExamTitle: string;
  sampleStudentName: string;
  sampleExamScore: string;
  sampleTeacherNote: string;
}

export interface LandingAudienceCard {
  title: string;
  subtitle: string;
  exampleTitle: string;
  exampleText: string;
  features: string[];
  buttonText: string;
}

export interface LandingHowItWorksStep {
  num: string;
  title: string;
  desc: string;
}

export interface LandingFeatureItem {
  title: string;
  desc: string;
}

export interface LandingFaqItem {
  q: string;
  a: string;
}

export interface LandingCurriculaConfig {
  badge: string;
  title: string;
  description: string;
  palestineNotice: string;
  upcomingNotice: string;
}

export interface LandingPageConfig {
  hero: LandingHeroConfig;
  whoIsItFor: {
    sectionBadge: string;
    sectionTitle: string;
    sectionSubtitle: string;
    tutor: LandingAudienceCard;
    school: LandingAudienceCard;
    center: LandingAudienceCard;
  };
  curricula: LandingCurriculaConfig;
  howItWorks: {
    sectionBadge: string;
    sectionTitle: string;
    sectionSubtitle: string;
    steps: LandingHowItWorksStep[];
  };
  features: {
    sectionBadge: string;
    sectionTitle: string;
    sectionSubtitle: string;
    items: LandingFeatureItem[];
  };
  faqs: {
    sectionBadge: string;
    sectionTitle: string;
    sectionSubtitle: string;
    items: LandingFaqItem[];
  };
  ctaBanner: {
    title: string;
    subtitle: string;
    buttonText: string;
  };
  footer: {
    copyright: string;
    contactPhone: string;
    contactEmail: string;
    whatsappNumber: string;
  };
  sectionVisibility: {
    hero: boolean;
    whoIsItFor: boolean;
    curricula: boolean;
    howItWorks: boolean;
    features: boolean;
    faqs: boolean;
    ctaBanner: boolean;
  };
}

