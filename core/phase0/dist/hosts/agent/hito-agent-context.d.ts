import { type G15MaterialState, type G15ProjectedIntent, type G15ProjectionMode } from "../../convergence/g15-universal-protocol-projection";
import type { HitoC7CompositionSnapshot } from "../../convergence/runtime";
import { HITO_PRE_C9_HOST_AUTHORITY, HITO_PRE_C9_HOST_PROTOCOL_VERSION, type HitoHostField, type HitoHostProtocolProjection } from "../shared/hito-host-protocol";
export declare const HITO_PRE_C9_AGENT_CONTEXT_VERSION: "hito-pre-c9-agent-context-v1";
export interface HitoAgentContextRequest {
    mode?: G15ProjectionMode;
}
export interface HitoAgentContextEnvelope {
    kind: "HITO_PRE_C9_HOST_NEUTRAL_AGENT_CONTEXT";
    version: typeof HITO_PRE_C9_AGENT_CONTEXT_VERSION;
    protocolVersion: typeof HITO_PRE_C9_HOST_PROTOCOL_VERSION;
    authority: typeof HITO_PRE_C9_HOST_AUTHORITY;
    contextIdentity: string;
    mode: G15ProjectionMode;
    source: HitoHostProtocolProjection["source"];
    project: HitoHostField<{
        projectIdentity: string;
        whereAmI: string;
    }>;
    reality: HitoHostField<{
        c7CompositionIdentity: string;
        c6CompositionIdentity: string;
        semanticVerdictIdentity: string;
        g8RealityIdentity: string;
        g16AssessmentIdentity: string;
        overallStatus: HitoHostProtocolProjection["projectPulse"]["value"]["status"];
    }>;
    protocolRulesets: HitoHostField<{
        c7: string;
        g16: string;
        c6: string;
        g15: string;
    }>;
    operationalMode: HitoHostField<HitoHostProtocolProjection["runtimeState"]["value"]["operationalMode"]>;
    intent: HitoHostField<{
        records: G15ProjectedIntent[];
        extractedCandidates: HitoHostProtocolProjection["intentProvenance"]["value"]["extractedIntentCandidates"];
        declaredIntentImported: false;
        agentProposalCanonicalAuthority: false;
        recommendationIsCommitment: false;
        commitmentIsExecutionAuthority: false;
    }>;
    currentObjective: HitoHostField<string>;
    exactNextSafeMutation: HitoHostProtocolProjection["next"];
    why: HitoHostProtocolProjection["why"];
    blockers: HitoHostField<G15MaterialState[]>;
    contradictionsAndConflicts: HitoHostField<G15MaterialState[]>;
    unknownOrIndeterminate: HitoHostField<G15MaterialState[]>;
    protectedAuthorities: HitoHostProtocolProjection["protectedAuthorities"];
    evidence: HitoHostProtocolProjection["evidence"];
    freshness: HitoHostProtocolProjection["freshness"];
    coverage: HitoHostProtocolProjection["coverage"];
    runtimeAndTerritory: HitoHostProtocolProjection["runtimeState"];
    safeToChange: HitoHostField<string>;
    doneWhen: HitoHostField<string>;
    mutatingCommand: null;
    governanceBoundary: HitoHostProtocolProjection["governanceBoundary"] & {
        acceptsAgentProseAsIntent: false;
        acceptsCallerVerdict: false;
        acceptsCallerNextStep: false;
        acceptsCallerProtectedScope: false;
        createsCommitment: false;
        createsExecutionAuthority: false;
    };
    zeroEffectCounters: HitoHostProtocolProjection["zeroEffectCounters"];
}
/** Pure machine-readable agent context over exact existing host protocol truth. */
export declare function createHitoAgentContext(snapshot: HitoC7CompositionSnapshot, request?: HitoAgentContextRequest): HitoAgentContextEnvelope;
import type { HitoFirstObservationResult } from "../../contracts/model";
export declare function createHitoFirstObservationAgentContext(result: HitoFirstObservationResult): {
    kind: "HITO_FIRST_OBSERVATION_AGENT_CONTEXT";
    version: "hito-first-observation-agent-r1";
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
    mutatingCommand: null;
};
