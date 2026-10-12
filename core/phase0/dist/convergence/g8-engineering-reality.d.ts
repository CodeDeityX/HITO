import { type CanonicalModel } from "../contracts";
import { PHASE3_RULESET_VERSION, type Phase3ProjectionBundle } from "../phase3/projection";
import { type SemanticJson } from "./semantic-canonicalization";
export declare const G8_ENGINEERING_REALITY_RULESET_VERSION: "hito-engineering-reality-derived-projection-v1-repair2";
export declare const G8_SEMANTIC_IDENTITY_SCHEME: "hito-engineering-reality-semantic-identity-v1";
export declare const G8_ENGINEERING_REALITY_AUTHORITY: "DERIVED / DETERMINISTIC / PROVENANCE_BOUND / READ_ONLY / NON_CANONICAL / NON_EXECUTING";
export type G8SemanticComparison = "SAME" | "DIFFERENT" | "INDETERMINATE";
export type G8ContextDelta = "NONE" | "REFRESH_ONLY";
export type G8SemanticAuthorityState = "RESOLVED" | "UNKNOWN" | "STALE" | "UNAVAILABLE" | "UNAUTHENTICATED" | "CONFLICTING";
export type G8ContextFactKind = "FRESHNESS" | "RECOLLECTION" | "AVAILABILITY" | "PROVIDER_STATE" | "TOOL_STATE" | "GIT_STATE" | "EDITOR_STATE" | "BACKUP_SYNC_STATE" | "PERSISTENCE_RECOVERY" | "EQUIVALENT_EVIDENCE_MULTIPLICITY" | "EXTRACTED_INTENT_CANDIDATE_PROVENANCE";
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
/** Internal composition seam: C1 supplies the exact Phase-3 output it derived in the same call. */
export declare function deriveG8EngineeringRealityFromSameCallPhase3(model: CanonicalModel, phase3: Phase3ProjectionBundle, request: G8EngineeringRealityRequest): G8EngineeringRealityProjection;
/** Direct G8 authority; it reuses the accepted Phase-3 derivation without copying its policy. */
export declare function deriveG8EngineeringReality(model: CanonicalModel, request: G8EngineeringRealityRequest): G8EngineeringRealityProjection;
export declare function compareG8EngineeringReality(predecessor: G8EngineeringRealityProjection, successor: G8EngineeringRealityProjection): G8EngineeringRealityComparisonResult;
