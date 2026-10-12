import type { CanonicalModel, Capability, DerivedOutput, EvidenceManifest, FindingGovernance, RuntimeHome, HistoryEvent } from "./model";
export interface ValidationIssue {
    path: string;
    message: string;
}
export interface ValidationResult {
    valid: boolean;
    issues: ValidationIssue[];
}
export interface ModelValidationOptions {
    projectRoot?: string;
    evidenceManifest?: EvidenceManifest;
    derivedOutputs?: DerivedOutput[];
    /** Require byte-level evidence checks; a bound projectRoot is also required. */
    verifyEvidenceBytes?: boolean;
}
export declare function validateCanonicalModel(model: CanonicalModel, options?: ModelValidationOptions): ValidationResult;
export declare function assertValidModel(model: CanonicalModel, options?: ModelValidationOptions): void;
export declare function assertDerivedOutputFresh(output: DerivedOutput, model: CanonicalModel, historyHead: string, evidenceHead: string, rulesetVersion: string): void;
export declare function assertFindingGovernanceIsNotFindingTruth(governance: FindingGovernance, currentFindingIds: Set<string>): void;
export declare function assertCapabilityHasNoAuthoritativeRecommendation(capability: Capability): void;
export declare function assertExactlyOneCurrentHome(capability: Capability, homes: RuntimeHome[], revision: number): void;
export declare function validateHistoryReferences(model: CanonicalModel, history: HistoryEvent[]): ValidationIssue[];
