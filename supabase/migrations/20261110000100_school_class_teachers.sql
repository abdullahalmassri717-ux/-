-- ============================================================================
-- دقة — ترتيب شغل المدرسة: الصفوف والطلاب أولاً، ثم توزيع الأساتذة.
--
-- 1) كانت أي مجموعة جديدة تُسند تلقائياً لمن أنشأها، فلما يستورد مدير المدرسة
--    طلابه من إكسل كان يظهر هو «أستاذ» كل الصفوف. الآن في المدرسة والمركز لا
--    يُسند المالك تلقائياً؛ المدير يرى كل شيء أصلاً، والأستاذ يُسند من شاشة
--    «المعلمون والصفوف». المدرّس الفردي والمعلم الذي ينشئ مجموعته يبقى كما هو.
-- 2) تنظيف الإسنادات التلقائية القديمة للمدير (التي أُنشئت مع المجموعة نفسها).
-- 3) مجموعة «الصف – المادة» تتذكّر صفها الأصلي (class_group_id)، وأي طالب يُضاف
--    للصف لاحقاً يُضاف تلقائياً لمجموعات مواده، ومن يخرج من الصف يخرج منها.
-- ============================================================================

-- 1) الإسناد التلقائي لمنشئ المجموعة
create or replace function private.assign_group_creator()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.id is null then
    new.id := gen_random_uuid();
  end if;
  if new.created_by is not null then
    insert into public.group_teachers (group_id, organization_id, user_id)
    select new.id, new.organization_id, new.created_by
    from public.memberships m
    join public.organizations o on o.id = m.organization_id
    where m.organization_id = new.organization_id
      and m.user_id = new.created_by
      and not (m.role = 'owner' and o.kind in ('school', 'learning_center'))
    on conflict do nothing;
  end if;
  return new;
end $$;

-- 2) حذف إسناد المدير الذي أضافه النظام تلقائياً لحظة إنشاء المجموعة.
--    (الإسناد الذي اختاره المدير بنفسه لاحقاً له وقت مختلف فيبقى.)
delete from public.group_teachers gt
using public.groups g, public.memberships m, public.organizations o
where gt.group_id = g.id
  and gt.user_id = g.created_by
  and gt.created_at = g.created_at
  and m.organization_id = gt.organization_id and m.user_id = gt.user_id and m.role = 'owner'
  and o.id = gt.organization_id and o.kind in ('school', 'learning_center');

-- 3) ربط مجموعة المادة بصفها
alter table public.groups
  add column class_group_id uuid references public.groups (id) on delete set null;
create index groups_class_group_idx on public.groups (class_group_id) where class_group_id is not null;

-- ربط المجموعات القديمة بالاسم «الصف – المادة»
update public.groups child
set class_group_id = parent.id
from public.groups parent
where child.class_group_id is null
  and child.subject_id is not null
  and parent.subject_id is null
  and parent.organization_id = child.organization_id
  and parent.id <> child.id
  and child.name like parent.name || ' – %';

-- الصف الأصلي يجب أن يكون من نفس الجهة وبدون مادة.
create or replace function private.check_class_group()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.class_group_id is not null and not exists (
    select 1 from public.groups p
    where p.id = new.class_group_id and p.organization_id = new.organization_id
      and p.subject_id is null and p.id <> new.id) then
    raise exception 'الصف الأصلي غير صحيح.' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger groups_check_class before insert or update of class_group_id on public.groups
  for each row execute function private.check_class_group();

-- نسخ دخول/خروج الطالب من الصف إلى مجموعات مواده
create or replace function private.sync_class_students()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.left_at is null then
    insert into public.group_students (group_id, student_id, organization_id)
    select c.id, new.student_id, new.organization_id
    from public.groups c
    where c.class_group_id = new.group_id and c.archived_at is null
    on conflict (group_id, student_id) do update set left_at = null
      where public.group_students.left_at is not null;
  elsif tg_op = 'UPDATE' and old.left_at is null then
    update public.group_students gs
    set left_at = new.left_at
    from public.groups c
    where c.class_group_id = new.group_id
      and gs.group_id = c.id and gs.student_id = new.student_id and gs.left_at is null;
  end if;
  return null;
end $$;
create trigger group_students_sync_class after insert or update of left_at on public.group_students
  for each row execute function private.sync_class_students();

-- عند ربط مجموعة مادة بصفها: ينضم لها كل طلاب الصف الحاليين
create or replace function private.copy_class_students()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.class_group_id is not null and new.class_group_id is distinct from
     (case when tg_op = 'UPDATE' then old.class_group_id end) then
    insert into public.group_students (group_id, student_id, organization_id)
    select new.id, gs.student_id, gs.organization_id
    from public.group_students gs
    where gs.group_id = new.class_group_id and gs.left_at is null
    on conflict (group_id, student_id) do update set left_at = null
      where public.group_students.left_at is not null;
  end if;
  return null;
end $$;
create trigger groups_copy_class_students after insert or update of class_group_id on public.groups
  for each row execute function private.copy_class_students();

-- الطلاب الموجودون في الصف الآن ولم يُنسخوا لمجموعات مواده
insert into public.group_students (group_id, student_id, organization_id)
select c.id, gs.student_id, gs.organization_id
from public.groups c
join public.group_students gs on gs.group_id = c.class_group_id and gs.left_at is null
where c.archived_at is null
on conflict (group_id, student_id) do nothing;
