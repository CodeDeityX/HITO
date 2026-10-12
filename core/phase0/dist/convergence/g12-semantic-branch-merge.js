"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.G12_MANIFEST_SHA256 = exports.G12_CONTINUITY_SHA256 = exports.G12_TRACEABILITY_SHA256 = exports.G12_CASES_SHA256 = exports.G12_MODEL_SHA256 = exports.G12_CONTRACT_SHA256 = exports.G12_SEMANTIC_BRANCH_MERGE_AUTHORITY = exports.G12_SEMANTIC_BRANCH_MERGE_RULESET_VERSION = void 0;
exports.assessG12SemanticBranchMerge = assessG12SemanticBranchMerge;
const contracts_1 = require("../contracts");
const g8_engineering_reality_1 = require("./g8-engineering-reality");
const g9_transition_completion_1 = require("./g9-transition-completion");
const g10_semantic_history_diff_1 = require("./g10-semantic-history-diff");
const g11_semantic_conflict_detection_1 = require("./g11-semantic-conflict-detection");
const semantic_canonicalization_1 = require("./semantic-canonicalization");
exports.G12_SEMANTIC_BRANCH_MERGE_RULESET_VERSION = "hito-semantic-branching-merge-v1";
exports.G12_SEMANTIC_BRANCH_MERGE_AUTHORITY = "DERIVED / READ_ONLY / NON_CANONICAL / NON_EXECUTING / CANDIDATE_ONLY";
exports.G12_CONTRACT_SHA256 = "664d6ac61a98250850a4984ce868cd136e6d283b534c4f9c4173b2b4b23591e1";
exports.G12_MODEL_SHA256 = "d9486db0ddfd108533b79d7df81a191c3dd284620a51f4d00dcd7950d4ea070d";
exports.G12_CASES_SHA256 = "7d82f2eb64b58eb43017542d7d94742f1c93192a6b3a573b618cf0f560364b4f";
exports.G12_TRACEABILITY_SHA256 = "cb6211e0a4882d4c53eb9783f4b0f8325eef725e0614638a2a4c97cc2c7bde66";
exports.G12_CONTINUITY_SHA256 = "8f3a982b4302e4206da24f78f86a746d01d4dd8b1b19fca9b99bb225e880cada";
exports.G12_MANIFEST_SHA256 = "d7cafe77117ae9c90b7d80f0de3ae630ac2db7c49661138e1fcf93363f94f9db";
const INPUT_KEYS = ["model", "predecessor", "successor", "comparison", "g9", "g10", "g11", "request"];
const REQUEST_KEYS = ["projectId", "subjectId", "scopeIdentity", "targetIdentity", "mergeApplicability", "g9CompletionApplicability", "g11ConflictApplicability", "predecessorTip", "successorTip", "commonBase", "protectedAuthority"];
const TIP_KEYS = ["branchId", "projectId", "historyHeadEventHash", "semanticRealityIdentity", "sourceBytesIdentity", "lineageEventIds"];
const COMMON_BASE_KEYS = ["applicability", "state", "eventHash", "lineageEventId"];
const PROTECTED_AUTHORITY_KEYS = ["applicability", "state", "authorityId", "projectId", "subjectId", "scopeIdentity", "targetIdentity", "sourceRevision", "boundRealityIdentity"];
const APPLICABILITIES = ["REQUIRED", "NOT_REQUIRED"];
const COMMON_BASE_STATES = ["ESTABLISHED", "UNRESOLVED", "UNAVAILABLE", "NOT_REQUIRED"];
const PROTECTED_STATES = ["CURRENT", "CONFLICTING", "STALE", "UNAVAILABLE", "UNAUTHENTICATED", "UNKNOWN", "NOT_REQUIRED"];
function zeroEffects() {
    return {
        canonicalWriteCount: 0,
        governedTargetMutationCount: 0,
        targetExecutionCount: 0,
        mergeExecutionCount: 0,
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
function assertApplicability(value, label) {
    if (!APPLICABILITIES.includes(value))
        throw new Error(`HITO G12 requires explicit ${label} applicability`);
}
function normalizedTip(tip, label) {
    if (tip === null || typeof tip !== "object")
        throw new Error(`HITO G12 requires structured ${label}`);
    assertExactKeys(tip, TIP_KEYS, `HITO G12 ${label}`);
    if (!Array.isArray(tip.lineageEventIds) || tip.lineageEventIds.length === 0) {
        throw new Error(`HITO G12 requires explicit ${label} lineage evidence`);
    }
    return {
        branchId: safe(tip.branchId, `${label}.branchId`),
        projectId: safe(tip.projectId, `${label}.projectId`),
        historyHeadEventHash: safe(tip.historyHeadEventHash, `${label}.historyHeadEventHash`),
        semanticRealityIdentity: safe(tip.semanticRealityIdentity, `${label}.semanticRealityIdentity`),
        sourceBytesIdentity: safe(tip.sourceBytesIdentity, `${label}.sourceBytesIdentity`),
        lineageEventIds: (0, semantic_canonicalization_1.canonicalSemanticStringSet)(tip.lineageEventIds, `${label}.lineageEventIds`),
    };
}
function normalizedCommonBase(value) {
    if (value === null || typeof value !== "object")
        throw new Error("HITO G12 requires explicit common-base evidence");
    assertExactKeys(value, COMMON_BASE_KEYS, "HITO G12 common-base evidence");
    assertApplicability(value.applicability, "common-base");
    if (!COMMON_BASE_STATES.includes(value.state))
        throw new Error("HITO G12 common-base state is invalid");
    if (value.applicability === "NOT_REQUIRED" && value.state !== "NOT_REQUIRED") {
        throw new Error("HITO G12 NOT_REQUIRED common-base applicability requires NOT_REQUIRED state");
    }
    if (value.applicability === "REQUIRED" && value.state === "NOT_REQUIRED") {
        throw new Error("HITO G12 required common-base evidence cannot be NOT_REQUIRED");
    }
    if (value.state === "ESTABLISHED" && (value.eventHash === undefined || value.lineageEventId === undefined)) {
        throw new Error("HITO G12 established common-base evidence requires event and lineage identities");
    }
    return {
        applicability: value.applicability,
        state: value.state,
        ...(value.eventHash === undefined ? {} : { eventHash: safe(value.eventHash, "commonBase.eventHash") }),
        ...(value.lineageEventId === undefined ? {} : { lineageEventId: safe(value.lineageEventId, "commonBase.lineageEventId") }),
    };
}
function normalizedProtectedAuthority(value) {
    if (value === null || typeof value !== "object")
        throw new Error("HITO G12 requires explicit protected-authority applicability");
    assertExactKeys(value, PROTECTED_AUTHORITY_KEYS, "HITO G12 protected authority");
    assertApplicability(value.applicability, "protected-authority");
    if (!PROTECTED_STATES.includes(value.state))
        throw new Error("HITO G12 protected-authority state is invalid");
    if (value.applicability === "NOT_REQUIRED" && value.state !== "NOT_REQUIRED") {
        throw new Error("HITO G12 NOT_REQUIRED protected authority requires NOT_REQUIRED state");
    }
    if (value.applicability === "REQUIRED" && value.state === "NOT_REQUIRED") {
        throw new Error("HITO G12 required protected authority cannot be NOT_REQUIRED");
    }
    if (value.sourceRevision !== undefined && (!Number.isSafeInteger(value.sourceRevision) || value.sourceRevision < 0)) {
        throw new Error("HITO G12 protected-authority source revision is invalid");
    }
    return {
        applicability: value.applicability,
        state: value.state,
        ...(value.authorityId === undefined ? {} : { authorityId: safe(value.authorityId, "protectedAuthority.authorityId") }),
        ...(value.projectId === undefined ? {} : { projectId: safe(value.projectId, "protectedAuthority.projectId") }),
        ...(value.subjectId === undefined ? {} : { subjectId: safe(value.subjectId, "protectedAuthority.subjectId") }),
        ...(value.scopeIdentity === undefined ? {} : { scopeIdentity: safe(value.scopeIdentity, "protectedAuthority.scopeIdentity") }),
        ...(value.targetIdentity === undefined ? {} : { targetIdentity: safe(value.targetIdentity, "protectedAuthority.targetIdentity") }),
        ...(value.sourceRevision === undefined ? {} : { sourceRevision: value.sourceRevision }),
        ...(value.boundRealityIdentity === undefined ? {} : { boundRealityIdentity: safe(value.boundRealityIdentity, "protectedAuthority.boundRealityIdentity") }),
    };
}
function normalizedRequest(request) {
    if (request === null || typeof request !== "object")
        throw new Error("HITO G12 requires an explicit structured assessment request");
    assertExactKeys(request, REQUEST_KEYS, "HITO G12 assessment request");
    assertApplicability(request.mergeApplicability, "merge");
    assertApplicability(request.g9CompletionApplicability, "G9 completion");
    assertApplicability(request.g11ConflictApplicability, "G11 conflict");
    return {
        projectId: safe(request.projectId, "request.projectId"),
        subjectId: safe(request.subjectId, "request.subjectId"),
        scopeIdentity: safe(request.scopeIdentity, "request.scopeIdentity"),
        targetIdentity: safe(request.targetIdentity, "request.targetIdentity"),
        mergeApplicability: request.mergeApplicability,
        g9CompletionApplicability: request.g9CompletionApplicability,
        g11ConflictApplicability: request.g11ConflictApplicability,
        predecessorTip: normalizedTip(request.predecessorTip, "predecessorTip"),
        successorTip: normalizedTip(request.successorTip, "successorTip"),
        commonBase: normalizedCommonBase(request.commonBase),
        protectedAuthority: normalizedProtectedAuthority(request.protectedAuthority),
    };
}
function subjectExists(model, subjectId) {
    return subjectId === model.project.projectId
        || model.capabilities.some((entry) => entry.capabilityId === subjectId)
        || model.subsystems.some((entry) => entry.subsystemId === subjectId)
        || model.claims.some((entry) => entry.claimId === subjectId);
}
function relevantLineageEventIds(model, subjectId) {
    return new Set(model.capabilityLineage.filter((entry) => (entry.capabilityId === subjectId
        || entry.fromCapabilityIds.includes(subjectId)
        || entry.toCapabilityIds.includes(subjectId))).map((entry) => entry.eventId));
}
function validateSources(input, reasons) {
    if (input.predecessor.rulesetVersion !== g8_engineering_reality_1.G8_ENGINEERING_REALITY_RULESET_VERSION
        || input.successor.rulesetVersion !== g8_engineering_reality_1.G8_ENGINEERING_REALITY_RULESET_VERSION)
        reasons.push("G8_RULESET_AUTHORITY_MISMATCH");
    if ((0, contracts_1.canonicalize)((0, g8_engineering_reality_1.compareG8EngineeringReality)(input.predecessor, input.successor)) !== (0, contracts_1.canonicalize)(input.comparison)) {
        reasons.push("G8_COMPARISON_AUTHORITY_MISMATCH");
    }
    if (input.successor.source.canonicalModelRevision !== input.model.canonicalState.modelRevision
        || input.successor.source.canonicalModelIntegrityHash !== input.model.canonicalState.integrity.modelHash)
        reasons.push("G8_SUCCESSOR_CANONICAL_BINDING_MISMATCH");
    if (input.g10.rulesetVersion !== g10_semantic_history_diff_1.G10_SEMANTIC_HISTORY_DIFF_RULESET_VERSION
        || input.g10.source.predecessor.semanticRealityIdentity !== input.predecessor.semanticRealityIdentity
        || input.g10.source.successor.semanticRealityIdentity !== input.successor.semanticRealityIdentity
        || input.g10.source.successor.modelRevision !== input.model.canonicalState.modelRevision
        || input.g10.source.successor.modelIntegrityHash !== input.model.canonicalState.integrity.modelHash
        || input.g10.source.g8ComparisonId !== input.comparison.comparisonId)
        reasons.push("G10_HISTORY_LINEAGE_AUTHORITY_MISMATCH");
    if (input.g9 !== undefined && (input.g9.rulesetVersion !== g9_transition_completion_1.G9_TRANSITION_COMPLETION_RULESET_VERSION
        || input.g9.assessmentId !== input.g10.source.g9AssessmentId
        || input.g9.predecessorSemanticIdentity !== input.predecessor.semanticRealityIdentity
        || input.g9.successorSemanticIdentity !== input.successor.semanticRealityIdentity))
        reasons.push("G9_COMPLETION_AUTHORITY_MISMATCH");
    if (input.g11 !== undefined && (input.g11.rulesetVersion !== g11_semantic_conflict_detection_1.G11_SEMANTIC_CONFLICT_RULESET_VERSION
        || input.g11.sources.canonicalModelRevision !== input.model.canonicalState.modelRevision
        || input.g11.sources.canonicalModelIntegrityHash !== input.model.canonicalState.integrity.modelHash
        || input.g11.sources.g8SemanticRealityIdentity !== input.successor.semanticRealityIdentity
        || input.g11.sources.g10ProjectionId !== input.g10.projectionId
        || input.g11.sources.g9AssessmentId !== (input.g9?.assessmentId ?? null)))
        reasons.push("G11_CONFLICT_AUTHORITY_MISMATCH");
}
function protectedAuthorityIssues(authority, request, input) {
    if (authority.applicability === "NOT_REQUIRED")
        return [];
    const required = [authority.authorityId, authority.projectId, authority.subjectId, authority.scopeIdentity, authority.targetIdentity, authority.sourceRevision, authority.boundRealityIdentity];
    if (required.some((value) => value === undefined))
        return ["PROTECTED_AUTHORITY_BINDING_INCOMPLETE"];
    const issues = [];
    if (authority.projectId !== request.projectId)
        issues.push("PROTECTED_AUTHORITY_PROJECT_BINDING_MISMATCH");
    if (authority.subjectId !== request.subjectId)
        issues.push("PROTECTED_AUTHORITY_SUBJECT_BINDING_MISMATCH");
    if (authority.scopeIdentity !== request.scopeIdentity)
        issues.push("PROTECTED_AUTHORITY_SCOPE_BINDING_MISMATCH");
    if (authority.targetIdentity !== request.targetIdentity)
        issues.push("PROTECTED_AUTHORITY_TARGET_BINDING_MISMATCH");
    if (authority.sourceRevision !== input.model.canonicalState.modelRevision)
        issues.push("PROTECTED_AUTHORITY_REVISION_BINDING_MISMATCH");
    if (authority.boundRealityIdentity !== input.successor.semanticRealityIdentity)
        issues.push("PROTECTED_AUTHORITY_REALITY_BINDING_MISMATCH");
    return issues;
}
function g9KnownBlocked(g9) {
    return g9.completionAssessment === "NOT_COMPLETE"
        || ["FAILED", "ABORTED", "ROLLED_BACK", "PARTIAL"].includes(g9.transitionDisposition)
        || g9.recoveryAssessment === "FAILED";
}
function g9Unresolved(g9) {
    return g9.completionAssessment === "INDETERMINATE"
        || ["IN_PROGRESS", "INDETERMINATE"].includes(g9.recoveryAssessment);
}
/**
 * Assesses branch relation and a bounded merge candidate from existing G8-G11,
 * canonical lineage, and G10 history authority. It cannot produce merged reality.
 */
function assessG12SemanticBranchMerge(input) {
    if (input === null || typeof input !== "object")
        throw new Error("HITO G12 requires a structured assessment input");
    assertExactKeys(input, INPUT_KEYS, "HITO G12 assessment input");
    (0, contracts_1.assertValidModel)(input.model);
    const before = (0, contracts_1.canonicalize)(input);
    const request = normalizedRequest(input.request);
    const reasonCodes = [];
    validateSources(input, reasonCodes);
    if (request.projectId !== input.model.project.projectId)
        reasonCodes.push("REQUEST_PROJECT_CANONICAL_BINDING_MISMATCH");
    if (!subjectExists(input.model, request.subjectId))
        reasonCodes.push("REQUEST_SUBJECT_CANONICAL_BINDING_MISMATCH");
    if (request.predecessorTip.projectId !== request.projectId || request.successorTip.projectId !== request.projectId) {
        reasonCodes.push("BRANCH_TIP_PROJECT_BINDING_MISMATCH");
    }
    if (request.predecessorTip.historyHeadEventHash !== input.g10.source.predecessor.historyHead.eventHash) {
        reasonCodes.push("PREDECESSOR_TIP_HISTORY_BINDING_MISMATCH");
    }
    if (request.successorTip.historyHeadEventHash !== input.g10.source.successor.historyHead.eventHash) {
        reasonCodes.push("SUCCESSOR_TIP_HISTORY_BINDING_MISMATCH");
    }
    if (request.predecessorTip.semanticRealityIdentity !== input.predecessor.semanticRealityIdentity) {
        reasonCodes.push("PREDECESSOR_TIP_REALITY_BINDING_MISMATCH");
    }
    if (request.successorTip.semanticRealityIdentity !== input.successor.semanticRealityIdentity) {
        reasonCodes.push("SUCCESSOR_TIP_REALITY_BINDING_MISMATCH");
    }
    const relevantLineage = relevantLineageEventIds(input.model, request.subjectId);
    const predecessorLineage = new Set(request.predecessorTip.lineageEventIds);
    const successorLineage = new Set(request.successorTip.lineageEventIds);
    if (request.predecessorTip.lineageEventIds.some((id) => !relevantLineage.has(id)))
        reasonCodes.push("PREDECESSOR_TIP_LINEAGE_BINDING_MISMATCH");
    if (request.successorTip.lineageEventIds.some((id) => !relevantLineage.has(id)))
        reasonCodes.push("SUCCESSOR_TIP_LINEAGE_BINDING_MISMATCH");
    const sharedLineage = request.predecessorTip.lineageEventIds.filter((id) => successorLineage.has(id) && relevantLineage.has(id));
    if (sharedLineage.length === 0)
        reasonCodes.push("NO_SHARED_CANONICAL_LINEAGE_EVIDENCE");
    let commonBaseEstablished = false;
    if (request.commonBase.applicability === "REQUIRED") {
        if (request.commonBase.state !== "ESTABLISHED") {
            reasonCodes.push(`COMMON_BASE_${request.commonBase.state}`);
        }
        else {
            const position = input.g10.positions.find((entry) => entry.eventHash === request.commonBase.eventHash);
            const isHead = request.commonBase.eventHash === input.g10.source.predecessor.historyHead.eventHash
                || request.commonBase.eventHash === input.g10.source.successor.historyHead.eventHash;
            const lineageShared = request.commonBase.lineageEventId !== undefined
                && predecessorLineage.has(request.commonBase.lineageEventId)
                && successorLineage.has(request.commonBase.lineageEventId)
                && relevantLineage.has(request.commonBase.lineageEventId);
            commonBaseEstablished = position !== undefined && !isHead && lineageShared;
            if (position === undefined || isHead)
                reasonCodes.push("COMMON_BASE_HISTORY_POSITION_MISMATCH");
            if (!lineageShared)
                reasonCodes.push("COMMON_BASE_LINEAGE_BINDING_MISMATCH");
        }
    }
    let branchRelation;
    if (input.g10.causalRelation === "INDETERMINATE") {
        branchRelation = "INDETERMINATE";
        reasonCodes.push("G10_CAUSAL_RELATION_INDETERMINATE");
    }
    else if (input.g10.causalRelation === "DIVERGENT") {
        if (request.commonBase.applicability !== "REQUIRED" || !commonBaseEstablished) {
            branchRelation = "INDETERMINATE";
            reasonCodes.push("DIVERGENCE_REQUIRES_ESTABLISHED_COMMON_BASE");
        }
        else {
            branchRelation = "DIVERGED";
            reasonCodes.push("DIVERGENCE_ESTABLISHED_BY_G10_HISTORY_AND_CANONICAL_LINEAGE");
        }
    }
    else if (sharedLineage.length === 0) {
        branchRelation = "INDETERMINATE";
        reasonCodes.push("SAME_LINEAGE_CANNOT_BE_ESTABLISHED_WITHOUT_SHARED_LINEAGE_EVIDENCE");
    }
    else {
        branchRelation = "SAME_LINEAGE";
        reasonCodes.push("SAME_LINEAGE_ESTABLISHED_INDEPENDENT_OF_SEMANTIC_TIP_RELATION");
    }
    if (request.g9CompletionApplicability === "REQUIRED" && input.g9 === undefined)
        reasonCodes.push("G9_COMPLETION_REQUIRED_BUT_UNAVAILABLE");
    if (request.g11ConflictApplicability === "REQUIRED" && input.g11 === undefined)
        reasonCodes.push("G11_CONFLICT_REQUIRED_BUT_UNAVAILABLE");
    if (input.g11?.conflictAssessment === "CONFLICT_DETECTED")
        reasonCodes.push("G11_CONFLICT_BLOCKS_GOVERNED_MERGE");
    if (input.g11?.conflictAssessment === "INDETERMINATE")
        reasonCodes.push("G11_CONFLICT_ASSESSMENT_UNRESOLVED");
    if (request.protectedAuthority.state === "CONFLICTING")
        reasonCodes.push("PROTECTED_AUTHORITY_CONFLICT_BLOCKS_GOVERNED_MERGE");
    if (request.protectedAuthority.applicability === "REQUIRED" && request.protectedAuthority.state !== "CURRENT" && request.protectedAuthority.state !== "CONFLICTING") {
        reasonCodes.push(`PROTECTED_AUTHORITY_${request.protectedAuthority.state}`);
    }
    reasonCodes.push(...protectedAuthorityIssues(request.protectedAuthority, request, input));
    if (input.g9 !== undefined && g9KnownBlocked(input.g9))
        reasonCodes.push("G9_COMPLETION_STATE_BLOCKS_GOVERNED_MERGE");
    if (input.g9 !== undefined && g9Unresolved(input.g9))
        reasonCodes.push("G9_COMPLETION_STATE_UNRESOLVED");
    const hardBlocked = reasonCodes.some((code) => code === "G11_CONFLICT_BLOCKS_GOVERNED_MERGE"
        || code === "PROTECTED_AUTHORITY_CONFLICT_BLOCKS_GOVERNED_MERGE"
        || code === "G9_COMPLETION_STATE_BLOCKS_GOVERNED_MERGE");
    const unresolved = branchRelation === "INDETERMINATE" || reasonCodes.some((code) => (code.includes("MISMATCH")
        || code.includes("UNRESOLVED")
        || code.includes("UNAVAILABLE")
        || code.includes("UNKNOWN")
        || code.includes("UNAUTHENTICATED")
        || code.includes("STALE")
        || code === "PROTECTED_AUTHORITY_BINDING_INCOMPLETE"));
    let mergeEligibility;
    if (hardBlocked) {
        mergeEligibility = "BLOCKED";
    }
    else if (unresolved) {
        mergeEligibility = "INDETERMINATE";
    }
    else if (request.mergeApplicability === "NOT_REQUIRED") {
        mergeEligibility = "NO_MERGE_REQUIRED";
        reasonCodes.push("MERGE_EXPLICITLY_NOT_REQUIRED");
    }
    else if (input.comparison.semanticComparison === "INDETERMINATE") {
        mergeEligibility = "INDETERMINATE";
        reasonCodes.push("SEMANTIC_TIP_RELATION_INDETERMINATE");
    }
    else if (input.comparison.semanticComparison === "SAME") {
        mergeEligibility = "NO_MERGE_REQUIRED";
        reasonCodes.push("SEMANTIC_TIPS_EQUIVALENT_NO_MERGE_REQUIRED");
    }
    else if (branchRelation === "SAME_LINEAGE") {
        mergeEligibility = "NO_MERGE_REQUIRED";
        reasonCodes.push("LINEAR_SAME_LINEAGE_TRANSITION_REQUIRES_NO_BRANCH_MERGE");
    }
    else {
        mergeEligibility = "ELIGIBLE_FOR_GOVERNED_MERGE";
        reasonCodes.push("DIVERGED_DIFFERENT_TIPS_HAVE_BOUND_NONCONFLICTING_MERGE_EVIDENCE");
    }
    const sources = {
        canonicalModelRevision: input.model.canonicalState.modelRevision,
        canonicalModelIntegrityHash: input.model.canonicalState.integrity.modelHash,
        predecessorSemanticRealityIdentity: input.predecessor.semanticRealityIdentity,
        successorSemanticRealityIdentity: input.successor.semanticRealityIdentity,
        g8ComparisonId: input.comparison.comparisonId,
        g9AssessmentId: input.g9?.assessmentId ?? null,
        g10ProjectionId: input.g10.projectionId,
        g11AssessmentId: input.g11?.assessmentId ?? null,
    };
    const finalReasons = (0, semantic_canonicalization_1.canonicalSemanticSet)(reasonCodes);
    const candidateId = mergeEligibility === "ELIGIBLE_FOR_GOVERNED_MERGE"
        ? `hito_g12_merge_candidate_${(0, semantic_canonicalization_1.sha256LengthPrefixedFrames)([
            { label: "ruleset", value: exports.G12_SEMANTIC_BRANCH_MERGE_RULESET_VERSION },
            { label: "request", value: request },
            { label: "sources", value: sources },
            { label: "branch-relation", value: branchRelation },
        ])}`
        : null;
    const assessmentId = `hito_g12_branch_merge_${(0, semantic_canonicalization_1.sha256LengthPrefixedFrames)([
        { label: "ruleset", value: exports.G12_SEMANTIC_BRANCH_MERGE_RULESET_VERSION },
        { label: "request", value: request },
        { label: "sources", value: sources },
        { label: "assessment", value: { branchRelation, mergeEligibility, finalReasons, candidateId } },
    ])}`;
    const result = {
        kind: "HITO_G12_SEMANTIC_BRANCH_MERGE_ASSESSMENT",
        rulesetVersion: exports.G12_SEMANTIC_BRANCH_MERGE_RULESET_VERSION,
        authority: exports.G12_SEMANTIC_BRANCH_MERGE_AUTHORITY,
        assessmentId,
        branchRelation,
        semanticTipRelation: input.comparison.semanticComparison,
        mergeEligibility,
        branchTips: {
            predecessor: structuredClone(request.predecessorTip),
            successor: structuredClone(request.successorTip),
        },
        commonBase: {
            applicability: request.commonBase.applicability,
            state: request.commonBase.state,
            eventHash: request.commonBase.eventHash ?? null,
            lineageEventId: request.commonBase.lineageEventId ?? null,
            establishedByExistingHistoryAndLineage: commonBaseEstablished,
        },
        protectedAuthority: {
            applicability: request.protectedAuthority.applicability,
            state: request.protectedAuthority.state,
            authorityId: request.protectedAuthority.authorityId ?? null,
        },
        mergeCandidate: {
            present: candidateId !== null,
            candidateId,
            provesMergedReality: false,
            mergedReality: false,
        },
        g9CompletionOwner: {
            remainsG9: true,
            assessmentId: input.g9?.assessmentId ?? null,
            completionAssessment: input.g9?.completionAssessment ?? null,
            provesMergeCompletion: false,
        },
        sources,
        reasonCodes: finalReasons,
        governanceBoundary: {
            derivedOnly: true,
            canonicalAuthority: false,
            mergeAuthority: false,
            mergeExecuted: false,
            mergedRealityFabricated: false,
            g9RemainsCompletionOwner: true,
        },
        zeroEffectCounters: zeroEffects(),
        truthBoundary: "G12 derives branch relation and bounded merge eligibility from existing G8-G11, canonical lineage, and G10 history. An eligible merge candidate is not merged reality and carries no execution authority.",
        limitations: [
            "Branch relation is causal and lineage-derived; it is independent from semantic tip equivalence or difference.",
            "Source-byte identity is metadata only: different bytes do not force a merge and identical bytes do not erase semantic conflict.",
            "G11 detects conflict but cannot resolve it; protected-authority conflict blocks this assessment.",
            "Any later actual merged transition remains subject to a separately authorized G9 completion assessment.",
            "No branch creation, conflict resolution, winner selection, canonical write, merge execution, target execution, provider/model call, network call, or namespace migration is present.",
        ],
    };
    if ((0, contracts_1.canonicalize)(input) !== before)
        throw new Error("HITO G12 mutated caller or canonical authority input");
    return result;
}
