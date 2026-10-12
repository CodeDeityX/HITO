import { type CanonicalModel, type IntentAuthority } from "../contracts";
import type { EngineeringMriProjection } from "../phase3/projection";
import type { Phase4NextSafeMutation } from "../phase4/decision-engine";
import type { HitoC5CompositionSnapshot } from "./runtime";
export declare const G15_UNIVERSAL_PROTOCOL_PROJECTION_RULESET_VERSION: "hito-universal-protocol-projection-v1-repair1";
export declare const G15_UNIVERSAL_PROTOCOL_PROJECTION_AUTHORITY: "DERIVED / DETERMINISTIC / READ_ONLY / NON_CANONICAL / NONEXECUTING / PROJECTION_ONLY";
export declare const G15_CONTRACT_SHA256: "a1db4e865ef6f265c3fa2a34ac0915932181bcbd5c2ef9c699f8fb582fb457ea";
export declare const G15_MODEL_SHA256: "25df991c8f6e5e0235a7ec2585f7f0c4bd50df426ca28044a1762793a526f123";
export declare const G15_CASES_SHA256: "c563c97df4b3ffea11f2f15dde36e2cf9c45b447e261afaf48016609abcd5842";
export declare const G15_TRACEABILITY_SHA256: "9ec0c39c18d8b51b92811b69aedb23d9fb683468e42ed3a8e19855cb1b0324d7";
export declare const G15_CONTINUITY_SHA256: "882d08ddcc26ada71bb722bfa97654c78f9eee55b553c644150cf17730fc263c";
export declare const G15_MANIFEST_SHA256: "4cdade5192394eb679cbe1f3d96489d891e1fd34ef39ecdef68d1c067e80c7d4";
export declare const G15_PROJECTION_MODES: readonly ["GUIDED", "ENGINEER", "FORENSIC"];
export type G15ProjectionMode = typeof G15_PROJECTION_MODES[number];
export type G15SnapshotReadKind = "VALIDATED_CANONICAL" | "FAST_LOCAL";
export type G15OverallStatus = "BOUNDED_CURRENT" | "BOUNDED_ATTENTION" | "GLOBALLY_BLOCKED" | "GLOBALLY_INDETERMINATE";
export type G15LifecycleStage = "IDEA" | "WHAT" | "BUILD" | "CONNECT" | "PROVE" | "RESULT";
export type G15LifecycleState = "COMPLETE" | "PARTIAL" | "BLOCKED" | "UNKNOWN" | "NOT_STARTED";
export type G15MaterialCategory = "UNKNOWN" | "INDETERMINATE" | "CONFLICT" | "CONTRADICTION" | "PROTECTED_AUTHORITY" | "STALE_OR_CAUSALLY_INAPPLICABLE_PROOF" | "DESYNCHRONIZED_TERRITORY" | "MISSING_PROOF" | "MISSING_OR_INSUFFICIENT_AUTHORITY" | "OBSERVATION_COVERAGE_LIMIT" | "NO_JUSTIFIED_NEXT_STEP";
export type G15MaterialSeverity = "BLOCKER" | "LIMIT" | "NOTICE";
export type G15ScopeKind = "PROJECT" | "SUBJECT" | "TARGET" | "EVIDENCE" | "ACTION" | "SEMANTIC_COORDINATE";
export type G15UntrustedPresentationKind = "TARGET_LABEL" | "REPOSITORY_LABEL" | "EVIDENCE_LABEL" | "EXTERNAL_OBSERVER_LABEL" | "MODEL_PROSE" | "AGENT_PROPOSAL" | "RECOMMENDATION" | "COMMITMENT";
export interface G15UntrustedPresentationDatum {
    datumId: string;
    kind: G15UntrustedPresentationKind;
    text: string;
    scope: {
        kind: G15ScopeKind;
        identity: string;
    };
    provenance: string;
}
export interface G15UniversalProtocolProjectionRequest {
    snapshotReadKind: G15SnapshotReadKind;
    /** Explicit empty collection is valid. These values are display data, never authority. */
    presentationData: G15UntrustedPresentationDatum[];
}
export interface G15UniversalProtocolProjectionInput {
    model: CanonicalModel;
    c5: HitoC5CompositionSnapshot;
    request: G15UniversalProtocolProjectionRequest;
}
export interface G15FreshnessWatermark {
    watermarkId: string;
    state: "CURRENT" | "STALE" | "INDETERMINATE" | "FAST_LOCAL_LIMITED";
    snapshotReadKind: G15SnapshotReadKind;
    realityRevisionObserved: number;
    canonicalModelIntegrityHash: string;
    historyHead: {
        sequence: number;
        eventHash: string;
    };
    evidenceHead: {
        sequence: number;
        manifestHash: string;
    };
    observationProjectionIdentity: string;
    observationApplicability: "APPLICABLE" | "NOT_APPLICABLE" | "INDETERMINATE";
    evidenceApplicability: "APPLICABLE" | "NOT_REQUESTED" | "INDETERMINATE";
    observationCoverage: "BOUND_COMPLETE" | "PARTIAL" | "UNOBSERVED" | "UNKNOWN";
    causalPositionIdentity: string;
    reasonCodes: string[];
    currentClaimBounded: true;
}
export interface G15MaterialState {
    materialStateId: string;
    category: G15MaterialCategory;
    severity: G15MaterialSeverity;
    scope: {
        kind: G15ScopeKind;
        identity: string;
        globalImpact: boolean;
    };
    sourceAuthority: string;
    sourceIdentity: string;
    summary: string;
    reasonCodes: string[];
}
export interface G15MaterialStateGroup {
    groupId: string;
    category: G15MaterialCategory;
    severity: G15MaterialSeverity;
    scope: {
        kind: G15ScopeKind;
        identity: string;
        globalImpact: boolean;
    };
    count: number;
    materialStateIds: string[];
    sourceAuthorities: string[];
    headline: string;
}
export interface G15ProjectedIntent {
    intentProjectionId: string;
    recordKind: "CANONICAL_INTENT_RECORD" | "UNTRUSTED_PRESENTATION_RECORD";
    sourceAuthority: IntentAuthority | "UNTRUSTED_PRESENTATION_DATA";
    displayedRole: "DECLARED_GOVERNED_INTENT" | "EXTRACTED_INTENT_CANDIDATE_NOT_AUTHORITY" | "AGENT_PROPOSAL_NOT_CANONICAL_TRUTH" | "RECOMMENDATION_NOT_COMMITMENT" | "COMMITMENT_NOT_EXECUTION_AUTHORITY" | "UNTRUSTED_CONTEXT_ONLY";
    executionAuthority: false;
    scope: {
        kind: G15ScopeKind;
        identity: string;
    };
    text: string;
    provenance: string;
}
export interface G15LifecycleProjection {
    kind: "HITO_G15_GUIDED_LIFECYCLE_PROJECTION";
    stages: Array<{
        stage: G15LifecycleStage;
        state: G15LifecycleState;
        basis: string[];
    }>;
    allowedStates: readonly ["COMPLETE", "PARTIAL", "BLOCKED", "UNKNOWN", "NOT_STARTED"];
    percentagesUsed: false;
    canonicalOntologyAuthority: false;
    truthBoundary: string;
}
export type G15NextStep = {
    state: "PHASE4_NEXT_SAFE_MUTATION";
    sourcePhase4DecisionIdentity: string;
    nextSafeMutationIdentity: string;
    projection: Phase4NextSafeMutation;
    exactSourceAuthorityBound: true;
    executionAuthority: false;
} | {
    state: "NO_JUSTIFIED_NEXT_STEP";
    sourcePhase4DecisionIdentity: null;
    nextSafeMutationIdentity: null;
    reasonCodes: string[];
    exactSourceAuthorityBound: true;
    executionAuthority: false;
};
export interface G15ActionRoute {
    state: "GOVERNED_HANDOFF_AVAILABLE" | "NO_GOVERNED_HANDOFF";
    routeId: string;
    sourceNextSafeMutationIdentity: string | null;
    destination: "SEPARATE_GOVERNED_ACTION_WORKFLOW" | "NONE";
    mutatingCommand: null;
    semanticAuthority: false;
    executionAuthority: false;
}
export interface G15HistoryProjection {
    kind: "HITO_G15_G10_HISTORY_REUSE_PROJECTION";
    sourceProjectionId: string;
    diffAssessment: string;
    causalRelation: string;
    positions: HitoC5CompositionSnapshot["c4"]["c3"]["g10"]["positions"];
    causalEdges: HitoC5CompositionSnapshot["c4"]["c3"]["g10"]["causalEdges"];
    semanticCoordinateDeltas: HitoC5CompositionSnapshot["c4"]["c3"]["g10"]["semanticCoordinateDeltas"];
    secondHistoryStoreCreated: false;
    canonicalAuthority: false;
}
export interface G15CheckProjection {
    kind: "HITO_G15_BOUNDED_CHECK_PROJECTION";
    checks: Array<{
        checkId: string;
        state: "SATISFIED" | "ATTENTION" | "INDETERMINATE" | "NOT_APPLICABLE";
        scope: {
            kind: G15ScopeKind;
            identity: string;
        };
        detail: string;
    }>;
    executionPerformed: false;
    canonicalAuthority: false;
}
export interface G15GovernedTruth {
    semanticVerdictIdentity: string;
    overallStatus: G15OverallStatus;
    projectScopeIdentity: string;
    freshnessWatermark: G15FreshnessWatermark;
    materialStates: G15MaterialState[];
    materialStateGroups: G15MaterialStateGroup[];
    materialStateCount: number;
    warningsDropped: 0;
    nextStep: G15NextStep;
    actionRoute: G15ActionRoute;
    lifecycle: G15LifecycleProjection;
    intents: G15ProjectedIntent[];
    mri: EngineeringMriProjection;
    history: G15HistoryProjection;
    check: G15CheckProjection;
    sourceAuthorities: {
        c5CompositionIdentity: string;
        phase3PulseIdentity: string;
        phase3MriIdentity: string;
        phase4DecisionIdentity: string | null;
        phase5JudgmentIdentity: string | null;
        phase7AssessmentIdentity: string | null;
        g8RealityIdentity: string;
        g9AssessmentIdentity: string | null;
        g10ProjectionIdentity: string;
        g11AssessmentIdentity: string | null;
        g12AssessmentIdentity: string;
        g13AssessmentIdentity: string | null;
        g14ProjectionIdentity: string;
    };
    approximationBoundary: string;
}
export interface G15ProjectionView {
    kind: "HITO_G15_PROTOCOL_VIEW";
    mode: G15ProjectionMode;
    projectionId: string;
    semanticVerdictIdentity: string;
    trustedChrome: {
        origin: "TYPED_HITO_FIELDS_ONLY";
        label: "HITO BOUNDED STATUS";
        status: G15OverallStatus;
    };
    currentClaim: {
        bounded: true;
        freshnessWatermarkId: string;
        freshnessState: G15FreshnessWatermark["state"];
    };
    materialStateGroups: G15MaterialStateGroup[];
    materialStateCount: number;
    hiddenMaterialStateCount: 0;
    warningsDropped: 0;
    lifecycle: G15LifecycleProjection;
    intents: G15ProjectedIntent[];
    answers: {
        whereAmI: string;
        whatAmITryingToDo: string;
        whatIsMissing: string;
        whatNext: string;
        why: string;
        whatIsSafeToChange: string;
        whatShouldINotTouch: string;
        whenIsThisDone: string;
    };
    explanationVerbosity: "MINIMAL_PROGRESSIVE_DISCLOSURE" | "SEMANTIC_DETAIL" | "MAXIMUM_DETERMINISTIC_DETAIL";
    advancedDetailsAvailable: true;
    details: Record<string, unknown>;
}
export interface G15ZeroEffectCounters {
    canonicalWriteCount: 0;
    governedTargetMutationCount: 0;
    targetExecutionCount: 0;
    mergeExecutionCount: 0;
    deploymentExecutionCount: 0;
    providerModelCallCount: 0;
    unauthorizedNetworkCallCount: 0;
    namespaceMigrationCount: 0;
    gitMutationCount: 0;
}
export interface G15UniversalProtocolProjectionEnvelope {
    kind: "HITO_G15_UNIVERSAL_PROTOCOL_PROJECTION_ENVELOPE";
    rulesetVersion: typeof G15_UNIVERSAL_PROTOCOL_PROJECTION_RULESET_VERSION;
    authority: typeof G15_UNIVERSAL_PROTOCOL_PROJECTION_AUTHORITY;
    envelopeId: string;
    semanticVerdictIdentity: string;
    governedTruth: G15GovernedTruth;
    projections: Record<G15ProjectionMode, G15ProjectionView>;
    oneTruthManyProjections: true;
    modelAssistedRenderingUsed: false;
    rendererMayRewriteGovernedFields: false;
    governanceBoundary: {
        derivedOnly: true;
        readOnly: true;
        canonicalAuthority: false;
        ontologyAuthority: false;
        nextSafeMutationAuthority: false;
        realityJudgeAuthority: false;
        observationTruthAuthority: false;
        evidenceTruthAuthority: false;
        targetExecuted: false;
    };
    zeroEffectCounters: G15ZeroEffectCounters;
    truthBoundary: string;
    limitations: string[];
}
/** Projection-only neutralization. The source value is never changed. */
export declare function sanitizeG15ProjectionText(source: string): string;
/** Recursively creates a presentation-safe copy without mutating semantic/canonical input. */
export declare function sanitizeG15ProjectionCopy<T>(value: T): T;
/**
 * Pure G15 projection over one same-call C5 snapshot. It renders and sanitizes
 * existing truth; it never owns, upgrades, resolves, writes, or executes it.
 */
export declare function deriveG15UniversalProtocolProjection(input: G15UniversalProtocolProjectionInput): G15UniversalProtocolProjectionEnvelope;
export declare function selectG15Projection(envelope: G15UniversalProtocolProjectionEnvelope, mode: G15ProjectionMode): G15ProjectionView;
import type { HitoFirstObservationRequest, HitoFirstObservationResult } from "../contracts/model";
/** G15 projection over supplied documentary bytes; performs no discovery or truth promotion. */
export declare function deriveHitoFirstObservation(request: HitoFirstObservationRequest): HitoFirstObservationResult;
/** A caller-supplied result must exactly match the documentary projection, including every gap. */
export declare function assertHitoFirstObservationResult(value: HitoFirstObservationResult): void;
