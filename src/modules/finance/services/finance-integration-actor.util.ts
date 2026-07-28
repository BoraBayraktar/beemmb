export function resolveFinanceIntegrationActorUserId() {
  const configured = process.env.FINANCE_INTEGRATION_ACTOR_USER_ID?.trim();
  if (!configured) {
    throw new Error("FINANCE_INTEGRATION_ACTOR_USER_ID ortam değişkeni tanımlı olmalıdır.");
  }

  return configured;
}
