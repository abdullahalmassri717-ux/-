#!/usr/bin/env bash
# Temporary: replay the exams-list request through real PostgREST on the local test DB.
set -uo pipefail
SECRET=$(openssl rand -hex 32)
psql "$DATABASE_URL" -Atc "select m.user_id||' '||m.organization_id||' '||m.role||' '||o.kind from memberships m join organizations o on o.id=m.organization_id where m.status='active'" > /tmp/members.txt
cat /tmp/members.txt
sel='id,title,kind,scheduled_on,status,submission_mode,submission_code,submission_open,auto_send_reports,group_id,subject_id,created_at,groups(name,group_students(left_at)),subjects(name),assessment_totals:questions(max_score),submissions(id)'
for ver in v12.2.12 latest; do
  docker rm -f pgrst >/dev/null 2>&1
  docker run -d --name pgrst --network host \
    -e PGRST_DB_URI="$DATABASE_URL" -e PGRST_DB_SCHEMAS=public -e PGRST_DB_ANON_ROLE=anon \
    -e PGRST_JWT_SECRET="$SECRET" -e PGRST_SERVER_PORT=3000 "postgrest/postgrest:$ver" >/dev/null
  sleep 6
  echo "######## PostgREST $ver"; docker logs pgrst 2>&1 | tail -3
  while read -r uid org role kind; do
    jwt=$(python3 - "$SECRET" "$uid" <<'PY'
import sys,hmac,hashlib,base64,json,time
b=lambda d: base64.urlsafe_b64encode(d).rstrip(b'=').decode()
h=b(json.dumps({"alg":"HS256","typ":"JWT"}).encode()); p=b(json.dumps({"sub":sys.argv[2],"role":"authenticated","exp":int(time.time())+600}).encode())
print(h+'.'+p+'.'+b(hmac.new(sys.argv[1].encode(),(h+'.'+p).encode(),hashlib.sha256).digest()))
PY
)
    q() { out=$(curl -sS -G "http://localhost:3000/$1" --data-urlencode "select=$2" "${@:3}" -H "Authorization: Bearer $jwt" -H "x-daqa-view: none" -w '\nHTTP %{http_code}'); echo "== $role/$kind $1: $(echo "$out" | tail -1) $(echo "$out" | head -1 | head -c 300)"; }
    q assessments "$sel" --data-urlencode "organization_id=eq.$org" --data-urlencode "order=created_at.desc"
    q assessments "$sel,questions(id,number,text,type,max_score,model_answer,lesson_id,lessons(title),rubric_criteria(description,points,sort_order))" --data-urlencode "organization_id=eq.$org" --data-urlencode "limit=1"
    q submissions 'id,student_id,submitted_at,status,assessments!inner(organization_id,assessment_totals:questions(max_score))' --data-urlencode "organization_id=eq.$org"
    q submissions 'id,approved_at,assessments(assessment_totals:questions(max_score))' --data-urlencode "organization_id=eq.$org"
    q submissions 'id,assessment_id,submitted_at,approved_at,assessments(title,scheduled_on,assessment_totals:questions(max_score)),question_grades(final_score,questions(max_score,lessons(id,title)))' --data-urlencode "organization_id=eq.$org"
  done < /tmp/members.txt
done
