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
select tests.login('+970590000099');
set local role authenticated;
select tests.eq(public.is_platform_admin(), true, 'المدير: is_platform_admin = true');
select tests.eq((select count(*) from public.organizations), 3::bigint, 'المدير: يرى كل الجهات');
select tests.eq((select count(*) from public.invoices), 3::bigint, 'المدير: يرى كل الفواتير');
select tests.eq((select count(*) from public.students), 0::bigint, 'المدير: لا يرى بيانات الطلاب (قاصرون)');
select tests.eq((select count(*) from public.subjects where status = 'draft'), 1::bigint, 'المدير: يرى المواد المسودة');
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
select tests.eq((select full_name from public.profiles where id = auth.uid()), 'أ. تجربة', 'مستخدم جديد: حُفظ اسمه');
select tests.eq((select count(*) from public.students), 0::bigint, 'مستخدم جديد: لا يرى طلاب غيره');
select tests.throws($$insert into public.organizations (name, kind) values ('x', 'school')$$, 'مستخدم جديد: الإنشاء عبر الدالة فقط');
rollback;

\echo 'كل الفحوص نجحت ✓'
