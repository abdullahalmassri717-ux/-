-- ============================================================================
-- استهلاك أدوات الذكاء الاصطناعي (توليد الأسئلة، قراءة الامتحان، المساعد...)
-- لصفحة «جودة التصحيح وتكلفة AI» عند مدير المنصة، بجانب تكلفة التصحيح،
-- حتى يرى المدير كل ما يُصرف من رصيد Claude في مكان واحد.
-- ============================================================================
create or replace function public.admin_ai_tools_usage(p_days int default 30)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_since timestamptz := now() - make_interval(days => p_days);
begin
  if not private.admin_can('quality') then
    raise exception 'هذا الإجراء لمدير المنصة فقط' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'runs', (select count(*) from public.ai_tool_runs where created_at > v_since),
    'cost_usd', (select coalesce(sum(cost_usd), 0) from public.ai_tool_runs where created_at > v_since),
    'input_tokens', (select coalesce(sum(input_tokens), 0) from public.ai_tool_runs where created_at > v_since),
    'output_tokens', (select coalesce(sum(output_tokens), 0) from public.ai_tool_runs where created_at > v_since),
    'by_task', coalesce((select jsonb_agg(jsonb_build_object('task', task, 'runs', n, 'cost_usd', c) order by c desc)
                           from (select task, count(*) n, sum(cost_usd) c
                                   from public.ai_tool_runs where created_at > v_since group by 1) t), '[]'::jsonb),
    'by_day', coalesce((select jsonb_agg(jsonb_build_object('day', d, 'cost_usd', c) order by d)
                          from (select created_at::date d, sum(cost_usd) c
                                  from public.ai_tool_runs where created_at > v_since group by 1) t), '[]'::jsonb)
  );
end $$;
revoke execute on function public.admin_ai_tools_usage(int) from public, anon;
grant execute on function public.admin_ai_tools_usage(int) to authenticated;
