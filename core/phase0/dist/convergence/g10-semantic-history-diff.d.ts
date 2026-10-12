import { type CanonicalModel, type HistoryEvent } from "../contracts";
import { type G8EngineeringRealityComparisonResult, type G8EngineeringRealityProjection } from "./g8-engineering-reality";
import { type G9TransitionCompletionAssessment } from "./g9-transition-completion";
export declare const G10_SEMANTIC_HISTORY_DIFF_RULESET_VERSION: "hito-semantic-history-diff-v1";
export declare const G10_SEMANTIC_HISTORY_DIFF_AUTHORITY: "DERIVED / DETERMINISTIC / PROVENANCE_BOUND / READ_ONLY / NON_CANONICAL / NON_EXECUTING";
export declare const G10_CONTRACT_SHA256: "f347ec8478d04df993478bfa0a4e47ddecc185c1f9e92a383a94852b94d137ee";
export declare const G10_MODEL_SHA256: "b1e7a2628183515ac725f8fd3943a797c69aa8452d5b8f933eae605bec18808a";
export declare const G10_CASES_SHA256: "1c5aeff51721555a48cd595d4055a0a674706c946162782ca91206ba4d8b31a2";
export declare const G10_TRACEABILITY_SHA256: "fbe3d59e224a03263ff62c3604817ca6716493d50fa01e4b39b211be8c227990";
export declare const G10_CONTINUITY_SHA256: "bdf698c30dfd8109670ac4e280daacf81b2e54fd21062b484ad5cc9b23472554";
export declare const G10_MANIFEST_SHA256: "abe0e20aaed83134cbfb60bdcb2485b2bcd7805ebba71a690885629fd960a89a";
export type G10DiffAssessment = "NO_SEMANTIC_DIFFERENCE" | "SEMANTIC_DIFFERENCE" | "INDETERMINATE";
export type G10CausalRelation = "SAME_POSITION" | "PREDECESSOR_OF_SUCCESSOR" | "SUCCESSOR_OF_PREDECESSOR" | "DIVERGENT" | "INDETERMINATE";
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
/**
 * Projects a bounded causal view over the existing canonical history and an exact G8 comparison.
 * It never persists history, creates a second ledger, repairs a chain, or treats timestamps as causality.
 */
export declare function deriveG10SemanticHistoryDiff(input: G10SemanticHistoryDiffInput): G10SemanticHistoryDiffProjection;
