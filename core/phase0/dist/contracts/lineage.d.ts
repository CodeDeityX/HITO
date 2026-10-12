import type { Capability, CanonicalModel, RuntimeHome } from "./model";
export interface IdentityCandidate {
    capabilityId: string;
    immutableAnchor: string;
    kind: string;
    semanticContractAnchor: string;
    evidenceAgreement: boolean;
    lifecycleStatus?: "ACTIVE" | "RETIRED" | "SUPERSEDED";
}
export interface IdentityObservation {
    immutableAnchor?: string;
    kind: string;
    semanticContractAnchor: string;
}
export type IdentityMatch = {
    kind: "MATCHED";
    capabilityId: string;
} | {
    kind: "NEW_CANDIDATE";
    capabilityId: string;
} | {
    kind: "UNRESOLVED";
    candidateIds: string[];
    reason: string;
};
export declare function deterministicCapabilityId(projectId: string, immutableAnchor: string): string;
export declare function conservativeIdentityMatch(projectId: string, observation: IdentityObservation, candidates: IdentityCandidate[]): IdentityMatch;
export declare function renameCapability(model: CanonicalModel, capabilityId: string, nextName: string, reason: string): CanonicalModel;
export declare function moveCapability(model: CanonicalModel, capabilityId: string, nextRuntimeHome: RuntimeHome, reason: string): CanonicalModel;
export declare function mergeCapabilities(model: CanonicalModel, survivingId: string, absorbedIds: string[], reason: string): CanonicalModel;
export declare function splitCapability(model: CanonicalModel, parentId: string, children: Capability[], reason: string): CanonicalModel;
export declare function supersedeCapability(model: CanonicalModel, previousId: string, replacementId: string, reason: string): CanonicalModel;
export declare function retireCapability(model: CanonicalModel, capabilityId: string, reason: string): CanonicalModel;
export declare function restoreCapability(model: CanonicalModel, capabilityId: string, reason: string, evidenceIds: string[]): CanonicalModel;
