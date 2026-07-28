import type {
  NegotiableInstrumentDirection,
  NegotiableInstrumentLifecycleAction,
  NegotiableInstrumentStatus,
} from "@/modules/finance/contracts/negotiable-instrument.contract";

export function resolveNegotiableInstrumentNextStatus(args: {
  direction: NegotiableInstrumentDirection;
  currentStatus: NegotiableInstrumentStatus;
  action: NegotiableInstrumentLifecycleAction;
}): NegotiableInstrumentStatus {
  if (args.currentStatus !== "PORTFOLIO") {
    throw new Error("Yalnızca portföydeki çek/senetler için durum geçişi yapılabilir.");
  }

  if (args.action === "cancel") {
    return "CANCELLED";
  }

  if (args.action === "bounce") {
    return "BOUNCED";
  }

  if (args.action === "collect") {
    if (args.direction !== "RECEIVABLE") {
      throw new Error("Tahsilat yalnızca alacak çek/senetleri için uygulanır.");
    }

    return "COLLECTED";
  }

  if (args.action === "pay") {
    if (args.direction !== "PAYABLE") {
      throw new Error("Ödeme yalnızca borç çek/senetleri için uygulanır.");
    }

    return "PAID";
  }

  throw new Error("Geçersiz durum geçişi.");
}

export function listAllowedNegotiableInstrumentActions(args: {
  direction: NegotiableInstrumentDirection;
  status: NegotiableInstrumentStatus;
}): NegotiableInstrumentLifecycleAction[] {
  if (args.status !== "PORTFOLIO") {
    return [];
  }

  if (args.direction === "RECEIVABLE") {
    return ["collect", "bounce", "cancel"];
  }

  return ["pay", "bounce", "cancel"];
}

export function requiresFinancialAccountForLifecycleAction(action: NegotiableInstrumentLifecycleAction) {
  return action === "collect" || action === "pay";
}
