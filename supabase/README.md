# قاعدة بيانات دقة (Supabase)

هذا المجلد يحتوي بنية قاعدة البيانات ووظائف الخادم. الواجهة متصلة بها عبر `src/data/supabaseStore.ts`
عند ضبط مفاتيح Supabase، وإلا تعمل بالبيانات التجريبية. خطوات الإطلاق في `docs/setup-guide.md`.

## ماذا يوجد هنا

| الملف | ما فيه |
|---|---|
| `migrations/…0100_core_tenancy.sql` | المستخدمون، الجهات، العضويات (مالك/معلم)، الدعوات، مديرو المنصة، الإعدادات، ودالة `create_organization` |
| `migrations/…0200_curriculum.sql` | شجرة المنهج: منهج ← صف ← مادة ← وحدة ← درس ← نواتج تعلّم + مصطلحات ورموز |
| `migrations/…0300_groups_students.sql` | المجموعات/الشعب، إسناد المعلمين، الطلاب ورموزهم، «وين وصلنا» |
| `migrations/…0400_assessments.sql` | الواجبات والامتحانات، الأسئلة، معايير التصحيح، رمز رابط التسليم |
| `migrations/…0500_submissions_grading_reports.sql` | التسليمات وصفحاتها، درجات كل سؤال، سجل تعديلات المدرّس، تقارير واتساب |
| `migrations/…0600_billing_tuition.sql` | الباقات، الاشتراكات، الفواتير، إيصالات الدفع، رسوم الطلاب |
| `migrations/…0700_storage.sql` | حاويات الملفات الخاصة وصلاحياتها |
| `migrations/…0800_default_settings.sql` | الأسعار والعملة الافتراضية والباقتان الرسميتان |
| `migrations/…0900_grading_runs_link_attempts.sql` | سجل تكلفة التصحيح، ومحاولات رمز رابط التسليم |
| `migrations/…1000_payment_accounts.sql` | حسابات الدفع التي تظهر للمشتركين |
| `migrations/…1100_invitations_accept.sql` | قبول دعوات المعلمين عند الدخول |
| `migrations/…1200_admin_support.sql` | الاشتراك التجريبي التلقائي، دوال مدير المنصة، تذاكر الدعم |
| `migrations/…1300_question_bank_ai_tools.sql` | بنك أسئلة الجهة، وسجل تكلفة أدوات الذكاء الاصطناعي |
| `functions/` | `grade-submission` (التصحيح)، `ai-tools` (أدوات المدرّس)، `send-reports` (واتساب)، `student-submit` (رفع الطالب) |
| `seed.sql` | بيانات تجريبية مأخوذة من `mockData.ts` (للتطوير فقط، أرقام هواتف وهمية) |
| `checks/rls_checks.sql` | نحو 80 فحصاً يتأكد أن كل شخص يرى ما يحق له فقط |

## القواعد المطبّقة داخل القاعدة نفسها (لا تعتمد على الواجهة)

- **كل جهة منفصلة تماماً.** المستخدم يرى فقط بيانات الجهات التي هو عضو نشط فيها.
- **المالك** يرى كل ما في جهته. **المعلم** يرى فقط المجموعات المسندة إليه وطلابها ودرجاتهم.
- **الفواتير والاشتراكات ورسوم الطلاب** للمالك ومدير المنصة فقط؛ معلمو المدرسة لا يرونها.
- **مدير المنصة** يرى الجهات والفواتير والإيصالات والمناهج، ولا يرى بيانات الطلاب (قاصرون).
- **الزائر** يرى فقط المناهج والباقات والأسعار العامة.
- **لا يُرسل تقرير فيه درجة قبل اعتماد المدرّس**، إلا إذا فعّل «إرسال تلقائي» للامتحان.
- **كل تعديل من المدرّس على الدرجة يُحفظ** في `grade_edits` (قبل/بعد/من/متى) ولا يمكن حذفه.
- **أعمدة الذكاء الاصطناعي** (`ai_*`) يكتبها الخادم فقط، والدرجة لا تتجاوز الدرجة القصوى للسؤال.
- **رقم الهاتف** لا يتغير من المتصفح، ولا يستطيع أحد ترقية نفسه لمالك أو مدير منصة.
- لا يمكن إزالة **آخر مالك** للجهة.
- كل الملفات في **حاويات خاصة**، وأول جزء من مسار الملف هو معرّف الجهة.

## ملاحظات لمن يبني الواجهة

- **إنشاء الجهة عند التسجيل:** `rpc('create_organization', { p_name, p_type, p_full_name })`، و`p_type` أحد:
  `individual_teacher` أو `school` أو `learning_center`.
- **مبدّل الجهات:** `memberships` مع `organizations(id, name, kind)` حيث `status = 'active'`.
- **دعوة معلم:** المالك يضيف صفاً في `invitations` برقم واتساب المعلم؛ عند تسجيله تتحول تلقائياً لعضوية.
- **إضافة طالب من معلم (غير مالك):** ولّد المعرّف في المتصفح (`crypto.randomUUID()`)، أضف الطالب ثم سجّله
  في المجموعة في `group_students`، **بدون** `.select()` بعد إضافة الطالب (لأن المعلم لا يراه قبل تسجيله).
- **رمز الطالب** (4 أرقام) يتولد تلقائياً إن لم يُرسل. **رمز رابط التسليم** للامتحان يتولد تلقائياً أيضاً.
- **رفع الطالب من `/s/<code>`** لا يمر من المتصفح مباشرة: Edge Function بمفتاح الخادم تتحقق من رمز الرابط
  ورمز الطالب، مع حدّ لعدد المحاولات.
- **مسارات الملفات:** `submission-pages/<org>/<assessment>/<submission>/<page>.jpg`،
  `payment-receipts/<org>/<invoice>/<file>`، `org-assets/<org>/<file>`. اعرضها بروابط مؤقتة (signed URLs).
- **الأسعار والعملة** تُقرأ من `platform_settings` (`pricing`, `currency`) ومن `subscription_plans`.
- **عدد الطلاب النشطين** للفوترة: `organization_active_students`. المجاميع: `assessment_totals`،
  `submission_scores`، `tuition_balances`.

## كيف أشغّلها وأختبرها

**على Supabase محلياً** (يحتاج Docker و Supabase CLI):

```bash
supabase start          # أول مرة
supabase db reset       # يطبّق كل الترحيلات ثم seed.sql
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f supabase/checks/rls_checks.sql
```

يجب أن ينتهي الفحص بسطر «كل الفحوص نجحت ✓».

**على PostgreSQL عادي** (بدون Docker): شغّل أولاً `checks/plain_postgres_stub.sql` الذي يحاكي أجزاء
Supabase، ثم ملفات `migrations/` بالترتيب، ثم `seed.sql`، ثم `checks/rls_checks.sql`.
⚠️ لا تشغّل `plain_postgres_stub.sql` على Supabase أبداً.

**على مشروع Supabase الحقيقي:** `supabase link --project-ref <ref>` ثم `supabase db push`.
هذا يطبّق الترحيلات فقط، ولا يرفع `seed.sql`.

## جعل حسابك مدير منصة

بعد أن تسجّل الدخول أول مرة برقمك، نفّذ من SQL Editor في لوحة Supabase:

```sql
insert into public.platform_admins (user_id)
select id from public.profiles where phone = '+970XXXXXXXXX';
```
