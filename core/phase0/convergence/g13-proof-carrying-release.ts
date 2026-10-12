import {
  assertValidModel,
  canonicalize,
  type CanonicalModel,
} from "../contracts";
import {
  G8_ENGINEERING_REALITY_RULESET_VERSION,
  type G8EngineeringRealityProjection,
} from "./g8-engineering-reality";
import {
  G9_TRANSITION_COMPLETION_RULESET_VERSION,
  type G9TransitionCompletionAssessment,
} from "./g9-transition-completion";
import {
  G10_SEMANTIC_HISTORY_DIFF_RULESET_VERSION,
  type G10SemanticHistoryDiffProjection,
} from "./g10-semantic-history-diff";
import {
  G11_SEMANTIC_CONFLICT_RULESET_VERSION,
  type G11SemanticConflictDetectionResult,
} from "./g11-semantic-conflict-detection";
import {
  G12_SEMANTIC_BRANCH_MERGE_RULESET_VERSION,
  type G12SemanticBranchMergeAssessment,
} from "./g12-semantic-branch-merge";
import {
  assertBoundedSemanticIdentity,
  canonicalSemanticSet,
  canonicalSemanticStringSet,
  compareSemanticCodePoints,
  sha256LengthPrefixedFrames,
} from "./semantic-canonicalization";

export const G13_PROOF_CARRYING_RELEASE_RULESET_VERSION = "hito-proof-carrying-release-v1" as const;
export const G13_PROOF_CARRYING_RELEASE_AUTHORITY = "DERIVED / READ_ONLY / NON_CANONICAL / NON_EXECUTING / ELIGIBILITY_ONLY" as const;
export const G13_CONTRACT_SHA256 = "ad7db98125cdc636dcfc0ef9b259b37aa25d54125deb9ad5517262e08ba50eca" as const;
export const G13_MODEL_SHA256 = "5626bf504457e14036ba16191f3de3068e4ea593949030901bddfa1106de8809" as const;
export const G13_CASES_SHA256 = "578573d0a1ad835d23be33480977a80c107185a834c8cc9c34fa02a63c5bdc0b" as const;
export const G13_TRACEABILITY_SHA256 = "fb853dd49fd1d1ba3fe3db43515e1ffb8f6337011a01df1eaddaf45a5fcdb279" as const;
export const G13_CONTINUITY_SHA256 = "32259af3c0349e650df503298f908fd033774a9e5c962b4faf9a7c6d668783c0" as const;
export const G13_MANIFEST_SHA256 = "e7cee322677057bcfbaad3a24f07bdf7a5fa2438ab0bc6bfe6a22c570b56a079" as const;

export const G13_PROOF_DIMENSIONS = [
  "INTEGRITY",
  "PRODUCER_AUTHENTICITY",
  "PRODUCER_AUTHORITY",
  "SUBJECT_TARGET_BINDING",
  "ENVIRONMENT_BINDING",
  "REALITY_REVISION_BINDING",
  "ATTEMPT_EFFECT_BINDING",
  "FRESHNESS_APPLICABILITY",
  "CHAIN_OF_CUSTODY",
  "REPLAY_RESISTANCE",
  "INDEPENDENCE_DIVERSITY",
  "COMPROMISE_STATUS",
  "PROOF_CLASS_COVERAGE",
  "CLAIM_SCOPE_COVERAGE",
  "CONTRADICTION_CONFLICT_STATUS",
] as const;

export type G13ProofDimension = typeof G13_PROOF_DIMENSIONS[number];
export type G13ReleaseEligibility = "ELIGIBLE_FOR_GOVERNED_RELEASE" | "BLOCKED" | "INDETERMINATE" | "NO_RELEASE_REQUIRED";
export type G13Applicability = "REQUIRED" | "NOT_REQUIRED";
export type G13ProofSetCompleteness = "COMPLETE" | "INCOMPLETE" | "UNKNOWN";
export type G13ProofState = "ESTABLISHED" | "MISSING" | "STALE" | "UNAVAILABLE" | "UNAUTHENTICATED" | "CONFLICTING" | "COMPROMISED" | "INSUFFICIENT" | "INVALID" | "UNKNOWN" | "NOT_REQUIRED";
export type G13EffectiveDimensionState = "ESTABLISHED" | "BLOCKED" | "INDETERMINATE" | "NOT_REQUIRED";

export interface G13ProofRequirement {
  dimension: G13ProofDimension;
  applicability: G13Applicability;
  acceptedEvidenceIdentities: string[];
  acceptedProofClasses: string[];
  acceptedProducerIdentities: string[];
  acceptedProducerAuthorityIdentities: string[];
}

export interface G13ProofEvidence {
  dimension: G13ProofDimension;
  state: G13ProofState;
  evidenceIdentity?: string;
  proofClass?: string;
  producerIdentity?: string;
  producerAuthorityIdentity?: string;
  projectId?: string;
  subjectId?: string;
  scopeIdentity?: string;
  targetIdentity?: string;
  environmentIdentity?: string;
  sourceRevision?: number;
  boundRealityIdentity?: string;
  dimensionBindingIdentity?: string;
  attemptIdentity?: string;
  effectIdentity?: string;
  limitations: string[];
}

export interface G13RequiredBindings {
  integrityIdentity: string;
  subjectTargetBindingIdentity: string;
  environmentBindingIdentity: string;
  realityRevisionBindingIdentity: string;
  attemptIdentity: string;
  effectIdentity: string;
  freshnessApplicabilityIdentity: string;
  chainOfCustodyIdentity: string;
  replayProtectionIdentity: string;
  independenceDiversityIdentity: string;
  compromiseStatusIdentity: string;
  claimScopeIdentity: string;
  contradictionConflictIdentity: string;
}

export interface G13ProofCarryingReleaseRequest {
  releaseId: string;
  projectId: string;
  subjectId: string;
  scopeIdentity: string;
  targetIdentity: string;
  environmentIdentity: string;
  realityRevision: number;
  semanticRealityIdentity: string;
  releaseApplicability: G13Applicability;
  proofSetCompleteness: G13ProofSetCompleteness;
  sourceApplicability: {
    g9TransitionCompletion: G13Applicability;
    g11ConflictDetection: G13Applicability;
  };
  requiredBindings?: G13RequiredBindings;
  requirements: G13ProofRequirement[];
  proofs: G13ProofEvidence[];
}

export interface G13ProofCarryingReleaseInput {
  model: CanonicalModel;
  g8Successor: G8EngineeringRealityProjection;
  g9?: G9TransitionCompletionAssessment;
  g10: G10SemanticHistoryDiffProjection;
  g11?: G11SemanticConflictDetectionResult;
  g12: G12SemanticBranchMergeAssessment;
  request: G13ProofCarryingReleaseRequest;
}

export interface G13ProofDimensionResult {
  dimension: G13ProofDimension;
  applicability: G13Applicability;
  declaredState: G13ProofState;
  effectiveState: G13EffectiveDimensionState;
  evidenceIdentity: string | null;
  proofClass: string | null;
  producerIdentity: string | null;
  reasonCodes: string[];
  limitations: string[];
}

export interface G13ZeroEffectCounters {
  canonicalWriteCount: 0;
  governedTargetMutationCount: 0;
  targetExecutionCount: 0;
  deploymentExecutionCount: 0;
  providerModelCallCount: 0;
  unauthorizedNetworkCallCount: 0;
  namespaceMigrationCount: 0;
}

export interface G13ProofCarryingReleaseAssessment {
  kind: "HITO_G13_PROOF_CARRYING_RELEASE_ASSESSMENT";
  rulesetVersion: typeof G13_PROOF_CARRYING_RELEASE_RULESET_VERSION;
  authority: typeof G13_PROOF_CARRYING_RELEASE_AUTHORITY;
  assessmentId: string;
  releaseId: string;
  releaseEligibility: G13ReleaseEligibility;
  proofDimensions: G13ProofDimensionResult[];
  sources: {
    canonicalModelRevision: number;
    canonicalModelIntegrityHash: string;
    semanticRealityIdentity: string;
    g9AssessmentId: string | null;
    g10ProjectionId: string;
    g11AssessmentId: string | null;
    g12AssessmentId: string;
  };
  semanticTruthBoundary: {
    integrityEstablished: boolean;
    integrityProvesSemanticTruth: false;
    testProofAloneSufficient: false;
    gitStateIsReleaseTruth: false;
  };
  governanceBoundary: {
    releaseEligibilityOnly: true;
    deploymentAuthority: false;
    deploymentExecuted: false;
    deploymentSucceeded: false;
    targetExecuted: false;
  };
  reasonCodes: string[];
  zeroEffectCounters: G13ZeroEffectCounters;
  truthBoundary: string;
  limitations: string[];
}

const INPUT_KEYS = ["model", "g8Successor", "g9", "g10", "g11", "g12", "request"] as const;
const REQUEST_KEYS = ["releaseId", "projectId", "subjectId", "scopeIdentity", "targetIdentity", "environmentIdentity", "realityRevision", "semanticRealityIdentity", "releaseApplicability", "proofSetCompleteness", "sourceApplicability", "requiredBindings", "requirements", "proofs"] as const;
const SOURCE_APPLICABILITY_KEYS = ["g9TransitionCompletion", "g11ConflictDetection"] as const;
const REQUIREMENT_KEYS = ["dimension", "applicability", "acceptedEvidenceIdentities", "acceptedProofClasses", "acceptedProducerIdentities", "acceptedProducerAuthorityIdentities"] as const;
const PROOF_KEYS = ["dimension", "state", "evidenceIdentity", "proofClass", "producerIdentity", "producerAuthorityIdentity", "projectId", "subjectId", "scopeIdentity", "targetIdentity", "environmentIdentity", "sourceRevision", "boundRealityIdentity", "dimensionBindingIdentity", "attemptIdentity", "effectIdentity", "limitations"] as const;
const BINDING_KEYS = ["integrityIdentity", "subjectTargetBindingIdentity", "environmentBindingIdentity", "realityRevisionBindingIdentity", "attemptIdentity", "effectIdentity", "freshnessApplicabilityIdentity", "chainOfCustodyIdentity", "replayProtectionIdentity", "independenceDiversityIdentity", "compromiseStatusIdentity", "claimScopeIdentity", "contradictionConflictIdentity"] as const;
const APPLICABILITIES: readonly G13Applicability[] = ["REQUIRED", "NOT_REQUIRED"];
const PROOF_STATES: readonly G13ProofState[] = ["ESTABLISHED", "MISSING", "STALE", "UNAVAILABLE", "UNAUTHENTICATED", "CONFLICTING", "COMPROMISED", "INSUFFICIENT", "INVALID", "UNKNOWN", "NOT_REQUIRED"];
const HARD_PROOF_STATES = new Set<G13ProofState>(["CONFLICTING", "COMPROMISED", "INVALID"]);
const EPISTEMIC_PROOF_STATES = new Set<G13ProofState>(["MISSING", "STALE", "UNAVAILABLE", "UNAUTHENTICATED", "INSUFFICIENT", "UNKNOWN"]);

function zeroEffects(): G13ZeroEffectCounters {
  return {
    canonicalWriteCount: 0,
    governedTargetMutationCount: 0,
    targetExecutionCount: 0,
    deploymentExecutionCount: 0,
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

function safeOptional(value: string | undefined, label: string): string | undefined {
  return value === undefined ? undefined : safe(value, label);
}

function assertApplicability(value: unknown, label: string): asserts value is G13Applicability {
  if (!APPLICABILITIES.includes(value as G13Applicability)) throw new Error(`HITO G13 requires explicit ${label} applicability`);
}

function assertAllDimensions<T extends { dimension: G13ProofDimension }>(entries: T[], label: string): void {
  if (entries.length !== G13_PROOF_DIMENSIONS.length) throw new Error(`HITO G13 requires exactly 15 ${label}`);
  const seen = new Set(entries.map((entry) => entry.dimension));
  if (seen.size !== G13_PROOF_DIMENSIONS.length || G13_PROOF_DIMENSIONS.some((dimension) => !seen.has(dimension))) {
    throw new Error(`HITO G13 requires each accepted proof dimension exactly once in ${label}`);
  }
}

function normalizedIdentitySet(values: string[], label: string, required: boolean): string[] {
  if (!Array.isArray(values)) throw new Error(`HITO G13 requires an explicit ${label} collection`);
  const normalized = canonicalSemanticStringSet(values, label);
  if (required && normalized.length === 0) throw new Error(`HITO G13 requires nonempty ${label}`);
  return normalized;
}

function normalizedRequirement(requirement: G13ProofRequirement, index: number): G13ProofRequirement {
  if (requirement === null || typeof requirement !== "object") throw new Error(`HITO G13 requirement[${index}] must be structured`);
  assertExactKeys(requirement, REQUIREMENT_KEYS, `HITO G13 requirement[${index}]`);
  if (!G13_PROOF_DIMENSIONS.includes(requirement.dimension)) throw new Error(`HITO G13 requirement[${index}] dimension is invalid`);
  assertApplicability(requirement.applicability, `requirement[${index}]`);
  const required = requirement.applicability === "REQUIRED";
  return {
    dimension: requirement.dimension,
    applicability: requirement.applicability,
    acceptedEvidenceIdentities: normalizedIdentitySet(requirement.acceptedEvidenceIdentities, `requirements[${index}].acceptedEvidenceIdentities`, required),
    acceptedProofClasses: normalizedIdentitySet(requirement.acceptedProofClasses, `requirements[${index}].acceptedProofClasses`, required),
    acceptedProducerIdentities: normalizedIdentitySet(requirement.acceptedProducerIdentities, `requirements[${index}].acceptedProducerIdentities`, required),
    acceptedProducerAuthorityIdentities: normalizedIdentitySet(requirement.acceptedProducerAuthorityIdentities, `requirements[${index}].acceptedProducerAuthorityIdentities`, required),
  };
}

function normalizedProof(proof: G13ProofEvidence, index: number): G13ProofEvidence {
  if (proof === null || typeof proof !== "object") throw new Error(`HITO G13 proof[${index}] must be structured`);
  assertExactKeys(proof, PROOF_KEYS, `HITO G13 proof[${index}]`);
  if (!G13_PROOF_DIMENSIONS.includes(proof.dimension)) throw new Error(`HITO G13 proof[${index}] dimension is invalid`);
  if (!PROOF_STATES.includes(proof.state)) throw new Error(`HITO G13 proof[${index}] state is invalid`);
  if (!Array.isArray(proof.limitations)) throw new Error(`HITO G13 proof[${index}] requires explicit limitations`);
  if (proof.sourceRevision !== undefined && (!Number.isSafeInteger(proof.sourceRevision) || proof.sourceRevision < 0)) {
    throw new Error(`HITO G13 proof[${index}] source revision is invalid`);
  }
  return {
    dimension: proof.dimension,
    state: proof.state,
    ...(safeOptional(proof.evidenceIdentity, `proofs[${index}].evidenceIdentity`) === undefined ? {} : { evidenceIdentity: safe(proof.evidenceIdentity as string, `proofs[${index}].evidenceIdentity`) }),
    ...(safeOptional(proof.proofClass, `proofs[${index}].proofClass`) === undefined ? {} : { proofClass: safe(proof.proofClass as string, `proofs[${index}].proofClass`) }),
    ...(safeOptional(proof.producerIdentity, `proofs[${index}].producerIdentity`) === undefined ? {} : { producerIdentity: safe(proof.producerIdentity as string, `proofs[${index}].producerIdentity`) }),
    ...(safeOptional(proof.producerAuthorityIdentity, `proofs[${index}].producerAuthorityIdentity`) === undefined ? {} : { producerAuthorityIdentity: safe(proof.producerAuthorityIdentity as string, `proofs[${index}].producerAuthorityIdentity`) }),
    ...(safeOptional(proof.projectId, `proofs[${index}].projectId`) === undefined ? {} : { projectId: safe(proof.projectId as string, `proofs[${index}].projectId`) }),
    ...(safeOptional(proof.subjectId, `proofs[${index}].subjectId`) === undefined ? {} : { subjectId: safe(proof.subjectId as string, `proofs[${index}].subjectId`) }),
    ...(safeOptional(proof.scopeIdentity, `proofs[${index}].scopeIdentity`) === undefined ? {} : { scopeIdentity: safe(proof.scopeIdentity as string, `proofs[${index}].scopeIdentity`) }),
    ...(safeOptional(proof.targetIdentity, `proofs[${index}].targetIdentity`) === undefined ? {} : { targetIdentity: safe(proof.targetIdentity as string, `proofs[${index}].targetIdentity`) }),
    ...(safeOptional(proof.environmentIdentity, `proofs[${index}].environmentIdentity`) === undefined ? {} : { environmentIdentity: safe(proof.environmentIdentity as string, `proofs[${index}].environmentIdentity`) }),
    ...(proof.sourceRevision === undefined ? {} : { sourceRevision: proof.sourceRevision }),
    ...(safeOptional(proof.boundRealityIdentity, `proofs[${index}].boundRealityIdentity`) === undefined ? {} : { boundRealityIdentity: safe(proof.boundRealityIdentity as string, `proofs[${index}].boundRealityIdentity`) }),
    ...(safeOptional(proof.dimensionBindingIdentity, `proofs[${index}].dimensionBindingIdentity`) === undefined ? {} : { dimensionBindingIdentity: safe(proof.dimensionBindingIdentity as string, `proofs[${index}].dimensionBindingIdentity`) }),
    ...(safeOptional(proof.attemptIdentity, `proofs[${index}].attemptIdentity`) === undefined ? {} : { attemptIdentity: safe(proof.attemptIdentity as string, `proofs[${index}].attemptIdentity`) }),
    ...(safeOptional(proof.effectIdentity, `proofs[${index}].effectIdentity`) === undefined ? {} : { effectIdentity: safe(proof.effectIdentity as string, `proofs[${index}].effectIdentity`) }),
    limitations: canonicalSemanticStringSet(proof.limitations, `proofs[${index}].limitations`),
  };
}

function normalizedBindings(bindings: G13RequiredBindings | undefined, required: boolean): G13RequiredBindings | undefined {
  if (bindings === undefined) {
    if (required) throw new Error("HITO G13 required release requires explicit proof-binding identities");
    return undefined;
  }
  if (bindings === null || typeof bindings !== "object") throw new Error("HITO G13 proof bindings must be structured");
  assertExactKeys(bindings, BINDING_KEYS, "HITO G13 proof bindings");
  return Object.fromEntries(BINDING_KEYS.map((key) => [key, safe(bindings[key], `requiredBindings.${key}`)])) as unknown as G13RequiredBindings;
}

function normalizedRequest(request: G13ProofCarryingReleaseRequest): G13ProofCarryingReleaseRequest {
  if (request === null || typeof request !== "object") throw new Error("HITO G13 requires an explicit structured release request");
  assertExactKeys(request, REQUEST_KEYS, "HITO G13 release request");
  assertApplicability(request.releaseApplicability, "release");
  if (!["COMPLETE", "INCOMPLETE", "UNKNOWN"].includes(request.proofSetCompleteness)) {
    throw new Error("HITO G13 requires explicit proof-set completeness");
  }
  if (request.sourceApplicability === null || typeof request.sourceApplicability !== "object") {
    throw new Error("HITO G13 requires explicit source applicability");
  }
  assertExactKeys(request.sourceApplicability, SOURCE_APPLICABILITY_KEYS, "HITO G13 source applicability");
  assertApplicability(request.sourceApplicability.g9TransitionCompletion, "G9 transition-completion");
  assertApplicability(request.sourceApplicability.g11ConflictDetection, "G11 conflict-detection");
  if (!Number.isSafeInteger(request.realityRevision) || request.realityRevision < 0) throw new Error("HITO G13 reality revision is invalid");
  if (!Array.isArray(request.requirements) || !Array.isArray(request.proofs)) throw new Error("HITO G13 requires explicit requirement and proof collections");
  const requirements = request.requirements.map(normalizedRequirement);
  const proofs = request.proofs.map(normalizedProof);
  assertAllDimensions(requirements, "proof requirements");
  assertAllDimensions(proofs, "proof entries");
  const order = new Map(G13_PROOF_DIMENSIONS.map((dimension, index) => [dimension, index]));
  requirements.sort((left, right) => (order.get(left.dimension) as number) - (order.get(right.dimension) as number));
  proofs.sort((left, right) => (order.get(left.dimension) as number) - (order.get(right.dimension) as number));
  return {
    releaseId: safe(request.releaseId, "request.releaseId"),
    projectId: safe(request.projectId, "request.projectId"),
    subjectId: safe(request.subjectId, "request.subjectId"),
    scopeIdentity: safe(request.scopeIdentity, "request.scopeIdentity"),
    targetIdentity: safe(request.targetIdentity, "request.targetIdentity"),
    environmentIdentity: safe(request.environmentIdentity, "request.environmentIdentity"),
    realityRevision: request.realityRevision,
    semanticRealityIdentity: safe(request.semanticRealityIdentity, "request.semanticRealityIdentity"),
    releaseApplicability: request.releaseApplicability,
    proofSetCompleteness: request.proofSetCompleteness,
    sourceApplicability: { ...request.sourceApplicability },
    ...(normalizedBindings(request.requiredBindings, request.releaseApplicability === "REQUIRED") === undefined
      ? {}
      : { requiredBindings: normalizedBindings(request.requiredBindings, true) as G13RequiredBindings }),
    requirements,
    proofs,
  };
}

function subjectExists(model: CanonicalModel, subjectId: string): boolean {
  return subjectId === model.project.projectId
    || model.capabilities.some((entry) => entry.capabilityId === subjectId)
    || model.subsystems.some((entry) => entry.subsystemId === subjectId)
    || model.claims.some((entry) => entry.claimId === subjectId);
}

function validateSources(input: G13ProofCarryingReleaseInput, reasons: string[]): void {
  if (
    input.g8Successor.rulesetVersion !== G8_ENGINEERING_REALITY_RULESET_VERSION
    || input.g8Successor.source.canonicalModelRevision !== input.model.canonicalState.modelRevision
    || input.g8Successor.source.canonicalModelIntegrityHash !== input.model.canonicalState.integrity.modelHash
  ) reasons.push("G8_RELEASE_REALITY_AUTHORITY_MISMATCH");
  if (
    input.g10.rulesetVersion !== G10_SEMANTIC_HISTORY_DIFF_RULESET_VERSION
    || input.g10.source.successor.modelRevision !== input.model.canonicalState.modelRevision
    || input.g10.source.successor.modelIntegrityHash !== input.model.canonicalState.integrity.modelHash
    || input.g10.source.successor.semanticRealityIdentity !== input.g8Successor.semanticRealityIdentity
  ) reasons.push("G10_RELEASE_HISTORY_AUTHORITY_MISMATCH");
  if (input.g9 !== undefined && (
    input.g9.rulesetVersion !== G9_TRANSITION_COMPLETION_RULESET_VERSION
    || input.g9.assessmentId !== input.g10.source.g9AssessmentId
    || input.g9.successorSemanticIdentity !== input.g8Successor.semanticRealityIdentity
  )) reasons.push("G9_RELEASE_COMPLETION_AUTHORITY_MISMATCH");
  if (input.g11 !== undefined && (
    input.g11.rulesetVersion !== G11_SEMANTIC_CONFLICT_RULESET_VERSION
    || input.g11.sources.canonicalModelRevision !== input.model.canonicalState.modelRevision
    || input.g11.sources.canonicalModelIntegrityHash !== input.model.canonicalState.integrity.modelHash
    || input.g11.sources.g8SemanticRealityIdentity !== input.g8Successor.semanticRealityIdentity
    || input.g11.sources.g10ProjectionId !== input.g10.projectionId
    || input.g11.sources.g9AssessmentId !== (input.g9?.assessmentId ?? null)
  )) reasons.push("G11_RELEASE_CONFLICT_AUTHORITY_MISMATCH");
  if (
    input.g12.rulesetVersion !== G12_SEMANTIC_BRANCH_MERGE_RULESET_VERSION
    || input.g12.sources.canonicalModelRevision !== input.model.canonicalState.modelRevision
    || input.g12.sources.canonicalModelIntegrityHash !== input.model.canonicalState.integrity.modelHash
    || input.g12.sources.successorSemanticRealityIdentity !== input.g8Successor.semanticRealityIdentity
    || input.g12.sources.g10ProjectionId !== input.g10.projectionId
    || input.g12.sources.g11AssessmentId !== (input.g11?.assessmentId ?? null)
    || input.g12.sources.g9AssessmentId !== (input.g9?.assessmentId ?? null)
  ) reasons.push("G12_RELEASE_BRANCH_MERGE_AUTHORITY_MISMATCH");
}

function expectedDimensionBinding(
  dimension: G13ProofDimension,
  request: G13ProofCarryingReleaseRequest,
  proof: G13ProofEvidence,
): string {
  const bindings = request.requiredBindings as G13RequiredBindings;
  switch (dimension) {
    case "INTEGRITY": return bindings.integrityIdentity;
    case "PRODUCER_AUTHENTICITY": return proof.producerIdentity ?? "MISSING";
    case "PRODUCER_AUTHORITY": return proof.producerAuthorityIdentity ?? "MISSING";
    case "SUBJECT_TARGET_BINDING": return bindings.subjectTargetBindingIdentity;
    case "ENVIRONMENT_BINDING": return bindings.environmentBindingIdentity;
    case "REALITY_REVISION_BINDING": return bindings.realityRevisionBindingIdentity;
    case "ATTEMPT_EFFECT_BINDING": return `${bindings.attemptIdentity}:${bindings.effectIdentity}`;
    case "FRESHNESS_APPLICABILITY": return bindings.freshnessApplicabilityIdentity;
    case "CHAIN_OF_CUSTODY": return bindings.chainOfCustodyIdentity;
    case "REPLAY_RESISTANCE": return bindings.replayProtectionIdentity;
    case "INDEPENDENCE_DIVERSITY": return bindings.independenceDiversityIdentity;
    case "COMPROMISE_STATUS": return bindings.compromiseStatusIdentity;
    case "PROOF_CLASS_COVERAGE": return proof.proofClass ?? "MISSING";
    case "CLAIM_SCOPE_COVERAGE": return bindings.claimScopeIdentity;
    case "CONTRADICTION_CONFLICT_STATUS": return bindings.contradictionConflictIdentity;
  }
}

function establishedProofIssues(
  requirement: G13ProofRequirement,
  proof: G13ProofEvidence,
  request: G13ProofCarryingReleaseRequest,
): string[] {
  const issues: string[] = [];
  const requiredFields = [proof.evidenceIdentity, proof.proofClass, proof.producerIdentity, proof.producerAuthorityIdentity, proof.projectId, proof.subjectId, proof.scopeIdentity, proof.targetIdentity, proof.environmentIdentity, proof.sourceRevision, proof.boundRealityIdentity, proof.dimensionBindingIdentity];
  if (requiredFields.some((value) => value === undefined)) return [`${proof.dimension}_PROOF_BINDING_INCOMPLETE`];
  if (!requirement.acceptedEvidenceIdentities.includes(proof.evidenceIdentity as string)) issues.push(`${proof.dimension}_EVIDENCE_IDENTITY_REJECTED`);
  if (!requirement.acceptedProofClasses.includes(proof.proofClass as string)) issues.push(`${proof.dimension}_PROOF_CLASS_REJECTED`);
  if (!requirement.acceptedProducerIdentities.includes(proof.producerIdentity as string)) issues.push(`${proof.dimension}_PRODUCER_IDENTITY_REJECTED`);
  if (!requirement.acceptedProducerAuthorityIdentities.includes(proof.producerAuthorityIdentity as string)) issues.push(`${proof.dimension}_PRODUCER_AUTHORITY_REJECTED`);
  if (proof.projectId !== request.projectId) issues.push(`${proof.dimension}_PROJECT_BINDING_MISMATCH`);
  if (proof.subjectId !== request.subjectId) issues.push(`${proof.dimension}_SUBJECT_BINDING_MISMATCH`);
  if (proof.scopeIdentity !== request.scopeIdentity) issues.push(`${proof.dimension}_SCOPE_BINDING_MISMATCH`);
  if (proof.targetIdentity !== request.targetIdentity) issues.push(`${proof.dimension}_TARGET_BINDING_MISMATCH`);
  if (proof.environmentIdentity !== request.environmentIdentity) issues.push(`${proof.dimension}_ENVIRONMENT_BINDING_MISMATCH`);
  if (proof.sourceRevision !== request.realityRevision) issues.push(`${proof.dimension}_REALITY_REVISION_BINDING_MISMATCH`);
  if (proof.boundRealityIdentity !== request.semanticRealityIdentity) issues.push(`${proof.dimension}_REALITY_IDENTITY_BINDING_MISMATCH`);
  if (proof.dimensionBindingIdentity !== expectedDimensionBinding(proof.dimension, request, proof)) {
    issues.push(`${proof.dimension}_DIMENSION_BINDING_MISMATCH`);
  }
  if (proof.dimension === "ATTEMPT_EFFECT_BINDING" && (
    proof.attemptIdentity !== request.requiredBindings?.attemptIdentity
    || proof.effectIdentity !== request.requiredBindings?.effectIdentity
  )) issues.push("ATTEMPT_EFFECT_IDENTITY_MISMATCH");
  return issues;
}

function dimensionResult(
  requirement: G13ProofRequirement,
  proof: G13ProofEvidence,
  request: G13ProofCarryingReleaseRequest,
): G13ProofDimensionResult {
  const reasons: string[] = [];
  let effectiveState: G13EffectiveDimensionState;
  if (request.releaseApplicability === "NOT_REQUIRED") {
    if (requirement.applicability === "NOT_REQUIRED" && proof.state === "NOT_REQUIRED") {
      effectiveState = "NOT_REQUIRED";
      reasons.push("DIMENSION_EXPLICITLY_NOT_REQUIRED");
    } else {
      effectiveState = "BLOCKED";
      reasons.push("NO_RELEASE_REQUIRED_DIMENSION_CONTRADICTION");
    }
  } else if (requirement.applicability !== "REQUIRED" || proof.state === "NOT_REQUIRED") {
    effectiveState = "BLOCKED";
    reasons.push("REQUIRED_RELEASE_DIMENSION_NOT_REQUIRED");
  } else if (HARD_PROOF_STATES.has(proof.state)) {
    effectiveState = "BLOCKED";
    reasons.push(`REQUIRED_PROOF_${proof.state}`);
  } else if (EPISTEMIC_PROOF_STATES.has(proof.state)) {
    effectiveState = "INDETERMINATE";
    reasons.push(`REQUIRED_PROOF_${proof.state}`);
  } else {
    const issues = establishedProofIssues(requirement, proof, request);
    effectiveState = issues.length === 0 ? "ESTABLISHED" : "BLOCKED";
    reasons.push(...(issues.length === 0 ? ["REQUIRED_PROOF_ESTABLISHED_AND_BOUND"] : issues));
  }
  return {
    dimension: proof.dimension,
    applicability: requirement.applicability,
    declaredState: proof.state,
    effectiveState,
    evidenceIdentity: proof.evidenceIdentity ?? null,
    proofClass: proof.proofClass ?? null,
    producerIdentity: proof.producerIdentity ?? null,
    reasonCodes: canonicalSemanticSet(reasons),
    limitations: structuredClone(proof.limitations),
  };
}

/**
 * Assesses proof-carrying release eligibility. It does not authorize, execute,
 * or report deployment, and it never treats integrity alone as semantic truth.
 */
export function assessG13ProofCarryingRelease(
  input: G13ProofCarryingReleaseInput,
): G13ProofCarryingReleaseAssessment {
  if (input === null || typeof input !== "object") throw new Error("HITO G13 requires a structured release input");
  assertExactKeys(input, INPUT_KEYS, "HITO G13 release input");
  assertValidModel(input.model);
  const before = canonicalize(input);
  const request = normalizedRequest(input.request);
  const reasonCodes: string[] = [];
  validateSources(input, reasonCodes);

  if (request.projectId !== input.model.project.projectId) reasonCodes.push("REQUEST_PROJECT_CANONICAL_BINDING_MISMATCH");
  if (!subjectExists(input.model, request.subjectId)) reasonCodes.push("REQUEST_SUBJECT_CANONICAL_BINDING_MISMATCH");
  if (request.realityRevision !== input.model.canonicalState.modelRevision) reasonCodes.push("REQUEST_REALITY_REVISION_BINDING_MISMATCH");
  if (request.semanticRealityIdentity !== input.g8Successor.semanticRealityIdentity) reasonCodes.push("REQUEST_SEMANTIC_REALITY_BINDING_MISMATCH");
  if (request.proofSetCompleteness !== "COMPLETE" && request.releaseApplicability === "REQUIRED") {
    reasonCodes.push(`PROOF_SET_${request.proofSetCompleteness}`);
  }
  if (request.sourceApplicability.g9TransitionCompletion === "REQUIRED" && input.g9 === undefined) reasonCodes.push("G9_COMPLETION_REQUIRED_BUT_UNAVAILABLE");
  if (request.sourceApplicability.g11ConflictDetection === "REQUIRED" && input.g11 === undefined) reasonCodes.push("G11_CONFLICT_REQUIRED_BUT_UNAVAILABLE");
  if (input.g9 !== undefined) {
    if (input.g9.completionAssessment === "INDETERMINATE" || ["IN_PROGRESS", "INDETERMINATE"].includes(input.g9.recoveryAssessment)) {
      reasonCodes.push("G9_COMPLETION_UNRESOLVED");
    } else if (input.g9.completionAssessment !== "COMPLETE" || input.g9.transitionDisposition !== "SUCCEEDED") {
      reasonCodes.push("G9_COMPLETION_DOES_NOT_ESTABLISH_SUCCESSFUL_TRANSITION");
    }
  }
  if (input.g11?.conflictAssessment === "CONFLICT_DETECTED") reasonCodes.push("G11_CONFLICT_BLOCKS_RELEASE");
  if (input.g11?.conflictAssessment === "INDETERMINATE") reasonCodes.push("G11_CONFLICT_UNRESOLVED");
  if (input.g12.mergeEligibility === "ELIGIBLE_FOR_GOVERNED_MERGE") reasonCodes.push("UNMERGED_G12_CANDIDATE_CANNOT_SUPPORT_RELEASE");
  if (input.g12.mergeEligibility === "BLOCKED") reasonCodes.push("G12_MERGE_ASSESSMENT_BLOCKS_RELEASE");
  if (input.g12.mergeEligibility === "INDETERMINATE") reasonCodes.push("G12_MERGE_ASSESSMENT_UNRESOLVED");

  const requirementByDimension = new Map(request.requirements.map((entry) => [entry.dimension, entry]));
  const proofByDimension = new Map(request.proofs.map((entry) => [entry.dimension, entry]));
  const proofDimensions = G13_PROOF_DIMENSIONS.map((dimension) => dimensionResult(
    requirementByDimension.get(dimension) as G13ProofRequirement,
    proofByDimension.get(dimension) as G13ProofEvidence,
    request,
  ));
  reasonCodes.push(...proofDimensions.flatMap((entry) => entry.reasonCodes));

  const establishedClasses = canonicalSemanticStringSet(proofDimensions.flatMap((entry) => (
    entry.effectiveState === "ESTABLISHED" && entry.proofClass !== null ? [entry.proofClass] : []
  )), "establishedProofClasses");
  const testOnly = request.releaseApplicability === "REQUIRED"
    && establishedClasses.length > 0
    && establishedClasses.every((value) => /^TEST(?:$|[:/_ -])/i.test(value));
  if (testOnly) reasonCodes.push("TEST_PROOF_ALONE_CANNOT_ESTABLISH_RELEASE");

  const hardBlocked = reasonCodes.some((code) => (
    code.includes("MISMATCH")
    || code.includes("REJECTED")
    || code.includes("BLOCKS_RELEASE")
    || code === "UNMERGED_G12_CANDIDATE_CANNOT_SUPPORT_RELEASE"
    || code === "G9_COMPLETION_DOES_NOT_ESTABLISH_SUCCESSFUL_TRANSITION"
    || code === "TEST_PROOF_ALONE_CANNOT_ESTABLISH_RELEASE"
    || code === "REQUIRED_RELEASE_DIMENSION_NOT_REQUIRED"
    || code === "NO_RELEASE_REQUIRED_DIMENSION_CONTRADICTION"
    || code.startsWith("REQUIRED_PROOF_CONFLICTING")
    || code.startsWith("REQUIRED_PROOF_COMPROMISED")
    || code.startsWith("REQUIRED_PROOF_INVALID")
    || code.endsWith("PROOF_BINDING_INCOMPLETE")
  )) || proofDimensions.some((entry) => entry.effectiveState === "BLOCKED");
  const unresolved = reasonCodes.some((code) => (
    code.includes("UNRESOLVED")
    || code.includes("UNAVAILABLE")
    || code.startsWith("PROOF_SET_")
    || code.startsWith("REQUIRED_PROOF_MISSING")
    || code.startsWith("REQUIRED_PROOF_STALE")
    || code.startsWith("REQUIRED_PROOF_UNAUTHENTICATED")
    || code.startsWith("REQUIRED_PROOF_INSUFFICIENT")
    || code.startsWith("REQUIRED_PROOF_UNKNOWN")
  )) || proofDimensions.some((entry) => entry.effectiveState === "INDETERMINATE");

  let releaseEligibility: G13ReleaseEligibility;
  if (hardBlocked) {
    releaseEligibility = "BLOCKED";
  } else if (unresolved) {
    releaseEligibility = "INDETERMINATE";
  } else if (request.releaseApplicability === "NOT_REQUIRED") {
    releaseEligibility = "NO_RELEASE_REQUIRED";
    reasonCodes.push("RELEASE_EXPLICITLY_NOT_REQUIRED");
  } else {
    releaseEligibility = "ELIGIBLE_FOR_GOVERNED_RELEASE";
    reasonCodes.push("ALL_FIFTEEN_REQUIRED_PROOF_DIMENSIONS_ESTABLISHED_AND_BOUND");
  }

  const sources = {
    canonicalModelRevision: input.model.canonicalState.modelRevision,
    canonicalModelIntegrityHash: input.model.canonicalState.integrity.modelHash,
    semanticRealityIdentity: input.g8Successor.semanticRealityIdentity,
    g9AssessmentId: input.g9?.assessmentId ?? null,
    g10ProjectionId: input.g10.projectionId,
    g11AssessmentId: input.g11?.assessmentId ?? null,
    g12AssessmentId: input.g12.assessmentId,
  };
  const finalReasons = canonicalSemanticSet(reasonCodes);
  const assessmentId = `hito_g13_release_${sha256LengthPrefixedFrames([
    { label: "ruleset", value: G13_PROOF_CARRYING_RELEASE_RULESET_VERSION },
    { label: "request", value: request },
    { label: "sources", value: sources },
    { label: "dimensions", value: proofDimensions },
    { label: "assessment", value: { releaseEligibility, finalReasons } },
  ])}`;
  const integrityEstablished = proofDimensions.find((entry) => entry.dimension === "INTEGRITY")?.effectiveState === "ESTABLISHED";

  const result: G13ProofCarryingReleaseAssessment = {
    kind: "HITO_G13_PROOF_CARRYING_RELEASE_ASSESSMENT",
    rulesetVersion: G13_PROOF_CARRYING_RELEASE_RULESET_VERSION,
    authority: G13_PROOF_CARRYING_RELEASE_AUTHORITY,
    assessmentId,
    releaseId: request.releaseId,
    releaseEligibility,
    proofDimensions,
    sources,
    semanticTruthBoundary: {
      integrityEstablished,
      integrityProvesSemanticTruth: false,
      testProofAloneSufficient: false,
      gitStateIsReleaseTruth: false,
    },
    governanceBoundary: {
      releaseEligibilityOnly: true,
      deploymentAuthority: false,
      deploymentExecuted: false,
      deploymentSucceeded: false,
      targetExecuted: false,
    },
    reasonCodes: finalReasons,
    zeroEffectCounters: zeroEffects(),
    truthBoundary: "G13 derives bounded proof-carrying release eligibility across all 15 accepted dimensions. Eligibility is neither deployment authorization, deployment execution, nor deployment success; integrity alone is not semantic truth.",
    limitations: [
      "Every required proof must be explicitly applicable, established, accepted, and bound to producer, project, subject, scope, target, environment, canonical revision, and G8 reality.",
      "Missing, stale, unavailable, unauthenticated, unknown, or insufficient evidence remains epistemically indeterminate; conflicting, compromised, invalid, rejected, or misbound evidence blocks.",
      "A valid integrity identity or passing TEST proof alone is insufficient release proof, and Git state is not release truth.",
      "G12 merge eligibility is candidate-only; an unmerged candidate cannot support release reality and any actual transition remains owned by G9 completion assessment.",
      "No canonical write, target execution, deployment authority, deployment execution, provider/model call, network call, or namespace migration is present.",
      "Stronger evidence-adequacy, territory, genesis-trust, shadow-topology, semantic-camouflage, and TOCTOU qualification remain outside this accepted C4 contract.",
    ],
  };
  if (canonicalize(input) !== before) throw new Error("HITO G13 mutated caller or canonical authority input");
  return result;
}
