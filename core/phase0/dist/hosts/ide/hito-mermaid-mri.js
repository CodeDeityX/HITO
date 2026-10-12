"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HITO_PRE_C9_MERMAID_MRI_VERSION = void 0;
exports.escapeHitoMermaidLabel = escapeHitoMermaidLabel;
exports.generateHitoMermaidMri = generateHitoMermaidMri;
exports.generateHitoFirstObservationMermaid = generateHitoFirstObservationMermaid;
const node_crypto_1 = require("node:crypto");
const g15_universal_protocol_projection_1 = require("../../convergence/g15-universal-protocol-projection");
const semantic_canonicalization_1 = require("../../convergence/semantic-canonicalization");
const hito_host_protocol_1 = require("../shared/hito-host-protocol");
exports.HITO_PRE_C9_MERMAID_MRI_VERSION = "hito-pre-c9-mermaid-mri-v1";
const OPTION_KEYS = ["maxMriNodes", "maxMriEdges"];
const MATERIAL_CLASS = {
    UNKNOWN: "hito_unknown",
    INDETERMINATE: "hito_indeterminate",
    CONFLICT: "hito_conflict",
    CONTRADICTION: "hito_conflict",
    PROTECTED_AUTHORITY: "hito_protected",
    STALE_OR_CAUSALLY_INAPPLICABLE_PROOF: "hito_stale",
    DESYNCHRONIZED_TERRITORY: "hito_desynchronized",
    MISSING_PROOF: "hito_missing",
    MISSING_OR_INSUFFICIENT_AUTHORITY: "hito_missing",
    OBSERVATION_COVERAGE_LIMIT: "hito_limited",
    NO_JUSTIFIED_NEXT_STEP: "hito_limited",
};
function invariant(condition, message) {
    if (!condition)
        throw new Error(`HITO pre-C9 Mermaid rejected input: ${message}`);
}
function normalizeOptions(options) {
    const value = options ?? {};
    invariant(value !== null && typeof value === "object" && !Array.isArray(value), "options must be structured");
    const unsupported = Object.keys(value).filter((key) => !OPTION_KEYS.includes(key)).sort(semantic_canonicalization_1.compareSemanticCodePoints);
    invariant(unsupported.length === 0, `unsupported fields: ${unsupported.join(", ")}`);
    const maxMriNodes = value.maxMriNodes ?? Number.MAX_SAFE_INTEGER;
    const maxMriEdges = value.maxMriEdges ?? Number.MAX_SAFE_INTEGER;
    invariant(Number.isSafeInteger(maxMriNodes) && maxMriNodes > 0, "maxMriNodes must be a positive safe integer");
    invariant(Number.isSafeInteger(maxMriEdges) && maxMriEdges > 0, "maxMriEdges must be a positive safe integer");
    return { maxMriNodes, maxMriEdges };
}
function diagramId(prefix, upstreamId) {
    return `${prefix}_${(0, node_crypto_1.createHash)("sha256").update(Buffer.from(upstreamId.normalize("NFC"), "utf8")).digest("hex")}`;
}
/** G15 owns hostile-string neutralization; this adds Mermaid delimiter escaping only. */
function escapeHitoMermaidLabel(source) {
    return (0, g15_universal_protocol_projection_1.sanitizeG15ProjectionText)(source)
        .replaceAll("|", "¦")
        .replaceAll("[", "［")
        .replaceAll("]", "］")
        .replaceAll("{", "｛")
        .replaceAll("}", "｝")
        .replaceAll("`", "ˋ");
}
function edgeLine(sourceId, targetId, status, label) {
    if (status === "HISTORICAL")
        return `    ${sourceId} -. ${label} .-> ${targetId}`;
    if (status === "CANONICAL")
        return `    ${sourceId} ==>|${label}| ${targetId}`;
    return `    ${sourceId} -->|${label}| ${targetId}`;
}
/**
 * Deterministic disposable diagram source. It consumes the exact existing MRI
 * and typed material states; it creates neither graph truth nor layout policy.
 */
function generateHitoMermaidMri(snapshot, options) {
    const normalized = normalizeOptions(options);
    const host = (0, hito_host_protocol_1.projectHitoHostProtocol)(snapshot, "FORENSIC");
    const mri = host.mri.value;
    const allNodes = [...mri.nodes].sort((left, right) => (0, semantic_canonicalization_1.compareSemanticCodePoints)(left.nodeId, right.nodeId));
    const includedNodes = allNodes.slice(0, normalized.maxMriNodes);
    const includedNodeIds = new Set(includedNodes.map((node) => node.nodeId));
    const allEdges = [...mri.edges].sort((left, right) => (0, semantic_canonicalization_1.compareSemanticCodePoints)(left.edgeId, right.edgeId));
    const eligibleEdges = allEdges.filter((edge) => includedNodeIds.has(edge.sourceId) && includedNodeIds.has(edge.targetId));
    const includedEdges = eligibleEdges.slice(0, normalized.maxMriEdges);
    const materialStates = [...host.why.value.materialStates].sort((left, right) => (0, semantic_canonicalization_1.compareSemanticCodePoints)(left.materialStateId, right.materialStateId));
    const conflicts = [...mri.conflicts].sort((left, right) => (0, semantic_canonicalization_1.compareSemanticCodePoints)(`${left.anchor}\u0000${left.candidateIds.join("\u0000")}`, `${right.anchor}\u0000${right.candidateIds.join("\u0000")}`));
    const ambiguities = [...mri.ambiguities].sort((left, right) => (0, semantic_canonicalization_1.compareSemanticCodePoints)(`${left.anchor}\u0000${left.candidateIds.join("\u0000")}`, `${right.anchor}\u0000${right.candidateIds.join("\u0000")}`));
    const conflictNodeIds = new Set(conflicts.flatMap((entry) => [entry.anchor, ...entry.candidateIds]));
    const ambiguityNodeIds = new Set(ambiguities.flatMap((entry) => [entry.anchor, ...entry.candidateIds]));
    const ids = new Map(includedNodes.map((node) => [node.nodeId, diagramId("mri", node.nodeId)]));
    const lines = [
        "flowchart LR",
        "  subgraph HITO_MRI[\"Engineering MRI - derived, noncanonical\"]",
    ];
    for (const node of includedNodes) {
        const id = ids.get(node.nodeId);
        const state = node.lifecycleStatus === undefined ? node.kind : `${node.kind} / ${node.lifecycleStatus}`;
        const className = conflictNodeIds.has(node.nodeId)
            ? "hito_conflict"
            : ambiguityNodeIds.has(node.nodeId) || node.lifecycleStatus === "UNKNOWN"
                ? "hito_unknown"
                : node.kind === "RUNTIME_HOME"
                    ? "hito_runtime"
                    : "hito_current";
        lines.push(`    ${id}[\"${escapeHitoMermaidLabel(`${node.label} - ${state}`)}\"]:::${className}`);
    }
    for (const edge of includedEdges) {
        lines.push(edgeLine(ids.get(edge.sourceId), ids.get(edge.targetId), edge.status, escapeHitoMermaidLabel(`${edge.status} ${edge.relationship}`)));
    }
    for (const entry of conflicts) {
        const anchor = ids.get(entry.anchor);
        if (anchor === undefined)
            continue;
        for (const candidateId of [...entry.candidateIds].sort(semantic_canonicalization_1.compareSemanticCodePoints)) {
            const candidate = ids.get(candidateId);
            if (candidate !== undefined)
                lines.push(`    ${anchor} -. ${escapeHitoMermaidLabel("CONFLICT")} .-> ${candidate}`);
        }
    }
    for (const entry of ambiguities) {
        const anchor = ids.get(entry.anchor);
        if (anchor === undefined)
            continue;
        for (const candidateId of [...entry.candidateIds].sort(semantic_canonicalization_1.compareSemanticCodePoints)) {
            const candidate = ids.get(candidateId);
            if (candidate !== undefined)
                lines.push(`    ${anchor} -. ${escapeHitoMermaidLabel("AMBIGUITY")} .-> ${candidate}`);
        }
    }
    lines.push("  end", "  subgraph HITO_MATERIAL[\"Material HITO states - exact typed projection\"]");
    for (const state of materialStates) {
        const id = diagramId("material", state.materialStateId);
        const className = MATERIAL_CLASS[state.category] ?? "hito_limited";
        lines.push(`    ${id}[\"${escapeHitoMermaidLabel(`${state.category} - ${state.summary}`)}\"]:::${className}`);
        const scopedNode = ids.get(state.scope.identity);
        if (scopedNode !== undefined)
            lines.push(`    ${id} -. ${escapeHitoMermaidLabel(state.scope.kind)} .-> ${scopedNode}`);
    }
    lines.push("  end", "  classDef hito_current fill:#102a24,stroke:#70d7a7,color:#e8fff4", "  classDef hito_runtime fill:#13263a,stroke:#6aa9ff,color:#eef6ff", "  classDef hito_conflict fill:#3a1717,stroke:#ff7474,color:#fff0f0", "  classDef hito_unknown fill:#352d17,stroke:#f5bd4f,color:#fff7dc", "  classDef hito_indeterminate fill:#30233a,stroke:#c895ff,color:#faf0ff", "  classDef hito_protected fill:#182d38,stroke:#64c7df,color:#effcff", "  classDef hito_stale fill:#302918,stroke:#d7a94e,color:#fff7e1", "  classDef hito_desynchronized fill:#392018,stroke:#ef8a5f,color:#fff2eb", "  classDef hito_missing fill:#341c2c,stroke:#ec78b3,color:#fff0f8", "  classDef hito_limited fill:#262932,stroke:#8998aa,color:#f0f3f7");
    const omittedMriNodes = allNodes.length - includedNodes.length;
    const omittedMriEdges = allEdges.length - includedEdges.length;
    const truncationApplied = omittedMriNodes > 0 || omittedMriEdges > 0;
    if (truncationApplied) {
        lines.push(`  HITO_TRUNCATED[\"INCOMPLETE DIAGRAM - omitted ${omittedMriNodes} MRI node(s) and ${omittedMriEdges} MRI edge(s)\"]:::hito_limited`);
    }
    const mermaid = `${lines.join("\n")}\n`;
    const diagramIdentity = `hito_pre_c9_mermaid_${(0, node_crypto_1.createHash)("sha256").update(Buffer.from(`${host.source.semanticVerdictIdentity}\n${host.source.phase3MriIdentity}\n${mermaid}`, "utf8")).digest("hex")}`;
    const result = {
        kind: "HITO_PRE_C9_DERIVED_MERMAID_MRI",
        version: exports.HITO_PRE_C9_MERMAID_MRI_VERSION,
        diagramIdentity,
        sourceMriIdentity: host.source.phase3MriIdentity,
        sourceSemanticVerdictIdentity: host.source.semanticVerdictIdentity,
        mermaid,
        ordering: "UNICODE_CODE_POINT_BY_UPSTREAM_ID",
        completeness: {
            complete: !truncationApplied,
            completenessClaimed: !truncationApplied,
            truncationApplied,
            totalMriNodes: allNodes.length,
            includedMriNodes: includedNodes.length,
            omittedMriNodes,
            totalMriEdges: allEdges.length,
            includedMriEdges: includedEdges.length,
            omittedMriEdges,
            totalMaterialStates: materialStates.length,
            includedMaterialStates: materialStates.length,
            reasonCodes: truncationApplied ? ["EXPLICIT_CALLER_PRESENTATION_LIMIT"] : [],
        },
        governanceBoundary: {
            derivedOnly: true,
            canonicalAuthority: false,
            graphStoreCreated: false,
            historyStoreCreated: false,
            layoutSemanticInference: false,
            rawHtmlAllowed: false,
            executionAuthority: false,
        },
    };
    return Object.freeze(result);
}
const hito_host_protocol_2 = require("../shared/hito-host-protocol");
function generateHitoFirstObservationMermaid(result) {
    const host = (0, hito_host_protocol_2.projectHitoFirstObservationHost)(result);
    const semantic = host.semanticResult;
    const lines = ["flowchart TD", '  coverage["FIRST_OBSERVATION - PARTIAL COVERAGE"]',
        '  prior["NO_PRIOR_STATE_ADMITTED"]'];
    for (const [name, state] of Object.entries(semantic.dimensions)) {
        lines.push(`  gap_${name}["${escapeHitoMermaidLabel(`${name}: ${state}`)}"]`);
    }
    lines.push('  next["NO_JUSTIFIED_NEXT_STEP"]');
    return {
        kind: "HITO_FIRST_OBSERVATION_DERIVED_MRI",
        version: "hito-first-observation-mri-r1",
        sourceSemanticResultIdentity: semantic.semanticResultIdentity,
        mermaid: lines.join("\n") + "\n",
        dimensions: structuredClone(semantic.dimensions),
        nodes: null, edges: null, conflicts: null, ownership: null,
        completeness: { state: "PARTIAL", completeUnderstanding: false, allKnownGapsIncluded: true },
        boundary: { derivedOnly: true, canonicalAuthority: false, executionAuthority: false, layoutSemanticInference: false },
    };
}
