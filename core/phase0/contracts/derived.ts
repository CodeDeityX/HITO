import type {
  DerivedOutput,
  DerivedOutputKind,
  EvidenceHead,
  HistoryHead,
  CanonicalModel,
  StalenessState,
} from "./model";

export interface DerivedInputHeads {
  modelRevision: number;
  historyHead: HistoryHead;
  evidenceHead: EvidenceHead;
  rulesetVersion: string;
}

export function createDerivedOutput(
  kind: DerivedOutputKind,
  inputs: DerivedInputHeads,
  provenance: DerivedOutput["provenance"],
  generatedAt = "1970-01-01T00:00:00.000Z",
  generatingVersion = "phase0",
): DerivedOutput {
  return {
    derivedOutputId: `derived_${kind.toLowerCase()}_${inputs.modelRevision}_${inputs.rulesetVersion}`,
    kind,
    sourceModelRevision: inputs.modelRevision,
    sourceHistoryHead: inputs.historyHead,
    sourceEvidenceHead: inputs.evidenceHead,
    rulesetVersion: inputs.rulesetVersion,
    generatedAt,
    generatingVersion,
    provenance,
    stalenessState: "FRESH",
  };
}

export function evaluateStaleness(output: DerivedOutput, current: DerivedInputHeads): StalenessState {
  if (output.sourceModelRevision !== current.modelRevision) return "STALE_MODEL";
  if (output.sourceHistoryHead.sequence !== current.historyHead.sequence || output.sourceHistoryHead.eventHash !== current.historyHead.eventHash) return "STALE_HISTORY";
  if (output.sourceEvidenceHead.sequence !== current.evidenceHead.sequence || output.sourceEvidenceHead.manifestHash !== current.evidenceHead.manifestHash) return "STALE_EVIDENCE";
  if (output.rulesetVersion !== current.rulesetVersion) return "STALE_RULESET";
  return "FRESH";
}

export function refreshStaleness(output: DerivedOutput, current: DerivedInputHeads): DerivedOutput {
  return { ...structuredClone(output), stalenessState: evaluateStaleness(output, current) };
}

export function assertDerivedOutputMayBePresented(output: DerivedOutput): void {
  if (output.stalenessState !== "FRESH") {
    throw new Error(`derived output ${output.derivedOutputId} cannot be presented as current truth: ${output.stalenessState}`);
  }
}

export function derivedOutputInputsFromModel(model: CanonicalModel, rulesetVersion: string): DerivedInputHeads {
  return {
    modelRevision: model.canonicalState.modelRevision,
    historyHead: model.canonicalState.historyHead,
    evidenceHead: model.canonicalState.evidenceHead,
    rulesetVersion,
  };
}
