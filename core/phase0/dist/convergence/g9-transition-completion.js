"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.G9_CRITERION_AUTHORITY_KINDS = exports.G9_COMPLETION_CRITERIA = exports.G9_TRANSITION_COMPLETION_AUTHORITY = exports.G9_TRANSITION_COMPLETION_RULESET_VERSION = void 0;
exports.assessG9SemanticTransitionCompletion = assessG9SemanticTransitionCompletion;
const contracts_1 = require("../contracts");
const g8_engineering_reality_1 = require("./g8-engineering-reality");
const semantic_canonicalization_1 = require("./semantic-canonicalization");
exports.G9_TRANSITION_COMPLETION_RULESET_VERSION = "hito-semantic-transition-completion-v1-repair1";
exports.G9_TRANSITION_COMPLETION_AUTHORITY = "DERIVED / READ_ONLY / ASSESSMENT_ONLY / NON_CANONICAL / NON_EXECUTING";
exports.G9_COMPLETION_CRITERIA = [
    "GOVERNED_MUTATION_INTENT",
    "COMMITMENT_AUTHORITY",
    "AUTHORIZED_ATTEMPT_EFFECT",
    "POST_EFFECT_OBSERVATION",
    "REQUIRED_INTEGRATION",
    "EVIDENCE_PLAN_SATISFIED",
    "PHASE5_BOUNDED_CLAIM_SUPPORT",
    "CAUSAL_ATTRIBUTION",
    "NO_BLOCKING_CONTRADICTION",
    "NO_AUTHORITY_CONFLICT",
    "CORRECT_TARGET",
    "NO_REQUIRED_UNRESOLVED_UNKNOWN",
    "NO_STALE_REQUIRED_PROOF",
    "NO_PROTECTED_AUTHORITY_VIOLATION",
    "NO_UNAUTHORIZED_DUPLICATE",
    "BOUNDED_CLAIM_AND_LIMITATIONS",
    "NO_DOUBLE_WORK_VIOLATION",
];
exports.G9_CRITERION_AUTHORITY_KINDS = {
    GOVERNED_MUTATION_INTENT: "GOVERNED_MUTATION_INTENT",
    COMMITMENT_AUTHORITY: "ACCEPTED_COMMITMENT",
    AUTHORIZED_ATTEMPT_EFFECT: "AUTHORIZED_ATTEMPT_EFFECT",
    POST_EFFECT_OBSERVATION: "POST_EFFECT_OBSERVATION",
    REQUIRED_INTEGRATION: "INTEGRATION_CONFIRMATION",
    EVIDENCE_PLAN_SATISFIED: "EVIDENCE_PLAN_ATTESTATION",
    PHASE5_BOUNDED_CLAIM_SUPPORT: "PHASE5_BOUNDED_SUPPORT",
    CAUSAL_ATTRIBUTION: "CAUSAL_ATTRIBUTION",
    NO_BLOCKING_CONTRADICTION: "CONTRADICTION_CLEARANCE",
    NO_AUTHORITY_CONFLICT: "AUTHORITY_CONFLICT_CLEARANCE",
    CORRECT_TARGET: "TARGET_BINDING",
    NO_REQUIRED_UNRESOLVED_UNKNOWN: "UNKNOWN_CLEARANCE",
    NO_STALE_REQUIRED_PROOF: "FRESHNESS_CLEARANCE",
    NO_PROTECTED_AUTHORITY_VIOLATION: "PROTECTED_AUTHORITY_CLEARANCE",
    NO_UNAUTHORIZED_DUPLICATE: "DUPLICATE_CLEARANCE",
    BOUNDED_CLAIM_AND_LIMITATIONS: "BOUNDED_CLAIM_AUTHORITY",
    NO_DOUBLE_WORK_VIOLATION: "NO_DOUBLE_WORK_CLEARANCE",
};
const REQUEST_KEYS = ["transitionId", "subjectId", "scopeIdentity", "targetIdentity", "executionApplicability", "boundedClaim", "criteria", "dispositionEvidence", "recovery"];
const CLAIM_KEYS = ["claimIdentity", "subjectId", "scopeIdentity", "limitations"];
const CRITERION_KEYS = ["applicability", "state", "authority", "limitations"];
const AUTHORITY_KEYS = ["authorityId", "kind", "state", "subjectId", "scopeIdentity", "targetIdentity", "sourceRevision", "boundRealityIdentity"];
const DISPOSITION_KEYS = ["state", "disposition", "authority"];
const RECOVERY_KEYS = ["applicability", "state", "authority"];
const INPUT_KEYS = ["predecessorModel", "successorModel", "predecessor", "successor", "comparison", "request", "phase4", "phase5", "phase7"];
const OPTIONAL_APPLICABILITY = new Set(["AUTHORIZED_ATTEMPT_EFFECT", "REQUIRED_INTEGRATION"]);
const PREDECESSOR_BOUND = new Set(["GOVERNED_MUTATION_INTENT", "COMMITMENT_AUTHORITY", "AUTHORIZED_ATTEMPT_EFFECT"]);
const TARGET_BOUND = new Set(["AUTHORIZED_ATTEMPT_EFFECT", "POST_EFFECT_OBSERVATION", "REQUIRED_INTEGRATION", "CORRECT_TARGET"]);
const AUTHORITY_STATES = ["CURRENT", "STALE", "UNAVAILABLE", "UNAUTHENTICATED", "CONFLICTING", "INVALID", "UNKNOWN"];
const DISPOSITIONS = ["SUCCEEDED", "FAILED", "ABORTED", "ROLLED_BACK", "PARTIAL", "NONE"];
const RECOVERY_STATES = ["NOT_REQUIRED", "NOT_INVOKED", "IN_PROGRESS", "SUCCEEDED", "FAILED", "INDETERMINATE"];
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
    const unsupported = Object.keys(value).filter((key) => !allowed.includes(key)).sort();
    if (unsupported.length > 0)
        throw new Error(`${label} rejects unsupported or precomputed authority fields: ${unsupported.join(", ")}`);
}
function safe(value, label) {
    return (0, semantic_canonicalization_1.assertBoundedSemanticIdentity)(value, label);
}
function expectedRevision(criterion, input) {
    return PREDECESSOR_BOUND.has(criterion)
        ? input.predecessor.source.canonicalModelRevision
        : input.successor.source.canonicalModelRevision;
}
function expectedReality(criterion, input) {
    return PREDECESSOR_BOUND.has(criterion)
        ? input.predecessor.semanticRealityIdentity
        : input.successor.semanticRealityIdentity;
}
function authorityIssues(authority, expectedKind, request, revision, realityIdentity, label) {
    const issues = [];
    if (authority === null || typeof authority !== "object")
        return [`${label}_AUTHORITY_MALFORMED`];
    assertExactKeys(authority, AUTHORITY_KEYS, `HITO G9 ${label} authority`);
    safe(authority.authorityId, `${label}.authorityId`);
    safe(authority.subjectId, `${label}.subjectId`);
    safe(authority.scopeIdentity, `${label}.scopeIdentity`);
    safe(authority.targetIdentity, `${label}.targetIdentity`);
    safe(authority.boundRealityIdentity, `${label}.boundRealityIdentity`);
    if (authority.kind !== expectedKind)
        issues.push(`${label}_AUTHORITY_KIND_MISMATCH`);
    if (!AUTHORITY_STATES.includes(authority.state))
        issues.push(`${label}_AUTHORITY_STATE_INVALID`);
    else if (authority.state !== "CURRENT")
        issues.push(`${label}_AUTHORITY_${authority.state}`);
    if (authority.subjectId !== request.subjectId)
        issues.push(`${label}_SUBJECT_MISMATCH`);
    if (authority.scopeIdentity !== request.scopeIdentity)
        issues.push(`${label}_SCOPE_MISMATCH`);
    if (authority.targetIdentity !== request.targetIdentity)
        issues.push(`${label}_TARGET_MISMATCH`);
    if (!Number.isSafeInteger(authority.sourceRevision) || authority.sourceRevision !== revision)
        issues.push(`${label}_REVISION_MISMATCH`);
    if (authority.boundRealityIdentity !== realityIdentity)
        issues.push(`${label}_REALITY_BINDING_MISMATCH`);
    return issues;
}
function canonicalGovernanceIssues(criterion, authority, input) {
    const model = input.predecessorModel;
    const mutation = model.mutations.find((entry) => entry.mutationId === authority.authorityId);
    const decision = model.decisions.find((entry) => entry.decisionId === authority.authorityId);
    const declaredIntent = model.intent.find((entry) => entry.authority === "DECLARED_INTENT"
        && entry.authorityProof?.proofId === authority.authorityId
        && model.capabilities.some((capability) => capability.capabilityId === input.request.subjectId && capability.promiseIds.includes(entry.promiseId)));
    if (criterion === "GOVERNED_MUTATION_INTENT") {
        const validMutation = mutation !== undefined
            && ["PROPOSED", "APPROVED", "COMPLETED"].includes(mutation.status)
            && mutation.affectedEntityIds.includes(input.request.subjectId)
            && (mutation.effectiveRevision === undefined || mutation.effectiveRevision === authority.sourceRevision);
        const validDecision = decision !== undefined
            && decision.affectedEntityIds.includes(input.request.subjectId)
            && decision.effectiveRevision === authority.sourceRevision;
        if (!validMutation && !validDecision && declaredIntent === undefined)
            return ["GOVERNED_MUTATION_INTENT_NOT_FOUND_IN_ACCEPTED_CANONICAL_AUTHORITY"];
        return [];
    }
    const validCommittedMutation = mutation !== undefined
        && ["APPROVED", "COMPLETED"].includes(mutation.status)
        && mutation.affectedEntityIds.includes(input.request.subjectId)
        && mutation.effectiveRevision === authority.sourceRevision;
    const validCommittedDecision = decision !== undefined
        && decision.affectedEntityIds.includes(input.request.subjectId)
        && decision.effectiveRevision === authority.sourceRevision;
    if (!validCommittedMutation && !validCommittedDecision)
        return ["COMMITMENT_NOT_FOUND_IN_ACCEPTED_CANONICAL_GOVERNANCE"];
    return [];
}
function missingCriterion(criterion) {
    return {
        criterion,
        applicability: "MISSING",
        declaredState: "MISSING",
        effectiveState: "INDETERMINATE",
        authorityId: null,
        reasonCodes: [`${criterion}_APPLICABILITY_MISSING`],
        limitations: [],
    };
}
function evaluateCriterion(criterion, declared, input) {
    if (declared === undefined || declared === null || typeof declared !== "object")
        return missingCriterion(criterion);
    assertExactKeys(declared, CRITERION_KEYS, `HITO G9 criterion ${criterion}`);
    const limitations = Array.isArray(declared.limitations)
        ? (0, semantic_canonicalization_1.canonicalSemanticStringSet)(declared.limitations, `criteria.${criterion}.limitations`)
        : [];
    const result = {
        criterion,
        applicability: declared.applicability,
        declaredState: declared.state,
        effectiveState: declared.state,
        authorityId: declared.authority?.authorityId ?? null,
        reasonCodes: [],
        limitations,
    };
    if (declared.applicability !== "REQUIRED" && declared.applicability !== "NOT_REQUIRED") {
        result.applicability = "MISSING";
        result.effectiveState = "INDETERMINATE";
        result.reasonCodes.push(`${criterion}_APPLICABILITY_INVALID`);
        return result;
    }
    if (!Array.isArray(declared.limitations)) {
        result.effectiveState = "INDETERMINATE";
        result.reasonCodes.push(`${criterion}_LIMITATIONS_MISSING`);
    }
    if (declared.applicability === "NOT_REQUIRED") {
        if (!OPTIONAL_APPLICABILITY.has(criterion))
            result.reasonCodes.push(`${criterion}_CANNOT_BE_NOT_REQUIRED`);
        if (declared.state !== "NOT_REQUIRED")
            result.reasonCodes.push(`${criterion}_NOT_REQUIRED_STATE_MISMATCH`);
        if (declared.authority !== undefined)
            result.reasonCodes.push(`${criterion}_NOT_REQUIRED_AUTHORITY_PRESENT`);
        result.effectiveState = result.reasonCodes.length === 0 ? "NOT_REQUIRED" : "INDETERMINATE";
        return result;
    }
    if (!["ESTABLISHED", "NOT_ESTABLISHED", "INDETERMINATE"].includes(declared.state)) {
        result.effectiveState = "INDETERMINATE";
        result.reasonCodes.push(`${criterion}_STATE_INVALID`);
        return result;
    }
    if (declared.state !== "ESTABLISHED") {
        if (declared.authority !== undefined)
            result.reasonCodes.push(`${criterion}_UNESTABLISHED_AUTHORITY_IGNORED`);
        result.effectiveState = declared.state;
        return result;
    }
    if (declared.authority === undefined) {
        result.effectiveState = "INDETERMINATE";
        result.reasonCodes.push(`${criterion}_AUTHORITY_MISSING`);
        return result;
    }
    const issues = authorityIssues(declared.authority, exports.G9_CRITERION_AUTHORITY_KINDS[criterion], input.request, expectedRevision(criterion, input), expectedReality(criterion, input), criterion);
    if (criterion === "GOVERNED_MUTATION_INTENT" || criterion === "COMMITMENT_AUTHORITY") {
        issues.push(...canonicalGovernanceIssues(criterion, declared.authority, input));
    }
    result.reasonCodes.push(...issues);
    result.effectiveState = issues.length === 0 ? "ESTABLISHED" : "INDETERMINATE";
    return result;
}
function validatePhase5Support(input, result) {
    if (result.criterion !== "PHASE5_BOUNDED_CLAIM_SUPPORT" || result.effectiveState !== "ESTABLISHED")
        return;
    const phase5 = input.phase5;
    if (phase5 === undefined) {
        result.effectiveState = "NOT_ESTABLISHED";
        result.reasonCodes.push("PHASE5_BOUNDED_SUPPORT_ABSENT");
        return;
    }
    if (result.authorityId !== phase5.judgeResultId)
        result.reasonCodes.push("PHASE5_BOUNDED_SUPPORT_ID_MISMATCH");
    if (phase5.claimId !== input.request.boundedClaim.claimIdentity)
        result.reasonCodes.push("PHASE5_BOUNDED_SUPPORT_CLAIM_MISMATCH");
    if (phase5.subject.id !== input.request.subjectId)
        result.reasonCodes.push("PHASE5_BOUNDED_SUPPORT_SUBJECT_MISMATCH");
    if (phase5.sourceModelRevision !== input.successor.source.canonicalModelRevision)
        result.reasonCodes.push("PHASE5_BOUNDED_SUPPORT_REVISION_MISMATCH");
    if (phase5.stalenessState !== "FRESH")
        result.reasonCodes.push("PHASE5_BOUNDED_SUPPORT_STALE");
    if (phase5.verdict === "INDETERMINATE") {
        result.effectiveState = "INDETERMINATE";
        result.reasonCodes.push("PHASE5_JUDGMENT_INDETERMINATE");
        return;
    }
    if (phase5.verdict !== "VERIFIED_CONTINUITY" && phase5.verdict !== "VERIFIED_WITH_OBSERVATIONS") {
        result.effectiveState = "NOT_ESTABLISHED";
        result.reasonCodes.push("PHASE5_JUDGMENT_DOES_NOT_SUPPORT_BOUNDED_CLAIM");
        return;
    }
    if (result.reasonCodes.length > 0)
        result.effectiveState = "INDETERMINATE";
}
function stagePair(left, right) {
    if (left.effectiveState === "INDETERMINATE" || right.effectiveState === "INDETERMINATE")
        return "INDETERMINATE";
    if (left.effectiveState === "ESTABLISHED" && right.effectiveState === "ESTABLISHED")
        return "ESTABLISHED";
    return "NOT_ESTABLISHED";
}
function normalizedDisposition(input, reasonCodes) {
    const evidence = input.request.dispositionEvidence;
    if (evidence === null || typeof evidence !== "object") {
        reasonCodes.push("DISPOSITION_EVIDENCE_MISSING");
        return "NONE";
    }
    assertExactKeys(evidence, DISPOSITION_KEYS, "HITO G9 disposition evidence");
    if (!DISPOSITIONS.includes(evidence.disposition)) {
        reasonCodes.push("DISPOSITION_VALUE_INVALID");
        return "NONE";
    }
    if (evidence.state === "NOT_ESTABLISHED") {
        if (evidence.disposition !== "NONE" || evidence.authority !== undefined)
            reasonCodes.push("UNESTABLISHED_DISPOSITION_MUST_REMAIN_NONE");
        return "NONE";
    }
    if (evidence.state === "INDETERMINATE") {
        reasonCodes.push("DISPOSITION_EVIDENCE_INDETERMINATE");
        return "NONE";
    }
    if (evidence.state !== "ESTABLISHED" || evidence.disposition === "NONE" || evidence.authority === undefined) {
        reasonCodes.push("DISPOSITION_AUTHORITY_MISSING_OR_INVALID");
        return "NONE";
    }
    const issues = authorityIssues(evidence.authority, "OPERATIONAL_DISPOSITION", input.request, input.successor.source.canonicalModelRevision, input.successor.semanticRealityIdentity, "DISPOSITION");
    reasonCodes.push(...issues);
    return issues.length === 0 ? evidence.disposition : "NONE";
}
function normalizedRecovery(input, reasonCodes) {
    const recovery = input.request.recovery;
    if (recovery === null || typeof recovery !== "object") {
        reasonCodes.push("RECOVERY_APPLICABILITY_MISSING");
        return "INDETERMINATE";
    }
    assertExactKeys(recovery, RECOVERY_KEYS, "HITO G9 recovery assessment");
    if (!RECOVERY_STATES.includes(recovery.state)) {
        reasonCodes.push("RECOVERY_STATE_INVALID");
        return "INDETERMINATE";
    }
    if (recovery.applicability === "NOT_REQUIRED") {
        if (recovery.state !== "NOT_REQUIRED" || recovery.authority !== undefined)
            reasonCodes.push("RECOVERY_NOT_REQUIRED_MISMATCH");
        return reasonCodes.includes("RECOVERY_NOT_REQUIRED_MISMATCH") ? "INDETERMINATE" : "NOT_REQUIRED";
    }
    if (recovery.applicability !== "REQUIRED" || recovery.state === "NOT_REQUIRED") {
        reasonCodes.push("RECOVERY_APPLICABILITY_INVALID");
        return "INDETERMINATE";
    }
    if (recovery.state === "NOT_INVOKED" || recovery.state === "IN_PROGRESS" || recovery.state === "INDETERMINATE") {
        if (recovery.authority !== undefined)
            reasonCodes.push("RECOVERY_UNESTABLISHED_AUTHORITY_IGNORED");
        return recovery.state;
    }
    if (recovery.authority === undefined) {
        reasonCodes.push("RECOVERY_AUTHORITY_MISSING");
        return "INDETERMINATE";
    }
    const issues = authorityIssues(recovery.authority, "RECOVERY_AUTHORITY", input.request, input.successor.source.canonicalModelRevision, input.successor.semanticRealityIdentity, "RECOVERY");
    reasonCodes.push(...issues);
    return issues.length === 0 ? recovery.state : "INDETERMINATE";
}
function validateRequestShape(request) {
    if (request === null || typeof request !== "object")
        throw new Error("HITO G9 requires an explicit structured assessment request");
    assertExactKeys(request, REQUEST_KEYS, "HITO G9 assessment request");
    safe(request.transitionId, "request.transitionId");
    safe(request.subjectId, "request.subjectId");
    safe(request.scopeIdentity, "request.scopeIdentity");
    safe(request.targetIdentity, "request.targetIdentity");
    if (request.executionApplicability !== "REQUIRED" && request.executionApplicability !== "NOT_REQUIRED") {
        throw new Error("HITO G9 requires explicit execution applicability");
    }
    if (request.boundedClaim === null || typeof request.boundedClaim !== "object")
        throw new Error("HITO G9 requires an explicit bounded claim");
    assertExactKeys(request.boundedClaim, CLAIM_KEYS, "HITO G9 bounded claim");
    safe(request.boundedClaim.claimIdentity, "boundedClaim.claimIdentity");
    safe(request.boundedClaim.subjectId, "boundedClaim.subjectId");
    safe(request.boundedClaim.scopeIdentity, "boundedClaim.scopeIdentity");
    if (!Array.isArray(request.boundedClaim.limitations) || request.boundedClaim.limitations.length === 0) {
        throw new Error("HITO G9 bounded claim requires explicit limitations");
    }
    (0, semantic_canonicalization_1.canonicalSemanticStringSet)(request.boundedClaim.limitations, "boundedClaim.limitations");
    if (request.boundedClaim.subjectId !== request.subjectId || request.boundedClaim.scopeIdentity !== request.scopeIdentity) {
        throw new Error("HITO G9 bounded claim is not subject/scope bound");
    }
    if (request.criteria === null || typeof request.criteria !== "object")
        throw new Error("HITO G9 requires explicit criterion applicability");
    const unsupportedCriteria = Object.keys(request.criteria).filter((key) => !exports.G9_COMPLETION_CRITERIA.includes(key)).sort();
    if (unsupportedCriteria.length > 0)
        throw new Error(`HITO G9 rejects unsupported criteria: ${unsupportedCriteria.join(", ")}`);
}
/** Pure repaired G9 assessment. It consumes exact G8 meaning and never executes or persists a transition. */
function assessG9SemanticTransitionCompletion(input) {
    if (input === null || typeof input !== "object")
        throw new Error("HITO G9 requires a structured assessment input");
    assertExactKeys(input, INPUT_KEYS, "HITO G9 assessment input");
    (0, contracts_1.assertValidModel)(input.predecessorModel);
    (0, contracts_1.assertValidModel)(input.successorModel);
    validateRequestShape(input.request);
    const before = (0, contracts_1.canonicalize)(input);
    const reasonCodes = [];
    if (input.predecessor.source.canonicalModelRevision !== input.predecessorModel.canonicalState.modelRevision
        || input.predecessor.source.canonicalModelIntegrityHash !== input.predecessorModel.canonicalState.integrity.modelHash)
        reasonCodes.push("G8_PREDECESSOR_CANONICAL_SOURCE_MISMATCH");
    if (input.successor.source.canonicalModelRevision !== input.successorModel.canonicalState.modelRevision
        || input.successor.source.canonicalModelIntegrityHash !== input.successorModel.canonicalState.integrity.modelHash)
        reasonCodes.push("G8_SUCCESSOR_CANONICAL_SOURCE_MISMATCH");
    if (input.predecessor.rulesetVersion !== g8_engineering_reality_1.G8_ENGINEERING_REALITY_RULESET_VERSION || input.successor.rulesetVersion !== g8_engineering_reality_1.G8_ENGINEERING_REALITY_RULESET_VERSION) {
        reasonCodes.push("G8_RULESET_AUTHORITY_MISMATCH");
    }
    const directComparison = (0, g8_engineering_reality_1.compareG8EngineeringReality)(input.predecessor, input.successor);
    if ((0, contracts_1.canonicalize)(directComparison) !== (0, contracts_1.canonicalize)(input.comparison))
        reasonCodes.push("G8_COMPARISON_AUTHORITY_MISMATCH");
    const criteria = exports.G9_COMPLETION_CRITERIA.map((criterion) => evaluateCriterion(criterion, input.request.criteria[criterion], input));
    criteria.forEach((result) => validatePhase5Support(input, result));
    const byCriterion = new Map(criteria.map((result) => [result.criterion, result]));
    const criterion = (key) => byCriterion.get(key);
    if (input.request.executionApplicability === "REQUIRED" && criterion("AUTHORIZED_ATTEMPT_EFFECT").applicability !== "REQUIRED") {
        criterion("AUTHORIZED_ATTEMPT_EFFECT").effectiveState = "INDETERMINATE";
        criterion("AUTHORIZED_ATTEMPT_EFFECT").reasonCodes.push("EXECUTION_REQUIRED_BUT_ATTEMPT_MARKED_NOT_REQUIRED");
    }
    if (input.request.executionApplicability === "NOT_REQUIRED" && criterion("AUTHORIZED_ATTEMPT_EFFECT").applicability !== "NOT_REQUIRED") {
        criterion("AUTHORIZED_ATTEMPT_EFFECT").effectiveState = "INDETERMINATE";
        criterion("AUTHORIZED_ATTEMPT_EFFECT").reasonCodes.push("EXECUTION_NOT_REQUIRED_BUT_ATTEMPT_APPLICABILITY_MISMATCH");
    }
    const disposition = normalizedDisposition(input, reasonCodes);
    const recovery = normalizedRecovery(input, reasonCodes);
    criteria.forEach((result) => reasonCodes.push(...result.reasonCodes));
    if (input.phase4 !== undefined)
        reasonCodes.push("PHASE4_PROPOSAL_DOES_NOT_PROVE_COMMITMENT_OR_EXECUTION");
    if (input.phase7 !== undefined)
        reasonCodes.push("PHASE7_READINESS_DOES_NOT_PROVE_COMMITMENT_OR_EXECUTION");
    const hasIndeterminateCriterion = criteria.some((result) => result.effectiveState === "INDETERMINATE");
    const hasUnestablishedCriterion = criteria.some((result) => result.effectiveState === "NOT_ESTABLISHED");
    const comparisonMismatch = reasonCodes.includes("G8_COMPARISON_AUTHORITY_MISMATCH")
        || reasonCodes.includes("G8_RULESET_AUTHORITY_MISMATCH")
        || reasonCodes.includes("G8_PREDECESSOR_CANONICAL_SOURCE_MISMATCH")
        || reasonCodes.includes("G8_SUCCESSOR_CANONICAL_SOURCE_MISMATCH");
    const dispositionIndeterminate = reasonCodes.includes("DISPOSITION_EVIDENCE_INDETERMINATE") || reasonCodes.some((code) => code.startsWith("DISPOSITION_") && code.endsWith("_MISMATCH"));
    let completionAssessment;
    if (input.comparison.semanticComparison === "SAME") {
        completionAssessment = "NO_SEMANTIC_TRANSITION";
        reasonCodes.push("G8_SAME_MEANS_NO_NET_SEMANTIC_TRANSITION");
    }
    else if (input.comparison.semanticComparison === "INDETERMINATE" || comparisonMismatch) {
        completionAssessment = "INDETERMINATE";
        reasonCodes.push("G8_INDETERMINATE_PROHIBITS_COMPLETION");
    }
    else if (hasIndeterminateCriterion || dispositionIndeterminate) {
        completionAssessment = "INDETERMINATE";
        reasonCodes.push("REQUIRED_COMPLETION_AUTHORITY_INDETERMINATE");
    }
    else if (hasUnestablishedCriterion) {
        completionAssessment = "NOT_COMPLETE";
        reasonCodes.push("ONE_OR_MORE_REQUIRED_PREDICATES_NOT_ESTABLISHED");
    }
    else if (disposition !== "SUCCEEDED") {
        completionAssessment = "NOT_COMPLETE";
        reasonCodes.push("SEPARATE_SUCCEEDED_DISPOSITION_NOT_ESTABLISHED");
    }
    else {
        completionAssessment = "COMPLETE";
        reasonCodes.push("ALL_APPLICABLE_PREDICATES_AND_SEPARATE_SUCCEEDED_DISPOSITION_ESTABLISHED");
    }
    const stages = {
        proposed: criterion("GOVERNED_MUTATION_INTENT").effectiveState,
        committed: criterion("COMMITMENT_AUTHORITY").effectiveState,
        attempted: criterion("AUTHORIZED_ATTEMPT_EFFECT").effectiveState,
        observed: criterion("POST_EFFECT_OBSERVATION").effectiveState,
        integrated: criterion("REQUIRED_INTEGRATION").effectiveState,
        evidenced: stagePair(criterion("EVIDENCE_PLAN_SATISFIED"), criterion("PHASE5_BOUNDED_CLAIM_SUPPORT")),
        judged: criterion("PHASE5_BOUNDED_CLAIM_SUPPORT").effectiveState,
        complete: completionAssessment,
    };
    const assessmentId = `hito_g9_transition_assessment_${(0, semantic_canonicalization_1.sha256LengthPrefixedFrames)([
        { label: "ruleset", value: exports.G9_TRANSITION_COMPLETION_RULESET_VERSION },
        { label: "transition", value: {
                transitionId: input.request.transitionId,
                subjectId: input.request.subjectId,
                scopeIdentity: input.request.scopeIdentity,
                targetIdentity: input.request.targetIdentity,
            } },
        { label: "g8-comparison", value: {
                comparisonId: input.comparison.comparisonId,
                semanticComparison: input.comparison.semanticComparison,
                contextDelta: input.comparison.contextDelta,
            } },
        { label: "criteria", value: criteria },
        { label: "assessment", value: { completionAssessment, disposition, recovery, stages } },
    ])}`;
    const result = {
        kind: "HITO_G9_SEMANTIC_TRANSITION_COMPLETION_ASSESSMENT",
        rulesetVersion: exports.G9_TRANSITION_COMPLETION_RULESET_VERSION,
        authority: exports.G9_TRANSITION_COMPLETION_AUTHORITY,
        assessmentId,
        transitionId: input.request.transitionId,
        completionAssessment,
        transitionDisposition: disposition,
        recoveryAssessment: recovery,
        semanticComparison: input.comparison.semanticComparison,
        contextDelta: input.comparison.contextDelta,
        stages,
        criteria,
        predecessorSemanticIdentity: input.predecessor.semanticRealityIdentity,
        successorSemanticIdentity: input.successor.semanticRealityIdentity,
        comparisonId: input.comparison.comparisonId,
        phase4Proposal: {
            present: input.phase4 !== undefined,
            authorityId: input.phase4?.source.derivedOutput.derivedOutputId ?? null,
            provesCommitment: false,
            provesExecution: false,
        },
        phase7Advisory: {
            present: input.phase7 !== undefined,
            assessmentId: input.phase7?.assessmentId ?? null,
            provesCommitment: false,
            provesExecution: false,
        },
        reasonCodes: (0, semantic_canonicalization_1.canonicalSemanticSet)(reasonCodes),
        zeroEffectCounters: zeroEffects(),
        truthBoundary: "G9 is a derived assessment over exact G8 comparison and explicit bounded authorities. It is not canonical SemanticTransition and neither commits nor executes anything.",
        limitations: (0, semantic_canonicalization_1.canonicalSemanticSet)([
            ...input.request.boundedClaim.limitations,
            "ALLOW is not COMMIT and COMMIT is not EXECUTE.",
            "READY is not COMMIT and COMMIT is not EXECUTE.",
            "Phase-4 proposal, Phase-7 readiness, build/test/Git/source state, target writes, and agent text do not independently prove completion.",
            "Completion assessment and operational disposition remain separate axes.",
        ]),
    };
    if ((0, contracts_1.canonicalize)(input) !== before)
        throw new Error("HITO G9 mutated caller or predecessor input");
    return result;
}
