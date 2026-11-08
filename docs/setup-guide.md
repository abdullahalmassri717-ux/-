# تشغيل دقة بشكل حقيقي (دليل الإطلاق)

المنصة جاهزة برمجياً. لتعمل ببيانات حقيقية تحتاج حسابات ومفاتيح لا يملكها إلا صاحب المشروع.
بدون هذه الخطوات تعمل المنصة في **الوضع التجريبي** (بيانات وهمية، والذكاء الاصطناعي يعطي ردوداً تجريبية).

## ما تحتاجه (مرة واحدة)

| الخطوة | ماذا تفعل | مدفوع؟ |
|---|---|---|
| 1. Supabase | أنشئ مشروعاً على supabase.com (يفضّل منطقة أوروبا). | مجاني للبداية |
| 2. مفتاح Claude | أنشئ مفتاح API من console.anthropic.com واشحن رصيداً. | نعم، حسب الاستخدام |
| 3. رموز الدخول على واتساب | Twilio مع رقم واتساب معتمد (انظر `docs/auth-setup.md`). للتجربة: أرقام تجربة مجانية. | نعم |
| 4. تقارير واتساب | WhatsApp Business API من Meta، مع قالب رسالة معتمد. | نعم (لكل رسالة) |
| 5. الاستضافة | Vercel لنشر الموقع. | مجاني للبداية |

## الطريقة الأسهل: النشر التلقائي من GitHub (بدون أوامر)

الملف `.github/workflows/deploy-supabase.yml` يطبّق قاعدة البيانات ويرفع وظائف الخادم تلقائياً كلما تغيّر مجلد `supabase/` في الفرع الرئيسي (main)، أو يدوياً من تبويب Actions ← Deploy Supabase ← Run workflow.

يحتاج فقط هذه الأسرار في GitHub ← المستودع ← Settings ← Secrets and variables ← Actions ← New repository secret:

| الاسم | من أين |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | supabase.com ← صورة حسابك ← Account ← Access Tokens ← Generate new token |
| `SUPABASE_DB_PASSWORD` | كلمة سر قاعدة البيانات التي اخترتها عند إنشاء المشروع |
| `ANTHROPIC_API_KEY` | console.anthropic.com ← API Keys |

هذه أسرار: تُكتب في GitHub فقط، ولا تُرسل في أي محادثة.

## الخطوات التقنية اليدوية (بديل للطريقة السابقة)

1. **قاعدة البيانات:**
   ```bash
   supabase link --project-ref <ref>
   supabase db push          # يطبّق كل ملفات supabase/migrations
   ```
2. **أسرار الخادم** (لا توضع في الكود ولا في Git أبداً):
   ```bash
   supabase secrets set ANTHROPIC_API_KEY=... LINK_ATTEMPT_SALT=<نص عشوائي طويل>
   # عند تفعيل تقارير واتساب:
   supabase secrets set WHATSAPP_TOKEN=... WHATSAPP_PHONE_NUMBER_ID=... WHATSAPP_REPORT_TEMPLATE=... WHATSAPP_TEMPLATE_LANG=ar
   ```
   اختياري: `GRADING_MODEL` و`GRADING_ESCALATION_MODEL` للتصحيح، و`AI_TOOLS_MODEL` و`AI_TOOLS_CHECK_MODEL` لأدوات المدرّس.
3. **وظائف الخادم (Edge Functions):**
   ```bash
   supabase functions deploy grade-submission
   supabase functions deploy ai-tools
   supabase functions deploy send-reports
   supabase functions deploy student-submit --no-verify-jwt   # الطالب يرفع بدون حساب
   ```
4. **مفاتيح المتصفح** في `.env.local` وفي إعدادات Vercel: `VITE_SUPABASE_URL` و`VITE_SUPABASE_ANON_KEY` فقط.
   مفتاح `service_role` لا يوضع هنا أبداً.
5. **مدير المنصة:** سجّل الدخول برقمك مرة، ثم من SQL Editor:
   ```sql
   insert into public.platform_admins (user_id)
   select id from public.profiles where phone = '+970XXXXXXXXX';
   ```

## بعد الدخول كمدير منصة (من لوحة الإدارة، بدون برمجة)

- **الإعدادات:** حسابات الدفع (البنك والمحفظة) التي تظهر للمشتركين، رقم واتساب الدعم، أيام التجربة المجانية، العملة.
- **الباقات:** الأسعار وما تشمله كل باقة (تظهر في صفحة الأسعار).
- **المناهج:** أضف المنهج والصفوف والمواد والوحدات والدروس ونواتج التعلّم ومحتوى كل درس، ثم انشر المادة.
  جودة أسئلة الذكاء الاصطناعي تعتمد على محتوى الدروس ونواتجها.
- **الصفحة الرئيسية:** النصوص والأسئلة الشائعة وإظهار الأقسام.

## تكلفة الذكاء الاصطناعي ومراقبتها

- كل تصحيح يُسجَّل في `grading_runs`، وكل استخدام لأدوات المدرّس في `ai_tool_runs`، مع التكلفة بالدولار.
  لوحة الإدارة ← التحليلات تعرض تكلفة التصحيح.
- لكل مدرّس حد يومي لأدوات الذكاء الاصطناعي (200 استدعاء افتراضياً)، يغيَّر من `platform_settings` بالمفتاح `ai_tools`.
