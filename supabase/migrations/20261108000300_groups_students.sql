-- ============================================================================
-- دقة — المرحلة 1 (3/7): المجموعات (الصفوف/الشعب) والطلاب و«وين وصلنا»
--
-- الصلاحيات داخل الجهة:
--   • المالك يرى كل مجموعات وطلاب جهته.
--   • المعلم يرى فقط المجموعات المسندة إليه وطلابها.
-- الطالب وولي الأمر ليس لهما حسابات. رمز الطالب (4 أرقام) فريد داخل الجهة.
-- ============================================================================

create type public.student_status as enum ('active', 'archived');

create table public.groups (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  name             text not null,
  label            text,                 -- وصف حر مثل «توجيهي علمي» أو «الشعبة أ»
  grade_id         uuid references public.grades (id) on delete restrict,
  subject_id       uuid references public.subjects (id) on delete restrict,
  schedule         text,
  archived_at      timestamptz,
  created_by       uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (id, organization_id)            -- لربط الجداول الفرعية بنفس الجهة
);
create index groups_org_idx on public.groups (organization_id);
create trigger groups_touch before update on public.groups
  for each row execute function private.touch_updated_at();

-- المعلمون المسندون لكل مجموعة (في المدرسة قد يدرّس أكثر من معلم نفس الشعبة).
create table public.group_teachers (
  group_id         uuid not null,
  organization_id  uuid not null,
  user_id          uuid not null references public.profiles (id) on delete cascade,
  created_at       timestamptz not null default now(),
  primary key (group_id, user_id),
  foreign key (group_id, organization_id) references public.groups (id, organization_id)
    on delete cascade deferrable initially deferred,
  foreign key (organization_id, user_id) references public.memberships (organization_id, user_id) on delete cascade
);
create index group_teachers_user_idx on public.group_teachers (user_id);

create table public.students (
  id                       uuid primary key default gen_random_uuid(),
  organization_id          uuid not null references public.organizations (id) on delete cascade,
  full_name                text not null,
  student_code             char(4) check (student_code ~ '^[0-9]{4}$'),  -- يُولَّد تلقائياً إن لم يُحدَّد
  parent_phone             text check (parent_phone ~ '^\+[0-9]{8,15}$'),
  student_phone            text check (student_phone ~ '^\+[0-9]{8,15}$'),
  parent_whatsapp_consent  boolean not null default false,  -- موافقة ولي الأمر على رسائل واتساب
  status                   public.student_status not null default 'active',
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  unique (organization_id, student_code),
  unique (id, organization_id)
);
create index students_org_idx on public.students (organization_id);
create trigger students_touch before update on public.students
  for each row execute function private.touch_updated_at();

-- رمز عشوائي من 4 أرقام فريد داخل الجهة، إن لم يُحدَّد.
create or replace function private.assign_student_code()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_code text;
  v_try int := 0;
begin
  if new.student_code is not null then
    return new;
  end if;
  loop
    v_code := lpad((floor(random() * 10000))::int::text, 4, '0');
    exit when not exists (
      select 1 from public.students where organization_id = new.organization_id and student_code = v_code);
    v_try := v_try + 1;
    if v_try > 200 then
      raise exception 'تعذّر توليد رمز طالب فريد';
    end if;
  end loop;
  new.student_code := v_code;
  return new;
end $$;
create trigger students_assign_code before insert on public.students
  for each row execute function private.assign_student_code();
alter table public.students add constraint students_code_required check (student_code is not null);

-- تسجيل الطالب في مجموعة (قد يكون في أكثر من مجموعة).
create table public.group_students (
  group_id         uuid not null,
  student_id       uuid not null,
  organization_id  uuid not null,
  joined_at        timestamptz not null default now(),
  left_at          timestamptz,
  primary key (group_id, student_id),
  foreign key (group_id, organization_id)   references public.groups (id, organization_id) on delete cascade,
  foreign key (student_id, organization_id) references public.students (id, organization_id) on delete cascade
);
create index group_students_student_idx on public.group_students (student_id);

-- «وين وصلنا»: الدروس التي علّمها المدرّس «مشروحة» لكل مجموعة.
-- وجود الصف = الدرس مشروح. «تم امتحانه» يُستنتج من الامتحانات.
create table public.group_lesson_progress (
  group_id         uuid not null,
  organization_id  uuid not null,
  lesson_id        uuid not null references public.lessons (id) on delete cascade,
  taught_at        timestamptz not null default now(),
  marked_by        uuid references public.profiles (id) on delete set null default auth.uid(),
  primary key (group_id, lesson_id),
  foreign key (group_id, organization_id) references public.groups (id, organization_id) on delete cascade
);

-- ---------------------------------------------------------------------------
-- دوال الصلاحيات
-- ---------------------------------------------------------------------------
-- هل المستخدم الحالي معلم مسند لهذه المجموعة (وعضو نشط في جهتها)؟
-- volatile عمداً: حتى ترى الإسناد الذي أضافه المُشغِّل في نفس عملية الإنشاء.
create or replace function private.is_group_teacher(p_group uuid)
returns boolean language sql volatile security definer set search_path = '' as $$
  select exists (
    select 1
    from public.group_teachers gt
    join public.memberships m
      on m.organization_id = gt.organization_id and m.user_id = gt.user_id and m.status = 'active'
    where gt.group_id = p_group and gt.user_id = (select auth.uid())
  )
$$;

create or replace function private.can_access_group(p_group uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.groups g
    join public.memberships m
      on m.organization_id = g.organization_id
     and m.user_id = (select auth.uid())
     and m.status = 'active'
    where g.id = p_group
      and (m.role = 'owner' or private.is_group_teacher(g.id))
  )
$$;

create or replace function private.can_access_student(p_student uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.students s
    join public.memberships m
      on m.organization_id = s.organization_id
     and m.user_id = (select auth.uid())
     and m.status = 'active'
    where s.id = p_student
      and (m.role = 'owner'
           or exists (select 1
                      from public.group_students gs
                      join public.group_teachers gt on gt.group_id = gs.group_id
                      where gs.student_id = s.id and gt.user_id = m.user_id))
  )
$$;
grant execute on all functions in schema private to authenticated, service_role;

-- عدد الطلاب النشطين لكل جهة (أساس الفوترة): طالب نشط مسجّل في مجموعة غير مؤرشفة.
create or replace view public.organization_active_students
with (security_invoker = true) as
select s.organization_id, count(distinct s.id)::int as active_students
from public.students s
join public.group_students gs on gs.student_id = s.id and gs.left_at is null
join public.groups g on g.id = gs.group_id and g.archived_at is null
where s.status = 'active'
group by s.organization_id;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.groups                enable row level security;
alter table public.group_teachers        enable row level security;
alter table public.students              enable row level security;
alter table public.group_students        enable row level security;
alter table public.group_lesson_progress enable row level security;

-- المجموعات: المالك يدير الكل، والمعلم يرى ويعدّل المسندة إليه.
-- ملاحظة: السياسة تعتمد على أعمدة الصف نفسه حتى تعمل مع insert ... returning.
create policy groups_select on public.groups for select to authenticated
  using (private.is_org_owner(organization_id) or private.is_group_teacher(id));
create policy groups_insert on public.groups for insert to authenticated
  with check (private.is_org_member(organization_id));
create policy groups_update on public.groups for update to authenticated
  using (private.is_org_owner(organization_id) or private.is_group_teacher(id)) with check (private.is_org_member(organization_id));
create policy groups_delete on public.groups for delete to authenticated
  using (private.is_org_owner(organization_id));

-- إسناد المعلمين: المالك فقط. (المعلم الذي ينشئ مجموعة يُسنَد إليها تلقائياً)
create policy group_teachers_select on public.group_teachers for select to authenticated
  using (private.is_org_owner(organization_id) or private.can_access_group(group_id));
create policy group_teachers_owner on public.group_teachers for all to authenticated
  using (private.is_org_owner(organization_id)) with check (private.is_org_owner(organization_id));

create or replace function private.assign_group_creator()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.id is null then
    new.id := gen_random_uuid();
  end if;
  if new.created_by is not null then
    insert into public.group_teachers (group_id, organization_id, user_id)
    select new.id, new.organization_id, new.created_by
    where exists (select 1 from public.memberships
                  where organization_id = new.organization_id and user_id = new.created_by)
    on conflict do nothing;
  end if;
  return new;
end $$;
-- BEFORE حتى يرى المعلم المجموعة فور إنشائها (مفتاح الربط مؤجّل لنهاية العملية).
create trigger groups_assign_creator before insert on public.groups
  for each row execute function private.assign_group_creator();

-- الطلاب
-- ملاحظة للواجهة: المعلم (غير المالك) لا يرى الطالب حتى يُسجَّل في إحدى مجموعاته،
-- لذا يُنشأ الطالب بمعرّف يولّده المتصفح ثم يُسجَّل في المجموعة، بدون returning.
create policy students_select on public.students for select to authenticated
  using (private.can_access_student(id));
create policy students_insert on public.students for insert to authenticated
  with check (private.is_org_member(organization_id));
create policy students_update on public.students for update to authenticated
  using (private.can_access_student(id)) with check (private.is_org_member(organization_id));
create policy students_delete on public.students for delete to authenticated
  using (private.is_org_owner(organization_id));

-- التسجيل في المجموعات: من يصل للمجموعة.
create policy group_students_select on public.group_students for select to authenticated
  using (private.can_access_group(group_id));
create policy group_students_write on public.group_students for all to authenticated
  using (private.can_access_group(group_id)) with check (private.can_access_group(group_id));

-- وين وصلنا
create policy progress_select on public.group_lesson_progress for select to authenticated
  using (private.can_access_group(group_id));
create policy progress_write on public.group_lesson_progress for all to authenticated
  using (private.can_access_group(group_id)) with check (private.can_access_group(group_id));

revoke all on public.groups, public.group_teachers, public.students,
  public.group_students, public.group_lesson_progress, public.organization_active_students
from anon;
