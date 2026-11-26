-- ============================================================================
-- دقة — جهات عرض لحساب مدير المنصة (للتجربة والشرح)، 2026-11-26.
-- مدرسة يكون فيها مديراً (ومنها «صفحتي كأستاذ» لواجهة المعلم)، وصفحة مدرّس خصوصي.
-- معلَّمة is_demo: لا تظهر في إحصاءات المنصة ولا الفواتير. تُشغَّل أكثر من مرة بلا ضرر.
-- ============================================================================
\set ON_ERROR_STOP 1
begin;

-- نفس محتوى supabase/migrations/20261126000100_stop_auto_remove_demo.sql
drop trigger if exists group_students_remove_demo on public.group_students;
drop function if exists private.remove_demo_on_first_real_student();

do $$
declare
  v_admin uuid;
begin
  select a.user_id into v_admin
    from public.platform_admins a join auth.users u on u.id = a.user_id
   where u.phone like '%2810385'
   limit 1;
  if v_admin is null then raise exception 'platform owner account not found'; end if;

  insert into public.organizations (id, name, kind, region, created_by, status, approved_at, is_demo) values
    ('de3a0000-0000-4000-8000-000000000001', 'مدرسة العرض (للتجربة)', 'school', 'غزة', v_admin, 'active', now(), true),
    ('de3a0000-0000-4000-8000-000000000002', 'صفحتي كمدرّس خصوصي (للتجربة)', 'individual_teacher', 'غزة', v_admin, 'active', now(), true)
  on conflict (id) do nothing;

  insert into public.memberships (organization_id, user_id, role, status) values
    ('de3a0000-0000-4000-8000-000000000001', v_admin, 'owner', 'active'),
    ('de3a0000-0000-4000-8000-000000000002', v_admin, 'owner', 'active')
  on conflict (organization_id, user_id) do nothing;
end $$;

select o.name, o.kind, o.status, o.is_demo, m.role
  from public.organizations o join public.memberships m on m.organization_id = o.id
 order by o.name;

commit;
