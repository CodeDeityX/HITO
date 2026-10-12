"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PHASE_0_SCANNER_ADAPTER_BOUNDARY = void 0;
exports.assertPhase0ScannerBoundary = assertPhase0ScannerBoundary;
exports.PHASE_0_SCANNER_ADAPTER_BOUNDARY = [
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
function assertPhase0ScannerBoundary(adapter) {
    if (adapter.phase0InterfaceOnly !== true)
        throw new Error("Phase 0 scanner contract cannot enable implementation");
    if (adapter.execute === undefined)
        throw new Error("scanner adapter interface must define an execution boundary");
}
