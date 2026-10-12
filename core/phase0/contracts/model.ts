export type IsoTimestamp = string;

export type ObservationClass =
  | "EXPLICIT"
  | "OBSERVED"
  | "RECONCILED"
  | "INFERRED"
  | "UNKNOWN";

export type IntentAuthority = "DECLARED_INTENT" | "EXTRACTED_INTENT_CANDIDATE";

export type LifecycleStatus =
  | "PROPOSED"
  | "APPROVED"
  | "IMPLEMENTING"
  | "LIVE"
  | "PARTIAL"
  | "BLOCKED"
  | "DEGRADED"
  | "UNKNOWN"
  | "NOT_FOUND"
  | "DEPRECATED"
  | "SUPERSEDED"
  | "RETIRED";

export type HealthStatus =
  | "HEALTHY"
  | "HEALTHY_WITH_OBSERVATIONS"
  | "RECONCILIATION_REQUIRED"
  | "REPAIR_REQUIRED"
  | "BLOCKED"
  | "INDETERMINATE";

export type CapabilityVerificationState =
  | "UNVERIFIED"
  | "SOURCE_VERIFIED"
  | "BUILD_VERIFIED"
  | "TEST_VERIFIED"
  | "NATIVE_RUNTIME_VERIFIED"
  | "EXTERNALLY_REVIEWED"
  | "PRODUCTION_VERIFIED";

export type RuntimeTruthLevel =
  | "SOURCE_ONLY"
  | "BUILD_VERIFIED"
  | "TEST_VERIFIED"
  | "NATIVE_RUNTIME_VERIFIED"
  | "EXTERNAL_RUNTIME_VERIFIED"
  | "PRODUCTION_VERIFIED";

export type ClaimStatus =
  | "PROVEN"
  | "PARTIALLY_PROVEN"
  | "BETA_SAFE"
  | "ROADMAP_ONLY"
  | "UNSUPPORTED"
  | "UNSAFE"
  | "REMOVE";

export type FindingSeverity = "INFO" | "WARNING" | "HIGH" | "CRITICAL";

export type StalenessState =
  | "FRESH"
  | "STALE_MODEL"
  | "STALE_HISTORY"
  | "STALE_EVIDENCE"
  | "STALE_RULESET"
  | "INVALID";

export type DerivedOutputKind =
  | "PROJECT_PULSE"
  | "MRI_VERDICT"
  | "DRIFT_REPORT"
  | "NEXT_SAFE_MUTATION"
  | "REALITY_JUDGE";

export type CapabilityLifecycleEvent =
  | "INTRODUCED"
  | "RENAME"
  | "MOVE"
  | "MERGED_INTO"
  | "SPLIT_INTO"
  | "SUPERSEDES"
  | "RETIRED"
  | "RESTORED";

export type FindingGovernanceDecision =
  | "ACKNOWLEDGED"
  | "ACCEPTED_DIAGNOSIS"
  | "SUPPRESSED"
  | "ESCALATED"
  | "RESOLVED";

export type PermissionScope =
  | "READ_PROJECT"
  | "READ_GIT_METADATA"
  | "WRITE_MAAT_STATE"
  | "RUN_APPROVED_PROBE"
  | "NETWORK_OUTBOUND"
  | "READ_SECRET_CANDIDATE"
  | "WRITE_PROJECT"
  | "COMMIT_OR_PUSH"
  | "CLOUD_SYNC";

export type RelationshipType =
  | "FULFILLS"
  | "REQUIRES"
  | "OWNS"
  | "HOMES"
  | "IMPLEMENTS"
  | "EXPOSES"
  | "CALLS"
  | "CONSUMES"
  | "PRODUCES"
  | "PERSISTS"
  | "EMITS"
  | "VALIDATES"
  | "GOVERNS"
  | "PROJECTS"
  | "DEPENDS_ON"
  | "BLOCKS"
  | "RECOVERS"
  | "SUPERSEDES"
  | "EVIDENCED_BY";

export interface EntityProvenance {
  observationClass: ObservationClass;
  source: string;
  sourceRef?: string;
  confidence: number;
  observedAt: IsoTimestamp;
  modelRevision: number;
}

export interface IntentAuthorityProof {
  proofId: string;
  kind: "OWNER_CONFIRMATION" | "RECOVERED_AUTHORITY";
  confirmedBy: string;
  confirmedAt: IsoTimestamp;
  sourceRecordId: string;
  lineageEventIds: string[];
}

export interface HistoryHead {
  sequence: number;
  eventHash: string;
}

export interface EvidenceHead {
  sequence: number;
  manifestHash: string;
}

export interface IntegrityState {
  /** SHA-256 of canonical model JSON after excluding this field. */
  modelHash: string;
  /** SHA-256 of exact UTF-8 history bytes through historyHead. */
  historyHash: string;
  /** SHA-256 of deterministic canonical evidence-manifest serialization. */
  evidenceManifestHash: string;
}

export interface CanonicalState {
  modelRevision: number;
  historyHead: HistoryHead;
  evidenceHead: EvidenceHead;
  integrity: IntegrityState;
}

export interface Project {
  projectId: string;
  name: string;
  root: string;
  repository?: string;
  projectType: string;
  health: HealthStatus;
  provenance: EntityProvenance;
}

export interface IntentPromise {
  promiseId: string;
  projectId: string;
  statement: string;
  authority: IntentAuthority;
  requirements: string[];
  constraints: string[];
  authorityProof?: IntentAuthorityProof;
  provenance: EntityProvenance;
}

export interface Requirement {
  requirementId: string;
  promiseId: string;
  statement: string;
  phaseId?: string;
  capabilityIds: string[];
  provenance: EntityProvenance;
}

export interface Phase {
  phaseId: string;
  projectId: string;
  name: string;
  status: LifecycleStatus;
  capabilityIds: string[];
  entryCriteria: string[];
  exitCriteria: string[];
  lockVerdict?: string;
  provenance: EntityProvenance;
}

export interface Subsystem {
  subsystemId: string;
  projectId: string;
  name: string;
  responsibility: string;
  capabilityIds: string[];
  provenance: EntityProvenance;
}

export interface RuntimeHome {
  runtimeHomeId: string;
  capabilityId: string;
  kind: "PROCESS" | "SERVICE" | "MODULE" | "WORKER" | "FUNCTION" | "OTHER";
  locator: string;
  entryPoints: string[];
  stateOwner?: string;
  eventOwner?: string;
  persistenceOwner?: string;
  effectiveFromRevision: number;
  effectiveToRevision?: number;
  status: LifecycleStatus;
  provenance: EntityProvenance;
}

export interface Edge {
  edgeId: string;
  sourceId: string;
  targetId: string;
  relationship: RelationshipType;
  status: LifecycleStatus;
  provenance: EntityProvenance;
  evidenceIds: string[];
}

export interface Claim {
  claimId: string;
  subjectId: string;
  statement: string;
  location: string;
  claimType: string;
  promiseId?: string;
  capabilityId?: string;
  audience: string;
  environment: string;
  evidenceRequirement: string;
  truthBoundary: string;
  limitations: string[];
  status: ClaimStatus;
  requiredAction: string;
  reviewer?: string;
  evidenceIds: string[];
  provenance: EntityProvenance;
}

export interface Evidence {
  evidenceId: string;
  subjectId: string;
  source: string;
  environment: string;
  artifactPath?: string;
  verificationLevel: RuntimeTruthLevel;
  capturedAt: IsoTimestamp;
  contentHash: string;
  available: boolean;
  truthBoundary: string;
  reproducibility: string;
  provenance: EntityProvenance;
}

export interface Decision {
  decisionId: string;
  context: string;
  options: string[];
  selectedOutcome: string;
  rationale: string;
  affectedEntityIds: string[];
  effectiveRevision: number;
  provenance: EntityProvenance;
}

export interface Mutation {
  mutationId: string;
  reason: string;
  affectedEntityIds: string[];
  expectedEffect: string;
  proposal: string;
  risk: string;
  rollbackPath: string;
  proofPlan: string[];
  status: "PROPOSED" | "APPROVED" | "REJECTED" | "COMPLETED" | "ABORTED";
  evidenceIds: string[];
  effectiveRevision?: number;
  provenance: EntityProvenance;
}

export interface Capability {
  capabilityId: string;
  name: string;
  purpose: string;
  questionAnswered: string;
  promiseIds: string[];
  requirementIds: string[];
  owningSubsystemId: string;
  runtimeHomeId: string | null;
  runtimeGap: boolean;
  historicalRuntimeHomeIds: string[];
  implementationRefs: string[];
  dependencies: string[];
  dependents: string[];
  lifecycleStatus: LifecycleStatus;
  health: HealthStatus;
  verificationState: CapabilityVerificationState;
  runtimeTruthLevel: RuntimeTruthLevel;
  evidenceIds: string[];
  claimBoundary: string;
  phaseId?: string;
  lineageEventIds: string[];
  derivedOutputRefs: string[];
  /** Optional pointer only; it is never current canonical capability truth. */
  nextSafeMutationRef?: string;
  aliases: string[];
  provenance: EntityProvenance;
}

export interface CapabilityLineageEvent {
  eventId: string;
  capabilityId: string;
  type: CapabilityLifecycleEvent;
  fromCapabilityIds: string[];
  toCapabilityIds: string[];
  previousRuntimeHomeId?: string;
  nextRuntimeHomeId?: string;
  reason: string;
  authority: "EXPLICIT" | "RECONCILED";
  effectiveRevision: number;
  evidenceIds: string[];
  provenance: EntityProvenance;
}

export interface DerivedFinding {
  findingId: string;
  category: "DRIFT" | "DUPLICATE" | "RUNTIME_GAP" | "EVIDENCE_GAP" | "CLAIM_SAFETY" | "OTHER";
  summary: string;
  severity: FindingSeverity;
  confidence: number;
  evidenceIds: string[];
  affectedEntityIds: string[];
  requiredAction?: string;
  rulesetVersion: string;
  derivedOutputId: string;
  provenance: EntityProvenance;
}

export interface FindingRef {
  findingId: string;
  derivedOutputId: string;
  sourceModelRevision: number;
  status: "CURRENT" | "STALE" | "SUPERSEDED";
}

export interface FindingGovernance {
  findingGovernanceId: string;
  findingId: string;
  derivedOutputId: string;
  decision: FindingGovernanceDecision;
  reason: string;
  scope: string;
  authority: string;
  evidenceIds: string[];
  effectiveRevision: number;
  historyEventIds: string[];
  provenance: EntityProvenance;
}

export interface ReleaseGate {
  gateId: string;
  name: string;
  criterion: string;
  status: "OPEN" | "PASSED" | "BLOCKED" | "UNKNOWN";
  evidenceIds: string[];
  blocker: boolean;
  promiseIds: string[];
  provenance: EntityProvenance;
}

export interface DerivedOutput {
  derivedOutputId: string;
  kind: DerivedOutputKind;
  sourceModelRevision: number;
  sourceHistoryHead: HistoryHead;
  sourceEvidenceHead: EvidenceHead;
  rulesetVersion: string;
  generatedAt: IsoTimestamp;
  generatingVersion: string;
  provenance: {
    inputEntityIds: string[];
    evidenceIds: string[];
    ruleIds: string[];
    derivationSteps: string[];
  };
  stalenessState: StalenessState;
  findings?: DerivedFinding[];
  nextSafeMutation?: Mutation;
}

export interface DerivedOutputRef {
  derivedOutputId: string;
  kind: DerivedOutputKind;
  sourceModelRevision: number;
  stalenessState: StalenessState;
}

export interface ScanRecord {
  scanId: string;
  scope: string;
  adapterIds: string[];
  status: "PLANNED" | "COMPLETED" | "INDETERMINATE" | "FAILED";
  startedAt: IsoTimestamp;
  completedAt?: IsoTimestamp;
  evidenceIds: string[];
  provenance: EntityProvenance;
}

export type ReconciliationCandidateKind = "PROJECT" | "SUBSYSTEM" | "CAPABILITY" | "RUNTIME_HOME";
export type ReconciliationCandidateStatus = "MATCHED" | "INTRODUCED" | "AMBIGUOUS" | "CONFLICT" | "HISTORICAL";

export interface ReconciliationCandidate {
  kind: ReconciliationCandidateKind;
  candidateId: string;
  anchor: string;
  label: string;
  status: ReconciliationCandidateStatus;
  sourcePaths: string[];
  matchedPriorId?: string;
  alternatives?: string[];
  provenance: EntityProvenance;
}

export interface ReconciliationAmbiguity {
  kind: ReconciliationCandidateKind;
  anchor: string;
  candidateIds: string[];
  reason: "AMBIGUOUS_SUCCESSOR" | "AMBIGUOUS_PROJECT";
}

export interface ReconciliationConflict {
  kind: ReconciliationCandidateKind;
  anchor: string;
  candidateIds: string[];
  reason: "RUNTIME_HOME_CONFLICT";
}

export interface ReconciliationTrace {
  traceId: string;
  scanFingerprint: string;
  modelRevision: number;
  candidates: ReconciliationCandidate[];
  ambiguities: ReconciliationAmbiguity[];
  conflicts: ReconciliationConflict[];
  provenance: EntityProvenance;
}

export interface CanonicalModel {
  schemaVersion: string;
  project: Project;
  intent: IntentPromise[];
  releaseContract: string;
  requirements: Requirement[];
  phases: Phase[];
  subsystems: Subsystem[];
  capabilities: Capability[];
  runtimeHomes: RuntimeHome[];
  interfaces: Edge[];
  edges: Edge[];
  configurationItems: string[];
  claims: Claim[];
  evidenceRefs: Evidence[];
  releaseGates: ReleaseGate[];
  derivedOutputRefs: DerivedOutputRef[];
  findingRefs: FindingRef[];
  findingGovernance: FindingGovernance[];
  scans: ScanRecord[];
  decisions: Decision[];
  mutations: Mutation[];
  capabilityLineage: CapabilityLineageEvent[];
  reconciliationTrace?: ReconciliationTrace;
  canonicalState: CanonicalState;
  provenance: EntityProvenance;
}

export interface HistoryEvent {
  sequence: number;
  type: string;
  payload: unknown;
  previousEventHash: string | null;
  eventHash: string;
}

export interface EvidenceManifestEntry {
  evidenceId: string;
  contentHash: string;
  artifactPath?: string;
  available: boolean;
}

export interface EvidenceManifest {
  schemaVersion: string;
  entries: EvidenceManifestEntry[];
}

export interface EvidenceValidationOptions {
  projectRoot?: string;
  evidenceManifest?: EvidenceManifest;
  derivedOutputs?: DerivedOutput[];
}


/** First observation is a noncanonical request, never a CanonicalModel revision. */
export interface HitoFirstObservationRequest {
  mode: "FIRST_OBSERVATION";
  priorState: "NO_PRIOR_STATE_ADMITTED";
  subjectIdentity: string;
  documentaryEvidence: Array<{
    evidenceId: string;
    authorityClass: "DOCUMENTARY_EVIDENCE_ONLY";
    content: string;
    provenance: {
      subjectIdentity: string;
      sourcePath: string;
      contentSha256: string;
      capturedAt: string;
    };
  }>;
}

export interface HitoFirstObservationResult {
  kind: "HITO_FIRST_OBSERVATION_SEMANTIC_RESULT";
  version: "hito-first-observation-semantic-r1";
  mode: "FIRST_OBSERVATION";
  priorState: "NO_PRIOR_STATE_ADMITTED";
  subjectIdentity: string;
  semanticResultIdentity: string;
  documentaryEvidence: HitoFirstObservationRequest["documentaryEvidence"];
  dimensions: {
    declaredIntent: "UNAVAILABLE";
    canonicalAuthority: "UNAVAILABLE";
    runtimeState: "UNAVAILABLE";
    ownership: "UNAVAILABLE";
    integration: "UNAVAILABLE";
    conflictAssessment: "INDETERMINATE";
    comparativeHistory: "NOT_APPLICABLE";
  };
  coverage: { state: "PARTIAL"; completeUnderstanding: false; warning: string };
  nextStep: { state: "NO_JUSTIFIED_NEXT_STEP"; executionAuthority: false; mutatingCommand: null };
  boundary: { derivedOnly: true; canonicalAuthority: false; ontologyAuthority: false; executionAuthority: false };
}
