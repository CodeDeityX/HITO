import type { DerivedOutput, DerivedOutputKind, EvidenceHead, HistoryHead, CanonicalModel, StalenessState } from "./model";
export interface DerivedInputHeads {
    modelRevision: number;
    historyHead: HistoryHead;
    evidenceHead: EvidenceHead;
    rulesetVersion: string;
}
export declare function createDerivedOutput(kind: DerivedOutputKind, inputs: DerivedInputHeads, provenance: DerivedOutput["provenance"], generatedAt?: string, generatingVersion?: string): DerivedOutput;
export declare function evaluateStaleness(output: DerivedOutput, current: DerivedInputHeads): StalenessState;
export declare function refreshStaleness(output: DerivedOutput, current: DerivedInputHeads): DerivedOutput;
export declare function assertDerivedOutputMayBePresented(output: DerivedOutput): void;
export declare function derivedOutputInputsFromModel(model: CanonicalModel, rulesetVersion: string): DerivedInputHeads;
