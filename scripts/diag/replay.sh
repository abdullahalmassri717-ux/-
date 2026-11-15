#!/usr/bin/env bash
# Temporary: replay the exams-list request through real PostgREST on the local test DB.
set -uo pipefail
SECRET=$(openssl rand -hex 32)
psql "$DATABASE_URL" -Atc "select m.user_id||' '||m.organization_id||' '||m.role||' '||o.kind from memberships m join organizations o on o.id=m.organization_id where m.status='active'" > /tmp/members.txt
cat /tmp/members.txt
sel='id,title,kind,scheduled_on,status,submission_mode,submission_code,submission_open,auto_send_reports,group_id,subject_id,created_at,groups(name,group_students(left_at)),subjects(name),assessment_totals(total_score,questions_count),submissions(id)'
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
    for view in none teacher; do
      out=$(curl -sS -G "http://localhost:3000/assessments" --data-urlencode "select=$sel" \
        --data-urlencode "organization_id=eq.$org" --data-urlencode "order=created_at.desc" \
        -H "Authorization: Bearer $jwt" -H "x-daqa-view: $view" -w '\nHTTP %{http_code}')
      echo "== $role/$kind view=$view: $(echo "$out" | tail -1) $(echo "$out" | head -1 | head -c 400)"
    done
  done < /tmp/members.txt
done
