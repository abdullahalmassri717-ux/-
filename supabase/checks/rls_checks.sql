-- ============================================================================
-- فحوص الصلاحيات (RLS) والقواعد الثابتة — تُشغَّل بعد الترحيلات وseed.sql.
-- كل فحص يجري داخل معاملة ثم يُلغى، فلا تتغير البيانات.
-- التشغيل: انظر supabase/README.md  (يتوقف عند أول فحص فاشل)
-- آمن على قاعدة Supabase المحلية أيضاً (ينشئ مخطط tests مساعداً فقط).
-- ============================================================================
\set ON_ERROR_STOP on
\set QUIET on

create schema if not exists tests;
grant usage on schema tests to anon, authenticated;

create or replace function tests.uid(p_phone text) returns uuid
language sql stable security definer set search_path = '' as $$
  select id from public.profiles where phone = p_phone
$$;

create or replace function tests.org(p_kind text) returns uuid
language sql stable security definer set search_path = '' as $$
  select id from public.organizations where kind::text = p_kind order by created_at limit 1
$$;

create or replace function tests.page_path() returns text
language sql stable security definer set search_path = '' as $$
  select storage_path from public.submission_pages order by page_number limit 1
$$;

create or replace function tests.login(p_phone text) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', tests.uid(p_phone), 'role', 'authenticated')::text, true);
end $$;

create or replace function tests.eq(p_actual anyelement, p_expected anyelement, p_label text) returns void
language plpgsql as $$
begin
  if p_actual is distinct from p_expected then
    raise exception 'FAIL: % (expected %, got %)', p_label, p_expected, p_actual;
  end if;
  raise notice 'ok: %', p_label;
end $$;

create or replace function tests.throws(p_sql text, p_label text) returns void
language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    raise notice 'ok: % (%)', p_label, sqlerrm;
    return;
  end;
  raise exception 'FAIL: % (no error raised)', p_label;
end $$;

grant execute on all functions in schema tests to anon, authenticated;
\set QUIET off

-- ---------------------------------------------------------------- الزائر
begin;
set local role anon;
select tests.eq((select count(*) from public.curricula) > 0, true, 'anon: يرى قائمة المناهج');
select tests.eq((select count(*) from public.subscription_plans) > 0, true, 'anon: يرى الباقات العامة');
select tests.eq((select count(*) from public.platform_settings where key = 'pricing'), 1::bigint, 'anon: يرى الأسعار');
select tests.eq((select count(*) from public.platform_settings where key = 'grading'), 0::bigint, 'anon: لا يرى الإعدادات الداخلية');
select tests.throws('select count(*) from public.students', 'anon: لا يصل لجدول الطلاب');
select tests.throws('select count(*) from public.organizations', 'anon: لا يصل لجدول الجهات');
rollback;

-- ---------------------------------------------------------------- مدرّس خصوصي ومعلم في مدرسة
begin;
select tests.login('+970590000001');   -- أ. محمد المصري
set local role authenticated;
select tests.eq((select count(*) from public.organizations), 2::bigint, 'محمد: يرى جهتيه فقط');
select tests.eq((select count(*) from public.groups), 5::bigint, 'محمد: مجموعاته الأربع + شعبة واحدة مسندة في المدرسة');
select tests.eq((select count(*) from public.students), 9::bigint, 'محمد: طلابه الثمانية + طالب شعبته في المدرسة');
select tests.eq((select count(*) from public.students where organization_id = (select id from public.organizations where kind = 'school')),
  1::bigint, 'محمد: لا يرى طلاب الشعب غير المسندة إليه');
select tests.eq((select count(*) from public.invoices), 2::bigint, 'محمد: يرى فواتير جهته فقط، لا فواتير المدرسة');
select tests.eq((select count(*) from public.subscriptions), 1::bigint, 'محمد: لا يرى اشتراك المدرسة');
select tests.eq((select count(*) from public.tuition_charges), 8::bigint, 'محمد: يرى رسوم طلابه');
select tests.eq((select count(*) from public.platform_admins), 0::bigint, 'محمد: ليس مدير منصة');
select tests.eq(public.is_platform_admin(), false, 'محمد: is_platform_admin = false');
select tests.eq((select count(*) from public.subjects where status = 'draft'), 0::bigint, 'محمد: لا يرى المواد المسودة');

-- أعمدة الذكاء الاصطناعي ممنوعة على المتصفح
select tests.throws($$update public.question_grades set ai_score = 0$$, 'محمد: لا يستطيع تعديل درجة الذكاء الاصطناعي');
select tests.throws($$update public.profiles set phone = '+970591111111' where id = auth.uid()$$, 'محمد: لا يغيّر رقم هاتفه من المتصفح');
select tests.throws($$insert into public.platform_admins (user_id) values (auth.uid())$$, 'محمد: لا يرقّي نفسه لمدير منصة');

-- تعديل الدرجة يُسجَّل
update public.question_grades set final_score = 15, teacher_note = 'تعديل للاختبار'
where submission_id in (select s.id from public.submissions s join public.students st on st.id = s.student_id where st.student_code = '1043');
select tests.eq((select count(*) from public.grade_edits ge join public.question_grades g on g.id = ge.question_grade_id
  where ge.new_score = 15 and ge.old_score = 14 and ge.edited_by = auth.uid()), 1::bigint, 'محمد: التعديل حُفظ (قبل/بعد/من)');
select tests.eq((select reviewed_by from public.question_grades where final_score = 15 limit 1), auth.uid(), 'محمد: السؤال صار «مراجَعاً»');
select tests.throws($$delete from public.grade_edits$$, 'محمد: لا يحذف سجل التعديلات');
select tests.throws($$update public.question_grades set final_score = 99$$, 'محمد: لا يتجاوز الدرجة القصوى');

-- لا إرسال قبل الاعتماد
select tests.throws($$insert into public.reports (organization_id, student_id, submission_id, status)
  select s.organization_id, s.student_id, s.id, 'queued' from public.submissions s
  join public.students st on st.id = s.student_id where st.student_code = '1043'$$,
  'محمد: لا يرسل تقرير ورقة غير معتمدة');
insert into public.reports (organization_id, student_id, submission_id, status)
  select s.organization_id, s.student_id, s.id, 'queued' from public.submissions s
  join public.students st on st.id = s.student_id where st.student_code = '1042';
select tests.eq((select count(*) from public.reports where status = 'queued'), 1::bigint, 'محمد: يرسل تقرير ورقة معتمدة');
select tests.throws($$update public.reports set status = 'sent'$$, 'محمد: «أُرسل» يكتبها الخادم فقط');

-- معلم في المدرسة لا يدير أعضاءها
select tests.throws($$insert into public.memberships (organization_id, user_id, role)
  select id, auth.uid(), 'owner' from public.organizations where kind = 'school'
  on conflict (organization_id, user_id) do update set role = 'owner'$$, 'محمد: لا يرقّي نفسه لمالك المدرسة');

-- إنشاء مجموعة جديدة كمعلم في المدرسة: يراها فوراً
insert into public.groups (organization_id, name)
  select id, 'مجموعة تجريبية' from public.organizations where kind = 'school' returning name;
select tests.eq((select count(*) from public.groups where name = 'مجموعة تجريبية'), 1::bigint, 'محمد: يرى المجموعة التي أنشأها');

-- التخزين
select tests.eq(private.can_access_submission_file(tests.page_path()), true, 'محمد: يصل لصورة ورقة طالبه');
rollback;

-- ---------------------------------------------------------------- مديرة مدرسة
begin;
select tests.login('+970590000002');   -- أ. سميرة عكيلة
set local role authenticated;
select tests.eq((select count(*) from public.organizations), 1::bigint, 'سميرة: ترى مدرستها فقط');
select tests.eq((select count(*) from public.students), 4::bigint, 'سميرة: ترى كل طلاب المدرسة ولا ترى طلاب محمد الخصوصيين');
select tests.eq((select count(*) from public.question_grades), 0::bigint, 'سميرة: لا ترى درجات جهة أخرى');
select tests.eq((select count(*) from public.invoices), 1::bigint, 'سميرة: ترى فاتورة المدرسة');
select tests.eq((select count(*) from public.memberships), 6::bigint, 'سميرة: ترى أعضاء مدرستها');
select tests.eq(private.can_access_submission_file(tests.page_path()), false, 'سميرة: لا تصل لصورة ورقة طالب في جهة أخرى');
select tests.eq((select count(*) from public.profiles where phone = '+970590000003'), 0::bigint, 'سميرة: لا ترى بيانات مستخدم من جهة أخرى');
select tests.throws($$insert into public.students (organization_id, full_name)
  values (tests.org('individual_teacher'), 'دخيل')$$, 'سميرة: لا تضيف طالباً لجهة أخرى');
select tests.throws($$update public.memberships set role = 'teacher' where user_id = auth.uid()$$, 'سميرة: لا تزيل آخر مالك');
-- المالكة تضيف طالباً ويُولَّد رمزه تلقائياً
insert into public.students (organization_id, full_name)
  select id, 'طالب جديد' from public.organizations;
select tests.eq((select student_code ~ '^[0-9]{4}$' from public.students where full_name = 'طالب جديد'), true, 'سميرة: رمز طالب من 4 أرقام تولّد تلقائياً');
rollback;

-- ---------------------------------------------------------------- معلمو المدرسة
begin;
select tests.login('+970590000011');   -- أ. أحمد حلس
set local role authenticated;
select tests.throws('select public.admin_grading_cost_by_org(30)', 'المعلم: لا يرى تكلفة الجهات (للمدير فقط)');
select tests.eq((select count(*) from public.groups), 2::bigint, 'أحمد حلس: يرى شعبتيه فقط');
select tests.eq((select count(*) from public.students), 2::bigint, 'أحمد حلس: يرى طلاب شعبتيه فقط');
select tests.eq((select count(*) from public.invoices), 0::bigint, 'أحمد حلس: لا يرى الفواتير');
select tests.eq((select count(*) from public.subscriptions), 0::bigint, 'أحمد حلس: لا يرى الاشتراك');
select tests.eq((select count(*) from public.tuition_charges), 0::bigint, 'أحمد حلس: لا يرى الرسوم');
-- المعلم يضيف طالباً لشعبته: معرّف من المتصفح، ثم التسجيل في الشعبة (بدون returning)
insert into public.students (id, organization_id, full_name)
  values ('33333333-3333-4333-8333-333333333333', tests.org('school'), 'طالب أضافه المعلم');
insert into public.group_students (group_id, student_id, organization_id)
  select id, '33333333-3333-4333-8333-333333333333', organization_id from public.groups limit 1;
select tests.eq((select count(*) from public.students), 3::bigint, 'أحمد حلس: يرى الطالب الذي أضافه لشعبته');
rollback;

begin;
select tests.login('+970590000014');   -- أ. خلود دلول (عضوية معطّلة)
set local role authenticated;
select tests.eq((select count(*) from public.organizations), 0::bigint, 'معلمة معطّلة: لا ترى المدرسة');
select tests.eq((select count(*) from public.students), 0::bigint, 'معلمة معطّلة: لا ترى أي طالب');
rollback;

-- ---------------------------------------------------------------- مدير المنصة
begin;
-- تشغيل تصحيح واحد مكتمل حتى تظهر الجهة في جدول التكلفة.
insert into public.grading_runs (organization_id, submission_id, status, model, cost_usd, escalated)
select organization_id, id, 'succeeded', 'claude-haiku-5-5', 0.01, true from public.submissions limit 1;
select tests.login('+970590000099');
set local role authenticated;
select tests.eq(public.is_platform_admin(), true, 'المدير: is_platform_admin = true');
select tests.eq((select count(*) from public.organizations), 3::bigint, 'المدير: يرى كل الجهات');
select tests.eq((select count(*) from public.invoices), 3::bigint, 'المدير: يرى كل الفواتير');
select tests.eq((select count(*) from public.students), 0::bigint, 'المدير: لا يرى بيانات الطلاب (قاصرون)');
select tests.eq((select count(*) from public.subjects where status = 'draft'), 1::bigint, 'المدير: يرى المواد المسودة');
select tests.eq((select count(*) from public.admin_organizations()), 3::bigint, 'المدير: ملخص الجهات');
select tests.eq((public.admin_grading_quality(30) ? 'runs'), true, 'المدير: ملخص جودة التصحيح');
select tests.eq(jsonb_array_length(public.admin_grading_cost_by_org(30) -> 'orgs'), 1, 'المدير: تكلفة التصحيح لكل جهة');
select tests.eq((public.admin_grading_cost_by_org(30) -> 'orgs' -> 0 ->> 'escalated')::int, 1, 'المدير: عدد الأوراق التي احتاجت النموذج الأقوى');
select tests.eq(public.admin_issue_invoice(tests.org('individual_teacher')) is not null, true, 'المدير: أصدر فاتورة');
select tests.eq((select count(*) from public.invoices), 4::bigint, 'المدير: الفاتورة الجديدة محفوظة');
rollback;

begin;
select tests.login('+970590000011');
set local role authenticated;
select tests.throws($$select public.admin_organizations()$$, 'المعلم: لا يصل لملخص الجهات');
select tests.throws($$select public.admin_issue_invoice(tests.org('school'))$$, 'المعلم: لا يصدر فواتير');
insert into public.support_tickets (subject) values ('مشكلة في رفع الأوراق');
insert into public.support_messages (ticket_id, body, from_admin) select id, 'الصور لا ترفع', true from public.support_tickets;
select tests.eq((select from_admin from public.support_messages limit 1), false, 'الدعم: المعلم لا يستطيع انتحال رد الدعم');
select tests.login('+970590000012');
select tests.eq((select count(*) from public.support_tickets), 0::bigint, 'الدعم: معلم آخر لا يرى التذكرة');
select tests.login('+970590000099');
select tests.eq((select count(*) from public.support_tickets), 1::bigint, 'الدعم: المدير يرى التذكرة');
insert into public.support_messages (ticket_id, body) select id, 'جرّب مرة أخرى' from public.support_tickets;
select tests.eq((select count(*) from public.support_messages where from_admin), 1::bigint, 'الدعم: رد المدير مُعلَّم');
rollback;

-- ---------------------------------------------------------------- بنك الأسئلة وسجل أدوات الذكاء الاصطناعي
begin;
select tests.login('+970590000001');
set local role authenticated;
insert into public.bank_questions (organization_id, text) values (tests.org('individual_teacher'), 'جد مشتقة س²');
select tests.eq((select count(*) from public.bank_questions), 1::bigint, 'البنك: المدرّس يرى سؤاله');
select tests.throws($$insert into public.bank_questions (organization_id, text) values (tests.org('learning_center'), 'x')$$, 'البنك: لا يضيف لجهة ليس عضواً فيها');
select tests.throws($$insert into public.ai_tool_runs (organization_id, task, model) values (tests.org('individual_teacher'), 'x', 'y')$$, 'سجل الأدوات: لا يكتبه المتصفح');
select tests.login('+970590000011');
select tests.eq((select count(*) from public.bank_questions), 0::bigint, 'البنك: معلم جهة أخرى لا يرى أسئلة غيره');
rollback;

-- ---------------------------------------------------------------- تسجيل مستخدم جديد
begin;
insert into auth.users (id, phone) values ('11111111-1111-4111-8111-111111111111', '970590000020');
select tests.eq((select phone from public.profiles where id = '11111111-1111-4111-8111-111111111111'),
  '+970590000020', 'تسجيل: أُنشئ الملف الشخصي برقم دولي');
select tests.eq((select count(*) from public.memberships where user_id = '11111111-1111-4111-8111-111111111111'),
  1::bigint, 'تسجيل: الدعوة المعلقة صارت عضوية في المدرسة');
insert into auth.users (id, phone) values ('22222222-2222-4222-8222-222222222222', '970590000030');
select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222"}', true);
set local role authenticated;
select tests.eq((select count(*) from public.organizations), 0::bigint, 'مستخدم جديد: لا يرى أي جهة قبل إنشاء جهته');
select tests.eq((select public.create_organization('أكاديمية تجريبية', 'individual_teacher', 'أ. تجربة')) is not null, true, 'مستخدم جديد: أنشأ جهته');
select tests.eq((select role::text from public.memberships where user_id = auth.uid()), 'owner', 'مستخدم جديد: صار مالكاً');
select tests.eq((select status::text from public.organizations where id = (select organization_id from public.memberships where user_id = auth.uid())), 'pending', 'مستخدم جديد: جهته بانتظار موافقة مدير المنصة');
select tests.eq((select count(*) from public.subscriptions), 0::bigint, 'مستخدم جديد: لا يصل لبيانات جهته قبل الموافقة');
reset role;
select tests.eq((select status::text from public.subscriptions where organization_id = (select organization_id from public.memberships where user_id = '22222222-2222-4222-8222-222222222222')), 'trial', 'مستخدم جديد: اشتراك تجريبي تلقائي');
set local role authenticated;
select tests.eq((select full_name from public.profiles where id = auth.uid()), 'أ. تجربة', 'مستخدم جديد: حُفظ اسمه');
select tests.eq((select count(*) from public.students), 0::bigint, 'مستخدم جديد: لا يرى طلاب غيره');
select tests.throws($$insert into public.organizations (name, kind) values ('x', 'school')$$, 'مستخدم جديد: الإنشاء عبر الدالة فقط');
-- مدير المدرسة يدعو صاحب الحساب القائم؛ يقبلها عند دخوله التالي.
reset role;
insert into public.invitations (organization_id, phone, full_name) values (tests.org('school'), '+970590000030', 'أ. مدعو');
set local role authenticated;
select tests.eq((select count(*) from public.memberships where user_id = auth.uid()), 1::bigint, 'دعوة: ليست عضوية قبل القبول');
select tests.eq(public.accept_my_invitations(), 1, 'دعوة: قُبلت عند الدخول');
select tests.eq((select count(*) from public.memberships where user_id = auth.uid()), 2::bigint, 'دعوة: صار عضواً في المدرسة أيضاً');
select tests.eq(public.accept_my_invitations(), 0, 'دعوة: لا تُقبل مرتين');
rollback;

-- ---------------------------------------------------------------- إدارة الجهات والفواتير (مدير المنصة)
begin;
select tests.login('+970590000099');
set local role authenticated;
-- تعطيل جهة المدرّس: أعضاؤها لا يصلون لبياناتها.
select public.admin_set_org_status(tests.org('individual_teacher'), 'disabled', 'تأخر الدفع');
select tests.login('+970590000001');
select tests.eq((select count(*) from public.students where organization_id = tests.org('individual_teacher')), 0::bigint, 'جهة معطّلة: المالك لا يرى طلابها');
select tests.eq((select count(*) from public.organizations where status = 'disabled'), 1::bigint, 'جهة معطّلة: المالك يرى حالتها فقط');
select tests.throws($$update public.organizations set status = 'active'$$, 'جهة معطّلة: المالك لا يفعّلها بنفسه');
select tests.login('+970590000099');
select public.admin_set_org_status(tests.org('individual_teacher'), 'active', null);
select tests.login('+970590000001');
select tests.eq((select count(*) > 0 from public.students where organization_id = tests.org('individual_teacher')), true, 'إعادة التفعيل: عادت البيانات');
select tests.throws($$select public.admin_set_org_status(tests.org('school'), 'disabled', null)$$, 'المالك: لا يغيّر حالة الجهات');
select tests.throws($$select public.admin_delete_org(tests.org('school'), 'x')$$, 'المالك: لا يحذف الجهات');
select tests.login('+970590000099');
-- تعديل وتغيير الباقة
select public.admin_update_org(tests.org('learning_center'), 'مركز معدّل', 'learning_center', 'خانيونس');
select tests.eq((select region from public.organizations where id = tests.org('learning_center')), 'خانيونس', 'المدير: عدّل الجهة');
select public.admin_change_plan(tests.org('learning_center'), (select id from public.subscription_plans where slug = 'teacher_monthly'));
select tests.eq((select p.slug from public.subscriptions s join public.subscription_plans p on p.id = s.plan_id
                  where s.organization_id = tests.org('learning_center') and s.status in ('trial','active','past_due')), 'teacher_monthly', 'المدير: غيّر الباقة');
-- معاينة وإصدار فاتورة حسب الاستخدام (لكل طالب، بلا حد أدنى)
select tests.eq((public.admin_invoice_preview(tests.org('individual_teacher')) ->> 'amount')::numeric
                = (public.admin_invoice_preview(tests.org('individual_teacher')) ->> 'units')::int * 5, true, 'التسعير: عدد الطلاب × السعر بلا حد أدنى');
-- تسعير لكل ورقة مع شرائح
update public.subscription_plans set pricing_model = 'per_paper', tiers = '[{"up_to": 1, "price": 2}, {"up_to": null, "price": 1}]'
 where slug = 'teacher_monthly';
select tests.eq((public.admin_invoice_preview(tests.org('individual_teacher')) ->> 'pricing_model'), 'per_paper', 'التسعير: لكل ورقة');
update public.subscription_plans set pricing_model = 'per_student', tiers = '[]' where slug = 'teacher_monthly';
-- فاتورة يدوية ثم دفعة جزئية ثم كاملة
select public.admin_create_invoice(tests.org('individual_teacher'), 100, 'فاتورة يدوية', null);
select public.admin_record_payment((select id from public.invoices where notes = 'فاتورة يدوية'), 40, 'cash', null, null);
select tests.eq((select status::text from public.invoices where notes = 'فاتورة يدوية'), 'issued', 'دفعة جزئية: الفاتورة ما زالت مستحقة');
select public.admin_record_payment((select id from public.invoices where notes = 'فاتورة يدوية'), 60, 'e_wallet', 'W-1', null);
select tests.eq((select status::text from public.invoices where notes = 'فاتورة يدوية'), 'paid', 'دفعة كاملة: الفاتورة مدفوعة');
select tests.eq((select paid_at is not null from public.invoices where notes = 'فاتورة يدوية'), true, 'دفعة كاملة: وقت الدفع محفوظ');
update public.invoices set status = 'overdue' where notes = 'فاتورة يدوية';
select tests.eq((select paid_at is null from public.invoices where notes = 'فاتورة يدوية'), true, 'تغيير الحالة يدوياً: يزيل وقت الدفع');
-- إضافة جهة من المدير بمالك ليس له حساب: دعوة مالك
select public.admin_create_org('مدرسة الأمل', 'school', 'غزة', '+970590000777', 'أ. أمل', null);
select tests.eq((select status::text from public.organizations where name = 'مدرسة الأمل'), 'active', 'المدير: الجهة التي يضيفها نشطة مباشرة');
select tests.eq((select owner_invited from public.admin_organizations() where name = 'مدرسة الأمل'), true, 'المدير: المالك مدعو حتى يسجّل');
select tests.eq(public.admin_issue_invoices_bulk('individual_teacher') >= 0, true, 'المدير: إصدار جماعي');
-- حذف نهائي يشترط الاسم
select tests.throws($$select public.admin_delete_org(tests.org('learning_center'), 'اسم خطأ')$$, 'الحذف: يرفض اسماً غير مطابق');
select public.admin_delete_org(tests.org('learning_center'), 'مركز معدّل');
select tests.eq((select count(*) from public.organizations where name = 'مركز معدّل'), 0::bigint, 'الحذف: حُذفت الجهة');
rollback;

-- ---------------------------------------------------------------- طاقم إدارة المنصة (أدوار وصلاحيات)
begin;
select tests.login('+970590000099');
set local role authenticated;
select tests.eq((public.my_admin_access() ->> 'is_super')::boolean, true, 'الطاقم: المدير الحالي مدير عام');
select tests.eq(public.admin_add_staff('+970590000011', 'أحمد', 'accountant', array['finance']), 'added', 'الطاقم: إضافة صاحب حساب فوراً');
select tests.eq(public.admin_add_staff('+970590000012', null, 'content_editor', array['curricula','landing']), 'added', 'الطاقم: إضافة محرر محتوى');
select tests.eq(public.admin_add_staff('+970590009999', 'موظف دعم', 'support_agent', array['support']), 'invited', 'الطاقم: رقم بلا حساب يصبح دعوة');
select tests.throws($$select public.admin_add_staff('+970590000011', null, 'custom', array['orgs'])$$, 'الطاقم: لا يُضاف مرتين');
select tests.throws($$select public.admin_add_staff('+970590000013', null, 'custom', array['everything'])$$, 'الطاقم: صلاحية غير معروفة');
select tests.throws($$select public.admin_add_staff('+970590000013', null, 'custom', array[]::text[])$$, 'الطاقم: صلاحية واحدة على الأقل');
select tests.throws($$select public.admin_add_staff('+970590000013', null, 'teacher_assistant', array['orgs'])$$, 'الطاقم: دور غير معروف');
select tests.throws($$select public.admin_update_staff(auth.uid(), 'custom', array['orgs'], true)$$, 'الطاقم: لا يعدّل صلاحياته بنفسه');
select tests.throws($$select public.admin_remove_staff(auth.uid())$$, 'الطاقم: لا يخرج نفسه');
select tests.eq((select count(*) from public.admin_list_staff()), 4::bigint, 'الطاقم: القائمة فيها الأعضاء والدعوة');

-- المحاسب: المالية فقط.
select tests.login('+970590000011');
select tests.eq(public.is_platform_admin(), true, 'المحاسب: يفتح لوحة الإدارة');
select tests.eq(public.my_admin_access() ->> 'role', 'accountant', 'المحاسب: دوره صحيح');
select tests.eq((select count(*) from public.invoices), 3::bigint, 'المحاسب: يرى كل الفواتير');
select tests.eq((select count(*) from public.admin_organizations()), 3::bigint, 'المحاسب: يرى ملخص الجهات للفواتير');
select tests.throws($$select public.admin_grading_quality(30)$$, 'المحاسب: لا يرى جودة التصحيح');
select tests.throws($$select public.admin_set_org_status(tests.org('school'), 'disabled', null)$$, 'المحاسب: لا يوقف جهة');
select tests.eq((select count(*) from public.subjects where status = 'draft'), 0::bigint, 'المحاسب: لا يرى المواد المسودة');
select tests.eq((select count(*) from public.students where organization_id <> tests.org('school')), 0::bigint, 'المحاسب: لا يرى طلاب الجهات الأخرى');
select tests.throws($$select public.admin_list_staff()$$, 'المحاسب: لا يرى قائمة الطاقم');
select tests.throws($$select public.admin_add_staff('+970590000013', null, 'super_admin', null)$$, 'المحاسب: لا يضيف أعضاء');
select tests.throws($$insert into public.platform_admins (user_id, role) values (auth.uid(), 'super_admin')$$, 'المحاسب: لا يرقّي نفسه');
select tests.throws($$update public.platform_admins set role = 'super_admin' where user_id = auth.uid()$$, 'المحاسب: لا يعدّل دوره');
select tests.throws($$insert into public.platform_settings (key, value) values ('currency', '{}')$$, 'المحاسب: لا يغيّر الإعدادات');

-- محرر المحتوى: المناهج والصفحة التعريفية فقط.
select tests.login('+970590000012');
select tests.eq((select count(*) from public.subjects where status = 'draft'), 1::bigint, 'المحرر: يرى المواد المسودة');
select tests.eq((select count(*) from public.invoices), 0::bigint, 'المحرر: لا يرى الفواتير');
insert into public.platform_settings (key, value, is_public) values ('landing', '{"title":"تجربة"}', true)
  on conflict (key) do update set value = excluded.value;
select tests.eq((select value ->> 'title' from public.platform_settings where key = 'landing'), 'تجربة', 'المحرر: يعدّل الصفحة التعريفية');
select tests.throws($$insert into public.platform_settings (key, value) values ('exchange', '{}')$$, 'المحرر: لا يغيّر إعدادات أخرى');
select tests.throws($$select public.admin_organizations()$$, 'المحرر: لا يرى ملخص الجهات');

-- المدير العام يوقف المحاسب ثم يحذف المحرر.
select tests.login('+970590000099');
select public.admin_update_staff(tests.uid('+970590000011'), 'accountant', array['finance'], false);
select public.admin_remove_staff(tests.uid('+970590000012'));
select tests.login('+970590000011');
select tests.eq(public.my_admin_access() is null, true, 'الموقوف: لا صلاحيات');
select tests.eq(public.is_platform_admin(), false, 'الموقوف: لا يفتح لوحة الإدارة');
select tests.eq((select count(*) from public.invoices where organization_id <> tests.org('school')), 0::bigint, 'الموقوف: لا يرى الفواتير');
select tests.login('+970590000012');
select tests.eq(public.my_admin_access() is null, true, 'المحذوف: لا صلاحيات');

-- مدير عام جديد يستطيع تنزيل القديم (والقديم لا يعدّل نفسه، فيبقى دائماً مدير عام واحد).
select tests.login('+970590000099');
select public.admin_update_staff(tests.uid('+970590000011'), 'super_admin', null, true);
select tests.login('+970590000011');
select public.admin_update_staff(tests.uid('+970590000099'), 'custom', array['orgs'], true);
select tests.login('+970590000099');
select tests.throws($$select public.admin_list_staff()$$, 'المنزَّل: لم يعد يدير الطاقم');

-- الدعوة تتحول لعضوية عند أول دخول.
reset role;
insert into auth.users (id, instance_id, aud, role, phone)
  values ('00000000-0000-4000-8000-000000009999', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '970590009999');
select tests.login('+970590009999');
set local role authenticated;
select tests.eq(public.my_admin_access() ->> 'role', 'support_agent', 'الدعوة: صارت عضوية عند الدخول');
select tests.eq((select full_name from public.profiles where id = auth.uid()), 'موظف دعم', 'الدعوة: الاسم انتقل للملف الشخصي');
select tests.throws($$select public.admin_organizations()$$, 'موظف الدعم: لا يرى ملخص الجهات');
rollback;

-- ---------------------------------------------------------------- إيقاف الاشتراك الشهري (أشهر الإجازة)
begin;
select tests.login('+970590000001');
set local role authenticated;
select tests.eq((public.my_usage_quote(tests.org('individual_teacher')) ->> 'amount')::numeric > 0, true, 'إيقاف: قبل الإيقاف يوجد مبلغ');
select public.pause_subscription(tests.org('individual_teacher'), null, null);
select tests.eq((public.my_subscription_pause(tests.org('individual_teacher')) ->> 'active')::boolean, true, 'إيقاف: الاشتراك موقوف الآن');
select tests.eq((public.my_usage_quote(tests.org('individual_teacher')) ->> 'amount')::numeric, 0::numeric, 'إيقاف: أيام الإيقاف لا تُحسب');
select tests.throws($$insert into public.submissions (organization_id, assessment_id, student_id, source, status)
  select tests.org('individual_teacher'), 'd551edb9-e5a0-493c-8826-0650045af756', s.id, 'teacher_scan', 'uploaded'
    from public.students s where s.organization_id = tests.org('individual_teacher')
     and not exists (select 1 from public.submissions x where x.student_id = s.id and x.assessment_id = 'd551edb9-e5a0-493c-8826-0650045af756')
   limit 1$$, 'إيقاف: لا أوراق جديدة خلال الإيقاف');
select tests.throws($$select public.pause_subscription(tests.org('individual_teacher'), null, null)$$, 'إيقاف: لا إيقافين معاً');
select public.resume_subscription(tests.org('individual_teacher'));
select tests.eq(public.my_subscription_pause(tests.org('individual_teacher')) is null, true, 'إرجاع: الاشتراك عاد');
select tests.eq((public.my_usage_quote(tests.org('individual_teacher')) ->> 'amount')::numeric > 0, true, 'إرجاع: الحساب عاد طبيعياً');
select tests.throws($$select public.pause_subscription(tests.org('individual_teacher'), current_date - 1, null)$$, 'إيقاف: لا يبدأ في الماضي');
select tests.throws($$select public.pause_subscription(tests.org('school'), null, null)$$, 'إيقاف: ليس لغير المالك');
select tests.login('+970590000099');
select tests.throws($$select public.pause_subscription(tests.org('school'), null, null)$$, 'إيقاف: الاشتراك السنوي لا يُوقف');
rollback;

-- ---------------------------------------------------------------- المدرسة: الصفوف أولاً ثم توزيع الأساتذة
begin;
select tests.login('+970590000002');
set local role authenticated;
insert into public.groups (id, organization_id, name, grade_id)
  values ('aaaaaaaa-0000-4000-8000-000000000001', tests.org('school'), 'صف تجربة', '8b61e5b7-86be-4916-8396-cefb73b6e3e7');
select tests.eq((select count(*) from public.group_teachers where group_id = 'aaaaaaaa-0000-4000-8000-000000000001'), 0::bigint,
  'المدرسة: المدير لا يُسند تلقائياً أستاذاً للصف الذي ينشئه');
insert into public.students (id, organization_id, full_name) values
  ('aaaaaaaa-0000-4000-8000-0000000000a1', tests.org('school'), 'طالب أول'),
  ('aaaaaaaa-0000-4000-8000-0000000000a2', tests.org('school'), 'طالب ثاني');
insert into public.group_students (group_id, student_id, organization_id) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-0000000000a1', tests.org('school'));
insert into public.groups (id, organization_id, name, grade_id, subject_id, class_group_id)
  values ('aaaaaaaa-0000-4000-8000-000000000002', tests.org('school'), 'صف تجربة – رياضيات', '8b61e5b7-86be-4916-8396-cefb73b6e3e7',
          'e9a287a7-55c1-4934-8ac0-fa50df10c3bb', 'aaaaaaaa-0000-4000-8000-000000000001');
insert into public.group_teachers (group_id, organization_id, user_id)
  values ('aaaaaaaa-0000-4000-8000-000000000002', tests.org('school'), '0f00b8f6-b32c-4cc6-82d6-8f7fbc3d201d');
-- طالب جديد ينضم للصف بعد الإسناد: يدخل مجموعة المادة تلقائياً
insert into public.group_students (group_id, student_id, organization_id) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-0000000000a2', tests.org('school'));
select tests.eq((select count(*) from public.group_students where group_id = 'aaaaaaaa-0000-4000-8000-000000000002'
  and student_id = 'aaaaaaaa-0000-4000-8000-0000000000a2' and left_at is null), 1::bigint,
  'المدرسة: الطالب الجديد في الصف ينضم لمجموعة المادة تلقائياً');
update public.group_students set left_at = now()
  where group_id = 'aaaaaaaa-0000-4000-8000-000000000001' and student_id = 'aaaaaaaa-0000-4000-8000-0000000000a2';
select tests.eq((select count(*) from public.group_students where group_id = 'aaaaaaaa-0000-4000-8000-000000000002'
  and student_id = 'aaaaaaaa-0000-4000-8000-0000000000a2' and left_at is null), 0::bigint,
  'المدرسة: من يخرج من الصف يخرج من مجموعة المادة');
select tests.throws($$update public.groups set class_group_id = 'aaaaaaaa-0000-4000-8000-000000000002'
  where id = 'aaaaaaaa-0000-4000-8000-000000000001'$$, 'المدرسة: الصف الأصلي لا يكون مجموعة مادة');
-- المعلم المُسند يرى طلاب مادته
select tests.login('+970590000011');
select tests.eq((select count(*) from public.students where id = 'aaaaaaaa-0000-4000-8000-0000000000a1'), 1::bigint,
  'المدرسة: الأستاذ المُسند يرى طالب مادته');
-- المدرّس الفردي يبقى مُسنداً لمجموعته تلقائياً
select tests.login('+970590000001');
insert into public.groups (id, organization_id, name)
  values ('aaaaaaaa-0000-4000-8000-000000000003', tests.org('individual_teacher'), 'مجموعة جديدة');
select tests.eq((select count(*) from public.group_teachers where group_id = 'aaaaaaaa-0000-4000-8000-000000000003'), 1::bigint,
  'المدرّس الفردي: يُسند لمجموعته تلقائياً كما كان');
-- المدير يدرّس أيضاً: «صفحتي كأستاذ» تُظهر له المسند إليه فقط
select tests.login('+970590000002');
select set_config('request.headers', '{"x-daqa-view":"teacher"}', true);
select tests.eq((select count(*) from public.groups where organization_id = tests.org('school')), 0::bigint,
  'المدير كأستاذ: لا يرى صفوفاً غير مسندة إليه');
select tests.eq((select count(*) from public.students where organization_id = tests.org('school')), 0::bigint,
  'المدير كأستاذ: لا يرى طلاباً من صفوف غيره');
insert into public.groups (id, organization_id, name)
  values ('aaaaaaaa-0000-4000-8000-000000000004', tests.org('school'), 'مجموعة المدير');
select tests.eq((select count(*) from public.groups where organization_id = tests.org('school')), 1::bigint,
  'المدير كأستاذ: المجموعة التي ينشئها تُسند إليه ويراها');
select set_config('request.headers', '', true);
insert into public.group_teachers (group_id, organization_id, user_id)
  values ('aaaaaaaa-0000-4000-8000-000000000001', tests.org('school'), tests.uid('+970590000002'));
select set_config('request.headers', '{"x-daqa-view":"teacher"}', true);
select tests.eq((select count(*) from public.students where id = 'aaaaaaaa-0000-4000-8000-0000000000a1'), 1::bigint,
  'المدير كأستاذ: يرى طلاب الصف المسند إليه');
select set_config('request.headers', '', true);
select tests.eq((select count(*) from public.groups where organization_id = tests.org('school')) > 1, true,
  'المدير في لوحة الإدارة: يرى كل الصفوف');
rollback;

\echo 'كل الفحوص نجحت ✓'
