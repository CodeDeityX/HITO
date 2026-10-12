import {
  assertValidModel,
  canonicalize,
  type CanonicalModel,
  type LifecycleStatus,
} from "../contracts";
import {
  derivePhase3ProjectionBundle,
  PHASE3_RULESET_VERSION,
  type Phase3ProjectionBundle,
} from "../phase3/projection";
import {
  assertBoundedSemanticIdentity,
  canonicalSemanticSet,
  canonicalSemanticStringSet,
  canonicalSemanticValue,
  normalizeProjectRelativePath,
  sha256LengthPrefixedFrames,
  type SemanticJson,
} from "./semantic-canonicalization";

export const G8_ENGINEERING_REALITY_RULESET_VERSION = "hito-engineering-reality-derived-projection-v1-repair2" as const;
export const G8_SEMANTIC_IDENTITY_SCHEME = "hito-engineering-reality-semantic-identity-v1" as const;
export const G8_ENGINEERING_REALITY_AUTHORITY = "DERIVED / DETERMINISTIC / PROVENANCE_BOUND / READ_ONLY / NON_CANONICAL / NON_EXECUTING" as const;

export type G8SemanticComparison = "SAME" | "DIFFERENT" | "INDETERMINATE";
export type G8ContextDelta = "NONE" | "REFRESH_ONLY";
export type G8SemanticAuthorityState = "RESOLVED" | "UNKNOWN" | "STALE" | "UNAVAILABLE" | "UNAUTHENTICATED" | "CONFLICTING";
export type G8ContextFactKind =
  | "FRESHNESS"
  | "RECOLLECTION"
  | "AVAILABILITY"
  | "PROVIDER_STATE"
  | "TOOL_STATE"
  | "GIT_STATE"
  | "EDITOR_STATE"
  | "BACKUP_SYNC_STATE"
  | "PERSISTENCE_RECOVERY"
  | "EQUIVALENT_EVIDENCE_MULTIPLICITY"
  | "EXTRACTED_INTENT_CANDIDATE_PROVENANCE";

export interface G8RequiredSemanticAuthority {
  coordinateId: string;
  required: boolean;
  state: G8SemanticAuthorityState;
  acceptedSemanticIdentity?: string;
  acceptedAuthorityId?: string;
}

export interface G8ContextFact {
  kind: G8ContextFactKind;
  subjectId: string;
  state: string;
  valueIdentity?: string;
}

/** Both collections are required so C2 never fabricates authority or context applicability. */
export interface G8EngineeringRealityRequest {
  requiredAuthorities: G8RequiredSemanticAuthority[];
  contextFacts: G8ContextFact[];
}

export interface G8UnresolvedSemanticCoordinate {
  coordinateId: string;
  state: Exclude<G8SemanticAuthorityState, "RESOLVED">;
  reason: string;
}

export interface G8ZeroEffectCounters {
  canonicalWriteCount: 0;
  governedTargetMutationCount: 0;
  targetExecutionCount: 0;
  providerModelCallCount: 0;
  unauthorizedNetworkCallCount: 0;
  namespaceMigrationCount: 0;
}

export interface G8EngineeringRealityProjection {
  kind: "HITO_G8_ENGINEERING_REALITY_DERIVED_PROJECTION";
  rulesetVersion: typeof G8_ENGINEERING_REALITY_RULESET_VERSION;
  semanticIdentityScheme: typeof G8_SEMANTIC_IDENTITY_SCHEME;
  authority: typeof G8_ENGINEERING_REALITY_AUTHORITY;
  semanticRealityIdentity: string;
  contextIdentity: string;
  derivationEnvelopeIdentity: string;
  semanticMaterial: SemanticJson;
  contextMaterial: SemanticJson;
  unresolvedSemanticCoordinates: G8UnresolvedSemanticCoordinate[];
  source: {
    canonicalModelRevision: number;
    canonicalModelIntegrityHash: string;
    historyHead: CanonicalModel["canonicalState"]["historyHead"];
    evidenceHead: CanonicalModel["canonicalState"]["evidenceHead"];
    phase3RulesetVersion: typeof PHASE3_RULESET_VERSION;
    phase3PulseSemanticHash: string;
    phase3MriSemanticHash: string;
  };
  zeroEffectCounters: G8ZeroEffectCounters;
  truthBoundary: string;
  limitations: string[];
}

export interface G8EngineeringRealityComparisonResult {
  kind: "HITO_G8_ENGINEERING_REALITY_COMPARISON";
  rulesetVersion: typeof G8_ENGINEERING_REALITY_RULESET_VERSION;
  comparisonId: string;
  predecessorSemanticIdentity: string;
  successorSemanticIdentity: string;
  predecessorDerivationEnvelopeIdentity: string;
  successorDerivationEnvelopeIdentity: string;
  semanticComparison: G8SemanticComparison;
  contextDelta: G8ContextDelta;
  reasonCodes: string[];
  zeroEffectCounters: G8ZeroEffectCounters;
  truthBoundary: string;
  limitations: string[];
}

const REQUEST_KEYS = ["requiredAuthorities", "contextFacts"] as const;
const AUTHORITY_KEYS = ["coordinateId", "required", "state", "acceptedSemanticIdentity", "acceptedAuthorityId"] as const;
const CONTEXT_KEYS = ["kind", "subjectId", "state", "valueIdentity"] as const;
const AUTHORITY_STATES: readonly G8SemanticAuthorityState[] = ["RESOLVED", "UNKNOWN", "STALE", "UNAVAILABLE", "UNAUTHENTICATED", "CONFLICTING"];
const CONTEXT_KINDS: readonly G8ContextFactKind[] = ["FRESHNESS", "RECOLLECTION", "AVAILABILITY", "PROVIDER_STATE", "TOOL_STATE", "GIT_STATE", "EDITOR_STATE", "BACKUP_SYNC_STATE", "PERSISTENCE_RECOVERY", "EQUIVALENT_EVIDENCE_MULTIPLICITY", "EXTRACTED_INTENT_CANDIDATE_PROVENANCE"];

function zeroEffects(): G8ZeroEffectCounters {
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
  const unsupported = Object.keys(value).filter((key) => !allowed.includes(key)).sort();
  if (unsupported.length > 0) throw new Error(`${label} rejects unsupported fields: ${unsupported.join(", ")}`);
}

function safe(value: string, label: string): string {
  return assertBoundedSemanticIdentity(value, label);
}

function semanticStrings(values: readonly string[], label: string): string[] {
  return canonicalSemanticStringSet(values, label);
}

function semanticPath(value: string, root: string): string {
  return normalizeProjectRelativePath(value, root) ?? "MACHINE_ROOT_EXCLUDED";
}

function normalizedRequest(request: G8EngineeringRealityRequest): {
  authorities: G8RequiredSemanticAuthority[];
  contextFacts: G8ContextFact[];
} {
  if (request === null || typeof request !== "object") throw new Error("HITO G8 requires an explicit structured derivation request");
  assertExactKeys(request, REQUEST_KEYS, "HITO G8 derivation request");
  if (!Array.isArray(request.requiredAuthorities) || !Array.isArray(request.contextFacts)) {
    throw new Error("HITO G8 requires explicit requiredAuthorities and contextFacts collections");
  }

  const authorities = canonicalSemanticSet(request.requiredAuthorities.map((entry, index) => {
    if (entry === null || typeof entry !== "object") throw new Error(`HITO G8 authority[${index}] must be structured`);
    assertExactKeys(entry, AUTHORITY_KEYS, `HITO G8 authority[${index}]`);
    if (typeof entry.required !== "boolean" || !AUTHORITY_STATES.includes(entry.state)) {
      throw new Error(`HITO G8 authority[${index}] has invalid required/state semantics`);
    }
    const coordinateId = safe(entry.coordinateId, `requiredAuthorities[${index}].coordinateId`);
    if (entry.state === "RESOLVED") {
      if (entry.acceptedSemanticIdentity === undefined || entry.acceptedAuthorityId === undefined) {
        throw new Error(`HITO G8 resolved authority ${coordinateId} requires accepted semantic and authority identities`);
      }
      return {
        coordinateId,
        required: entry.required,
        state: entry.state,
        acceptedSemanticIdentity: safe(entry.acceptedSemanticIdentity, `requiredAuthorities[${index}].acceptedSemanticIdentity`),
        acceptedAuthorityId: safe(entry.acceptedAuthorityId, `requiredAuthorities[${index}].acceptedAuthorityId`),
      };
    }
    if (entry.acceptedSemanticIdentity !== undefined || entry.acceptedAuthorityId !== undefined) {
      throw new Error(`HITO G8 unresolved authority ${coordinateId} cannot carry accepted semantic authority`);
    }
    return { coordinateId, required: entry.required, state: entry.state };
  }));

  const contextFacts = canonicalSemanticSet(request.contextFacts.map((entry, index) => {
    if (entry === null || typeof entry !== "object") throw new Error(`HITO G8 contextFact[${index}] must be structured`);
    assertExactKeys(entry, CONTEXT_KEYS, `HITO G8 contextFact[${index}]`);
    if (!CONTEXT_KINDS.includes(entry.kind)) throw new Error(`HITO G8 contextFact[${index}] has an unsupported kind`);
    return {
      kind: entry.kind,
      subjectId: safe(entry.subjectId, `contextFacts[${index}].subjectId`),
      state: safe(entry.state, `contextFacts[${index}].state`),
      ...(entry.valueIdentity === undefined ? {} : { valueIdentity: safe(entry.valueIdentity, `contextFacts[${index}].valueIdentity`) }),
    };
  }));
  return { authorities, contextFacts };
}

function semanticMaterial(model: CanonicalModel, authorities: G8RequiredSemanticAuthority[]): SemanticJson {
  const root = model.project.root;
  const declaredIntent = model.intent.filter((entry) => entry.authority === "DECLARED_INTENT");
  const acceptedPromiseIds = new Set(declaredIntent.map((entry) => entry.promiseId));
  const currentRevision = model.canonicalState.modelRevision;
  const currentRuntimeHomes = model.runtimeHomes.filter((entry) => entry.effectiveFromRevision <= currentRevision && (entry.effectiveToRevision === undefined || entry.effectiveToRevision > currentRevision));
  return canonicalSemanticValue({
    identityScheme: G8_SEMANTIC_IDENTITY_SCHEME,
    project: {
      projectId: safe(model.project.projectId, "project.projectId"),
      name: model.project.name,
      projectType: model.project.projectType,
      health: model.project.health,
      releaseContract: model.releaseContract,
    },
    declaredIntent: canonicalSemanticSet(declaredIntent.map((entry) => ({
      promiseId: entry.promiseId,
      projectId: entry.projectId,
      statement: entry.statement,
      requirements: semanticStrings(entry.requirements, `intent.${entry.promiseId}.requirements`),
      constraints: semanticStrings(entry.constraints, `intent.${entry.promiseId}.constraints`),
      authority: entry.authority,
      authorityProof: entry.authorityProof === undefined ? "UNAUTHENTICATED" : {
        proofId: entry.authorityProof.proofId,
        kind: entry.authorityProof.kind,
        sourceRecordId: entry.authorityProof.sourceRecordId,
        lineageEventIds: semanticStrings(entry.authorityProof.lineageEventIds, `intent.${entry.promiseId}.authorityProof.lineageEventIds`),
      },
    }))),
    requirements: canonicalSemanticSet(model.requirements.filter((entry) => acceptedPromiseIds.has(entry.promiseId)).map((entry) => ({
      requirementId: entry.requirementId,
      promiseId: entry.promiseId,
      statement: entry.statement,
      phaseId: entry.phaseId ?? "UNBOUND",
      capabilityIds: semanticStrings(entry.capabilityIds, `requirements.${entry.requirementId}.capabilityIds`),
    }))),
    phases: canonicalSemanticSet(model.phases.map((entry) => ({
      phaseId: entry.phaseId,
      projectId: entry.projectId,
      name: entry.name,
      status: entry.status,
      capabilityIds: semanticStrings(entry.capabilityIds, `phases.${entry.phaseId}.capabilityIds`),
      entryCriteria: semanticStrings(entry.entryCriteria, `phases.${entry.phaseId}.entryCriteria`),
      exitCriteria: semanticStrings(entry.exitCriteria, `phases.${entry.phaseId}.exitCriteria`),
      lockVerdict: entry.lockVerdict ?? "ABSENT",
    }))),
    subsystems: canonicalSemanticSet(model.subsystems.map((entry) => ({
      subsystemId: entry.subsystemId,
      projectId: entry.projectId,
      name: entry.name,
      responsibility: entry.responsibility,
      capabilityIds: semanticStrings(entry.capabilityIds, `subsystems.${entry.subsystemId}.capabilityIds`),
    }))),
    capabilities: canonicalSemanticSet(model.capabilities.map((entry) => ({
      capabilityId: entry.capabilityId,
      name: entry.name,
      purpose: entry.purpose,
      questionAnswered: entry.questionAnswered,
      promiseIds: semanticStrings(entry.promiseIds, `capabilities.${entry.capabilityId}.promiseIds`),
      requirementIds: semanticStrings(entry.requirementIds, `capabilities.${entry.capabilityId}.requirementIds`),
      owningSubsystemId: entry.owningSubsystemId,
      runtimeHomeId: entry.runtimeHomeId ?? "NO_RUNTIME_HOME",
      runtimeGap: entry.runtimeGap,
      historicalRuntimeHomeIds: semanticStrings(entry.historicalRuntimeHomeIds, `capabilities.${entry.capabilityId}.historicalRuntimeHomeIds`),
      dependencies: semanticStrings(entry.dependencies, `capabilities.${entry.capabilityId}.dependencies`),
      dependents: semanticStrings(entry.dependents, `capabilities.${entry.capabilityId}.dependents`),
      lifecycleStatus: entry.lifecycleStatus,
      health: entry.health,
      verificationState: entry.verificationState,
      runtimeTruthLevel: entry.runtimeTruthLevel,
      claimBoundary: entry.claimBoundary,
      phaseId: entry.phaseId ?? "UNBOUND",
      aliases: semanticStrings(entry.aliases, `capabilities.${entry.capabilityId}.aliases`),
    }))),
    runtimeHomes: canonicalSemanticSet(currentRuntimeHomes.map((entry) => ({
      runtimeHomeId: entry.runtimeHomeId,
      capabilityId: entry.capabilityId,
      kind: entry.kind,
      locator: semanticPath(entry.locator, root),
      entryPoints: canonicalSemanticSet(entry.entryPoints.map((value) => semanticPath(value, root))),
      stateOwner: entry.stateOwner ?? "UNDECLARED",
      eventOwner: entry.eventOwner ?? "UNDECLARED",
      persistenceOwner: entry.persistenceOwner ?? "UNDECLARED",
      effectiveFromRevision: entry.effectiveFromRevision,
      status: entry.status,
    }))),
    interfaces: canonicalSemanticSet(model.interfaces.map((entry) => ({
      edgeId: entry.edgeId,
      sourceId: entry.sourceId,
      targetId: entry.targetId,
      relationship: entry.relationship,
      status: entry.status,
    }))),
    edges: canonicalSemanticSet(model.edges.map((entry) => ({
      edgeId: entry.edgeId,
      sourceId: entry.sourceId,
      targetId: entry.targetId,
      relationship: entry.relationship,
      status: entry.status,
    }))),
    supportedClaimMeaning: canonicalSemanticSet(model.claims.map((entry) => ({
      claimId: entry.claimId,
      subjectId: entry.subjectId,
      statement: entry.statement,
      claimType: entry.claimType,
      promiseId: entry.promiseId ?? "UNBOUND",
      capabilityId: entry.capabilityId ?? "UNBOUND",
      audience: entry.audience,
      environment: entry.environment,
      evidenceRequirement: entry.evidenceRequirement,
      truthBoundary: entry.truthBoundary,
      limitations: semanticStrings(entry.limitations, `claims.${entry.claimId}.limitations`),
      status: entry.status,
      requiredAction: entry.requiredAction,
    }))),
    acceptedFindingGovernance: canonicalSemanticSet(model.findingGovernance.map((entry) => ({
      findingGovernanceId: entry.findingGovernanceId,
      findingId: entry.findingId,
      decision: entry.decision,
      reason: entry.reason,
      scope: entry.scope,
      authority: entry.authority,
      effectiveRevision: entry.effectiveRevision,
    }))),
    acceptedDecisions: canonicalSemanticSet(model.decisions.map((entry) => ({
      decisionId: entry.decisionId,
      context: entry.context,
      options: semanticStrings(entry.options, `decisions.${entry.decisionId}.options`),
      selectedOutcome: entry.selectedOutcome,
      rationale: entry.rationale,
      affectedEntityIds: semanticStrings(entry.affectedEntityIds, `decisions.${entry.decisionId}.affectedEntityIds`),
      effectiveRevision: entry.effectiveRevision,
    }))),
    completedMutations: canonicalSemanticSet(model.mutations.filter((entry) => entry.status === "COMPLETED").map((entry) => ({
      mutationId: entry.mutationId,
      reason: entry.reason,
      affectedEntityIds: semanticStrings(entry.affectedEntityIds, `mutations.${entry.mutationId}.affectedEntityIds`),
      expectedEffect: entry.expectedEffect,
      proposal: entry.proposal,
      risk: entry.risk,
      rollbackPath: semanticPath(entry.rollbackPath, root),
      proofPlan: semanticStrings(entry.proofPlan, `mutations.${entry.mutationId}.proofPlan`),
      status: entry.status,
      effectiveRevision: entry.effectiveRevision ?? "UNBOUND",
    }))),
    capabilityLineage: canonicalSemanticSet(model.capabilityLineage.map((entry) => ({
      eventId: entry.eventId,
      capabilityId: entry.capabilityId,
      type: entry.type,
      fromCapabilityIds: semanticStrings(entry.fromCapabilityIds, `lineage.${entry.eventId}.fromCapabilityIds`),
      toCapabilityIds: semanticStrings(entry.toCapabilityIds, `lineage.${entry.eventId}.toCapabilityIds`),
      previousRuntimeHomeId: entry.previousRuntimeHomeId ?? "ABSENT",
      nextRuntimeHomeId: entry.nextRuntimeHomeId ?? "ABSENT",
      reason: entry.reason,
      authority: entry.authority,
      effectiveRevision: entry.effectiveRevision,
    }))),
    releaseGatePolicy: canonicalSemanticSet(model.releaseGates.map((entry) => ({
      gateId: entry.gateId,
      name: entry.name,
      criterion: entry.criterion,
      blocker: entry.blocker,
      promiseIds: semanticStrings(entry.promiseIds, `releaseGates.${entry.gateId}.promiseIds`),
    }))),
    reconciliationContradictions: {
      ambiguities: canonicalSemanticSet((model.reconciliationTrace?.ambiguities ?? []).map((entry) => ({
        kind: entry.kind,
        anchor: entry.anchor,
        candidateIds: semanticStrings(entry.candidateIds, `reconciliation.ambiguity.${entry.anchor}.candidateIds`),
        reason: entry.reason,
      }))),
      conflicts: canonicalSemanticSet((model.reconciliationTrace?.conflicts ?? []).map((entry) => ({
        kind: entry.kind,
        anchor: entry.anchor,
        candidateIds: semanticStrings(entry.candidateIds, `reconciliation.conflict.${entry.anchor}.candidateIds`),
        reason: entry.reason,
      }))),
    },
    requiredSemanticAuthorities: authorities,
  });
}

function contextMaterial(model: CanonicalModel, contextFacts: G8ContextFact[]): SemanticJson {
  const relativeImplementationPathCount = model.capabilities.flatMap((entry) => entry.implementationRefs)
    .filter((entry) => normalizeProjectRelativePath(entry, model.project.root) !== null).length;
  const excludedMachinePathCount = [
    model.project.root,
    ...model.runtimeHomes.map((entry) => entry.locator),
    ...model.capabilities.flatMap((entry) => entry.implementationRefs),
    ...model.evidenceRefs.flatMap((entry) => entry.artifactPath === undefined ? [] : [entry.artifactPath]),
  ].filter((entry) => normalizeProjectRelativePath(entry, model.project.root) === null).length;
  return canonicalSemanticValue({
    refreshBinding: {
      modelRevision: model.canonicalState.modelRevision,
      historySequence: model.canonicalState.historyHead.sequence,
      evidenceSequence: model.canonicalState.evidenceHead.sequence,
    },
    contextFacts,
    extractedIntentCandidateIds: semanticStrings(
      model.intent.filter((entry) => entry.authority === "EXTRACTED_INTENT_CANDIDATE").map((entry) => entry.promiseId),
      "extractedIntentCandidateIds",
    ),
    evidenceContext: canonicalSemanticSet(model.evidenceRefs.map((entry) => ({
      evidenceId: entry.evidenceId,
      subjectId: entry.subjectId,
      contentHash: entry.contentHash,
      verificationLevel: entry.verificationLevel,
      available: entry.available,
    }))),
    observationClasses: canonicalSemanticSet([
      model.provenance.observationClass,
      model.project.provenance.observationClass,
      ...model.capabilities.map((entry) => entry.provenance.observationClass),
      ...model.runtimeHomes.map((entry) => entry.provenance.observationClass),
    ]),
    discoveryCounts: {
      scans: model.scans.length,
      reconciliationCandidates: model.reconciliationTrace?.candidates.length ?? 0,
      derivedOutputRefs: model.derivedOutputRefs.length,
      findingRefs: model.findingRefs.length,
    },
    pathContext: {
      relativeImplementationPathCount,
      excludedMachinePathCount,
      repositoryDeclared: model.project.repository !== undefined,
    },
  });
}

function unresolvedCoordinates(model: CanonicalModel, authorities: G8RequiredSemanticAuthority[]): G8UnresolvedSemanticCoordinate[] {
  const entries: G8UnresolvedSemanticCoordinate[] = [];
  const add = (coordinateId: string, state: G8UnresolvedSemanticCoordinate["state"], reason: string): void => {
    entries.push({ coordinateId, state, reason });
  };
  if (model.project.health === "INDETERMINATE") add("project.health", "UNKNOWN", "Project health is INDETERMINATE");
  const lifecycle = (kind: string, id: string, status: LifecycleStatus): void => {
    if (status === "UNKNOWN") add(`${kind}.${id}.lifecycleStatus`, "UNKNOWN", `${kind} lifecycle authority is UNKNOWN`);
  };
  model.phases.forEach((entry) => lifecycle("phase", entry.phaseId, entry.status));
  model.capabilities.forEach((entry) => {
    lifecycle("capability", entry.capabilityId, entry.lifecycleStatus);
    if (entry.health === "INDETERMINATE") add(`capability.${entry.capabilityId}.health`, "UNKNOWN", "Capability health is INDETERMINATE");
  });
  model.runtimeHomes.forEach((entry) => lifecycle("runtimeHome", entry.runtimeHomeId, entry.status));
  [...model.interfaces, ...model.edges].forEach((entry) => lifecycle("edge", entry.edgeId, entry.status));
  for (const ambiguity of model.reconciliationTrace?.ambiguities ?? []) {
    add(`reconciliation.${ambiguity.kind}.${ambiguity.anchor}`, "UNKNOWN", ambiguity.reason);
  }
  for (const conflict of model.reconciliationTrace?.conflicts ?? []) {
    add(`reconciliation.${conflict.kind}.${conflict.anchor}`, "CONFLICTING", conflict.reason);
  }
  const declared = model.intent.filter((entry) => entry.authority === "DECLARED_INTENT");
  const extracted = model.intent.filter((entry) => entry.authority === "EXTRACTED_INTENT_CANDIDATE");
  if (declared.length === 0) {
    add("declaredIntent", extracted.length > 0 ? "UNAUTHENTICATED" : "UNKNOWN", extracted.length > 0
      ? "Extracted intent candidates cannot establish declared intent authority"
      : "No accepted declared intent authority is present");
  }
  declared.filter((entry) => entry.authorityProof === undefined).forEach((entry) => {
    add(`declaredIntent.${entry.promiseId}`, "UNAUTHENTICATED", "Declared intent lacks accepted authority proof");
  });

  const groups = new Map<string, G8RequiredSemanticAuthority[]>();
  for (const authority of authorities) groups.set(authority.coordinateId, [...(groups.get(authority.coordinateId) ?? []), authority]);
  for (const [coordinateId, group] of groups) {
    if (group.length > 1 && group.some((entry) => entry.required)) {
      add(coordinateId, "CONFLICTING", "Conflicting duplicate semantic coordinates are preserved and fail closed");
    }
    for (const entry of group) {
      if (entry.required && entry.state !== "RESOLVED") add(entry.coordinateId, entry.state, `Required semantic authority is ${entry.state}`);
    }
  }
  return canonicalSemanticSet(entries);
}

function assertPhase3Binding(model: CanonicalModel, phase3: Phase3ProjectionBundle): void {
  if (
    phase3.version !== PHASE3_RULESET_VERSION
    || phase3.pulse.source.modelRevision !== model.canonicalState.modelRevision
    || phase3.mri.source.modelRevision !== model.canonicalState.modelRevision
    || phase3.pulse.source.historySequence !== model.canonicalState.historyHead.sequence
    || phase3.mri.source.historySequence !== model.canonicalState.historyHead.sequence
    || phase3.pulse.source.evidenceSequence !== model.canonicalState.evidenceHead.sequence
    || phase3.mri.source.evidenceSequence !== model.canonicalState.evidenceHead.sequence
  ) throw new Error("HITO G8 rejects Phase-3 authority not bound to the same canonical source");
}

/** Internal composition seam: C1 supplies the exact Phase-3 output it derived in the same call. */
export function deriveG8EngineeringRealityFromSameCallPhase3(
  model: CanonicalModel,
  phase3: Phase3ProjectionBundle,
  request: G8EngineeringRealityRequest,
): G8EngineeringRealityProjection {
  assertValidModel(model);
  assertPhase3Binding(model, phase3);
  const before = canonicalize({ model, phase3, request });
  const normalized = normalizedRequest(request);
  const semantic = semanticMaterial(model, normalized.authorities);
  const context = contextMaterial(model, normalized.contextFacts);
  const unresolved = unresolvedCoordinates(model, normalized.authorities);
  const semanticHash = sha256LengthPrefixedFrames([
    { label: "semantic-identity-scheme", value: G8_SEMANTIC_IDENTITY_SCHEME },
    { label: "semantic-material", value: semantic },
  ]);
  const contextHash = sha256LengthPrefixedFrames([
    { label: "context-boundary", value: "HITO_G8_CONTEXT_ONLY_V1" },
    { label: "context-material", value: context },
  ]);
  const semanticRealityIdentity = `hito_g8_semantic_reality_${semanticHash}`;
  const contextIdentity = `hito_g8_context_${contextHash}`;
  const envelopeHash = sha256LengthPrefixedFrames([
    { label: "ruleset", value: G8_ENGINEERING_REALITY_RULESET_VERSION },
    { label: "semantic-reality-identity", value: semanticRealityIdentity },
    { label: "context-identity", value: contextIdentity },
    { label: "canonical-source", value: {
      modelRevision: model.canonicalState.modelRevision,
      modelHash: model.canonicalState.integrity.modelHash,
      historyHead: model.canonicalState.historyHead,
      evidenceHead: model.canonicalState.evidenceHead,
    } },
    { label: "phase3-source", value: {
      ruleset: phase3.version,
      pulseSemanticHash: phase3.pulse.source.semanticHash,
      mriSemanticHash: phase3.mri.source.semanticHash,
    } },
  ]);
  const result: G8EngineeringRealityProjection = {
    kind: "HITO_G8_ENGINEERING_REALITY_DERIVED_PROJECTION",
    rulesetVersion: G8_ENGINEERING_REALITY_RULESET_VERSION,
    semanticIdentityScheme: G8_SEMANTIC_IDENTITY_SCHEME,
    authority: G8_ENGINEERING_REALITY_AUTHORITY,
    semanticRealityIdentity,
    contextIdentity,
    derivationEnvelopeIdentity: `hito_g8_derivation_envelope_${envelopeHash}`,
    semanticMaterial: semantic,
    contextMaterial: context,
    unresolvedSemanticCoordinates: unresolved,
    source: {
      canonicalModelRevision: model.canonicalState.modelRevision,
      canonicalModelIntegrityHash: model.canonicalState.integrity.modelHash,
      historyHead: structuredClone(model.canonicalState.historyHead),
      evidenceHead: structuredClone(model.canonicalState.evidenceHead),
      phase3RulesetVersion: PHASE3_RULESET_VERSION,
      phase3PulseSemanticHash: phase3.pulse.source.semanticHash,
      phase3MriSemanticHash: phase3.mri.source.semanticHash,
    },
    zeroEffectCounters: zeroEffects(),
    truthBoundary: "G8 is a deterministic derived projection over validated canonical meaning plus explicit semantic-authority coordinates. It is not canonical RealityState and grants no write or execution authority.",
    limitations: [
      "Semantic identity excludes context-only freshness, recollection, availability, provider/tool/Git/editor/backup state, equivalent evidence multiplicity, persistence/recovery context, and extracted-candidate provenance.",
      "Machine roots and drive paths never enter semantic reality identity.",
      "Unresolved required semantic authority prohibits determinate comparison even when semantic hashes match.",
      "No cross-scheme compatibility, reprojection, or migration authority is implemented in C2.",
    ],
  };
  if (canonicalize({ model, phase3, request }) !== before) throw new Error("HITO G8 mutated caller or predecessor input");
  return result;
}

/** Direct G8 authority; it reuses the accepted Phase-3 derivation without copying its policy. */
export function deriveG8EngineeringReality(
  model: CanonicalModel,
  request: G8EngineeringRealityRequest,
): G8EngineeringRealityProjection {
  return deriveG8EngineeringRealityFromSameCallPhase3(model, derivePhase3ProjectionBundle(model), request);
}

export function compareG8EngineeringReality(
  predecessor: G8EngineeringRealityProjection,
  successor: G8EngineeringRealityProjection,
): G8EngineeringRealityComparisonResult {
  const reasonCodes: string[] = [];
  let semanticComparison: G8SemanticComparison;
  if (predecessor.semanticIdentityScheme !== successor.semanticIdentityScheme) {
    semanticComparison = "INDETERMINATE";
    reasonCodes.push("CROSS_SCHEME_WITHOUT_ACCEPTED_COMPATIBILITY");
  } else if (predecessor.unresolvedSemanticCoordinates.length > 0 || successor.unresolvedSemanticCoordinates.length > 0) {
    semanticComparison = "INDETERMINATE";
    reasonCodes.push("REQUIRED_SEMANTIC_COORDINATE_UNRESOLVED");
  } else if (predecessor.semanticRealityIdentity === successor.semanticRealityIdentity) {
    semanticComparison = "SAME";
    reasonCodes.push("SEMANTIC_IDENTITIES_MATCH");
  } else {
    semanticComparison = "DIFFERENT";
    reasonCodes.push("SEMANTIC_IDENTITIES_DIFFER");
  }
  const contextDelta: G8ContextDelta = predecessor.contextIdentity === successor.contextIdentity ? "NONE" : "REFRESH_ONLY";
  reasonCodes.push(contextDelta === "NONE" ? "CONTEXT_IDENTITIES_MATCH" : "CONTEXT_ONLY_DERIVATION_DELTA_PRESENT");
  const comparisonId = `hito_g8_comparison_${sha256LengthPrefixedFrames([
    { label: "ruleset", value: G8_ENGINEERING_REALITY_RULESET_VERSION },
    { label: "predecessor", value: {
      scheme: predecessor.semanticIdentityScheme,
      semantic: predecessor.semanticRealityIdentity,
      context: predecessor.contextIdentity,
      envelope: predecessor.derivationEnvelopeIdentity,
      unresolved: predecessor.unresolvedSemanticCoordinates,
    } },
    { label: "successor", value: {
      scheme: successor.semanticIdentityScheme,
      semantic: successor.semanticRealityIdentity,
      context: successor.contextIdentity,
      envelope: successor.derivationEnvelopeIdentity,
      unresolved: successor.unresolvedSemanticCoordinates,
    } },
    { label: "result", value: { semanticComparison, contextDelta } },
  ])}`;
  return {
    kind: "HITO_G8_ENGINEERING_REALITY_COMPARISON",
    rulesetVersion: G8_ENGINEERING_REALITY_RULESET_VERSION,
    comparisonId,
    predecessorSemanticIdentity: predecessor.semanticRealityIdentity,
    successorSemanticIdentity: successor.semanticRealityIdentity,
    predecessorDerivationEnvelopeIdentity: predecessor.derivationEnvelopeIdentity,
    successorDerivationEnvelopeIdentity: successor.derivationEnvelopeIdentity,
    semanticComparison,
    contextDelta,
    reasonCodes: canonicalSemanticSet(reasonCodes),
    zeroEffectCounters: zeroEffects(),
    truthBoundary: "G8 compares semantic meaning and context refresh on independent axes. REFRESH_ONLY never implies SAME, and matching hashes never override unresolved authority.",
    limitations: ["Cross-scheme results fail closed until an accepted compatibility, common reprojection, or migration authority exists."],
  };
}

