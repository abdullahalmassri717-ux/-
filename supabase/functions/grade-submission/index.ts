// POST { submissionId } with the teacher's sign-in token.
// Checks the teacher may see this paper, then grades it with AI on the server.
import { adminClient, corsHeaders, env, json, userClient } from '../_shared/http.ts';
import { gradeSubmission } from '../_shared/gradeSubmission.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let submissionId = '';
  try {
    submissionId = String((await req.json()).submissionId ?? '');
  } catch {
    return json({ error: 'الطلب غير صالح.' }, 400);
  }
  if (!/^[0-9a-f-]{36}$/i.test(submissionId)) return json({ error: 'الطلب غير صالح.' }, 400);

  // Access check with the caller's own permissions (Row Level Security).
  const { data: visible, error } = await userClient(req).from('submissions').select('id').eq('id', submissionId).maybeSingle();
  if (error || !visible) return json({ error: 'ليس لديك صلاحية على هذه الورقة.' }, 403);

  const result = await gradeSubmission(adminClient(), submissionId, env());
  return json(result, result.ok ? 200 : result.status === 'failed' ? 422 : 409);
});
