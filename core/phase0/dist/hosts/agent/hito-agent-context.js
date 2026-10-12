"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HITO_PRE_C9_AGENT_CONTEXT_VERSION = void 0;
exports.createHitoAgentContext = createHitoAgentContext;
exports.createHitoFirstObservationAgentContext = createHitoFirstObservationAgentContext;
const node_crypto_1 = require("node:crypto");
const g15_universal_protocol_projection_1 = require("../../convergence/g15-universal-protocol-projection");
const hito_host_protocol_1 = require("../shared/hito-host-protocol");
exports.HITO_PRE_C9_AGENT_CONTEXT_VERSION = "hito-pre-c9-agent-context-v1";
const REQUEST_KEYS = ["mode"];
function invariant(condition, message) {
    if (!condition)
        throw new Error(`HITO pre-C9 agent host rejected input: ${message}`);
}
function normalizeRequest(request) {
    const value = request ?? {};
    invariant(value !== null && typeof value === "object" && !Array.isArray(value), "request must be structured");
    const unsupported = Object.keys(value).filter((key) => !REQUEST_KEYS.includes(key)).sort();
    invariant(unsupported.length === 0, `request rejects unsupported or precomputed authority fields: ${unsupported.join(", ")}`);
    const mode = value.mode ?? "ENGINEER";
    invariant(g15_universal_protocol_projection_1.G15_PROJECTION_MODES.includes(mode), `unsupported presentation mode ${String(mode)}`);
    return { mode };
}
function field(value, provenance) {
    return Object.freeze({ value, provenance, semanticAuthority: false, executionAuthority: false });
}
/** Pure machine-readable agent context over exact existing host protocol truth. */
function createHitoAgentContext(snapshot, request) {
    const normalized = normalizeRequest(request);
    const protocol = (0, hito_host_protocol_1.projectHitoHostProtocol)(snapshot, normalized.mode);
    const materialStates = protocol.why.value.materialStates;
    const blockers = structuredClone(materialStates.filter((item) => item.severity === "BLOCKER"));
    const contradictionsAndConflicts = structuredClone(materialStates.filter((item) => item.category === "CONFLICT" || item.category === "CONTRADICTION"));
    const unknownOrIndeterminate = structuredClone(materialStates.filter((item) => item.category === "UNKNOWN" || item.category === "INDETERMINATE"));
    const g15Provenance = protocol.why.provenance;
    const contextIdentity = `hito_pre_c9_agent_${(0, node_crypto_1.createHash)("sha256").update(Buffer.from([
        protocol.source.c7CompositionIdentity,
        protocol.source.semanticVerdictIdentity,
        protocol.source.g16AssessmentIdentity,
        protocol.mode,
    ].join("\n"), "utf8")).digest("hex")}`;
    const result = {
        kind: "HITO_PRE_C9_HOST_NEUTRAL_AGENT_CONTEXT",
        version: exports.HITO_PRE_C9_AGENT_CONTEXT_VERSION,
        protocolVersion: protocol.protocolVersion,
        authority: protocol.authority,
        contextIdentity,
        mode: protocol.mode,
        source: protocol.source,
        project: field({
            projectIdentity: snapshot.c6.g15.governedTruth.projectScopeIdentity,
            whereAmI: protocol.uxAnswers.whereAmI,
        }, protocol.projectPulse.provenance),
        reality: field({
            c7CompositionIdentity: snapshot.compositionId,
            c6CompositionIdentity: snapshot.c6.compositionId,
            semanticVerdictIdentity: snapshot.c6.g15.semanticVerdictIdentity,
            g8RealityIdentity: snapshot.g16.sourceAuthorities.g8RealityIdentity,
            g16AssessmentIdentity: snapshot.g16.assessmentId,
            overallStatus: snapshot.c6.g15.governedTruth.overallStatus,
        }, g15Provenance),
        protocolRulesets: field({
            c7: snapshot.rulesets.c7,
            g16: snapshot.rulesets.g16,
            c6: snapshot.c6.rulesets.c6,
            g15: snapshot.c6.rulesets.g15,
        }, g15Provenance),
        operationalMode: field(structuredClone(protocol.runtimeState.value.operationalMode), protocol.runtimeState.provenance),
        intent: field({
            records: structuredClone(protocol.intentProvenance.value.governedAndPresentedIntents),
            extractedCandidates: structuredClone(protocol.intentProvenance.value.extractedIntentCandidates),
            declaredIntentImported: false,
            agentProposalCanonicalAuthority: false,
            recommendationIsCommitment: false,
            commitmentIsExecutionAuthority: false,
        }, protocol.intentProvenance.provenance),
        currentObjective: field(protocol.uxAnswers.whatAmITryingToDo, protocol.projectPulse.provenance),
        exactNextSafeMutation: protocol.next,
        why: protocol.why,
        blockers: field(blockers, g15Provenance),
        contradictionsAndConflicts: field(contradictionsAndConflicts, g15Provenance),
        unknownOrIndeterminate: field(unknownOrIndeterminate, g15Provenance),
        protectedAuthorities: protocol.protectedAuthorities,
        evidence: protocol.evidence,
        freshness: protocol.freshness,
        coverage: protocol.coverage,
        runtimeAndTerritory: protocol.runtimeState,
        safeToChange: field(protocol.uxAnswers.whatIsSafeToChange, protocol.projectPulse.provenance),
        doneWhen: field(protocol.uxAnswers.whenIsThisDone, protocol.projectPulse.provenance),
        mutatingCommand: null,
        governanceBoundary: {
            ...protocol.governanceBoundary,
            acceptsAgentProseAsIntent: false,
            acceptsCallerVerdict: false,
            acceptsCallerNextStep: false,
            acceptsCallerProtectedScope: false,
            createsCommitment: false,
            createsExecutionAuthority: false,
        },
        zeroEffectCounters: protocol.zeroEffectCounters,
    };
    return Object.freeze(result);
}
const hito_host_protocol_2 = require("../shared/hito-host-protocol");
function createHitoFirstObservationAgentContext(result) {
    return {
        kind: "HITO_FIRST_OBSERVATION_AGENT_CONTEXT",
        version: "hito-first-observation-agent-r1",
        host: (0, hito_host_protocol_2.projectHitoFirstObservationHost)(result),
        mutatingCommand: null,
    };
}
