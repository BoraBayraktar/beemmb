import { InventoryManager } from "@/ui/admin/inventory-manager";

import { loadInventoryRouteContext, type InventoryRouteSearchParams } from "./_shared";

export default async function AdminInventoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<InventoryRouteSearchParams>;
}) {
  const { locale } = await params;
  const resolvedSearchParams = await searchParams;
  const context = await loadInventoryRouteContext(locale, resolvedSearchParams, "overview");
  const requestedSection = resolvedSearchParams.section;

  const initialSection = requestedSection === "quick-actions"
    ? "quick-actions"
    : requestedSection === "inventory-list"
      ? "inventory-list"
      : requestedSection === "inventory-critical"
        ? "inventory-critical"
        : "inventory-reports";

  const initialSectionGroup = initialSection === "inventory-list" ? "operations" : "overview";

  return (
    <InventoryManager
      locale={context.locale}
      result={context.result}
      transactionResult={context.transactionResult}
      warehouses={context.warehouses}
      suppliers={context.suppliers}
      canManageSuppliers={context.canManageSuppliers}
      alertResult={context.alertResult}
      stockCounts={context.stockCounts}
      reports={context.reports}
      integrationSummary={context.integrationSummary}
      externalEventMonitoring={context.externalEventMonitoring}
      operationHistory={context.operationHistory}
      exportHistory={context.exportHistory}
      inventoryPreferences={context.inventoryPreferences}
      query={context.query}
      labels={context.labels}
      overviewPath={`/${context.locale}/admin/inventory`}
      inventoryListPath={`/${context.locale}/admin/inventory/products`}
      transactionListPath={`/${context.locale}/admin/inventory/transactions`}
      stockCountsPath={`/${context.locale}/admin/inventory/counts`}
      warehousesPath={`/${context.locale}/admin/inventory/warehouses`}
      externalEventsPath={`/${context.locale}/admin/inventory/external-events`}
      pageVariant="overview"
      initialSectionGroup={initialSectionGroup}
      initialSection={initialSection}
    />
  );
}
