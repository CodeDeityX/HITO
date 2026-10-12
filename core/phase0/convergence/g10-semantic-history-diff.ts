import {
  assertValidModel,
  canonicalize,
  computeHistoryHash,
  validateHistoryChain,
  type CanonicalModel,
  type HistoryEvent,
} from "../contracts";
import {
  compareG8EngineeringReality,
  G8_ENGINEERING_REALITY_RULESET_VERSION,
  type G8EngineeringRealityComparisonResult,
  type G8EngineeringRealityProjection,
} from "./g8-engineering-reality";
import {
  G9_TRANSITION_COMPLETION_RULESET_VERSION,
  type G9TransitionCompletionAssessment,
} from "./g9-transition-completion";
import {
  assertBoundedSemanticIdentity,
  canonicalSemanticSet,
  canonicalSemanticStringSet,
  canonicalSemanticText,
  compareSemanticCodePoints,
  sha256LengthPrefixedFrames,
  type SemanticJson,
} from "./semantic-canonicalization";

export const G10_SEMANTIC_HISTORY_DIFF_RULESET_VERSION = "hito-semantic-history-diff-v1" as const;
export const G10_SEMANTIC_HISTORY_DIFF_AUTHORITY = "DERIVED / DETERMINISTIC / PROVENANCE_BOUND / READ_ONLY / NON_CANONICAL / NON_EXECUTING" as const;
export const G10_CONTRACT_SHA256 = "f347ec8478d04df993478bfa0a4e47ddecc185c1f9e92a383a94852b94d137ee" as const;
export const G10_MODEL_SHA256 = "b1e7a2628183515ac725f8fd3943a797c69aa8452d5b8f933eae605bec18808a" as const;
export const G10_CASES_SHA256 = "1c5aeff51721555a48cd595d4055a0a674706c946162782ca91206ba4d8b31a2" as const;
export const G10_TRACEABILITY_SHA256 = "fbe3d59e224a03263ff62c3604817ca6716493d50fa01e4b39b211be8c227990" as const;
export const G10_CONTINUITY_SHA256 = "bdf698c30dfd8109670ac4e280daacf81b2e54fd21062b484ad5cc9b23472554" as const;
export const G10_MANIFEST_SHA256 = "abe0e20aaed83134cbfb60bdcb2485b2bcd7805ebba71a690885629fd960a89a" as const;

export type G10DiffAssessment = "NO_SEMANTIC_DIFFERENCE" | "SEMANTIC_DIFFERENCE" | "INDETERMINATE";
export type G10CausalRelation =
  | "SAME_POSITION"
  | "PREDECESSOR_OF_SUCCESSOR"
  | "SUCCESSOR_OF_PREDECESSOR"
  | "DIVERGENT"
  | "INDETERMINATE";
export type G10Applicability = "REQUIRED" | "NOT_REQUIRED";
export type G10SemanticCoordinateDeltaKind = "ADDED" | "REMOVED" | "CHANGED";

export interface G10SemanticHistoryDiffRequest {
  historyScope: "HEADS_AND_CONNECTING_CAUSAL_PATH";
  causalComparisonApplicability: G10Applicability;
  g9CompletionLinkApplicability: G10Applicability;
  selectedEventHashes: string[];
}

export interface G10SemanticHistoryDiffInput {
  predecessorModel: CanonicalModel;
  successorModel: CanonicalModel;
  predecessorHistory: HistoryEvent[];
  successorHistory: HistoryEvent[];
  predecessor: G8EngineeringRealityProjection;
  successor: G8EngineeringRealityProjection;
  comparison: G8EngineeringRealityComparisonResult;
  g9?: G9TransitionCompletionAssessment;
  request: G10SemanticHistoryDiffRequest;
}

export interface G10SemanticHistoryPosition {
  eventHash: string;
  previousEventHash: string | null;
  sequence: number;
  eventType: string;
  revisionBinding: number | null;
  roles: string[];
}

export interface G10CausalEdge {
  predecessorEventHash: string;
  successorEventHash: string;
}

export interface G10SemanticCoordinateDelta {
  coordinate: string;
  kind: G10SemanticCoordinateDeltaKind;
  predecessorValueIdentity: string | null;
  successorValueIdentity: string | null;
}

export interface G10CompletionLink {
  assessmentId: string;
  transitionId: string;
  completionAssessment: G9TransitionCompletionAssessment["completionAssessment"];
  transitionDisposition: G9TransitionCompletionAssessment["transitionDisposition"];
  recoveryAssessment: G9TransitionCompletionAssessment["recoveryAssessment"];
  provesHistoricalRewrite: false;
}

export interface G10ZeroEffectCounters {
  canonicalWriteCount: 0;
  governedTargetMutationCount: 0;
  targetExecutionCount: 0;
  providerModelCallCount: 0;
  unauthorizedNetworkCallCount: 0;
  namespaceMigrationCount: 0;
}

export interface G10SemanticHistoryDiffProjection {
  kind: "HITO_G10_SEMANTIC_HISTORY_DIFF_DERIVED_PROJECTION";
  rulesetVersion: typeof G10_SEMANTIC_HISTORY_DIFF_RULESET_VERSION;
  authority: typeof G10_SEMANTIC_HISTORY_DIFF_AUTHORITY;
  projectionId: string;
  diffAssessment: G10DiffAssessment;
  causalRelation: G10CausalRelation;
  contextDelta: G8EngineeringRealityComparisonResult["contextDelta"];
  semanticComparison: G8EngineeringRealityComparisonResult["semanticComparison"];
  positions: G10SemanticHistoryPosition[];
  causalEdges: G10CausalEdge[];
  semanticCoordinateDeltas: G10SemanticCoordinateDelta[];
  g9CompletionLink?: G10CompletionLink;
  source: {
    predecessor: {
      modelRevision: number;
      modelIntegrityHash: string;
      historyHead: CanonicalModel["canonicalState"]["historyHead"];
      historyHash: string;
      semanticRealityIdentity: string;
    };
    successor: {
      modelRevision: number;
      modelIntegrityHash: string;
      historyHead: CanonicalModel["canonicalState"]["historyHead"];
      historyHash: string;
      semanticRealityIdentity: string;
    };
    g8ComparisonId: string;
    g9AssessmentId: string | null;
  };
  reasonCodes: string[];
  zeroEffectCounters: G10ZeroEffectCounters;
  truthBoundary: string;
  limitations: string[];
}

const INPUT_KEYS = [
  "predecessorModel",
  "successorModel",
  "predecessorHistory",
  "successorHistory",
  "predecessor",
  "successor",
  "comparison",
  "g9",
  "request",
] as const;
const REQUEST_KEYS = [
  "historyScope",
  "causalComparisonApplicability",
  "g9CompletionLinkApplicability",
  "selectedEventHashes",
] as const;
const HISTORY_EVENT_KEYS = ["sequence", "type", "payload", "previousEventHash", "eventHash"] as const;

interface ValidatedHistory {
  ordered: HistoryEvent[];
  byHash: Map<string, HistoryEvent>;
  issues: string[];
}

function zeroEffects(): G10ZeroEffectCounters {
  return {
    canonicalWriteCount: 0,
    governedTargetMutationCount: 0,
    targetExecutionCount: 0,
    providerModelCallCount: 0,
    unauthorizedNetworkCallCount: 0,
    namespaceMigrationCount: 0,
  };
}

function assertExactKeys(value: object, allowed: readonly string[], label: string): void {
  const unsupported = Object.keys(value).filter((key) => !allowed.includes(key)).sort(compareSemanticCodePoints);
  if (unsupported.length > 0) throw new Error(`${label} rejects unsupported or precomputed authority fields: ${unsupported.join(", ")}`);
}

function safe(value: string, label: string): string {
  return assertBoundedSemanticIdentity(value, label);
}

function validateRequest(request: G10SemanticHistoryDiffRequest): G10SemanticHistoryDiffRequest {
  if (request === null || typeof request !== "object") throw new Error("HITO G10 requires an explicit structured projection request");
  assertExactKeys(request, REQUEST_KEYS, "HITO G10 projection request");
  if (request.historyScope !== "HEADS_AND_CONNECTING_CAUSAL_PATH") {
    throw new Error("HITO G10 supports only the bounded heads-and-connecting-causal-path scope");
  }
  if (request.causalComparisonApplicability !== "REQUIRED" && request.causalComparisonApplicability !== "NOT_REQUIRED") {
    throw new Error("HITO G10 requires explicit causal comparison applicability");
  }
  if (request.g9CompletionLinkApplicability !== "REQUIRED" && request.g9CompletionLinkApplicability !== "NOT_REQUIRED") {
    throw new Error("HITO G10 requires explicit G9 completion-link applicability");
  }
  if (!Array.isArray(request.selectedEventHashes)) throw new Error("HITO G10 requires an explicit selectedEventHashes collection");
  return {
    historyScope: request.historyScope,
    causalComparisonApplicability: request.causalComparisonApplicability,
    g9CompletionLinkApplicability: request.g9CompletionLinkApplicability,
    selectedEventHashes: canonicalSemanticStringSet(
      request.selectedEventHashes.map((value, index) => safe(value, `selectedEventHashes[${index}]`)),
      "selectedEventHashes",
    ),
  };
}

function validateBoundHistory(
  label: "PREDECESSOR" | "SUCCESSOR",
  model: CanonicalModel,
  history: HistoryEvent[],
): ValidatedHistory {
  const issues: string[] = [];
  if (!Array.isArray(history)) {
    return { ordered: [], byHash: new Map(), issues: [`${label}_HISTORY_COLLECTION_MISSING`] };
  }
  const ordered = history.map((event) => structuredClone(event)).sort((left, right) => left.sequence - right.sequence);
  const seenSequences = new Set<number>();
  const byHash = new Map<string, HistoryEvent>();
  for (const [index, event] of ordered.entries()) {
    if (event === null || typeof event !== "object") {
      issues.push(`${label}_HISTORY_EVENT_${index}_MALFORMED`);
      continue;
    }
    assertExactKeys(event, HISTORY_EVENT_KEYS, `HITO G10 ${label.toLowerCase()} history event[${index}]`);
    if (!Number.isSafeInteger(event.sequence) || event.sequence < 1) issues.push(`${label}_HISTORY_SEQUENCE_INVALID`);
    if (seenSequences.has(event.sequence)) issues.push(`${label}_HISTORY_SEQUENCE_DUPLICATE`);
    seenSequences.add(event.sequence);
    safe(event.type, `${label.toLowerCase()}History[${index}].type`);
    safe(event.eventHash, `${label.toLowerCase()}History[${index}].eventHash`);
    if (event.previousEventHash !== null) safe(event.previousEventHash, `${label.toLowerCase()}History[${index}].previousEventHash`);
    const existing = byHash.get(event.eventHash);
    if (existing !== undefined && canonicalize(existing) !== canonicalize(event)) issues.push(`${label}_HISTORY_EVENT_HASH_CONFLICT`);
    byHash.set(event.eventHash, event);
  }
  issues.push(...validateHistoryChain(ordered).map((issue) => `${label}_${issue.toUpperCase().replaceAll(/[^A-Z0-9]+/g, "_")}`));
  if (computeHistoryHash(ordered) !== model.canonicalState.integrity.historyHash) issues.push(`${label}_HISTORY_INTEGRITY_HASH_MISMATCH`);
  const head = ordered.at(-1);
  const expectedHeadSequence = head?.sequence ?? 0;
  const expectedHeadHash = head?.eventHash ?? "GENESIS";
  if (
    model.canonicalState.historyHead.sequence !== expectedHeadSequence
    || model.canonicalState.historyHead.eventHash !== expectedHeadHash
  ) issues.push(`${label}_HISTORY_HEAD_MISMATCH`);
  return { ordered, byHash, issues: canonicalSemanticSet(issues) };
}

function combinedHistory(
  predecessor: ValidatedHistory,
  successor: ValidatedHistory,
  issues: string[],
): Map<string, HistoryEvent> {
  const combined = new Map<string, HistoryEvent>();
  for (const event of [...predecessor.ordered, ...successor.ordered]) {
    const existing = combined.get(event.eventHash);
    if (existing !== undefined && canonicalize(existing) !== canonicalize(event)) {
      issues.push("CROSS_HISTORY_EVENT_HASH_CONFLICT");
      continue;
    }
    combined.set(event.eventHash, event);
  }
  return combined;
}

function ancestorChain(
  head: string,
  events: Map<string, HistoryEvent>,
  issues: string[],
  label: string,
): string[] {
  if (head === "GENESIS") return [];
  const result: string[] = [];
  const visited = new Set<string>();
  let cursor: string | null = head;
  while (cursor !== null) {
    if (visited.has(cursor)) {
      issues.push(`${label}_CAUSAL_CYCLE`);
      break;
    }
    visited.add(cursor);
    const event = events.get(cursor);
    if (event === undefined) {
      issues.push(`${label}_CAUSAL_PREDECESSOR_MISSING`);
      break;
    }
    result.push(cursor);
    cursor = event.previousEventHash;
  }
  return result;
}

function causalRelation(
  predecessorHead: string,
  successorHead: string,
  predecessorAncestors: readonly string[],
  successorAncestors: readonly string[],
  issues: readonly string[],
): G10CausalRelation {
  if (issues.length > 0) return "INDETERMINATE";
  if (predecessorHead === successorHead) return "SAME_POSITION";
  if (predecessorHead === "GENESIS" || successorAncestors.includes(predecessorHead)) return "PREDECESSOR_OF_SUCCESSOR";
  if (successorHead === "GENESIS" || predecessorAncestors.includes(successorHead)) return "SUCCESSOR_OF_PREDECESSOR";
  return "DIVERGENT";
}

function addPath(
  selected: Set<string>,
  start: string,
  stopInclusive: string,
  events: Map<string, HistoryEvent>,
): void {
  if (start === "GENESIS") return;
  let cursor: string | null = start;
  const visited = new Set<string>();
  while (cursor !== null && !visited.has(cursor)) {
    visited.add(cursor);
    selected.add(cursor);
    if (cursor === stopInclusive) return;
    cursor = events.get(cursor)?.previousEventHash ?? null;
  }
}

function revisionBinding(event: HistoryEvent): number | null {
  if (event.payload === null || typeof event.payload !== "object" || Array.isArray(event.payload)) return null;
  const payload = event.payload as Record<string, unknown>;
  for (const key of ["modelRevision", "effectiveRevision", "resultingRevision"] as const) {
    const value = payload[key];
    if (typeof value === "number" && Number.isSafeInteger(value)) return value;
  }
  return null;
}

function projectedPositions(
  predecessorHead: string,
  successorHead: string,
  predecessorAncestors: readonly string[],
  successorAncestors: readonly string[],
  relation: G10CausalRelation,
  selectedHashes: readonly string[],
  events: Map<string, HistoryEvent>,
  issues: string[],
): { positions: G10SemanticHistoryPosition[]; edges: G10CausalEdge[] } {
  const selected = new Set<string>();
  if (predecessorHead !== "GENESIS") {
    if (events.has(predecessorHead)) selected.add(predecessorHead);
    else issues.push("PREDECESSOR_HEAD_POSITION_UNAVAILABLE");
  }
  if (successorHead !== "GENESIS") {
    if (events.has(successorHead)) selected.add(successorHead);
    else issues.push("SUCCESSOR_HEAD_POSITION_UNAVAILABLE");
  }
  for (const eventHash of selectedHashes) {
    if (!events.has(eventHash)) issues.push("SELECTED_HISTORY_POSITION_UNAVAILABLE");
    else selected.add(eventHash);
  }
  if (relation === "PREDECESSOR_OF_SUCCESSOR") addPath(selected, successorHead, predecessorHead, events);
  if (relation === "SUCCESSOR_OF_PREDECESSOR") addPath(selected, predecessorHead, successorHead, events);
  if (relation === "DIVERGENT") {
    const predecessorSet = new Set(predecessorAncestors);
    const nearestCommon = successorAncestors.find((eventHash) => predecessorSet.has(eventHash));
    if (nearestCommon !== undefined) selected.add(nearestCommon);
  }
  const roles = new Map<string, string[]>();
  const addRole = (eventHash: string, role: string): void => {
    if (eventHash === "GENESIS") return;
    roles.set(eventHash, [...(roles.get(eventHash) ?? []), role]);
  };
  addRole(predecessorHead, "PREDECESSOR_HEAD");
  addRole(successorHead, "SUCCESSOR_HEAD");
  selectedHashes.forEach((eventHash) => addRole(eventHash, "EXPLICITLY_SELECTED"));
  const positions = [...selected].flatMap((eventHash) => {
    const event = events.get(eventHash);
    if (event === undefined) {
      issues.push("PROJECTED_HISTORY_POSITION_UNAVAILABLE");
      return [];
    }
    return {
      eventHash,
      previousEventHash: event.previousEventHash,
      sequence: event.sequence,
      eventType: event.type,
      revisionBinding: revisionBinding(event),
      roles: canonicalSemanticSet(roles.get(eventHash) ?? ["CONNECTING_CAUSAL_POSITION"]),
    };
  }).sort((left, right) => compareSemanticCodePoints(left.eventHash, right.eventHash));
  const edges = positions.flatMap((position) => (
    position.previousEventHash !== null && selected.has(position.previousEventHash)
      ? [{ predecessorEventHash: position.previousEventHash, successorEventHash: position.eventHash }]
      : []
  )).sort((left, right) => compareSemanticCodePoints(
    `${left.predecessorEventHash}:${left.successorEventHash}`,
    `${right.predecessorEventHash}:${right.successorEventHash}`,
  ));
  return { positions, edges };
}

function flattenSemantic(value: SemanticJson, path = ""): Map<string, string> {
  const result = new Map<string, string>();
  const visit = (candidate: SemanticJson, coordinate: string): void => {
    if (candidate === null || typeof candidate !== "object") {
      result.set(coordinate || "/", canonicalSemanticText(candidate));
      return;
    }
    if (Array.isArray(candidate)) {
      if (candidate.length === 0) result.set(coordinate || "/", "[]");
      candidate.forEach((entry, index) => visit(entry, `${coordinate}/${index}`));
      return;
    }
    const keys = Object.keys(candidate).sort(compareSemanticCodePoints);
    if (keys.length === 0) result.set(coordinate || "/", "{}");
    keys.forEach((key) => visit(candidate[key], `${coordinate}/${key.replaceAll("~", "~0").replaceAll("/", "~1")}`));
  };
  visit(value, path);
  return result;
}

function coordinateDeltas(
  predecessor: G8EngineeringRealityProjection,
  successor: G8EngineeringRealityProjection,
  comparison: G8EngineeringRealityComparisonResult,
): G10SemanticCoordinateDelta[] {
  if (comparison.semanticComparison !== "DIFFERENT") return [];
  const before = flattenSemantic(predecessor.semanticMaterial);
  const after = flattenSemantic(successor.semanticMaterial);
  const coordinates = [...new Set([...before.keys(), ...after.keys()])].sort(compareSemanticCodePoints);
  return coordinates.flatMap((coordinate) => {
    const left = before.get(coordinate);
    const right = after.get(coordinate);
    if (left === right) return [];
    const kind: G10SemanticCoordinateDeltaKind = left === undefined ? "ADDED" : right === undefined ? "REMOVED" : "CHANGED";
    return [{
      coordinate,
      kind,
      predecessorValueIdentity: left === undefined ? null : sha256LengthPrefixedFrames([{ label: "semantic-coordinate-value", value: left }]),
      successorValueIdentity: right === undefined ? null : sha256LengthPrefixedFrames([{ label: "semantic-coordinate-value", value: right }]),
    }];
  });
}

function validateG8Binding(input: G10SemanticHistoryDiffInput, reasonCodes: string[]): void {
  if (input.predecessorModel.project.projectId !== input.successorModel.project.projectId) {
    reasonCodes.push("CROSS_PROJECT_HISTORY_COMPARISON");
  }
  if (
    input.predecessor.rulesetVersion !== G8_ENGINEERING_REALITY_RULESET_VERSION
    || input.successor.rulesetVersion !== G8_ENGINEERING_REALITY_RULESET_VERSION
  ) reasonCodes.push("G8_RULESET_AUTHORITY_MISMATCH");
  if (
    input.predecessor.source.canonicalModelRevision !== input.predecessorModel.canonicalState.modelRevision
    || input.predecessor.source.canonicalModelIntegrityHash !== input.predecessorModel.canonicalState.integrity.modelHash
    || canonicalize(input.predecessor.source.historyHead) !== canonicalize(input.predecessorModel.canonicalState.historyHead)
  ) reasonCodes.push("G8_PREDECESSOR_SOURCE_MISMATCH");
  if (
    input.successor.source.canonicalModelRevision !== input.successorModel.canonicalState.modelRevision
    || input.successor.source.canonicalModelIntegrityHash !== input.successorModel.canonicalState.integrity.modelHash
    || canonicalize(input.successor.source.historyHead) !== canonicalize(input.successorModel.canonicalState.historyHead)
  ) reasonCodes.push("G8_SUCCESSOR_SOURCE_MISMATCH");
  const direct = compareG8EngineeringReality(input.predecessor, input.successor);
  if (canonicalize(direct) !== canonicalize(input.comparison)) reasonCodes.push("G8_COMPARISON_AUTHORITY_MISMATCH");
}

function completionLink(input: G10SemanticHistoryDiffInput, reasonCodes: string[]): G10CompletionLink | undefined {
  if (input.g9 === undefined) {
    if (input.request.g9CompletionLinkApplicability === "REQUIRED") reasonCodes.push("G9_COMPLETION_LINK_REQUIRED_BUT_ABSENT");
    return undefined;
  }
  if (
    input.g9.rulesetVersion !== G9_TRANSITION_COMPLETION_RULESET_VERSION
    || input.g9.comparisonId !== input.comparison.comparisonId
    || input.g9.predecessorSemanticIdentity !== input.predecessor.semanticRealityIdentity
    || input.g9.successorSemanticIdentity !== input.successor.semanticRealityIdentity
  ) reasonCodes.push("G9_COMPLETION_LINK_AUTHORITY_MISMATCH");
  return {
    assessmentId: input.g9.assessmentId,
    transitionId: input.g9.transitionId,
    completionAssessment: input.g9.completionAssessment,
    transitionDisposition: input.g9.transitionDisposition,
    recoveryAssessment: input.g9.recoveryAssessment,
    provesHistoricalRewrite: false,
  };
}

/**
 * Projects a bounded causal view over the existing canonical history and an exact G8 comparison.
 * It never persists history, creates a second ledger, repairs a chain, or treats timestamps as causality.
 */
export function deriveG10SemanticHistoryDiff(
  input: G10SemanticHistoryDiffInput,
): G10SemanticHistoryDiffProjection {
  if (input === null || typeof input !== "object") throw new Error("HITO G10 requires a structured derivation input");
  assertExactKeys(input, INPUT_KEYS, "HITO G10 derivation input");
  assertValidModel(input.predecessorModel);
  assertValidModel(input.successorModel);
  const before = canonicalize(input);
  const request = validateRequest(input.request);
  const reasonCodes: string[] = [];
  validateG8Binding(input, reasonCodes);

  const predecessorHistory = validateBoundHistory("PREDECESSOR", input.predecessorModel, input.predecessorHistory);
  const successorHistory = validateBoundHistory("SUCCESSOR", input.successorModel, input.successorHistory);
  reasonCodes.push(...predecessorHistory.issues, ...successorHistory.issues);
  const events = combinedHistory(predecessorHistory, successorHistory, reasonCodes);
  const predecessorHead = input.predecessorModel.canonicalState.historyHead.eventHash;
  const successorHead = input.successorModel.canonicalState.historyHead.eventHash;
  const predecessorAncestors = ancestorChain(predecessorHead, events, reasonCodes, "PREDECESSOR");
  const successorAncestors = ancestorChain(successorHead, events, reasonCodes, "SUCCESSOR");
  let relation = causalRelation(predecessorHead, successorHead, predecessorAncestors, successorAncestors, reasonCodes);
  const projection = projectedPositions(
    predecessorHead,
    successorHead,
    predecessorAncestors,
    successorAncestors,
    relation,
    request.selectedEventHashes,
    events,
    reasonCodes,
  );
  if (reasonCodes.some((code) => code.includes("HISTORY") || code.includes("CAUSAL") || code.includes("SELECTED"))) relation = "INDETERMINATE";

  const linkedCompletion = completionLink(input, reasonCodes);
  const causalRequiredButUnresolved = request.causalComparisonApplicability === "REQUIRED" && (
    relation === "INDETERMINATE"
    || relation === "DIVERGENT"
    || relation === "SUCCESSOR_OF_PREDECESSOR"
    || (
      input.comparison.semanticComparison === "DIFFERENT"
      && (
        relation !== "PREDECESSOR_OF_SUCCESSOR"
        || input.successorModel.canonicalState.modelRevision <= input.predecessorModel.canonicalState.modelRevision
      )
    )
  );
  if (causalRequiredButUnresolved) reasonCodes.push("REQUIRED_CAUSAL_COMPARISON_UNRESOLVED");

  const authorityMismatch = reasonCodes.some((code) =>
    code.includes("MISMATCH")
    || code.includes("REQUIRED_BUT_ABSENT")
    || code === "CROSS_PROJECT_HISTORY_COMPARISON",
  );
  let diffAssessment: G10DiffAssessment;
  if (input.comparison.semanticComparison === "INDETERMINATE" || causalRequiredButUnresolved || authorityMismatch) {
    diffAssessment = "INDETERMINATE";
    reasonCodes.push("SEMANTIC_DIFF_AUTHORITY_INDETERMINATE");
  } else if (input.comparison.semanticComparison === "SAME") {
    diffAssessment = "NO_SEMANTIC_DIFFERENCE";
    reasonCodes.push("G8_SAME_ESTABLISHES_NO_SEMANTIC_DIFFERENCE");
    if (input.comparison.contextDelta === "REFRESH_ONLY") reasonCodes.push("REFRESH_ONLY_EXCLUDED_FROM_SEMANTIC_DIFFERENCE");
  } else {
    diffAssessment = "SEMANTIC_DIFFERENCE";
    reasonCodes.push("G8_DIFFERENT_ESTABLISHES_SEMANTIC_DIFFERENCE");
  }

  const deltas = coordinateDeltas(input.predecessor, input.successor, input.comparison);
  const source = {
    predecessor: {
      modelRevision: input.predecessorModel.canonicalState.modelRevision,
      modelIntegrityHash: input.predecessorModel.canonicalState.integrity.modelHash,
      historyHead: structuredClone(input.predecessorModel.canonicalState.historyHead),
      historyHash: input.predecessorModel.canonicalState.integrity.historyHash,
      semanticRealityIdentity: input.predecessor.semanticRealityIdentity,
    },
    successor: {
      modelRevision: input.successorModel.canonicalState.modelRevision,
      modelIntegrityHash: input.successorModel.canonicalState.integrity.modelHash,
      historyHead: structuredClone(input.successorModel.canonicalState.historyHead),
      historyHash: input.successorModel.canonicalState.integrity.historyHash,
      semanticRealityIdentity: input.successor.semanticRealityIdentity,
    },
    g8ComparisonId: input.comparison.comparisonId,
    g9AssessmentId: input.g9?.assessmentId ?? null,
  };
  const projectionId = `hito_g10_history_diff_${sha256LengthPrefixedFrames([
    { label: "ruleset", value: G10_SEMANTIC_HISTORY_DIFF_RULESET_VERSION },
    { label: "request", value: request },
    { label: "source", value: source },
    { label: "causal-projection", value: { relation, positions: projection.positions, edges: projection.edges } },
    { label: "semantic-diff", value: { diffAssessment, deltas, contextDelta: input.comparison.contextDelta } },
    { label: "g9-completion-link", value: linkedCompletion ?? "ABSENT" },
  ])}`;
  const result: G10SemanticHistoryDiffProjection = {
    kind: "HITO_G10_SEMANTIC_HISTORY_DIFF_DERIVED_PROJECTION",
    rulesetVersion: G10_SEMANTIC_HISTORY_DIFF_RULESET_VERSION,
    authority: G10_SEMANTIC_HISTORY_DIFF_AUTHORITY,
    projectionId,
    diffAssessment,
    causalRelation: relation,
    contextDelta: input.comparison.contextDelta,
    semanticComparison: input.comparison.semanticComparison,
    positions: projection.positions,
    causalEdges: projection.edges,
    semanticCoordinateDeltas: deltas,
    ...(linkedCompletion === undefined ? {} : { g9CompletionLink: linkedCompletion }),
    source,
    reasonCodes: canonicalSemanticSet(reasonCodes),
    zeroEffectCounters: zeroEffects(),
    truthBoundary: "G10 is a bounded derived view over the existing hash-bound canonical causal history and accepted G8 meaning. It is neither canonical SemanticHistory nor canonical SemanticDiff and cannot rewrite historical truth.",
    limitations: [
      "Causal authority comes only from canonical history event hashes and previous-event relations, never timestamps, mtimes, lexical order, or incidental input order.",
      "G9 completion, disposition, rollback, recovery, partial, failed, and aborted axes remain distinct linked evidence and never rewrite history.",
      "REFRESH_ONLY remains context and cannot manufacture semantic history.",
      "No history store, revision ledger, repair authority, canonical write, target execution, provider call, network call, or namespace migration is present.",
    ],
  };
  if (canonicalize(input) !== before) throw new Error("HITO G10 mutated caller or canonical history input");
  return result;
}
