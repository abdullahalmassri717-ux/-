-- في المدرسة أو المركز: الإدارة (المالك) وحدها تنشئ المجموعات وتصنّفها (صف + مادة)
-- ثم تسندها للمعلمين. المعلم لا ينشئ مجموعة، ولا يغيّر صف أو مادة مجموعة مسندة إليه.
-- المدرّس الخصوصي (individual_teacher) يبقى كما هو.
-- العمليات من الخادم (service_role، بدون auth.uid) لا تتأثر.

create or replace function private.groups_school_admin_only()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_kind public.org_kind;
begin
  if (select auth.uid()) is null then
    return new;
  end if;
  select kind into v_kind from public.organizations where id = new.organization_id;
  if v_kind = 'individual_teacher' or private.is_org_owner(new.organization_id) then
    return new;
  end if;
  if tg_op = 'INSERT' then
    raise exception 'المجموعات في المدرسة تنشئها الإدارة وتسندها للمعلمين. اطلب من إدارة المدرسة إضافة المجموعة لك.';
  end if;
  if new.grade_id is distinct from old.grade_id
     or new.subject_id is distinct from old.subject_id
     or new.class_group_id is distinct from old.class_group_id
     or new.organization_id is distinct from old.organization_id then
    raise exception 'صف المجموعة ومادتها تحدّدها إدارة المدرسة.';
  end if;
  return new;
end
$$;

drop trigger if exists groups_school_admin_only on public.groups;
create trigger groups_school_admin_only
  before insert or update on public.groups
  for each row execute function private.groups_school_admin_only();
