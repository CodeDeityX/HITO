import type { EntityProvenance } from "./model";

export type ScannerAdapterId =
  | "filesystem"
  | "git-read-only"
  | "documentation-claims"
  | "test-config"
  | "runtime-evidence-import"
  | "javascript-typescript-node-semantic";

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

export const PHASE_0_SCANNER_ADAPTER_BOUNDARY: ReadonlyArray<Omit<ScannerAdapterContract, "execute">> = [
  {
    adapterId: "filesystem",
    ecosystem: "ECOSYSTEM_NEUTRAL",
    phase0InterfaceOnly: true,
    supportedSignals: ["scope", "paths", "hashes", "file classes", "ignored content"],
    unsupportedSignalsMustBeReported: true,
  },
  {
    adapterId: "git-read-only",
    ecosystem: "ECOSYSTEM_NEUTRAL",
    phase0InterfaceOnly: true,
    supportedSignals: ["branch", "status", "recent commits", "tracked files"],
    unsupportedSignalsMustBeReported: true,
  },
  {
    adapterId: "documentation-claims",
    ecosystem: "ECOSYSTEM_NEUTRAL",
    phase0InterfaceOnly: true,
    supportedSignals: ["promise candidates", "claim candidates", "TODO signals"],
    unsupportedSignalsMustBeReported: true,
  },
  {
    adapterId: "test-config",
    ecosystem: "ECOSYSTEM_NEUTRAL",
    phase0InterfaceOnly: true,
    supportedSignals: ["tests", "fixtures", "configuration", "migration signals"],
    unsupportedSignalsMustBeReported: true,
  },
  {
    adapterId: "runtime-evidence-import",
    ecosystem: "ECOSYSTEM_NEUTRAL",
    phase0InterfaceOnly: true,
    supportedSignals: ["receipts", "reports", "CI artifacts", "screenshots", "logs", "approved probe results"],
    unsupportedSignalsMustBeReported: true,
  },
  {
    adapterId: "javascript-typescript-node-semantic",
    ecosystem: "JAVASCRIPT_TYPESCRIPT_NODE",
    phase0InterfaceOnly: true,
    supportedSignals: ["package manifests", "React/Vite/Next-style routes", "components", "backend handlers", "imports/exports", "tests"],
    unsupportedSignalsMustBeReported: true,
  },
];

export function assertPhase0ScannerBoundary(adapter: ScannerAdapterContract): void {
  if (adapter.phase0InterfaceOnly !== true) throw new Error("Phase 0 scanner contract cannot enable implementation");
  if (adapter.execute === undefined) throw new Error("scanner adapter interface must define an execution boundary");
}
