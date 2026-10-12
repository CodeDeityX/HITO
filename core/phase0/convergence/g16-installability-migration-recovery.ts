import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import {
  assertValidModel,
  canonicalize,
  classifyPersistenceState,
  persistencePaths,
  prepareCanonicalRevision,
  readCanonicalRevisionValidated,
  recoverStagedRevision,
  sha256Text,
  stageCanonicalRevision,
  type CanonicalModel,
  type CommitFailpoint,
  type DurabilityRole,
  type HistoryEvent,
  type PersistenceSnapshot,
  type RecoveryResult,
  type TransactionState,
} from "../contracts";
import type {
  Phase1InventoryClassification,
  Phase1InventoryEntry,
  Phase1ManifestObservation,
  Phase1ScanResult,
} from "../phase1/scanner";
import {
  phase2ObservationFingerprint,
  reconcilePhase2Snapshot,
} from "../phase2/reconciler";
import type { HitoC6CompositionSnapshot } from "./runtime";
import { compareSemanticCodePoints, sha256LengthPrefixedFrames } from "./semantic-canonicalization";

export const G16_INSTALLABILITY_MIGRATION_RECOVERY_RULESET_VERSION = "hito-installability-migration-recovery-v1" as const;
export const G16_INSTALLABILITY_MIGRATION_RECOVERY_AUTHORITY = "DERIVED / DETERMINISTIC / BOUNDED OPERATIONAL ASSESSMENT / NON_ONTOLOGY / NONEXECUTING" as const;
export const G16_ENGINE_PROTOCOL_IDENTITY = "hito-engine-protocol-c7-v1" as const;
export const G16_SUPPORTED_CANONICAL_SCHEMA_VERSION = "0.1.0" as const;
export const G16_CONTRACT_SHA256 = "6cad5aa8705359e73f4ac7ea802be246bdc9df6a885086642a6eeb780d28063d" as const;
export const G16_MODEL_SHA256 = "b091b3750fb023eb7af4c20887b7e475d059e126080883ff88b638d03fc59f61" as const;
export const G16_CASES_SHA256 = "c168a8bb3d9117ce31b0aa5f0267c6e7c04a3f6820f3064fcf35f7166bc1b60a" as const;
export const G16_TRACEABILITY_SHA256 = "6bb40b3babd8a079e26adefc13e9e7d5424e25c7b6492ebb70c1f27ef36bb18c" as const;
export const G16_CONTINUITY_SHA256 = "1fbf7866c2abf0c53e791d522581a30ca1104d42d032cc47bf23b9cee594252f" as const;
export const G16_MANIFEST_SHA256 = "c2ec4308ded4238ab03c2255125fa3c3a9a7eeead176f82d7b71640296222c88" as const;

export const G16_OPERATIONAL_MODES = [
  "UNATTACHED",
  "OBSERVATION_DISCOVERY",
  "GOVERNED_ATTACHED",
  "RECOVERY",
  "EMERGENCY_CONTINUITY",
  "RECONCILIATION",
] as const;
export type G16OperationalMode = typeof G16_OPERATIONAL_MODES[number];

export const G16_SUPPORT_DECLARATION_STATES = [
  "SUPPORTED",
  "PARTIALLY_SUPPORTED",
  "UNQUALIFIED",
  "UNSUPPORTED",
  "INDETERMINATE",
] as const;
export type G16SupportDeclarationState = typeof G16_SUPPORT_DECLARATION_STATES[number];

export type G16CanonicalAvailability =
  | "ABSENT"
  | "VALIDATED_CANONICAL"
  | "RECOVERY_REQUIRED"
  | "INDETERMINATE";

export interface G16OperationalTransitionAuthority {
  authorityId: string;
  state: "CURRENT" | "EXPIRED" | "REVOKED" | "UNKNOWN";
  basis: "EXPLICIT_GOVERNED_AUTHORITY";
  projectId: string;
  allowedFrom: G16OperationalMode;
  allowedTo: G16OperationalMode;
}

export interface G16EmergencyContinuityAuthority {
  authorityId: string;
  authorityState: "CURRENT" | "EXPIRED" | "REVOKED" | "UNKNOWN";
  authorityBasis: "EXPLICIT_GOVERNED_PREAUTHORIZATION" | "SELF_AUTHORIZED" | "REPOSITORY_TEXT" | "UNBOUND";
  projectId: string;
  scopeIdentity: string;
  incidentReference: string;
  startsAt: string;
  expiresAt: string;
  evaluatedAt: string;
  allowedAction: "PRESERVE_HITO_READ_ONLY_CONTINUITY" | "RECOVER_HITO_OWNED_STATE" | "ENTER_GOVERNED_RECONCILIATION";
  reconciliationRequired: boolean;
  evidenceIdentity: string;
}

export interface G16CompatibilityObservation {
  engineProtocolIdentity: string;
  producingRulesetVersion: string;
  canonicalSchemaVersion: string;
  evidenceIdentity: string;
  historicalBindings: Array<{
    recordIdentity: string;
    producingRulesetVersion: string;
    semanticIdentity: string;
  }>;
}

export interface G16SupportDeclaration {
  adapterIdentity: string;
  platform: string;
  languageOrFormat: string;
  state: G16SupportDeclarationState;
  qualificationEvidenceIdentity?: string;
  coverageLimits: string[];
}

export interface G16EnforcementCoverageDeclaration {
  coverageIdentity: string;
  pathClass: "HITO_GOVERNED_ROUTE" | "UNMANAGED_CLI" | "CLOUD_CONSOLE" | "IAM_OR_EXTERNAL_CONTROL_PLANE" | "OTHER_EXTERNAL_PATH";
  state: "ENFORCED" | "OBSERVED_NOT_PREVENTED" | "UNOBSERVED" | "INDETERMINATE";
  enforcementPointIdentity?: string;
  scopeIdentity: string;
}

export interface G16ReconciliationObservation {
  outOfBandOccurrence: "NONE_OBSERVED" | "OBSERVED" | "UNKNOWN";
  observedStateIdentity: string | null;
  scopeIdentity: string;
  reasonCodes: string[];
}

export interface G16MigrationAssessmentRequest {
  assessmentRequested: boolean;
  sourceNamespaceObservation: "ABSENT" | "PRESENT" | "INDETERMINATE";
  targetNamespaceObservation: "ABSENT" | "PRESENT" | "INDETERMINATE";
}

export interface G16ConfigurationDeclaration {
  mode: "DEFAULT_SAFE_READ_ONLY" | "EXPLICIT_GOVERNED_CONFIGURATION";
  provenanceIdentity?: string;
  evidenceIdentity?: string;
}

export interface G16ExtractedIntentCandidate {
  candidateIdentity: string;
  sourceRelativePath: string;
  sourceBytesIdentity: string;
  text: string;
  authority: "EXTRACTED_INTENT_CANDIDATE";
  declaredIntentAuthority: false;
  executionAuthority: false;
}

export interface G16DiscoveryObservation {
  kind: "HITO_G16_READ_ONLY_DISCOVERY_OBSERVATION";
  rulesetVersion: typeof G16_INSTALLABILITY_MIGRATION_RECOVERY_RULESET_VERSION;
  observationIdentity: string;
  selectedRootIdentity: string;
  phase1CompatibleScanFingerprint: string;
  phase2ObservationFingerprint: string;
  phase2ReconstructionIdentity: string;
  phase2ReconstructionReused: true;
  observedFiles: Array<{
    relativePath: string;
    classification: Phase1InventoryClassification;
    size: number;
    contentHash: string;
  }>;
  extractedIntentCandidates: G16ExtractedIntentCandidate[];
  unknowns: Array<{ code: string; relativePath?: string; detail: string }>;
  coverageLimits: string[];
  repositoryTypeObservation: "GIT_PRESENT_NOT_INVOKED" | "NON_GIT" | "INDETERMINATE";
  firstObservationTrusted: false;
  existingPhysicalStateLegitimized: false;
  repositoryProseDeclaredIntent: false;
  targetWritePerformed: false;
  gitInitializedOrMutated: false;
  targetCommandExecutions: 0;
  providerModelRuntimeCalls: 0;
  unauthorizedNetworkCalls: 0;
  hitoNamespaceCreations: 0;
  selectedFilesUnchanged: boolean;
}

export interface G16InstallabilityMigrationRecoveryRequest {
  currentMode: G16OperationalMode;
  requestedMode: G16OperationalMode;
  canonicalAvailability: G16CanonicalAvailability;
  transitionAuthority?: G16OperationalTransitionAuthority;
  discoveryObservation?: G16DiscoveryObservation;
  emergencyAuthority?: G16EmergencyContinuityAuthority;
  compatibility: G16CompatibilityObservation;
  reconciliation: G16ReconciliationObservation;
  supportDeclarations?: G16SupportDeclaration[];
  enforcementCoverage?: G16EnforcementCoverageDeclaration[];
  migration?: G16MigrationAssessmentRequest;
  configuration?: G16ConfigurationDeclaration;
}

export interface G16InstallabilityMigrationRecoveryInput {
  model: CanonicalModel;
  c6: HitoC6CompositionSnapshot;
  request: G16InstallabilityMigrationRecoveryRequest;
}

export interface G16CompatibilityAssessment {
  state: "COMPATIBLE" | "INCOMPATIBLE" | "DOWNGRADE_DETECTED" | "INDETERMINATE";
  engineProtocolIdentity: typeof G16_ENGINE_PROTOCOL_IDENTITY;
  g16RulesetIdentity: typeof G16_INSTALLABILITY_MIGRATION_RECOVERY_RULESET_VERSION;
  canonicalSchemaVersion: typeof G16_SUPPORTED_CANONICAL_SCHEMA_VERSION;
  observed: G16CompatibilityObservation;
  authorityBearing: boolean;
  reconciliationRequired: boolean;
  historicalBindingsPreserved: true;
  historicalReinterpretationPerformed: false;
  reasonCodes: string[];
}

export interface G16ZeroEffectCounters {
  realPredecessorCanonicalWrites: 0;
  isolatedFixtureHitoStateWrites: 0;
  applicationSourceMutations: 0;
  nonHitoTargetMutations: 0;
  targetCommandExecutions: 0;
  providerModelRuntimeCalls: 0;
  unauthorizedNetworkCalls: 0;
  gitMutations: 0;
  hitoNamespaceCreations: 0;
  maatToHitoMigrations: 0;
}

export interface G16InstallabilityMigrationRecoveryAssessment {
  kind: "HITO_G16_INSTALLABILITY_MIGRATION_RECOVERY_ASSESSMENT";
  rulesetVersion: typeof G16_INSTALLABILITY_MIGRATION_RECOVERY_RULESET_VERSION;
  authority: typeof G16_INSTALLABILITY_MIGRATION_RECOVERY_AUTHORITY;
  assessmentId: string;
  sourceAuthorities: {
    c6CompositionIdentity: string;
    g15EnvelopeIdentity: string;
    g15SemanticVerdictIdentity: string;
    g14ProjectionIdentity: string;
    g13AssessmentIdentity: string | null;
    g12AssessmentIdentity: string;
    g11AssessmentIdentity: string | null;
    g10ProjectionIdentity: string;
    g9AssessmentIdentity: string | null;
    g8RealityIdentity: string;
    phase4DecisionIdentity: string | null;
    phase5JudgmentIdentity: string | null;
    phase7AssessmentIdentity: string | null;
  };
  operationalMode: {
    allowedModes: typeof G16_OPERATIONAL_MODES;
    classification: "OPERATIONAL_MODE_NOT_ONTOLOGY";
    requested: G16OperationalMode;
    previous: G16OperationalMode;
    effective: G16OperationalMode;
    transitionState: "ACCEPTED" | "NO_CHANGE" | "BLOCKED";
    authorityIdentity: string | null;
    reasonCodes: string[];
  };
  discovery: {
    observation: G16DiscoveryObservation | null;
    observationAuthority: false;
    genesisTrustState: "PROVENANCE_ONLY_NOT_TRUSTED" | "NOT_OBSERVED";
    declaredIntentImported: false;
    externalTerritoryBounded: true;
  };
  attach: {
    liveCanonicalNamespace: ".maat/";
    hitoOwnedWritesOnly: true;
    applicationSourceMutationAuthorized: false;
    atomicPersistenceAuthority: "PHASE0_ATOMIC_PERSISTENCE_REUSED";
    secondCanonicalStoreCreated: false;
    secondHistoryStoreCreated: false;
    executionPath: "SEPARATE_EXPLICIT_ISOLATED_FIXTURE_ADAPTER_ONLY";
  };
  recovery: {
    scope: "HITO_OWNED_STATE_ONLY";
    persistenceAuthority: "PHASE0_RECOVERY_REUSED";
    applicationRepairAuthority: false;
    truthFabricationAllowed: false;
    historyRewriteAllowed: false;
  };
  emergencyContinuity: {
    state: "NOT_REQUESTED" | "AUTHORIZED_BOUNDED" | "REFUSED";
    authorityIdentity: string | null;
    allowedAction: G16EmergencyContinuityAuthority["allowedAction"] | null;
    selfAuthorized: false;
    targetExecutionAuthority: false;
    deploymentAuthority: false;
    normalHistoricalAuthorization: false;
    reconciliationRequired: boolean;
    reasonCodes: string[];
  };
  reconciliation: {
    state: "NOT_REQUIRED" | "REQUIRED" | "INDETERMINATE";
    acceptedSemanticContinuityIdentity: string;
    observedPhysicalStateIdentity: string | null;
    observedPhysicalStateLegitimized: false;
    sourceTruthReuse: "G8_THROUGH_G15_EXACT_SAME_CALL";
    nextGovernanceStep: HitoC6CompositionSnapshot["g15"]["governedTruth"]["nextStep"];
    targetRepairExecuted: false;
    scopedTerritories: Array<{ category: string; scopeIdentity: string; globalImpact: boolean }>;
    reasonCodes: string[];
  };
  compatibility: G16CompatibilityAssessment;
  support: {
    declarations: Array<G16SupportDeclaration & {
      effectiveState: G16SupportDeclarationState;
      highAssuranceSemanticParity: false;
      compilerParityQualified: false;
      semanticTruthAuthority: false;
    }>;
    vocabulary: typeof G16_SUPPORT_DECLARATION_STATES;
    universalPlatformParityClaimed: false;
    universalLanguageParityClaimed: false;
    enterpriseScaleQualified: false;
    scaleStatus: "PARTIAL_C7_OPERATING_ENVELOPE_ONLY";
  };
  enforcementCoverage: {
    declarations: G16EnforcementCoverageDeclaration[];
    unmanagedExecutionPreventedUniversally: false;
    productionCredentialsRequired: false;
  };
  migration: {
    state: "SPECIFIED_BUT_NOT_AUTHORIZED";
    sourceNamespace: ".maat/";
    targetNamespace: ".hito/";
    eligibility: "NOT_ASSESSED" | "PLAN_ELIGIBLE" | "NO_MIGRATION_REQUIRED" | "REFUSED" | "INDETERMINATE";
    plan: readonly ["ASSESS_SOURCE_COMPATIBILITY", "REQUIRE_SEPARATE_MIGRATION_AUTHORITY", "VERIFY_POST_MIGRATION_BEFORE_PROMOTION"];
    executionAuthorized: false;
    hitoNamespaceCreationAuthorized: false;
    dualWriteAuthorized: false;
    migrationCompleted: false;
    reasonCodes: string[];
  };
  configuration: {
    mode: G16ConfigurationDeclaration["mode"];
    provenanceIdentity: string | null;
    evidenceIdentity: string | null;
    missingOptionalConfigBroadensAuthority: false;
    defaultBehavior: "SAFE_READ_ONLY";
  };
  authorityBearing: boolean;
  zeroEffectCounters: G16ZeroEffectCounters;
  truthBoundary: string;
  limitations: string[];
}

const INPUT_KEYS = ["model", "c6", "request"] as const;
const REQUEST_KEYS = [
  "currentMode",
  "requestedMode",
  "canonicalAvailability",
  "transitionAuthority",
  "discoveryObservation",
  "emergencyAuthority",
  "compatibility",
  "reconciliation",
  "supportDeclarations",
  "enforcementCoverage",
  "migration",
  "configuration",
] as const;
const TRANSITION_AUTHORITY_KEYS = ["authorityId", "state", "basis", "projectId", "allowedFrom", "allowedTo"] as const;
const EMERGENCY_KEYS = ["authorityId", "authorityState", "authorityBasis", "projectId", "scopeIdentity", "incidentReference", "startsAt", "expiresAt", "evaluatedAt", "allowedAction", "reconciliationRequired", "evidenceIdentity"] as const;
const COMPATIBILITY_KEYS = ["engineProtocolIdentity", "producingRulesetVersion", "canonicalSchemaVersion", "evidenceIdentity", "historicalBindings"] as const;
const HISTORICAL_BINDING_KEYS = ["recordIdentity", "producingRulesetVersion", "semanticIdentity"] as const;
const RECONCILIATION_KEYS = ["outOfBandOccurrence", "observedStateIdentity", "scopeIdentity", "reasonCodes"] as const;
const SUPPORT_KEYS = ["adapterIdentity", "platform", "languageOrFormat", "state", "qualificationEvidenceIdentity", "coverageLimits"] as const;
const COVERAGE_KEYS = ["coverageIdentity", "pathClass", "state", "enforcementPointIdentity", "scopeIdentity"] as const;
const MIGRATION_KEYS = ["assessmentRequested", "sourceNamespaceObservation", "targetNamespaceObservation"] as const;
const CONFIGURATION_KEYS = ["mode", "provenanceIdentity", "evidenceIdentity"] as const;
const DISCOVERY_KEYS = [
  "kind",
  "rulesetVersion",
  "observationIdentity",
  "selectedRootIdentity",
  "phase1CompatibleScanFingerprint",
  "phase2ObservationFingerprint",
  "phase2ReconstructionIdentity",
  "phase2ReconstructionReused",
  "observedFiles",
  "extractedIntentCandidates",
  "unknowns",
  "coverageLimits",
  "repositoryTypeObservation",
  "firstObservationTrusted",
  "existingPhysicalStateLegitimized",
  "repositoryProseDeclaredIntent",
  "targetWritePerformed",
  "gitInitializedOrMutated",
  "targetCommandExecutions",
  "providerModelRuntimeCalls",
  "unauthorizedNetworkCalls",
  "hitoNamespaceCreations",
  "selectedFilesUnchanged",
] as const;
const DISCOVERY_FILE_KEYS = ["relativePath", "classification", "size", "contentHash"] as const;
const DISCOVERY_CANDIDATE_KEYS = ["candidateIdentity", "sourceRelativePath", "sourceBytesIdentity", "text", "authority", "declaredIntentAuthority", "executionAuthority"] as const;
const DISCOVERY_UNKNOWN_KEYS = ["code", "relativePath", "detail"] as const;

const TRANSITIONS: Readonly<Record<G16OperationalMode, readonly G16OperationalMode[]>> = {
  UNATTACHED: ["UNATTACHED", "OBSERVATION_DISCOVERY"],
  OBSERVATION_DISCOVERY: ["OBSERVATION_DISCOVERY", "GOVERNED_ATTACHED"],
  GOVERNED_ATTACHED: ["GOVERNED_ATTACHED", "RECOVERY", "EMERGENCY_CONTINUITY", "RECONCILIATION"],
  RECOVERY: ["RECOVERY", "GOVERNED_ATTACHED", "RECONCILIATION"],
  EMERGENCY_CONTINUITY: ["EMERGENCY_CONTINUITY", "RECONCILIATION"],
  RECONCILIATION: ["RECONCILIATION", "GOVERNED_ATTACHED"],
};

function assertExactKeys(value: object, allowed: readonly string[], label: string): void {
  const unsupported = Object.keys(value).filter((key) => !allowed.includes(key)).sort(compareSemanticCodePoints);
  if (unsupported.length > 0) throw new Error(`${label} rejects unsupported or precomputed authority fields: ${unsupported.join(", ")}`);
}

function boundedIdentity(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 4096) throw new Error(`HITO G16 requires bounded ${label}`);
  return value;
}

function assertMode(value: unknown, label: string): asserts value is G16OperationalMode {
  if (!G16_OPERATIONAL_MODES.includes(value as G16OperationalMode)) throw new Error(`HITO G16 rejects invalid ${label}`);
}

function assertC6Authority(model: CanonicalModel, c6: HitoC6CompositionSnapshot): void {
  if (c6 === null || typeof c6 !== "object" || c6.kind !== "HITO_1_0_C6_COMPOSITION_SNAPSHOT") {
    throw new Error("HITO G16 requires an authentic structured C6 composition snapshot");
  }
  const c1 = c6.c5?.c4?.c3?.c2?.c1;
  if (c1 === undefined
    || c1.source.canonicalModelRevision !== model.canonicalState.modelRevision
    || c1.source.canonicalModelIntegrityHash !== model.canonicalState.integrity.modelHash
    || c1.source.historyHead.sequence !== model.canonicalState.historyHead.sequence
    || c1.source.historyHead.eventHash !== model.canonicalState.historyHead.eventHash
    || c1.source.evidenceHead.sequence !== model.canonicalState.evidenceHead.sequence
    || c1.source.evidenceHead.manifestHash !== model.canonicalState.evidenceHead.manifestHash) {
    throw new Error("HITO G16 rejects C6 authority not bound to the supplied canonical model");
  }
  if (c6.g15.semanticVerdictIdentity !== c6.g15.governedTruth.semanticVerdictIdentity
    || c6.laterSemanticAuthority.g16Plus !== false) {
    throw new Error("HITO G16 rejects mismatched or forward-authority C6 input");
  }
  const predecessorCounters = [c6.zeroEffectCounters, c6.g15.zeroEffectCounters, c6.c5.zeroEffectCounters, c6.c5.g14.zeroEffectCounters];
  if (predecessorCounters.some((counter) => Object.values(counter).some((value) => value !== 0))) {
    throw new Error("HITO G16 rejects a predecessor snapshot reporting effects");
  }
}

function normalizeCompatibility(observed: G16CompatibilityObservation): G16CompatibilityObservation {
  if (observed === null || typeof observed !== "object") throw new Error("HITO G16 requires a structured compatibility observation");
  assertExactKeys(observed, COMPATIBILITY_KEYS, "HITO G16 compatibility observation");
  if (!Array.isArray(observed.historicalBindings)) throw new Error("HITO G16 compatibility requires historical bindings collection");
  const historicalBindings = observed.historicalBindings.map((binding, index) => {
    if (binding === null || typeof binding !== "object") throw new Error(`HITO G16 historicalBindings[${index}] must be structured`);
    assertExactKeys(binding, HISTORICAL_BINDING_KEYS, `HITO G16 historicalBindings[${index}]`);
    return {
      recordIdentity: boundedIdentity(binding.recordIdentity, `historicalBindings[${index}].recordIdentity`),
      producingRulesetVersion: boundedIdentity(binding.producingRulesetVersion, `historicalBindings[${index}].producingRulesetVersion`),
      semanticIdentity: boundedIdentity(binding.semanticIdentity, `historicalBindings[${index}].semanticIdentity`),
    };
  }).sort((left, right) => compareSemanticCodePoints(canonicalize(left), canonicalize(right)));
  return {
    engineProtocolIdentity: boundedIdentity(observed.engineProtocolIdentity, "compatibility.engineProtocolIdentity"),
    producingRulesetVersion: boundedIdentity(observed.producingRulesetVersion, "compatibility.producingRulesetVersion"),
    canonicalSchemaVersion: boundedIdentity(observed.canonicalSchemaVersion, "compatibility.canonicalSchemaVersion"),
    evidenceIdentity: boundedIdentity(observed.evidenceIdentity, "compatibility.evidenceIdentity"),
    historicalBindings,
  };
}

function assessCompatibility(observed: G16CompatibilityObservation): G16CompatibilityAssessment {
  const reasonCodes: string[] = [];
  let state: G16CompatibilityAssessment["state"] = "COMPATIBLE";
  if (observed.producingRulesetVersion !== G16_INSTALLABILITY_MIGRATION_RECOVERY_RULESET_VERSION) {
    state = "DOWNGRADE_DETECTED";
    reasonCodes.push("PRODUCING_RULESET_IDENTITY_MISMATCH");
  }
  if (observed.engineProtocolIdentity !== G16_ENGINE_PROTOCOL_IDENTITY) {
    if (state !== "DOWNGRADE_DETECTED") state = "INCOMPATIBLE";
    reasonCodes.push("ENGINE_PROTOCOL_IDENTITY_INCOMPATIBLE");
  }
  if (observed.canonicalSchemaVersion !== G16_SUPPORTED_CANONICAL_SCHEMA_VERSION) {
    if (state !== "DOWNGRADE_DETECTED") state = "INCOMPATIBLE";
    reasonCodes.push("CANONICAL_SCHEMA_VERSION_INCOMPATIBLE");
  }
  if (observed.evidenceIdentity.length === 0) {
    state = "INDETERMINATE";
    reasonCodes.push("COMPATIBILITY_EVIDENCE_MISSING");
  }
  if (state === "COMPATIBLE") reasonCodes.push("ENGINE_RULESET_SCHEMA_EXACTLY_COMPATIBLE");
  return {
    state,
    engineProtocolIdentity: G16_ENGINE_PROTOCOL_IDENTITY,
    g16RulesetIdentity: G16_INSTALLABILITY_MIGRATION_RECOVERY_RULESET_VERSION,
    canonicalSchemaVersion: G16_SUPPORTED_CANONICAL_SCHEMA_VERSION,
    observed,
    authorityBearing: state === "COMPATIBLE",
    reconciliationRequired: state !== "COMPATIBLE",
    historicalBindingsPreserved: true,
    historicalReinterpretationPerformed: false,
    reasonCodes,
  };
}

function normalizeTransitionAuthority(authority: G16OperationalTransitionAuthority | undefined): G16OperationalTransitionAuthority | undefined {
  if (authority === undefined) return undefined;
  if (authority === null || typeof authority !== "object") throw new Error("HITO G16 transition authority must be structured");
  assertExactKeys(authority, TRANSITION_AUTHORITY_KEYS, "HITO G16 transition authority");
  assertMode(authority.allowedFrom, "transition authority from mode");
  assertMode(authority.allowedTo, "transition authority to mode");
  if (authority.basis !== "EXPLICIT_GOVERNED_AUTHORITY") throw new Error("HITO G16 rejects non-governed transition authority basis");
  return structuredClone(authority);
}

function emergencyAssessment(
  model: CanonicalModel,
  requestedMode: G16OperationalMode,
  authority: G16EmergencyContinuityAuthority | undefined,
): G16InstallabilityMigrationRecoveryAssessment["emergencyContinuity"] {
  if (requestedMode !== "EMERGENCY_CONTINUITY") {
    return {
      state: "NOT_REQUESTED",
      authorityIdentity: null,
      allowedAction: null,
      selfAuthorized: false,
      targetExecutionAuthority: false,
      deploymentAuthority: false,
      normalHistoricalAuthorization: false,
      reconciliationRequired: false,
      reasonCodes: ["EMERGENCY_CONTINUITY_NOT_REQUESTED"],
    };
  }
  const reasons: string[] = [];
  if (authority === undefined || authority === null || typeof authority !== "object") {
    return {
      state: "REFUSED",
      authorityIdentity: null,
      allowedAction: null,
      selfAuthorized: false,
      targetExecutionAuthority: false,
      deploymentAuthority: false,
      normalHistoricalAuthorization: false,
      reconciliationRequired: true,
      reasonCodes: ["EXPLICIT_PREAUTHORIZATION_MISSING"],
    };
  }
  assertExactKeys(authority, EMERGENCY_KEYS, "HITO G16 emergency authority");
  const start = Date.parse(authority.startsAt);
  const expiry = Date.parse(authority.expiresAt);
  const evaluated = Date.parse(authority.evaluatedAt);
  if (![start, expiry, evaluated].every(Number.isFinite)) reasons.push("EMERGENCY_TIME_BOUND_INVALID");
  if (authority.authorityBasis !== "EXPLICIT_GOVERNED_PREAUTHORIZATION") reasons.push("SELF_OR_UNBOUND_EMERGENCY_AUTHORITY_REJECTED");
  if (authority.authorityState !== "CURRENT") reasons.push("EMERGENCY_AUTHORITY_NOT_CURRENT");
  if (authority.projectId !== model.project.projectId) reasons.push("EMERGENCY_AUTHORITY_WRONG_PROJECT_SCOPE");
  if (!authority.scopeIdentity) reasons.push("EMERGENCY_SCOPE_MISSING");
  if (!authority.incidentReference) reasons.push("EMERGENCY_INCIDENT_REFERENCE_MISSING");
  if (!authority.evidenceIdentity) reasons.push("EMERGENCY_EVIDENCE_IDENTITY_MISSING");
  if (!authority.reconciliationRequired) reasons.push("EMERGENCY_RECONCILIATION_REQUIREMENT_MISSING");
  if (Number.isFinite(start) && Number.isFinite(evaluated) && evaluated < start) reasons.push("EMERGENCY_AUTHORITY_NOT_YET_APPLICABLE");
  if (Number.isFinite(expiry) && Number.isFinite(evaluated) && evaluated >= expiry) reasons.push("EMERGENCY_AUTHORITY_EXPIRED");
  if (Number.isFinite(start) && Number.isFinite(expiry) && expiry <= start) reasons.push("EMERGENCY_AUTHORITY_WINDOW_INVALID");
  const authorized = reasons.length === 0;
  return {
    state: authorized ? "AUTHORIZED_BOUNDED" : "REFUSED",
    authorityIdentity: authority.authorityId || null,
    allowedAction: authorized ? authority.allowedAction : null,
    selfAuthorized: false,
    targetExecutionAuthority: false,
    deploymentAuthority: false,
    normalHistoricalAuthorization: false,
    reconciliationRequired: true,
    reasonCodes: authorized ? ["EXPLICIT_BOUNDED_EXPIRING_PREAUTHORIZATION_VALID"] : reasons,
  };
}

function operationalModeAssessment(
  model: CanonicalModel,
  request: G16InstallabilityMigrationRecoveryRequest,
  transitionAuthority: G16OperationalTransitionAuthority | undefined,
  compatibility: G16CompatibilityAssessment,
  emergency: G16InstallabilityMigrationRecoveryAssessment["emergencyContinuity"],
): G16InstallabilityMigrationRecoveryAssessment["operationalMode"] {
  const reasonCodes: string[] = [];
  if (request.currentMode === request.requestedMode) {
    return {
      allowedModes: G16_OPERATIONAL_MODES,
      classification: "OPERATIONAL_MODE_NOT_ONTOLOGY",
      requested: request.requestedMode,
      previous: request.currentMode,
      effective: request.currentMode,
      transitionState: "NO_CHANGE",
      authorityIdentity: null,
      reasonCodes: ["IDEMPOTENT_OPERATIONAL_MODE_ASSESSMENT"],
    };
  }
  if (!TRANSITIONS[request.currentMode].includes(request.requestedMode)) reasonCodes.push("INVALID_OPERATIONAL_MODE_TRANSITION");
  const discoveryOnly = request.currentMode === "UNATTACHED" && request.requestedMode === "OBSERVATION_DISCOVERY";
  if (!discoveryOnly) {
    if (transitionAuthority === undefined) reasonCodes.push("EXPLICIT_TRANSITION_AUTHORITY_MISSING");
    else {
      if (transitionAuthority.state !== "CURRENT") reasonCodes.push("TRANSITION_AUTHORITY_NOT_CURRENT");
      if (transitionAuthority.projectId !== model.project.projectId) reasonCodes.push("TRANSITION_AUTHORITY_WRONG_PROJECT_SCOPE");
      if (transitionAuthority.allowedFrom !== request.currentMode || transitionAuthority.allowedTo !== request.requestedMode) reasonCodes.push("TRANSITION_AUTHORITY_MODE_SCOPE_MISMATCH");
    }
  }
  if (request.requestedMode === "GOVERNED_ATTACHED" && request.canonicalAvailability !== "VALIDATED_CANONICAL") {
    reasonCodes.push("VALIDATED_CANONICAL_STATE_REQUIRED_FOR_GOVERNED_ATTACH_MODE");
  }
  if (request.requestedMode === "RECOVERY" && request.canonicalAvailability !== "RECOVERY_REQUIRED") {
    reasonCodes.push("RECOVERY_MODE_REQUIRES_RECOVERY_CLASSIFICATION");
  }
  if (request.requestedMode === "EMERGENCY_CONTINUITY" && emergency.state !== "AUTHORIZED_BOUNDED") {
    reasonCodes.push("BOUNDED_EMERGENCY_AUTHORITY_INVALID");
  }
  if (!discoveryOnly && compatibility.state !== "COMPATIBLE") reasonCodes.push("ENGINE_RULESET_OR_SCHEMA_INCOMPATIBLE");
  const accepted = reasonCodes.length === 0;
  return {
    allowedModes: G16_OPERATIONAL_MODES,
    classification: "OPERATIONAL_MODE_NOT_ONTOLOGY",
    requested: request.requestedMode,
    previous: request.currentMode,
    effective: accepted ? request.requestedMode : request.currentMode,
    transitionState: accepted ? "ACCEPTED" : "BLOCKED",
    authorityIdentity: accepted && !discoveryOnly ? transitionAuthority?.authorityId ?? null : null,
    reasonCodes: accepted ? [discoveryOnly ? "EXPLICIT_READ_ONLY_DISCOVERY_ENTRY" : "BOUNDED_OPERATIONAL_TRANSITION_ACCEPTED"] : reasonCodes,
  };
}

function normalizeReconciliation(request: G16ReconciliationObservation): G16ReconciliationObservation {
  if (request === null || typeof request !== "object") throw new Error("HITO G16 requires a structured reconciliation observation");
  assertExactKeys(request, RECONCILIATION_KEYS, "HITO G16 reconciliation observation");
  if (!["NONE_OBSERVED", "OBSERVED", "UNKNOWN"].includes(request.outOfBandOccurrence)) throw new Error("HITO G16 rejects invalid out-of-band occurrence state");
  if (!Array.isArray(request.reasonCodes)) throw new Error("HITO G16 reconciliation reasonCodes must be a collection");
  return {
    outOfBandOccurrence: request.outOfBandOccurrence,
    observedStateIdentity: request.observedStateIdentity === null ? null : boundedIdentity(request.observedStateIdentity, "reconciliation observed state identity"),
    scopeIdentity: boundedIdentity(request.scopeIdentity, "reconciliation scope identity"),
    reasonCodes: [...new Set(request.reasonCodes.map((reason, index) => boundedIdentity(reason, `reconciliation.reasonCodes[${index}]`)))].sort(compareSemanticCodePoints),
  };
}

function normalizeSupport(declarations: G16SupportDeclaration[] | undefined): G16InstallabilityMigrationRecoveryAssessment["support"] {
  if (declarations !== undefined && !Array.isArray(declarations)) throw new Error("HITO G16 support declarations must be a collection");
  const normalized = (declarations ?? []).map((declaration, index) => {
    if (declaration === null || typeof declaration !== "object") throw new Error(`HITO G16 supportDeclarations[${index}] must be structured`);
    assertExactKeys(declaration, SUPPORT_KEYS, `HITO G16 supportDeclarations[${index}]`);
    if (!G16_SUPPORT_DECLARATION_STATES.includes(declaration.state)) throw new Error(`HITO G16 supportDeclarations[${index}] state is invalid`);
    if (declaration.platform === "*" || declaration.languageOrFormat === "*") throw new Error("HITO G16 rejects universal adapter/platform declarations");
    if (!Array.isArray(declaration.coverageLimits)) throw new Error(`HITO G16 supportDeclarations[${index}] coverageLimits must be a collection`);
    const qualificationEvidenceIdentity = declaration.qualificationEvidenceIdentity === undefined
      ? undefined
      : boundedIdentity(declaration.qualificationEvidenceIdentity, `supportDeclarations[${index}].qualificationEvidenceIdentity`);
    const effectiveState: G16SupportDeclarationState = declaration.state === "SUPPORTED" && qualificationEvidenceIdentity === undefined
      ? "UNQUALIFIED"
      : declaration.state;
    return {
      adapterIdentity: boundedIdentity(declaration.adapterIdentity, `supportDeclarations[${index}].adapterIdentity`),
      platform: boundedIdentity(declaration.platform, `supportDeclarations[${index}].platform`),
      languageOrFormat: boundedIdentity(declaration.languageOrFormat, `supportDeclarations[${index}].languageOrFormat`),
      state: declaration.state,
      ...(qualificationEvidenceIdentity === undefined ? {} : { qualificationEvidenceIdentity }),
      coverageLimits: [...new Set(declaration.coverageLimits.map((limit, limitIndex) => boundedIdentity(limit, `supportDeclarations[${index}].coverageLimits[${limitIndex}]`)))].sort(compareSemanticCodePoints),
      effectiveState,
      highAssuranceSemanticParity: false as const,
      compilerParityQualified: false as const,
      semanticTruthAuthority: false as const,
    };
  }).sort((left, right) => compareSemanticCodePoints(canonicalize(left), canonicalize(right)));
  return {
    declarations: normalized,
    vocabulary: G16_SUPPORT_DECLARATION_STATES,
    universalPlatformParityClaimed: false,
    universalLanguageParityClaimed: false,
    enterpriseScaleQualified: false,
    scaleStatus: "PARTIAL_C7_OPERATING_ENVELOPE_ONLY",
  };
}

function normalizeCoverage(declarations: G16EnforcementCoverageDeclaration[] | undefined): G16EnforcementCoverageDeclaration[] {
  if (declarations !== undefined && !Array.isArray(declarations)) throw new Error("HITO G16 enforcement coverage must be a collection");
  return (declarations ?? []).map((declaration, index) => {
    if (declaration === null || typeof declaration !== "object") throw new Error(`HITO G16 enforcementCoverage[${index}] must be structured`);
    assertExactKeys(declaration, COVERAGE_KEYS, `HITO G16 enforcementCoverage[${index}]`);
    if (!["HITO_GOVERNED_ROUTE", "UNMANAGED_CLI", "CLOUD_CONSOLE", "IAM_OR_EXTERNAL_CONTROL_PLANE", "OTHER_EXTERNAL_PATH"].includes(declaration.pathClass)) {
      throw new Error(`HITO G16 enforcementCoverage[${index}] pathClass is invalid`);
    }
    if (!["ENFORCED", "OBSERVED_NOT_PREVENTED", "UNOBSERVED", "INDETERMINATE"].includes(declaration.state)) {
      throw new Error(`HITO G16 enforcementCoverage[${index}] state is invalid`);
    }
    if (declaration.state === "ENFORCED" && !declaration.enforcementPointIdentity) {
      throw new Error("HITO G16 refuses an enforcement claim without an enforcement point identity");
    }
    if (declaration.pathClass !== "HITO_GOVERNED_ROUTE" && declaration.state === "ENFORCED") {
      throw new Error("HITO G16 refuses universalized unmanaged-path enforcement");
    }
    return structuredClone(declaration);
  }).sort((left, right) => compareSemanticCodePoints(canonicalize(left), canonicalize(right)));
}

function normalizeDiscovery(observation: G16DiscoveryObservation | undefined): G16DiscoveryObservation | null {
  if (observation === undefined) return null;
  if (observation === null || typeof observation !== "object") throw new Error("HITO G16 discovery observation must be structured");
  assertExactKeys(observation, DISCOVERY_KEYS, "HITO G16 discovery observation");
  if (observation.kind !== "HITO_G16_READ_ONLY_DISCOVERY_OBSERVATION"
    || observation.rulesetVersion !== G16_INSTALLABILITY_MIGRATION_RECOVERY_RULESET_VERSION
    || observation.phase2ReconstructionReused !== true
    || observation.firstObservationTrusted !== false
    || observation.existingPhysicalStateLegitimized !== false
    || observation.repositoryProseDeclaredIntent !== false
    || observation.targetWritePerformed !== false
    || observation.gitInitializedOrMutated !== false
    || observation.targetCommandExecutions !== 0
    || observation.providerModelRuntimeCalls !== 0
    || observation.unauthorizedNetworkCalls !== 0
    || observation.hitoNamespaceCreations !== 0) {
    throw new Error("HITO G16 rejects invalid, trusted, or effectful discovery observation");
  }
  if (!["GIT_PRESENT_NOT_INVOKED", "NON_GIT", "INDETERMINATE"].includes(observation.repositoryTypeObservation)) {
    throw new Error("HITO G16 rejects invalid discovery repository type observation");
  }
  if (!Array.isArray(observation.observedFiles)
    || !Array.isArray(observation.extractedIntentCandidates)
    || !Array.isArray(observation.unknowns)
    || !Array.isArray(observation.coverageLimits)) {
    throw new Error("HITO G16 discovery collections must be explicit");
  }
  const observedFiles = observation.observedFiles.map((file, index) => {
    if (file === null || typeof file !== "object") throw new Error(`HITO G16 discovery observedFiles[${index}] must be structured`);
    assertExactKeys(file, DISCOVERY_FILE_KEYS, `HITO G16 discovery observedFiles[${index}]`);
    if (!["SOURCE", "MANIFEST", "DOCUMENTATION", "CONFIGURATION", "UNKNOWN"].includes(file.classification)) throw new Error(`HITO G16 discovery observedFiles[${index}] classification is invalid`);
    if (!Number.isSafeInteger(file.size) || file.size < 0) throw new Error(`HITO G16 discovery observedFiles[${index}] size is invalid`);
    return {
      relativePath: boundedIdentity(file.relativePath, `discovery.observedFiles[${index}].relativePath`),
      classification: file.classification,
      size: file.size,
      contentHash: boundedIdentity(file.contentHash, `discovery.observedFiles[${index}].contentHash`),
    };
  }).sort((left, right) => compareSemanticCodePoints(canonicalize(left), canonicalize(right)));
  const extractedIntentCandidates = observation.extractedIntentCandidates.map((candidate, index) => {
    if (candidate === null || typeof candidate !== "object") throw new Error(`HITO G16 discovery extractedIntentCandidates[${index}] must be structured`);
    assertExactKeys(candidate, DISCOVERY_CANDIDATE_KEYS, `HITO G16 discovery extractedIntentCandidates[${index}]`);
    if (candidate.authority !== "EXTRACTED_INTENT_CANDIDATE" || candidate.declaredIntentAuthority !== false || candidate.executionAuthority !== false) {
      throw new Error("HITO G16 rejects a discovery candidate claiming declared intent or execution authority");
    }
    return {
      candidateIdentity: boundedIdentity(candidate.candidateIdentity, `discovery.extractedIntentCandidates[${index}].candidateIdentity`),
      sourceRelativePath: boundedIdentity(candidate.sourceRelativePath, `discovery.extractedIntentCandidates[${index}].sourceRelativePath`),
      sourceBytesIdentity: boundedIdentity(candidate.sourceBytesIdentity, `discovery.extractedIntentCandidates[${index}].sourceBytesIdentity`),
      text: boundedIdentity(candidate.text, `discovery.extractedIntentCandidates[${index}].text`),
      authority: "EXTRACTED_INTENT_CANDIDATE" as const,
      declaredIntentAuthority: false as const,
      executionAuthority: false as const,
    };
  }).sort((left, right) => compareSemanticCodePoints(canonicalize(left), canonicalize(right)));
  const unknowns = observation.unknowns.map((unknown, index) => {
    if (unknown === null || typeof unknown !== "object") throw new Error(`HITO G16 discovery unknowns[${index}] must be structured`);
    assertExactKeys(unknown, DISCOVERY_UNKNOWN_KEYS, `HITO G16 discovery unknowns[${index}]`);
    return {
      code: boundedIdentity(unknown.code, `discovery.unknowns[${index}].code`),
      ...(unknown.relativePath === undefined ? {} : { relativePath: boundedIdentity(unknown.relativePath, `discovery.unknowns[${index}].relativePath`) }),
      detail: boundedIdentity(unknown.detail, `discovery.unknowns[${index}].detail`),
    };
  }).sort((left, right) => compareSemanticCodePoints(canonicalize(left), canonicalize(right)));
  return {
    kind: observation.kind,
    rulesetVersion: observation.rulesetVersion,
    observationIdentity: boundedIdentity(observation.observationIdentity, "discovery.observationIdentity"),
    selectedRootIdentity: boundedIdentity(observation.selectedRootIdentity, "discovery.selectedRootIdentity"),
    phase1CompatibleScanFingerprint: boundedIdentity(observation.phase1CompatibleScanFingerprint, "discovery.phase1CompatibleScanFingerprint"),
    phase2ObservationFingerprint: boundedIdentity(observation.phase2ObservationFingerprint, "discovery.phase2ObservationFingerprint"),
    phase2ReconstructionIdentity: boundedIdentity(observation.phase2ReconstructionIdentity, "discovery.phase2ReconstructionIdentity"),
    phase2ReconstructionReused: true,
    observedFiles,
    extractedIntentCandidates,
    unknowns,
    coverageLimits: [...new Set(observation.coverageLimits.map((limit, index) => boundedIdentity(limit, `discovery.coverageLimits[${index}]`)))].sort(compareSemanticCodePoints),
    repositoryTypeObservation: observation.repositoryTypeObservation,
    firstObservationTrusted: false,
    existingPhysicalStateLegitimized: false,
    repositoryProseDeclaredIntent: false,
    targetWritePerformed: false,
    gitInitializedOrMutated: false,
    targetCommandExecutions: 0,
    providerModelRuntimeCalls: 0,
    unauthorizedNetworkCalls: 0,
    hitoNamespaceCreations: 0,
    selectedFilesUnchanged: observation.selectedFilesUnchanged === true,
  };
}

function migrationAssessment(
  request: G16MigrationAssessmentRequest | undefined,
  compatibility: G16CompatibilityAssessment,
): G16InstallabilityMigrationRecoveryAssessment["migration"] {
  const plan = ["ASSESS_SOURCE_COMPATIBILITY", "REQUIRE_SEPARATE_MIGRATION_AUTHORITY", "VERIFY_POST_MIGRATION_BEFORE_PROMOTION"] as const;
  if (request === undefined) {
    return {
      state: "SPECIFIED_BUT_NOT_AUTHORIZED",
      sourceNamespace: ".maat/",
      targetNamespace: ".hito/",
      eligibility: "NOT_ASSESSED",
      plan,
      executionAuthorized: false,
      hitoNamespaceCreationAuthorized: false,
      dualWriteAuthorized: false,
      migrationCompleted: false,
      reasonCodes: ["OPTIONAL_MIGRATION_ASSESSMENT_NOT_REQUESTED"],
    };
  }
  if (request === null || typeof request !== "object") throw new Error("HITO G16 migration assessment must be structured");
  assertExactKeys(request, MIGRATION_KEYS, "HITO G16 migration assessment");
  let eligibility: G16InstallabilityMigrationRecoveryAssessment["migration"]["eligibility"] = "NOT_ASSESSED";
  const reasonCodes: string[] = [];
  if (!request.assessmentRequested) reasonCodes.push("ASSESSMENT_EXPLICITLY_NOT_REQUESTED");
  else if (request.targetNamespaceObservation === "PRESENT") {
    eligibility = "REFUSED";
    reasonCodes.push("DUAL_NAMESPACE_AMBIGUITY_OR_UNAUTHORIZED_HITO_NAMESPACE_PRESENT");
  } else if (request.targetNamespaceObservation === "INDETERMINATE" || request.sourceNamespaceObservation === "INDETERMINATE") {
    eligibility = "INDETERMINATE";
    reasonCodes.push("NAMESPACE_OBSERVATION_INDETERMINATE");
  } else if (request.sourceNamespaceObservation === "ABSENT") {
    eligibility = "NO_MIGRATION_REQUIRED";
    reasonCodes.push("CURRENT_MAAT_NAMESPACE_ABSENT");
  } else if (compatibility.state !== "COMPATIBLE") {
    eligibility = "REFUSED";
    reasonCodes.push("ENGINE_RULESET_OR_SCHEMA_INCOMPATIBLE");
  } else {
    eligibility = "PLAN_ELIGIBLE";
    reasonCodes.push("PLAN_ONLY_ELIGIBLE_SEPARATE_AUTHORIZATION_STILL_REQUIRED");
  }
  return {
    state: "SPECIFIED_BUT_NOT_AUTHORIZED",
    sourceNamespace: ".maat/",
    targetNamespace: ".hito/",
    eligibility,
    plan,
    executionAuthorized: false,
    hitoNamespaceCreationAuthorized: false,
    dualWriteAuthorized: false,
    migrationCompleted: false,
    reasonCodes,
  };
}

function configurationAssessment(configuration: G16ConfigurationDeclaration | undefined): G16InstallabilityMigrationRecoveryAssessment["configuration"] {
  if (configuration === undefined) {
    return {
      mode: "DEFAULT_SAFE_READ_ONLY",
      provenanceIdentity: null,
      evidenceIdentity: null,
      missingOptionalConfigBroadensAuthority: false,
      defaultBehavior: "SAFE_READ_ONLY",
    };
  }
  if (configuration === null || typeof configuration !== "object") throw new Error("HITO G16 configuration declaration must be structured");
  assertExactKeys(configuration, CONFIGURATION_KEYS, "HITO G16 configuration declaration");
  if (configuration.mode === "EXPLICIT_GOVERNED_CONFIGURATION" && (!configuration.provenanceIdentity || !configuration.evidenceIdentity)) {
    throw new Error("HITO G16 material configuration requires provenance and evidence identities");
  }
  return {
    mode: configuration.mode,
    provenanceIdentity: configuration.provenanceIdentity ?? null,
    evidenceIdentity: configuration.evidenceIdentity ?? null,
    missingOptionalConfigBroadensAuthority: false,
    defaultBehavior: "SAFE_READ_ONLY",
  };
}

function zeroEffects(): G16ZeroEffectCounters {
  return {
    realPredecessorCanonicalWrites: 0,
    isolatedFixtureHitoStateWrites: 0,
    applicationSourceMutations: 0,
    nonHitoTargetMutations: 0,
    targetCommandExecutions: 0,
    providerModelRuntimeCalls: 0,
    unauthorizedNetworkCalls: 0,
    gitMutations: 0,
    hitoNamespaceCreations: 0,
    maatToHitoMigrations: 0,
  };
}

/** Pure deterministic G16 assessment over the exact same-call C6 authority. */
export function deriveG16InstallabilityMigrationRecovery(
  input: G16InstallabilityMigrationRecoveryInput,
): G16InstallabilityMigrationRecoveryAssessment {
  if (input === null || typeof input !== "object") throw new Error("HITO G16 requires a structured input");
  assertExactKeys(input, INPUT_KEYS, "HITO G16 input");
  assertValidModel(input.model);
  assertC6Authority(input.model, input.c6);
  if (input.request === null || typeof input.request !== "object") throw new Error("HITO G16 requires an explicit structured request");
  assertExactKeys(input.request, REQUEST_KEYS, "HITO G16 request");
  assertMode(input.request.currentMode, "current operational mode");
  assertMode(input.request.requestedMode, "requested operational mode");
  if (!["ABSENT", "VALIDATED_CANONICAL", "RECOVERY_REQUIRED", "INDETERMINATE"].includes(input.request.canonicalAvailability)) {
    throw new Error("HITO G16 rejects invalid canonical availability");
  }
  const before = canonicalize(input);
  const compatibilityObservation = normalizeCompatibility(input.request.compatibility);
  if (compatibilityObservation.canonicalSchemaVersion !== input.model.schemaVersion) {
    throw new Error("HITO G16 compatibility observation is not bound to the supplied canonical schema");
  }
  const compatibility = assessCompatibility(compatibilityObservation);
  const transitionAuthority = normalizeTransitionAuthority(input.request.transitionAuthority);
  const emergency = emergencyAssessment(input.model, input.request.requestedMode, input.request.emergencyAuthority);
  const operationalMode = operationalModeAssessment(input.model, input.request, transitionAuthority, compatibility, emergency);
  const reconciliationRequest = normalizeReconciliation(input.request.reconciliation);
  const support = normalizeSupport(input.request.supportDeclarations);
  const coverage = normalizeCoverage(input.request.enforcementCoverage);
  const migration = migrationAssessment(input.request.migration, compatibility);
  const configuration = configurationAssessment(input.request.configuration);

  const material = input.c6.g15.governedTruth.materialStates;
  const scopedTerritories = material
    .filter((state) => ["UNKNOWN", "INDETERMINATE", "CONFLICT", "CONTRADICTION", "DESYNCHRONIZED_TERRITORY", "OBSERVATION_COVERAGE_LIMIT"].includes(state.category))
    .map((state) => ({ category: state.category, scopeIdentity: state.scope.identity, globalImpact: state.scope.globalImpact }))
    .sort((left, right) => compareSemanticCodePoints(canonicalize(left), canonicalize(right)));
  const reconciliationReasons = [...reconciliationRequest.reasonCodes];
  if (reconciliationRequest.outOfBandOccurrence === "OBSERVED") reconciliationReasons.push("OUT_OF_BAND_PHYSICAL_STATE_OBSERVED_NOT_LEGITIMIZED");
  if (reconciliationRequest.outOfBandOccurrence === "UNKNOWN") reconciliationReasons.push("OUT_OF_BAND_PHYSICAL_STATE_UNKNOWN");
  if (emergency.state === "AUTHORIZED_BOUNDED") reconciliationReasons.push("POST_EMERGENCY_RECONCILIATION_REQUIRED");
  if (compatibility.reconciliationRequired) reconciliationReasons.push("ENGINE_RULESET_OR_SCHEMA_RECONCILIATION_REQUIRED");
  if (scopedTerritories.length > 0) reconciliationReasons.push("UPSTREAM_SCOPED_MATERIAL_STATE_REQUIRES_ATTENTION");
  const reconciliationState: G16InstallabilityMigrationRecoveryAssessment["reconciliation"]["state"] = reconciliationRequest.outOfBandOccurrence === "UNKNOWN"
    ? "INDETERMINATE"
    : reconciliationReasons.length > 0
      ? "REQUIRED"
      : "NOT_REQUIRED";
  const normalizedReconciliationReasons = reconciliationReasons.length === 0
    ? ["NO_RECONCILIATION_TRIGGER_OBSERVED"]
    : [...new Set(reconciliationReasons)].sort(compareSemanticCodePoints);
  const discovery = normalizeDiscovery(input.request.discoveryObservation);

  const sourceAuthorities: G16InstallabilityMigrationRecoveryAssessment["sourceAuthorities"] = {
    c6CompositionIdentity: input.c6.compositionId,
    g15EnvelopeIdentity: input.c6.g15.envelopeId,
    g15SemanticVerdictIdentity: input.c6.g15.semanticVerdictIdentity,
    g14ProjectionIdentity: input.c6.c5.g14.projectionId,
    g13AssessmentIdentity: input.c6.c5.c4.g13?.assessmentId ?? null,
    g12AssessmentIdentity: input.c6.c5.c4.g12.assessmentId,
    g11AssessmentIdentity: input.c6.c5.c4.c3.g11?.assessmentId ?? null,
    g10ProjectionIdentity: input.c6.c5.c4.c3.g10.projectionId,
    g9AssessmentIdentity: input.c6.c5.c4.c3.c2.g9?.assessmentId ?? null,
    g8RealityIdentity: input.c6.c5.c4.c3.c2.g8.successor.semanticRealityIdentity,
    phase4DecisionIdentity: input.c6.c5.c4.c3.c2.c1.phase4?.source.derivedOutput.derivedOutputId ?? null,
    phase5JudgmentIdentity: input.c6.c5.c4.c3.c2.c1.phase5?.judgeResultId ?? null,
    phase7AssessmentIdentity: input.c6.c5.c4.c3.c2.c1.phase7?.assessmentId ?? null,
  };
  const authorityBearing = compatibility.authorityBearing
    && operationalMode.transitionState !== "BLOCKED"
    && emergency.state !== "REFUSED"
    && migration.eligibility !== "REFUSED"
    && (discovery === null || discovery.selectedFilesUnchanged);
  const assessmentId = `hito_g16_assessment_${sha256LengthPrefixedFrames([
    { label: "g16-ruleset", value: G16_INSTALLABILITY_MIGRATION_RECOVERY_RULESET_VERSION },
    { label: "c6-composition", value: input.c6.compositionId },
    { label: "request", value: input.request },
    { label: "operational-mode", value: operationalMode },
    { label: "compatibility", value: compatibility },
    { label: "reconciliation", value: { state: reconciliationState, reasons: normalizedReconciliationReasons } },
  ])}`;
  const result: G16InstallabilityMigrationRecoveryAssessment = {
    kind: "HITO_G16_INSTALLABILITY_MIGRATION_RECOVERY_ASSESSMENT",
    rulesetVersion: G16_INSTALLABILITY_MIGRATION_RECOVERY_RULESET_VERSION,
    authority: G16_INSTALLABILITY_MIGRATION_RECOVERY_AUTHORITY,
    assessmentId,
    sourceAuthorities,
    operationalMode,
    discovery: {
      observation: discovery,
      observationAuthority: false,
      genesisTrustState: discovery === null ? "NOT_OBSERVED" : "PROVENANCE_ONLY_NOT_TRUSTED",
      declaredIntentImported: false,
      externalTerritoryBounded: true,
    },
    attach: {
      liveCanonicalNamespace: ".maat/",
      hitoOwnedWritesOnly: true,
      applicationSourceMutationAuthorized: false,
      atomicPersistenceAuthority: "PHASE0_ATOMIC_PERSISTENCE_REUSED",
      secondCanonicalStoreCreated: false,
      secondHistoryStoreCreated: false,
      executionPath: "SEPARATE_EXPLICIT_ISOLATED_FIXTURE_ADAPTER_ONLY",
    },
    recovery: {
      scope: "HITO_OWNED_STATE_ONLY",
      persistenceAuthority: "PHASE0_RECOVERY_REUSED",
      applicationRepairAuthority: false,
      truthFabricationAllowed: false,
      historyRewriteAllowed: false,
    },
    emergencyContinuity: emergency,
    reconciliation: {
      state: reconciliationState,
      acceptedSemanticContinuityIdentity: input.c6.g15.semanticVerdictIdentity,
      observedPhysicalStateIdentity: reconciliationRequest.observedStateIdentity,
      observedPhysicalStateLegitimized: false,
      sourceTruthReuse: "G8_THROUGH_G15_EXACT_SAME_CALL",
      nextGovernanceStep: structuredClone(input.c6.g15.governedTruth.nextStep),
      targetRepairExecuted: false,
      scopedTerritories,
      reasonCodes: normalizedReconciliationReasons,
    },
    compatibility,
    support,
    enforcementCoverage: {
      declarations: coverage,
      unmanagedExecutionPreventedUniversally: false,
      productionCredentialsRequired: false,
    },
    migration,
    configuration,
    authorityBearing,
    zeroEffectCounters: zeroEffects(),
    truthBoundary: "G16 assesses bounded local-first operational compatibility over the exact same-call C6 truth. Operational modes are not ontology; observation is not trust; attach/recovery authority is limited to explicit isolated HITO-owned .maat state; migration remains plan-only.",
    limitations: [
      "No application or non-HITO target mutation, arbitrary target command execution, deployment, provider/model call, unauthorized network call, Git mutation, or external control-plane mutation",
      "No .hito creation, .maat-to-.hito migration, dual write, or migration-complete authority",
      "No universal unmanaged-path enforcement, OS/language/parser/compiler parity, enterprise-scale, or remote backup/sync claim",
      "G8-G15 retain semantic ownership; G9 retains transition-completion ownership; G16 creates no second canonical, history, conflict, judge, or next-step engine",
      "No G17 or later authority",
    ],
  };
  if (canonicalize(input) !== before) throw new Error("HITO G16 derivation mutated caller or canonical input");
  return result;
}

export interface G16ReadOnlyDiscoveryOptions {
  relativePaths?: string[];
  maxBytesPerFile?: number;
  observedAt?: string;
}

const DISCOVERY_OPTION_KEYS = ["relativePaths", "maxBytesPerFile", "observedAt"] as const;
const DEFAULT_DISCOVERY_PATHS = ["package.json", "tsconfig.json", "README.md", "README", "MAAT_MASTER_BUILD_SPEC.md"] as const;

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.lstat(filePath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

function normalizedRelativePath(relativePath: string): string {
  if (typeof relativePath !== "string" || relativePath.length === 0 || relativePath.length > 4096) throw new Error("HITO G16 discovery requires bounded relative paths");
  const normalized = relativePath.replaceAll("\\", "/").replace(/^\.\//, "");
  if (path.posix.isAbsolute(normalized) || normalized === ".." || normalized.startsWith("../") || normalized.includes("/../") || normalized.includes("\0")) {
    throw new Error("HITO G16 discovery rejects paths outside the selected root");
  }
  if (normalized === ".git" || normalized.startsWith(".git/") || normalized === ".maat" || normalized.startsWith(".maat/") || normalized === ".hito" || normalized.startsWith(".hito/")) {
    throw new Error("HITO G16 discovery does not read Git internals or canonical namespace internals through project-file adapters");
  }
  return normalized;
}

function classificationFor(relativePath: string): Phase1InventoryClassification {
  const lower = relativePath.toLowerCase();
  if (lower.endsWith("readme") || lower.endsWith(".md") || lower.endsWith(".txt")) return "DOCUMENTATION";
  if (lower.endsWith("package.json") || lower.endsWith("lock.yaml") || lower.endsWith("lock.json")) return "MANIFEST";
  if (lower.endsWith(".json") || lower.endsWith(".yaml") || lower.endsWith(".yml") || lower.endsWith(".toml")) return "CONFIGURATION";
  if (/\.(?:ts|tsx|js|jsx|mjs|cjs|py|rs|go|java|cs)$/u.test(lower)) return "SOURCE";
  return "UNKNOWN";
}

function hashBuffer(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function firstProseCandidate(text: string): string | undefined {
  const candidate = text.split(/\r?\n/u).map((line) => line.trim()).find((line) => line.length > 0);
  if (candidate === undefined) return undefined;
  return candidate.slice(0, 4096);
}

function phase1ScanForDiscovery(
  realRoot: string,
  rootIdentity: string,
  observedAt: string,
  inventory: Phase1InventoryEntry[],
  manifests: Phase1ManifestObservation[],
  unknowns: Array<{ code: string; relativePath?: string; detail: string }>,
  repositoryType: G16DiscoveryObservation["repositoryTypeObservation"],
  selectedFingerprint: string,
): Phase1ScanResult {
  const include = inventory.map((entry) => entry.relativePath).sort(compareSemanticCodePoints);
  const scope = {
    root: realRoot,
    include,
    exclude: [".git/**", ".maat/**", ".hito/**", "node_modules/**"],
    followSymlinks: false,
    executeCommands: false as const,
    networkAccess: false as const,
    phase: 1 as const,
    contentHashing: true,
    ignoreRules: ["G16_BOUNDED_EXPLICIT_FILE_ADAPTER"],
    exclusionPolicyVersion: "hito-g16-discovery-v1",
  };
  const scopeFingerprint = sha256Text(canonicalize(scope));
  const preview = {
    selectedRoot: realRoot,
    selectedRootRealpath: realRoot,
    repositoryType: repositoryType === "NON_GIT" ? "NON_GIT" as const : "UNKNOWN" as const,
    readableCategories: ["EXPLICIT_SUPPORTED_PROJECT_FILES"],
    excludedCategories: ["GIT_INTERNALS", "HITO_CANONICAL_STATE", "SECRET_CANDIDATES", "UNREQUESTED_FILES"],
    gitMetadataOperations: [],
    manifestFilesEligible: manifests.map((manifest) => manifest.relativePath),
    contentHashing: true,
    outputLocation: "IN_MEMORY_ONLY",
    arbitraryExecutionPermitted: false as const,
    networkAccess: false as const,
    targetWritePermitted: false as const,
    scope,
    scopeFingerprint,
    previewFingerprint: sha256Text(canonicalize({ rootIdentity, scopeFingerprint })),
  };
  return {
    scanId: `hito_g16_discovery_scan_${selectedFingerprint}`,
    fingerprint: selectedFingerprint,
    status: unknowns.length > 0 ? "INDETERMINATE" : "COMPLETED",
    selectedRoot: realRoot,
    selectedRootRealpath: realRoot,
    repositoryType: preview.repositoryType,
    startedAt: observedAt,
    completedAt: observedAt,
    scope,
    permissionPreview: preview,
    permissionAudit: {
      previewProducedBeforeScan: true,
      requestedScopes: ["READ_PROJECT", "READ_GIT_METADATA"],
      deniedScopes: ["WRITE_PROJECT", "COMMIT_OR_PUSH", "RUN_APPROVED_PROBE", "NETWORK_OUTBOUND", "READ_SECRET_CANDIDATE"],
      arbitraryExecution: false,
      networkAccess: false,
      targetRepositoryWrites: false,
    },
    git: {
      available: false,
      repositoryType: preview.repositoryType,
      cleanStatus: "UNKNOWN",
      cleanStatusReason: "UNAVAILABLE_IN_SAFE_READ_ONLY_MODE",
      trackedFiles: [],
      recentCommits: [],
      operations: [],
    },
    manifests,
    inventory,
    exclusions: [],
    failures: [],
    unknowns: unknowns.map((unknown) => ({
      code: "UNAVAILABLE_IN_SAFE_READ_ONLY_MODE" as const,
      ...(unknown.relativePath === undefined ? {} : { relativePath: unknown.relativePath }),
      message: `${unknown.code}: ${unknown.detail}`,
    })),
    redaction: {
      policyVersion: "phase1-safe-v1",
      secretCandidatePathsExcluded: 0,
      secretContentsRead: false,
      secretValuesReturned: false,
      manifestScriptValuesReturned: false,
    },
    targetWriteAudit: {
      targetMutated: false,
      beforeFingerprint: selectedFingerprint,
      afterFingerprint: selectedFingerprint,
      comparisonStatus: "UNCHANGED",
    },
    adapterCoverageLimits: [
      "G16 reads only the explicit supported file list",
      "Git internals and target commands are not consulted",
      "Unobserved structures remain unknown",
    ],
  };
}

/** Read-only, command-free discovery adapter. It reuses Phase2 reconstruction in memory and never persists it. */
export async function discoverG16ProjectForReconciliation(
  projectRoot: string,
  options: G16ReadOnlyDiscoveryOptions = {},
): Promise<{ observation: G16DiscoveryObservation; scan: Phase1ScanResult }> {
  if (options === null || typeof options !== "object") throw new Error("HITO G16 discovery options must be structured");
  assertExactKeys(options, DISCOVERY_OPTION_KEYS, "HITO G16 discovery options");
  const realRoot = await fs.realpath(projectRoot);
  const rootStat = await fs.stat(realRoot);
  if (!rootStat.isDirectory()) throw new Error("HITO G16 discovery root must be a directory");
  const maxBytes = options.maxBytesPerFile ?? 1_048_576;
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > 16_777_216) throw new Error("HITO G16 discovery maxBytesPerFile is outside the bounded range");
  const observedAt = options.observedAt ?? "1970-01-01T00:00:00.000Z";
  if (!Number.isFinite(Date.parse(observedAt))) throw new Error("HITO G16 discovery observedAt must be an ISO-compatible timestamp");
  const relativePaths = [...new Set((options.relativePaths ?? [...DEFAULT_DISCOVERY_PATHS]).map(normalizedRelativePath))].sort(compareSemanticCodePoints);
  const rootIdentity = sha256Text(realRoot);
  const gitPresent = await pathExists(path.join(realRoot, ".git"));
  const hitoPresentBefore = await pathExists(path.join(realRoot, ".hito"));
  const inventory: Phase1InventoryEntry[] = [];
  const manifests: Phase1ManifestObservation[] = [];
  const observedFiles: G16DiscoveryObservation["observedFiles"] = [];
  const extractedIntentCandidates: G16ExtractedIntentCandidate[] = [];
  const unknowns: G16DiscoveryObservation["unknowns"] = [];
  const beforeBytes = new Map<string, string>();

  for (const relativePath of relativePaths) {
    const absolutePath = path.resolve(realRoot, ...relativePath.split("/"));
    const relativeCheck = path.relative(realRoot, absolutePath);
    if (relativeCheck.startsWith("..") || path.isAbsolute(relativeCheck)) throw new Error("HITO G16 discovery path escaped selected root");
    let stat;
    try {
      stat = await fs.lstat(absolutePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
      unknowns.push({ code: "UNREADABLE_INPUT", relativePath, detail: "metadata could not be read" });
      continue;
    }
    if (stat.isSymbolicLink()) {
      unknowns.push({ code: "SYMLINK_NOT_FOLLOWED", relativePath, detail: "safe discovery does not follow symbolic links" });
      continue;
    }
    if (!stat.isFile()) {
      unknowns.push({ code: "UNSUPPORTED_STRUCTURE", relativePath, detail: "selected path is not a regular file" });
      continue;
    }
    if (stat.size > maxBytes) {
      unknowns.push({ code: "FILE_OUTSIDE_BOUNDED_ADAPTER_LIMIT", relativePath, detail: `file exceeds ${maxBytes} bytes` });
      continue;
    }
    const bytes = await fs.readFile(absolutePath);
    const contentHash = hashBuffer(bytes);
    beforeBytes.set(relativePath, contentHash);
    const classification = classificationFor(relativePath);
    inventory.push({
      relativePath,
      classification,
      size: bytes.length,
      mode: stat.mode,
      included: true,
      contentHash,
      provenance: { source: "filesystem", sourceRef: relativePath, observationClass: "OBSERVED" },
    });
    observedFiles.push({ relativePath, classification, size: bytes.length, contentHash });
    if (path.posix.basename(relativePath).toLowerCase() === "package.json") {
      try {
        const parsed = JSON.parse(bytes.toString("utf8")) as Record<string, unknown>;
        const scripts = parsed.scripts !== null && typeof parsed.scripts === "object" ? Object.keys(parsed.scripts as Record<string, unknown>).sort(compareSemanticCodePoints) : [];
        manifests.push({
          relativePath,
          manifestKind: "NODE_PACKAGE_JSON",
          valid: true,
          ...(typeof parsed.name === "string" ? { name: parsed.name } : {}),
          ...(typeof parsed.version === "string" ? { version: parsed.version } : {}),
          scriptNames: scripts,
          scriptsObserved: true,
          scriptsExecuted: false,
          dependencyCount: parsed.dependencies !== null && typeof parsed.dependencies === "object" ? Object.keys(parsed.dependencies as object).length : 0,
          devDependencyCount: parsed.devDependencies !== null && typeof parsed.devDependencies === "object" ? Object.keys(parsed.devDependencies as object).length : 0,
        });
      } catch {
        unknowns.push({ code: "INVALID_MANIFEST", relativePath, detail: "manifest bytes are not valid JSON" });
      }
    }
    if (classification === "DOCUMENTATION") {
      const candidateText = firstProseCandidate(bytes.toString("utf8"));
      if (candidateText !== undefined) {
        extractedIntentCandidates.push({
          candidateIdentity: `hito_g16_extracted_intent_${sha256Text(canonicalize({ relativePath, contentHash, candidateText }))}`,
          sourceRelativePath: relativePath,
          sourceBytesIdentity: contentHash,
          text: candidateText,
          authority: "EXTRACTED_INTENT_CANDIDATE",
          declaredIntentAuthority: false,
          executionAuthority: false,
        });
      }
    }
  }

  const afterObserved = new Map<string, string>();
  for (const [relativePath] of beforeBytes) {
    const bytes = await fs.readFile(path.resolve(realRoot, ...relativePath.split("/")));
    afterObserved.set(relativePath, hashBuffer(bytes));
  }
  const selectedFilesUnchanged = canonicalize([...beforeBytes]) === canonicalize([...afterObserved]);
  if (!selectedFilesUnchanged) unknowns.push({ code: "TARGET_CHANGED_DURING_DISCOVERY", detail: "selected observed bytes changed during read-only discovery" });
  const hitoPresentAfter = await pathExists(path.join(realRoot, ".hito"));
  if (hitoPresentBefore !== hitoPresentAfter) throw new Error("HITO G16 discovery observed an external .hito namespace change during discovery");
  const selectedFingerprint = sha256Text(canonicalize({ observedFiles, unknowns, repositoryType: gitPresent ? "UNKNOWN" : "NON_GIT" }));
  const scan = phase1ScanForDiscovery(realRoot, rootIdentity, observedAt, inventory, manifests, unknowns, gitPresent ? "GIT_PRESENT_NOT_INVOKED" : "NON_GIT", selectedFingerprint);
  const phase2Fingerprint = phase2ObservationFingerprint(scan);
  const reconstruction = reconcilePhase2Snapshot(scan);
  if (!reconstruction.validation.valid) throw new Error(`HITO G16 Phase2 reconstruction failed validation: ${reconstruction.validation.issues.join(", ")}`);
  const phase2ReconstructionIdentity = sha256Text(canonicalize({
    scanFingerprint: reconstruction.scanFingerprint,
    modelIntegrityHash: reconstruction.model.canonicalState.integrity.modelHash,
    candidates: reconstruction.candidates.map((candidate) => candidate.candidateId),
    ambiguities: reconstruction.ambiguities,
    conflicts: reconstruction.conflicts,
  }));
  const observationIdentity = `hito_g16_discovery_${sha256LengthPrefixedFrames([
    { label: "g16-ruleset", value: G16_INSTALLABILITY_MIGRATION_RECOVERY_RULESET_VERSION },
    { label: "root-identity", value: rootIdentity },
    { label: "selected-files", value: observedFiles },
    { label: "phase2-reconstruction", value: phase2ReconstructionIdentity },
    { label: "intent-candidates", value: extractedIntentCandidates },
    { label: "unknowns", value: unknowns },
  ])}`;
  const observation: G16DiscoveryObservation = {
    kind: "HITO_G16_READ_ONLY_DISCOVERY_OBSERVATION",
    rulesetVersion: G16_INSTALLABILITY_MIGRATION_RECOVERY_RULESET_VERSION,
    observationIdentity,
    selectedRootIdentity: rootIdentity,
    phase1CompatibleScanFingerprint: selectedFingerprint,
    phase2ObservationFingerprint: phase2Fingerprint,
    phase2ReconstructionIdentity,
    phase2ReconstructionReused: true,
    observedFiles: observedFiles.sort((left, right) => compareSemanticCodePoints(left.relativePath, right.relativePath)),
    extractedIntentCandidates: extractedIntentCandidates.sort((left, right) => compareSemanticCodePoints(left.candidateIdentity, right.candidateIdentity)),
    unknowns: unknowns.sort((left, right) => compareSemanticCodePoints(canonicalize(left), canonicalize(right))),
    coverageLimits: [
      "Only explicitly supported project files were read",
      "Git internals, commands, providers, networks, and unrequested files were not consulted",
      "Repository prose and reconstructed model data remain observations/candidates, not declared intent",
      "Unobserved external territory remains unknown",
    ],
    repositoryTypeObservation: gitPresent ? "GIT_PRESENT_NOT_INVOKED" : "NON_GIT",
    firstObservationTrusted: false,
    existingPhysicalStateLegitimized: false,
    repositoryProseDeclaredIntent: false,
    targetWritePerformed: false,
    gitInitializedOrMutated: false,
    targetCommandExecutions: 0,
    providerModelRuntimeCalls: 0,
    unauthorizedNetworkCalls: 0,
    hitoNamespaceCreations: 0,
    selectedFilesUnchanged,
  };
  return { observation, scan };
}

export async function discoverG16ProjectReadOnly(projectRoot: string, options: G16ReadOnlyDiscoveryOptions = {}): Promise<G16DiscoveryObservation> {
  return (await discoverG16ProjectForReconciliation(projectRoot, options)).observation;
}

export const G16_ISOLATED_FIXTURE_BOUNDARY = "HITO_C7_ISOLATED_TEST_FIXTURE_ONLY" as const;

export interface G16IsolatedFixtureAuthority {
  boundary: typeof G16_ISOLATED_FIXTURE_BOUNDARY;
  authorityId: string;
  authorityState: "CURRENT";
  projectId: string;
  fixtureRootIdentity: string;
  allowedAction: "ATTACH_HITO_OWNED_STATE" | "RECOVER_HITO_OWNED_STATE";
}

export interface G16FixtureEffectLedger {
  realPredecessorCanonicalWrites: 0;
  isolatedFixtureHitoStateWrites: number;
  durabilityEvents: Array<{ relativePath: string; role: DurabilityRole }>;
  applicationSourceMutations: 0;
  nonHitoTargetMutations: 0;
  targetCommandExecutions: 0;
  providerModelRuntimeCalls: 0;
  unauthorizedNetworkCalls: 0;
  gitMutations: 0;
  hitoNamespaceCreations: 0;
  maatToHitoMigrations: 0;
}

export interface G16AttachOptions {
  failpoint?: CommitFailpoint;
}

export interface G16AttachResult {
  kind: "HITO_G16_ISOLATED_FIXTURE_ATTACH_RESULT";
  status: "ATTACHED" | "ALREADY_ATTACHED" | "INTERRUPTED" | "REFUSED";
  authorityId: string;
  canonicalNamespace: ".maat/";
  canonicalStateIdentity: string | null;
  persistenceState: TransactionState;
  applicationFilesByteExact: boolean;
  extractedIntentPromotedToDeclaredIntent: false;
  atomicPersistenceReused: true;
  restartSafe: boolean;
  reason: string;
  effects: G16FixtureEffectLedger;
}

export interface G16RecoveryOptions {
  quarantineLabel?: string;
}

export interface G16RecoveryAdapterResult {
  kind: "HITO_G16_ISOLATED_FIXTURE_RECOVERY_RESULT";
  status: "COMPLETED" | "NOTHING_TO_RECOVER" | "QUARANTINED" | "REFUSED";
  authorityId: string;
  beforeState: TransactionState;
  afterState: TransactionState;
  canonicalStateIdentity: string | null;
  applicationFilesByteExact: boolean;
  historicalEventPrefixPreserved: boolean;
  missingCanonicalTruthFabricated: false;
  applicationRepairPerformed: false;
  result: RecoveryResult | null;
  reason: string;
  effects: G16FixtureEffectLedger;
}

const FIXTURE_AUTHORITY_KEYS = ["boundary", "authorityId", "authorityState", "projectId", "fixtureRootIdentity", "allowedAction"] as const;
const ATTACH_OPTION_KEYS = ["failpoint"] as const;
const RECOVERY_OPTION_KEYS = ["quarantineLabel"] as const;

export async function g16FixtureRootIdentity(projectRoot: string): Promise<string> {
  const realRoot = await fs.realpath(projectRoot);
  return `hito_c7_fixture_root_${sha256Text(realRoot)}`;
}

async function assertFixtureAuthority(
  projectRoot: string,
  authority: G16IsolatedFixtureAuthority,
  action: G16IsolatedFixtureAuthority["allowedAction"],
): Promise<string> {
  if (authority === null || typeof authority !== "object") throw new Error("HITO G16 fixture operation requires structured authority");
  assertExactKeys(authority, FIXTURE_AUTHORITY_KEYS, "HITO G16 fixture authority");
  if (authority.boundary !== G16_ISOLATED_FIXTURE_BOUNDARY || authority.authorityState !== "CURRENT" || authority.allowedAction !== action) {
    throw new Error("HITO G16 refuses operation outside explicit isolated-fixture authority");
  }
  const realRoot = await fs.realpath(projectRoot);
  if (!path.basename(realRoot).startsWith("hito-c7-fixture-")) throw new Error("HITO G16 refuses a root not explicitly named as a C7 isolated fixture");
  const identity = await g16FixtureRootIdentity(realRoot);
  if (identity !== authority.fixtureRootIdentity) throw new Error("HITO G16 fixture authority is bound to a different root");
  if (await pathExists(path.join(realRoot, ".hito"))) throw new Error("HITO G16 refuses operation while .hito exists");
  return realRoot;
}

async function nonHitoTreeIdentity(root: string): Promise<string> {
  const entries: Array<{ relativePath: string; kind: string; bytesIdentity?: string; size?: number }> = [];
  async function visit(directory: string, relativeDirectory: string): Promise<void> {
    const children = await fs.readdir(directory, { withFileTypes: true });
    children.sort((left, right) => compareSemanticCodePoints(left.name, right.name));
    for (const child of children) {
      if (relativeDirectory === "" && (child.name === ".maat" || child.name === ".hito")) continue;
      const relativePath = relativeDirectory ? `${relativeDirectory}/${child.name}` : child.name;
      const absolutePath = path.join(directory, child.name);
      if (child.isSymbolicLink()) {
        entries.push({ relativePath, kind: "SYMLINK_NOT_FOLLOWED" });
      } else if (child.isDirectory()) {
        entries.push({ relativePath, kind: "DIRECTORY" });
        await visit(absolutePath, relativePath);
      } else if (child.isFile()) {
        const bytes = await fs.readFile(absolutePath);
        entries.push({ relativePath, kind: "FILE", size: bytes.length, bytesIdentity: hashBuffer(bytes) });
      } else {
        entries.push({ relativePath, kind: "SPECIAL_FILE_NOT_READ" });
      }
    }
  }
  await visit(root, "");
  return sha256Text(canonicalize(entries));
}

function snapshotIdentity(snapshot: PersistenceSnapshot): string {
  return sha256Text(canonicalize({
    modelHash: snapshot.model.canonicalState.integrity.modelHash,
    historyHash: snapshot.model.canonicalState.integrity.historyHash,
    evidenceManifestHash: snapshot.model.canonicalState.integrity.evidenceManifestHash,
    historyHead: snapshot.model.canonicalState.historyHead,
    evidenceHead: snapshot.model.canonicalState.evidenceHead,
  }));
}

function historicalPrefix(before: HistoryEvent[], after: HistoryEvent[]): boolean {
  return before.every((event, index) => after[index]?.eventHash === event.eventHash);
}

function effectLedger(root: string, events: Array<{ absolutePath: string; role: DurabilityRole }>): G16FixtureEffectLedger {
  return {
    realPredecessorCanonicalWrites: 0,
    isolatedFixtureHitoStateWrites: events.length,
    durabilityEvents: events.map((event) => ({ relativePath: path.relative(root, event.absolutePath).replaceAll("\\", "/"), role: event.role })),
    applicationSourceMutations: 0,
    nonHitoTargetMutations: 0,
    targetCommandExecutions: 0,
    providerModelRuntimeCalls: 0,
    unauthorizedNetworkCalls: 0,
    gitMutations: 0,
    hitoNamespaceCreations: 0,
    maatToHitoMigrations: 0,
  };
}

/** The only C7 attach write path. It is root-bound, fixture-only, .maat-only, and delegates to Phase0 persistence. */
export async function attachG16IsolatedFixture(
  projectRoot: string,
  snapshot: PersistenceSnapshot,
  authority: G16IsolatedFixtureAuthority,
  options: G16AttachOptions = {},
): Promise<G16AttachResult> {
  if (options === null || typeof options !== "object") throw new Error("HITO G16 attach options must be structured");
  assertExactKeys(options, ATTACH_OPTION_KEYS, "HITO G16 attach options");
  const root = await assertFixtureAuthority(projectRoot, authority, "ATTACH_HITO_OWNED_STATE");
  if (snapshot.model.project.projectId !== authority.projectId) throw new Error("HITO G16 attach authority is bound to a different project");
  const applicationBefore = await nonHitoTreeIdentity(root);
  const events: Array<{ absolutePath: string; role: DurabilityRole }> = [];
  let result: G16AttachResult;
  try {
    const classification = await classifyPersistenceState(root);
    if (classification.state === "HEALTHY_CANONICAL_STATE") {
      const existing = await readCanonicalRevisionValidated(root);
      const proposed = prepareCanonicalRevision(snapshot);
      const same = canonicalize(existing) === canonicalize(proposed);
      result = {
        kind: "HITO_G16_ISOLATED_FIXTURE_ATTACH_RESULT",
        status: same ? "ALREADY_ATTACHED" : "REFUSED",
        authorityId: authority.authorityId,
        canonicalNamespace: ".maat/",
        canonicalStateIdentity: snapshotIdentity(existing),
        persistenceState: classification.state,
        applicationFilesByteExact: false,
        extractedIntentPromotedToDeclaredIntent: false,
        atomicPersistenceReused: true,
        restartSafe: true,
        reason: same ? "identical validated canonical state already attached; no write performed" : "different canonical HITO state already exists; attach refuses overwrite",
        effects: effectLedger(root, events),
      };
    } else if (classification.state !== "NO_CANONICAL_STATE") {
      result = {
        kind: "HITO_G16_ISOLATED_FIXTURE_ATTACH_RESULT",
        status: "REFUSED",
        authorityId: authority.authorityId,
        canonicalNamespace: ".maat/",
        canonicalStateIdentity: null,
        persistenceState: classification.state,
        applicationFilesByteExact: false,
        extractedIntentPromotedToDeclaredIntent: false,
        atomicPersistenceReused: true,
        restartSafe: false,
        reason: "existing HITO state requires explicit recovery before attach",
        effects: effectLedger(root, events),
      };
    } else {
      try {
        await stageCanonicalRevision(root, snapshot, {
          ...(options.failpoint === undefined ? {} : { failpoint: options.failpoint }),
          durabilityObserver: {
            onDurableWrite: (filePath, role) => { events.push({ absolutePath: filePath, role }); },
          },
        });
        const persisted = await readCanonicalRevisionValidated(root);
        const afterState = await classifyPersistenceState(root);
        result = {
          kind: "HITO_G16_ISOLATED_FIXTURE_ATTACH_RESULT",
          status: "ATTACHED",
          authorityId: authority.authorityId,
          canonicalNamespace: ".maat/",
          canonicalStateIdentity: snapshotIdentity(persisted),
          persistenceState: afterState.state,
          applicationFilesByteExact: false,
          extractedIntentPromotedToDeclaredIntent: false,
          atomicPersistenceReused: true,
          restartSafe: afterState.state === "HEALTHY_CANONICAL_STATE",
          reason: "validated canonical HITO state attached through Phase0 atomic persistence",
          effects: effectLedger(root, events),
        };
      } catch (error) {
        const afterState = await classifyPersistenceState(root);
        result = {
          kind: "HITO_G16_ISOLATED_FIXTURE_ATTACH_RESULT",
          status: "INTERRUPTED",
          authorityId: authority.authorityId,
          canonicalNamespace: ".maat/",
          canonicalStateIdentity: null,
          persistenceState: afterState.state,
          applicationFilesByteExact: false,
          extractedIntentPromotedToDeclaredIntent: false,
          atomicPersistenceReused: true,
          restartSafe: false,
          reason: error instanceof Error ? error.message : "attach interrupted",
          effects: effectLedger(root, events),
        };
      }
    }
  } finally {
    if (await pathExists(path.join(root, ".hito"))) throw new Error("HITO G16 attach boundary violated: .hito was created");
  }
  const applicationAfter = await nonHitoTreeIdentity(root);
  if (applicationAfter !== applicationBefore) throw new Error("HITO G16 attach boundary violated: non-HITO target bytes changed");
  result.applicationFilesByteExact = true;
  result.effects = effectLedger(root, events);
  return result;
}

/** The only C7 recovery write path. It is fixture-only and delegates to the accepted Phase0 recovery law. */
export async function recoverG16IsolatedFixture(
  projectRoot: string,
  authority: G16IsolatedFixtureAuthority,
  options: G16RecoveryOptions = {},
): Promise<G16RecoveryAdapterResult> {
  if (options === null || typeof options !== "object") throw new Error("HITO G16 recovery options must be structured");
  assertExactKeys(options, RECOVERY_OPTION_KEYS, "HITO G16 recovery options");
  const root = await assertFixtureAuthority(projectRoot, authority, "RECOVER_HITO_OWNED_STATE");
  const applicationBefore = await nonHitoTreeIdentity(root);
  const beforeClassification = await classifyPersistenceState(root);
  let beforeHistory: HistoryEvent[] = [];
  try {
    beforeHistory = (await readCanonicalRevisionValidated(root)).history;
  } catch {
    // Absence/divergence is represented; recovery must not fabricate it.
  }
  const events: Array<{ absolutePath: string; role: DurabilityRole }> = [];
  let recovery: RecoveryResult | null = null;
  let refusedReason: string | undefined;
  try {
    recovery = await recoverStagedRevision(root, options.quarantineLabel ?? "hito-c7-recovery-0001", {
      durabilityObserver: {
        onDurableWrite: (filePath, role) => { events.push({ absolutePath: filePath, role }); },
      },
      allowMalformedLockRecovery: false,
    });
  } catch (error) {
    refusedReason = error instanceof Error ? error.message : "recovery refused";
  }
  const afterClassification = await classifyPersistenceState(root);
  let afterSnapshot: PersistenceSnapshot | undefined;
  try {
    afterSnapshot = await readCanonicalRevisionValidated(root);
  } catch {
    // A fail-closed state may intentionally have no validated canonical truth.
  }
  if (await pathExists(path.join(root, ".hito"))) throw new Error("HITO G16 recovery boundary violated: .hito was created");
  const applicationAfter = await nonHitoTreeIdentity(root);
  if (applicationAfter !== applicationBefore) throw new Error("HITO G16 recovery boundary violated: non-HITO target bytes changed");
  const status: G16RecoveryAdapterResult["status"] = refusedReason === undefined
    ? (recovery?.status ?? "REFUSED")
    : "REFUSED";
  return {
    kind: "HITO_G16_ISOLATED_FIXTURE_RECOVERY_RESULT",
    status,
    authorityId: authority.authorityId,
    beforeState: beforeClassification.state,
    afterState: afterClassification.state,
    canonicalStateIdentity: afterSnapshot === undefined ? null : snapshotIdentity(afterSnapshot),
    applicationFilesByteExact: true,
    historicalEventPrefixPreserved: afterSnapshot === undefined ? beforeHistory.length === 0 : historicalPrefix(beforeHistory, afterSnapshot.history),
    missingCanonicalTruthFabricated: false,
    applicationRepairPerformed: false,
    result: recovery,
    reason: refusedReason ?? recovery?.reason ?? "recovery completed without additional detail",
    effects: effectLedger(root, events),
  };
}

/** Exposes only the inherited .maat persistence paths; it does not create them. */
export function g16CanonicalPersistencePaths(projectRoot: string): ReturnType<typeof persistencePaths> {
  return persistencePaths(projectRoot);
}


import type { HitoFirstObservationRequest, HitoFirstObservationResult } from "../contracts/model";
import { deriveHitoFirstObservation } from "./g15-universal-protocol-projection";

/** Explicit read-only first-observation API; legacy G16/C7 functions are unchanged. */
export function observeHitoFirst(request: HitoFirstObservationRequest): {
  result: HitoFirstObservationResult;
  instrumentation: Record<string, { state: "MEASURED" | "UNAVAILABLE" | "NOT_APPLICABLE"; value: number | null; unit: string; basis: string }>;
} {
  const started = performance.now();
  const result = deriveHitoFirstObservation(request);
  const truthAt = performance.now() - started;
  const unavailable = (basis: string) => ({ state: "UNAVAILABLE" as const, value: null, unit: "unspecified", basis });
  const measured = (value: number, unit: string, basis: string) => ({ state: "MEASURED" as const, value, unit, basis });
  const instrumentation = {
    time_to_first_useful_truth: measured(truthAt, "ms", "API entry to validated bounded documentary result and explicit gaps; excludes acquisition"),
    time_to_first_useful_pulse: unavailable("No user-visible host pulse rendered by this semantic API"),
    time_to_first_correct_next_step_or_no_justified_next: measured(truthAt, "ms", "NO_JUSTIFIED_NEXT_STEP derived with result; excludes acquisition"),
    files_examined_before_useful_truth: unavailable("Supplied UTF-8 evidence was examined in memory; physical files were not opened"),
    bytes_examined_before_useful_truth: measured(result.documentaryEvidence.reduce((n, e) => n + Buffer.byteLength(e.content, "utf8"), 0), "bytes", "Supplied documentary UTF-8 bytes hash-verified"),
    total_project_files: unavailable("No project census performed"),
    semantic_coverage: unavailable("PARTIAL with named unavailable dimensions; no justified numeric denominator"),
    unknown_count: measured(Object.values(result.dimensions).filter((s) => s === "UNAVAILABLE" || s === "INDETERMINATE").length, "dimensions", "Explicit unavailable or indeterminate semantic dimensions"),
    excluded_evidence_count: measured(0, "records", "Accepted request only; invalid evidence rejects the whole request"),
    incorrect_claim_count: unavailable("Requires independent assessment"),
    human_intervention_count: unavailable("Not observed by this API"),
    refresh_cost: { state: "NOT_APPLICABLE" as const, value: null, unit: "ms", basis: "NO_PRIOR_STATE_ADMITTED" },
    changed_files_since_previous_run: { state: "NOT_APPLICABLE" as const, value: null, unit: "files", basis: "NO_PRIOR_STATE_ADMITTED" },
  };
  return { result, instrumentation };
}
