-- ============================================================================
-- دقة — المرحلة 1 (6/7): الباقات والاشتراكات والفواتير وإيصالات الدفع،
-- ورسوم الطلاب (النظام المالي الخاص بالمدرّس).
--
-- • الفواتير والاشتراكات يراها مالك الجهة ومدير المنصة فقط — معلمو المدرسة لا.
-- • الدفع: تحويل بنكي أو محفظة، يرفع المالك صورة الإيصال، ويؤكده مدير المنصة يدوياً.
-- • رسوم الطلاب يراها ويديرها مالك الجهة فقط.
-- ============================================================================

create type public.plan_target as enum ('teachers', 'schools', 'enterprise');
create type public.billing_cycle as enum ('monthly', 'yearly');
create type public.subscription_status as enum ('trial', 'active', 'past_due', 'canceled');
create type public.invoice_status as enum ('issued', 'pending_confirmation', 'paid', 'overdue', 'void');
create type public.payment_method as enum ('bank_transfer', 'e_wallet');
create type public.receipt_status as enum ('pending', 'confirmed', 'rejected');

-- ---------------------------------------------------------------------------
-- الباقات (يحررها مدير المنصة؛ الظاهر منها للعامة يظهر في صفحة الأسعار)
-- ---------------------------------------------------------------------------
create table public.subscription_plans (
  id                 uuid primary key default gen_random_uuid(),
  slug               text unique,
  name               text not null,
  target             public.plan_target not null,
  billing_cycle      public.billing_cycle not null,
  price_per_student  numeric(10,2) not null check (price_per_student >= 0),
  minimum_charge     numeric(10,2) not null default 0,   -- مثل 250 للمدرّس شهرياً
  min_students       int,
  installments       int not null default 1 check (installments >= 1),  -- المدرسة: دفعتان فصليتان
  currency_code      text not null default 'ILS',
  features           jsonb not null default '[]'::jsonb,
  is_active          boolean not null default true,
  is_public          boolean not null default true,
  is_popular         boolean not null default false,
  notes              text,
  sort_order         int not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create trigger subscription_plans_touch before update on public.subscription_plans
  for each row execute function private.touch_updated_at();

create table public.subscriptions (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references public.organizations (id) on delete cascade,
  plan_id               uuid not null references public.subscription_plans (id) on delete restrict,
  status                public.subscription_status not null default 'trial',
  price_per_student     numeric(10,2) not null,   -- السعر المتفق عليه وقت الاشتراك
  started_on            date not null default current_date,
  trial_ends_on         date,
  current_period_start  date,
  current_period_end    date,
  canceled_at           timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index subscriptions_org_idx on public.subscriptions (organization_id);
create unique index subscriptions_one_live_per_org on public.subscriptions (organization_id)
  where status in ('trial', 'active', 'past_due');
create trigger subscriptions_touch before update on public.subscriptions
  for each row execute function private.touch_updated_at();

create table public.invoices (
  id                 uuid primary key default gen_random_uuid(),
  organization_id    uuid not null references public.organizations (id) on delete cascade,
  subscription_id    uuid references public.subscriptions (id) on delete set null,
  number             text not null unique,
  period_start       date not null,
  period_end         date not null,
  installment_no     int not null default 1,
  active_students    int not null default 0,
  price_per_student  numeric(10,2) not null,
  amount             numeric(12,2) not null check (amount >= 0),
  currency_code      text not null default 'ILS',
  status             public.invoice_status not null default 'issued',
  due_on             date,
  paid_at            timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  check (period_end >= period_start)
);
create index invoices_org_idx on public.invoices (organization_id, period_start desc);
create trigger invoices_touch before update on public.invoices
  for each row execute function private.touch_updated_at();

create table public.payment_receipts (
  id               uuid primary key default gen_random_uuid(),
  invoice_id       uuid not null references public.invoices (id) on delete cascade,
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  method           public.payment_method not null,
  amount           numeric(12,2) not null check (amount > 0),
  reference        text,                 -- رقم الحوالة أو العملية
  storage_path     text,                 -- صورة الإيصال في الحاوية الخاصة payment-receipts
  status           public.receipt_status not null default 'pending',
  uploaded_by      uuid references public.profiles (id) on delete set null default auth.uid(),
  reviewed_by      uuid references public.profiles (id) on delete set null,
  reviewed_at      timestamptz,
  review_note      text,
  created_at       timestamptz not null default now()
);
create index payment_receipts_invoice_idx on public.payment_receipts (invoice_id);
create index payment_receipts_pending_idx on public.payment_receipts (created_at) where status = 'pending';

-- رفع إيصال: الفاتورة «بانتظار التأكيد». تأكيد المدير: الفاتورة «مدفوعة».
create or replace function private.sync_invoice_with_receipt()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if (select organization_id from public.invoices where id = new.invoice_id) <> new.organization_id then
      raise exception 'الإيصال لا يخص هذه الجهة';
    end if;
    update public.invoices set status = 'pending_confirmation'
    where id = new.invoice_id and status in ('issued', 'overdue');
  elsif new.status is distinct from old.status then
    new.reviewed_by := auth.uid();
    new.reviewed_at := now();
    if new.status = 'confirmed' then
      update public.invoices set status = 'paid', paid_at = now() where id = new.invoice_id;
    elsif new.status = 'rejected' then
      update public.invoices set status = 'issued'
      where id = new.invoice_id and status = 'pending_confirmation';
    end if;
  end if;
  return new;
end $$;
create trigger payment_receipts_sync before insert or update on public.payment_receipts
  for each row execute function private.sync_invoice_with_receipt();

-- ---------------------------------------------------------------------------
-- رسوم الطلاب (المدرّس يتابع ما دفعه كل طالب)
-- ---------------------------------------------------------------------------
create table public.tuition_charges (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null,
  student_id       uuid not null,
  period_month     date not null check (extract(day from period_month) = 1),  -- أول يوم في الشهر
  amount_due       numeric(10,2) not null check (amount_due >= 0),
  notes            text,
  created_at       timestamptz not null default now(),
  unique (student_id, period_month),
  unique (id, organization_id, student_id),
  foreign key (student_id, organization_id) references public.students (id, organization_id) on delete cascade
);
create index tuition_charges_org_idx on public.tuition_charges (organization_id, period_month);

create table public.tuition_payments (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null,
  student_id       uuid not null,
  charge_id        uuid,
  amount           numeric(10,2) not null check (amount > 0),
  paid_on          date not null default current_date,
  method           text,             -- نقداً، جوال باي...
  receipt_number   text,
  notes            text,
  recorded_by      uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at       timestamptz not null default now(),
  foreign key (student_id, organization_id) references public.students (id, organization_id) on delete cascade,
  -- الدفعة تخص استحقاقاً لنفس الطالب ونفس الجهة
  foreign key (charge_id, organization_id, student_id)
    references public.tuition_charges (id, organization_id, student_id) on delete set null (charge_id)
);
create index tuition_payments_student_idx on public.tuition_payments (student_id);

-- الرصيد لكل استحقاق: المطلوب، المدفوع، والحالة.
create or replace view public.tuition_balances
with (security_invoker = true) as
select c.id as charge_id, c.organization_id, c.student_id, c.period_month, c.amount_due,
       coalesce(sum(p.amount), 0)::numeric(10,2) as paid_amount,
       case when coalesce(sum(p.amount), 0) >= c.amount_due then 'paid'
            when coalesce(sum(p.amount), 0) > 0 then 'partial'
            else 'unpaid' end as status,
       max(p.paid_on) as last_payment_on
from public.tuition_charges c
left join public.tuition_payments p on p.charge_id = c.id
group by c.id;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.subscription_plans enable row level security;
alter table public.subscriptions      enable row level security;
alter table public.invoices           enable row level security;
alter table public.payment_receipts   enable row level security;
alter table public.tuition_charges    enable row level security;
alter table public.tuition_payments   enable row level security;

create policy plans_public_read on public.subscription_plans for select to anon, authenticated
  using ((is_active and is_public) or private.is_platform_admin());
create policy plans_admin on public.subscription_plans for all to authenticated
  using (private.is_platform_admin()) with check (private.is_platform_admin());

create policy subscriptions_select on public.subscriptions for select to authenticated
  using (private.is_org_owner(organization_id) or private.is_platform_admin());
create policy subscriptions_admin on public.subscriptions for all to authenticated
  using (private.is_platform_admin()) with check (private.is_platform_admin());

create policy invoices_select on public.invoices for select to authenticated
  using (private.is_org_owner(organization_id) or private.is_platform_admin());
create policy invoices_admin on public.invoices for all to authenticated
  using (private.is_platform_admin()) with check (private.is_platform_admin());

create policy receipts_select on public.payment_receipts for select to authenticated
  using (private.is_org_owner(organization_id) or private.is_platform_admin());
create policy receipts_owner_insert on public.payment_receipts for insert to authenticated
  with check (private.is_org_owner(organization_id) and status = 'pending');
create policy receipts_admin_update on public.payment_receipts for update to authenticated
  using (private.is_platform_admin()) with check (private.is_platform_admin());
revoke insert, update, delete on public.payment_receipts from authenticated;
grant insert (invoice_id, organization_id, method, amount, reference, storage_path)
  on public.payment_receipts to authenticated;
grant update (status, review_note) on public.payment_receipts to authenticated;

create policy tuition_charges_owner on public.tuition_charges for all to authenticated
  using (private.is_org_owner(organization_id)) with check (private.is_org_owner(organization_id));
create policy tuition_payments_owner on public.tuition_payments for all to authenticated
  using (private.is_org_owner(organization_id)) with check (private.is_org_owner(organization_id));

revoke insert, update, delete on public.subscription_plans from anon;
revoke all on public.subscriptions, public.invoices, public.payment_receipts,
  public.tuition_charges, public.tuition_payments, public.tuition_balances from anon;
