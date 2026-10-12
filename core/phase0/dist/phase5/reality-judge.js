"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluatePhase5JudgeStaleness = exports.PHASE5_GENERATED_AT = exports.PHASE5_RULESET_VERSION = void 0;
exports.derivePhase5RealityJudge = derivePhase5RealityJudge;
const contracts_1 = require("../contracts");
const decision_engine_1 = require("../phase4/decision-engine");
/** HITO Phase 5 Repair 1: deterministic derived claim/evidence legitimacy judgment. */
exports.PHASE5_RULESET_VERSION = "hito-phase5-reality-judge-v1-repair3-completion";
exports.PHASE5_GENERATED_AT = "1970-01-01T00:00:00.000Z";
const sortedUnique = (values) => [...new Set(values)].sort((a, b) => a.localeCompare(b));
const stableId = (prefix, value) => `${prefix}_${(0, contracts_1.sha256Text)((0, contracts_1.canonicalize)(value)).slice(0, 32)}`;
const proofFor = (level) => level === "BUILD_VERIFIED" ? "BUILD_PROOF" : level === "TEST_VERIFIED" ? "TEST_PROOF" : level === "NATIVE_RUNTIME_VERIFIED" || level === "EXTERNAL_RUNTIME_VERIFIED" || level === "PRODUCTION_VERIFIED" ? "RUNTIME_PROOF" : "SOURCE_PROOF";
const proofCompatible = (provided, required) => provided === required;
const provenance = (model, sourceRef) => ({ observationClass: "RECONCILED", source: "hito:phase5:deterministic-reality-judge", sourceRef, confidence: 1, observedAt: exports.PHASE5_GENERATED_AT, modelRevision: model.canonicalState.modelRevision });
const isCompletionClaim = (request) => request.completionLike === true || /\b(complete|done|verified|production ready|ready|working|integrated|migration complete|recoverable|safe removal|continuity established)\b/i.test(request.statement);
function canonicalClaim(model, request) { return model.claims.find((item) => item.claimId === request.claimId); }
function claimIdentityIssues(claim, request) { if (!claim)
    return []; const issues = []; if (claim.subjectId !== request.subjectId || (claim.capabilityId && claim.capabilityId !== request.subjectId))
    issues.push("CLAIM_IDENTITY_MISMATCH"); if (claim.statement !== request.statement || claim.truthBoundary !== request.truthBoundary || (claim.promiseId ?? "") !== (request.promiseId ?? "") || claim.claimType !== request.claimType || claim.environment !== request.declaredScope)
    issues.push("CLAIM_IDENTITY_MISMATCH"); return sortedUnique(issues); }
function bindingsFor(model, request, claim) { if (claim)
    return [...claim.evidenceIds].sort().map((evidenceId) => ({ evidenceId, proofClass: proofFor(model.evidenceRefs.find((item) => item.evidenceId === evidenceId)?.verificationLevel ?? "SOURCE_ONLY"), truthBoundary: claim.truthBoundary, declaredScope: claim.environment })); return [...(request.evidenceBindings ?? [])].sort((a, b) => (0, contracts_1.canonicalize)(a).localeCompare((0, contracts_1.canonicalize)(b))); }
function validAttestation(model, request, claim, evidenceId, proofClass, kind, attestationId) { const evidence = model.evidenceRefs.find((item) => item.evidenceId === evidenceId); if (!evidence || !evidence.available || evidence.provenance.modelRevision !== model.canonicalState.modelRevision || evidence.subjectId !== request.subjectId || evidence.truthBoundary !== request.truthBoundary || evidence.environment !== request.declaredScope)
    return false; return (request.proofAttestations ?? []).some((attestation) => (attestationId === undefined || attestation.attestationId === attestationId) && attestation.evidenceId === evidenceId && attestation.evidenceContentHash === evidence.contentHash && attestation.proofClass === proofClass && attestation.truthBoundary === request.truthBoundary && attestation.declaredScope === request.declaredScope && attestation.sourceModelRevision === model.canonicalState.modelRevision && attestation.sourceAuthority === request.sourceAuthority && attestation.attestationKind === kind); }
function validDirectionInvalidationAttestation(model, request, claim, evidenceId) { const binding = bindingsFor(model, request, claim).find((item) => item.evidenceId === evidenceId); return binding !== undefined && validAttestation(model, request, claim, evidenceId, binding.proofClass, "DIRECTION_INVALIDATION", binding.attestationId); }
function evidenceAssessments(model, request, claim) { const seen = new Set(); const bindings = bindingsFor(model, request, claim); return bindings.map((binding) => { const evidence = model.evidenceRefs.find((item) => item.evidenceId === binding.evidenceId); if (!evidence)
    return { evidenceId: binding.evidenceId, subjectId: request.subjectId, proofClass: binding.proofClass, state: "MISSING", relevance: "UNKNOWN", strength: "INSUFFICIENT", reason: "Bound evidence does not exist in canonical evidence." }; const duplicateConflict = seen.has(binding.evidenceId); seen.add(binding.evidenceId); const canonicalProof = proofFor(evidence.verificationLevel); const nonCanonical = !["SOURCE_PROOF", "BUILD_PROOF", "TEST_PROOF", "RUNTIME_PROOF"].includes(binding.proofClass); const proofValid = nonCanonical ? validAttestation(model, request, claim, evidence.evidenceId, binding.proofClass, "PHASE5_PROOF", binding.attestationId) : binding.proofClass === canonicalProof; const subject = evidence.subjectId === request.subjectId; const boundary = evidence.truthBoundary === request.truthBoundary && binding.truthBoundary === request.truthBoundary; const scope = binding.declaredScope === request.declaredScope && evidence.environment === request.declaredScope; const state = !evidence.available ? "UNREADABLE_OR_INVALID" : evidence.provenance.modelRevision !== model.canonicalState.modelRevision ? "PRESENT_STALE" : !subject || !boundary || !scope ? "OUT_OF_SCOPE" : !proofValid || duplicateConflict ? "PRESENT_PARTIAL" : "PRESENT_CURRENT"; const relevance = !subject ? "WRONG_SUBJECT" : !boundary || !scope ? "OUT_OF_SCOPE" : "RELEVANT"; return { evidenceId: evidence.evidenceId, subjectId: evidence.subjectId, proofClass: binding.proofClass, state, relevance, strength: state === "PRESENT_CURRENT" ? "SUFFICIENT" : "INSUFFICIENT", reason: proofValid && !duplicateConflict ? `${state}; claim-bound ${relevance}.` : "INVALID_OR_UNSUPPORTED_PROOF_ATTESTATION" }; }); }
function phase4Validation(model, request, phase4) { const related = request.subjectType === "CAPABILITY" && [phase4.request.requestedCapability.capabilityId, ...phase4.reconciliation.candidateCapabilityIds].includes(request.subjectId); if (!related)
    return { valid: true, related: false, codes: [] }; if (phase4.source.derivedOutput.rulesetVersion !== decision_engine_1.PHASE4_RULESET_VERSION)
    return { valid: false, related: true, codes: ["UNACCEPTED_PHASE4_RULESET"] }; const expected = (0, decision_engine_1.derivePhase4Decision)(model, phase4.request); if ((0, contracts_1.canonicalize)(expected) !== (0, contracts_1.canonicalize)(phase4))
    return { valid: false, related: true, codes: ["PHASE4_INPUT_INTEGRITY_INVALID"] }; const stale = (0, contracts_1.evaluateStaleness)(phase4.source.derivedOutput, (0, contracts_1.derivedOutputInputsFromModel)(model, decision_engine_1.PHASE4_RULESET_VERSION)); const codes = phase4.contradictions.map((item) => item.code); if (stale !== "FRESH")
    codes.push("STALE_PHASE4_DECISION"); if (phase4.reconciliation.state === "UNKNOWN")
    codes.push("PHASE4_UNKNOWN_OR_AMBIGUITY"); if (phase4.reconciliation.state === "DISCONNECTED")
    codes.push("RUNTIME_GAP"); if (phase4.noDoubleWork.action === "BLOCKED")
    codes.push("PHASE4_BLOCKED"); return { valid: true, related: true, codes: sortedUnique(codes) }; }
function subjectBoundIntent(model, request, claim) { if (!request.requiresIntentAuthority)
    return true; const subject = model.capabilities.find((item) => item.capabilityId === request.subjectId); const promise = request.promiseId; return promise !== undefined && subject?.promiseIds.includes(promise) === true && (!claim || claim.promiseId === promise) && model.intent.some((item) => item.promiseId === promise && item.authority === "DECLARED_INTENT"); }
function derivePhase5RealityJudge(model, request, phase4) {
    (0, contracts_1.assertValidModel)(model);
    const before = (0, contracts_1.canonicalize)(model);
    const claim = canonicalClaim(model, request);
    const identityIssues = claimIdentityIssues(claim, request);
    const evidence = evidenceAssessments(model, request, claim);
    const phase4Check = phase4Validation(model, request, phase4);
    const subject = model.capabilities.find((item) => item.capabilityId === request.subjectId);
    const contradictions = [...identityIssues, ...phase4Check.codes];
    const unknowns = [];
    const observations = [];
    const intentConfirmed = subjectBoundIntent(model, request, claim);
    if (!intentConfirmed)
        unknowns.push("UNCONFIRMED_SUBJECT_BOUND_INTENT");
    if (!subject && request.subjectType === "CAPABILITY")
        unknowns.push("SUBJECT_NOT_FOUND");
    if (!claim && evidence.length === 0)
        unknowns.push("AD_HOC_CLAIM_HAS_NO_EXPLICIT_EVIDENCE_BINDING");
    if (request.requiredEvidenceClasses.length === 0)
        unknowns.push("NO_REQUIRED_PROOF_DECLARED");
    if (evidence.some((item) => item.reason === "INVALID_OR_UNSUPPORTED_PROOF_ATTESTATION"))
        unknowns.push("INVALID_OR_UNSUPPORTED_PROOF_ATTESTATION");
    const currentRelevant = evidence.filter((item) => item.relevance === "RELEVANT" && item.state === "PRESENT_CURRENT");
    const staleEvidence = evidence.filter((item) => item.relevance === "RELEVANT" && item.state === "PRESENT_STALE").map((item) => item.evidenceId);
    const proofSatisfied = (required) => currentRelevant.some((item) => proofCompatible(item.proofClass, required));
    const allProofs = request.requiredEvidenceClasses.length > 0 && request.requiredEvidenceClasses.every(proofSatisfied);
    const acceptedEvidence = allProofs ? currentRelevant.filter((item) => request.requiredEvidenceClasses.some((required) => proofCompatible(item.proofClass, required))).map((item) => item.evidenceId) : [];
    const rejectedEvidence = evidence.filter((item) => !acceptedEvidence.includes(item.evidenceId)).map((item) => item.evidenceId);
    const recoveryAssessment = request.subjectType !== "RECOVERY" && !/recover/i.test(request.statement) ? "RECOVERY_NOT_APPLICABLE" : proofSatisfied("RECOVERY_PROOF") ? "RECOVERY_PROVEN" : currentRelevant.length > 0 ? "RECOVERY_EVIDENCE_PARTIAL" : "RECOVERY_UNPROVEN";
    let verdict = "VERIFIED_CONTINUITY";
    let returnStep;
    let narrower;
    const lineageRelevant = phase4Check.related && contradictions.includes("LINEAGE_BLOCKS_BUILD_MISSING") && isCompletionClaim(request);
    if (!phase4Check.valid || identityIssues.length > 0) {
        verdict = "BLOCKED";
        returnStep = "CONTRADICTION_GATE";
    }
    else if (contradictions.includes("DO_NOT_TOUCH_CONFLICT")) {
        verdict = "BLOCKED";
        returnStep = "CONTRADICTION_GATE";
    }
    else if (unknowns.some((item) => ["SUBJECT_NOT_FOUND", "AD_HOC_CLAIM_HAS_NO_EXPLICIT_EVIDENCE_BINDING", "NO_REQUIRED_PROOF_DECLARED", "INVALID_OR_UNSUPPORTED_PROOF_ATTESTATION"].includes(item))) {
        verdict = "INDETERMINATE";
        returnStep = "EVIDENCE_COLLECTION";
    }
    else if (request.claimType === "DIRECTION_CONTRADICTION" && !contradictions.some((item) => ["COMPETING_RUNTIME_HOME", "EQUIVALENT_CAPABILITY_CANDIDATES", "PHASE4_UNKNOWN_OR_AMBIGUITY", "EVIDENCE_CLAIM_MISMATCH", "DO_NOT_TOUCH_CONFLICT", "PHASE4_BLOCKED", "STALE_PHASE4_DECISION"].includes(item)) && intentConfirmed && proofSatisfied("RUNTIME_PROOF") && request.promiseId !== undefined && request.directionInvalidationEvidenceIds !== undefined && request.directionInvalidationEvidenceIds.length > 0 && request.directionInvalidationEvidenceIds.every((id) => acceptedEvidence.includes(id) && validDirectionInvalidationAttestation(model, request, claim, id))) {
        verdict = "COURSE_CHANGE_REQUIRED";
        returnStep = "COURSE_CHANGE_DECISION";
    }
    else if (lineageRelevant || contradictions.includes("COMPETING_RUNTIME_HOME") || contradictions.includes("EQUIVALENT_CAPABILITY_CANDIDATES") || contradictions.includes("PHASE4_UNKNOWN_OR_AMBIGUITY")) {
        verdict = "RECONCILIATION_REQUIRED";
        returnStep = "RECONCILIATION";
    }
    else if (contradictions.includes("EVIDENCE_CLAIM_MISMATCH")) {
        verdict = "REPAIR_REQUIRED";
        returnStep = "REPAIR";
    }
    else if (!intentConfirmed) {
        verdict = "BLOCKED";
        returnStep = "INTENT";
    }
    else if (recoveryAssessment === "RECOVERY_UNPROVEN" || recoveryAssessment === "RECOVERY_EVIDENCE_PARTIAL") {
        verdict = "INDETERMINATE";
        returnStep = "RECOVERY";
    }
    else if (staleEvidence.length > 0 || contradictions.includes("STALE_PHASE4_DECISION")) {
        verdict = "INDETERMINATE";
        returnStep = "EVIDENCE_COLLECTION";
    }
    else if ((subject?.runtimeGap || contradictions.includes("RUNTIME_GAP")) && request.requiredEvidenceClasses.some((item) => item === "INTEGRATION_PROOF" || item === "RUNTIME_PROOF" || item === "USER_JOURNEY_PROOF")) {
        verdict = "RECONCILIATION_REQUIRED";
        returnStep = "INTEGRATION";
    }
    else if (!allProofs) {
        verdict = "INDETERMINATE";
        returnStep = "EVIDENCE_COLLECTION";
        narrower = currentRelevant.length > 0 ? `${request.subjectId} has bounded claim-relevant evidence but not every required proof class.` : undefined;
    }
    else if (subject?.health === "HEALTHY_WITH_OBSERVATIONS") {
        verdict = "VERIFIED_WITH_OBSERVATIONS";
        observations.push("Subject health contains non-blocking observations.");
    }
    const normalizedProofs = [...new Set(request.requiredEvidenceClasses)].sort();
    const normalizedRequest = { ...request, requiredEvidenceClasses: normalizedProofs, evidenceBindings: [...(request.evidenceBindings ?? [])].sort((a, b) => (0, contracts_1.canonicalize)(a).localeCompare((0, contracts_1.canonicalize)(b))), directionInvalidationEvidenceIds: sortedUnique(request.directionInvalidationEvidenceIds ?? []), proofAttestations: [...(request.proofAttestations ?? [])].sort((a, b) => (0, contracts_1.canonicalize)(a).localeCompare((0, contracts_1.canonicalize)(b))) };
    const identity = { request: normalizedRequest, claim: claim?.claimId, evidence: evidence.map((item) => [item.evidenceId, item.proofClass, item.state]), phase4: phase4Check.related ? phase4.source.semanticHash : "NOT_APPLICABLE", ruleset: exports.PHASE5_RULESET_VERSION };
    const judgeResultId = stableId("judge", identity);
    const derivedOutput = (0, contracts_1.createDerivedOutput)("REALITY_JUDGE", (0, contracts_1.derivedOutputInputsFromModel)(model, exports.PHASE5_RULESET_VERSION), { inputEntityIds: sortedUnique([request.subjectId, ...(phase4Check.related ? phase4.reconciliation.candidateCapabilityIds : [])]), evidenceIds: sortedUnique(evidence.map((item) => item.evidenceId)), ruleIds: [exports.PHASE5_RULESET_VERSION], derivationSteps: ["VALIDATE_CANONICAL_MODEL", "VALIDATE_CLAIM_BINDING", "VALIDATE_PHASE4_INPUT", "CLASSIFY_EVIDENCE", "CHALLENGE_CLAIM", "ROUTE_SINGLE_RETURN_STEP"] }, exports.PHASE5_GENERATED_AT, exports.PHASE5_RULESET_VERSION);
    derivedOutput.derivedOutputId = `${derivedOutput.derivedOutputId}_${(0, contracts_1.sha256Text)((0, contracts_1.canonicalize)(identity)).slice(0, 32)}`;
    const severity = verdict === "VERIFIED_CONTINUITY" ? "INFO" : verdict === "VERIFIED_WITH_OBSERVATIONS" || verdict === "INDETERMINATE" ? "WARNING" : verdict === "BLOCKED" ? "HIGH" : "CRITICAL";
    const result = { kind: "HITO_PHASE5_REALITY_JUDGE_RESULT", judgeResultId, claimId: request.claimId, subject: { type: request.subjectType, id: request.subjectId }, verdict, truthBoundary: request.truthBoundary, claimScope: request.declaredScope, requiredProof: normalizedProofs, availableEvidence: evidence, acceptedEvidence: sortedUnique(acceptedEvidence), rejectedEvidence: sortedUnique(rejectedEvidence), staleEvidence: sortedUnique(staleEvidence), contradictions: sortedUnique(contradictions), unknowns: sortedUnique(unknowns), observations: sortedUnique(observations), severity, confidence: verdict === "VERIFIED_CONTINUITY" ? 1 : acceptedEvidence.length > 0 ? 0.6 : 0.2, ...(narrower ? { supportedNarrowerClaimIfAny: narrower } : {}), recoveryAssessment, ...(returnStep ? { returnStepIfFailed: returnStep } : {}), reasoningSummary: `${verdict}: claim and evidence were evaluated only through explicit deterministic bindings.`, sourceModelRevision: model.canonicalState.modelRevision, sourceHistoryHead: structuredClone(model.canonicalState.historyHead), sourceEvidenceHead: structuredClone(model.canonicalState.evidenceHead), sourcePhase4DecisionId: phase4Check.related ? phase4.source.derivedOutput.derivedOutputId : "NOT_APPLICABLE", rulesetVersion: exports.PHASE5_RULESET_VERSION, generatedAt: exports.PHASE5_GENERATED_AT, provenance: provenance(model, `phase5:judge:${judgeResultId}`), stalenessState: "FRESH", executionAuthority: "NON_EXECUTING_JUDGMENT", derivedOutput };
    if ((0, contracts_1.canonicalize)(model) !== before)
        throw new Error("Phase 5 Reality Judge mutated canonical model truth");
    return result;
}
const evaluatePhase5JudgeStaleness = (result, model) => (0, contracts_1.evaluateStaleness)(result.derivedOutput, (0, contracts_1.derivedOutputInputsFromModel)(model, result.rulesetVersion));
exports.evaluatePhase5JudgeStaleness = evaluatePhase5JudgeStaleness;
