import { CommerceRepository } from "@/modules/commerce/repositories/commerce.repository";

const TARGET_STATUS_TO_SHIPMENT_STATUS = {
  Picking: "PREPARING",
  Invoiced: "SHIPPED",
} as const;

type PackageStatusTarget = keyof typeof TARGET_STATUS_TO_SHIPMENT_STATUS;
type ShipmentStatus = "NOT_SHIPPED" | "PREPARING" | "SHIPPED" | "DELIVERED" | "RETURNED";

const repository = new CommerceRepository();

/**
 * Pazaryeri kanalına kargo durum bildirimi (Picking/Invoiced) başarıyla iletildikten sonra,
 * veya kargo firması/takip bilgisi kanaldan geri okunduğunda, pakete eşleşmiş Order kaydına
 * yansıtır. `commerce.service.ts` yerine bilinçli olarak doğrudan repository kullanılır:
 * `commerce.service.ts` -> `integration.service.ts` bağımlılığı zaten var olduğundan, servis
 * katmanı üzerinden çağrı `integration.service.ts` -> connector -> bu dosya ->
 * `commerce.service.ts` -> `integration.service.ts` şeklinde dairesel import'a yol açar.
 * Buradaki değerler (hedef durum, seçili kargo firması) zaten kendi akışında doğrulanmış
 * dahili değerlerdir; dış sisteme bildirim gönderildiği/dış sistemden okunduğu için bu
 * adımdaki bir hata job'ı FAILED/retry durumuna düşürüp işlemin tekrarlanmasına yol
 * açmamalı, bu nedenle hata yutulur ve yalnızca loglanır.
 */
export async function syncOrderShipmentFromPackageStatus(args: {
  matchedOrderId: string | null;
  targetStatus?: PackageStatusTarget;
  shipmentStatus?: ShipmentStatus;
  carrierCompanyId?: string | null;
  cargoTrackingNumber?: string | null;
  cargoDeliveredAt?: Date | null;
}) {
  if (!args.matchedOrderId) {
    return;
  }

  const shipmentStatus = args.shipmentStatus ?? (args.targetStatus ? TARGET_STATUS_TO_SHIPMENT_STATUS[args.targetStatus] : undefined);

  try {
    await repository.updateOrderShipment({
      id: args.matchedOrderId,
      ...(shipmentStatus ? { shipmentStatus } : {}),
      ...(args.carrierCompanyId ? { carrierCompanyId: args.carrierCompanyId } : {}),
      ...(args.cargoTrackingNumber ? { cargoTrackingNumber: args.cargoTrackingNumber } : {}),
      ...(args.targetStatus === "Invoiced" ? { cargoShippedAt: new Date() } : {}),
      ...(args.cargoDeliveredAt ? { cargoDeliveredAt: args.cargoDeliveredAt } : {}),
    });
  } catch (error) {
    console.error("Pazaryeri kargo bildirimi sonrasi Order guncellemesi basarisiz oldu", {
      orderId: args.matchedOrderId,
      targetStatus: args.targetStatus,
      shipmentStatus: args.shipmentStatus,
      error,
    });
  }
}
