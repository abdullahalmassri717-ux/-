-- ============================================================================
-- دقة — طاقم إدارة المنصة: أدوار وصلاحيات
--
-- قبل هذا الترحيل: كل من في platform_admins يملك كل شيء.
-- بعده: لكل عضو في الطاقم دور (role) وقائمة صلاحيات (permissions) لكل قسم.
--   • super_admin «مدير عام»: كل الصلاحيات، وهو وحده يدير الطاقم.
--   • باقي الأدوار: يملكون فقط الأقسام المذكورة في permissions.
--   • العضو الموقوف (is_active = false) لا يملك شيئاً.
--
-- الأقسام (الصلاحيات):
--   orgs      الجهات (المدرّسون والمدارس والمراكز)
--   finance   المدفوعات والفواتير والاشتراكات
--   plans     الباقات والأسعار
--   quality   جودة وتكلفة التصحيح
--   support   الدعم الفني والتذاكر
--   curricula المناهج والكتب
--   landing   الصفحة التعريفية
--   settings  إعدادات المنصة (الحسابات البنكية، العملة، الفترة التجريبية...)
--
-- الحماية في قاعدة البيانات نفسها، لا في الشاشة فقط:
--   private.is_platform_admin()  صار يعني «مدير عام نشط» فقط. أي سياسة أو
--                                 دالة قديمة أو جديدة تستعمله تبقى للمدير العام
--                                 (الأأمن افتراضياً).
--   private.admin_can('x', ...)   عضو نشط يملك أحد هذه الأقسام (أو مدير عام).
--   ثم نستبدل في السياسات والدوال القائمة is_platform_admin() بـ admin_can(القسم
--   المناسب) حسب جدول واضح أدناه، ونتأكد في النهاية أنه لم يبقَ شيء غير مقصود.
--
-- إضافة عضو برقم واتساب: إن كان له حساب يُضاف فوراً، وإلا تُحفظ دعوة
-- (platform_staff_invites) تتحول لعضوية عند أول دخول له (my_admin_access).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) الأعمدة الجديدة. الأعضاء الحاليون يصبحون «مدير عام» حتى لا يفقد أحد صلاحياته.
-- ---------------------------------------------------------------------------
create or replace function private.admin_permission_keys()
returns text[] language sql immutable set search_path = '' as $$
  select array['orgs','finance','plans','quality','support','curricula','landing','settings']::text[]
$$;

alter table public.platform_admins
  add column role        text    not null default 'super_admin',
  add column permissions text[]  not null default '{}',
  add column is_active   boolean not null default true,
  add column added_by    uuid    references public.profiles (id) on delete set null,
  add column updated_at  timestamptz not null default now(),
  add constraint platform_admins_role_check
    check (role in ('super_admin','accountant','support_agent','content_editor','custom')),
  add constraint platform_admins_permissions_check
    check (permissions <@ private.admin_permission_keys());
create trigger platform_admins_touch before update on public.platform_admins
  for each row execute function private.touch_updated_at();

-- دعوات لمن ليس له حساب بعد.
create table public.platform_staff_invites (
  phone       text primary key check (phone ~ '^\+[0-9]{8,15}$'),
  full_name   text,
  role        text   not null check (role in ('super_admin','accountant','support_agent','content_editor','custom')),
  permissions text[] not null default '{}' check (permissions <@ private.admin_permission_keys()),
  invited_by  uuid   references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);
alter table public.platform_staff_invites enable row level security;
-- لا سياسات: القراءة والكتابة عبر الدوال أدناه فقط (للمدير العام).
revoke all on public.platform_staff_invites from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2) دوال الصلاحيات
-- ---------------------------------------------------------------------------
-- «مدير عام نشط». كل ما يستعمل هذه الدالة يبقى للمدير العام فقط.
create or replace function private.is_platform_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.platform_admins
    where user_id = (select auth.uid()) and is_active and role = 'super_admin'
  )
$$;

-- أي عضو نشط في الطاقم (لفتح لوحة الإدارة).
create or replace function private.is_platform_staff()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.platform_admins where user_id = (select auth.uid()) and is_active
  )
$$;

-- عضو نشط يملك أحد الأقسام المذكورة، أو مدير عام.
create or replace function private.admin_can(variadic p_keys text[])
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.platform_admins
    where user_id = (select auth.uid()) and is_active
      and (role = 'super_admin' or permissions && p_keys)
  )
$$;

-- الدالة العامة القديمة تبقى بنفس الاسم: «هل يفتح لوحة الإدارة؟»
create or replace function public.is_platform_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select private.is_platform_staff()
$$;
grant execute on all functions in schema private to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3) ربط كل سياسة ودالة قائمة بالقسم المناسب
-- ---------------------------------------------------------------------------
do $mig$
declare
  r record;
  v_from constant text := 'private.is_platform_admin()';
  v_qual text;
  v_check text;
  v_def text;
  v_sql text;
  v_left int;
begin
  -- السياسات: (الجدول، اسم السياسة، التعبير البديل)
  for r in
    select * from (values
      ('public',  'profiles',            'profiles_select',             $x$private.admin_can('orgs','finance','support')$x$),
      ('public',  'organizations',       'organizations_select',        $x$private.admin_can('orgs','finance','support','quality')$x$),
      ('public',  'memberships',         'memberships_select',          $x$private.admin_can('orgs')$x$),
      ('public',  'curricula',           'curricula_admin',             $x$private.admin_can('curricula')$x$),
      ('public',  'subjects',            'subjects_admin',              $x$private.admin_can('curricula')$x$),
      ('public',  'subjects',            'subjects_read',               $x$private.admin_can('curricula')$x$),
      ('public',  'units',               'units_admin',                 $x$private.admin_can('curricula')$x$),
      ('public',  'units',               'units_read',                  $x$private.admin_can('curricula')$x$),
      ('public',  'lessons',             'lessons_admin',               $x$private.admin_can('curricula')$x$),
      ('public',  'lessons',             'lessons_read',                $x$private.admin_can('curricula')$x$),
      ('public',  'learning_outcomes',   'outcomes_admin',              $x$private.admin_can('curricula')$x$),
      ('public',  'learning_outcomes',   'outcomes_read',               $x$private.admin_can('curricula')$x$),
      ('public',  'lesson_terms',        'terms_admin',                 $x$private.admin_can('curricula')$x$),
      ('public',  'lesson_terms',        'terms_read',                  $x$private.admin_can('curricula')$x$),
      ('public',  'subscription_plans',  'plans_admin',                 $x$private.admin_can('plans')$x$),
      ('public',  'subscription_plans',  'plans_public_read',           $x$private.admin_can('plans','finance','orgs')$x$),
      ('public',  'subscriptions',       'subscriptions_admin',         $x$private.admin_can('finance')$x$),
      ('public',  'subscriptions',       'subscriptions_select',        $x$private.admin_can('finance','orgs')$x$),
      ('public',  'subscription_pauses', 'subscription_pauses_select',  $x$private.admin_can('finance')$x$),
      ('public',  'invoices',            'invoices_admin',              $x$private.admin_can('finance')$x$),
      ('public',  'invoices',            'invoices_select',             $x$private.admin_can('finance')$x$),
      ('public',  'payment_receipts',    'receipts_select',             $x$private.admin_can('finance')$x$),
      ('public',  'payment_receipts',    'receipts_admin_update',       $x$private.admin_can('finance')$x$),
      ('public',  'payment_receipts',    'receipts_admin_delete',       $x$private.admin_can('finance')$x$),
      ('storage', 'objects',             'receipts: read',              $x$private.admin_can('finance')$x$),
      ('public',  'grading_runs',        'grading_runs_select',         $x$private.admin_can('quality')$x$),
      ('public',  'ai_tool_runs',        'ai_tool_runs_select',         $x$private.admin_can('quality')$x$),
      ('public',  'support_tickets',     'tickets_select',              $x$private.admin_can('support')$x$),
      ('public',  'support_tickets',     'tickets_admin_update',        $x$private.admin_can('support')$x$),
      ('public',  'support_messages',    'messages_select',             $x$private.admin_can('support')$x$),
      ('public',  'support_messages',    'messages_insert',             $x$private.admin_can('support')$x$),
      -- الإعدادات: الصفحة التعريفية لقسم landing، والباقي لقسم settings.
      ('public',  'platform_settings',   'platform_settings_public_read',
         $x$(private.admin_can('settings') or (key = 'landing' and private.admin_can('landing')))$x$),
      ('public',  'platform_settings',   'platform_settings_admin_write',
         $x$(private.admin_can('settings') or (key = 'landing' and private.admin_can('landing')))$x$)
    ) as t(sch, tbl, pol, repl)
  loop
    select qual, with_check into v_qual, v_check
      from pg_policies where schemaname = r.sch and tablename = r.tbl and policyname = r.pol;
    if not found then
      raise exception 'سياسة غير موجودة: %.% %', r.sch, r.tbl, r.pol;
    end if;
    if coalesce(v_qual, '') || coalesce(v_check, '') not like '%' || v_from || '%' then
      raise exception 'السياسة % لا تستعمل is_platform_admin', r.pol;
    end if;
    v_sql := format('alter policy %I on %I.%I', r.pol, r.sch, r.tbl);
    if v_qual is not null then
      v_sql := v_sql || ' using (' || replace(v_qual, v_from, r.repl) || ')';
    end if;
    if v_check is not null then
      v_sql := v_sql || ' with check (' || replace(v_check, v_from, r.repl) || ')';
    end if;
    execute v_sql;
  end loop;

  -- الدوال: (اسم الدالة، التعبير البديل). كل نسخ الدالة بنفس الاسم.
  for r in
    select * from (values
      ('private', 'support_message_stamp',      $x$private.admin_can('support')$x$),
      ('public',  'admin_organizations',        $x$private.admin_can('orgs','finance')$x$),
      ('public',  'admin_create_org',           $x$private.admin_can('orgs')$x$),
      ('public',  'admin_update_org',           $x$private.admin_can('orgs')$x$),
      ('public',  'admin_set_org_status',       $x$private.admin_can('orgs')$x$),
      ('public',  'admin_delete_org',           $x$private.admin_can('orgs')$x$),
      ('public',  'admin_change_plan',          $x$private.admin_can('orgs','finance')$x$),
      ('public',  'admin_create_invoice',       $x$private.admin_can('finance')$x$),
      ('public',  'admin_invoice_preview',      $x$private.admin_can('finance')$x$),
      ('public',  'admin_issue_invoice',        $x$private.admin_can('finance')$x$),
      ('public',  'admin_issue_invoices_bulk',  $x$private.admin_can('finance')$x$),
      ('public',  'admin_record_payment',       $x$private.admin_can('finance')$x$),
      ('public',  'my_subscription_pause',      $x$private.admin_can('finance')$x$),
      ('public',  'pause_subscription',         $x$private.admin_can('finance')$x$),
      ('public',  'resume_subscription',        $x$private.admin_can('finance')$x$),
      ('public',  'admin_grading_quality',      $x$private.admin_can('quality')$x$),
      ('public',  'admin_grading_cost_by_org',  $x$private.admin_can('quality')$x$)
    ) as t(sch, fn, repl)
  loop
    v_left := 0;
    for v_def in
      select pg_get_functiondef(p.oid)
        from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = r.sch and p.proname = r.fn and p.prosrc like '%' || v_from || '%'
    loop
      execute replace(v_def, v_from, r.repl);
      v_left := v_left + 1;
    end loop;
    if v_left = 0 then
      raise exception 'دالة غير موجودة أو لا تستعمل is_platform_admin: %.%', r.sch, r.fn;
    end if;
  end loop;

  -- ما يبقى عمداً للمدير العام فقط: درجات الطلاب (قاصرون) وقائمة الطاقم.
  select count(*) into v_left from pg_policies
   where coalesce(qual, '') || coalesce(with_check, '') like '%' || v_from || '%'
     and policyname not in ('grades_admin', 'platform_admins_select');
  if v_left > 0 then
    raise exception 'بقيت % سياسة تستعمل is_platform_admin دون تصنيف', v_left;
  end if;
  select count(*) into v_left from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname in ('public', 'private') and p.prosrc like '%' || v_from || '%';
  if v_left > 0 then
    raise exception 'بقيت % دالة تستعمل is_platform_admin دون تصنيف', v_left;
  end if;
end $mig$;

-- ---------------------------------------------------------------------------
-- 4) دوال الطاقم
-- ---------------------------------------------------------------------------
-- صلاحيات المستخدم الحالي في لوحة الإدارة، أو null إن لم يكن من الطاقم.
-- تقبل أولاً دعوة معلّقة لرقمه (إن وُجدت).
create or replace function public.my_admin_access()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_phone text;
  v_inv public.platform_staff_invites;
  v_row public.platform_admins;
begin
  if v_uid is null then
    return null;
  end if;
  select phone into v_phone from public.profiles where id = v_uid;
  if v_phone is not null then
    select * into v_inv from public.platform_staff_invites where phone = v_phone;
    if found then
      insert into public.platform_admins (user_id, role, permissions, added_by)
      values (v_uid, v_inv.role, v_inv.permissions, v_inv.invited_by)
      on conflict (user_id) do nothing;
      update public.profiles set full_name = v_inv.full_name
       where id = v_uid and full_name is null and v_inv.full_name is not null;
      delete from public.platform_staff_invites where phone = v_phone;
    end if;
  end if;

  select * into v_row from public.platform_admins where user_id = v_uid and is_active;
  if not found then
    return null;
  end if;
  return jsonb_build_object(
    'role', v_row.role,
    'is_super', v_row.role = 'super_admin',
    'permissions', to_jsonb(case when v_row.role = 'super_admin'
                                 then private.admin_permission_keys() else v_row.permissions end)
  );
end $$;

create or replace function private.require_super_admin()
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_platform_admin() then
    raise exception 'إدارة الطاقم للمدير العام فقط' using errcode = '42501';
  end if;
end $$;

create or replace function private.clean_staff_permissions(p_role text, p_permissions text[])
returns text[] language plpgsql immutable set search_path = '' as $$
declare
  v text[];
begin
  if p_role is null or p_role not in ('super_admin','accountant','support_agent','content_editor','custom') then
    raise exception 'الدور غير معروف' using errcode = '22023';
  end if;
  if p_role = 'super_admin' then
    return '{}';
  end if;
  select coalesce(array_agg(distinct k order by k), '{}') into v
    from unnest(coalesce(p_permissions, '{}')) k;
  if not v <@ private.admin_permission_keys() then
    raise exception 'صلاحية غير معروفة' using errcode = '22023';
  end if;
  if cardinality(v) = 0 then
    raise exception 'اختر صلاحية واحدة على الأقل' using errcode = '22023';
  end if;
  return v;
end $$;

-- يمنع أن يبقى الطاقم بلا مدير عام نشط.
create or replace function private.assert_super_admin_left(p_except uuid)
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.platform_admins
                  where role = 'super_admin' and is_active and user_id <> p_except) then
    raise exception 'لا بد من بقاء مدير عام واحد على الأقل' using errcode = '22023';
  end if;
end $$;

-- قائمة الطاقم: الأعضاء والدعوات المعلّقة.
create or replace function public.admin_list_staff()
returns table (
  user_id uuid, phone text, full_name text, role text, permissions text[],
  is_active boolean, is_pending boolean, is_me boolean, created_at timestamptz
) language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_super_admin();
  return query
    select a.user_id, p.phone, p.full_name, a.role, a.permissions,
           a.is_active, false, a.user_id = (select auth.uid()), a.created_at
      from public.platform_admins a join public.profiles p on p.id = a.user_id
    union all
    select null::uuid, i.phone, i.full_name, i.role, i.permissions,
           true, true, false, i.created_at
      from public.platform_staff_invites i
    order by 9;
end $$;

-- إضافة عضو برقم واتساب. يعيد 'added' إن كان له حساب، أو 'invited' إن لم يكن.
-- استدعاؤها لرقم مدعو من قبل يعدّل الدعوة.
create or replace function public.admin_add_staff(p_phone text, p_full_name text, p_role text, p_permissions text[])
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_phone text := nullif(trim(p_phone), '');
  v_name text := nullif(trim(p_full_name), '');
  v_perms text[];
  v_user uuid;
begin
  perform private.require_super_admin();
  if v_phone is null or v_phone !~ '^\+[0-9]{8,15}$' then
    raise exception 'رقم الواتساب غير صحيح' using errcode = '22023';
  end if;
  v_perms := private.clean_staff_permissions(p_role, p_permissions);

  select id into v_user from public.profiles where phone = v_phone;
  if v_user is not null then
    if exists (select 1 from public.platform_admins where user_id = v_user) then
      raise exception 'هذا الرقم موجود في الطاقم. عدّل صلاحياته من القائمة.' using errcode = '23505';
    end if;
    insert into public.platform_admins (user_id, role, permissions, added_by)
    values (v_user, p_role, v_perms, (select auth.uid()));
    update public.profiles set full_name = v_name where id = v_user and full_name is null and v_name is not null;
    return 'added';
  end if;

  insert into public.platform_staff_invites (phone, full_name, role, permissions, invited_by)
  values (v_phone, v_name, p_role, v_perms, (select auth.uid()))
  on conflict (phone) do update
    set full_name = excluded.full_name, role = excluded.role, permissions = excluded.permissions;
  return 'invited';
end $$;

-- تعديل دور عضو وصلاحياته، أو إيقافه وإرجاعه.
create or replace function public.admin_update_staff(p_user uuid, p_role text, p_permissions text[], p_active boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_perms text[];
begin
  perform private.require_super_admin();
  if p_user = (select auth.uid()) then
    raise exception 'لا يمكنك تعديل صلاحياتك بنفسك' using errcode = '42501';
  end if;
  if not exists (select 1 from public.platform_admins where user_id = p_user) then
    raise exception 'العضو غير موجود' using errcode = 'P0002';
  end if;
  v_perms := private.clean_staff_permissions(p_role, p_permissions);
  if p_role <> 'super_admin' or not coalesce(p_active, true) then
    perform private.assert_super_admin_left(p_user);
  end if;
  update public.platform_admins
     set role = p_role, permissions = v_perms, is_active = coalesce(p_active, true)
   where user_id = p_user;
end $$;

-- إخراج عضو من الطاقم (حسابه يبقى كما هو)، أو إلغاء دعوة برقمها.
create or replace function public.admin_remove_staff(p_user uuid, p_phone text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_super_admin();
  if p_user is null then
    delete from public.platform_staff_invites where phone = p_phone;
    return;
  end if;
  if p_user = (select auth.uid()) then
    raise exception 'لا يمكنك إخراج نفسك من الطاقم' using errcode = '42501';
  end if;
  perform private.assert_super_admin_left(p_user);
  delete from public.platform_admins where user_id = p_user;
end $$;

revoke execute on function public.my_admin_access() from public, anon;
revoke execute on function public.admin_list_staff() from public, anon;
revoke execute on function public.admin_add_staff(text, text, text, text[]) from public, anon;
revoke execute on function public.admin_update_staff(uuid, text, text[], boolean) from public, anon;
revoke execute on function public.admin_remove_staff(uuid, text) from public, anon;
grant execute on function public.my_admin_access() to authenticated;
grant execute on function public.admin_list_staff() to authenticated;
grant execute on function public.admin_add_staff(text, text, text, text[]) to authenticated;
grant execute on function public.admin_update_staff(uuid, text, text[], boolean) to authenticated;
grant execute on function public.admin_remove_staff(uuid, text) to authenticated;
