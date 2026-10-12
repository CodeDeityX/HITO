import { createHash } from "node:crypto";
import { G15_PROJECTION_MODES, type G15MaterialState, type G15ProjectedIntent, type G15ProjectionMode } from "../../convergence/g15-universal-protocol-projection";
import type { HitoC7CompositionSnapshot } from "../../convergence/runtime";
import {
  HITO_PRE_C9_HOST_AUTHORITY,
  HITO_PRE_C9_HOST_PROTOCOL_VERSION,
  projectHitoHostProtocol,
  type HitoHostField,
  type HitoHostProtocolProjection,
  type HitoHostSourceReference,
} from "../shared/hito-host-protocol";

export const HITO_PRE_C9_AGENT_CONTEXT_VERSION = "hito-pre-c9-agent-context-v1" as const;

export interface HitoAgentContextRequest {
  mode?: G15ProjectionMode;
}

export interface HitoAgentContextEnvelope {
  kind: "HITO_PRE_C9_HOST_NEUTRAL_AGENT_CONTEXT";
  version: typeof HITO_PRE_C9_AGENT_CONTEXT_VERSION;
  protocolVersion: typeof HITO_PRE_C9_HOST_PROTOCOL_VERSION;
  authority: typeof HITO_PRE_C9_HOST_AUTHORITY;
  contextIdentity: string;
  mode: G15ProjectionMode;
  source: HitoHostProtocolProjection["source"];
  project: HitoHostField<{
    projectIdentity: string;
    whereAmI: string;
  }>;
  reality: HitoHostField<{
    c7CompositionIdentity: string;
    c6CompositionIdentity: string;
    semanticVerdictIdentity: string;
    g8RealityIdentity: string;
    g16AssessmentIdentity: string;
    overallStatus: HitoHostProtocolProjection["projectPulse"]["value"]["status"];
  }>;
  protocolRulesets: HitoHostField<{
    c7: string;
    g16: string;
    c6: string;
    g15: string;
  }>;
  operationalMode: HitoHostField<HitoHostProtocolProjection["runtimeState"]["value"]["operationalMode"]>;
  intent: HitoHostField<{
    records: G15ProjectedIntent[];
    extractedCandidates: HitoHostProtocolProjection["intentProvenance"]["value"]["extractedIntentCandidates"];
    declaredIntentImported: false;
    agentProposalCanonicalAuthority: false;
    recommendationIsCommitment: false;
    commitmentIsExecutionAuthority: false;
  }>;
  currentObjective: HitoHostField<string>;
  exactNextSafeMutation: HitoHostProtocolProjection["next"];
  why: HitoHostProtocolProjection["why"];
  blockers: HitoHostField<G15MaterialState[]>;
  contradictionsAndConflicts: HitoHostField<G15MaterialState[]>;
  unknownOrIndeterminate: HitoHostField<G15MaterialState[]>;
  protectedAuthorities: HitoHostProtocolProjection["protectedAuthorities"];
  evidence: HitoHostProtocolProjection["evidence"];
  freshness: HitoHostProtocolProjection["freshness"];
  coverage: HitoHostProtocolProjection["coverage"];
  runtimeAndTerritory: HitoHostProtocolProjection["runtimeState"];
  safeToChange: HitoHostField<string>;
  doneWhen: HitoHostField<string>;
  mutatingCommand: null;
  governanceBoundary: HitoHostProtocolProjection["governanceBoundary"] & {
    acceptsAgentProseAsIntent: false;
    acceptsCallerVerdict: false;
    acceptsCallerNextStep: false;
    acceptsCallerProtectedScope: false;
    createsCommitment: false;
    createsExecutionAuthority: false;
  };
  zeroEffectCounters: HitoHostProtocolProjection["zeroEffectCounters"];
}

const REQUEST_KEYS = ["mode"] as const;

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`HITO pre-C9 agent host rejected input: ${message}`);
}

function normalizeRequest(request: HitoAgentContextRequest | undefined): Required<HitoAgentContextRequest> {
  const value = request ?? {};
  invariant(value !== null && typeof value === "object" && !Array.isArray(value), "request must be structured");
  const unsupported = Object.keys(value).filter((key) => !REQUEST_KEYS.includes(key as typeof REQUEST_KEYS[number])).sort();
  invariant(unsupported.length === 0, `request rejects unsupported or precomputed authority fields: ${unsupported.join(", ")}`);
  const mode = value.mode ?? "ENGINEER";
  invariant(G15_PROJECTION_MODES.includes(mode), `unsupported presentation mode ${String(mode)}`);
  return { mode };
}

function field<T>(value: T, provenance: readonly HitoHostSourceReference[]): HitoHostField<T> {
  return Object.freeze({ value, provenance, semanticAuthority: false, executionAuthority: false });
}

/** Pure machine-readable agent context over exact existing host protocol truth. */
export function createHitoAgentContext(
  snapshot: HitoC7CompositionSnapshot,
  request?: HitoAgentContextRequest,
): HitoAgentContextEnvelope {
  const normalized = normalizeRequest(request);
  const protocol = projectHitoHostProtocol(snapshot, normalized.mode);
  const materialStates = protocol.why.value.materialStates;
  const blockers = structuredClone(materialStates.filter((item) => item.severity === "BLOCKER"));
  const contradictionsAndConflicts = structuredClone(materialStates.filter((item) => item.category === "CONFLICT" || item.category === "CONTRADICTION"));
  const unknownOrIndeterminate = structuredClone(materialStates.filter((item) => item.category === "UNKNOWN" || item.category === "INDETERMINATE"));
  const g15Provenance = protocol.why.provenance;
  const contextIdentity = `hito_pre_c9_agent_${createHash("sha256").update(Buffer.from([
    protocol.source.c7CompositionIdentity,
    protocol.source.semanticVerdictIdentity,
    protocol.source.g16AssessmentIdentity,
    protocol.mode,
  ].join("\n"), "utf8")).digest("hex")}`;
  const result: HitoAgentContextEnvelope = {
    kind: "HITO_PRE_C9_HOST_NEUTRAL_AGENT_CONTEXT",
    version: HITO_PRE_C9_AGENT_CONTEXT_VERSION,
    protocolVersion: protocol.protocolVersion,
    authority: protocol.authority,
    contextIdentity,
    mode: protocol.mode,
    source: protocol.source,
    project: field({
      projectIdentity: snapshot.c6.g15.governedTruth.projectScopeIdentity,
      whereAmI: protocol.uxAnswers.whereAmI,
    }, protocol.projectPulse.provenance),
    reality: field({
      c7CompositionIdentity: snapshot.compositionId,
      c6CompositionIdentity: snapshot.c6.compositionId,
      semanticVerdictIdentity: snapshot.c6.g15.semanticVerdictIdentity,
      g8RealityIdentity: snapshot.g16.sourceAuthorities.g8RealityIdentity,
      g16AssessmentIdentity: snapshot.g16.assessmentId,
      overallStatus: snapshot.c6.g15.governedTruth.overallStatus,
    }, g15Provenance),
    protocolRulesets: field({
      c7: snapshot.rulesets.c7,
      g16: snapshot.rulesets.g16,
      c6: snapshot.c6.rulesets.c6,
      g15: snapshot.c6.rulesets.g15,
    }, g15Provenance),
    operationalMode: field(structuredClone(protocol.runtimeState.value.operationalMode), protocol.runtimeState.provenance),
    intent: field({
      records: structuredClone(protocol.intentProvenance.value.governedAndPresentedIntents),
      extractedCandidates: structuredClone(protocol.intentProvenance.value.extractedIntentCandidates),
      declaredIntentImported: false,
      agentProposalCanonicalAuthority: false,
      recommendationIsCommitment: false,
      commitmentIsExecutionAuthority: false,
    }, protocol.intentProvenance.provenance),
    currentObjective: field(protocol.uxAnswers.whatAmITryingToDo, protocol.projectPulse.provenance),
    exactNextSafeMutation: protocol.next,
    why: protocol.why,
    blockers: field(blockers, g15Provenance),
    contradictionsAndConflicts: field(contradictionsAndConflicts, g15Provenance),
    unknownOrIndeterminate: field(unknownOrIndeterminate, g15Provenance),
    protectedAuthorities: protocol.protectedAuthorities,
    evidence: protocol.evidence,
    freshness: protocol.freshness,
    coverage: protocol.coverage,
    runtimeAndTerritory: protocol.runtimeState,
    safeToChange: field(protocol.uxAnswers.whatIsSafeToChange, protocol.projectPulse.provenance),
    doneWhen: field(protocol.uxAnswers.whenIsThisDone, protocol.projectPulse.provenance),
    mutatingCommand: null,
    governanceBoundary: {
      ...protocol.governanceBoundary,
      acceptsAgentProseAsIntent: false,
      acceptsCallerVerdict: false,
      acceptsCallerNextStep: false,
      acceptsCallerProtectedScope: false,
      createsCommitment: false,
      createsExecutionAuthority: false,
    },
    zeroEffectCounters: protocol.zeroEffectCounters,
  };
  return Object.freeze(result);
}


import type { HitoFirstObservationResult } from "../../contracts/model";
import { projectHitoFirstObservationHost } from "../shared/hito-host-protocol";

export function createHitoFirstObservationAgentContext(result: HitoFirstObservationResult) {
  return {
    kind: "HITO_FIRST_OBSERVATION_AGENT_CONTEXT" as const,
    version: "hito-first-observation-agent-r1" as const,
    host: projectHitoFirstObservationHost(result),
    mutatingCommand: null,
  };
}
