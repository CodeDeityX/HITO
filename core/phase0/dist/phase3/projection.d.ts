import type { CanonicalModel, DerivedOutput, EntityProvenance, LifecycleStatus, ObservationClass } from "../contracts";
export declare const PHASE3_RULESET_VERSION = "phase3-pulse-mri-v1";
export declare const PHASE3_GENERATED_AT = "1970-01-01T00:00:00.000Z";
export type PulseConditionKind = "RUNTIME_GAP" | "AMBIGUITY" | "CONFLICT" | "HISTORICAL_TRANSITION" | "INSUFFICIENT_EVIDENCE" | "UNKNOWN" | "RETIRED";
export type MriNodeKind = "PROJECT" | "SUBSYSTEM" | "CAPABILITY" | "RUNTIME_HOME";
export interface ProjectionSource {
    modelRevision: number;
    historySequence: number;
    evidenceSequence: number;
    derivedOutput: DerivedOutput;
    semanticHash: string;
}
export interface PulseCondition {
    conditionId: string;
    kind: PulseConditionKind;
    label: string;
    detail: string;
    affectedEntityIds: string[];
    provenance: EntityProvenance;
}
export interface ProjectPulseProjection {
    kind: "PROJECT_PULSE";
    source: ProjectionSource;
    project: {
        projectId: string;
        name: string;
        repository?: string;
        projectType: string;
        modelRevision: number;
        lastScanId: string | null;
        governedState: string;
    };
    capabilityCounts: Record<LifecycleStatus, number>;
    runtime: {
        currentHomeIds: string[];
        historicalHomeIds: string[];
        runtimeGapCapabilityIds: string[];
        unresolvedCapabilityIds: string[];
        ambiguityCount: number;
        conflictCount: number;
    };
    evidence: Record<ObservationClass, number>;
    conditions: PulseCondition[];
    unknowns: PulseCondition[];
    truthBoundary: string;
}
export interface EngineeringMriNode {
    nodeId: string;
    kind: MriNodeKind;
    label: string;
    lifecycleStatus?: LifecycleStatus;
    provenance: EntityProvenance;
    details: Record<string, string | string[] | boolean | number | undefined>;
}
export interface EngineeringMriEdge {
    edgeId: string;
    sourceId: string;
    targetId: string;
    relationship: string;
    status: "CURRENT" | "HISTORICAL" | "CANONICAL";
    provenance: EntityProvenance;
    evidenceIds: string[];
}
export interface EngineeringMriProjection {
    kind: "ENGINEERING_MRI";
    source: ProjectionSource;
    nodes: EngineeringMriNode[];
    edges: EngineeringMriEdge[];
    ambiguities: Array<{
        anchor: string;
        candidateIds: string[];
        reason: string;
    }>;
    conflicts: Array<{
        anchor: string;
        candidateIds: string[];
        reason: string;
    }>;
    truthBoundary: string;
}
export declare function deriveProjectPulse(model: CanonicalModel): ProjectPulseProjection;
export declare function deriveEngineeringMri(model: CanonicalModel): EngineeringMriProjection;
export interface Phase3ProjectionBundle {
    version: "phase3-pulse-mri-v1";
    pulse: ProjectPulseProjection;
    mri: EngineeringMriProjection;
}
export declare function derivePhase3ProjectionBundle(model: CanonicalModel): Phase3ProjectionBundle;
