-- ============================================================================
-- دقة — جرد البيانات قبل حذف بيانات التجربة (قراءة فقط، لا يغيّر شيئاً).
-- المستودع عام، فلا تطبع أسماء طلاب أو أرقام هواتف كاملة: فقط أسماء الجهات،
-- وآخر 3 أرقام من الهاتف، وأعداد.
-- ============================================================================
\pset pager off
\pset footer off

\echo '=== 1) الجهات (organizations) ==='
with org_tables as (
  select c.table_name
    from information_schema.columns c
    join information_schema.tables t on t.table_schema = c.table_schema and t.table_name = c.table_name and t.table_type = 'BASE TABLE'
   where c.table_schema = 'public' and c.column_name = 'organization_id'
)
select o.id, o.name, o.kind, coalesce(o.is_demo, false) as is_demo,
       to_char(o.created_at, 'YYYY-MM-DD') as created,
       '…' || right(coalesce(p.phone, u.phone, '-'), 3) as creator,
       (select count(*) from public.memberships m where m.organization_id = o.id) as members,
       (select count(*) from public.groups g where g.organization_id = o.id) as groups,
       (select count(*) from public.students s where s.organization_id = o.id) as students,
       (select count(*) from public.assessments a where a.organization_id = o.id) as exams,
       (select count(*) from public.submissions s where s.organization_id = o.id) as papers,
       (select count(*) from public.reports r where r.organization_id = o.id) as reports,
       (select count(*) from public.invoices i where i.organization_id = o.id) as invoices,
       (select count(*) from storage.objects so where (storage.foldername(so.name))[1] = o.id::text) as files,
       (select coalesce(round(sum((so.metadata->>'size')::bigint) / 1048576.0, 1), 0) from storage.objects so where (storage.foldername(so.name))[1] = o.id::text) as mb
  from public.organizations o
  left join public.profiles p on p.id = o.created_by
  left join auth.users u on u.id = o.created_by
 order by o.created_at;

\echo '=== 2) المستخدمون (users) ==='
select '…' || right(coalesce(u.phone, '-'), 3) as phone, u.id,
       to_char(u.created_at, 'YYYY-MM-DD') as created,
       to_char(u.last_sign_in_at, 'YYYY-MM-DD') as last_login,
       (u.phone like '9705999900%') as demo_number,
       exists (select 1 from public.platform_admins a where a.user_id = u.id) as platform_staff,
       (select string_agg(o.name || ' (' || m.role || ')', '، ') from public.memberships m join public.organizations o on o.id = m.organization_id where m.user_id = u.id) as orgs
  from auth.users u
 order by u.created_at;

\echo '=== 3) جداول عامة غير مربوطة بجهة ==='
select 'app_errors' as t, count(*) from public.app_errors
union all select 'support_tickets', count(*) from public.support_tickets
union all select 'support_tickets_without_org', count(*) from public.support_tickets where organization_id is null
union all select 'platform_staff_invites', count(*) from public.platform_staff_invites
union all select 'whatsapp_contacts', count(*) from public.whatsapp_contacts
union all select 'whatsapp_login_codes', count(*) from public.whatsapp_login_codes
union all select 'submission_link_attempts', count(*) from public.submission_link_attempts
union all select 'storage files total', count(*) from storage.objects
union all select 'curricula', count(*) from public.curricula
union all select 'lessons', count(*) from public.lessons;

\echo '=== 4) الملفات حسب المخزن ==='
select bucket_id, count(*), round(sum((metadata->>'size')::bigint) / 1048576.0, 1) as mb,
       count(*) filter (where private.try_uuid((storage.foldername(name))[1]) is null or not exists (select 1 from public.organizations o where o.id::text = (storage.foldername(name))[1])) as not_under_an_org
  from storage.objects group by 1 order by 1;

\echo '=== 5) هل الحذف المباشر للملفات محمي؟ ==='
select tgname from pg_trigger where tgrelid = 'storage.objects'::regclass and not tgisinternal;
