-- رابط التقرير أقصر (12 حرفاً بدل 16) حتى تتسع رسالة SMS واحدة (70 حرفاً عربياً)
-- لاسم الطالب ورمزه ورابط التقرير. 12 حرفاً = 48 بت، والرابط يعمل 60 يوماً فقط.

alter table public.reports drop constraint if exists reports_share_code_check;
alter table public.reports
  alter column share_code set default substr(replace(gen_random_uuid()::text, '-', ''), 1, 12),
  add constraint reports_share_code_check check (share_code ~ '^[0-9a-f]{12}([0-9a-f]{4})?$');

-- التقارير التي لم تُرسل بعد تأخذ الرابط القصير.
update public.reports set share_code = left(share_code, 12)
 where status in ('draft', 'queued') and length(share_code) = 16;

create or replace function public.get_shared_report(p_code text)
returns table (org_name text, period_start date, period_end date, body text, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select o.name, r.period_start, r.period_end, r.body, r.created_at
  from public.reports r
  join public.organizations o on o.id = r.organization_id
  where p_code ~ '^[0-9a-f]{12}([0-9a-f]{4})?$'
    and r.share_code = p_code
    and r.status in ('queued', 'sent')
    and r.created_at > now() - interval '60 days'
  limit 1
$$;
revoke all on function public.get_shared_report(text) from public;
grant execute on function public.get_shared_report(text) to anon, authenticated;
