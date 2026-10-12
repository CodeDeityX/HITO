import { type G15CheckProjection, type G15FreshnessWatermark, type G15GovernedTruth, type G15HistoryProjection, type G15MaterialState, type G15MaterialStateGroup, type G15NextStep, type G15ProjectedIntent, type G15ProjectionMode, type G15ProjectionView } from "../../convergence/g15-universal-protocol-projection";
import { type G16InstallabilityMigrationRecoveryAssessment } from "../../convergence/g16-installability-migration-recovery";
import type { HitoC7CompositionSnapshot } from "../../convergence/runtime";
import type { EngineeringMriProjection, ProjectPulseProjection } from "../../phase3/projection";
export declare const HITO_PRE_C9_HOST_PROTOCOL_VERSION: "hito-pre-c9-host-protocol-v1";
export declare const HITO_PRE_C9_HOST_AUTHORITY: "DERIVED / DETERMINISTIC / READ_ONLY / NON_CANONICAL / NONEXECUTING / HOST_PROJECTION_ONLY";
export interface HitoHostSourceReference {
    sourcePath: string;
    sourceAuthority: string;
    sourceIdentity: string | null;
    presentationTransform: "NONE" | "G15_SANITIZED_COPY" | "EXACT_TYPED_SUBSET";
}
export interface HitoHostField<T> {
    value: T;
    provenance: readonly HitoHostSourceReference[];
    semanticAuthority: false;
    executionAuthority: false;
}
export interface HitoHostProjectPulse {
    phase3Pulse: ProjectPulseProjection;
    status: G15GovernedTruth["overallStatus"];
    currentClaim: G15ProjectionView["currentClaim"];
    materialStateGroups: G15MaterialStateGroup[];
    materialStateCount: number;
    answers: G15ProjectionView["answers"];
}
export interface HitoHostNext {
    nextStep: G15NextStep;
    actionRoute: G15GovernedTruth["actionRoute"];
    explanation: string;
    mutatingCommand: null;
}
export interface HitoHostWhy {
    explanation: string;
    materialStateGroups: G15MaterialStateGroup[];
    materialStates: G15MaterialState[];
    semanticVerdictIdentity: string;
}
export interface HitoHostEvidence {
    phase3EvidenceClasses: ProjectPulseProjection["evidence"];
    checks: G15CheckProjection;
    evidenceHead: G15FreshnessWatermark["evidenceHead"];
    evidenceApplicability: G15FreshnessWatermark["evidenceApplicability"];
}
export interface HitoHostRuntimeState {
    phase3Runtime: ProjectPulseProjection["runtime"];
    operationalMode: G16InstallabilityMigrationRecoveryAssessment["operationalMode"];
    discovery: G16InstallabilityMigrationRecoveryAssessment["discovery"];
    reconciliation: G16InstallabilityMigrationRecoveryAssessment["reconciliation"];
    compatibility: G16InstallabilityMigrationRecoveryAssessment["compatibility"];
    migration: G16InstallabilityMigrationRecoveryAssessment["migration"];
}
export interface HitoHostCoverage {
    observationCoverage: G15FreshnessWatermark["observationCoverage"];
    observationApplicability: G15FreshnessWatermark["observationApplicability"];
    evidenceApplicability: G15FreshnessWatermark["evidenceApplicability"];
    coverageMaterialStates: G15MaterialState[];
    support: G16InstallabilityMigrationRecoveryAssessment["support"];
    enforcementCoverage: G16InstallabilityMigrationRecoveryAssessment["enforcementCoverage"];
}
export interface HitoHostIntentProvenance {
    governedAndPresentedIntents: G15ProjectedIntent[];
    extractedIntentCandidates: NonNullable<G16InstallabilityMigrationRecoveryAssessment["discovery"]["observation"]>["extractedIntentCandidates"];
    declaredIntentImported: false;
}
export interface HitoHostProtocolProjection {
    kind: "HITO_PRE_C9_HOST_PROTOCOL_PROJECTION";
    protocolVersion: typeof HITO_PRE_C9_HOST_PROTOCOL_VERSION;
    authority: typeof HITO_PRE_C9_HOST_AUTHORITY;
    mode: G15ProjectionMode;
    source: {
        c7CompositionIdentity: string;
        c6CompositionIdentity: string;
        g15EnvelopeIdentity: string;
        semanticVerdictIdentity: string;
        g16AssessmentIdentity: string;
        phase3PulseIdentity: string;
        phase3MriIdentity: string;
        selectedViewIdentity: string;
    };
    projectPulse: HitoHostField<HitoHostProjectPulse>;
    next: HitoHostField<HitoHostNext>;
    why: HitoHostField<HitoHostWhy>;
    mri: HitoHostField<EngineeringMriProjection>;
    history: HitoHostField<G15HistoryProjection>;
    evidence: HitoHostField<HitoHostEvidence>;
    protectedAuthorities: HitoHostField<G15MaterialState[]>;
    runtimeState: HitoHostField<HitoHostRuntimeState>;
    freshness: HitoHostField<G15FreshnessWatermark>;
    coverage: HitoHostField<HitoHostCoverage>;
    intentProvenance: HitoHostField<HitoHostIntentProvenance>;
    uxAnswers: G15ProjectionView["answers"];
    governanceBoundary: {
        hostNeutral: true;
        derivedOnly: true;
        readOnly: true;
        canonicalAuthority: false;
        ontologyAuthority: false;
        nextStepAuthority: false;
        realityJudgeAuthority: false;
        executionAuthority: false;
        browserDependency: false;
        modelProviderDependency: false;
    };
    zeroEffectCounters: {
        canonicalWrites: 0;
        hitoStateWrites: 0;
        targetMutations: 0;
        targetExecutions: 0;
        providerModelCalls: 0;
        unauthorizedNetworkCalls: 0;
        gitMutations: 0;
        hitoNamespaceCreations: 0;
        namespaceMigrations: 0;
    };
}
/**
 * Validates only source binding and zero-effect invariants. Semantic decisions
 * remain owned by the existing C7/G15/G16 runtime and are never recomputed here.
 */
export declare function assertHitoHostC7Snapshot(value: unknown): asserts value is HitoC7CompositionSnapshot;
/** Mechanical host projection over an already-composed, same-call C7 snapshot. */
export declare function projectHitoHostProtocol(snapshot: HitoC7CompositionSnapshot, mode: G15ProjectionMode): HitoHostProtocolProjection;
import type { HitoFirstObservationResult } from "../../contracts/model";
export declare const HITO_FIRST_OBSERVATION_HOST_VERSION: "hito-first-observation-host-r1";
export declare function projectHitoFirstObservationHost(result: HitoFirstObservationResult): {
    kind: "HITO_FIRST_OBSERVATION_HOST_PAYLOAD";
    version: "hito-first-observation-host-r1";
    mode: "FIRST_OBSERVATION";
    priorState: "NO_PRIOR_STATE_ADMITTED";
    semanticResult: HitoFirstObservationResult;
    source: {
        semanticResultIdentity: string;
        subjectIdentity: string;
    };
    boundary: {
        derivedOnly: true;
        canonicalAuthority: false;
        ontologyAuthority: false;
        executionAuthority: false;
    };
};
