export function toAvailableStock(onHandStock: number, reservedStock: number) {
  return Math.max(0, onHandStock - reservedStock);
}

export function resolveAggregateAvailabilityFromLevels(
  inventoryLevels: Array<{
    onHand: number;
    reserved: number;
  }>,
  legacySummaryStock: number,
) {
  if (inventoryLevels.length === 0) {
    // Depoya hic InventoryLevel yazilmamissa (ornegin depo hic tanimlanmamis bir tenant'ta)
    // Product.stock/ProductVariant.stockOverride'a legacy fallback olarak dusulur.
    return {
      onHandStock: legacySummaryStock,
      reservedStock: 0,
      availableStock: legacySummaryStock,
      usedLegacySummaryFallback: true,
    };
  }

  const onHandStock = inventoryLevels.reduce((sum, level) => sum + level.onHand, 0);
  const reservedStock = inventoryLevels.reduce((sum, level) => sum + level.reserved, 0);

  return {
    onHandStock,
    reservedStock,
    availableStock: toAvailableStock(onHandStock, reservedStock),
    usedLegacySummaryFallback: false,
  };
}

export function resolveAggregateAvailableStock(
  inventoryLevels: Array<{
    onHand: number;
    reserved: number;
  }>,
  legacySummaryStock: number,
) {
  return resolveAggregateAvailabilityFromLevels(inventoryLevels, legacySummaryStock).availableStock;
}
