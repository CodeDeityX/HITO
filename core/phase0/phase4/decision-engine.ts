import {
  assertValidModel,
  canonicalize,
  createDerivedOutput,
  derivedOutputInputsFromModel,
  evaluateStaleness,
  sha256Text,
} from "../contracts";
import type {
  CanonicalModel,
  Capability,
  DerivedFinding,
  DerivedOutput,
  EntityProvenance,
  FindingSeverity,
  HealthStatus,
  Mutation,
  ReconciliationAmbiguity,
  ReconciliationCandidate,
  ReconciliationConflict,
  StalenessState,
} from "../contracts";

/** HITO Phase 4: deterministic derived intelligence over validated canonical truth only. */
export const PHASE4_RULESET_VERSION = "hito-phase4-semantic-decision-v1-repair2";
export const PHASE4_GENERATED_AT = "1970-01-01T00:00:00.000Z";

export type Phase4ReconciliationState = "LIVE" | "PARTIAL" | "DISCONNECTED" | "DUPLICATED" | "SUPERSEDED" | "NOT_FOUND" | "UNKNOWN";
export type Phase4NoDoubleWorkAction = "VERIFY_EXISTING" | "CONNECT_EXISTING" | "PROMOTE_TO_CANONICAL" | "ADAPT_EXISTING" | "COMPLETE_PARTIAL" | "REMOVE_DUPLICATE_AFTER_PARITY" | "RESTORE_SUPERSEDED" | "BUILD_MISSING" | "BLOCKED" | "RECOVERY_REQUIRED";
export type Phase4ContradictionCode = "COMPETING_PRIMARY_OWNER" | "COMPETING_RUNTIME_HOME" | "EQUIVALENT_CAPABILITY_CANDIDATES" | "INTENT_UNCONFIRMED" | "INTEGRATION_EXPECTATION_MISSING_EDGE" | "EVIDENCE_CLAIM_MISMATCH" | "DO_NOT_TOUCH_CONFLICT" | "LINEAGE_BLOCKS_BUILD_MISSING";
export type Phase4DriftKind = "CLAIM_DRIFT" | "MOCK_DRIFT" | "INTEGRATION_DRIFT" | "RUNTIME_GAP" | "OWNERSHIP_DRIFT" | "ROADMAP_DRIFT" | "EVIDENCE_DRIFT" | "CONFIGURATION_DRIFT" | "DUPLICATION_DRIFT" | "SCOPE_DRIFT";

export const PHASE4_CONTRADICTION_REPRESENTABILITY = {
  COMPETING_PRIMARY_OWNER: "NOT_REPRESENTABLE_BY_CURRENT_CANONICAL_INPUT",
  COMPETING_RUNTIME_HOME: "IMPLEMENTED_FROM_RECONCILIATION_TRACE",
  EQUIVALENT_CAPABILITY_CANDIDATES: "IMPLEMENTED_FROM_CANONICAL_CAPABILITY_IDENTITIES",
  INTENT_UNCONFIRMED: "IMPLEMENTED_FROM_CANONICAL_INTENT_AUTHORITY",
  INTEGRATION_EXPECTATION_MISSING_EDGE: "NOT_REPRESENTABLE_BY_CURRENT_CANONICAL_INPUT",
  EVIDENCE_CLAIM_MISMATCH: "IMPLEMENTED_FROM_CANONICAL_CLAIMS",
  DO_NOT_TOUCH_CONFLICT: "IMPLEMENTED_FROM_CANONICAL_IMPLEMENTATION_REFS",
  LINEAGE_BLOCKS_BUILD_MISSING: "IMPLEMENTED_FROM_CANONICAL_LINEAGE_AND_LIFECYCLE",
} as const;

export interface Phase4EvaluationRequest {
  requestId: string;
  requestedCapability: {
    capabilityId?: string;
    name: string;
    aliases?: string[];
    promiseId?: string;
  };
  generatedAt?: string;
}

export interface Phase4Reconciliation {
  state: Phase4ReconciliationState;
  candidateCapabilityIds: string[];
  relatedCapabilityIds: string[];
  owningSubsystemIds: string[];
  currentRuntimeHomeIds: string[];
  historicalRuntimeHomeIds: string[];
  evidenceIds: string[];
  verificationStates: string[];
  claimBoundaries: string[];
  unknowns: string[];
  lineageEventIds: string[];
  relatedAmbiguityAnchors: string[];
  relatedConflictAnchors: string[];
  reason: string;
}

export interface Phase4Contradiction {
  contradictionId: string;
  code: Phase4ContradictionCode;
  severity: FindingSeverity;
  confidence: number;
  affectedEntityIds: string[];
  summary: string;
}

export interface Phase4DriftFinding {
  driftId: string;
  kind: Phase4DriftKind;
  severity: FindingSeverity;
  confidence: number;
  affectedEntityIds: string[];
  summary: string;
}

export interface Phase4DoNotTouchBoundary {
  protectedCapabilityIds: string[];
  currentRuntimeHomeIds: string[];
  stateAuthorities: string[];
  eventAuthorities: string[];
  persistenceAuthorities: string[];
  evidenceAuthorityIds: string[];
  redZones: string[];
  unaffectedCapabilityIds: string[];
}

export interface Phase4NextSafeMutation {
  mutation: Mutation;
  plainLanguageAction: string;
  reasonNextSafe: string;
  affectedPromiseId?: string;
  affectedCapabilityId?: string;
  affectedSubsystemId?: string;
  affectedRuntimePath?: string;
  expectedFiles: string[];
  expectedApis: string[];
  expectedStateAuthorities: string[];
  expectedEventAuthorities: string[];
  expectedConfiguration: string[];
  expectedDependencies: string[];
  safeZone: string[];
  unsafeZone: string[];
  userVisibleEffect: string;
  expectedRuntimeEffect: string;
  expectedEvidence: string[];
  regressionScope: string[];
  rollbackRecoveryPlan: string;
  doNotTouch: Phase4DoNotTouchBoundary;
  approvalExecutionStatus: "NON_EXECUTING_PROPOSAL";
}

export interface Phase4DecisionReport {
  kind: "HITO_PHASE4_DECISION_REPORT";
  source: {
    modelRevision: number;
    historySequence: number;
    evidenceSequence: number;
    derivedOutput: DerivedOutput;
    semanticHash: string;
  };
  request: Phase4EvaluationRequest;
  reconciliation: Phase4Reconciliation;
  noDoubleWork: {
    action: Phase4NoDoubleWorkAction;
    buildMissingBlocked: boolean;
    reason: string;
  };
  contradictions: Phase4Contradiction[];
  driftFindings: Phase4DriftFinding[];
  proposal: Phase4NextSafeMutation;
  truthBoundary: string;
}

function sorted<T>(items: readonly T[], key: (item: T) => string): T[] {
  return [...items].sort((left, right) => key(left).localeCompare(key(right)));
}

function sortedUnique(values: readonly string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function normalized(value: string): string {
  return value.trim().toLocaleLowerCase().replaceAll(/[^a-z0-9]+/g, " ").trim();
}

function stableId(prefix: string, semantic: unknown): string {
  return `${prefix}_${sha256Text(canonicalize(semantic)).slice(0, 32)}`;
}

function phase4RequestDiscriminator(request: Phase4EvaluationRequest): string {
  return sha256Text(canonicalize({
    requestId: request.requestId,
    requestedCapability: {
      capabilityId: request.requestedCapability.capabilityId ?? null,
      name: request.requestedCapability.name,
      aliases: sortedUnique(request.requestedCapability.aliases ?? []),
      promiseId: request.requestedCapability.promiseId ?? null,
    },
  })).slice(0, 32);
}

function capabilityNames(capability: Capability): string[] {
  return sortedUnique([capability.capabilityId, capability.name, ...capability.aliases].map(normalized).filter(Boolean));
}

function requestNames(request: Phase4EvaluationRequest): string[] {
  return sortedUnique([
    request.requestedCapability.capabilityId ?? "",
    request.requestedCapability.name,
    ...(request.requestedCapability.aliases ?? []),
  ].map(normalized).filter(Boolean));
}

function matchesRequest(capability: Capability, request: Phase4EvaluationRequest): boolean {
  const candidates = new Set(capabilityNames(capability));
  return requestNames(request).some((name) => candidates.has(name));
}

function requestBoundDeclaredIntent(model: CanonicalModel, request: Phase4EvaluationRequest): boolean {
  const promiseId = request.requestedCapability.promiseId?.trim();
  if (!promiseId) return false;
  return model.intent.some((intent) => intent.promiseId === promiseId && intent.authority === "DECLARED_INTENT");
}

function requestCapabilityIds(request: Phase4EvaluationRequest, candidates: Capability[]): Set<string> {
  return new Set(sortedUnique([
    request.requestedCapability.capabilityId ?? "",
    ...candidates.map((capability) => capability.capabilityId),
  ].filter(Boolean)));
}

function candidateBridgesRequest(candidate: ReconciliationCandidate, capabilityIds: Set<string>): boolean {
  return capabilityIds.has(candidate.candidateId)
    || (candidate.matchedPriorId !== undefined && capabilityIds.has(candidate.matchedPriorId))
    || (candidate.alternatives ?? []).some((alternative) => capabilityIds.has(alternative));
}

function phase2AnchorsForRequest(model: CanonicalModel, request: Phase4EvaluationRequest, candidates: Capability[]): Set<string> {
  const capabilityIds = requestCapabilityIds(request, candidates);
  const traceCandidates = model.reconciliationTrace?.candidates ?? [];
  return new Set(traceCandidates
    .filter((candidate) => candidateBridgesRequest(candidate, capabilityIds))
    .map((candidate) => candidate.anchor));
}

function isRelatedReconciliationRecord(model: CanonicalModel, record: ReconciliationAmbiguity | ReconciliationConflict, request: Phase4EvaluationRequest, candidates: Capability[]): boolean {
  const capabilityIds = requestCapabilityIds(request, candidates);
  const relatedAnchors = phase2AnchorsForRequest(model, request, candidates);
  return relatedAnchors.has(record.anchor)
    || record.candidateIds.some((candidateId) => capabilityIds.has(candidateId));
}

function lifecycleRequiresUnknown(lifecycle: Capability["lifecycleStatus"]): boolean {
  return ["PROPOSED", "APPROVED", "IMPLEMENTING", "BLOCKED", "DEPRECATED", "NOT_FOUND", "UNKNOWN"].includes(lifecycle);
}

function healthBlocksAction(health: HealthStatus): boolean {
  return ["RECONCILIATION_REQUIRED", "REPAIR_REQUIRED", "BLOCKED", "INDETERMINATE"].includes(health);
}

function currentRuntimeHomeIds(model: CanonicalModel, capabilityId: string): string[] {
  const revision = model.canonicalState.modelRevision;
  return sorted(model.runtimeHomes.filter((home) => home.capabilityId === capabilityId
    && home.effectiveFromRevision <= revision
    && (home.effectiveToRevision === undefined || home.effectiveToRevision > revision)), (home) => home.runtimeHomeId)
    .map((home) => home.runtimeHomeId);
}

function currentRuntimeHomes(model: CanonicalModel, capabilityId: string) {
  const revision = model.canonicalState.modelRevision;
  return sorted(model.runtimeHomes.filter((home) => home.capabilityId === capabilityId
    && home.effectiveFromRevision <= revision
    && (home.effectiveToRevision === undefined || home.effectiveToRevision > revision)), (home) => home.runtimeHomeId);
}

function phase4Provenance(model: CanonicalModel, sourceRef: string, confidence = 1): EntityProvenance {
  return {
    observationClass: "RECONCILED",
    source: "hito:phase4:deterministic-semantic-decision-engine",
    sourceRef,
    confidence,
    observedAt: PHASE4_GENERATED_AT,
    modelRevision: model.canonicalState.modelRevision,
  };
}

function reconciliationFor(model: CanonicalModel, request: Phase4EvaluationRequest, candidates: Capability[]): Phase4Reconciliation {
  const relatedCapabilityIds = candidates.map((capability) => capability.capabilityId);
  const runtimeHomes = candidates.flatMap((capability) => currentRuntimeHomeIds(model, capability.capabilityId));
  const historicalRuntimeHomeIds = candidates.flatMap((capability) => capability.historicalRuntimeHomeIds);
  const evidenceIds = candidates.flatMap((capability) => capability.evidenceIds);
  const unknowns: string[] = [];
  const declaredIntent = requestBoundDeclaredIntent(model, request);
  if (!declaredIntent) unknowns.push("INTENT_UNCONFIRMED_OR_UNBOUND");
  if (candidates.some((capability) => capability.lifecycleStatus === "UNKNOWN" || capability.provenance.observationClass === "UNKNOWN")) unknowns.push("CAPABILITY_UNKNOWN");
  const relatedAmbiguities = sorted((model.reconciliationTrace?.ambiguities ?? []).filter((item) => isRelatedReconciliationRecord(model, item, request, candidates)), (item) => item.anchor);
  const relatedConflicts = sorted((model.reconciliationTrace?.conflicts ?? []).filter((item) => isRelatedReconciliationRecord(model, item, request, candidates)), (item) => item.anchor);
  if (relatedAmbiguities.length > 0) unknowns.push("RECONCILIATION_AMBIGUITY_RELATED_TO_REQUEST");
  if (relatedConflicts.length > 0) unknowns.push("RECONCILIATION_CONFLICT_RELATED_TO_REQUEST");

  let state: Phase4ReconciliationState;
  let reason: string;
  if (relatedAmbiguities.length > 0 || relatedConflicts.length > 0) {
    state = "UNKNOWN";
    reason = "Request-relevant Phase 2 reconciliation ambiguity or conflict remains unresolved; identity is not actionable.";
  } else if (candidates.length === 0) {
    state = declaredIntent ? "NOT_FOUND" : "UNKNOWN";
    reason = declaredIntent
      ? "No credible canonical capability candidate was found for the declared controlled request."
      : "No credible canonical capability candidate was found and the request lacks an explicitly bound canonical declared intent.";
  } else if (candidates.length > 1) {
    state = "DUPLICATED";
    reason = "Multiple equivalent canonical capability candidates require reconciliation before new construction.";
  } else {
    const capability = candidates[0];
    if (capability.lifecycleStatus === "SUPERSEDED" || capability.lifecycleStatus === "RETIRED") {
      state = "SUPERSEDED";
      reason = "The credible candidate is historically superseded or retired and remains recoverable through lineage.";
    } else if (capability.lifecycleStatus === "PARTIAL") {
      state = "PARTIAL";
      reason = "The credible candidate is explicitly partial; completion is safer than replacement.";
    } else if (capability.lifecycleStatus === "DEGRADED" || capability.runtimeGap) {
      state = "DISCONNECTED";
      reason = "The credible candidate exists but has an explicit runtime gap or degraded connection.";
    } else if (lifecycleRequiresUnknown(capability.lifecycleStatus) || capability.provenance.observationClass === "UNKNOWN" || healthBlocksAction(capability.health)) {
      state = "UNKNOWN";
      reason = `The credible candidate lifecycle or health (${capability.lifecycleStatus}/${capability.health}) is not semantically current LIVE truth and cannot support an invented recommendation.`;
    } else {
      state = "LIVE";
      reason = "A current canonical capability candidate exists with a resolved current runtime home.";
    }
  }
  return {
    state,
    candidateCapabilityIds: sortedUnique(candidates.map((capability) => capability.capabilityId)),
    relatedCapabilityIds: sortedUnique(relatedCapabilityIds),
    owningSubsystemIds: sortedUnique(candidates.map((capability) => capability.owningSubsystemId)),
    currentRuntimeHomeIds: sortedUnique(runtimeHomes),
    historicalRuntimeHomeIds: sortedUnique(historicalRuntimeHomeIds),
    evidenceIds: sortedUnique(evidenceIds),
    verificationStates: sortedUnique(candidates.map((capability) => capability.verificationState)),
    claimBoundaries: sortedUnique(candidates.map((capability) => capability.claimBoundary)),
    unknowns: sortedUnique(unknowns),
    lineageEventIds: sortedUnique(candidates.flatMap((capability) => capability.lineageEventIds)),
    relatedAmbiguityAnchors: relatedAmbiguities.map((item) => item.anchor),
    relatedConflictAnchors: relatedConflicts.map((item) => item.anchor),
    reason,
  };
}

function noDoubleWorkFor(reconciliation: Phase4Reconciliation, contradictions: Phase4Contradiction[]): Phase4DecisionReport["noDoubleWork"] {
  if (contradictions.some((contradiction) => contradiction.code === "DO_NOT_TOUCH_CONFLICT")) {
    return { action: "BLOCKED", buildMissingBlocked: true, reason: "The proposed safe zone intersects a protected Do Not Touch/red-zone boundary." };
  }
  switch (reconciliation.state) {
    case "LIVE": return { action: "VERIFY_EXISTING", buildMissingBlocked: true, reason: "Existing live canonical capability must be verified before any construction." };
    case "DISCONNECTED": return { action: "CONNECT_EXISTING", buildMissingBlocked: true, reason: "Existing disconnected capability must be connected before replacement." };
    case "PARTIAL": return { action: "COMPLETE_PARTIAL", buildMissingBlocked: true, reason: "Existing partial capability must be completed before replacement." };
    case "DUPLICATED": return { action: "BLOCKED", buildMissingBlocked: true, reason: "Equivalent candidates require reconciliation and parity evidence before construction." };
    case "SUPERSEDED": return { action: "RESTORE_SUPERSEDED", buildMissingBlocked: true, reason: "Recoverable superseded lineage must be evaluated before construction." };
    case "UNKNOWN": return { action: "BLOCKED", buildMissingBlocked: true, reason: "Unknown evidence or intent blocks BUILD_MISSING." };
    case "NOT_FOUND": return { action: "BUILD_MISSING", buildMissingBlocked: false, reason: "Controlled declared request has no credible existing candidate." };
  }
}

function severityFor(state: Phase4ReconciliationState): FindingSeverity {
  if (state === "DUPLICATED") return "HIGH";
  if (state === "DISCONNECTED") return "HIGH";
  if (state === "UNKNOWN") return "WARNING";
  return "INFO";
}

function confidenceFor(candidates: Capability[]): number {
  return candidates.some((capability) => capability.provenance.observationClass === "UNKNOWN") ? 0.4 : 1;
}

function canonicalPath(reference: string): string {
  return reference.trim().replaceAll("\\", "/").replace(/^\.\//, "");
}

function isProtectedCanonicalReference(reference: string): boolean {
  const candidate = canonicalPath(reference);
  return candidate === ".maat" || candidate.startsWith(".maat/");
}

function protectedCanonicalReferences(candidates: Capability[]): string[] {
  return sortedUnique(candidates.flatMap((capability) => capability.implementationRefs.filter(isProtectedCanonicalReference)));
}

function hasDoNotTouchConflict(candidates: Capability[]): boolean {
  return protectedCanonicalReferences(candidates).length > 0;
}

function contradictionsFor(model: CanonicalModel, request: Phase4EvaluationRequest, reconciliation: Phase4Reconciliation, candidates: Capability[]): Phase4Contradiction[] {
  const values: Phase4Contradiction[] = [];
  const add = (code: Phase4ContradictionCode, severity: FindingSeverity, confidence: number, affectedEntityIds: string[], summary: string) => {
    values.push({ contradictionId: stableId("phase4_contradiction", { code, affectedEntityIds: sortedUnique(affectedEntityIds), summary }), code, severity, confidence, affectedEntityIds: sortedUnique(affectedEntityIds), summary });
  };
  if (reconciliation.state === "DUPLICATED") add("EQUIVALENT_CAPABILITY_CANDIDATES", "HIGH", confidenceFor(candidates), reconciliation.candidateCapabilityIds, "Equivalent canonical capability candidates make new construction unsafe pending reconciliation.");
  if (reconciliation.unknowns.includes("INTENT_UNCONFIRMED_OR_UNBOUND")) add("INTENT_UNCONFIRMED", "WARNING", 1, [model.project.projectId], "The request lacks an explicitly matching canonical declared-intent binding; extracted or unrelated intent remains non-authoritative.");
  for (const conflict of sorted((model.reconciliationTrace?.conflicts ?? []).filter((item) => isRelatedReconciliationRecord(model, item, request, candidates)), (item) => item.anchor)) {
    add("COMPETING_RUNTIME_HOME", "CRITICAL", 1, conflict.candidateIds, "Canonical reconciliation trace records competing runtime-home candidates.");
  }
  for (const claim of sorted(model.claims, (item) => item.claimId)) {
    if (claim.capabilityId && reconciliation.candidateCapabilityIds.includes(claim.capabilityId) && ["UNSUPPORTED", "UNSAFE", "REMOVE"].includes(claim.status)) {
      add("EVIDENCE_CLAIM_MISMATCH", "HIGH", 1, [claim.claimId, claim.capabilityId], "Canonical claim status and evidence boundary require reconciliation before a stronger capability conclusion.");
    }
  }
  if (reconciliation.state === "SUPERSEDED" && candidates.some((capability) => capability.lineageEventIds.length > 0)) {
    add("LINEAGE_BLOCKS_BUILD_MISSING", "HIGH", confidenceFor(candidates), sortedUnique([...reconciliation.candidateCapabilityIds, ...reconciliation.lineageEventIds]), "Canonical superseded or retired lineage requires restoration or reconciliation before BUILD_MISSING.");
  }
  if (hasDoNotTouchConflict(candidates)) {
    add("DO_NOT_TOUCH_CONFLICT", "CRITICAL", confidenceFor(candidates), reconciliation.candidateCapabilityIds, "Candidate implementation references intersect protected canonical Do Not Touch/red-zone authority.");
  }
  return sorted(values, (item) => item.contradictionId);
}

function driftFor(model: CanonicalModel, reconciliation: Phase4Reconciliation, contradictions: Phase4Contradiction[], candidates: Capability[]): Phase4DriftFinding[] {
  const values: Phase4DriftFinding[] = [];
  const add = (kind: Phase4DriftKind, severity: FindingSeverity, confidence: number, affectedEntityIds: string[], summary: string) => {
    values.push({ driftId: stableId("phase4_drift", { kind, affectedEntityIds: sortedUnique(affectedEntityIds), summary }), kind, severity, confidence, affectedEntityIds: sortedUnique(affectedEntityIds), summary });
  };
  if (reconciliation.state === "DISCONNECTED") add("RUNTIME_GAP", severityFor(reconciliation.state), confidenceFor(candidates), reconciliation.candidateCapabilityIds, "Capability exists with an explicit runtime gap; no replacement runtime owner is inferred.");
  if (reconciliation.state === "DUPLICATED") add("DUPLICATION_DRIFT", severityFor(reconciliation.state), confidenceFor(candidates), reconciliation.candidateCapabilityIds, "Equivalent capability candidates create duplication drift pending reconciliation.");
  if (reconciliation.state === "PARTIAL") add("SCOPE_DRIFT", "WARNING", confidenceFor(candidates), reconciliation.candidateCapabilityIds, "Capability lifecycle is PARTIAL; claimed completion must remain bounded to observed evidence.");
  for (const contradiction of contradictions) {
    if (contradiction.code === "EVIDENCE_CLAIM_MISMATCH") add("CLAIM_DRIFT", contradiction.severity, contradiction.confidence, contradiction.affectedEntityIds, contradiction.summary);
  }
  for (const capability of candidates) {
    if (capability.evidenceIds.length === 0 || capability.verificationState === "UNVERIFIED") add("EVIDENCE_DRIFT", "WARNING", confidenceFor([capability]), [capability.capabilityId], "Capability lacks sufficient canonical evidence for a stronger verification claim.");
  }
  return sorted(values, (item) => item.driftId);
}

function doNotTouchFor(model: CanonicalModel, affectedCapabilityIds: string[], protectedReferences: string[] = []): Phase4DoNotTouchBoundary {
  const currentHomes = sorted(model.runtimeHomes.filter((home) => currentRuntimeHomeIds(model, home.capabilityId).includes(home.runtimeHomeId)), (home) => home.runtimeHomeId);
  const affected = new Set(affectedCapabilityIds);
  return {
    protectedCapabilityIds: sortedUnique(affectedCapabilityIds),
    currentRuntimeHomeIds: currentHomes.map((home) => home.runtimeHomeId),
    stateAuthorities: sortedUnique(currentHomes.map((home) => home.stateOwner ?? "").filter(Boolean)),
    eventAuthorities: sortedUnique(currentHomes.map((home) => home.eventOwner ?? "").filter(Boolean)),
    persistenceAuthorities: sortedUnique(currentHomes.map((home) => home.persistenceOwner ?? "").filter(Boolean)),
    evidenceAuthorityIds: sortedUnique(model.evidenceRefs.map((evidence) => evidence.evidenceId)),
    redZones: sortedUnique(["canonical .maat/model.json", "canonical .maat/history.jsonl", "canonical .maat/evidence-manifest.json", "Phase 0-3 locked evidence", "governed target execution", ...protectedReferences]),
    unaffectedCapabilityIds: sorted(model.capabilities.filter((capability) => !affected.has(capability.capabilityId)), (capability) => capability.capabilityId).map((capability) => capability.capabilityId),
  };
}

function proposalFor(model: CanonicalModel, request: Phase4EvaluationRequest, reconciliation: Phase4Reconciliation, noDoubleWork: Phase4DecisionReport["noDoubleWork"]): Phase4NextSafeMutation {
  const capability = reconciliation.candidateCapabilityIds.map((id) => model.capabilities.find((candidate) => candidate.capabilityId === id)).find((candidate): candidate is Capability => Boolean(candidate));
  const currentHomes = capability ? currentRuntimeHomes(model, capability.capabilityId) : [];
  const protectedReferences = protectedCanonicalReferences(capability ? [capability] : []);
  const safeImplementationRefs = sortedUnique((capability?.implementationRefs ?? []).filter((reference) => !isProtectedCanonicalReference(reference)));
  const actionText: Record<Phase4NoDoubleWorkAction, string> = {
    VERIFY_EXISTING: "Verify the existing canonical capability against its named evidence boundary.",
    CONNECT_EXISTING: "Connect the existing capability to its canonical runtime boundary without rebuilding it.",
    PROMOTE_TO_CANONICAL: "Promote an existing proven candidate only through a governed canonical decision.",
    ADAPT_EXISTING: "Adapt the existing candidate before considering new construction.",
    COMPLETE_PARTIAL: "Complete the bounded missing boundary of the existing partial capability.",
    REMOVE_DUPLICATE_AFTER_PARITY: "Remove duplicate authority only after parity is proven.",
    RESTORE_SUPERSEDED: "Verify and restore recoverable superseded lineage before new construction.",
    BUILD_MISSING: "Prepare a governed proposal for the controlled genuinely missing capability; do not implement it yet.",
    BLOCKED: "Defer construction and resolve the explicit reconciliation or intent boundary first.",
    RECOVERY_REQUIRED: "Recover validated canonical continuity before any further decision.",
  };
  const proofPlan = sortedUnique(["Re-run deterministic Phase 4 analysis", "Validate canonical model, history, and evidence heads", ...(capability?.evidenceIds ?? [])]);
  const mutationId = stableId("phase4_mutation", { request: request.requestId, action: noDoubleWork.action, capabilityId: capability?.capabilityId ?? null, modelRevision: model.canonicalState.modelRevision });
  const doNotTouch = doNotTouchFor(model, capability ? [capability.capabilityId] : [], protectedReferences);
  const mutation: Mutation = {
    mutationId,
    reason: reconciliation.reason,
    affectedEntityIds: sortedUnique([model.project.projectId, ...(capability ? [capability.capabilityId] : [])]),
    expectedEffect: actionText[noDoubleWork.action],
    proposal: actionText[noDoubleWork.action],
    risk: "Derived Phase 4 output is not permission to mutate; canonical and target authority remain protected.",
    rollbackPath: "No execution occurred. Discard the derived output and regenerate from validated current authority when needed.",
    proofPlan,
    status: "PROPOSED",
    evidenceIds: sortedUnique(capability?.evidenceIds ?? []),
    provenance: phase4Provenance(model, `phase4:proposal:${mutationId}`, capability?.provenance.confidence ?? 1),
  };
  return {
    mutation,
    plainLanguageAction: actionText[noDoubleWork.action],
    reasonNextSafe: noDoubleWork.reason,
    ...(request.requestedCapability.promiseId ? { affectedPromiseId: request.requestedCapability.promiseId } : {}),
    ...(capability ? { affectedCapabilityId: capability.capabilityId, affectedSubsystemId: capability.owningSubsystemId } : {}),
    ...(currentHomes[0] ? { affectedRuntimePath: currentHomes[0].locator } : {}),
    expectedFiles: safeImplementationRefs,
    expectedApis: [],
    expectedStateAuthorities: doNotTouch.stateAuthorities,
    expectedEventAuthorities: doNotTouch.eventAuthorities,
    expectedConfiguration: [],
    expectedDependencies: sortedUnique(capability?.dependencies ?? []),
    safeZone: sortedUnique(["derived Phase 4 report", ...safeImplementationRefs]),
    unsafeZone: doNotTouch.redZones,
    userVisibleEffect: "No user-facing change is executed; the output explains one evidence-bounded next safe action.",
    expectedRuntimeEffect: "None until a separately approved and executed mutation has named runtime evidence.",
    expectedEvidence: proofPlan,
    regressionScope: sortedUnique([...(capability?.dependents ?? []), ...(capability ? [capability.capabilityId] : [])]),
    rollbackRecoveryPlan: mutation.rollbackPath,
    doNotTouch,
    approvalExecutionStatus: "NON_EXECUTING_PROPOSAL",
  };
}

function derivedFindings(model: CanonicalModel, source: DerivedOutput, drift: Phase4DriftFinding[]): DerivedFinding[] {
  return drift.map((finding) => ({
    findingId: finding.driftId,
    category: finding.kind === "RUNTIME_GAP" ? "RUNTIME_GAP" : finding.kind === "EVIDENCE_DRIFT" ? "EVIDENCE_GAP" : finding.kind === "DUPLICATION_DRIFT" ? "DUPLICATE" : finding.kind === "CLAIM_DRIFT" ? "CLAIM_SAFETY" : "DRIFT",
    summary: finding.summary,
    severity: finding.severity,
    confidence: finding.confidence,
    evidenceIds: [],
    affectedEntityIds: finding.affectedEntityIds,
    rulesetVersion: PHASE4_RULESET_VERSION,
    derivedOutputId: source.derivedOutputId,
    provenance: phase4Provenance(model, `phase4:finding:${finding.driftId}`, finding.confidence),
  }));
}

export function derivePhase4Decision(model: CanonicalModel, request: Phase4EvaluationRequest): Phase4DecisionReport {
  assertValidModel(model);
  const candidates = sorted(model.capabilities.filter((capability) => matchesRequest(capability, request)), (capability) => capability.capabilityId);
  const reconciliation = reconciliationFor(model, request, candidates);
  const contradictions = contradictionsFor(model, request, reconciliation, candidates);
  const noDoubleWork = noDoubleWorkFor(reconciliation, contradictions);
  const driftFindings = driftFor(model, reconciliation, contradictions, candidates);
  const proposal = proposalFor(model, request, reconciliation, noDoubleWork);
  const inputEntityIds = sortedUnique([model.project.projectId, ...candidates.map((capability) => capability.capabilityId), ...contradictions.flatMap((item) => item.affectedEntityIds), ...driftFindings.flatMap((item) => item.affectedEntityIds)]);
  const baseOutput = createDerivedOutput(
    "DRIFT_REPORT",
    derivedOutputInputsFromModel(model, PHASE4_RULESET_VERSION),
    {
      inputEntityIds,
      evidenceIds: sortedUnique(model.evidenceRefs.map((evidence) => evidence.evidenceId)),
      ruleIds: ["phase4:reconciliation", "phase4:contradiction-gate", "phase4:no-double-work", "phase4:drift", "phase4:one-next-safe-mutation"],
      derivationSteps: ["validated-canonical-model", "stable-candidate-reconciliation", "contradiction-gate", "drift-analysis", "no-double-work-gate", "one-non-executing-proposal"],
    },
    request.generatedAt ?? PHASE4_GENERATED_AT,
    "hito-phase4",
  );
  const requestScopedOutput: DerivedOutput = {
    ...baseOutput,
    derivedOutputId: `derived_drift_report_${model.canonicalState.modelRevision}_${PHASE4_RULESET_VERSION}_${phase4RequestDiscriminator(request)}`,
  };
  const sourceOutput: DerivedOutput = { ...requestScopedOutput, findings: derivedFindings(model, requestScopedOutput, driftFindings), nextSafeMutation: proposal.mutation };
  const semantic = {
    request: { requestId: request.requestId, requestedCapability: request.requestedCapability },
    reconciliation,
    noDoubleWork,
    contradictions,
    driftFindings,
    proposal,
    source: {
      derivedOutputId: sourceOutput.derivedOutputId,
      sourceModelRevision: sourceOutput.sourceModelRevision,
      sourceHistoryHead: sourceOutput.sourceHistoryHead,
      sourceEvidenceHead: sourceOutput.sourceEvidenceHead,
      rulesetVersion: sourceOutput.rulesetVersion,
      stalenessState: sourceOutput.stalenessState,
    },
  };
  return {
    kind: "HITO_PHASE4_DECISION_REPORT",
    source: {
      modelRevision: model.canonicalState.modelRevision,
      historySequence: model.canonicalState.historyHead.sequence,
      evidenceSequence: model.canonicalState.evidenceHead.sequence,
      derivedOutput: sourceOutput,
      semanticHash: sha256Text(canonicalize(semantic)),
    },
    request: structuredClone(request),
    reconciliation,
    noDoubleWork,
    contradictions,
    driftFindings,
    proposal,
    truthBoundary: "HITO Phase 4 is deterministic derived, read-only, and non-executing intelligence over a validated controlled canonical model. It does not mutate canonical truth, execute target code, call a provider, require network access, certify arbitrary-project maturity, or authorize the proposed mutation.",
  };
}

export function evaluatePhase4DecisionStaleness(report: Phase4DecisionReport, model: CanonicalModel): StalenessState {
  return evaluateStaleness(report.source.derivedOutput, derivedOutputInputsFromModel(model, PHASE4_RULESET_VERSION));
}
