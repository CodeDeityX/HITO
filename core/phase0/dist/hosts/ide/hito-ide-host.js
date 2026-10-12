"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HITO_PRE_C9_IDE_HOST_VERSION = void 0;
exports.createHitoIdeHostPayload = createHitoIdeHostPayload;
exports.readHitoIdeHostFromProjectRoot = readHitoIdeHostFromProjectRoot;
exports.createHitoFirstObservationIdePayload = createHitoFirstObservationIdePayload;
const node_crypto_1 = require("node:crypto");
const g15_universal_protocol_projection_1 = require("../../convergence/g15-universal-protocol-projection");
const runtime_1 = require("../../convergence/runtime");
const hito_host_protocol_1 = require("../shared/hito-host-protocol");
const hito_mermaid_mri_1 = require("./hito-mermaid-mri");
exports.HITO_PRE_C9_IDE_HOST_VERSION = "hito-pre-c9-ide-host-v1";
const REQUEST_KEYS = ["mode", "mermaid"];
const MERMAID_KEYS = ["maxMriNodes", "maxMriEdges"];
function invariant(condition, message) {
    if (!condition)
        throw new Error(`HITO pre-C9 IDE host rejected input: ${message}`);
}
function normalizeRequest(request) {
    const value = request ?? {};
    invariant(value !== null && typeof value === "object" && !Array.isArray(value), "request must be structured");
    const unsupported = Object.keys(value).filter((key) => !REQUEST_KEYS.includes(key)).sort();
    invariant(unsupported.length === 0, `request rejects unsupported or precomputed authority fields: ${unsupported.join(", ")}`);
    const mode = value.mode ?? "GUIDED";
    invariant(g15_universal_protocol_projection_1.G15_PROJECTION_MODES.includes(mode), `unsupported presentation mode ${String(mode)}`);
    if (value.mermaid !== undefined) {
        invariant(value.mermaid !== null && typeof value.mermaid === "object" && !Array.isArray(value.mermaid), "mermaid options must be structured");
        const mermaidUnsupported = Object.keys(value.mermaid).filter((key) => !MERMAID_KEYS.includes(key)).sort();
        invariant(mermaidUnsupported.length === 0, `mermaid options reject unsupported or precomputed authority fields: ${mermaidUnsupported.join(", ")}`);
    }
    return { mode, ...(value.mermaid === undefined ? {} : { mermaid: value.mermaid }) };
}
function navigationRoutes() {
    return Object.freeze([
        "PROJECT_PULSE",
        "NEXT",
        "WHY",
        "MRI",
        "EVIDENCE",
        "HISTORY",
        "PROTECTED_AUTHORITY",
    ].map((target) => Object.freeze({
        routeId: `hito-host-reveal-${target.toLowerCase().replaceAll("_", "-")}`,
        kind: "REVEAL_HOST_SURFACE",
        target: target,
        mutatingCommand: null,
        semanticAuthority: false,
        executionAuthority: false,
    })));
}
/** Pure host-neutral IDE projection over the exact same validated C7 snapshot. */
function createHitoIdeHostPayload(snapshot, request) {
    const normalized = normalizeRequest(request);
    const protocol = (0, hito_host_protocol_1.projectHitoHostProtocol)(snapshot, normalized.mode);
    const mermaid = (0, hito_mermaid_mri_1.generateHitoMermaidMri)(snapshot, normalized.mermaid);
    const payloadIdentity = `hito_pre_c9_ide_${(0, node_crypto_1.createHash)("sha256").update(Buffer.from([
        protocol.source.c7CompositionIdentity,
        protocol.source.semanticVerdictIdentity,
        protocol.source.g16AssessmentIdentity,
        protocol.mode,
        mermaid.diagramIdentity,
    ].join("\n"), "utf8")).digest("hex")}`;
    const result = {
        kind: "HITO_PRE_C9_HOST_NEUTRAL_IDE_PAYLOAD",
        version: exports.HITO_PRE_C9_IDE_HOST_VERSION,
        protocolVersion: protocol.protocolVersion,
        authority: protocol.authority,
        payloadIdentity,
        mode: protocol.mode,
        source: protocol.source,
        surfaces: {
            projectPulse: protocol.projectPulse,
            next: protocol.next,
            why: protocol.why,
            mri: protocol.mri,
            mermaid: {
                value: mermaid,
                provenance: protocol.mri.provenance,
                semanticAuthority: false,
                executionAuthority: false,
            },
            history: protocol.history,
            evidence: protocol.evidence,
            protectedAuthorities: protocol.protectedAuthorities,
            runtimeState: protocol.runtimeState,
            freshness: protocol.freshness,
            coverage: protocol.coverage,
            intentProvenance: protocol.intentProvenance,
        },
        ux: protocol.uxAnswers,
        navigationRoutes: navigationRoutes(),
        hostCapabilities: {
            thinWrapperReady: true,
            hostSpecificOntology: false,
            presentationHostDependency: false,
            semanticRecomputationRequired: false,
        },
        governanceBoundary: {
            ...protocol.governanceBoundary,
            navigationIsMutationAuthority: false,
            shellMutationCommandGenerated: false,
        },
        zeroEffectCounters: protocol.zeroEffectCounters,
    };
    return Object.freeze(result);
}
/** Uses only the existing validated persisted-root reader before pure projection. */
async function readHitoIdeHostFromProjectRoot(projectRoot, compositionInput, request) {
    const snapshot = await (0, runtime_1.readHitoRuntimeFromProjectRoot)(projectRoot, compositionInput);
    invariant(snapshot.kind === "HITO_1_0_C7_COMPOSITION_SNAPSHOT", "persisted-root composition did not produce C7");
    return createHitoIdeHostPayload(snapshot, request);
}
const hito_host_protocol_2 = require("../shared/hito-host-protocol");
const hito_mermaid_mri_2 = require("./hito-mermaid-mri");
function createHitoFirstObservationIdePayload(result) {
    return {
        kind: "HITO_FIRST_OBSERVATION_IDE_PAYLOAD",
        version: "hito-first-observation-ide-r1",
        host: (0, hito_host_protocol_2.projectHitoFirstObservationHost)(result),
        mri: (0, hito_mermaid_mri_2.generateHitoFirstObservationMermaid)(result),
    };
}
