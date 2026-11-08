import {
  Student,
  Group,
  Exam,
  QuestionRubric,
  GradingItem,
  SchoolTeacher,
  SchoolClass,
  PlatformClient,
  Curriculum,
  Entity,
  TeacherFile,
  BankQuestion,
  LessonProgressStatus,
  CustomSubscriptionPlan,
  SupportTicket,
  LandingPageConfig
} from './types';

export const PLATFORM_CONFIG = {
  name: 'منصة دقة',
  tagline: 'صحّح واجبات وامتحانات طلابك في دقائق',
  country: 'فلسطين',
  currency: 'شيكل',
  currencySymbol: '₪',
  currencyCode: 'ILS',
  // Approximate local-currency value of 1 US dollar, used to show AI grading cost.
  usdExchangeRate: 3.7,
  pricing: {
    tutorMonthlyPerStudent: 5, // 5 ILS per student per month
    schoolYearlyPerStudent: 50, // 50 ILS per student per year
    schoolTermInstallment: 25, // 25 ILS per term
    centerYearlyPerStudent: 45, // 45 ILS per student per year
  },
  supportedCurriculaSummary: 'المنهاج الفلسطيني متاح الآن (الصفوف 1–12)، ومناهج أخرى قريباً (الأردني، السعودي، المصري)',
};

// --- Multi-Tenant Entities (جهـات الحسابات) ---
export const MOCK_ENTITIES: Entity[] = [
  {
    id: 'e_tutor_1',
    name: 'أكاديمية أ. محمد المصري (مدرّس خصوصي)',
    type: 'individual_teacher',
    logo: '/dequa-logo.png',
    role: 'owner',
    billingPlan: 'monthly_per_student',
    pricePerStudent: 5,
    currency: '₪',
    activeStudentsCount: 180,
    region: 'غزة، فلسطين',
    principalOrOwnerName: 'أ. محمد المصري',
  },
  {
    id: 'e_school_1',
    name: 'مدرسة الأمل الخاصة (الصفوف 1 - 9)',
    type: 'school',
    logo: '/dequa-logo.png',
    role: 'teacher', // When viewed as teacher
    billingPlan: 'yearly_contract',
    pricePerStudent: 50,
    currency: '₪',
    activeStudentsCount: 280,
    region: 'غزة، الرمال الجنوبي',
    principalOrOwnerName: 'أ. سميرة عكيلة',
  },
  {
    id: 'e_center_1',
    name: 'مركز الروّاد التعليمي',
    type: 'learning_center',
    logo: '/dequa-logo.png',
    role: 'owner',
    billingPlan: 'yearly_contract',
    pricePerStudent: 45,
    currency: '₪',
    activeStudentsCount: 420,
    region: 'رام الله، فلسطين',
    principalOrOwnerName: 'د. خالد التميمي',
  },
];

export const MOCK_USER_SESSION = {
  id: 'u_mohammed',
  name: 'أ. محمد المصري',
  email: 'almassri.math@gmail.com',
  phone: '0599123456',
  activeEntityId: 'e_tutor_1',
  availableEntityIds: ['e_tutor_1', 'e_school_1'],
};

// --- Full Curricula Hierarchy: منهج ← صف ← مادة ← وحدة ← درس ← نواتج تعلّم ---
export const CURRICULA_DATA: Curriculum[] = [
  {
    id: 'palestinian',
    name: 'المنهاج الفلسطيني المعتمد',
    country: 'فلسطين',
    currency: 'شيكل',
    currencySymbol: '₪',
    isAvailable: true,
    grades: [
      {
        id: 'grade_12',
        name: 'الصف الثاني عشر (التوجيهي)',
        stage: 'secondary',
        subjects: [
          {
            id: 'math_scientific',
            name: 'الرياضيات (الفرع العلمي والصناعي)',
            code: 'MATH-12-SCI',
            status: 'published',
            units: [
              {
                id: 'unit_12_calc',
                title: 'الوحدة الأولى: حساب التفاضل والتطبيقات',
                order: 1,
                lessons: [
                  {
                    id: 'les_12_calc_1',
                    title: 'قواعد الاشتقاق والاشتقاق الضمني',
                    order: 1,
                    learningOutcomes: [
                      'إيجاد مشتقة الاقترانات المركبة بقاعدة السلسلة',
                      'تطبيق الاشتقاق الضمني على معادلات المنحنيات والعلاقات الصريحة',
                      'إيجاد المشتقات ذات الرتب العليا للمنحنيات الضمنية'
                    ],
                    keyTerms: ['الاشتقاق الضمني', 'قاعدة السلسلة', 'مشتقات الرتب العليا'],
                    symbols: ['ص\'', 'دص/دس', 'د²ص/دس²', 'س² + ص² = ر²'],
                    questionBankCount: 16
                  },
                  {
                    id: 'les_12_calc_2',
                    title: 'تطبيقات هندسية وفيزيائية للمشتقة',
                    order: 2,
                    learningOutcomes: [
                      'إيجاد ميل المماس والناظم لمنحنى الاقتران عند نقطة التماس',
                      'كتابة معادلة المماس والعمودي على المماس',
                      'حساب السرعة اللحظية والتسارع اللحظي لحركة جسيم'
                    ],
                    keyTerms: ['ميل المماس', 'المستقيم العمودي', 'السرعة اللحظية', 'التسارع'],
                    symbols: ['م = ص\'(س₁)', 'ص - ص₁ = م(س - س₁)', 'ع(ن) = ف\'(ن)', 'ت(ن) = ع\'(ن)'],
                    questionBankCount: 12
                  },
                  {
                    id: 'les_12_calc_3',
                    title: 'المعدلات المرتبطة بالزمن',
                    order: 3,
                    learningOutcomes: [
                      'نمذجة المسائل الهندسية والفيزيائية بعلاقة رابطة مع الزمن ن',
                      'اشتقاق العلاقات الضمنية بالنسبة للزمن وإيجاد معدل التغير المطلوب'
                    ],
                    keyTerms: ['معدل التغير الزمني', 'العلاقة المساعدة', 'تشابه المثلثات', 'مبرهنة فيثاغورس'],
                    symbols: ['دس/دن', 'دص/دن', 'دح/دن', 'د نق/دن'],
                    questionBankCount: 10
                  },
                  {
                    id: 'les_12_calc_4',
                    title: 'نظريتا رول والقيمة المتوسطة',
                    order: 4,
                    learningOutcomes: [
                      'التحقق من شروط نظرية رول على فترة مغلقة',
                      'إيجاد قيمة جـ التي تحقق نظرية القيمة المتوسطة وتفسيرها هندسياً'
                    ],
                    keyTerms: ['فترة مغلقة ومفتوحة', 'الاتصال وقابلية الاشتقاق', 'مماس أفقي'],
                    symbols: ['ق\'(جـ) = 0', '[أ، ب]', '(أ، ب)', 'ق(ب) - ق(أ) / ب - أ'],
                    questionBankCount: 8
                  },
                  {
                    id: 'les_12_calc_5',
                    title: 'تطبيقات القيم القصوى والمثلى',
                    order: 5,
                    learningOutcomes: [
                      'تحديد النقاط الحرجة وفترات التزايد والتناقص باستخدام المشتقة الأولى',
                      'اختبار المشتقة الثانية لتحديد نوع النقطة الحرجة ونقاط الانعطاف',
                      'حل مسائل التطبيقات الحياتية الهندسية والاقتصادية للقيم القصوى'
                    ],
                    keyTerms: ['القيم القصوى المحلية والمطلقة', 'نقطة الانعطاف', 'التقعر للأعلى والأسفل', 'النقاط الحرجة'],
                    symbols: ['ق\'(س) = 0', 'ق\'\'(س) > 0', 'ق\'\'(س) < 0'],
                    questionBankCount: 14
                  }
                ]
              },
              {
                id: 'unit_12_integ',
                title: 'الوحدة الثانية: حساب التكامل وتطبيقاته',
                order: 2,
                lessons: [
                  {
                    id: 'les_12_integ_1',
                    title: 'التكامل غير المحدود وقواعده الأساسية',
                    order: 1,
                    learningOutcomes: [
                      'إيجاد الاقتران البديل لقوى المتغير س والاقترانات المثلثية والأسية',
                      'تطبيق الخصائص الخطية للتكامل غير المحدود وحساب ثابت التكامل جـ'
                    ],
                    keyTerms: ['التكامل غير المحدود', 'ثابت التكامل جـ', 'الاقتران البديل'],
                    symbols: ['∫ ق(س) دس', 'س^(ن+1)/(ن+1) + جـ', 'هـ^(أس)', 'لو_هـ |س|'],
                    questionBankCount: 15
                  },
                  {
                    id: 'les_12_integ_2',
                    title: 'التكامل المحدود وخصائصه',
                    order: 2,
                    learningOutcomes: [
                      'حساب قيمة التكامل المحدود بالتعويض بحدود التكامل',
                      'تطبيق خاصية الإضافة والمقارنة والتماثل للاقتران الزوجي والفردي'
                    ],
                    keyTerms: ['حدود التكامل', 'خاصية الإضافة', 'مبرهنة الأساس في التفاضل والتكامل'],
                    symbols: ['[أ, ب]∫ ق(س) دس', 'ت(ب) - ت(أ)'],
                    questionBankCount: 11
                  },
                  {
                    id: 'les_12_integ_3',
                    title: 'طرق التكامل: التعويض والأجزاء والكسور الجزئية',
                    order: 3,
                    learningOutcomes: [
                      'اختيار الفرض المناسب للتكامل بالتعويض في الاقترانات المركبة',
                      'تطبيق قانون التكامل بالأجزاء على حاصل ضرب اقترانين من نوعين مختلفين',
                      'تحليل المقام إلى عوامل خطية واستخدام الكسور الجزئية'
                    ],
                    keyTerms: ['التكامل بالتعويض', 'التكامل بالأجزاء', 'الكسور الجزئية'],
                    symbols: ['∫ هـ دك = هـ ك - ∫ ك دهـ', 'ص = ع(س)', 'دص = ع\'(س) دس'],
                    questionBankCount: 18
                  }
                ]
              }
            ]
          },
          {
            id: 'english_12',
            name: 'اللغة الإنجليزية (English for Palestine)',
            code: 'ENG-12',
            status: 'published',
            units: [
              {
                id: 'unit_12_eng_1',
                title: 'Unit 1: A Fly on the Wall (Communication)',
                order: 1,
                lessons: [
                  {
                    id: 'les_12_eng_1',
                    title: 'Reading & Vocabulary: Interpersonal Skills',
                    order: 1,
                    learningOutcomes: [
                      'Analyze academic passages about non-verbal communication',
                      'Master high-frequency collocations and prefixes'
                    ],
                    keyTerms: ['interpersonal', 'non-verbal communication', 'collocation', 'rapport'],
                    symbols: ['N/A'],
                    questionBankCount: 10
                  },
                  {
                    id: 'les_12_eng_2',
                    title: 'Grammar: Present Perfect vs Past Simple in Context',
                    order: 2,
                    learningOutcomes: [
                      'Distinguish between finished past actions and actions connected to the present',
                      'Use present perfect continuous for duration and evidence'
                    ],
                    keyTerms: ['tense consistency', 'aspect', 'since vs for', 'state verbs'],
                    symbols: ['has/have + P.P', 'has/have + been + V-ing'],
                    questionBankCount: 14
                  }
                ]
              },
              {
                id: 'unit_12_eng_2',
                title: 'Unit 2: Writing & Rhetoric (Essays & Reports)',
                order: 2,
                lessons: [
                  {
                    id: 'les_12_eng_3',
                    title: 'Essay Writing: Argumentative & Opinion Essay',
                    order: 1,
                    learningOutcomes: [
                      'Construct a coherent 4-paragraph argumentative essay with counterarguments',
                      'Use cohesive devices and advanced transitional phrases'
                    ],
                    keyTerms: ['thesis statement', 'topic sentence', 'cohesive devices', 'counter-argument'],
                    symbols: ['¶1 Intro, ¶2 Pro, ¶3 Con, ¶4 Conclusion'],
                    questionBankCount: 8
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        id: 'grade_6',
        name: 'الصف السادس الأساسي',
        stage: 'middle',
        subjects: [
          {
            id: 'math_6',
            name: 'الرياضيات (التعليم الأساسي)',
            code: 'MATH-6',
            status: 'published',
            units: [
              {
                id: 'unit_6_int',
                title: 'الوحدة الأولى: الأعداد الصحيحة والعمليات عليها',
                order: 1,
                lessons: [
                  {
                    id: 'les_6_int_1',
                    title: 'مفهوم العدد الصحيح وتمثيله على خط الأعداد',
                    order: 1,
                    learningOutcomes: [
                      'التعرف على مفهوم الصفر والأعداد الموجبة والسالبة في المواقف الحياتية',
                      'تمثيل الأعداد الصحيحة على خط الأعداد بدقة وتحديد النظير الجمعي'
                    ],
                    keyTerms: ['العدد الصحيح الموجب', 'العدد الصحيح السالب', 'الصفر', 'النظير الجمعي'],
                    symbols: ['+', '-', 'ص⁺', 'ص⁻', 'خط الأعداد'],
                    questionBankCount: 12
                  },
                  {
                    id: 'les_6_int_2',
                    title: 'مقارنة الأعداد الصحيحة وترتيبها والقيمة المطلقة',
                    order: 2,
                    learningOutcomes: [
                      'المقارنة بين عددين صحيحين باستخدام الرموز > و < و =',
                      'ترتيب مجموعة من الأعداد الصحيحة تصاعدياً وتنازلياً',
                      'تعريف وحساب القيمة المطلقة لعدد صحيح'
                    ],
                    keyTerms: ['القيمة المطلقة', 'الترتيب التصاعدي', 'الترتيب التنازلي'],
                    symbols: ['|س|', '>', '<', '='],
                    questionBankCount: 9
                  },
                  {
                    id: 'les_6_int_3',
                    title: 'جمع الأعداد الصحيحة وطرحها',
                    order: 3,
                    learningOutcomes: [
                      'إجراء جمع عددين صحيحين لهما نفس الإشارة أو إشارات مختلفة',
                      'تحويل عملية الطرح إلى جمع النظير الجمعي وتطبيق قواعد الإشارات'
                    ],
                    keyTerms: ['قاعدة الإشارات', 'المحايد الجمعي', 'النظير الجمعي'],
                    symbols: ['أ + (-ب)', '-(-س) = +س'],
                    questionBankCount: 14
                  }
                ]
              },
              {
                id: 'unit_6_geom',
                title: 'الوحدة الثانية: الهندسة والقياس',
                order: 2,
                lessons: [
                  {
                    id: 'les_6_geom_1',
                    title: 'محيط الدائرة ومساحتها',
                    order: 1,
                    learningOutcomes: [
                      'استنتاج النسبة التقريبية ط (باي) عملياً',
                      'حساب محيط الدائرة بمعلومية نصف القطر أو القطر',
                      'حساب مساحة سطح الدائرة وتطبيقاتها الحياتية'
                    ],
                    keyTerms: ['القطر', 'نصف القطر', 'محيط الدائرة', 'مساحة الدائرة', 'النسبة التقريبية باي'],
                    symbols: ['نق', 'ق', 'ط (π) ≈ 3.14 أو 22/7', 'محيط = 2 ط نق', 'مساحة = ط نق²'],
                    questionBankCount: 11
                  },
                  {
                    id: 'les_6_geom_2',
                    title: 'مساحة متوازي الأضلاع والمثلث',
                    order: 2,
                    learningOutcomes: [
                      'حساب مساحة متوازي الأضلاع بمعلومية طول القاعدة والارتفاع المناظر',
                      'إيجاد مساحة المثلث كشبه نصف متوازي أضلاع'
                    ],
                    keyTerms: ['طول القاعدة', 'الارتفاع المناظر', 'متوازي الأضلاع'],
                    symbols: ['م = ق × ع', 'م = 1/2 × ق × ع'],
                    questionBankCount: 10
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        id: 'grade_9',
        name: 'الصف التاسع الأساسي',
        stage: 'middle',
        subjects: [
          {
            id: 'tech_9_draft',
            name: 'التكنولوجيا والبرمجة (مسوّدة قيد المراجعة والاعتماد)',
            code: 'TECH-9',
            status: 'draft', // DRAFT: does not show to teachers during signup or group creation
            units: [
              {
                id: 'unit_9_tech_1',
                title: 'الوحدة الأولى: قواعد البيانات ولغة SQL',
                order: 1,
                lessons: [
                  {
                    id: 'les_9_tech_1',
                    title: 'مفاهيم قواعد البيانات والجداول والعلاقات',
                    order: 1,
                    learningOutcomes: ['تصميم جدول قاعدة بيانات سليم'],
                    keyTerms: ['المفتاح الأساسي', 'السجل', 'الحقل'],
                    symbols: ['PK', 'FK'],
                    questionBankCount: 4
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'jordanian',
    name: 'المنهاج الأردني (قريباً)',
    country: 'الأردن',
    currency: 'دينار',
    currencySymbol: 'د.أ',
    grades: []
  },
  {
    id: 'saudi',
    name: 'المنهاج السعودي (قريباً)',
    country: 'المملكة العربية السعودية',
    currency: 'ريال',
    currencySymbol: 'ر.س',
    grades: []
  }
];

export const CURRENT_TEACHER = {
  name: 'أ. محمد المصري',
  title: 'معلم أول رياضيات توجيهي (علمي وصناعي)',
  location: 'غزة، فلسطين',
  phone: '0599123456',
  totalStudents: 180,
  activeGroups: 4,
  currentPlan: 'باقة المعلم المستقل (شهري لكل طالب)',
  monthlyDue: 900, // 180 * 5 NIS
  dueDate: '15 نوفمبر 2026',
};

export const MOCK_GROUPS: Group[] = [
  {
    id: 'g1',
    name: 'مجموعة الأحد والثلاثاء (علمي - أ)',
    type: 'توجيهي علمي',
    curriculumId: 'palestinian',
    gradeId: 'grade_12',
    subjectId: 'math_scientific',
    curriculumName: 'المنهاج الفلسطيني',
    gradeName: 'الصف الثاني عشر (التوجيهي)',
    subjectName: 'الرياضيات (علمي)',
    studentCount: 52,
    avgScore: 84.5,
    schedule: 'الأحد والثلاثاء 4:00 - 6:00 م',
    totalLessonsCount: 8,
    taughtLessonsCount: 3, // 3 taught out of 8
  },
  {
    id: 'g2',
    name: 'مجموعة الإثنين والأربعاء (علمي - ب)',
    type: 'توجيهي علمي',
    curriculumId: 'palestinian',
    gradeId: 'grade_12',
    subjectId: 'math_scientific',
    curriculumName: 'المنهاج الفلسطيني',
    gradeName: 'الصف الثاني عشر (التوجيهي)',
    subjectName: 'الرياضيات (علمي)',
    studentCount: 48,
    avgScore: 79.2,
    schedule: 'الإثنين والأربعاء 4:00 - 6:00 م',
    totalLessonsCount: 8,
    taughtLessonsCount: 2,
  },
  {
    id: 'g3',
    name: 'مجموعة الخميس (صناعي)',
    type: 'توجيهي صناعي',
    curriculumId: 'palestinian',
    gradeId: 'grade_12',
    subjectId: 'math_scientific',
    curriculumName: 'المنهاج الفلسطيني',
    gradeName: 'الصف الثاني عشر (التوجيهي)',
    subjectName: 'الرياضيات (صناعي)',
    studentCount: 42,
    avgScore: 73.8,
    schedule: 'الخميس 3:00 - 6:00 م',
    totalLessonsCount: 8,
    taughtLessonsCount: 2,
  },
  {
    id: 'g4',
    name: 'مجموعة السبت (مكثف متميزين)',
    type: 'توجيهي علمي',
    curriculumId: 'palestinian',
    gradeId: 'grade_12',
    subjectId: 'math_scientific',
    curriculumName: 'المنهاج الفلسطيني',
    gradeName: 'الصف الثاني عشر (التوجيهي)',
    subjectName: 'الرياضيات (علمي)',
    studentCount: 38,
    avgScore: 92.1,
    schedule: 'السبت 10:00 ص - 1:00 م',
    totalLessonsCount: 8,
    taughtLessonsCount: 5,
  },
];

// --- Group Curriculum Progress: Status of lessons for Group G1 ---
export const MOCK_GROUP_PROGRESS_G1: Record<string, { status: LessonProgressStatus; masteryRate?: number }> = {
  les_12_calc_1: { status: 'taught_and_examined', masteryRate: 84 },
  les_12_calc_2: { status: 'taught_and_examined', masteryRate: 78 },
  les_12_calc_3: { status: 'taught', masteryRate: undefined },
  les_12_calc_4: { status: 'not_taught', masteryRate: undefined },
  les_12_calc_5: { status: 'not_taught', masteryRate: undefined },
  les_12_integ_1: { status: 'not_taught', masteryRate: undefined },
  les_12_integ_2: { status: 'not_taught', masteryRate: undefined },
  les_12_integ_3: { status: 'not_taught', masteryRate: undefined },
};

// --- Teacher Reference Files (ملفاتي ومراجعي) ---
export const MOCK_TEACHER_FILES: TeacherFile[] = [
  {
    id: 'tf1',
    title: 'ملخص قوانين الاشتقاق وقاعدة السلسلة - أ. محمد المصري.pdf',
    fileType: 'pdf',
    curriculumId: 'palestinian',
    gradeId: 'grade_12',
    subjectId: 'math_scientific',
    lessonId: 'les_12_calc_1',
    lessonName: 'قواعد الاشتقاق والاشتقاق الضمني',
    uploadDate: '24 أكتوبر 2026',
    size: '1.4 MB',
  },
  {
    id: 'tf2',
    title: 'مذكرة تدريبية: مسائل المعدلات المرتبطة بالزمن وتطبيقاتها.pdf',
    fileType: 'pdf',
    curriculumId: 'palestinian',
    gradeId: 'grade_12',
    subjectId: 'math_scientific',
    lessonId: 'les_12_calc_3',
    lessonName: 'المعدلات المرتبطة بالزمن',
    uploadDate: '30 أكتوبر 2026',
    size: '2.1 MB',
  },
  {
    id: 'tf3',
    title: 'مراجعة المماس والعمودي ونماذج أسئلة وزارية مصنفة.pdf',
    fileType: 'pdf',
    curriculumId: 'palestinian',
    gradeId: 'grade_12',
    subjectId: 'math_scientific',
    lessonId: 'les_12_calc_2',
    lessonName: 'تطبيقات هندسية وفيزيائية للمشتقة',
    uploadDate: '2 نوفمبر 2026',
    size: '1.8 MB',
  },
];

// --- Comprehensive Question Bank with Curriculum Tagging ---
export const MOCK_QUESTION_BANK: BankQuestion[] = [
  {
    id: 'bq1',
    text: 'إذا كان س² + ص² = 25، أوجد د²ص / دس² عند النقطة (3, 4).',
    curriculumId: 'palestinian',
    gradeId: 'grade_12',
    subjectId: 'math_scientific',
    unitId: 'unit_12_calc',
    lessonId: 'les_12_calc_1',
    lesson: 'قواعد الاشتقاق والاشتقاق الضمني',
    unit: 'حساب التفاضل والتطبيقات',
    learningOutcome: 'تطبيق الاشتقاق الضمني على معادلات المنحنيات والعلاقات الصريحة',
    source: 'past_ministerial',
    ministerialYear: 'وزاري 2024 - الدورة الأولى',
    difficulty: 'medium',
    type: 'مسألة مقالية برهانية',
    historicalPassRate: 72,
    isVerifiedInCurriculum: true,
  },
  {
    id: 'bq2',
    text: 'أثبت أن المماس للمنحنى ص = هـ^(2س) عند س = 0 يقطع محور الصادات عند النقطة (0, 1) واكتب معادلته.',
    curriculumId: 'palestinian',
    gradeId: 'grade_12',
    subjectId: 'math_scientific',
    unitId: 'unit_12_calc',
    lessonId: 'les_12_calc_2',
    lesson: 'تطبيقات هندسية وفيزيائية للمشتقة',
    unit: 'حساب التفاضل والتطبيقات',
    learningOutcome: 'إيجاد ميل المماس والناظم لمنحنى الاقتران عند نقطة التماس',
    source: 'teacher_file',
    difficulty: 'easy',
    type: 'إثبات هندسي وتطبيق',
    historicalPassRate: 88,
    isVerifiedInCurriculum: true,
  },
  {
    id: 'bq3',
    text: 'مخروط دائري قائم ينسكب فيه الماء بمعدل 4 سم³/ث، جد معدل تغير ارتفاع الماء عندما يكون نصف قطر السطح 3 سم.',
    curriculumId: 'palestinian',
    gradeId: 'grade_12',
    subjectId: 'math_scientific',
    unitId: 'unit_12_calc',
    lessonId: 'les_12_calc_3',
    lesson: 'المعدلات المرتبطة بالزمن',
    unit: 'حساب التفاضل والتطبيقات',
    learningOutcome: 'نمذجة المسائل الهندسية والفيزيائية بعلاقة رابطة مع الزمن ن',
    source: 'past_ministerial',
    ministerialYear: 'وزاري 2023 - الدورة الثانية',
    difficulty: 'hard',
    type: 'مسألة كلامية معدلات زمنية',
    historicalPassRate: 52,
    isVerifiedInCurriculum: true,
  },
  {
    id: 'bq4',
    text: 'احسب قيمة التكامل المحدود الآتي: ∫ من 0 إلى 1 للاقتران (2س + 3) / √(س² + 3س + 1) دس بالتعويض.',
    curriculumId: 'palestinian',
    gradeId: 'grade_12',
    subjectId: 'math_scientific',
    unitId: 'unit_12_integ',
    lessonId: 'les_12_integ_3',
    lesson: 'طرق التكامل: التعويض والأجزاء والكسور الجزئية',
    unit: 'حساب التكامل وتطبيقاته',
    learningOutcome: 'اختيار المتغير المساعد المناسب للتكامل بالتعويض في الاقترانات المركبة',
    source: 'ai_generated',
    difficulty: 'medium',
    type: 'حساب تكامل بالتعويض',
    historicalPassRate: 79,
    isVerifiedInCurriculum: true,
  },
  {
    id: 'bq5',
    text: 'أوجد ناتج الجمع والتحقق بخط الأعداد: (-14) + (+8) + (-6).',
    curriculumId: 'palestinian',
    gradeId: 'grade_6',
    subjectId: 'math_6',
    unitId: 'unit_6_int',
    lessonId: 'les_6_int_3',
    lesson: 'جمع الأعداد الصحيحة وطرحها',
    unit: 'الأعداد الصحيحة والعمليات عليها',
    learningOutcome: 'إجراء جمع عددين صحيحين لهما نفس الإشارة أو إشارات مختلفة',
    source: 'past_ministerial',
    ministerialYear: 'امتحان موحد للمرحلة الأساسية 2024',
    difficulty: 'easy',
    type: 'حساب وخطوات',
    historicalPassRate: 92,
    isVerifiedInCurriculum: true,
  },
  {
    id: 'bq6',
    text: 'دائرة قطرها 14 سم، احسب محيطها ومساحة سطحها باعتبار النسبة التقريبية ط = 22/7.',
    curriculumId: 'palestinian',
    gradeId: 'grade_6',
    subjectId: 'math_6',
    unitId: 'unit_6_geom',
    lessonId: 'les_6_geom_1',
    lesson: 'محيط الدائرة ومساحتها',
    unit: 'الهندسة والقياس',
    learningOutcome: 'حساب محيط ومساحة الدائرة بمعلومية القطر',
    source: 'teacher_file',
    difficulty: 'easy',
    type: 'مسألة هندسية وتطبيق مباشر',
    historicalPassRate: 86,
    isVerifiedInCurriculum: true,
  },
  {
    id: 'bq7',
    text: 'Complete the sentence with the correct tense: "By the time the bell rang, the teacher _______ (already explain) the whole lesson."',
    curriculumId: 'palestinian',
    gradeId: 'grade_12',
    subjectId: 'english_12',
    unitId: 'unit_12_eng_1',
    lessonId: 'les_12_eng_2',
    lesson: 'Grammar: Present Perfect vs Past Simple in Context',
    unit: 'Unit 1: A Fly on the Wall',
    learningOutcome: 'Distinguish between finished past actions and actions connected to the present',
    source: 'past_ministerial',
    ministerialYear: 'وزاري 2024 - الدورة الأولى',
    difficulty: 'medium',
    type: 'قواعد لغوية',
    historicalPassRate: 75,
    isVerifiedInCurriculum: true,
  },
];

export const MOCK_STUDENTS: Student[] = [
  {
    id: 's1',
    name: 'أحمد محمود المصري',
    group: 'مجموعة الأحد والثلاثاء (علمي - أ)',
    parentPhone: '0599112233',
    studentPhone: '0599887766',
    studentCode: '1042',
    latestScore: 88,
    totalScore: 100,
    trend: 'up',
    parentApproval: true,
    expectedTawjihiRange: '88 - 94',
    status: 'active',
    weakLessons: ['تطبيقات القيم القصوى', 'المعدلات المرتبطة بالزمن'],
  },
  {
    id: 's2',
    name: 'محمود خليل البطش',
    group: 'مجموعة الأحد والثلاثاء (علمي - أ)',
    parentPhone: '0598223344',
    studentPhone: '0598776655',
    studentCode: '1043',
    latestScore: 62,
    totalScore: 100,
    trend: 'down',
    parentApproval: true,
    expectedTawjihiRange: '65 - 72',
    status: 'at_risk',
    weakLessons: ['الاشتقاق الضمني', 'النهايات المثلثية'],
  },
  {
    id: 's3',
    name: 'سارة عبد الرحمن البردويل',
    group: 'مجموعة الإثنين والأربعاء (علمي - ب)',
    parentPhone: '0599334455',
    studentPhone: '0599665544',
    studentCode: '2011',
    latestScore: 96,
    totalScore: 100,
    trend: 'up',
    parentApproval: true,
    expectedTawjihiRange: '95 - 99',
    status: 'excellent',
    weakLessons: [],
  },
  {
    id: 's4',
    name: 'مريم إياد النجار',
    group: 'مجموعة الإثنين والأربعاء (علمي - ب)',
    parentPhone: '0597445566',
    studentPhone: '0597554433',
    studentCode: '2012',
    latestScore: 74,
    totalScore: 100,
    trend: 'steady',
    parentApproval: true,
    expectedTawjihiRange: '76 - 82',
    status: 'active',
    weakLessons: ['الاشتقاق الضمني'],
  },
  {
    id: 's5',
    name: 'عمر شريف قاسم',
    group: 'مجموعة الخميس (صناعي)',
    parentPhone: '0599556677',
    studentPhone: '0599443322',
    studentCode: '3005',
    latestScore: 54,
    totalScore: 100,
    trend: 'down',
    parentApproval: false,
    expectedTawjihiRange: '52 - 60',
    status: 'at_risk',
    weakLessons: ['قاعدة السلسلة', 'تطبيقات هندسية للمشتقة'],
  },
  {
    id: 's6',
    name: 'يوسف هاني اليازجي',
    group: 'مجموعة السبت (مكثف متميزين)',
    parentPhone: '0598667788',
    studentPhone: '0598332211',
    studentCode: '4019',
    latestScore: 95,
    totalScore: 100,
    trend: 'up',
    parentApproval: true,
    expectedTawjihiRange: '93 - 98',
    status: 'excellent',
    weakLessons: [],
  },
  {
    id: 's7',
    name: 'رزان كمال الدلو',
    group: 'مجموعة الأحد والثلاثاء (علمي - أ)',
    parentPhone: '0599778899',
    studentPhone: '0599221100',
    studentCode: '1044',
    latestScore: 81,
    totalScore: 100,
    trend: 'up',
    parentApproval: true,
    expectedTawjihiRange: '80 - 86',
    status: 'active',
    weakLessons: ['المعادلات المرتبطة بالزمن'],
  },
  {
    id: 's8',
    name: 'خليل سمير شعت',
    group: 'مجموعة الخميس (صناعي)',
    parentPhone: '0598889900',
    studentPhone: '0598110099',
    studentCode: '3006',
    latestScore: 58,
    totalScore: 100,
    trend: 'down',
    parentApproval: true,
    expectedTawjihiRange: '56 - 64',
    status: 'at_risk',
    weakLessons: ['تكامل الاقترانات المثلثية', 'النهايات'],
  },
];

export const MOCK_EXAMS: Exam[] = [
  {
    id: 'ex1',
    title: 'امتحان التفاضل وقواعد الاشتقاق المتقدمة (الشهر الأول)',
    type: 'exam',
    subject: 'الرياضيات (علمي)',
    group: 'مجموعة الأحد والثلاثاء (علمي - أ)',
    date: '3 نوفمبر 2026',
    totalScore: 100,
    uploadedCount: 52,
    totalStudents: 52,
    status: 'needs_review',
    submissionMode: 'teacher_scan',
    autoSendReports: false,
    questionsCount: 5,
  },
  {
    id: 'ex2',
    title: 'واجب منزلي: الاشتقاق الضمني والمعادلات الوسيطية',
    type: 'homework',
    subject: 'الرياضيات (علمي)',
    group: 'مجموعة الإثنين والأربعاء (علمي - ب)',
    date: '1 نوفمبر 2026',
    totalScore: 20,
    uploadedCount: 46,
    totalStudents: 48,
    status: 'completed',
    submissionMode: 'link',
    autoSendReports: true,
    questionsCount: 3,
  },
  {
    id: 'ex3',
    title: 'اختبار قصير: نهايات الاقترانات الدائرية',
    type: 'exam',
    subject: 'الرياضيات (صناعي)',
    group: 'مجموعة الخميس (صناعي)',
    date: '28 أكتوبر 2026',
    totalScore: 30,
    uploadedCount: 42,
    totalStudents: 42,
    status: 'reports_sent',
    submissionMode: 'teacher_scan',
    autoSendReports: true,
    questionsCount: 3,
  },
  {
    id: 'ex4',
    title: 'امتحان نصف الفصل الأول - الحساب التفاضلي الشامل',
    type: 'exam',
    subject: 'الرياضيات (علمي)',
    group: 'مجموعة السبت (مكثف متميزين)',
    date: '10 نوفمبر 2026',
    totalScore: 100,
    uploadedCount: 0,
    totalStudents: 38,
    status: 'awaiting_papers',
    submissionMode: 'teacher_scan',
    autoSendReports: false,
    questionsCount: 6,
  },
];

export const MOCK_RUBRICS: QuestionRubric[] = [
  {
    id: 'q1',
    questionNumber: 1,
    text: 'إذا كان س² + ص² = 25، أوجد د²ص / دس² عند النقطة (3, 4).',
    type: 'problem_solving',
    maxScore: 20,
    lesson: 'الاشتقاق الضمني',
    modelAnswer: 'المشتقة الأولى: 2س + 2ص(ص\') = 0 => ص\' = -س / ص = -3/4. المشتقة الثانية: ص\'\' = (-1 * ص - (-س) * ص\') / ص² = (-ص + س * (-س/ص)) / ص² = (-ص² - س²) / ص³ = -25 / 64.',
    criteria: [
      { description: 'إجراء الاشتقاق الضمني الأول الصحيح (2س + 2ص ص\' = 0)', points: 6 },
      { description: 'إيجاد قيمة المشتقة الأولى عند (3, 4) وتساوي -3/4', points: 4 },
      { description: 'تطبيق قاعدة قسمة اقترانين للمشتقة الثانية والتعويض الصحيح', points: 7 },
      { description: 'الناتج النهائي المبسط (-25 / 64)', points: 3 },
    ],
  },
  {
    id: 'q2',
    questionNumber: 2,
    text: 'أثبت أن المماس للمنحنى ص = هـ^(2س) عند س = 0 يقطع محور الصادات عند النقطة (0, 1).',
    type: 'problem_solving',
    maxScore: 15,
    lesson: 'مشتقات الاقترانات الأسية',
    modelAnswer: 'عند س = 0، ص = هـ^0 = 1. النقطة (0, 1). ص\' = 2 هـ^(2س)، عند س = 0 الميل م = 2. معادلة المماس: ص - 1 = 2(س - 0) => ص = 2س + 1. المقطع الصادي: س = 0 => ص = 1 وهو المطلوب.',
    criteria: [
      { description: 'حساب نقطة التماس (0, 1)', points: 4 },
      { description: 'اشتقاق الاقتران الأسي وحساب ميل المماس م = 2', points: 6 },
      { description: 'كتابة معادلة المماس والتحقق من نقطة التقاطع', points: 5 },
    ],
  },
];

export const MOCK_GRADING_ITEMS: GradingItem[] = [
  {
    id: 'gr1',
    examId: 'ex1',
    studentId: 's2',
    studentName: 'محمود خليل البطش',
    studentCode: '1043',
    questionNumber: 1,
    questionText: 'إذا كان س² + ص² = 25، أوجد د²ص / دس² عند النقطة (3, 4).',
    lesson: 'الاشتقاق الضمني',
    studentAnswerImage: '/mock_paper_s2_q1.png',
    aiTranscription: '2س + 2ص ص\' = 0\nص\' = -س / ص = -3 / 4\nص\'\' = (-ص - س ص\') / ص²\n= (-4 - 3(-3/4)) / 16\n= (-4 + 9/4) / 16 = (-7/4) / 16 = -7 / 64',
    modelAnswer: 'ص\'\' = (-ص² - س²) / ص³ = -25 / 64',
    maxScore: 20,
    aiSuggestedScore: 14,
    teacherScore: 14,
    confidence: 'medium',
    isReviewed: false,
    criteriaChecks: [
      { criterion: 'إجراء الاشتقاق الضمني الأول الصحيح (2س + 2ص ص\' = 0)', met: true, points: 6 },
      { criterion: 'إيجاد قيمة المشتقة الأولى (-3/4)', met: true, points: 4 },
      { criterion: 'تطبيق قاعدة قسمة اقترانين للمشتقة الثانية', met: true, points: 4 },
      { criterion: 'الناتج النهائي المبسط (-25 / 64) - أخطأ في توحيد المقامات البسط', met: false, points: 0 },
    ],
    handwrittenNote: 'خطأ حسابي في تبسيط البسط: -4 + 9/4 = -7/4 وليس التعويض بالمعادلة الأصلية س² + ص² = 25',
    subjectType: 'math',
  },
  {
    id: 'gr2',
    examId: 'ex1',
    studentId: 's1',
    studentName: 'أحمد محمود المصري',
    studentCode: '1042',
    questionNumber: 1,
    questionText: 'إذا كان س² + ص² = 25، أوجد د²ص / دس² عند النقطة (3, 4).',
    lesson: 'الاشتقاق الضمني',
    studentAnswerImage: '/mock_paper_s1_q1.png',
    aiTranscription: '2س + 2ص(ص\') = 0  =>  ص\' = -س/ص = -3/4\nص\'\' = (-ص - س ص\') / ص²\nنضرب البسط والمقام في ص:\nص\'\' = (-ص² - س(ص ص\')) / ص³ ... س² + ص² = 25\n= -25 / 64',
    modelAnswer: 'ص\'\' = -25 / 64',
    maxScore: 20,
    aiSuggestedScore: 20,
    teacherScore: 20,
    confidence: 'high',
    isReviewed: true,
    criteriaChecks: [
      { criterion: 'إجراء الاشتقاق الضمني الأول الصحيح', met: true, points: 6 },
      { criterion: 'إيجاد قيمة المشتقة الأولى (-3/4)', met: true, points: 4 },
      { criterion: 'تطبيق المشتقة الثانية بالتعويض بالمعادلة س²+ص²=25', met: true, points: 7 },
      { criterion: 'الناتج النهائي المبسط (-25 / 64)', met: true, points: 3 },
    ],
    handwrittenNote: 'حل نموذجي ومتقن بارك الله فيك!',
    subjectType: 'math',
  },
  {
    id: 'gr3',
    examId: 'ex1',
    studentId: 's5',
    studentName: 'عمر شريف قاسم',
    studentCode: '3005',
    questionNumber: 2,
    questionText: 'أثبت أن المماس للمنحنى ص = هـ^(2س) عند س = 0 يقطع محور الصادات عند النقطة (0, 1).',
    lesson: 'مشتقات الاقترانات الأسية',
    studentAnswerImage: '/mock_paper_s5_q2.png',
    aiTranscription: 'ص\' = هـ^(2س)\nعند س = 0 => ص\' = 1\nالمعادلة ص - 1 = 1(س - 0) => ص = س + 1\nعند س = 0 => ص = 1',
    modelAnswer: 'مشتقة هـ^(2س) هي 2هـ^(2س) والميل = 2',
    maxScore: 15,
    aiSuggestedScore: 7,
    teacherScore: 7,
    confidence: 'low',
    isReviewed: false,
    criteriaChecks: [
      { criterion: 'حساب نقطة التماس (0, 1)', met: true, points: 4 },
      { criterion: 'اشتقاق الاقتران الأسي وحساب ميل المماس (نسي ضرب مشتقة الأس 2)', met: false, points: 0 },
      { criterion: 'كتابة معادلة المماس والتعويض', met: true, points: 3 },
    ],
    handwrittenNote: 'انتبه! مشتقة هـ^(2س) هي 2 هـ^(2س) (قاعدة السلسلة)، لا تنسَ مشتقة الأس!',
    subjectType: 'math',
  },
  // English Writing Question Item for screen B8 & B12
  {
    id: 'gr4',
    examId: 'ex1',
    studentId: 's4',
    studentName: 'مريم إياد النجار',
    studentCode: '2012',
    questionNumber: 3,
    questionText: 'Write a 120-word essay about the importance of solar energy in Palestine.',
    lesson: 'Essay Writing & Cohesion',
    studentAnswerImage: '/mock_paper_s4_writing.png',
    aiTranscription: 'Solar energy is very important for people in Gaza because electricity is cut everyday. Many families puts solar panels on roofs to have light and charge phones. In addition, solar energy is clean and do not make smoke. Goverment must help schools to install panels.',
    modelAnswer: 'Academic essay with clear topic sentence, supporting arguments, cohesive linkers, correct subject-verb agreement and formal vocabulary.',
    maxScore: 15,
    aiSuggestedScore: 11,
    teacherScore: 11,
    confidence: 'high',
    isReviewed: true,
    criteriaChecks: [
      { criterion: 'Ideas relevance & thesis statement', met: true, points: 4 },
      { criterion: 'Grammar & Subject-Verb Agreement', met: false, points: 2 },
      { criterion: 'Vocabulary & Variety', met: true, points: 3 },
      { criterion: 'Spelling & Mechanics', met: false, points: 2 },
    ],
    handwrittenNote: 'Well organized ideas! Watch out for subject-verb agreement ("families put", "does not make").',
    subjectType: 'english_writing',
    writingFeedback: {
      grammarErrors: [
        { text: 'Many families puts', correction: 'Many families put', note: 'Subject is plural (families), verb must be plural without -s.' },
        { text: 'do not make smoke', correction: 'does not produce smoke', note: 'Solar energy is singular non-count noun (does not).' },
        { text: 'electricity is cut everyday', correction: 'electricity is interrupted daily', note: 'More academic formal register.' }
      ],
      spellingErrors: [
        { text: 'Goverment', correction: 'Government' },
        { text: 'everyday', correction: 'every day (adverbial phrase)' }
      ],
      vocabSuggestions: [
        { original: 'is very important', suggested: 'plays a pivotal role' },
        { original: 'make smoke', suggested: 'generate emissions' }
      ],
      structureBand: 3.5,
      rephrasedVersion: 'Solar energy plays a pivotal role for residents in Gaza due to frequent power outages. Consequently, numerous households install photovoltaic panels on rooftops to maintain essential lighting. Furthermore, renewable solar power generates zero emissions.'
    }
  }
];

export const MOCK_SCHOOL_INFO = {
  name: 'مدرسة الأمل الخاصة',
  type: 'مدرسة خاصة (الصفوف 1 - 9)',
  location: 'غزة، الرمال الجنوبي',
  principalName: 'أ. سميرة عكيلة',
  totalStudents: 280,
  totalTeachers: 12,
  examsThisMonth: 18,
  avgPerformance: 82.4,
  reportsSentToParents: 264,
  activeSubscription: 'باقة المدارس السنوية (280 طالب × 50 شيكل/سنة)',
};

export const MOCK_SCHOOL_TEACHERS: SchoolTeacher[] = [
  { id: 'st1', name: 'أ. أحمد حلس', subject: 'الرياضيات', classes: ['الصف التاسع (أ)', 'الصف التاسع (ب)', 'الصف الثامن (أ)'], status: 'active', phone: '0599110011', lastPaperUpload: 'منذ 3 ساعات' },
  { id: 'st2', name: 'أ. ريم شملخ', subject: 'اللغة الإنجليزية', classes: ['الصف السابع (أ)', 'الصف السابع (ب)', 'الصف السادس (أ)'], status: 'active', phone: '0599220022', lastPaperUpload: 'أمس' },
  { id: 'st3', name: 'أ. تامر السراج', subject: 'العلوم العامة والفيزياء', classes: ['الصف الثامن (أ)', 'الصف التاسع (أ)'], status: 'active', phone: '0599330033', lastPaperUpload: 'منذ يومين' },
  { id: 'st4', name: 'أ. خلود دلول', subject: 'الرياضيات', classes: ['الصف السادس (أ)', 'الصف الخامس (أ)'], status: 'inactive', phone: '0599440044', lastPaperUpload: 'منذ أسبوعين (لم يرفع أوراقاً)' },
];

export const MOCK_SCHOOL_CLASSES: SchoolClass[] = [
  { id: 'sc1', grade: 'الصف الأول الأساسي', section: 'أ', studentCount: 28, assignedTeacher: 'أ. نادية صيام', avgScore: 91.5 },
  { id: 'sc2', grade: 'الصف الثاني الأساسي', section: 'أ', studentCount: 30, assignedTeacher: 'أ. إيمان الوحيدي', avgScore: 89.2 },
  { id: 'sc3', grade: 'الصف الثالث الأساسي', section: 'أ', studentCount: 32, assignedTeacher: 'أ. فداء حبوش', avgScore: 87.0 },
  { id: 'sc4', grade: 'الصف الرابع الأساسي', section: 'أ', studentCount: 31, assignedTeacher: 'أ. منى التتري', avgScore: 84.6 },
  { id: 'sc5', grade: 'الصف الخامس الأساسي', section: 'أ', studentCount: 34, assignedTeacher: 'أ. خلود دلول', avgScore: 81.3 },
  { id: 'sc6', grade: 'الصف السادس الأساسي', section: 'أ', studentCount: 32, assignedTeacher: 'أ. خلود دلول', avgScore: 74.2 },
  { id: 'sc7', grade: 'الصف السابع الأساسي', section: 'أ', studentCount: 30, assignedTeacher: 'أ. ريم شملخ', avgScore: 83.1 },
  { id: 'sc8', grade: 'الصف الثامن الأساسي', section: 'أ', studentCount: 31, assignedTeacher: 'أ. أحمد حلس', avgScore: 78.4 },
  { id: 'sc9', grade: 'الصف التاسع الأساسي', section: 'أ', studentCount: 32, assignedTeacher: 'أ. أحمد حلس', avgScore: 79.9 },
];

export const MOCK_PLATFORM_ADMIN = {
  activeTutors: 42,
  activeSchools: 8,
  activeStudents: 3420,
  correctedPapersThisMonth: 14850,
  projectedRevenueILS: 48200,
  aiMonthlyCostUSD: 168.40,
  avgCostPerPaperUSD: 0.011,
  lowConfidenceRate: 4.8, // %
  overrideRateBySubject: [
    { subject: 'الرياضيات', overrideRate: 6.2, totalPapers: 6200 },
    { subject: 'الفيزياء', overrideRate: 18.4, totalPapers: 3100, alert: true }, // Alert threshold: 18% Physics override
    { subject: 'الكيمياء', overrideRate: 8.1, totalPapers: 2850 },
    { subject: 'اللغة الإنجليزية', overrideRate: 9.5, totalPapers: 2700 },
  ]
};

export const MOCK_PLATFORM_CLIENTS: PlatformClient[] = [
  { id: 'cl1', name: 'أ. محمد المصري', type: 'teacher', studentsCount: 180, plan: 'المعلم الخصوصي (شهري)', paymentStatus: 'paid', lastPaymentDate: '15 أكتوبر 2026', amount: 900 },
  { id: 'cl2', name: 'مدرسة الأمل الخاصة', type: 'school', studentsCount: 280, plan: 'المدارس السنوية', paymentStatus: 'paid', lastPaymentDate: '1 سبتمبر 2026', amount: 14000 },
  { id: 'cl3', name: 'أ. حسام البطة (فيزياء)', type: 'teacher', studentsCount: 120, plan: 'المعلم الخصوصي (شهري)', paymentStatus: 'pending_confirmation', lastPaymentDate: '4 نوفمبر 2026', amount: 600, receiptImage: '/receipt_mock.png' },
  { id: 'cl4', name: 'أ. روان حبيب (لغة إنجليزية)', type: 'teacher', studentsCount: 95, plan: 'المعلم الخصوصي (شهري)', paymentStatus: 'overdue', lastPaymentDate: '10 سبتمبر 2026', amount: 475 },
  { id: 'cl5', name: 'مدرسة النور النموذجية', type: 'school', studentsCount: 340, plan: 'المدارس السنوية', paymentStatus: 'paid', lastPaymentDate: '15 أغسطس 2026', amount: 17000 },
];

export const MOCK_STUDENT_TUITIONS: any[] = [
  {
    id: 'tui1',
    studentId: 's1',
    studentName: 'أحمد محمود المصري',
    group: 'مجموعة الأحد والثلاثاء (علمي - أ)',
    parentPhone: '0599112233',
    monthlyFee: 150,
    paidAmount: 150,
    status: 'paid',
    lastPaymentDate: '2 نوفمبر 2026',
    receiptNumber: 'REC-2026-1042',
    notes: 'تم الدفع نقداً في الجلسة',
  },
  {
    id: 'tui2',
    studentId: 's2',
    studentName: 'محمود خليل البطش',
    group: 'مجموعة الأحد والثلاثاء (علمي - أ)',
    parentPhone: '0598223344',
    monthlyFee: 150,
    paidAmount: 150,
    status: 'paid',
    lastPaymentDate: '3 نوفمبر 2026',
    receiptNumber: 'REC-2026-1043',
    notes: 'تحويل جوال باي',
  },
  {
    id: 'tui3',
    studentId: 's3',
    studentName: 'سارة عبد الرحمن البردويل',
    group: 'مجموعة الإثنين والأربعاء (علمي - ب)',
    parentPhone: '0599334455',
    monthlyFee: 150,
    paidAmount: 150,
    status: 'paid',
    lastPaymentDate: '1 نوفمبر 2026',
    receiptNumber: 'REC-2026-2011',
    notes: 'مسدد بالكامل',
  },
  {
    id: 'tui4',
    studentId: 's4',
    studentName: 'مريم إياد النجار',
    group: 'مجموعة الإثنين والأربعاء (علمي - ب)',
    parentPhone: '0597445566',
    monthlyFee: 150,
    paidAmount: 75,
    status: 'partial',
    lastPaymentDate: '28 أكتوبر 2026',
    receiptNumber: 'REC-2026-2012',
    notes: 'سددت النصف ومتبقي 75 شيكل نهاية الأسبوع',
  },
  {
    id: 'tui5',
    studentId: 's5',
    studentName: 'عمر شريف قاسم',
    group: 'مجموعة الخميس (صناعي)',
    parentPhone: '0599556677',
    monthlyFee: 150,
    paidAmount: 0,
    status: 'unpaid',
    notes: 'متأخر قسط شهر نوفمبر - تم إرسال تذكير واتساب',
  },
  {
    id: 'tui6',
    studentId: 's6',
    studentName: 'يوسف هاني اليازجي',
    group: 'مجموعة السبت (مكثف متميزين)',
    parentPhone: '0598667788',
    monthlyFee: 200,
    paidAmount: 200,
    status: 'paid',
    lastPaymentDate: '30 أكتوبر 2026',
    receiptNumber: 'REC-2026-4019',
    notes: 'مجموعة المكثف - مسدد كامل',
  },
  {
    id: 'tui7',
    studentId: 's7',
    studentName: 'رزان كمال الدلو',
    group: 'مجموعة الأحد والثلاثاء (علمي - أ)',
    parentPhone: '0599778899',
    monthlyFee: 150,
    paidAmount: 150,
    status: 'paid',
    lastPaymentDate: '4 نوفمبر 2026',
    receiptNumber: 'REC-2026-1044',
  },
  {
    id: 'tui8',
    studentId: 's8',
    studentName: 'خليل سمير شعت',
    group: 'مجموعة الخميس (صناعي)',
    parentPhone: '0598889900',
    monthlyFee: 150,
    paidAmount: 0,
    status: 'unpaid',
    notes: 'متبقي قسط نوفمبر كاملاً',
  },
];

export const MOCK_TEACHER_FINANCIALS = {
  totalStudents: 180,
  monthlyFeeStandard: 150, // ILS
  totalExpectedTuition: 27500, // ILS
  totalCollectedTuition: 23150, // ILS
  totalRemainingTuition: 4350, // ILS
  paidStudentsCount: 148,
  partialStudentsCount: 16,
  unpaidStudentsCount: 16,
  collectionRate: 84.2, // %
};

// --- Dynamic Subscription Plans (Editable and Deletable) ---
export const MOCK_SUBSCRIPTION_PLANS: CustomSubscriptionPlan[] = [
  {
    id: 'plan_tutor_standard',
    name: 'باقة المدرّس الخصوصي المعتمد',
    target: 'teachers',
    billingCycle: 'monthly',
    pricePerStudent: 5,
    minStudents: 50,
    features: [
      'تصحيح فوري غير محدود لأوراق الامتحانات والواجبات',
      'إضافة الامتحان بالتصوير المباشر بالكاميرا',
      'نظام مالي وإدارة رسوم الطلاب وسندات القبض',
      'إرسال تقارير الأداء الفردية عبر واتساب للأهالي',
      'بنك الأسئلة المبوب ونماذج إنجاز الوزارية',
      'الدعم الفني المباشر عبر واتساب والتذاكر',
    ],
    isActive: true,
    isPopular: true,
    notes: '5 شواكل شهرياً لكل طالب نشط مع شهر تجريبي مجاني',
  },
  {
    id: 'plan_school_basic',
    name: 'باقة المدارس الخاصة (الصفوف 1 - 9)',
    target: 'schools',
    billingCycle: 'yearly',
    pricePerStudent: 40,
    minStudents: 80,
    features: [
      'تغطية شاملة لكل مواد التعليم الأساسي (عربي، رياضيات، علوم، إنجليزي، دين)',
      'عقد سنوي يدفع على قسطين (بداية الفصل الأول وبداية الفصل الثاني)',
      'لوحة قياس الفاقد التعليمي ومقارنة أداء الشعب',
      'حسابات غير محدودة لمعلمي المدرسة مع حجب الفواتير عنهم',
      'شعار واسم المدرسة على جميع الأوراق والتقارير بدعم دقة',
      'أولوية معالجة الخوادم ودعم تقني مخصص للمدرسة',
    ],
    isActive: true,
    isPopular: true,
    notes: 'الخيار المعتمد لمدارس التعليم الأساسي الخاصة',
  },
  {
    id: 'plan_school_comprehensive',
    name: 'باقة المدارس والمراكز الشاملة VIP (الصفوف 1 - 12)',
    target: 'schools',
    billingCycle: 'yearly',
    pricePerStudent: 50,
    minStudents: 100,
    features: [
      'كل مزايا باقة الأساسي مضافاً إليها مناهج التوجيهي الوزاري بكافة فروعه',
      'توليد الامتحانات بالذكاء الاصطناعي وربطها بنواتج التعلم',
      'توزيع الدرجات على فترتين دراسيتين (25 ₪ للفصل الأول + 25 ₪ للفصل الثاني)',
      'جلسة تدريب وتجهيز مع كادر المدرسة عبر الفيديو',
    ],
    isActive: true,
    isPopular: false,
    notes: 'عقد سنوي 50 ₪ للطالب سنوياً',
  },
  {
    id: 'plan_relief_initiative',
    name: 'باقة الإسناد لمدارس ومراكز غزة المتضررة',
    target: 'enterprise',
    billingCycle: 'yearly',
    pricePerStudent: 0,
    features: [
      'استخدام مجاني بالكامل بدون أي رسوم',
      'تغطية تكاليف الذكاء الاصطناعي بدعم من منصة دقة',
      'مساندة مراكز الإيواء والمخيمات التعليمية البديلة',
    ],
    isActive: true,
    notes: 'مبادرة دعم التعليم المستمر في فلسطين',
  },
];

// --- Platform Support Tickets (للمعلم والمدرسة ومدير المنصة) ---
export const MOCK_SUPPORT_TICKETS: SupportTicket[] = [
  {
    id: 'tkt_101',
    ticketNumber: 'TKT-2026-084',
    senderName: 'أ. محمد المصري',
    senderRole: 'teacher',
    entityName: 'أكاديمية أ. محمد المصري (مدرّس خصوصي)',
    entityType: 'individual_teacher',
    phone: '0599123456',
    subject: 'استفسار حول قراءة خط اليد الرصاصي الخفيف في سؤال الاشتقاق الضمني',
    category: 'ai_grading',
    priority: 'high',
    status: 'in_progress',
    createdAt: 'منذ ساعتين (اليوم 11:20 ص)',
    description: 'في امتحان التفاضل الأخير، طالب استخدم قلم رصاص خفيف جداً، وحصل نقص نصف علامة في الخطوة الثانية. هل يمكن رفع حساسية تباين الصورة الممسوحة تلقائياً؟',
    attachedExamOrPaper: 'ورقة الطالب: محمود العشي (رمز 5012)',
    replies: [
      {
        id: 'rep_1',
        sender: 'user',
        senderName: 'أ. محمد المصري',
        message: 'أرفقت لكم صورة الورقة الأصلية للمعاينة، أرجو الإفادة.',
        time: '11:22 ص',
      },
      {
        id: 'rep_2',
        sender: 'support_agent',
        senderName: 'م. طارق من دعم دقة',
        message: 'أهلاً بك أستاذ محمد. قمنا بفحص الورقة وتفعيل مرشح التباين العالي (High-Contrast Filter) وأصبحت القراءة ممتازة بنسبة 100%. كما أعدنا احتساب الدرجة تلقائياً لتصبح 15/15.',
        time: '12:05 م',
      },
    ],
  },
  {
    id: 'tkt_102',
    ticketNumber: 'TKT-2026-081',
    senderName: 'أ. سميرة عكيلة (مديرة المدرسة)',
    senderRole: 'school',
    entityName: 'مدرسة الأمل الخاصة (الصفوف 1 - 9)',
    entityType: 'school',
    phone: '0599765432',
    subject: 'طلب إضافة 3 معلمين جدد لمادة العلوم واللغة الإنجليزية في المدرسة',
    category: 'curriculum',
    priority: 'normal',
    status: 'resolved',
    createdAt: 'أمس 04:15 م',
    description: 'نود ربط 3 معلمين جدد بحساب المدرسة وتخصيص شعب الصف السادس والسابع لهم للبدء بتصحيح اختبارات الشهر الأول.',
    replies: [
      {
        id: 'rep_3',
        sender: 'support_agent',
        senderName: 'خدمة عملاء دقة',
        message: 'تم تفعيل روابط دعوة المعلمين عبر واتساب، وربط الصفوف المقررة فوراً. المعلمون يمكنهم الدخول الآن ومباشرة العمل.',
        time: 'أمس 05:30 م',
      },
    ],
  },
  {
    id: 'tkt_103',
    ticketNumber: 'TKT-2026-079',
    senderName: 'أ. خليل التميمي',
    senderRole: 'teacher',
    entityName: 'مركز الروّاد التعليمي',
    entityType: 'learning_center',
    phone: '0599334455',
    subject: 'التأكد من تقارير واتساب التلقائية: بعض أولياء الأمور لم يستلموا رسالة التقرير',
    category: 'whatsapp_reports',
    priority: 'urgent',
    status: 'open',
    createdAt: 'منذ 35 دقيقة',
    description: 'تم إرسال تقرير الاختبار النصفي لـ 45 طالباً، وأفاد 3 أولياء أمور بأن الرسالة لم تصلهم رغم أن الأرقام صحيحة على شبكة جوال.',
  },
];

// --- Teacher Deep Diagnostic & Student Insights Data (افهم طلابك وأين تركز) ---
export const MOCK_TEACHER_DEEP_ANALYTICS = {
  generalInsight: 'بناءً على تصحيح 360 ورقة إجابة في آخر 3 اختبارات لمجموعاتك، يمتلك طلابك مهارة ممتازة في التعويض المباشر، لكن هناك فجوة منهجية واضحة في (قاعدة السلسلة مع الاقترانات المثلثية).',
  
  // أين تركّز (Focus vs Skip)
  whereToFocus: [
    {
      id: 'foc_1',
      topic: 'الاشتقاق الضمني عند نقاط التماس العمودية والأفقية',
      lesson: 'الاشتقاق الضمني والمشتقات العليا',
      errorRate: 48, // 48% failure rate
      urgency: 'high',
      reason: '72 طالباً نسوا وضع شرط (المقام ≠ 0) أو أخطأوا في مشتقة ص² كـ (2ص) دون ضربها في ص\'.',
      recommendation: 'خصّص أول 15 دقيقة من الحصة القادمة لعرض 3 نماذج مقارنة بين المشتقة الصريحة والضمنية.',
      actionScreen: 'C2',
      actionLabel: 'توليد تمارين علاجية لهذه النقطة',
    },
    {
      id: 'foc_2',
      topic: 'قاعدة السلسلة مع المعادلات الوسيطية (البارامترية)',
      lesson: 'قاعدة السلسلة والمعادلات الوسيطية',
      errorRate: 41,
      urgency: 'medium',
      reason: 'الخلط بين اشتقاق دص/دن ودس/دن، وقلب الكسر عند تطبيق قاعدة القسمة.',
      recommendation: 'استخدم التمثيل المخططي للوسيط (ن) كجسر رابط بين المتغيرين.',
      actionScreen: 'C1',
      actionLabel: 'توليد اختبار قصير لضبط المهارة',
    },
  ],

  // أين لا تركّز (لا تضيع وقت الحصة عليها - متقنة تماماً)
  whereNotToFocus: [
    {
      id: 'nofoc_1',
      topic: 'مشتقات كثيرات الحدود والاقتران الخطي',
      lesson: 'قواعد الاشتقاق الأساسية',
      masteryRate: 96,
      studentMasteryCount: '173 من أصل 180 طالباً',
      note: 'الطلاب أتقنوا هذه القاعدة بنسبة تكاد تكون تامة، الانتقال السريع للمفاهيم المركبة أفضل لاستثمار وقت الحصة.',
    },
    {
      id: 'nofoc_2',
      topic: 'متوسط التغير الهندسي وتفسير القاطع',
      lesson: 'متوسط التغير',
      masteryRate: 91,
      studentMasteryCount: '164 من أصل 180 طالباً',
      note: 'الفهم المفهومي للقاطع والميل راسخ، لا داعي لتكرار حل المسائل البسيطة.',
    },
  ],

  // تصنيف وضع الطلاب التشخيصي (Student Cohort Health)
  cohortHealth: {
    masteryGroup: {
      title: 'فئة الإتقان والتميز (جاهزون للأسئلة الوزارية الصعبة)',
      count: 76,
      percentage: 42.2,
      description: 'يحققون 85% فأعلى، استيعابهم سريع ومستعدون للمسائل المفتوحة وتطبيقات القيم القصوى.',
      recommendedAction: 'تزويدهم بأسئلة إثرائية ومسائل التميز من بنك الأسئلة الوزاري.',
    },
    steadyGroup: {
      title: 'فئة الاستقرار والمستوى المتوسط (يحتاجون ضبط السرعة)',
      count: 68,
      percentage: 37.8,
      description: 'فهمهم سليم للخطوات لكن يعانون من أخطاء حسابية سريعة في الإشارات وجمع الكسور.',
      recommendedAction: 'تدريبهم على مراجعة الورقة في آخر 10 دقائق وتدقيق الإشارات الجبرية.',
    },
    atRiskGroup: {
      title: 'فئة التدخل العلاجي العاجل (معرّضون للتعثر في الامتحان القادم)',
      count: 36,
      percentage: 20.0,
      description: 'درجاتهم دون 60% في آخر اختبارين، وتكررت أخطاؤهم في نفس نواتج التعلم الأساسية.',
      recommendedAction: 'إرسال ورقة عمل علاجية فردية مخصصة وعقد جلسة تقوية قصيرة.',
      topStudents: [
        { id: 's2', name: 'أحمد محمود العشي', score: '52/100', weakPoint: 'الاشتقاق الضمني وتوحيد المقامات' },
        { id: 's5', name: 'عمر شريف قاسم', score: '48/100', weakPoint: 'قاعدة السلسلة ورموز التكامل' },
        { id: 's8', name: 'خليل سمير شعت', score: '56/100', weakPoint: 'تطبيقات هندسية وتحديد النقاط الحرجة' },
      ],
    },
  },

  // أبرز الأخطاء الشائعة المتكررة (Misconception Heatmap)
  commonMisconceptions: [
    {
      title: 'نسيان إشارة السالب عند اشتقاق جتا(س) وتحويلها إلى جا(س) فقط',
      affectedCount: 54,
      percentage: 30,
      impact: 'فقدان 3 درجات في السؤال الأول للامتحان النصفي',
    },
    {
      title: 'التعويض العددي بالنقطة قبل إتمام عملية الاشتقاق الكاملة',
      affectedCount: 42,
      percentage: 23.3,
      impact: 'تصفير إجابة السؤال بسبب اشتقاق الثابت الناتج كصفر',
    },
    {
      title: 'الخلط بين مشتقة الاقتران الأسي هـ^(س) والاقتران اللوغاريتمي',
      affectedCount: 31,
      percentage: 17.2,
      impact: 'خطأ مفاهيمي يؤثر على 3 وحدات تالية في المنهاج',
    },
  ],

  // خطة مقترحة للأستاذ للأسبوع القادم (AI Pedagogical Action Plan)
  aiWeeklyActionPlan: [
    'ابدأ حصة الأحد بتمرين تحمية لمدة 7 دقائق يركز حصراً على تجنب نسيان الإشارات السالبة.',
    'قسّم طلاب فئة التعثر إلى أزواج مع طلاب فئة التميز عند حل تمارين قاعدة السلسلة.',
    'فعّل خيار إرسال التمارين العلاجية المخصصة (C2) تلقائياً لأولياء أمور الطلاب المعرضين للخطر عبر واتساب.',
    'تجاوز إعادة شرح متوسط التغير لأن 91% من الطلاب تجاوزوا عتبة التمكن منه بالكامل.',
  ],
};

// --- Landing Page CMS Configuration & Storage ---
export const DEFAULT_LANDING_CONFIG: LandingPageConfig = {
  hero: {
    announcementBadge: 'المنصة التعليمية العامة لكل مدرّس ومدرسة ومركز تعليمي · لأي صف وأي مادة',
    headline: 'صحّح واجبات وامتحانات طلابك في دقائق',
    subheadline: 'منظومة تصحيح وتقييم ذكية مصممة لكافة المراحل الدراسية والمناهج. تصحيح فوري لخط اليد، رصد دقيق للفاقد التعليمي، ومتابعة درجات الطلاب مع إرسال تقارير واتساب احترافية للأهالي بنقرة واحدة.',
    primaryCtaText: 'ابدأ الآن مجاناً',
    secondaryCtaText: 'لمن دِقّـة؟',
    sampleExamTitle: 'امتحان الرياضيات - سؤال 1 (الاشتقاق الضمني)',
    sampleStudentName: 'أحمد محمود المصري',
    sampleExamScore: '20 / 20',
    sampleTeacherNote: 'تطبيق متقن لمعايير الاشتقاق والتعويض الدقيق',
  },
  whoIsItFor: {
    sectionBadge: 'الفئات المستهدفة والشراكات',
    sectionTitle: 'لمن صُممت منصة دِقّـة؟',
    sectionSubtitle: 'دقة منصة مرنة مصممة لتخدم ثلاثة مستويات تعليمية بأعلى كفاءة',
    tutor: {
      title: 'المدرّس الخصوصي والمستقل',
      subtitle: 'للمعلمين أصحاب المجموعات الخاصة والدورات ودروس التقوية.',
      exampleTitle: 'مثال تطبيقي:',
      exampleText: 'مدرّسو الثانوية العامة (التوجيهي) الذين يصححون أسبوعياً مئات الأوراق ويحتاجون متابعة دقيقة لدرجات كل طالب وتحصيل رسوم الجلسات الشهرية.',
      features: [
        'مجموعات وصفوف غير محدودة',
        'فوترة مرنة: 5 ₪ شهرياً لكل طالب نشط فقط',
        'إرسال تقارير واتساب فردية للأهالي'
      ],
      buttonText: 'ابدأ كمعلم مستقل ←',
    },
    school: {
      title: 'المدرسة (الخاصة والحكومية)',
      subtitle: 'لإدارات المدارس والمشرفين التربويين ورؤساء الأقسام لمراقبة الجودة.',
      exampleTitle: 'مثال تطبيقي:',
      exampleText: 'المدارس الخاصة للمرحلة الأساسية (الصفوف 1 - 9) لمتابعة الفاقد التعليمي واختبارات الشعب في كافة المواد، وجدول حراري يكشف أضعف المهارات فوراً.',
      features: [
        'إدارة طاقم المعلمين وربط الشعب الدراسية',
        'عقد سنوي: 50 ₪ لكل طالب (بدفعتين فصليتين)',
        'الأوراق والتقارير تحمل اسم المدرسة وشعارها «بدعم دقة»'
      ],
      buttonText: 'سجّل مدرستك واحجز مكالمة تجهيز ←',
    },
    center: {
      title: 'المركز التعليمي والمعهد',
      subtitle: 'للمعاهد الأكاديمية والمراكز الثقافية التي تضم معلمين متعددين ومئات الطلاب.',
      exampleTitle: 'مثال تطبيقي:',
      exampleText: 'مراكز التقوية والدورات المسائية للمناهج المتنوعة مع فرز الطلاب حسب المستويات وشعب المواد المختلفة.',
      features: [
        'لوحة تحكم موحدة لإدارة الشعب والمعلمين',
        'صلاحيات منفصلة للإدارة والمعلمين',
        'توليد تقارير أداء مركزية مطبوعة ورقمية'
      ],
      buttonText: 'ابدأ لمركزك التعليمي ←',
    },
  },
  curricula: {
    badge: 'المناهج والصفوف الدراسية',
    title: 'نظام عالمي يتكيف مع أي منهاج ومبحث',
    description: '«دقة» منصة عامة ومفتوحة لكافة المناهج الدراسية العربية والدولية، مع توفير كامل لمفردات ومخرجات التعلم.',
    palestineNotice: 'المنهاج الفلسطيني متاح بالكامل الآن (الصفوف 1 - 12 لكافة المواد العلمية والأدبية).',
    upcomingNotice: 'مناهج أخرى قادمة قريباً: المنهاج الأردني، السعودي، والمصري.',
  },
  howItWorks: {
    sectionBadge: 'آلية العمل البسيطة',
    sectionTitle: 'كيف تعمل «دقة» في دقائق؟',
    sectionSubtitle: 'دورة عمل متكاملة تبدأ من وضع الامتحان وحتى عودة الورقة المصححة ليد الطالب',
    steps: [
      { num: '01', title: 'أنشئ الواجب أو الامتحان', desc: 'حدد المادة ومعايير توزيع الدرجات (قانون، تعويض، ناتج) أو ارفع نموذج الامتحان.' },
      { num: '02', title: 'تسليم الأوراق بسهولة', desc: 'يرفع الطلاب صور حلولهم برابط واتساب مباشر بدون تسجيل، أو يصورها المعلم بكاميرا الهاتف.' },
      { num: '03', title: 'تصحيح ذكي مع ملاحظات', desc: 'يقرأ الذكاء الاصطناعي الخطوات اليدوية ويضع علامات ✓ و ✗ وملاحظات توجيهية.' },
      { num: '04', title: 'أوراق مصححة تعود للطالب', desc: 'ترجع الورقة الأصلية محبرة بالقلم الأحمر والدرجة المستحقة مع نقاط التطوير.' },
      { num: '05', title: 'إرسال تقارير واتساب', desc: 'تقارير فورية لولي الأمر والمدرسة بضغطة زر مع رسالة صوتية مقروءة.' },
      { num: '06', title: 'اسأل مساعدك الذكي', desc: 'حلل أداء الطلاب وولد تمارين علاجية فورية لمن أخفق في أي مفهوم.' },
    ],
  },
  features: {
    sectionBadge: 'قدرات المنصة',
    sectionTitle: 'كل ما تحتاجه لإدارة التقييمات',
    sectionSubtitle: 'أدوات صممت خصيصاً لتوفير 80% من وقت تصحيح الأوراق الورقية وتجهيز الاختبارات',
    items: [
      { title: 'تصحيح فوري فائق الدقة', desc: 'يصحح الخطوات والمعادلات والقوانين والناتج النهائي بدقة تنافس لجان التوجيهي.' },
      { title: 'تقارير واتساب تلقائية', desc: 'تصل تقارير مفصلة لكل طالب وولي أمر ومدرسة فور اعتماد المعلم للدرجات.' },
      { title: 'لوحات أداء ومتابعة', desc: 'تحليل دقيق لأضعف 3 دروس في كل مجموعة ونسب إتقان المهارات والفاقد التعليمي.' },
      { title: 'متابعة رسوم الطلاب', desc: 'سجّل من دفع ومن تأخر، وأصدر سندات القبض، واعرف نسبة التحصيل الشهرية في مكان واحد.' },
      { title: 'إنشاء واجبات وامتحانات', desc: 'أنشئ امتحاناتك بنماذج وزارية متعددة ومعايير تفصيلية أو ولّدها بالذكاء الاصطناعي.' },
      { title: 'مساعد ذكي خاص بمعلمك', desc: 'اطرح أي سؤال صوتياً أو نصياً ليرفع الدرجات، يعطيك إحصائيات، أو يقترح تدريبات.' },
    ],
  },
  faqs: {
    sectionBadge: 'الأسئلة الشائعة',
    sectionTitle: 'كل ما تود معرفته عن منصة دِقّـة',
    sectionSubtitle: 'إجابات على أكثر الأسئلة شيوعاً من المعلمين ومديري المدارس',
    items: [
      {
        q: 'هل تصحيح الذكاء الاصطناعي دقيق ومعتمد لمناهج التوجيهي؟',
        a: 'نعم، نموذج «دقة» مدرّب خصيصاً على معايير تصحيح الثانوية العامة الفلسطينية وتوزيع العلامات المعتمد (علامتان للقانون، علامة للتعويض، علامة للناتج). بالإضافة إلى ذلك، لا تُعتمد أي درجة مشكوك فيها أو منخفضة الثقة إلا بمراجعة المعلم وموافقته.',
      },
      {
        q: 'هل أحتاج إلى إنترنت قوي وسريع لاستخدام المنصة؟',
        a: 'إطلاقاً! المنصة مصممة خصيصاً لظروف قطاع غزة وفلسطين. الصفحات خفيفة للغاية، وعند رفع الأوراق أو تسليمها تعمل ميزة الحفظ المحلي؛ وفي حال انقطاع الإنترنت تُحفظ الأوراق وترفع تلقائياً فور عودة الاتصال.',
      },
      {
        q: 'هل يحتاج الطالب إلى تحميل تطبيق أو فتح حساب؟',
        a: 'كلا، الطالب لا يحتاج أي حساب أو كلمة مرور أو ربط بجوجل كلاسروم. يصله رابط تسليم مباشر في مجموعة واتساب، يختار اسمه ويلتقط صورة ورقته ويرسلها بلمسة واحدة.',
      },
      {
        q: 'ما هي المواد التي تدعمها منصة دقة حالياً؟',
        a: 'تدعم المنصة حالياً المواد العلمية والأدبية الأهم: الرياضيات (العلمي والأدبي والصناعي)، الفيزياء، الكيمياء، واللغة الإنجليزية (بما فيها تصحيح مواضيع التعبير Writing وتصنيف الأخطاء لقواعد وإملاء ومفردات).',
      },
    ],
  },
  ctaBanner: {
    title: 'جاهز لتوفير 15 ساعة تصحيح أسبوعياً؟',
    subtitle: 'انضم لمئات المعلمين والمدارس الذين وثقوا بـ «دقة» لتصحيح امتحاناتهم',
    buttonText: 'ابدأ تجربتك المجانية الآن ←',
  },
  footer: {
    copyright: '© 2026 منصة دقة (DEQUA). جميع الحقوق محفوظة.',
    contactPhone: '+970 599 123 456',
    contactEmail: 'support@dequa.edu.ps',
    whatsappNumber: '+970 599 123 456',
  },
  sectionVisibility: {
    hero: true,
    whoIsItFor: true,
    curricula: true,
    howItWorks: true,
    features: true,
    faqs: true,
    ctaBanner: true,
  },
};

const LANDING_STORAGE_KEY = 'dequa_landing_page_config_v1';

export const getLandingPageConfig = (): LandingPageConfig => {
  if (typeof window === 'undefined') return DEFAULT_LANDING_CONFIG;
  try {
    const saved = localStorage.getItem(LANDING_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...DEFAULT_LANDING_CONFIG,
        ...parsed,
        hero: { ...DEFAULT_LANDING_CONFIG.hero, ...(parsed.hero || {}) },
        whoIsItFor: { ...DEFAULT_LANDING_CONFIG.whoIsItFor, ...(parsed.whoIsItFor || {}) },
        curricula: { ...DEFAULT_LANDING_CONFIG.curricula, ...(parsed.curricula || {}) },
        howItWorks: { ...DEFAULT_LANDING_CONFIG.howItWorks, ...(parsed.howItWorks || {}) },
        features: { ...DEFAULT_LANDING_CONFIG.features, ...(parsed.features || {}) },
        faqs: { ...DEFAULT_LANDING_CONFIG.faqs, ...(parsed.faqs || {}) },
        ctaBanner: { ...DEFAULT_LANDING_CONFIG.ctaBanner, ...(parsed.ctaBanner || {}) },
        footer: { ...DEFAULT_LANDING_CONFIG.footer, ...(parsed.footer || {}) },
        sectionVisibility: { ...DEFAULT_LANDING_CONFIG.sectionVisibility, ...(parsed.sectionVisibility || {}) },
      };
    }
  } catch (e) {
    console.error('Error loading landing page config:', e);
  }
  return DEFAULT_LANDING_CONFIG;
};

export const saveLandingPageConfig = (config: LandingPageConfig): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LANDING_STORAGE_KEY, JSON.stringify(config));
    // Trigger custom event so any open landing page or preview synchronizes immediately
    window.dispatchEvent(new Event('dequa_landing_config_updated'));
  } catch (e) {
    console.error('Error saving landing page config:', e);
  }
};

export const resetLandingPageConfig = (): LandingPageConfig => {
  if (typeof window === 'undefined') return DEFAULT_LANDING_CONFIG;
  try {
    localStorage.removeItem(LANDING_STORAGE_KEY);
    window.dispatchEvent(new Event('dequa_landing_config_updated'));
  } catch (e) {
    console.error('Error resetting landing page config:', e);
  }
  return DEFAULT_LANDING_CONFIG;
};


