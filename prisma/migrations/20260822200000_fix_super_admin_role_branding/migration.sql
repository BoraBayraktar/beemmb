UPDATE "Role"
SET "description" = 'Beemmb genelindeki tüm menü, API ve güvenlik yönetimi yetkilerine sahiptir.',
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "key" = 'super-admin';
