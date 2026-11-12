-- ============================================================================
-- دقة — تمييز الجهات التجريبية في لوحة مدير المنصة
--
-- • organizations.is_demo: جهات الحسابات التجريبية (0599990001–5). تختفي من
--   قائمة «الجهات» افتراضياً، ولا تُصدر لها فواتير جماعية.
-- • admin_organizations يرجع is_demo، و«يدرّس أيضاً في»: إن كان مالك حساب
--   المدرّس الخصوصي معلماً في مدرسة أو مركز، حتى يفهم المدير لماذا يظهر.
-- ============================================================================

alter table public.organizations add column if not exists is_demo boolean not null default false;
update public.organizations set is_demo = true where id::text like 'de300000-%' and not is_demo;

drop function if exists public.admin_organizations();
create or replace function public.admin_organizations()
returns table (
  id uuid, name text, kind text, region text, created_at timestamptz,
  status text, status_note text,
  owner_name text, owner_phone text, owner_invited boolean,
  active_students int, teachers int,
  plan_id uuid, plan_name text, pricing_model text, subscription_status text, trial_ends_on date,
  papers_30d int, grading_cost_30d numeric, unpaid_amount numeric,
  is_demo boolean, owner_also_teaches_at text
) language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.admin_can('orgs', 'finance') then
    raise exception 'هذا الإجراء لمدير المنصة فقط' using errcode = '42501';
  end if;
  return query
  select o.id, o.name, o.kind::text, o.region, o.created_at,
         o.status::text, o.status_note,
         coalesce(ow.full_name, inv.full_name), coalesce(ow.phone, inv.phone), (ow.phone is null and inv.phone is not null),
         (select count(distinct s.id)::int
            from public.students s
            join public.group_students gs on gs.student_id = s.id and gs.left_at is null
            join public.groups g on g.id = gs.group_id and g.archived_at is null
           where s.organization_id = o.id and s.status = 'active'),
         (select count(*)::int from public.memberships m where m.organization_id = o.id and m.status = 'active' and m.role = 'teacher'),
         sp.id, sp.name, sp.pricing_model, su.status::text, su.trial_ends_on,
         (select count(*)::int from public.submissions x where x.organization_id = o.id and x.created_at > now() - interval '30 days'),
         (select coalesce(sum(r.cost_usd), 0) from public.grading_runs r where r.organization_id = o.id and r.started_at > now() - interval '30 days'),
         (select coalesce(sum(i.amount - coalesce((select sum(pr.amount) from public.payment_receipts pr
                                                     where pr.invoice_id = i.id and pr.status = 'confirmed'), 0)), 0)
            from public.invoices i where i.organization_id = o.id and i.status in ('issued', 'overdue', 'pending_confirmation')),
         o.is_demo,
         case when o.kind = 'individual_teacher' and ow.user_id is not null then
           (select string_agg(o2.name, '، ' order by o2.name)
              from public.memberships m2 join public.organizations o2 on o2.id = m2.organization_id
             where m2.user_id = ow.user_id and m2.status = 'active' and m2.role = 'teacher'
               and o2.id <> o.id and o2.kind <> 'individual_teacher')
         end
    from public.organizations o
    left join lateral (
      select m.user_id, p.full_name, p.phone from public.memberships m join public.profiles p on p.id = m.user_id
       where m.organization_id = o.id and m.role = 'owner' and m.status = 'active' order by m.created_at limit 1
    ) ow on true
    left join lateral (
      select i.full_name, i.phone from public.invitations i
       where i.organization_id = o.id and i.role = 'owner' and i.accepted_at is null order by i.created_at limit 1
    ) inv on true
    left join lateral (
      select s.status, s.trial_ends_on, s.plan_id from public.subscriptions s
       where s.organization_id = o.id and s.status in ('trial', 'active', 'past_due') limit 1
    ) su on true
    left join public.subscription_plans sp on sp.id = su.plan_id
   order by o.is_demo, (o.status = 'pending') desc, o.created_at desc;
end $$;
revoke execute on function public.admin_organizations() from public, anon;
grant execute on function public.admin_organizations() to authenticated;

-- الفواتير الجماعية لا تشمل الجهات التجريبية.
create or replace function public.admin_issue_invoices_bulk(p_kind text default 'individual_teacher')
returns int language plpgsql security definer set search_path = '' as $$
declare
  r record;
  q jsonb;
  v_count int := 0;
begin
  if not private.admin_can('finance') then
    raise exception 'هذا الإجراء لمدير المنصة فقط' using errcode = '42501';
  end if;
  for r in
    select o.id from public.organizations o
      join public.subscriptions s on s.organization_id = o.id and s.status in ('trial', 'active', 'past_due')
     where o.status = 'active' and not o.is_demo
       and (p_kind is null or p_kind = 'all' or o.kind::text = p_kind
            or (p_kind = 'schools' and o.kind <> 'individual_teacher'))
       and not (s.status = 'trial' and coalesce(s.trial_ends_on, current_date) >= current_date)
       and not exists (select 1 from public.invoices i
                        where i.organization_id = o.id and i.status <> 'void'
                          and date_trunc('month', i.created_at) = date_trunc('month', now()))
  loop
    q := private.usage_quote(r.id);
    if q is not null and (q ->> 'amount')::numeric > 0 then
      perform public.admin_issue_invoice(r.id);
      v_count := v_count + 1;
    end if;
  end loop;
  return v_count;
end $$;
revoke execute on function public.admin_issue_invoices_bulk(text) from public, anon;
grant execute on function public.admin_issue_invoices_bulk(text) to authenticated;
