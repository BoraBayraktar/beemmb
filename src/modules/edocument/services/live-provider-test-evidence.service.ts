import type {
  EDocumentLiveProviderEvidenceReport,
  EDocumentLiveProviderScenarioEvidence,
  EDocumentLiveProviderTestScenarioKey,
} from "@/modules/edocument/contracts/edocument-provider.contract";
import { liveProviderTestPlanService } from "@/modules/edocument/services/live-provider-test-plan.service";

function hasEvidenceValue(value: unknown) {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return true;
}

export class LiveProviderTestEvidenceService {
  evaluate(evidenceItems: EDocumentLiveProviderScenarioEvidence[]): EDocumentLiveProviderEvidenceReport {
    const evidenceByScenario = new Map<EDocumentLiveProviderTestScenarioKey, EDocumentLiveProviderScenarioEvidence>();
    for (const item of evidenceItems) {
      evidenceByScenario.set(item.scenarioKey, item);
    }

    const scenarios = liveProviderTestPlanService.listRequiredScenarios();
    const checks = scenarios.map((scenario) => {
      const evidence = evidenceByScenario.get(scenario.key);
      const missingEvidence = scenario.requiredEvidence.filter((field) => !hasEvidenceValue(evidence?.evidence[field]));

      return {
        scenarioKey: scenario.key,
        label: scenario.label,
        ready: Boolean(evidence) && missingEvidence.length === 0,
        missingEvidence,
        capturedAt: evidence?.capturedAt ?? null,
      };
    });
    const missingScenarioKeys = checks
      .filter((check) => !evidenceByScenario.has(check.scenarioKey))
      .map((check) => check.scenarioKey);
    const readyScenarioCount = checks.filter((check) => check.ready).length;

    return {
      ready: checks.length > 0 && readyScenarioCount === checks.length,
      scenarioCount: checks.length,
      readyScenarioCount,
      missingScenarioKeys,
      checks,
    };
  }
}

export const liveProviderTestEvidenceService = new LiveProviderTestEvidenceService();
