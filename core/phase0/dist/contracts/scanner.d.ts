import type { EntityProvenance } from "./model";
export type ScannerAdapterId = "filesystem" | "git-read-only" | "documentation-claims" | "test-config" | "runtime-evidence-import" | "javascript-typescript-node-semantic";
export interface ScanScope {
    root: string;
    include: string[];
    exclude: string[];
    followSymlinks: boolean;
    executeCommands: false;
    networkAccess: false;
}
export interface ScannerObservation {
    observationId: string;
    kind: "FILE" | "GIT" | "DOCUMENTATION" | "CONFIGURATION" | "EVIDENCE" | "JS_TS_NODE_SIGNAL";
    subject: string;
    value: unknown;
    provenance: EntityProvenance;
}
export interface ScannerAdapterContext {
    scope: ScanScope;
    phase: 0;
    repositoryContentIsData: true;
}
export interface ScannerAdapterContract {
    adapterId: ScannerAdapterId;
    ecosystem: "ECOSYSTEM_NEUTRAL" | "JAVASCRIPT_TYPESCRIPT_NODE";
    phase0InterfaceOnly: true;
    supportedSignals: string[];
    unsupportedSignalsMustBeReported: true;
    execute(context: ScannerAdapterContext): Promise<ScannerObservation[]>;
}
export declare const PHASE_0_SCANNER_ADAPTER_BOUNDARY: ReadonlyArray<Omit<ScannerAdapterContract, "execute">>;
export declare function assertPhase0ScannerBoundary(adapter: ScannerAdapterContract): void;
