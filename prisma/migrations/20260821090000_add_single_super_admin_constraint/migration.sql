-- Enforce that at most one User row can have isSuperAdmin = true.
-- Partial unique index: since every indexed row shares the same value (true),
-- a second row with isSuperAdmin = true would violate uniqueness.
CREATE UNIQUE INDEX "User_isSuperAdmin_single_key" ON "User" ("isSuperAdmin") WHERE "isSuperAdmin" = true;
