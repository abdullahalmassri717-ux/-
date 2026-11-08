-- ============================================================================
-- دقة — المرحلة 1 (1/7): المستخدمون، الجهات، العضويات، إعدادات المنصة
--
-- المبدأ: كل البيانات تتبع «جهة» (organization). كل مستخدم يرى فقط بيانات
-- الجهات التي هو عضو فيها. مدير المنصة دور منفصل في جدول خاص.
-- ============================================================================

-- دوال المساعدة الخاصة بالصلاحيات توضع في مخطط غير مكشوف للواجهة.
create schema if not exists private;
grant usage on schema private to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- الأنواع
-- ---------------------------------------------------------------------------
create type public.org_kind as enum ('individual_teacher', 'school', 'learning_center');
create type public.membership_role as enum ('owner', 'teacher');   -- لا يوجد دور مساعد مدرّس
create type public.membership_status as enum ('active', 'disabled');

-- ---------------------------------------------------------------------------
-- دالة عامة لتحديث updated_at
-- ---------------------------------------------------------------------------
create or replace function private.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- الملفات الشخصية (صف لكل مستخدم في auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  phone       text unique,                     -- بصيغة دولية تبدأ بـ +
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint profiles_phone_format check (phone is null or phone ~ '^\+[0-9]{8,15}$')
);
create trigger profiles_touch before update on public.profiles
  for each row execute function private.touch_updated_at();

-- مديرو المنصة: جدول منفصل حتى لا يستطيع أي مستخدم ترقية نفسه.
create table public.platform_admins (
  user_id     uuid primary key references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- الجهات والعضويات
-- ---------------------------------------------------------------------------
create table public.organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(trim(name)) between 2 and 200),
  kind        public.org_kind not null,
  region      text,
  logo_path   text,                            -- مسار داخل التخزين، لا رابط عام
  created_by  uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger organizations_touch before update on public.organizations
  for each row execute function private.touch_updated_at();

create table public.memberships (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  user_id          uuid not null references public.profiles (id) on delete cascade,
  role             public.membership_role not null default 'teacher',
  status           public.membership_status not null default 'active',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (organization_id, user_id)
);
create index memberships_user_idx on public.memberships (user_id);
create trigger memberships_touch before update on public.memberships
  for each row execute function private.touch_updated_at();

-- دعوة معلم برقم واتساب قبل أن يملك حساباً. تتحول لعضوية تلقائياً عند تسجيله.
create table public.invitations (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  phone            text not null check (phone ~ '^\+[0-9]{8,15}$'),
  role             public.membership_role not null default 'teacher',
  invited_by       uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at       timestamptz not null default now(),
  accepted_at      timestamptz,
  unique (organization_id, phone)
);
create index invitations_phone_idx on public.invitations (phone) where accepted_at is null;

-- ---------------------------------------------------------------------------
-- إعدادات المنصة (الأسعار، العملة، محتوى الصفحة التعريفية...)
-- لا تُكتب الأسعار أو العملة في الشاشات؛ تُقرأ من هنا.
-- ---------------------------------------------------------------------------
create table public.platform_settings (
  key         text primary key,
  value       jsonb not null,
  is_public   boolean not null default false,  -- true = يقرؤها الزائر (مثل صفحة الأسعار)
  updated_at  timestamptz not null default now(),
  updated_by  uuid references public.profiles (id) on delete set null default auth.uid()
);
create trigger platform_settings_touch before update on public.platform_settings
  for each row execute function private.touch_updated_at();

-- ---------------------------------------------------------------------------
-- دوال الصلاحيات (SECURITY DEFINER حتى لا تدور سياسات RLS حول نفسها)
-- ---------------------------------------------------------------------------
create or replace function private.is_platform_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.platform_admins where user_id = (select auth.uid()))
$$;

create or replace function private.is_org_member(p_org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships
    where organization_id = p_org and user_id = (select auth.uid()) and status = 'active'
  )
$$;

create or replace function private.is_org_owner(p_org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships
    where organization_id = p_org and user_id = (select auth.uid())
      and status = 'active' and role = 'owner'
  )
$$;

-- هل يتشارك المستخدم الحالي جهةً مع هذا الشخص؟ (لعرض أسماء الزملاء)
create or replace function private.shares_org_with(p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.memberships mine
    join public.memberships theirs on theirs.organization_id = mine.organization_id
    where mine.user_id = (select auth.uid()) and mine.status = 'active'
      and theirs.user_id = p_user
  )
$$;

grant execute on all functions in schema private to authenticated, service_role;

-- نسخة عامة يستدعيها التطبيق ليعرف هل يُظهر لوحة الإدارة.
create or replace function public.is_platform_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select private.is_platform_admin()
$$;

-- ---------------------------------------------------------------------------
-- منع حذف أو تعطيل آخر مالك للجهة
-- ---------------------------------------------------------------------------
create or replace function private.keep_one_owner()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_org uuid := old.organization_id;
begin
  if tg_op = 'UPDATE' and new.role = 'owner' and new.status = 'active' then
    return new;
  end if;
  if old.role = 'owner' and old.status = 'active' and not exists (
    select 1 from public.memberships
    where organization_id = v_org and id <> old.id and role = 'owner' and status = 'active'
  ) and exists (select 1 from public.organizations where id = v_org) then
    raise exception 'لا يمكن إزالة آخر مالك للجهة' using errcode = 'P0001';
  end if;
  return coalesce(new, old);
end $$;

create trigger memberships_keep_owner
  before update or delete on public.memberships
  for each row execute function private.keep_one_owner();

-- ---------------------------------------------------------------------------
-- عند تسجيل مستخدم جديد: إنشاء ملفه الشخصي، وقبول دعواته المعلقة
-- ---------------------------------------------------------------------------
create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_phone text := case
    when new.phone is null or new.phone = '' then null
    when left(new.phone, 1) = '+' then new.phone
    else '+' || new.phone
  end;
begin
  insert into public.profiles (id, phone, full_name)
  values (new.id, v_phone, nullif(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;

  if v_phone is not null then
    insert into public.memberships (organization_id, user_id, role)
    select i.organization_id, new.id, i.role
    from public.invitations i
    where i.phone = v_phone and i.accepted_at is null
    on conflict (organization_id, user_id) do nothing;

    update public.invitations set accepted_at = now()
    where phone = v_phone and accepted_at is null;
  end if;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- ---------------------------------------------------------------------------
-- إنشاء جهة عند التسجيل: الجهة + عضوية مالك للمستخدم الحالي + اسمه
-- ---------------------------------------------------------------------------
create or replace function public.create_organization(p_name text, p_type text, p_full_name text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_org uuid;
begin
  if v_uid is null then
    raise exception 'يجب تسجيل الدخول أولاً' using errcode = '42501';
  end if;

  insert into public.profiles (id, full_name)
  values (v_uid, nullif(trim(p_full_name), ''))
  on conflict (id) do update
    set full_name = coalesce(nullif(trim(excluded.full_name), ''), public.profiles.full_name);

  insert into public.organizations (name, kind, created_by)
  values (trim(p_name), p_type::public.org_kind, v_uid)
  returning id into v_org;

  insert into public.memberships (organization_id, user_id, role, status)
  values (v_org, v_uid, 'owner', 'active');

  return v_org;
end $$;

revoke execute on function public.create_organization(text, text, text) from public, anon;
grant execute on function public.create_organization(text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- سياسات الوصول (RLS)
-- ---------------------------------------------------------------------------
alter table public.profiles          enable row level security;
alter table public.platform_admins   enable row level security;
alter table public.organizations     enable row level security;
alter table public.memberships       enable row level security;
alter table public.invitations       enable row level security;
alter table public.platform_settings enable row level security;

-- الملف الشخصي: صاحبه، وزملاؤه في نفس الجهة، ومدير المنصة.
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or private.shares_org_with(id) or private.is_platform_admin());
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
-- رقم الهاتف يتغير فقط عبر تسجيل الدخول (الخادم)، لا من المتصفح.
revoke update on public.profiles from authenticated;
grant update (full_name) on public.profiles to authenticated;

create policy platform_admins_select on public.platform_admins for select to authenticated
  using (user_id = (select auth.uid()) or private.is_platform_admin());

-- الجهات: أعضاؤها يرونها، والمالك يعدّلها، ومدير المنصة يراها كلها.
create policy organizations_select on public.organizations for select to authenticated
  using (private.is_org_member(id) or private.is_platform_admin());
create policy organizations_update on public.organizations for update to authenticated
  using (private.is_org_owner(id)) with check (private.is_org_owner(id));
-- الإنشاء يتم عبر create_organization فقط.
revoke insert, delete on public.organizations from authenticated, anon;

-- العضويات: يرى المستخدم عضوياته وعضويات زملائه؛ المالك فقط يضيف/يعدّل/يحذف.
create policy memberships_select on public.memberships for select to authenticated
  using (user_id = (select auth.uid()) or private.is_org_member(organization_id) or private.is_platform_admin());
create policy memberships_insert on public.memberships for insert to authenticated
  with check (private.is_org_owner(organization_id));
create policy memberships_update on public.memberships for update to authenticated
  using (private.is_org_owner(organization_id)) with check (private.is_org_owner(organization_id));
create policy memberships_delete on public.memberships for delete to authenticated
  using (private.is_org_owner(organization_id));

create policy invitations_owner_all on public.invitations for all to authenticated
  using (private.is_org_owner(organization_id)) with check (private.is_org_owner(organization_id));

-- الإعدادات: العامة للجميع، والكل لمدير المنصة.
create policy platform_settings_public_read on public.platform_settings for select to anon, authenticated
  using (is_public or private.is_platform_admin());
create policy platform_settings_admin_write on public.platform_settings for all to authenticated
  using (private.is_platform_admin()) with check (private.is_platform_admin());

-- لا أحد غير الخادم يكتب في هذه الجداول من خارج السياسات أعلاه.
revoke all on public.platform_admins from anon;
revoke insert, update, delete on public.platform_admins from authenticated;
revoke all on public.profiles, public.memberships, public.invitations, public.organizations from anon;
