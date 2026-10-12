import type { CanonicalModel, LifecycleStatus, StalenessState } from "../contracts";
import { type Phase4DecisionReport } from "../phase4/decision-engine";
import { type Phase5ClaimRequest, type Phase5JudgeResult } from "../phase5/reality-judge";
export declare const PHASE6_RULESET_VERSION = "hito-phase6-operator-agent-readonly-v1-repair1";
export declare const PHASE6_GENERATED_AT = "1970-01-01T00:00:00.000Z";
export declare const PHASE6_AUTHORITY: "DERIVED / READ_ONLY / NON_CANONICAL";
export interface Phase6ProjectionInput {
    model: CanonicalModel;
    phase4: Phase4DecisionReport;
    phase5: Phase5JudgeResult;
    phase5Request: Phase5ClaimRequest;
}
export interface Phase6CapabilityView {
    capabilityId: string;
    name: string;
    purpose: string;
    questionAnswered: string;
    lifecycleStatus: LifecycleStatus;
    health: string;
    ownerSubsystemId: string;
    currentRuntimeHomeId: string | null;
    dependencies: string[];
    lineageEventIds: string[];
    evidenceIds: string[];
    claimBoundary: string;
    unknown: boolean;
    runtimeGap: boolean;
}
export interface Phase6SharedTruth {
    truthId: string;
    project: {
        projectId: string;
        name: string;
        modelRevision: number;
        releaseContract: string;
    };
    capabilities: Phase6CapabilityView[];
    runtimeHomes: Array<{
        runtimeHomeId: string;
        capabilityId: string;
        locator: string;
        status: LifecycleStatus;
        stateOwner?: string;
        eventOwner?: string;
        persistenceOwner?: string;
    }>;
    unknowns: string[];
    ambiguities: Array<{
        anchor: string;
        candidateIds: string[];
        reason: string;
    }>;
    contradictions: string[];
    evidence: Array<{
        evidenceId: string;
        subjectId: string;
        environment: string;
        verificationLevel: string;
        available: boolean;
        truthBoundary: string;
    }>;
    phase4: {
        decisionId: string;
        rulesetVersion: string;
        reconciliationState: string;
        noDoubleWorkAction: string;
        nextSafeMutation: string;
        doNotTouch: string[];
        contradictions: string[];
        unknowns: string[];
        stalenessState: StalenessState;
    };
    phase5: {
        judgeResultId: string;
        rulesetVersion: string;
        verdict: string;
        claimId: string;
        truthBoundary: string;
        acceptedEvidence: string[];
        rejectedEvidence: string[];
        unknowns: string[];
        contradictions: string[];
        returnStepIfFailed?: string;
        limitations: string[];
        stalenessState: StalenessState;
    };
}
export interface Phase6ProjectionSource {
    modelRevision: number;
    historySequence: number;
    evidenceSequence: number;
    phase4RulesetVersion: string;
    phase5RulesetVersion: string;
    rulesetVersion: string;
}
export interface OperatorProjection {
    kind: "HITO_PHASE6_OPERATOR_PROJECTION";
    operatorProjectionId: string;
    authority: typeof PHASE6_AUTHORITY;
    source: Phase6ProjectionSource;
    truth: Phase6SharedTruth;
    truthBoundary: string;
    limitations: string[];
    executionAuthority: "NON_EXECUTING_PROJECTION";
}
export interface AgentContextProjection {
    kind: "HITO_PHASE6_AGENT_CONTEXT";
    agentContextId: string;
    authority: typeof PHASE6_AUTHORITY;
    source: Phase6ProjectionSource;
    truth: Phase6SharedTruth;
    agentBoundary: string[];
    executionAuthority: "NON_EXECUTING_PROJECTION";
}
export interface Phase6ProjectionPair {
    operator: OperatorProjection;
    agent: AgentContextProjection;
}
/** Phase 6 Repair 1: authenticates supplied accepted derived authority without reinterpreting it. */
export declare function validatePhase6AuthoritySet(input: Phase6ProjectionInput): void;
export declare function derivePhase6ReadOnlyProjections(input: Phase6ProjectionInput): Phase6ProjectionPair;
