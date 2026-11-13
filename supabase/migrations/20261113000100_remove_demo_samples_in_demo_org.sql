-- ============================================================================
-- دقة — حذف الطلاب التجريبيين من الحساب التجريبي نفسه أول ما تُضاف بيانات حقيقية.
--
-- صاحب المنصة يجرّب على الحسابات التجريبية ويضيف فيها طلاباً حقيقيين (يدوياً أو من
-- Excel). عندها يجب أن تختفي العيّنة التجريبية ويبقى ما أضافه هو:
--   * الطلاب الذين أنشأهم سكربت الحسابات التجريبية (المعرّف يبدأ بـ de302000-).
--   * مجموعات السكربت (de301000-) إذا صارت فارغة وليس لها واجبات أو امتحانات.
-- الجهة نفسها وأعضاؤها وما أضافه المستخدم لا يُمسّ.
-- ============================================================================

create or replace function private.remove_demo_samples_in_org(p_org uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  delete from public.students
   where organization_id = p_org and id::text like 'de302000-%';

  -- مجموعات المواد قبل الصف الذي تتبع له، ثم الصفوف.
  delete from public.groups g
   where g.organization_id = p_org and g.id::text like 'de301000-%'
     and g.class_group_id is not null
     and not exists (select 1 from public.group_students gs where gs.group_id = g.id)
     and not exists (select 1 from public.assessments a where a.group_id = g.id);
  delete from public.groups g
   where g.organization_id = p_org and g.id::text like 'de301000-%'
     and not exists (select 1 from public.group_students gs where gs.group_id = g.id)
     and not exists (select 1 from public.assessments a where a.group_id = g.id)
     and not exists (select 1 from public.groups c where c.class_group_id = g.id);
end $$;
revoke execute on function private.remove_demo_samples_in_org(uuid) from public, anon, authenticated;

create or replace function private.remove_demo_samples_on_real_student()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.student_id::text like 'de302000-%' then
    return null;
  end if;
  if exists (select 1 from public.organizations o where o.id = new.organization_id and o.is_demo)
     and exists (select 1 from public.students s where s.organization_id = new.organization_id and s.id::text like 'de302000-%') then
    perform private.remove_demo_samples_in_org(new.organization_id);
  end if;
  return null;
end $$;
revoke execute on function private.remove_demo_samples_on_real_student() from public, anon, authenticated;

drop trigger if exists group_students_remove_demo_samples on public.group_students;
create trigger group_students_remove_demo_samples after insert on public.group_students
  for each row execute function private.remove_demo_samples_on_real_student();

-- مرة واحدة الآن: الحسابات التجريبية التي أُضيف لها طلاب حقيقيون من قبل.
do $$
declare r record;
begin
  for r in
    select distinct s.organization_id
      from public.students s
      join public.organizations o on o.id = s.organization_id and o.is_demo
     where s.id::text not like 'de302000-%'
  loop
    perform private.remove_demo_samples_in_org(r.organization_id);
  end loop;
end $$;
