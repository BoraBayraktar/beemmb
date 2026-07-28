(function verifyFinanceAllocationOpenAmount() {
  function assert(condition: boolean, message: string) {
    if (!condition) {
      throw new Error(message);
    }
  }

  function lineOpenAmount(gross: number, allocated: number) {
    return Math.max(0, Number((gross - allocated).toFixed(2)));
  }

  assert(lineOpenAmount(100, 30) === 70, "Acik tutar onceki eslestirmeler dusulmelidir.");
  assert(lineOpenAmount(100, 100) === 0, "Tam eslesmis satir acik tutar gostermemelidir.");

  const firstAllocation = 40;
  const secondAttempt = lineOpenAmount(100, firstAllocation);
  assert(secondAttempt === 60, "Ikinci tahsis icin kalan acik dogru hesaplanmalidir.");
  assert(65 > secondAttempt, "Asim senaryosu tespit edilebilir olmalidir.");

  console.log("verify-finance-allocation-open-amount: ok");
})();
