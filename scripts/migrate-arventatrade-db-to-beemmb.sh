#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DUMP_PATH="${ROOT}/arventatrade.dump"
BEEMMB_CONTAINER="${BEEMMB_PG_CONTAINER:-beemmb-postgres}"
ARVENTA_CONTAINER="${ARVENTA_PG_CONTAINER:-}"

docker_env() {
  local container="$1"
  local key="$2"
  docker inspect "${container}" --format '{{range .Config.Env}}{{println .}}{{end}}' 2>/dev/null \
    | grep -E "^${key}=" \
    | head -1 \
    | cut -d= -f2- \
    || true
}

if [[ -z "${ARVENTA_CONTAINER}" ]]; then
  ARVENTA_CONTAINER="$(docker ps -a --format '{{.Names}}' | grep -iE '^arventa-postgres$' | head -1 || true)"
fi
if [[ -z "${ARVENTA_CONTAINER}" ]]; then
  ARVENTA_CONTAINER="$(docker ps -a --format '{{.Names}}' | grep -iE 'arventa.*postgres|postgres.*arventa' | head -1 || true)"
fi

if [[ -z "${ARVENTA_CONTAINER}" ]]; then
  echo "Eski Postgres konteyneri bulunamadi. Ornek:" >&2
  echo "  ARVENTA_PG_CONTAINER=arventa-postgres $0" >&2
  exit 1
fi

ARVENTA_USER="${ARVENTA_PG_USER:-$(docker_env "${ARVENTA_CONTAINER}" POSTGRES_USER)}"
ARVENTA_DB="${ARVENTA_PG_DATABASE:-$(docker_env "${ARVENTA_CONTAINER}" POSTGRES_DB)}"
SKIP_DUMP="${SKIP_DUMP:-0}"

if [[ -z "${ARVENTA_USER}" ]]; then
  ARVENTA_USER="postgres"
fi
if [[ -z "${ARVENTA_DB}" ]]; then
  ARVENTA_DB="${ARVENTA_USER}"
fi

echo "Kaynak konteyner: ${ARVENTA_CONTAINER} (db=${ARVENTA_DB}, user=${ARVENTA_USER})"
echo "Hedef konteyner:  ${BEEMMB_CONTAINER}"
echo "Not: beemmb DB mevcut veriyi (seed dahil) uzerine yazar."

for c in "${ARVENTA_CONTAINER}" "${BEEMMB_CONTAINER}"; do
  if ! docker inspect "${c}" >/dev/null 2>&1; then
    echo "Konteyner '${c}' yok." >&2
    exit 1
  fi
done

beemmb_was_running=false
if docker inspect -f '{{.State.Running}}' "${BEEMMB_CONTAINER}" 2>/dev/null | grep -q true; then
  beemmb_was_running=true
fi

if [[ "${SKIP_DUMP}" != "1" ]]; then
  if [[ "${beemmb_was_running}" == true ]]; then
    echo "5432 cakismasini onlemek icin ${BEEMMB_CONTAINER} gecici durduruluyor..."
    docker stop "${BEEMMB_CONTAINER}" >/dev/null
  fi

  echo "Kaynak Postgres baslatiliyor..."
  docker start "${ARVENTA_CONTAINER}" >/dev/null

  until docker exec "${ARVENTA_CONTAINER}" pg_isready -U "${ARVENTA_USER}" -d "${ARVENTA_DB}" >/dev/null 2>&1; do
    sleep 0.5
  done

  echo "Dump aliniyor..."
  docker exec "${ARVENTA_CONTAINER}" pg_dump \
    -U "${ARVENTA_USER}" -d "${ARVENTA_DB}" \
    -Fc --no-owner --no-acl \
    -f /tmp/arventatrade.dump

  docker cp "${ARVENTA_CONTAINER}:/tmp/arventatrade.dump" "${DUMP_PATH}"
  echo "Dump kaydedildi: ${DUMP_PATH}"

  docker stop "${ARVENTA_CONTAINER}" >/dev/null
  echo "Kaynak Postgres durduruldu."
else
  if [[ ! -f "${DUMP_PATH}" ]]; then
    echo "SKIP_DUMP=1 ama dump yok: ${DUMP_PATH}" >&2
    exit 1
  fi
  echo "Mevcut dump kullaniliyor: ${DUMP_PATH}"
fi

if ! docker inspect -f '{{.State.Running}}' "${BEEMMB_CONTAINER}" 2>/dev/null | grep -q true; then
  echo "Hedef Postgres baslatiliyor..."
  docker start "${BEEMMB_CONTAINER}" >/dev/null
fi

until docker exec "${BEEMMB_CONTAINER}" pg_isready -U beemmb -d beemmb >/dev/null 2>&1; do
  sleep 0.5
done

echo "beemmb DB'ye yukleniyor (public schema sifirlaniyor)..."
docker cp "${DUMP_PATH}" "${BEEMMB_CONTAINER}:/tmp/arventatrade.dump"

docker exec "${BEEMMB_CONTAINER}" psql -U beemmb -d beemmb -v ON_ERROR_STOP=1 -c \
  'DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO beemmb; GRANT ALL ON SCHEMA public TO public;'

set +e
restore_out="$(docker exec "${BEEMMB_CONTAINER}" pg_restore \
  -U beemmb -d beemmb \
  --no-owner --no-acl --exit-on-error \
  /tmp/arventatrade.dump 2>&1)"
restore_code=$?
set -e
if [[ "${restore_code}" -ne 0 ]]; then
  echo "${restore_out}" >&2
  exit "${restore_code}"
fi

echo "Prisma migrate + generate..."
cd "${ROOT}"
npx prisma migrate resolve --rolled-back "20260725120000_add_business_document_xml_artifacts" 2>/dev/null || true
npm run db:generate
npm run db:migrate

echo "Kontrol:"
docker exec "${BEEMMB_CONTAINER}" psql -U beemmb -d beemmb -c 'SELECT COUNT(*) AS categories FROM "Category";'
docker exec "${BEEMMB_CONTAINER}" psql -U beemmb -d beemmb -c 'SELECT COUNT(*) AS users FROM "User";'

echo "Tamamlandi."
