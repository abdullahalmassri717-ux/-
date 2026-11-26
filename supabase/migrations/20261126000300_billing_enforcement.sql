-- ============================================================================
-- ماذا يحدث إذا لم تدفع الجهة (نهاية التجربة أو عدم تجديد الاشتراك)
-- قرار صاحب المشروع (2026-11-26):
--   • قبل نهاية التجربة بـ3 أيام: تنبيه لصاحب الجهة داخل المنصة.
--   • يوم انتهاء التجربة، ثم عند كل تجديد (شهرياً للمدرّس، كل دفعة للمدرسة):
--     تصدر فاتورة تلقائياً، ومهلة دفعها أيام من الإعدادات (افتراضياً 7).
--   • إذا مرّت المهلة بلا دفع: تتوقف أدوات الذكاء الاصطناعي والتصحيح ورفع
--     أوراق جديدة. الدخول وقراءة البيانات يبقيان، ولا يُحذف أي شيء أبداً.
--   • تأكيد الدفع من مدير المنصة يفتح كل شيء فوراً (الفاتورة تصبح «مدفوعة»).
--   • المدير يستطيع: قفل يدوي، أو مهلة/تمديد حتى تاريخ، أو الرجوع للتلقائي.
-- ============================================================================

insert into public.platform_settings (key, value, is_public)
values ('billing_policy', '{"grace_days": 7, "warn_days": 3}', false)
on conflict (key) do nothing;

create or replace function private.billing_policy_int(p_key text, p_default int)
returns int language sql stable security definer set search_path = '' as $$
  select coalesce((select (value ->> p_key)::int from public.platform_settings where key = 'billing_policy'), p_default)
$$;

-- قرار المدير على جهة: lock = قفل يدوي، grace = لا قفل حتى تاريخ (فارغ = دائماً).
alter table public.organizations
  add column if not exists billing_hold text check (billing_hold in ('lock', 'grace')),
  add column if not exists billing_hold_until date;
-- (لا صلاحية تعديل لهذين العمودين للمستخدمين؛ التعديل عبر admin_set_billing_hold فقط.)

-- الفواتير القديمة (قبل هذه الآلية) لا تسبب قفلاً.
alter table public.invoices add column if not exists enforce boolean not null default true;
update public.invoices set enforce = false where created_at < now();

-- موعد الفاتورة التالية لكل اشتراك.
alter table public.subscriptions add column if not exists next_invoice_on date;

create or replace function private.cycle_interval(p_cycle text, p_installments int)
returns interval language sql immutable set search_path = '' as $$
  select case when p_cycle = 'yearly' then make_interval(months => (12 / greatest(1, least(12, coalesce(p_installments, 1)))))
              else interval '1 month' end
$$;

-- الاشتراكات الحالية: موعد معقول، وأبكر شيء بعد 3 أيام (حتى يرى التنبيه أولاً).
update public.subscriptions s
   set next_invoice_on = greatest(
         current_date + 3,
         case when s.status = 'trial' then coalesce(s.trial_ends_on, current_date) + 1
              else (coalesce((select max(i.created_at)::date from public.invoices i
                               where i.subscription_id = s.id and i.status <> 'void'), s.started_on)
                    + private.cycle_interval(p.billing_cycle::text, p.installments))::date end)
  from public.subscription_plans p
 where p.id = s.plan_id and s.status in ('trial', 'active', 'past_due') and s.next_invoice_on is null;

-- اشتراك جديد، أو تغيّر تاريخ نهاية التجربة (موافقة المدير أو تمديد): الفاتورة الأولى بعد التجربة.
create or replace function private.subscription_next_invoice()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'trial' and new.trial_ends_on is not null
     and (tg_op = 'INSERT' or new.trial_ends_on is distinct from old.trial_ends_on) then
    new.next_invoice_on := new.trial_ends_on + 1;
  elsif tg_op = 'INSERT' and new.next_invoice_on is null then
    new.next_invoice_on := coalesce(new.started_on, current_date);
  end if;
  return new;
end $$;
drop trigger if exists subscriptions_next_invoice on public.subscriptions;
create trigger subscriptions_next_invoice before insert or update on public.subscriptions
  for each row execute function private.subscription_next_invoice();

-- ---------------------------------------------------------------------------
-- هل الجهة مقفلة بسبب الدفع؟ null = لا، 'manual' = قفل المدير، 'unpaid' = فاتورة متأخرة.
-- ---------------------------------------------------------------------------
create or replace function private.billing_lock(p_org uuid)
returns text language plpgsql stable security definer set search_path = '' as $$
declare
  o record;
begin
  select is_demo, billing_hold, billing_hold_until into o from public.organizations where id = p_org;
  if not found or o.is_demo then
    return null;
  end if;
  if o.billing_hold = 'lock' then
    return 'manual';
  end if;
  if o.billing_hold = 'grace' and (o.billing_hold_until is null or o.billing_hold_until >= current_date) then
    return null;
  end if;
  if exists (select 1 from public.invoices i
              where i.organization_id = p_org and i.enforce and i.amount > 0
                and i.status in ('issued', 'overdue') and i.due_on < current_date) then
    return 'unpaid';
  end if;
  return null;
end $$;

-- لوظائف الخادم (service_role) وللأعضاء: سبب القفل فقط، بلا أي تفاصيل.
create or replace function public.org_billing_lock(p_org uuid)
returns text language plpgsql stable security definer set search_path = '' as $$
begin
  -- بلا مستخدم = وظيفة خادم (service_role)، لأن الزائر لا يملك صلاحية تنفيذها.
  if auth.uid() is not null and not (private.is_org_member(p_org) or private.is_platform_admin()) then
    return null;
  end if;
  return private.billing_lock(p_org);
end $$;
revoke execute on function public.org_billing_lock(uuid) from public, anon;
grant execute on function public.org_billing_lock(uuid) to authenticated, service_role;

-- حالة الاشتراك لشريط التنبيه. المعلم يرى القفل فقط، وصاحب الجهة يرى التفاصيل.
create or replace function public.my_billing_state(p_org uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_owner boolean;
  v_lock text;
  s record;
  inv record;
  v_warn int := private.billing_policy_int('warn_days', 3);
begin
  if not private.is_org_member(p_org) then
    return null;
  end if;
  v_owner := private.is_org_owner(p_org);
  v_lock := private.billing_lock(p_org);
  if not v_owner then
    return jsonb_build_object('locked', v_lock, 'owner', false);
  end if;
  select status, trial_ends_on into s from public.subscriptions
   where organization_id = p_org and status in ('trial', 'active', 'past_due') limit 1;
  select number, amount, currency_code, due_on into inv from public.invoices
   where organization_id = p_org and enforce and amount > 0 and status in ('issued', 'overdue')
   order by due_on limit 1;
  return jsonb_build_object(
    'locked', v_lock,
    'owner', true,
    'trial_ends_on', case when s.status = 'trial' and s.trial_ends_on - current_date between 0 and v_warn then s.trial_ends_on end,
    'invoice', case when inv.number is not null then
      jsonb_build_object('number', inv.number, 'amount', inv.amount, 'currency', inv.currency_code, 'due_on', inv.due_on) end,
    'pending_receipt', exists (select 1 from public.invoices
                                where organization_id = p_org and status = 'pending_confirmation'));
end $$;
revoke execute on function public.my_billing_state(uuid) from public, anon;
grant execute on function public.my_billing_state(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- القفل الفعلي: لا أوراق جديدة (رفع المدرّس أو رابط الطالب).
-- أدوات الذكاء الاصطناعي والتصحيح تفحص org_billing_lock في وظائف الخادم.
-- ---------------------------------------------------------------------------
create or replace function private.block_submission_when_unpaid()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if private.billing_lock(new.organization_id) is not null then
    raise exception 'الاشتراك متوقف لعدم الدفع. تُستأنف الخدمة فور تأكيد الدفع، وبياناتك كلها محفوظة.'
      using errcode = 'P0001';
  end if;
  return new;
end $$;
drop trigger if exists submissions_block_when_unpaid on public.submissions;
create trigger submissions_block_when_unpaid before insert on public.submissions
  for each row execute function private.block_submission_when_unpaid();

-- التصحيح التلقائي للأوراق العالقة يتخطى الجهات المقفلة (لا يستهلك محاولاتها).
create or replace function public.claim_stuck_submissions(p_limit int default 10)
returns setof uuid language plpgsql security definer set search_path = '' as $$
begin
  return query
  with picked as (
    select s.id
    from public.submissions s
    where s.auto_grade_attempts < 3
      and (
        (s.status = 'uploaded' and s.updated_at < now() - interval '5 minutes')
        or (s.status = 'grading' and s.updated_at < now() - interval '15 minutes')
        or (s.status = 'failed' and s.updated_at < now() - interval '10 minutes')
      )
      and private.billing_lock(s.organization_id) is null
    order by s.updated_at
    limit greatest(1, least(p_limit, 50))
    for update skip locked
  )
  update public.submissions s
     set status = 'grading', auto_grade_attempts = s.auto_grade_attempts + 1
    from picked
   where s.id = picked.id
  returning s.id;
end $$;
revoke execute on function public.claim_stuck_submissions(int) from public, anon, authenticated;
grant execute on function public.claim_stuck_submissions(int) to service_role;

-- ---------------------------------------------------------------------------
-- الفاتورة التلقائية (مقدّماً للفترة القادمة).
-- ---------------------------------------------------------------------------
create or replace function private.auto_issue_invoice(p_sub uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  s record;
  q jsonb;
  v_start date;
  v_end date;
  v_amount numeric(12,2);
  v_units int;
  v_no int;
  v_id uuid;
begin
  select su.id, su.organization_id, su.next_invoice_on, p.billing_cycle::text as cycle, p.installments
    into s
    from public.subscriptions su join public.subscription_plans p on p.id = su.plan_id
   where su.id = p_sub;
  q := private.usage_quote(s.organization_id);
  if q is null then
    return null;
  end if;
  v_start := coalesce(s.next_invoice_on, current_date);
  v_end := (v_start + private.cycle_interval(s.cycle, s.installments))::date - 1;
  v_units := coalesce((q ->> 'units')::int, 0);
  if q ->> 'pricing_model' = 'per_paper' then
    v_amount := (q ->> 'amount')::numeric;   -- لكل ورقة: ما استُخدم منذ آخر فاتورة
  else
    v_amount := round(v_units * (q ->> 'unit_price')::numeric
                      / case when s.cycle = 'yearly' then greatest(1, s.installments) else 1 end, 2);
  end if;
  select count(*) + 1 into v_no from public.invoices where organization_id = s.organization_id;

  insert into public.invoices (organization_id, subscription_id, number, period_start, period_end, installment_no,
                               active_students, price_per_student, amount, currency_code, status, due_on,
                               pricing_model, units, notes, paid_at)
  values (s.organization_id, s.id,
          'INV-' || to_char(current_date, 'YYMM') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)),
          v_start, v_end, v_no,
          case when q ->> 'pricing_model' = 'per_student' then v_units else 0 end,
          (q ->> 'unit_price')::numeric, v_amount, q ->> 'currency_code',
          case when v_amount = 0 then 'paid'::public.invoice_status else 'issued'::public.invoice_status end,
          current_date + private.billing_policy_int('grace_days', 7),
          q ->> 'pricing_model', v_units, 'فاتورة تلقائية',
          case when v_amount = 0 then now() end)
  returning id into v_id;

  update public.subscriptions
     set status = case when status = 'trial' then 'active'::public.subscription_status else status end,
         current_period_start = v_start,
         current_period_end = v_end,
         next_invoice_on = v_end + 1
   where id = s.id;
  return v_id;
end $$;
revoke execute on function private.auto_issue_invoice(uuid) from public, anon, authenticated;

-- كل يوم: فواتير من حان موعدها. يتخطى الجهات التجريبية (demo)، غير المفعّلة، والموقوفة مؤقتاً.
create or replace function private.run_billing_cycle()
returns int language plpgsql security definer set search_path = '' as $$
declare
  r record;
  v_count int := 0;
begin
  for r in
    select s.id from public.subscriptions s
      join public.organizations o on o.id = s.organization_id
     where s.status in ('trial', 'active', 'past_due')
       and s.next_invoice_on <= current_date
       and o.status = 'active' and not o.is_demo
       and not private.org_paused_on(o.id)
  loop
    begin
      if private.auto_issue_invoice(r.id) is not null then
        v_count := v_count + 1;
      end if;
    exception when others then
      raise warning 'billing cycle: subscription % failed: %', r.id, sqlerrm;
    end;
  end loop;
  return v_count;
end $$;
revoke execute on function private.run_billing_cycle() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    execute $cmd$select cron.schedule('daqa-billing-cycle', '0 5 * * *', 'select private.run_billing_cycle()')$cmd$;
  end if;
exception when others then
  raise warning 'billing cycle schedule not created: %', sqlerrm;
end $$;

-- الفاتورة اليدوية من المدير: كما كانت، وتؤجّل الفاتورة التلقائية القادمة دورة كاملة.
create or replace function public.admin_issue_invoice(p_org uuid, p_amount numeric default null, p_note text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  q jsonb;
  v_id uuid;
  v_no int;
  v_amount numeric(12,2);
begin
  if not private.admin_can('finance') then
    raise exception 'هذا الإجراء لمدير المنصة فقط' using errcode = '42501';
  end if;
  q := private.usage_quote(p_org);
  if q is null then
    raise exception 'لا يوجد اشتراك لهذه الجهة';
  end if;
  v_amount := coalesce(p_amount, (q ->> 'amount')::numeric);
  if v_amount < 0 then
    raise exception 'المبلغ لا يمكن أن يكون سالباً';
  end if;
  select count(*) + 1 into v_no from public.invoices where organization_id = p_org;

  insert into public.invoices (organization_id, subscription_id, number, period_start, period_end, installment_no,
                               active_students, price_per_student, amount, currency_code, status, due_on,
                               pricing_model, units, notes, paid_at)
  values (p_org, (q ->> 'subscription_id')::uuid,
          'INV-' || to_char(current_date, 'YYMM') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)),
          (q ->> 'period_start')::date, (q ->> 'period_end')::date, v_no,
          case when q ->> 'pricing_model' = 'per_student' then (q ->> 'units')::int else 0 end,
          (q ->> 'unit_price')::numeric, v_amount, q ->> 'currency_code',
          case when v_amount = 0 then 'paid'::public.invoice_status else 'issued'::public.invoice_status end,
          current_date + private.billing_policy_int('grace_days', 7), q ->> 'pricing_model', (q ->> 'units')::int, nullif(trim(p_note), ''),
          case when v_amount = 0 then now() end)
  returning id into v_id;

  update public.subscriptions su
     set status = case when su.status = 'trial' then 'active'::public.subscription_status else su.status end,
         current_period_start = (q ->> 'period_start')::date,
         current_period_end = (q ->> 'period_end')::date,
         next_invoice_on = greatest(coalesce(su.next_invoice_on, current_date),
                                    (current_date + private.cycle_interval(p.billing_cycle::text, p.installments))::date)
    from public.subscription_plans p
   where su.id = (q ->> 'subscription_id')::uuid and p.id = su.plan_id;
  return v_id;
end $$;
revoke execute on function public.admin_issue_invoice(uuid, numeric, text) from public, anon;
grant execute on function public.admin_issue_invoice(uuid, numeric, text) to authenticated;

-- ---------------------------------------------------------------------------
-- أدوات المدير
-- ---------------------------------------------------------------------------
-- p_mode: auto = حسب الدفع، lock = قفل الآن، grace = لا قفل حتى p_until (فارغ = دائماً).
-- مع grace لجهة في التجربة وتاريخ محدد: تُمدَّد التجربة نفسها حتى ذلك التاريخ.
create or replace function public.admin_set_billing_hold(p_org uuid, p_mode text, p_until date default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.admin_can('finance', 'orgs') then
    raise exception 'هذا الإجراء لمدير المنصة فقط' using errcode = '42501';
  end if;
  if p_mode not in ('auto', 'lock', 'grace') then
    raise exception 'خيار غير معروف';
  end if;
  if p_mode = 'grace' and p_until is not null and p_until < current_date then
    raise exception 'التاريخ يجب أن يكون اليوم أو بعده';
  end if;
  update public.organizations
     set billing_hold = case when p_mode = 'auto' then null else p_mode end,
         billing_hold_until = case when p_mode = 'grace' then p_until end
   where id = p_org;
  if p_mode = 'grace' and p_until is not null then
    update public.subscriptions set trial_ends_on = p_until
     where organization_id = p_org and status = 'trial' and coalesce(trial_ends_on, current_date) < p_until;
  end if;
end $$;
revoke execute on function public.admin_set_billing_hold(uuid, text, date) from public, anon;
grant execute on function public.admin_set_billing_hold(uuid, text, date) to authenticated;

-- حالة الدفع لكل الجهات (لقائمة الجهات في لوحة المدير).
create or replace function public.admin_billing_overview()
returns table (organization_id uuid, locked text, billing_hold text, billing_hold_until date,
               next_invoice_on date, overdue_since date)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.admin_can('finance', 'orgs') then
    raise exception 'هذا الإجراء لمدير المنصة فقط' using errcode = '42501';
  end if;
  return query
  select o.id, private.billing_lock(o.id), o.billing_hold, o.billing_hold_until,
         (select s.next_invoice_on from public.subscriptions s
           where s.organization_id = o.id and s.status in ('trial', 'active', 'past_due') limit 1),
         (select min(i.due_on) from public.invoices i
           where i.organization_id = o.id and i.enforce and i.amount > 0
             and i.status in ('issued', 'overdue') and i.due_on < current_date)
    from public.organizations o;
end $$;
revoke execute on function public.admin_billing_overview() from public, anon;
grant execute on function public.admin_billing_overview() to authenticated;
