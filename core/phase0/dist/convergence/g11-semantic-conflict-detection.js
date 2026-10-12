"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.G11_MANIFEST_SHA256 = exports.G11_CONTINUITY_SHA256 = exports.G11_TRACEABILITY_SHA256 = exports.G11_CASES_SHA256 = exports.G11_MODEL_SHA256 = exports.G11_RESEARCH_REPORT_SHA256 = exports.G11_SEMANTIC_CONFLICT_AUTHORITY = exports.G11_SEMANTIC_CONFLICT_RULESET_VERSION = void 0;
exports.detectG11BoundedSemanticConflict = detectG11BoundedSemanticConflict;
const contracts_1 = require("../contracts");
const decision_engine_1 = require("../phase4/decision-engine");
const g8_engineering_reality_1 = require("./g8-engineering-reality");
const g9_transition_completion_1 = require("./g9-transition-completion");
const g10_semantic_history_diff_1 = require("./g10-semantic-history-diff");
const semantic_canonicalization_1 = require("./semantic-canonicalization");
exports.G11_SEMANTIC_CONFLICT_RULESET_VERSION = "hito-semantic-conflict-detection-research-v1";
exports.G11_SEMANTIC_CONFLICT_AUTHORITY = "BOUNDED CONFLICT DETECTION / DERIVED / DETERMINISTIC / READ_ONLY / NON_CANONICAL / NON_EXECUTING";
exports.G11_RESEARCH_REPORT_SHA256 = "4b650aa0c7d1cc84763c2cbd0136093ea33b0f535df97fb0c40c434a87bf404a";
exports.G11_MODEL_SHA256 = "496fc64b59e0df7902ac5c8373cc5767b17ad680ad3205d767d41f492c49102d";
exports.G11_CASES_SHA256 = "c6e73778b25c41b9e308317e084869e1bb9c17de912e1895b54301ea92253de6";
exports.G11_TRACEABILITY_SHA256 = "319f34fb1981da7470fe4c829f9503f48e28ff29fc970babb7ff8a57f5c019a4";
exports.G11_CONTINUITY_SHA256 = "cc13474c05c8549ffd86e07ad4b6ceff5c06591ce5bed759d9d829201390d32c";
exports.G11_MANIFEST_SHA256 = "892cc8386404c87d6f3b5c0c29eb1721aae961b1ae7b9e35a03b738d6862a60f";
const INPUT_KEYS = ["model", "g8Successor", "g9", "g10", "phase4", "request"];
const REQUEST_KEYS = ["projectId", "subjectId", "scopeIdentity", "targetIdentity", "semanticKey", "factSetCompleteness", "applicability", "facts"];
const APPLICABILITY_KEYS = ["phase2Reconciliation", "phase4ProtectedAuthority", "g9TransitionCompletion"];
const FACT_KEYS = ["factId", "projectId", "subjectId", "scopeIdentity", "targetIdentity", "semanticKey", "acceptedMeaningIdentity", "sourceBytesIdentity", "causalPositionEventHash", "authority"];
const AUTHORITY_KEYS = ["authorityId", "state", "sourceRevision", "boundRealityIdentity"];
const AUTHORITY_STATES = ["CURRENT", "STALE", "UNAVAILABLE", "UNAUTHENTICATED", "CONFLICTING", "INVALID", "UNKNOWN"];
const HARD_PHASE4_CONTRADICTIONS = new Set([
    "COMPETING_PRIMARY_OWNER",
    "COMPETING_RUNTIME_HOME",
    "EQUIVALENT_CAPABILITY_CANDIDATES",
    "EVIDENCE_CLAIM_MISMATCH",
    "DO_NOT_TOUCH_CONFLICT",
    "LINEAGE_BLOCKS_BUILD_MISSING",
]);
function zeroEffects() {
    return {
        canonicalWriteCount: 0,
        governedTargetMutationCount: 0,
        targetExecutionCount: 0,
        providerModelCallCount: 0,
        unauthorizedNetworkCallCount: 0,
        namespaceMigrationCount: 0,
    };
}
function assertExactKeys(value, allowed, label) {
    const unsupported = Object.keys(value).filter((key) => !allowed.includes(key)).sort(semantic_canonicalization_1.compareSemanticCodePoints);
    if (unsupported.length > 0)
        throw new Error(`${label} rejects unsupported or precomputed authority fields: ${unsupported.join(", ")}`);
}
function safe(value, label) {
    return (0, semantic_canonicalization_1.assertBoundedSemanticIdentity)(value, label);
}
function normalizedKey(value, label) {
    return safe(value, label).normalize("NFC").toLowerCase().replaceAll(/[^\p{L}\p{N}]+/gu, " ").trim();
}
function assertApplicability(value, label) {
    if (value !== "REQUIRED" && value !== "NOT_REQUIRED")
        throw new Error(`HITO G11 requires explicit ${label} applicability`);
}
function normalizedRequest(request) {
    if (request === null || typeof request !== "object")
        throw new Error("HITO G11 requires an explicit structured detection request");
    assertExactKeys(request, REQUEST_KEYS, "HITO G11 detection request");
    if (request.applicability === null || typeof request.applicability !== "object") {
        throw new Error("HITO G11 requires explicit source applicability");
    }
    assertExactKeys(request.applicability, APPLICABILITY_KEYS, "HITO G11 source applicability");
    assertApplicability(request.applicability.phase2Reconciliation, "Phase-2 reconciliation");
    assertApplicability(request.applicability.phase4ProtectedAuthority, "Phase-4 protected-authority");
    assertApplicability(request.applicability.g9TransitionCompletion, "G9 transition-completion");
    if (!["COMPLETE", "INCOMPLETE", "UNKNOWN"].includes(request.factSetCompleteness)) {
        throw new Error("HITO G11 requires explicit fact-set completeness");
    }
    if (!Array.isArray(request.facts))
        throw new Error("HITO G11 requires an explicit facts collection");
    const facts = (0, semantic_canonicalization_1.canonicalSemanticSet)(request.facts.map((fact, index) => {
        if (fact === null || typeof fact !== "object")
            throw new Error(`HITO G11 fact[${index}] must be structured`);
        assertExactKeys(fact, FACT_KEYS, `HITO G11 fact[${index}]`);
        if (fact.authority === null || typeof fact.authority !== "object")
            throw new Error(`HITO G11 fact[${index}] requires bound authority`);
        assertExactKeys(fact.authority, AUTHORITY_KEYS, `HITO G11 fact[${index}] authority`);
        if (!AUTHORITY_STATES.includes(fact.authority.state))
            throw new Error(`HITO G11 fact[${index}] authority state is invalid`);
        if (!Number.isSafeInteger(fact.authority.sourceRevision) || fact.authority.sourceRevision < 0) {
            throw new Error(`HITO G11 fact[${index}] authority revision is invalid`);
        }
        return {
            factId: safe(fact.factId, `facts[${index}].factId`),
            projectId: safe(fact.projectId, `facts[${index}].projectId`),
            subjectId: safe(fact.subjectId, `facts[${index}].subjectId`),
            scopeIdentity: safe(fact.scopeIdentity, `facts[${index}].scopeIdentity`),
            targetIdentity: safe(fact.targetIdentity, `facts[${index}].targetIdentity`),
            semanticKey: safe(fact.semanticKey, `facts[${index}].semanticKey`),
            acceptedMeaningIdentity: safe(fact.acceptedMeaningIdentity, `facts[${index}].acceptedMeaningIdentity`),
            sourceBytesIdentity: safe(fact.sourceBytesIdentity, `facts[${index}].sourceBytesIdentity`),
            causalPositionEventHash: safe(fact.causalPositionEventHash, `facts[${index}].causalPositionEventHash`),
            authority: {
                authorityId: safe(fact.authority.authorityId, `facts[${index}].authority.authorityId`),
                state: fact.authority.state,
                sourceRevision: fact.authority.sourceRevision,
                boundRealityIdentity: safe(fact.authority.boundRealityIdentity, `facts[${index}].authority.boundRealityIdentity`),
            },
        };
    }));
    return {
        projectId: safe(request.projectId, "request.projectId"),
        subjectId: safe(request.subjectId, "request.subjectId"),
        scopeIdentity: safe(request.scopeIdentity, "request.scopeIdentity"),
        targetIdentity: safe(request.targetIdentity, "request.targetIdentity"),
        semanticKey: safe(request.semanticKey, "request.semanticKey"),
        factSetCompleteness: request.factSetCompleteness,
        applicability: { ...request.applicability },
        facts,
    };
}
function recordMatchesClaim(values, request) {
    const references = new Set([
        normalizedKey(request.subjectId, "request.subjectId"),
        normalizedKey(request.semanticKey, "request.semanticKey"),
        normalizedKey(request.targetIdentity, "request.targetIdentity"),
    ]);
    return values.some((value, index) => references.has(normalizedKey(value, `reconciliation.reference[${index}]`)));
}
function relevantPhase2(model, request) {
    const trace = model.reconciliationTrace;
    if (trace === undefined)
        return { ambiguityAnchors: [], conflictAnchors: [] };
    const ambiguityAnchors = trace.ambiguities
        .filter((entry) => recordMatchesClaim([entry.anchor, ...entry.candidateIds], request))
        .map((entry) => entry.anchor);
    const conflictAnchors = trace.conflicts
        .filter((entry) => recordMatchesClaim([entry.anchor, ...entry.candidateIds], request))
        .map((entry) => entry.anchor);
    return {
        ambiguityAnchors: (0, semantic_canonicalization_1.canonicalSemanticStringSet)(ambiguityAnchors, "phase2.ambiguityAnchors"),
        conflictAnchors: (0, semantic_canonicalization_1.canonicalSemanticStringSet)(conflictAnchors, "phase2.conflictAnchors"),
    };
}
function relevantPhase4Contradictions(phase4, request) {
    if (phase4 === undefined)
        return [];
    const requestRefs = new Set([request.subjectId, request.semanticKey, request.targetIdentity]);
    return (0, semantic_canonicalization_1.canonicalSemanticSet)(phase4.contradictions.filter((entry) => entry.affectedEntityIds.some((id) => requestRefs.has(id))));
}
function validateSources(input, reasons) {
    if (input.g8Successor.rulesetVersion !== g8_engineering_reality_1.G8_ENGINEERING_REALITY_RULESET_VERSION
        || input.g8Successor.source.canonicalModelRevision !== input.model.canonicalState.modelRevision
        || input.g8Successor.source.canonicalModelIntegrityHash !== input.model.canonicalState.integrity.modelHash)
        reasons.push("G8_SUCCESSOR_AUTHORITY_MISMATCH");
    if (input.g10.rulesetVersion !== g10_semantic_history_diff_1.G10_SEMANTIC_HISTORY_DIFF_RULESET_VERSION
        || input.g10.source.successor.modelRevision !== input.model.canonicalState.modelRevision
        || input.g10.source.successor.modelIntegrityHash !== input.model.canonicalState.integrity.modelHash
        || input.g10.source.successor.semanticRealityIdentity !== input.g8Successor.semanticRealityIdentity)
        reasons.push("G10_HISTORY_DIFF_AUTHORITY_MISMATCH");
    if (input.g9 !== undefined && (input.g9.rulesetVersion !== g9_transition_completion_1.G9_TRANSITION_COMPLETION_RULESET_VERSION
        || input.g9.assessmentId !== input.g10.source.g9AssessmentId
        || input.g9.successorSemanticIdentity !== input.g8Successor.semanticRealityIdentity))
        reasons.push("G9_TRANSITION_COMPLETION_AUTHORITY_MISMATCH");
    if (input.phase4 !== undefined && (input.phase4.source.modelRevision !== input.model.canonicalState.modelRevision
        || input.phase4.source.historySequence !== input.model.canonicalState.historyHead.sequence
        || input.phase4.source.derivedOutput.rulesetVersion !== decision_engine_1.PHASE4_RULESET_VERSION))
        reasons.push("PHASE4_AUTHORITY_SOURCE_MISMATCH");
    if (input.phase4 !== undefined) {
        const direct = (0, decision_engine_1.derivePhase4Decision)(input.model, input.phase4.request);
        if ((0, contracts_1.canonicalize)(direct) !== (0, contracts_1.canonicalize)(input.phase4))
            reasons.push("PHASE4_AUTHORITY_INTEGRITY_MISMATCH");
    }
}
function factAuthorityIssues(fact, input, request) {
    const issues = [];
    if (fact.authority.state !== "CURRENT")
        issues.push(`FACT_AUTHORITY_${fact.authority.state}`);
    if (fact.authority.sourceRevision !== input.model.canonicalState.modelRevision)
        issues.push("FACT_AUTHORITY_REVISION_MISMATCH");
    if (fact.authority.boundRealityIdentity !== input.g8Successor.semanticRealityIdentity)
        issues.push("FACT_AUTHORITY_REALITY_MISMATCH");
    if (fact.causalPositionEventHash !== input.g10.source.successor.historyHead.eventHash)
        issues.push("FACT_CAUSAL_POSITION_MISMATCH");
    if (fact.projectId !== request.projectId)
        issues.push("FACT_PROJECT_BINDING_MISMATCH");
    if (fact.subjectId !== request.subjectId)
        issues.push("FACT_SUBJECT_BINDING_MISMATCH");
    if (fact.scopeIdentity !== request.scopeIdentity)
        issues.push("FACT_SCOPE_BINDING_MISMATCH");
    if (fact.targetIdentity !== request.targetIdentity)
        issues.push("FACT_TARGET_BINDING_MISMATCH");
    return issues;
}
function g9Unresolved(g9) {
    return g9.completionAssessment === "INDETERMINATE"
        || g9.completionAssessment === "NOT_COMPLETE"
        || ["FAILED", "ABORTED", "ROLLED_BACK", "PARTIAL"].includes(g9.transitionDisposition)
        || ["IN_PROGRESS", "FAILED", "INDETERMINATE"].includes(g9.recoveryAssessment);
}
/**
 * Detects bounded semantic conflicts without selecting a winner or changing governance.
 * Byte identities are retained only as evidence metadata; accepted semantic meaning decides compatibility.
 */
function detectG11BoundedSemanticConflict(input) {
    if (input === null || typeof input !== "object")
        throw new Error("HITO G11 requires a structured detection input");
    assertExactKeys(input, INPUT_KEYS, "HITO G11 detection input");
    (0, contracts_1.assertValidModel)(input.model);
    const before = (0, contracts_1.canonicalize)(input);
    const request = normalizedRequest(input.request);
    const normalizedBoundedClaimKey = normalizedKey(request.semanticKey, "request.semanticKey");
    const reasonCodes = [];
    validateSources(input, reasonCodes);
    if (request.projectId !== input.model.project.projectId)
        reasonCodes.push("REQUEST_PROJECT_CANONICAL_BINDING_MISMATCH");
    const subjectExists = input.model.capabilities.some((entry) => entry.capabilityId === request.subjectId)
        || input.model.subsystems.some((entry) => entry.subsystemId === request.subjectId)
        || input.model.claims.some((entry) => entry.claimId === request.subjectId)
        || request.subjectId === input.model.project.projectId;
    if (!subjectExists)
        reasonCodes.push("REQUEST_SUBJECT_CANONICAL_BINDING_MISMATCH");
    const phase2 = relevantPhase2(input.model, request);
    const phase4Contradictions = relevantPhase4Contradictions(input.phase4, request);
    const protectedSubject = input.phase4?.proposal.doNotTouch.protectedCapabilityIds.includes(request.subjectId) ?? false;
    if (request.applicability.phase2Reconciliation === "REQUIRED" && input.model.reconciliationTrace === undefined) {
        reasonCodes.push("PHASE2_RECONCILIATION_REQUIRED_BUT_UNAVAILABLE");
    }
    if (request.applicability.phase4ProtectedAuthority === "REQUIRED" && input.phase4 === undefined) {
        reasonCodes.push("PHASE4_PROTECTED_AUTHORITY_REQUIRED_BUT_UNAVAILABLE");
    }
    if (request.applicability.g9TransitionCompletion === "REQUIRED" && input.g9 === undefined) {
        reasonCodes.push("G9_TRANSITION_COMPLETION_REQUIRED_BUT_UNAVAILABLE");
    }
    if (phase2.ambiguityAnchors.length > 0)
        reasonCodes.push("PHASE2_RECONCILIATION_AMBIGUITY_REMAINS_VISIBLE");
    if (input.g8Successor.unresolvedSemanticCoordinates.length > 0)
        reasonCodes.push("G8_REALITY_UNRESOLVED");
    if (input.g10.diffAssessment === "INDETERMINATE" || input.g10.causalRelation === "INDETERMINATE" || input.g10.causalRelation === "DIVERGENT") {
        reasonCodes.push("G10_HISTORY_OR_DIFF_UNRESOLVED");
    }
    if (input.g9 !== undefined && g9Unresolved(input.g9))
        reasonCodes.push("G9_COMPLETION_UNRESOLVED_AND_NOT_A_RESOLUTION");
    if (request.factSetCompleteness !== "COMPLETE")
        reasonCodes.push(`FACT_SET_${request.factSetCompleteness}`);
    const relevantFacts = [];
    const ignoredUnrelatedFactIds = [];
    let mixedBinding = false;
    for (const fact of request.facts) {
        const factKey = normalizedKey(fact.semanticKey, `fact.${fact.factId}.semanticKey`);
        if (factKey !== normalizedBoundedClaimKey) {
            ignoredUnrelatedFactIds.push(fact.factId);
            continue;
        }
        const bindingIssues = factAuthorityIssues(fact, input, request);
        if (bindingIssues.some((issue) => issue.includes("PROJECT_BINDING") || issue.includes("SUBJECT_BINDING") || issue.includes("SCOPE_BINDING") || issue.includes("TARGET_BINDING"))) {
            mixedBinding = true;
        }
        reasonCodes.push(...bindingIssues);
        relevantFacts.push(fact);
    }
    if (mixedBinding)
        reasonCodes.push("WRONG_TARGET_OR_CROSS_PROJECT_CLAIM_MIXING");
    if (relevantFacts.length === 0)
        reasonCodes.push("NO_RELEVANT_BOUND_AUTHORITATIVE_FACTS");
    const causalPositions = new Set(relevantFacts.map((fact) => fact.causalPositionEventHash));
    if (causalPositions.size > 1)
        reasonCodes.push("FACT_CAUSAL_POSITION_MIXING");
    const authoritativeFacts = relevantFacts.filter((fact) => factAuthorityIssues(fact, input, request).length === 0);
    const acceptedMeanings = new Set(authoritativeFacts.map((fact) => fact.acceptedMeaningIdentity));
    const hardPhase4 = phase4Contradictions.filter((entry) => HARD_PHASE4_CONTRADICTIONS.has(entry.code));
    const softPhase4 = phase4Contradictions.filter((entry) => !HARD_PHASE4_CONTRADICTIONS.has(entry.code));
    if (softPhase4.length > 0)
        reasonCodes.push("PHASE4_AUTHORITY_INSUFFICIENT_OR_UNCONFIRMED");
    const conflictEvidence = phase2.conflictAnchors.length > 0
        || hardPhase4.length > 0
        || acceptedMeanings.size > 1;
    if (phase2.conflictAnchors.length > 0)
        reasonCodes.push("PHASE2_AUTHORITATIVE_CONFLICT_REMAINS_VISIBLE");
    if (hardPhase4.length > 0)
        reasonCodes.push("PHASE4_PROTECTED_AUTHORITY_CONTRADICTION_REMAINS_VISIBLE");
    if (acceptedMeanings.size > 1)
        reasonCodes.push("AUTHORITATIVE_SAME_KEY_MEANINGS_INCOMPATIBLE");
    const fundamentalMismatch = reasonCodes.some((code) => (code.includes("AUTHORITY") && code.endsWith("MISMATCH"))
        || code.includes("CANONICAL_BINDING_MISMATCH")
        || code === "WRONG_TARGET_OR_CROSS_PROJECT_CLAIM_MIXING"
        || code === "FACT_CAUSAL_POSITION_MIXING");
    const unresolved = reasonCodes.some((code) => code.includes("REQUIRED_BUT_UNAVAILABLE")
        || code.includes("AMBIGUITY")
        || code.includes("UNRESOLVED")
        || code.startsWith("FACT_AUTHORITY_")
        || code.startsWith("FACT_SET_")
        || code === "NO_RELEVANT_BOUND_AUTHORITATIVE_FACTS"
        || code === "PHASE4_AUTHORITY_INSUFFICIENT_OR_UNCONFIRMED");
    let conflictAssessment;
    if (fundamentalMismatch) {
        conflictAssessment = "INDETERMINATE";
        reasonCodes.push("BOUND_COMPARISON_AUTHORITY_INDETERMINATE");
    }
    else if (conflictEvidence) {
        conflictAssessment = "CONFLICT_DETECTED";
        reasonCodes.push("BOUNDED_AUTHORITATIVE_CONFLICT_DETECTED");
    }
    else if (unresolved || authoritativeFacts.length === 0) {
        conflictAssessment = "INDETERMINATE";
        reasonCodes.push("INSUFFICIENT_AUTHORITY_CANNOT_ESTABLISH_NO_CONFLICT");
    }
    else {
        conflictAssessment = "NO_CONFLICT";
        reasonCodes.push("COMPLETE_BOUND_AUTHORITATIVE_FACTS_ARE_SEMANTICALLY_COMPATIBLE");
    }
    const projectedFacts = (0, semantic_canonicalization_1.canonicalSemanticSet)(relevantFacts.map((fact) => ({
        factId: fact.factId,
        authorityId: fact.authority.authorityId,
        acceptedMeaningIdentity: fact.acceptedMeaningIdentity,
        sourceBytesIdentity: fact.sourceBytesIdentity,
        causalPositionEventHash: fact.causalPositionEventHash,
    })));
    const sources = {
        canonicalModelRevision: input.model.canonicalState.modelRevision,
        canonicalModelIntegrityHash: input.model.canonicalState.integrity.modelHash,
        g8SemanticRealityIdentity: input.g8Successor.semanticRealityIdentity,
        g9AssessmentId: input.g9?.assessmentId ?? null,
        g10ProjectionId: input.g10.projectionId,
        causalPositionEventHash: input.g10.source.successor.historyHead.eventHash,
    };
    const phase4Result = {
        present: input.phase4 !== undefined,
        protectedSubject,
        relevantContradictionIds: (0, semantic_canonicalization_1.canonicalSemanticStringSet)(phase4Contradictions.map((entry) => entry.contradictionId), "phase4.relevantContradictionIds"),
        relevantContradictionCodes: (0, semantic_canonicalization_1.canonicalSemanticStringSet)(phase4Contradictions.map((entry) => entry.code), "phase4.relevantContradictionCodes"),
    };
    const assessmentId = `hito_g11_conflict_${(0, semantic_canonicalization_1.sha256LengthPrefixedFrames)([
        { label: "ruleset", value: exports.G11_SEMANTIC_CONFLICT_RULESET_VERSION },
        { label: "bounded-claim", value: {
                projectId: request.projectId,
                subjectId: request.subjectId,
                scopeIdentity: request.scopeIdentity,
                targetIdentity: request.targetIdentity,
                normalizedBoundedClaimKey,
            } },
        { label: "sources", value: sources },
        { label: "facts", value: projectedFacts },
        { label: "phase2", value: phase2 },
        { label: "phase4", value: phase4Result },
        { label: "assessment", value: { conflictAssessment, reasonCodes: (0, semantic_canonicalization_1.canonicalSemanticSet)(reasonCodes) } },
    ])}`;
    const result = {
        kind: "HITO_G11_BOUNDED_SEMANTIC_CONFLICT_DETECTION",
        rulesetVersion: exports.G11_SEMANTIC_CONFLICT_RULESET_VERSION,
        authority: exports.G11_SEMANTIC_CONFLICT_AUTHORITY,
        assessmentId,
        conflictAssessment,
        normalizedBoundedClaimKey,
        relevantFacts: projectedFacts,
        ignoredUnrelatedFactIds: (0, semantic_canonicalization_1.canonicalSemanticStringSet)(ignoredUnrelatedFactIds, "ignoredUnrelatedFactIds"),
        phase2,
        phase4: phase4Result,
        sources,
        reasonCodes: (0, semantic_canonicalization_1.canonicalSemanticSet)(reasonCodes),
        governanceBoundary: {
            detectionOnly: true,
            resolutionAuthority: false,
            resolutionPerformed: false,
            winnerSelectionPerformed: false,
            mutationEmitted: false,
        },
        zeroEffectCounters: zeroEffects(),
        truthBoundary: "G11 detects bounded authoritative incompatibility only. It neither resolves conflict nor selects a winner, mutation, goal, branch, merge, or next safe action.",
        limitations: [
            "Only facts bound to the same normalized semantic key, project, subject, scope, target, causal position, canonical revision, and G8 reality may be compared.",
            "Source byte identity is evidence metadata; accepted semantic meaning determines compatibility.",
            "Phase-2 ambiguity, Phase-4 protected-authority contradiction, unresolved G8, unresolved G9, and indeterminate G10 remain visible and cannot be treated as resolution.",
            "No canonical write, declared-intent change, proposal decision, execution authority, merge, history rewrite, provider call, network call, or namespace migration is present.",
        ],
    };
    if ((0, contracts_1.canonicalize)(input) !== before)
        throw new Error("HITO G11 mutated caller or canonical authority input");
    return result;
}
