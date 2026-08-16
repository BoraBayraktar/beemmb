import { notFound } from "next/navigation";

import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { catalogAdminService } from "@/modules/catalog/services/catalog-admin.service";
import { CommerceOrderAdminError, commerceService } from "@/modules/commerce/services/commerce.service";
import { financialAccountsService } from "@/modules/finance/services/financial-accounts.service";
import { getCurrentUserFromContext } from "@/modules/identity/services/auth-context.service";
import { rbacService } from "@/modules/identity/services/rbac.service";
import { OrderDetailManager } from "@/ui/admin/order-detail-manager";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const dictionary = getDictionary(locale as Locale);
  const user = await getCurrentUserFromContext();

  if (!user) {
    notFound();
  }

  let order;
  const accountOptions = await financialAccountsService.listAccountOptions();
  const carrierCompanies = await catalogAdminService.listCarrierCompanies();

  try {
    order = await commerceService.getOrderById(id);
  } catch (error) {
    if (error instanceof CommerceOrderAdminError) {
      notFound();
    }

    throw error;
  }

  return (
    <OrderDetailManager
      locale={locale}
      order={order}
      canManage={await rbacService.hasPermission(user, "orders.manage")}
      accountOptions={accountOptions}
      carrierCompanies={carrierCompanies
        .filter((carrier) => carrier.isActive)
        .map((carrier) => ({ id: carrier.id, name: carrier.name, trackingUrlTemplate: carrier.trackingUrlTemplate }))}
      labels={{
        shipmentTitle: dictionary.admin.orderShipmentTitle,
        shipmentSummaryEmpty: dictionary.admin.orderShipmentSummaryEmpty,
        shipmentSummaryEmptyAction: dictionary.admin.orderShipmentSummaryEmptyAction,
        shipmentEdit: dictionary.admin.orderShipmentEdit,
        shipmentStatusLabel: dictionary.admin.orderShipmentStatusLabel,
        shipmentStatusNotShipped: dictionary.admin.orderShipmentStatusNotShipped,
        shipmentStatusPreparing: dictionary.admin.orderShipmentStatusPreparing,
        shipmentStatusShipped: dictionary.admin.orderShipmentStatusShipped,
        shipmentStatusDelivered: dictionary.admin.orderShipmentStatusDelivered,
        shipmentStatusReturned: dictionary.admin.orderShipmentStatusReturned,
        shipmentCarrier: dictionary.admin.orderShipmentCarrier,
        shipmentCarrierPlaceholder: dictionary.admin.orderShipmentCarrierPlaceholder,
        shipmentTrackingNumber: dictionary.admin.orderShipmentTrackingNumber,
        shipmentTrackingLink: dictionary.admin.orderShipmentTrackingLink,
        shipmentAddressLine: dictionary.admin.orderShipmentAddressLine,
        shipmentCity: dictionary.admin.orderShipmentCity,
        shipmentDistrict: dictionary.admin.orderShipmentDistrict,
        shipmentPostalCode: dictionary.admin.orderShipmentPostalCode,
        shipmentContactName: dictionary.admin.orderShipmentContactName,
        shipmentContactPhone: dictionary.admin.orderShipmentContactPhone,
        shipmentSave: dictionary.admin.orderShipmentSave,
        shipmentSaveSuccess: dictionary.admin.orderShipmentSaveSuccess,
        shipmentClose: dictionary.admin.orderShipmentClose,
        back: dictionary.admin.backToOrders,
        orderNumber: dictionary.admin.orderNumber,
        orderStatus: dictionary.admin.orderStatus,
        orderStatusConfirmed: dictionary.admin.orderStatusConfirmed,
        orderStatusCancelled: dictionary.admin.orderStatusCancelled,
        paymentStatus: dictionary.admin.paymentStatus,
        orderItems: dictionary.admin.orderItems,
        orderSubtotal: dictionary.admin.orderSubtotal,
        orderTotal: dictionary.admin.orderTotal,
        orderDiscount: dictionary.admin.orderDiscount,
        promotionCode: dictionary.admin.promotionCode,
        orderDate: dictionary.admin.orderDate,
        customerAccount: dictionary.admin.customerAccountsTitle,
        updateStatus: dictionary.admin.updateOrderStatus,
        deleteOrder: dictionary.admin.deleteOrder,
        operationFailed: dictionary.admin.operationFailed,
        loading: dictionary.common.loading,
        statusHistoryTitle: dictionary.admin.orderStatusHistory,
        historyFrom: dictionary.admin.historyFrom,
        historyTo: dictionary.admin.historyTo,
        historySource: dictionary.admin.historySource,
        historyBy: dictionary.admin.historyBy,
        historyNote: dictionary.admin.historyNote,
        historyAt: dictionary.admin.historyAt,
        historySourceSystem: dictionary.admin.historySourceSystem,
        historySourceAdmin: dictionary.admin.historySourceAdmin,
        paymentHistoryTitle: dictionary.admin.paymentStatusHistory,
        paymentHistoryFrom: dictionary.admin.paymentHistoryFrom,
        paymentHistoryTo: dictionary.admin.paymentHistoryTo,
        collectionSummaryTitle: dictionary.admin.financeCollectionsTitle,
        collectionRecordedAmount: dictionary.admin.financeCollectionsTotalRecordedAmount,
        collectionRemainingAmount: dictionary.admin.financeCollectionsRemainingAmount,
        createCollection: dictionary.admin.financeCollectionsCreateRecord,
        createCollectionSuccess: dictionary.admin.financeCollectionsCreateRecordSuccess,
        createCollectionFailed: dictionary.admin.financeCollectionsCreateRecordFailed,
        collectionFinancialAccount: dictionary.admin.financeCollectionsFinancialAccount,
        collectionFinancialAccountRequired: dictionary.admin.financeCollectionsFinancialAccountRequired,
        collectionAutoPaidTitle: dictionary.admin.financeCollectionsAutoPaidTitle,
        collectionAutoPaidDescription: dictionary.admin.financeCollectionsAutoPaidDescription,
        orderDocumentsTitle: dictionary.admin.documentManager,
        inventorySummaryTitle: dictionary.admin.inventorySummaryTitle,
        inventoryReservations: dictionary.admin.inventoryReservations,
        inventoryReservedQuantity: dictionary.admin.inventoryReservedQuantity,
        inventoryRestockStatus: dictionary.admin.inventoryRestockStatus,
        inventoryLastRestockedAt: dictionary.admin.inventoryLastRestockedAt,
        financialMovementsTitle: dictionary.admin.financeAccountsTitle,
        financialMovementAccount: dictionary.admin.financeCashTransactionsAccount,
        financialMovementDirection: dictionary.admin.financeCashTransactionsAllDirections,
        financialMovementSource: dictionary.admin.financeCashTransactionsSourceType,
        financialMovementCategory: dictionary.admin.financeCashTransactionsCategory,
        inventoryMovementTitle: dictionary.admin.inventoryMovementTitle,
        inventoryMovementType: dictionary.admin.inventoryMovementType,
        inventoryMovementQuantity: dictionary.admin.inventoryMovementQuantity,
        inventoryMovementWarehouse: dictionary.admin.inventoryMovementWarehouse,
        inventoryMovementReservation: dictionary.admin.inventoryMovementReservation,
        inventoryMovementInitialLoad: dictionary.admin.inventoryMovementInitialLoad,
        inventoryMovementManualAdjustment: dictionary.admin.inventoryMovementManualAdjustment,
        inventoryMovementPurchaseReceipt: dictionary.admin.inventoryMovementPurchaseReceipt,
        inventoryMovementReservationHold: dictionary.admin.inventoryMovementReservationHold,
        inventoryMovementReservationRelease: dictionary.admin.inventoryMovementReservationRelease,
        inventoryMovementOrderCommit: dictionary.admin.inventoryMovementOrderCommit,
        inventoryMovementOrderCancelRestock: dictionary.admin.inventoryMovementOrderCancelRestock,
        inventoryMovementReturnRestock: dictionary.admin.inventoryMovementReturnRestock,
        inventoryMovementDamageWriteOff: dictionary.admin.inventoryMovementDamageWriteOff,
        inventoryMovementRestockNone: dictionary.admin.inventoryMovementRestockNone,
        inventoryMovementRestockPartial: dictionary.admin.inventoryMovementRestockPartial,
        inventoryMovementRestockDone: dictionary.admin.inventoryMovementRestockDone,
        refundFinancialAccount: dictionary.admin.financeRefundFinancialAccount,
        refundFinancialAccountRequired: dictionary.admin.financeRefundFinancialAccountRequired,
        notSpecified: dictionary.common.notSpecified,
      }}
    />
  );
}
