import { counterpartyLookupService } from "@/modules/finance/services/counterparty-lookup.service";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const emptySearch = await counterpartyLookupService.searchCounterparties({});
  assert(Array.isArray(emptySearch.items), "Karşı taraf araması dizi döndürmelidir.");

  const customerSearch = await counterpartyLookupService.searchCounterparties({
    kind: "CUSTOMER",
    search: "zzzz-no-match",
    limit: 5,
  });
  assert(Array.isArray(customerSearch.items), "Müşteri araması dizi döndürmelidir.");
  assert(customerSearch.items.every((item) => item.kind === "CUSTOMER"), "Müşteri araması yalnızca müşteri kartı döndürmelidir.");

  const supplierSearch = await counterpartyLookupService.searchCounterparties({
    kind: "SUPPLIER",
    search: "zzzz-no-match",
    limit: 5,
  });
  assert(Array.isArray(supplierSearch.items), "Tedarikçi araması dizi döndürmelidir.");
  assert(supplierSearch.items.every((item) => item.kind === "SUPPLIER"), "Tedarikçi araması yalnızca tedarikçi kartı döndürmelidir.");

  console.log("verify-finance-counterparty-lookup: ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
