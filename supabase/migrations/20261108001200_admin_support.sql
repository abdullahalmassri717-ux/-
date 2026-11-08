-- ============================================================================
-- دقة — لوحة مدير المنصة والدعم الفني:
-- • اشتراك تجريبي تلقائي لكل جهة جديدة (مدته من الإعدادات).
-- • إصدار فاتورة لجهة من لوحة المدير (يحسب الطلاب النشطين والمبلغ).
-- • ملخصات للمدير (الجهات، جودة وتكلفة التصحيح) بدون كشف بيانات الطلاب.
-- • تذاكر الدعم الفني ورسائلها.
-- ============================================================================

insert into public.platform_settings (key, value, is_public) values
  ('trial', '{"days": 14}', true)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- اشتراك تجريبي عند إنشاء الجهة
-- ---------------------------------------------------------------------------
create or replace function private.start_trial_subscription()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_plan public.subscription_plans%rowtype;
  v_days int := coalesce((select (value ->> 'days')::int from public.platform_settings where key = 'trial'), 14);
begin
  select * into v_plan from public.subscription_plans
   where is_active
     and target = case when new.kind = 'individual_teacher' then 'teachers'::public.plan_target else 'schools'::public.plan_target end
   order by sort_order limit 1;
  if v_plan.id is not null then
    insert into public.subscriptions (organization_id, plan_id, status, price_per_student, trial_ends_on, current_period_start)
    values (new.id, v_plan.id, 'trial', v_plan.price_per_student, current_date + v_days, current_date);
  end if;
  return new;
end $$;
create trigger organizations_start_trial after insert on public.organizations
  for each row execute function private.start_trial_subscription();

-- ---------------------------------------------------------------------------
-- إصدار فاتورة (مدير المنصة فقط)
-- ---------------------------------------------------------------------------
create or replace function public.admin_issue_invoice(p_org uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_sub record;
  v_students int;
  v_months int;
  v_amount numeric(12,2);
  v_id uuid;
  v_no int;
begin
  if not private.is_platform_admin() then
    raise exception 'هذا الإجراء لمدير المنصة فقط' using errcode = '42501';
  end if;
  select s.id, s.price_per_student, p.billing_cycle, p.minimum_charge, p.installments, p.currency_code
    into v_sub
    from public.subscriptions s join public.subscription_plans p on p.id = s.plan_id
   where s.organization_id = p_org and s.status in ('trial', 'active', 'past_due')
   limit 1;
  if v_sub.id is null then
    raise exception 'لا يوجد اشتراك لهذه الجهة';
  end if;
  select count(*) into v_students from public.students where organization_id = p_org and status = 'active';
  v_months := case when v_sub.billing_cycle = 'monthly' then 1 else greatest(1, 12 / v_sub.installments) end;
  v_amount := round(greatest(v_sub.minimum_charge, v_students * v_sub.price_per_student)
                    / case when v_sub.billing_cycle = 'monthly' then 1 else v_sub.installments end, 2);
  select count(*) + 1 into v_no from public.invoices where organization_id = p_org;

  insert into public.invoices (organization_id, subscription_id, number, period_start, period_end, installment_no,
                               active_students, price_per_student, amount, currency_code, status, due_on)
  values (p_org, v_sub.id,
          'INV-' || to_char(current_date, 'YYMM') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)),
          current_date, (current_date + make_interval(months => v_months))::date - 1, v_no,
          v_students, v_sub.price_per_student, v_amount, v_sub.currency_code, 'issued', current_date + 7)
  returning id into v_id;

  -- أول فاتورة بعد التجربة تجعل الاشتراك «نشطاً».
  update public.subscriptions set status = 'active', current_period_start = current_date,
         current_period_end = (current_date + make_interval(months => v_months))::date - 1
   where id = v_sub.id and status = 'trial';
  return v_id;
end $$;
revoke execute on function public.admin_issue_invoice(uuid) from public, anon;
grant execute on function public.admin_issue_invoice(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- ملخص الجهات للمدير (أعداد فقط، بلا أسماء طلاب)
-- ---------------------------------------------------------------------------
create or replace function public.admin_organizations()
returns table (
  id uuid, name text, kind text, region text, created_at timestamptz,
  owner_name text, owner_phone text,
  active_students int, teachers int,
  plan_name text, subscription_status text, trial_ends_on date,
  papers_30d int, grading_cost_30d numeric, unpaid_amount numeric
) language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_platform_admin() then
    raise exception 'هذا الإجراء لمدير المنصة فقط' using errcode = '42501';
  end if;
  return query
  select o.id, o.name, o.kind::text, o.region, o.created_at,
         ow.full_name, ow.phone,
         (select count(*)::int from public.students s where s.organization_id = o.id and s.status = 'active'),
         (select count(*)::int from public.memberships m where m.organization_id = o.id and m.status = 'active' and m.role = 'teacher'),
         sp.name, su.status::text, su.trial_ends_on,
         (select count(*)::int from public.submissions x where x.organization_id = o.id and x.created_at > now() - interval '30 days'),
         (select coalesce(sum(r.cost_usd), 0) from public.grading_runs r where r.organization_id = o.id and r.started_at > now() - interval '30 days'),
         (select coalesce(sum(i.amount), 0) from public.invoices i where i.organization_id = o.id and i.status in ('issued', 'overdue', 'pending_confirmation'))
    from public.organizations o
    left join lateral (
      select p.full_name, p.phone from public.memberships m join public.profiles p on p.id = m.user_id
       where m.organization_id = o.id and m.role = 'owner' and m.status = 'active' order by m.created_at limit 1
    ) ow on true
    left join lateral (
      select s.status, s.trial_ends_on, s.plan_id from public.subscriptions s
       where s.organization_id = o.id and s.status in ('trial', 'active', 'past_due') limit 1
    ) su on true
    left join public.subscription_plans sp on sp.id = su.plan_id
   order by o.created_at desc;
end $$;
revoke execute on function public.admin_organizations() from public, anon;
grant execute on function public.admin_organizations() to authenticated;

-- ---------------------------------------------------------------------------
-- جودة وتكلفة التصحيح للمدير (آخر p_days يوماً)
-- ---------------------------------------------------------------------------
create or replace function public.admin_grading_quality(p_days int default 30)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_since timestamptz := now() - make_interval(days => p_days);
  v jsonb;
begin
  if not private.is_platform_admin() then
    raise exception 'هذا الإجراء لمدير المنصة فقط' using errcode = '42501';
  end if;
  select jsonb_build_object(
    'runs', (select count(*) from public.grading_runs where started_at > v_since),
    'failed', (select count(*) from public.grading_runs where started_at > v_since and status = 'failed'),
    'escalated', (select count(*) from public.grading_runs where started_at > v_since and escalated),
    'cost_usd', (select coalesce(sum(cost_usd), 0) from public.grading_runs where started_at > v_since),
    'answers', (select count(*) from public.question_grades where created_at > v_since and ai_score is not null),
    'low_confidence', (select count(*) from public.question_grades where created_at > v_since and ai_confidence < 0.7),
    'edited', (select count(distinct question_grade_id) from public.grade_edits where edited_at > v_since),
    'avg_abs_change', (select round(coalesce(avg(abs(new_score - coalesce(ai_score, old_score))), 0), 2)
                         from public.grade_edits where edited_at > v_since and new_score is not null),
    'by_model', coalesce((select jsonb_agg(jsonb_build_object('model', model, 'runs', n, 'cost_usd', c))
                            from (select coalesce(model, '—') as model, count(*) n, sum(cost_usd) c
                                    from public.grading_runs where started_at > v_since group by 1 order by 2 desc) t), '[]'::jsonb),
    'by_day', coalesce((select jsonb_agg(jsonb_build_object('day', d, 'runs', n, 'cost_usd', c) order by d)
                          from (select started_at::date d, count(*) n, sum(cost_usd) c
                                  from public.grading_runs where started_at > v_since group by 1) t), '[]'::jsonb),
    'by_subject', coalesce((select jsonb_agg(jsonb_build_object('subject', subject, 'answers', n, 'edited', e) order by n desc)
                              from (select coalesce(sj.name, '—') subject, count(*) n,
                                           count(*) filter (where exists (select 1 from public.grade_edits ge where ge.question_grade_id = g.id)) e
                                      from public.question_grades g
                                      join public.submissions s on s.id = g.submission_id
                                      join public.assessments a on a.id = s.assessment_id
                                      left join public.subjects sj on sj.id = a.subject_id
                                     where g.created_at > v_since and g.ai_score is not null
                                     group by 1) t), '[]'::jsonb)
  ) into v;
  return v;
end $$;
revoke execute on function public.admin_grading_quality(int) from public, anon;
grant execute on function public.admin_grading_quality(int) to authenticated;

-- ---------------------------------------------------------------------------
-- الدعم الفني
-- ---------------------------------------------------------------------------
create type public.ticket_status as enum ('open', 'in_progress', 'resolved');

create table public.support_tickets (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid references public.organizations (id) on delete set null,
  created_by       uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  subject          text not null check (length(trim(subject)) between 3 and 200),
  category         text,
  priority         text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  status           public.ticket_status not null default 'open',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index support_tickets_status_idx on public.support_tickets (status, updated_at desc);
create index support_tickets_creator_idx on public.support_tickets (created_by);
create trigger support_tickets_touch before update on public.support_tickets
  for each row execute function private.touch_updated_at();

create table public.support_messages (
  id          uuid primary key default gen_random_uuid(),
  ticket_id   uuid not null references public.support_tickets (id) on delete cascade,
  sender_id   uuid references public.profiles (id) on delete set null default auth.uid(),
  from_admin  boolean not null default false,
  body        text not null check (length(trim(body)) between 1 and 5000),
  created_at  timestamptz not null default now()
);
create index support_messages_ticket_idx on public.support_messages (ticket_id, created_at);

-- رسالة المدير تُعلَّم «من الدعم» ويُفتح/يُحدَّث وقت التذكرة.
create or replace function private.support_message_stamp()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.from_admin := private.is_platform_admin();
  new.sender_id := auth.uid();
  update public.support_tickets
     set updated_at = now(),
         status = case when new.from_admin then status else 'open' end
   where id = new.ticket_id;
  return new;
end $$;
create trigger support_messages_stamp before insert on public.support_messages
  for each row execute function private.support_message_stamp();

alter table public.support_tickets  enable row level security;
alter table public.support_messages enable row level security;

create policy tickets_select on public.support_tickets for select to authenticated
  using (created_by = (select auth.uid()) or private.is_platform_admin());
create policy tickets_insert on public.support_tickets for insert to authenticated
  with check (created_by = (select auth.uid()) and status = 'open'
              and (organization_id is null or private.is_org_member(organization_id)));
create policy tickets_admin_update on public.support_tickets for update to authenticated
  using (private.is_platform_admin()) with check (private.is_platform_admin());

create policy messages_select on public.support_messages for select to authenticated
  using (exists (select 1 from public.support_tickets t where t.id = ticket_id
                 and (t.created_by = (select auth.uid()) or private.is_platform_admin())));
create policy messages_insert on public.support_messages for insert to authenticated
  with check (exists (select 1 from public.support_tickets t where t.id = ticket_id
                      and (t.created_by = (select auth.uid()) or private.is_platform_admin())));

revoke all on public.support_tickets, public.support_messages from anon;
revoke update, delete on public.support_messages from authenticated;
