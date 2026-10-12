"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PHASE6_AUTHORITY = exports.PHASE6_GENERATED_AT = exports.PHASE6_RULESET_VERSION = void 0;
exports.validatePhase6AuthoritySet = validatePhase6AuthoritySet;
exports.derivePhase6ReadOnlyProjections = derivePhase6ReadOnlyProjections;
/** HITO Phase 6: one deterministic, derived, read-only projection of existing HITO truth. */
const contracts_1 = require("../contracts");
const decision_engine_1 = require("../phase4/decision-engine");
const reality_judge_1 = require("../phase5/reality-judge");
exports.PHASE6_RULESET_VERSION = "hito-phase6-operator-agent-readonly-v1-repair1";
exports.PHASE6_GENERATED_AT = "1970-01-01T00:00:00.000Z";
exports.PHASE6_AUTHORITY = "DERIVED / READ_ONLY / NON_CANONICAL";
const sorted = (items, key) => [...items].sort((a, b) => key(a).localeCompare(key(b)));
const unique = (items) => [...new Set(items)].sort((a, b) => a.localeCompare(b));
const stable = (prefix, value) => `${prefix}_${(0, contracts_1.sha256Text)((0, contracts_1.canonicalize)(value)).slice(0, 32)}`;
function currentRuntime(model, capabilityId) { const revision = model.canonicalState.modelRevision; return sorted(model.runtimeHomes.filter((home) => home.capabilityId === capabilityId && home.effectiveFromRevision <= revision && (home.effectiveToRevision === undefined || home.effectiveToRevision > revision)), (home) => home.runtimeHomeId)[0]; }
function source(model, phase4, phase5) { return { modelRevision: model.canonicalState.modelRevision, historySequence: model.canonicalState.historyHead.sequence, evidenceSequence: model.canonicalState.evidenceHead.sequence, phase4RulesetVersion: phase4.source.derivedOutput.rulesetVersion, phase5RulesetVersion: phase5.rulesetVersion, rulesetVersion: exports.PHASE6_RULESET_VERSION }; }
function truth(model, phase4, phase5) {
    const capabilities = sorted(model.capabilities, (item) => item.capabilityId).map((item) => ({ capabilityId: item.capabilityId, name: item.name, purpose: item.purpose, questionAnswered: item.questionAnswered, lifecycleStatus: item.lifecycleStatus, health: item.health, ownerSubsystemId: item.owningSubsystemId, currentRuntimeHomeId: currentRuntime(model, item.capabilityId)?.runtimeHomeId ?? null, dependencies: [...item.dependencies].sort(), lineageEventIds: [...item.lineageEventIds].sort(), evidenceIds: [...item.evidenceIds].sort(), claimBoundary: item.claimBoundary, unknown: item.lifecycleStatus === "UNKNOWN" || item.provenance.observationClass === "UNKNOWN", runtimeGap: item.runtimeGap }));
    const runtimeHomes = sorted(model.runtimeHomes.filter((item) => item.effectiveFromRevision <= model.canonicalState.modelRevision && (item.effectiveToRevision === undefined || item.effectiveToRevision > model.canonicalState.modelRevision)), (item) => item.runtimeHomeId).map((item) => ({ runtimeHomeId: item.runtimeHomeId, capabilityId: item.capabilityId, locator: item.locator, status: item.status, ...(item.stateOwner ? { stateOwner: item.stateOwner } : {}), ...(item.eventOwner ? { eventOwner: item.eventOwner } : {}), ...(item.persistenceOwner ? { persistenceOwner: item.persistenceOwner } : {}) }));
    const unknowns = unique([...capabilities.flatMap((item) => [...(item.unknown ? [`UNKNOWN:${item.capabilityId}`] : []), ...(item.runtimeGap ? [`RUNTIME_GAP:${item.capabilityId}`] : [])]), ...phase4.reconciliation.unknowns, ...phase5.unknowns]);
    const material = { project: { projectId: model.project.projectId, name: model.project.name, modelRevision: model.canonicalState.modelRevision, releaseContract: model.releaseContract }, capabilities, runtimeHomes, unknowns, ambiguities: sorted(phase4.reconciliation.relatedAmbiguityAnchors.map((anchor) => ({ anchor, candidateIds: [...phase4.reconciliation.candidateCapabilityIds].sort(), reason: "PHASE4_RELATED_AMBIGUITY" })), (item) => item.anchor), contradictions: unique([...phase4.contradictions.map((item) => item.code), ...phase5.contradictions]), evidence: sorted(model.evidenceRefs, (item) => item.evidenceId).map((item) => ({ evidenceId: item.evidenceId, subjectId: item.subjectId, environment: item.environment, verificationLevel: item.verificationLevel, available: item.available, truthBoundary: item.truthBoundary })), phase4: { decisionId: phase4.source.derivedOutput.derivedOutputId, rulesetVersion: phase4.source.derivedOutput.rulesetVersion, reconciliationState: phase4.reconciliation.state, noDoubleWorkAction: phase4.noDoubleWork.action, nextSafeMutation: phase4.proposal.plainLanguageAction, doNotTouch: unique([...phase4.proposal.doNotTouch.protectedCapabilityIds, ...phase4.proposal.doNotTouch.currentRuntimeHomeIds, ...phase4.proposal.doNotTouch.redZones]), contradictions: sorted(phase4.contradictions, (item) => item.contradictionId).map((item) => item.code), unknowns: [...phase4.reconciliation.unknowns].sort(), stalenessState: phase4.source.derivedOutput.stalenessState }, phase5: { judgeResultId: phase5.judgeResultId, rulesetVersion: phase5.rulesetVersion, verdict: phase5.verdict, claimId: phase5.claimId, truthBoundary: phase5.truthBoundary, acceptedEvidence: [...phase5.acceptedEvidence].sort(), rejectedEvidence: [...phase5.rejectedEvidence].sort(), unknowns: [...phase5.unknowns].sort(), contradictions: [...phase5.contradictions].sort(), ...(phase5.returnStepIfFailed ? { returnStepIfFailed: phase5.returnStepIfFailed } : {}), limitations: ["Named claim only", "Bounded truth boundary", "Derived non-canonical judgment", "No target execution"], stalenessState: phase5.stalenessState } };
    return { truthId: stable("phase6_truth", material), ...material };
}
/** Phase 6 Repair 1: authenticates supplied accepted derived authority without reinterpreting it. */
function validatePhase6AuthoritySet(input) {
    (0, contracts_1.assertValidModel)(input.model);
    const model = input.model;
    const phase4 = input.phase4;
    const phase5 = input.phase5;
    if (phase4.kind !== "HITO_PHASE4_DECISION_REPORT" || phase4.source.derivedOutput.rulesetVersion !== decision_engine_1.PHASE4_RULESET_VERSION || phase4.source.modelRevision !== model.canonicalState.modelRevision || phase4.source.historySequence !== model.canonicalState.historyHead.sequence || phase4.source.evidenceSequence !== model.canonicalState.evidenceHead.sequence || (0, contracts_1.evaluateStaleness)(phase4.source.derivedOutput, (0, contracts_1.derivedOutputInputsFromModel)(model, decision_engine_1.PHASE4_RULESET_VERSION)) !== "FRESH")
        throw new Error("Phase 6 rejects unauthenticated or stale Phase 4 authority");
    const expectedPhase4 = (0, decision_engine_1.derivePhase4Decision)(model, phase4.request);
    if ((0, contracts_1.canonicalize)(expectedPhase4) !== (0, contracts_1.canonicalize)(phase4))
        throw new Error("Phase 6 rejects forged or foreign Phase 4 authority");
    if (phase5.kind !== "HITO_PHASE5_REALITY_JUDGE_RESULT" || phase5.rulesetVersion !== reality_judge_1.PHASE5_RULESET_VERSION || phase5.executionAuthority !== "NON_EXECUTING_JUDGMENT" || phase5.sourceModelRevision !== model.canonicalState.modelRevision || phase5.sourceHistoryHead.sequence !== model.canonicalState.historyHead.sequence || phase5.sourceEvidenceHead.sequence !== model.canonicalState.evidenceHead.sequence || phase5.derivedOutput.rulesetVersion !== reality_judge_1.PHASE5_RULESET_VERSION || phase5.derivedOutput.sourceModelRevision !== model.canonicalState.modelRevision || phase5.derivedOutput.sourceHistoryHead.sequence !== model.canonicalState.historyHead.sequence || phase5.derivedOutput.sourceEvidenceHead.sequence !== model.canonicalState.evidenceHead.sequence || (0, reality_judge_1.evaluatePhase5JudgeStaleness)(phase5, model) !== "FRESH")
        throw new Error("Phase 6 rejects unauthenticated or stale Phase 5 authority");
    const expectedPhase5 = (0, reality_judge_1.derivePhase5RealityJudge)(model, input.phase5Request, expectedPhase4);
    if ((0, contracts_1.canonicalize)(expectedPhase5) !== (0, contracts_1.canonicalize)(phase5))
        throw new Error("Phase 6 rejects forged, foreign, or cross-authority Phase 5 result");
}
function derivePhase6ReadOnlyProjections(input) {
    (0, contracts_1.assertValidModel)(input.model);
    const before = (0, contracts_1.canonicalize)(input.model);
    validatePhase6AuthoritySet(input);
    const shared = truth(input.model, input.phase4, input.phase5);
    const projectionSource = source(input.model, input.phase4, input.phase5);
    const operator = { kind: "HITO_PHASE6_OPERATOR_PROJECTION", operatorProjectionId: stable("operator", { projectionSource, truthId: shared.truthId }), authority: exports.PHASE6_AUTHORITY, source: projectionSource, truth: shared, truthBoundary: "Read-only projection of the named canonical model and supplied accepted Phase 4/5 outputs; no new project truth is inferred.", limitations: ["No canonical mutation", "No target execution", "No alternate ownership/runtime authority", "UNKNOWN remains explicit"], executionAuthority: "NON_EXECUTING_PROJECTION" };
    const agent = { kind: "HITO_PHASE6_AGENT_CONTEXT", agentContextId: stable("agent_context", { projectionSource, truthId: shared.truthId }), authority: exports.PHASE6_AUTHORITY, source: projectionSource, truth: shared, agentBoundary: ["Read only", "No truth upgrade", "No canonical write", "No execution", "Agent context is derived from HITO truth"], executionAuthority: "NON_EXECUTING_PROJECTION" };
    if ((0, contracts_1.canonicalize)(input.model) !== before)
        throw new Error("Phase 6 projection mutated canonical truth");
    return { operator, agent };
}
