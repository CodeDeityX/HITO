"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertLocalBridgeDocument = assertLocalBridgeDocument;
exports.readLocalHitoBridge = readLocalHitoBridge;
exports.trustedStatus = trustedStatus;
exports.assertFirstObservationBridge = assertFirstObservationBridge;
exports.readFirstObservationHitoBridge = readFirstObservationHitoBridge;
const promises_1 = require("node:fs/promises");
const path = __importStar(require("node:path"));
const protocol_1 = require("./types/protocol");
const IDE_TOP_LEVEL_KEYS = [
    "kind",
    "version",
    "protocolVersion",
    "authority",
    "payloadIdentity",
    "mode",
    "source",
    "surfaces",
    "ux",
    "navigationRoutes",
    "hostCapabilities",
    "governanceBoundary",
    "zeroEffectCounters",
];
function isRecord(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}
function invariant(condition, message) {
    if (!condition)
        throw new Error(`HITO P1 local wrapper rejected input: ${message}`);
}
function requiredRecord(value, label) {
    invariant(isRecord(value), `${label} must be a structured object`);
    return value;
}
function requiredString(value, label) {
    invariant(typeof value === "string" && value.length > 0, `${label} must be a non-empty string`);
    return value;
}
function requiredArray(value, label) {
    invariant(Array.isArray(value), `${label} must be an array`);
    return value;
}
function assertExactKeys(value, allowed, label) {
    const extra = Object.keys(value).filter((key) => !allowed.includes(key)).sort();
    invariant(extra.length === 0, `${label} contains unsupported fields: ${extra.join(", ")}`);
}
function assertSource(value, label) {
    const source = requiredRecord(value, label);
    for (const key of [
        "c7CompositionIdentity",
        "c6CompositionIdentity",
        "g15EnvelopeIdentity",
        "semanticVerdictIdentity",
        "g16AssessmentIdentity",
        "phase3PulseIdentity",
        "phase3MriIdentity",
        "selectedViewIdentity",
    ])
        requiredString(source[key], `${label}.${key}`);
}
function assertHostField(value, label) {
    const field = requiredRecord(value, label);
    invariant("value" in field, `${label}.value is required`);
    requiredArray(field.provenance, `${label}.provenance`);
    invariant(field.semanticAuthority === false, `${label} cannot own semantic authority`);
    invariant(field.executionAuthority === false, `${label} cannot own execution authority`);
}
function assertGovernanceBoundary(value, label, agent = false) {
    const boundary = requiredRecord(value, label);
    for (const key of ["hostNeutral", "derivedOnly", "readOnly"]) {
        invariant(boundary[key] === true, `${label}.${key} must remain true`);
    }
    for (const key of [
        "canonicalAuthority",
        "ontologyAuthority",
        "nextStepAuthority",
        "realityJudgeAuthority",
        "executionAuthority",
        "browserDependency",
        "modelProviderDependency",
    ])
        invariant(boundary[key] === false, `${label}.${key} must remain false`);
    if (agent) {
        for (const key of [
            "acceptsAgentProseAsIntent",
            "acceptsCallerVerdict",
            "acceptsCallerNextStep",
            "acceptsCallerProtectedScope",
            "createsCommitment",
            "createsExecutionAuthority",
        ])
            invariant(boundary[key] === false, `${label}.${key} must remain false`);
    }
}
function assertZeroEffects(value, label) {
    const effects = requiredRecord(value, label);
    const exactKeys = [
        "canonicalWrites",
        "hitoStateWrites",
        "targetMutations",
        "targetExecutions",
        "providerModelCalls",
        "unauthorizedNetworkCalls",
        "gitMutations",
        "hitoNamespaceCreations",
        "namespaceMigrations",
    ];
    assertExactKeys(effects, exactKeys, label);
    for (const key of exactKeys)
        invariant(effects[key] === 0, `${label}.${key} must remain zero`);
}
function assertUx(value) {
    const ux = requiredRecord(value, "ide.ux");
    for (const key of [
        "whereAmI",
        "whatAmITryingToDo",
        "whatIsMissing",
        "whatNext",
        "why",
        "whatIsSafeToChange",
        "whatShouldINotTouch",
        "whenIsThisDone",
    ])
        requiredString(ux[key], `ide.ux.${key}`);
}
function assertIdePayload(value) {
    const ide = requiredRecord(value, "ide");
    assertExactKeys(ide, IDE_TOP_LEVEL_KEYS, "ide");
    invariant(ide.kind === protocol_1.HITO_IDE_PAYLOAD_KIND, "ide.kind is not the qualified host payload kind");
    invariant(ide.version === protocol_1.HITO_IDE_HOST_VERSION, "ide.version is not the qualified IDE host version");
    invariant(ide.protocolVersion === protocol_1.HITO_HOST_PROTOCOL_VERSION, "ide.protocolVersion is not qualified");
    invariant(ide.authority === protocol_1.HITO_HOST_AUTHORITY, "ide.authority drifted");
    requiredString(ide.payloadIdentity, "ide.payloadIdentity");
    invariant(ide.mode === "GUIDED" || ide.mode === "ENGINEER" || ide.mode === "FORENSIC", "ide.mode is unsupported");
    assertSource(ide.source, "ide.source");
    assertUx(ide.ux);
    requiredArray(ide.navigationRoutes, "ide.navigationRoutes");
    const capabilities = requiredRecord(ide.hostCapabilities, "ide.hostCapabilities");
    invariant(capabilities.thinWrapperReady === true, "ide host is not thin-wrapper ready");
    invariant(capabilities.hostSpecificOntology === false, "IDE host cannot own ontology");
    invariant(capabilities.presentationHostDependency === false, "IDE host cannot require a presentation host");
    invariant(capabilities.semanticRecomputationRequired === false, "IDE wrapper cannot require semantic recomputation");
    assertGovernanceBoundary(ide.governanceBoundary, "ide.governanceBoundary");
    assertZeroEffects(ide.zeroEffectCounters, "ide.zeroEffectCounters");
    const surfaces = requiredRecord(ide.surfaces, "ide.surfaces");
    for (const key of [
        "projectPulse",
        "next",
        "why",
        "mri",
        "mermaid",
        "history",
        "evidence",
        "protectedAuthorities",
        "runtimeState",
        "freshness",
        "coverage",
        "intentProvenance",
    ])
        assertHostField(surfaces[key], `ide.surfaces.${key}`);
    const pulse = requiredRecord(requiredRecord(surfaces.projectPulse, "ide.surfaces.projectPulse").value, "ide.surfaces.projectPulse.value");
    invariant(protocol_1.HITO_TRUSTED_STATUSES.includes(pulse.status), "project status is not a typed HITO status");
    invariant(typeof pulse.materialStateCount === "number" && Number.isSafeInteger(pulse.materialStateCount) && pulse.materialStateCount >= 0, "material-state count is invalid");
    const next = requiredRecord(requiredRecord(surfaces.next, "ide.surfaces.next").value, "ide.surfaces.next.value");
    invariant(next.mutatingCommand === null, "next surface invented a mutating command");
    requiredString(next.explanation, "ide.surfaces.next.value.explanation");
    const why = requiredRecord(requiredRecord(surfaces.why, "ide.surfaces.why").value, "ide.surfaces.why.value");
    requiredString(why.explanation, "ide.surfaces.why.value.explanation");
    invariant(why.semanticVerdictIdentity === requiredRecord(ide.source, "ide.source").semanticVerdictIdentity, "Why semantic verdict identity drifted");
    const mermaid = requiredRecord(requiredRecord(surfaces.mermaid, "ide.surfaces.mermaid").value, "ide.surfaces.mermaid.value");
    invariant(mermaid.kind === "HITO_PRE_C9_DERIVED_MERMAID_MRI", "Mermaid kind drifted");
    requiredString(mermaid.mermaid, "ide.surfaces.mermaid.value.mermaid");
    invariant(mermaid.sourceMriIdentity === requiredRecord(ide.source, "ide.source").phase3MriIdentity, "Mermaid MRI source identity drifted");
    invariant(mermaid.sourceSemanticVerdictIdentity === requiredRecord(ide.source, "ide.source").semanticVerdictIdentity, "Mermaid semantic verdict identity drifted");
    const mermaidBoundary = requiredRecord(mermaid.governanceBoundary, "ide.surfaces.mermaid.value.governanceBoundary");
    invariant(mermaidBoundary.rawHtmlAllowed === false, "Mermaid raw HTML must remain forbidden");
    invariant(mermaidBoundary.canonicalAuthority === false && mermaidBoundary.executionAuthority === false, "Mermaid gained authority");
}
function assertAgentContext(value, ide) {
    const agent = requiredRecord(value, "agentContext");
    invariant(agent.kind === protocol_1.HITO_AGENT_CONTEXT_KIND, "agentContext.kind is not qualified");
    invariant(agent.version === protocol_1.HITO_AGENT_CONTEXT_VERSION, "agentContext.version is not qualified");
    invariant(agent.protocolVersion === protocol_1.HITO_HOST_PROTOCOL_VERSION, "agentContext.protocolVersion is not qualified");
    invariant(agent.authority === protocol_1.HITO_HOST_AUTHORITY, "agentContext.authority drifted");
    requiredString(agent.contextIdentity, "agentContext.contextIdentity");
    assertSource(agent.source, "agentContext.source");
    const source = agent.source;
    invariant(source.c7CompositionIdentity === ide.source.c7CompositionIdentity, "agent and IDE C7 identities disagree");
    invariant(source.g15EnvelopeIdentity === ide.source.g15EnvelopeIdentity, "agent and IDE G15 identities disagree");
    invariant(source.semanticVerdictIdentity === ide.source.semanticVerdictIdentity, "agent and IDE semantic verdict identities disagree");
    invariant(source.g16AssessmentIdentity === ide.source.g16AssessmentIdentity, "agent and IDE G16 identities disagree");
    invariant(agent.mutatingCommand === null, "agent context invented a mutating command");
    assertGovernanceBoundary(agent.governanceBoundary, "agentContext.governanceBoundary", true);
    assertZeroEffects(agent.zeroEffectCounters, "agentContext.zeroEffectCounters");
    for (const key of [
        "project",
        "reality",
        "protocolRulesets",
        "operationalMode",
        "intent",
        "currentObjective",
        "exactNextSafeMutation",
        "why",
        "blockers",
        "contradictionsAndConflicts",
        "unknownOrIndeterminate",
        "protectedAuthorities",
        "evidence",
        "freshness",
        "coverage",
        "runtimeAndTerritory",
        "safeToChange",
        "doneWhen",
    ])
        assertHostField(agent[key], `agentContext.${key}`);
}
function deepFreeze(value) {
    if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
        Object.freeze(value);
        for (const child of Object.values(value))
            deepFreeze(child);
    }
    return value;
}
function assertLocalBridgeDocument(value) {
    const bridge = requiredRecord(value, "bridge");
    assertExactKeys(bridge, ["kind", "ide", "agentContext"], "bridge");
    invariant(bridge.kind === protocol_1.HITO_P1_BRIDGE_KIND, "bridge.kind is unsupported");
    assertIdePayload(bridge.ide);
    if (bridge.agentContext !== undefined)
        assertAgentContext(bridge.agentContext, bridge.ide);
}
async function readLocalHitoBridge(workspaceRoot, configuredRelativePath) {
    invariant(configuredRelativePath.trim().length > 0, "hito.localPayloadPath is not configured; no semantic status is asserted");
    invariant(!path.isAbsolute(configuredRelativePath), "hito.localPayloadPath must be workspace-relative");
    const resolvedRoot = path.resolve(workspaceRoot);
    const resolvedPath = path.resolve(resolvedRoot, configuredRelativePath);
    const relative = path.relative(resolvedRoot, resolvedPath);
    invariant(relative.length > 0 && !relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative), "payload path must stay inside the opened workspace");
    const segments = path.normalize(relative).split(path.sep).map((segment) => segment.toLowerCase());
    invariant(!segments.includes(".hito"), "the wrapper will not read or legitimize a .hito namespace");
    const raw = await (0, promises_1.readFile)(resolvedPath, "utf8");
    let parsed;
    try {
        parsed = JSON.parse(raw);
    }
    catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        throw new Error(`HITO P1 local wrapper rejected input: payload is not valid JSON (${detail})`);
    }
    assertLocalBridgeDocument(parsed);
    return deepFreeze(parsed);
}
function trustedStatus(value) {
    return value.surfaces.projectPulse.value.status;
}
const firstObservationDigest = require("node:crypto").createHash;
const protocol_2 = require("./types/protocol");
function foExact(value, keys, label) {
    const record = requiredRecord(value, label);
    assertExactKeys(record, keys, label);
    invariant(keys.every((key) => Object.hasOwn(record, key)), `${label} has missing fields`);
    return record;
}
function foConstants(value, expected, label) {
    const record = foExact(value, Object.keys(expected), label);
    for (const key of Object.keys(expected))
        invariant(record[key] === expected[key], `${label}.${key} drifted`);
}
function foStable(value) {
    if (Array.isArray(value))
        return `[${value.map(foStable).join(",")}]`;
    if (isRecord(value))
        return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${foStable(value[key])}`).join(",")}}`;
    return JSON.stringify(value);
}
const FO_BOUNDARY = { derivedOnly: true, canonicalAuthority: false, ontologyAuthority: false, executionAuthority: false };
const FO_DIMENSIONS = { declaredIntent: "UNAVAILABLE", canonicalAuthority: "UNAVAILABLE", runtimeState: "UNAVAILABLE",
    ownership: "UNAVAILABLE", integration: "UNAVAILABLE", conflictAssessment: "INDETERMINATE", comparativeHistory: "NOT_APPLICABLE" };
/** Additive reader rejects version/schema/authority drift without invoking semantic engines. */
function assertFirstObservationBridge(value) {
    const bridge = foExact(value, ["kind", "ide", "agentContext"], "first-observation bridge");
    invariant(bridge.kind === protocol_2.HITO_FIRST_OBSERVATION_BRIDGE_KIND, "first-observation bridge version unsupported");
    const ide = foExact(bridge.ide, ["kind", "version", "host", "mri"], "first-observation IDE");
    const agent = foExact(bridge.agentContext, ["kind", "version", "host", "mutatingCommand"], "first-observation agent");
    invariant(ide.kind === "HITO_FIRST_OBSERVATION_IDE_PAYLOAD" && ide.version === "hito-first-observation-ide-r1", "first-observation IDE version unsupported");
    invariant(agent.kind === "HITO_FIRST_OBSERVATION_AGENT_CONTEXT" && agent.version === "hito-first-observation-agent-r1" && agent.mutatingCommand === null, "first-observation agent version or authority drifted");
    invariant(foStable(ide.host) === foStable(agent.host), "first-observation IDE/agent semantic parity failed");
    const host = foExact(ide.host, ["kind", "version", "mode", "priorState", "semanticResult", "source", "boundary"], "first-observation host");
    invariant(host.kind === "HITO_FIRST_OBSERVATION_HOST_PAYLOAD" && host.version === "hito-first-observation-host-r1"
        && host.mode === "FIRST_OBSERVATION" && host.priorState === "NO_PRIOR_STATE_ADMITTED", "first-observation host discriminator drifted");
    foConstants(host.boundary, FO_BOUNDARY, "first-observation host boundary");
    const result = foExact(host.semanticResult, ["kind", "version", "mode", "priorState", "subjectIdentity", "semanticResultIdentity", "documentaryEvidence", "dimensions", "coverage", "nextStep", "boundary"], "first-observation result");
    invariant(result.kind === "HITO_FIRST_OBSERVATION_SEMANTIC_RESULT" && result.version === "hito-first-observation-semantic-r1"
        && result.mode === "FIRST_OBSERVATION" && result.priorState === "NO_PRIOR_STATE_ADMITTED", "first-observation result discriminator drifted");
    requiredString(result.subjectIdentity, "subjectIdentity");
    invariant(/^hito_first_observation_r1_[a-f0-9]{64}$/.test(requiredString(result.semanticResultIdentity, "semanticResultIdentity")), "first-observation identity format invalid");
    foConstants(result.dimensions, FO_DIMENSIONS, "first-observation dimensions");
    foConstants(result.boundary, FO_BOUNDARY, "first-observation semantic boundary");
    foConstants(result.nextStep, { state: "NO_JUSTIFIED_NEXT_STEP", executionAuthority: false, mutatingCommand: null }, "first-observation next step");
    foConstants(result.coverage, { state: "PARTIAL", completeUnderstanding: false,
        warning: "First observation: partial coverage. Documentary evidence does not establish intent, canonical authority, runtime, ownership, integration, or absence of conflict." }, "first-observation coverage");
    foConstants(host.source, { subjectIdentity: result.subjectIdentity, semanticResultIdentity: result.semanticResultIdentity }, "first-observation source");
    const ids = new Set();
    const documents = requiredArray(result.documentaryEvidence, "documentaryEvidence");
    invariant(documents.length <= 10000, "oversized documentary evidence");
    for (const raw of documents) {
        const item = foExact(raw, ["evidenceId", "authorityClass", "content", "provenance"], "documentary evidence");
        const id = requiredString(item.evidenceId, "evidenceId");
        invariant(!ids.has(id), "duplicate evidence ID");
        ids.add(id);
        invariant(item.authorityClass === "DOCUMENTARY_EVIDENCE_ONLY" && typeof item.content === "string", "documentary authority escalation");
        const provenance = foExact(item.provenance, ["subjectIdentity", "sourcePath", "contentSha256", "capturedAt"], "documentary provenance");
        invariant(provenance.subjectIdentity === result.subjectIdentity, "documentary subject mismatch");
        requiredString(provenance.sourcePath, "sourcePath");
        const capturedAt = requiredString(provenance.capturedAt, "capturedAt");
        invariant(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(capturedAt) && Number.isFinite(Date.parse(capturedAt)), "invalid capture time");
        invariant(new TextEncoder().encode(item.content).length <= 1048576
            && provenance.contentSha256 === firstObservationDigest("sha256").update(item.content, "utf8").digest("hex"), "documentary content hash mismatch");
    }
    const { semanticResultIdentity, ...identityBody } = result;
    invariant(semanticResultIdentity === `hito_first_observation_r1_${firstObservationDigest("sha256").update(foStable(identityBody), "utf8").digest("hex")}`, "first-observation semantic content identity mismatch");
    const mri = foExact(ide.mri, ["kind", "version", "sourceSemanticResultIdentity", "mermaid", "dimensions", "nodes", "edges", "conflicts", "ownership", "completeness", "boundary"], "first-observation MRI");
    invariant(mri.kind === "HITO_FIRST_OBSERVATION_DERIVED_MRI" && mri.version === "hito-first-observation-mri-r1"
        && mri.sourceSemanticResultIdentity === result.semanticResultIdentity, "first-observation MRI version or source drifted");
    for (const key of ["nodes", "edges", "conflicts", "ownership"])
        invariant(mri[key] === null, `first-observation MRI invented ${key}`);
    foConstants(mri.dimensions, FO_DIMENSIONS, "MRI dimensions");
    foConstants(mri.completeness, { state: "PARTIAL", completeUnderstanding: false, allKnownGapsIncluded: true }, "MRI completeness");
    foConstants(mri.boundary, { derivedOnly: true, canonicalAuthority: false, executionAuthority: false, layoutSemanticInference: false }, "MRI boundary");
    const expectedLines = ["flowchart TD", '  coverage["FIRST_OBSERVATION - PARTIAL COVERAGE"]', '  prior["NO_PRIOR_STATE_ADMITTED"]',
        ...Object.entries(FO_DIMENSIONS).map(([name, state]) => `  gap_${name}["${name}: ${state}"]`), '  next["NO_JUSTIFIED_NEXT_STEP"]'];
    invariant(mri.mermaid === expectedLines.join("\n") + "\n", "MRI semantic gaps or source drifted");
}
async function readFirstObservationHitoBridge(workspaceRoot, configuredRelativePath) {
    invariant(configuredRelativePath.trim().length > 0 && !path.isAbsolute(configuredRelativePath), "first-observation payload path must be workspace-relative");
    const root = path.resolve(workspaceRoot);
    const target = path.resolve(root, configuredRelativePath);
    const relative = path.relative(root, target);
    invariant(relative.length > 0 && relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative), "first-observation path escaped workspace");
    invariant(!path.normalize(relative).split(path.sep).some((s) => s.toLowerCase() === ".hito"), "first-observation cannot legitimize a .hito namespace");
    const parsed = JSON.parse(await (0, promises_1.readFile)(target, "utf8"));
    assertFirstObservationBridge(parsed);
    return deepFreeze(parsed);
}
