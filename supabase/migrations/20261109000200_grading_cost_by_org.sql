-- ============================================================================
-- تكلفة التصحيح الفعلية لكل جهة (لمدير المنصة)
-- كم كلّف تصحيح أوراق كل جهة بالذكاء الاصطناعي، مقابل عدد طلابها النشطين وما فوترناه لها،
-- حتى يعرف المدير إن كان سعر الباقة مربحاً. لا بيانات طلاب هنا، أرقام فقط.
-- سعر صرف الدولار بيانات في الإعدادات، يعدّله المدير من لوحته.
-- ============================================================================

insert into public.platform_settings (key, value, is_public) values
  ('exchange', '{"usd_to_ils": 3.7}', false)
on conflict (key) do nothing;

create or replace function public.admin_grading_cost_by_org(p_days int default 30)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_since timestamptz := now() - make_interval(days => p_days);
  v jsonb;
begin
  if not private.is_platform_admin() then
    raise exception 'هذا الإجراء لمدير المنصة فقط' using errcode = '42501';
  end if;
  select jsonb_build_object(
    'usd_to_ils', coalesce((select (value ->> 'usd_to_ils')::numeric from public.platform_settings where key = 'exchange'), 3.7),
    'orgs', coalesce((
      select jsonb_agg(jsonb_build_object(
               'org_id', o.id, 'name', o.name, 'kind', o.kind,
               'papers', r.papers, 'escalated', r.escalated, 'cost_usd', r.cost_usd,
               'pages', coalesce(pg.pages, 0),
               'active_students', coalesce(st.n, 0),
               'billed', coalesce(inv.billed, 0))
             order by r.cost_usd desc)
        from (select organization_id, count(*) papers, count(*) filter (where escalated) escalated,
                     coalesce(sum(cost_usd), 0) cost_usd
                from public.grading_runs
               where started_at > v_since and status = 'succeeded'
               group by organization_id) r
        join public.organizations o on o.id = r.organization_id
        left join lateral (
          select count(*) pages from public.submission_pages p
            join public.submissions s on s.id = p.submission_id
           where s.organization_id = o.id and s.created_at > v_since) pg on true
        left join lateral (
          select count(distinct s.id) n
            from public.students s
            join public.group_students gs on gs.student_id = s.id and gs.left_at is null
            join public.groups g on g.id = gs.group_id and g.archived_at is null
           where s.organization_id = o.id and s.status = 'active') st on true
        left join lateral (
          select sum(amount) billed from public.invoices i
           where i.organization_id = o.id and i.status <> 'void' and i.created_at > v_since) inv on true
    ), '[]'::jsonb)
  ) into v;
  return v;
end $$;
revoke execute on function public.admin_grading_cost_by_org(int) from public, anon;
grant execute on function public.admin_grading_cost_by_org(int) to authenticated;
