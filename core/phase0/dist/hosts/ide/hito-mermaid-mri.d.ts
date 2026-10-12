import type { HitoC7CompositionSnapshot } from "../../convergence/runtime";
export declare const HITO_PRE_C9_MERMAID_MRI_VERSION: "hito-pre-c9-mermaid-mri-v1";
export interface HitoMermaidMriOptions {
    maxMriNodes?: number;
    maxMriEdges?: number;
}
export interface HitoMermaidMriProjection {
    kind: "HITO_PRE_C9_DERIVED_MERMAID_MRI";
    version: typeof HITO_PRE_C9_MERMAID_MRI_VERSION;
    diagramIdentity: string;
    sourceMriIdentity: string;
    sourceSemanticVerdictIdentity: string;
    mermaid: string;
    ordering: "UNICODE_CODE_POINT_BY_UPSTREAM_ID";
    completeness: {
        complete: boolean;
        completenessClaimed: boolean;
        truncationApplied: boolean;
        totalMriNodes: number;
        includedMriNodes: number;
        omittedMriNodes: number;
        totalMriEdges: number;
        includedMriEdges: number;
        omittedMriEdges: number;
        totalMaterialStates: number;
        includedMaterialStates: number;
        reasonCodes: string[];
    };
    governanceBoundary: {
        derivedOnly: true;
        canonicalAuthority: false;
        graphStoreCreated: false;
        historyStoreCreated: false;
        layoutSemanticInference: false;
        rawHtmlAllowed: false;
        executionAuthority: false;
    };
}
/** G15 owns hostile-string neutralization; this adds Mermaid delimiter escaping only. */
export declare function escapeHitoMermaidLabel(source: string): string;
/**
 * Deterministic disposable diagram source. It consumes the exact existing MRI
 * and typed material states; it creates neither graph truth nor layout policy.
 */
export declare function generateHitoMermaidMri(snapshot: HitoC7CompositionSnapshot, options?: HitoMermaidMriOptions): HitoMermaidMriProjection;
import type { HitoFirstObservationResult } from "../../contracts/model";
export declare function generateHitoFirstObservationMermaid(result: HitoFirstObservationResult): {
    kind: "HITO_FIRST_OBSERVATION_DERIVED_MRI";
    version: "hito-first-observation-mri-r1";
    sourceSemanticResultIdentity: string;
    mermaid: string;
    dimensions: {
        declaredIntent: "UNAVAILABLE";
        canonicalAuthority: "UNAVAILABLE";
        runtimeState: "UNAVAILABLE";
        ownership: "UNAVAILABLE";
        integration: "UNAVAILABLE";
        conflictAssessment: "INDETERMINATE";
        comparativeHistory: "NOT_APPLICABLE";
    };
    nodes: null;
    edges: null;
    conflicts: null;
    ownership: null;
    completeness: {
        state: "PARTIAL";
        completeUnderstanding: false;
        allKnownGapsIncluded: true;
    };
    boundary: {
        derivedOnly: true;
        canonicalAuthority: false;
        executionAuthority: false;
        layoutSemanticInference: false;
    };
};
