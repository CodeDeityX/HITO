"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDerivedOutput = createDerivedOutput;
exports.evaluateStaleness = evaluateStaleness;
exports.refreshStaleness = refreshStaleness;
exports.assertDerivedOutputMayBePresented = assertDerivedOutputMayBePresented;
exports.derivedOutputInputsFromModel = derivedOutputInputsFromModel;
function createDerivedOutput(kind, inputs, provenance, generatedAt = "1970-01-01T00:00:00.000Z", generatingVersion = "phase0") {
    return {
        derivedOutputId: `derived_${kind.toLowerCase()}_${inputs.modelRevision}_${inputs.rulesetVersion}`,
        kind,
        sourceModelRevision: inputs.modelRevision,
        sourceHistoryHead: inputs.historyHead,
        sourceEvidenceHead: inputs.evidenceHead,
        rulesetVersion: inputs.rulesetVersion,
        generatedAt,
        generatingVersion,
        provenance,
        stalenessState: "FRESH",
    };
}
function evaluateStaleness(output, current) {
    if (output.sourceModelRevision !== current.modelRevision)
        return "STALE_MODEL";
    if (output.sourceHistoryHead.sequence !== current.historyHead.sequence || output.sourceHistoryHead.eventHash !== current.historyHead.eventHash)
        return "STALE_HISTORY";
    if (output.sourceEvidenceHead.sequence !== current.evidenceHead.sequence || output.sourceEvidenceHead.manifestHash !== current.evidenceHead.manifestHash)
        return "STALE_EVIDENCE";
    if (output.rulesetVersion !== current.rulesetVersion)
        return "STALE_RULESET";
    return "FRESH";
}
function refreshStaleness(output, current) {
    return { ...structuredClone(output), stalenessState: evaluateStaleness(output, current) };
}
function assertDerivedOutputMayBePresented(output) {
    if (output.stalenessState !== "FRESH") {
        throw new Error(`derived output ${output.derivedOutputId} cannot be presented as current truth: ${output.stalenessState}`);
    }
}
function derivedOutputInputsFromModel(model, rulesetVersion) {
    return {
        modelRevision: model.canonicalState.modelRevision,
        historyHead: model.canonicalState.historyHead,
        evidenceHead: model.canonicalState.evidenceHead,
        rulesetVersion,
    };
}
