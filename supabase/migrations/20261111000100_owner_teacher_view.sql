-- ============================================================================
-- دقة — مدير المدرسة يدرّس أيضاً: «صفحتي كأستاذ».
--
-- مدير المدرسة أو المركز يرى كل شيء من لوحة الإدارة. لكن إذا كان يدرّس، يفتح
-- من قائمته «صفحتي كأستاذ» فيرى فقط الصفوف والطلاب المسندين إليه (مثل أي معلم).
--
-- كيف: صفحة الأستاذ ترسل مع كل طلب للقاعدة الترويسة x-daqa-view: teacher.
-- عندها يُعامل المالك كمعلم عادي في فحوص الوصول للمجموعات والطلاب (وما يتبعها:
-- الامتحانات والتسليمات والدرجات). الترويسة تُضيّق الصلاحيات فقط ولا توسّعها،
-- فلا خطر لو أرسلها أي شخص.
-- والمجموعة التي ينشئها المدير وهو في صفحة الأستاذ تُسند إليه تلقائياً.
-- ============================================================================

create or replace function private.teacher_view()
returns boolean language sql stable set search_path = '' as $$
  select coalesce(
    nullif(current_setting('request.headers', true), '')::json ->> 'x-daqa-view',
    ''
  ) = 'teacher'
$$;

-- المالك يرى المجموعة إلا في صفحة الأستاذ، فيرى فقط المسندة إليه.
create or replace function private.can_access_group(p_group uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.groups g
    join public.organizations o on o.id = g.organization_id and o.status = 'active'
    join public.memberships m
      on m.organization_id = g.organization_id
     and m.user_id = (select auth.uid())
     and m.status = 'active'
    where g.id = p_group
      and ((m.role = 'owner' and not private.teacher_view()) or private.is_group_teacher(g.id))
  )
$$;

create or replace function private.can_access_student(p_student uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.students s
    join public.organizations o on o.id = s.organization_id and o.status = 'active'
    join public.memberships m
      on m.organization_id = s.organization_id
     and m.user_id = (select auth.uid())
     and m.status = 'active'
    where s.id = p_student
      and ((m.role = 'owner' and not private.teacher_view())
           or exists (select 1
                      from public.group_students gs
                      join public.group_teachers gt on gt.group_id = gs.group_id
                      where gs.student_id = s.id and gt.user_id = m.user_id))
  )
$$;

-- المالك في لوحة الإدارة: كل شيء. في صفحة الأستاذ: المسند إليه فقط.
create or replace function private.is_org_manager(p_org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.is_org_owner(p_org) and not private.teacher_view()
$$;

drop policy groups_select on public.groups;
create policy groups_select on public.groups for select to authenticated
  using (private.is_org_manager(organization_id) or private.is_group_teacher(id));
drop policy groups_update on public.groups;
create policy groups_update on public.groups for update to authenticated
  using (private.is_org_manager(organization_id) or private.is_group_teacher(id))
  with check (private.is_org_member(organization_id));

drop policy group_teachers_select on public.group_teachers;
create policy group_teachers_select on public.group_teachers for select to authenticated
  using (private.is_org_manager(organization_id) or private.can_access_group(group_id));

-- المجموعة التي ينشئها المدير من صفحة الأستاذ تُسند إليه.
create or replace function private.assign_group_creator()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.id is null then
    new.id := gen_random_uuid();
  end if;
  if new.created_by is not null then
    insert into public.group_teachers (group_id, organization_id, user_id)
    select new.id, new.organization_id, new.created_by
    from public.memberships m
    join public.organizations o on o.id = m.organization_id
    where m.organization_id = new.organization_id
      and m.user_id = new.created_by
      and not (m.role = 'owner' and o.kind in ('school', 'learning_center') and not private.teacher_view())
    on conflict do nothing;
  end if;
  return new;
end $$;

grant execute on all functions in schema private to authenticated, service_role;
