import { persistencePaths, type CanonicalModel, type CommitFailpoint, type DurabilityRole, type PersistenceSnapshot, type RecoveryResult, type TransactionState } from "../contracts";
import type { Phase1InventoryClassification } from "../phase1/scanner";
import type { HitoC6CompositionSnapshot } from "./runtime";
export declare const G16_INSTALLABILITY_MIGRATION_RECOVERY_RULESET_VERSION: "hito-installability-migration-recovery-v1";
export declare const G16_INSTALLABILITY_MIGRATION_RECOVERY_AUTHORITY: "DERIVED / DETERMINISTIC / BOUNDED OPERATIONAL ASSESSMENT / NON_ONTOLOGY / NONEXECUTING";
export declare const G16_ENGINE_PROTOCOL_IDENTITY: "hito-engine-protocol-c7-v1";
export declare const G16_SUPPORTED_CANONICAL_SCHEMA_VERSION: "0.1.0";
export declare const G16_CONTRACT_SHA256: "6cad5aa8705359e73f4ac7ea802be246bdc9df6a885086642a6eeb780d28063d";
export declare const G16_MODEL_SHA256: "b091b3750fb023eb7af4c20887b7e475d059e126080883ff88b638d03fc59f61";
export declare const G16_CASES_SHA256: "c168a8bb3d9117ce31b0aa5f0267c6e7c04a3f6820f3064fcf35f7166bc1b60a";
export declare const G16_TRACEABILITY_SHA256: "6bb40b3babd8a079e26adefc13e9e7d5424e25c7b6492ebb70c1f27ef36bb18c";
export declare const G16_CONTINUITY_SHA256: "1fbf7866c2abf0c53e791d522581a30ca1104d42d032cc47bf23b9cee594252f";
export declare const G16_MANIFEST_SHA256: "c2ec4308ded4238ab03c2255125fa3c3a9a7eeead176f82d7b71640296222c88";
export declare const G16_OPERATIONAL_MODES: readonly ["UNATTACHED", "OBSERVATION_DISCOVERY", "GOVERNED_ATTACHED", "RECOVERY", "EMERGENCY_CONTINUITY", "RECONCILIATION"];
export type G16OperationalMode = typeof G16_OPERATIONAL_MODES[number];
export declare const G16_SUPPORT_DECLARATION_STATES: readonly ["SUPPORTED", "PARTIALLY_SUPPORTED", "UNQUALIFIED", "UNSUPPORTED", "INDETERMINATE"];
export type G16SupportDeclarationState = typeof G16_SUPPORT_DECLARATION_STATES[number];
export type G16CanonicalAvailability = "ABSENT" | "VALIDATED_CANONICAL" | "RECOVERY_REQUIRED" | "INDETERMINATE";
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
    unknowns: Array<{
        code: string;
        relativePath?: string;
        detail: string;
    }>;
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
        scopedTerritories: Array<{
            category: string;
            scopeIdentity: string;
            globalImpact: boolean;
        }>;
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
/** Pure deterministic G16 assessment over the exact same-call C6 authority. */
export declare function deriveG16InstallabilityMigrationRecovery(input: G16InstallabilityMigrationRecoveryInput): G16InstallabilityMigrationRecoveryAssessment;
export interface G16ReadOnlyDiscoveryOptions {
    relativePaths?: string[];
    maxBytesPerFile?: number;
    observedAt?: string;
}
/** Read-only, command-free discovery adapter. It reuses Phase2 reconstruction in memory and never persists it. */
export declare function discoverG16ProjectReadOnly(projectRoot: string, options?: G16ReadOnlyDiscoveryOptions): Promise<G16DiscoveryObservation>;
export declare const G16_ISOLATED_FIXTURE_BOUNDARY: "HITO_C7_ISOLATED_TEST_FIXTURE_ONLY";
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
    durabilityEvents: Array<{
        relativePath: string;
        role: DurabilityRole;
    }>;
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
export declare function g16FixtureRootIdentity(projectRoot: string): Promise<string>;
/** The only C7 attach write path. It is root-bound, fixture-only, .maat-only, and delegates to Phase0 persistence. */
export declare function attachG16IsolatedFixture(projectRoot: string, snapshot: PersistenceSnapshot, authority: G16IsolatedFixtureAuthority, options?: G16AttachOptions): Promise<G16AttachResult>;
/** The only C7 recovery write path. It is fixture-only and delegates to the accepted Phase0 recovery law. */
export declare function recoverG16IsolatedFixture(projectRoot: string, authority: G16IsolatedFixtureAuthority, options?: G16RecoveryOptions): Promise<G16RecoveryAdapterResult>;
/** Exposes only the inherited .maat persistence paths; it does not create them. */
export declare function g16CanonicalPersistencePaths(projectRoot: string): ReturnType<typeof persistencePaths>;
import type { HitoFirstObservationRequest, HitoFirstObservationResult } from "../contracts/model";
/** Explicit read-only first-observation API; legacy G16/C7 functions are unchanged. */
export declare function observeHitoFirst(request: HitoFirstObservationRequest): {
    result: HitoFirstObservationResult;
    instrumentation: Record<string, {
        state: "MEASURED" | "UNAVAILABLE" | "NOT_APPLICABLE";
        value: number | null;
        unit: string;
        basis: string;
    }>;
};

export declare function discoverG16ProjectForReconciliation(projectRoot: string, options?: G16ReadOnlyDiscoveryOptions): Promise<{observation: G16DiscoveryObservation; scan: import("../../phase1/scanner").Phase1ScanResult}>;
