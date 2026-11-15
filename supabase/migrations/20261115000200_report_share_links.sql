-- رابط قصير لكل تقرير، يُرسل لولي الأمر في رسالة SMS قصيرة بدل نص التقرير كاملاً.
-- الصفحة العامة dequa.study/r/<share_code> تعرض نص التقرير فقط، بدون حساب.
-- الرمز عشوائي (16 حرفاً، 64 بت) فلا يمكن تخمينه، والرابط يعمل 60 يوماً فقط.

alter table public.reports
  add column share_code text unique
    default substr(replace(gen_random_uuid()::text, '-', ''), 1, 16)
    check (share_code ~ '^[0-9a-f]{16}$');

update public.reports
   set share_code = substr(replace(gen_random_uuid()::text, '-', ''), 1, 16)
 where share_code is null;

alter table public.reports alter column share_code set not null;

-- ما تعرضه صفحة الرابط: اسم الجهة، الفترة، ونص التقرير. لا أرقام هواتف ولا رموز طلاب.
create or replace function public.get_shared_report(p_code text)
returns table (org_name text, period_start date, period_end date, body text, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select o.name, r.period_start, r.period_end, r.body, r.created_at
  from public.reports r
  join public.organizations o on o.id = r.organization_id
  where p_code ~ '^[0-9a-f]{16}$'
    and r.share_code = p_code
    and r.status in ('queued', 'sent')
    and r.created_at > now() - interval '60 days'
  limit 1
$$;
revoke all on function public.get_shared_report(text) from public;
grant execute on function public.get_shared_report(text) to anon, authenticated;
