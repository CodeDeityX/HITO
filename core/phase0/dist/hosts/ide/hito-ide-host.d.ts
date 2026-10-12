import { type G15ProjectionMode } from "../../convergence/g15-universal-protocol-projection";
import { type HitoC7CompositionSnapshot, type HitoC7PersistedCompositionInput } from "../../convergence/runtime";
import { HITO_PRE_C9_HOST_AUTHORITY, HITO_PRE_C9_HOST_PROTOCOL_VERSION, type HitoHostField, type HitoHostProtocolProjection } from "../shared/hito-host-protocol";
import { type HitoMermaidMriOptions, type HitoMermaidMriProjection } from "./hito-mermaid-mri";
export declare const HITO_PRE_C9_IDE_HOST_VERSION: "hito-pre-c9-ide-host-v1";
export interface HitoIdeHostRequest {
    mode?: G15ProjectionMode;
    mermaid?: HitoMermaidMriOptions;
}
export type HitoIdeNavigationTarget = "PROJECT_PULSE" | "NEXT" | "WHY" | "MRI" | "EVIDENCE" | "HISTORY" | "PROTECTED_AUTHORITY";
export interface HitoIdeNavigationRoute {
    routeId: string;
    kind: "REVEAL_HOST_SURFACE";
    target: HitoIdeNavigationTarget;
    mutatingCommand: null;
    semanticAuthority: false;
    executionAuthority: false;
}
export interface HitoIdeHostPayload {
    kind: "HITO_PRE_C9_HOST_NEUTRAL_IDE_PAYLOAD";
    version: typeof HITO_PRE_C9_IDE_HOST_VERSION;
    protocolVersion: typeof HITO_PRE_C9_HOST_PROTOCOL_VERSION;
    authority: typeof HITO_PRE_C9_HOST_AUTHORITY;
    payloadIdentity: string;
    mode: G15ProjectionMode;
    source: HitoHostProtocolProjection["source"];
    surfaces: {
        projectPulse: HitoHostProtocolProjection["projectPulse"];
        next: HitoHostProtocolProjection["next"];
        why: HitoHostProtocolProjection["why"];
        mri: HitoHostProtocolProjection["mri"];
        mermaid: HitoHostField<HitoMermaidMriProjection>;
        history: HitoHostProtocolProjection["history"];
        evidence: HitoHostProtocolProjection["evidence"];
        protectedAuthorities: HitoHostProtocolProjection["protectedAuthorities"];
        runtimeState: HitoHostProtocolProjection["runtimeState"];
        freshness: HitoHostProtocolProjection["freshness"];
        coverage: HitoHostProtocolProjection["coverage"];
        intentProvenance: HitoHostProtocolProjection["intentProvenance"];
    };
    ux: {
        whereAmI: string;
        whatAmITryingToDo: string;
        whatIsMissing: string;
        whatNext: string;
        why: string;
        whatIsSafeToChange: string;
        whatShouldINotTouch: string;
        whenIsThisDone: string;
    };
    navigationRoutes: readonly HitoIdeNavigationRoute[];
    hostCapabilities: {
        thinWrapperReady: true;
        hostSpecificOntology: false;
        presentationHostDependency: false;
        semanticRecomputationRequired: false;
    };
    governanceBoundary: HitoHostProtocolProjection["governanceBoundary"] & {
        navigationIsMutationAuthority: false;
        shellMutationCommandGenerated: false;
    };
    zeroEffectCounters: HitoHostProtocolProjection["zeroEffectCounters"];
}
/** Pure host-neutral IDE projection over the exact same validated C7 snapshot. */
export declare function createHitoIdeHostPayload(snapshot: HitoC7CompositionSnapshot, request?: HitoIdeHostRequest): HitoIdeHostPayload;
/** Uses only the existing validated persisted-root reader before pure projection. */
export declare function readHitoIdeHostFromProjectRoot(projectRoot: string, compositionInput: HitoC7PersistedCompositionInput, request?: HitoIdeHostRequest): Promise<HitoIdeHostPayload>;
import type { HitoFirstObservationResult } from "../../contracts/model";
export declare function createHitoFirstObservationIdePayload(result: HitoFirstObservationResult): {
    kind: "HITO_FIRST_OBSERVATION_IDE_PAYLOAD";
    version: "hito-first-observation-ide-r1";
    host: {
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
    mri: {
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
};
