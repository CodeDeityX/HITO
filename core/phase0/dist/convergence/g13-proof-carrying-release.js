"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.G13_PROOF_DIMENSIONS = exports.G13_MANIFEST_SHA256 = exports.G13_CONTINUITY_SHA256 = exports.G13_TRACEABILITY_SHA256 = exports.G13_CASES_SHA256 = exports.G13_MODEL_SHA256 = exports.G13_CONTRACT_SHA256 = exports.G13_PROOF_CARRYING_RELEASE_AUTHORITY = exports.G13_PROOF_CARRYING_RELEASE_RULESET_VERSION = void 0;
exports.assessG13ProofCarryingRelease = assessG13ProofCarryingRelease;
const contracts_1 = require("../contracts");
const g8_engineering_reality_1 = require("./g8-engineering-reality");
const g9_transition_completion_1 = require("./g9-transition-completion");
const g10_semantic_history_diff_1 = require("./g10-semantic-history-diff");
const g11_semantic_conflict_detection_1 = require("./g11-semantic-conflict-detection");
const g12_semantic_branch_merge_1 = require("./g12-semantic-branch-merge");
const semantic_canonicalization_1 = require("./semantic-canonicalization");
exports.G13_PROOF_CARRYING_RELEASE_RULESET_VERSION = "hito-proof-carrying-release-v1";
exports.G13_PROOF_CARRYING_RELEASE_AUTHORITY = "DERIVED / READ_ONLY / NON_CANONICAL / NON_EXECUTING / ELIGIBILITY_ONLY";
exports.G13_CONTRACT_SHA256 = "ad7db98125cdc636dcfc0ef9b259b37aa25d54125deb9ad5517262e08ba50eca";
exports.G13_MODEL_SHA256 = "5626bf504457e14036ba16191f3de3068e4ea593949030901bddfa1106de8809";
exports.G13_CASES_SHA256 = "578573d0a1ad835d23be33480977a80c107185a834c8cc9c34fa02a63c5bdc0b";
exports.G13_TRACEABILITY_SHA256 = "fb853dd49fd1d1ba3fe3db43515e1ffb8f6337011a01df1eaddaf45a5fcdb279";
exports.G13_CONTINUITY_SHA256 = "32259af3c0349e650df503298f908fd033774a9e5c962b4faf9a7c6d668783c0";
exports.G13_MANIFEST_SHA256 = "e7cee322677057bcfbaad3a24f07bdf7a5fa2438ab0bc6bfe6a22c570b56a079";
exports.G13_PROOF_DIMENSIONS = [
    "INTEGRITY",
    "PRODUCER_AUTHENTICITY",
    "PRODUCER_AUTHORITY",
    "SUBJECT_TARGET_BINDING",
    "ENVIRONMENT_BINDING",
    "REALITY_REVISION_BINDING",
    "ATTEMPT_EFFECT_BINDING",
    "FRESHNESS_APPLICABILITY",
    "CHAIN_OF_CUSTODY",
    "REPLAY_RESISTANCE",
    "INDEPENDENCE_DIVERSITY",
    "COMPROMISE_STATUS",
    "PROOF_CLASS_COVERAGE",
    "CLAIM_SCOPE_COVERAGE",
    "CONTRADICTION_CONFLICT_STATUS",
];
const INPUT_KEYS = ["model", "g8Successor", "g9", "g10", "g11", "g12", "request"];
const REQUEST_KEYS = ["releaseId", "projectId", "subjectId", "scopeIdentity", "targetIdentity", "environmentIdentity", "realityRevision", "semanticRealityIdentity", "releaseApplicability", "proofSetCompleteness", "sourceApplicability", "requiredBindings", "requirements", "proofs"];
const SOURCE_APPLICABILITY_KEYS = ["g9TransitionCompletion", "g11ConflictDetection"];
const REQUIREMENT_KEYS = ["dimension", "applicability", "acceptedEvidenceIdentities", "acceptedProofClasses", "acceptedProducerIdentities", "acceptedProducerAuthorityIdentities"];
const PROOF_KEYS = ["dimension", "state", "evidenceIdentity", "proofClass", "producerIdentity", "producerAuthorityIdentity", "projectId", "subjectId", "scopeIdentity", "targetIdentity", "environmentIdentity", "sourceRevision", "boundRealityIdentity", "dimensionBindingIdentity", "attemptIdentity", "effectIdentity", "limitations"];
const BINDING_KEYS = ["integrityIdentity", "subjectTargetBindingIdentity", "environmentBindingIdentity", "realityRevisionBindingIdentity", "attemptIdentity", "effectIdentity", "freshnessApplicabilityIdentity", "chainOfCustodyIdentity", "replayProtectionIdentity", "independenceDiversityIdentity", "compromiseStatusIdentity", "claimScopeIdentity", "contradictionConflictIdentity"];
const APPLICABILITIES = ["REQUIRED", "NOT_REQUIRED"];
const PROOF_STATES = ["ESTABLISHED", "MISSING", "STALE", "UNAVAILABLE", "UNAUTHENTICATED", "CONFLICTING", "COMPROMISED", "INSUFFICIENT", "INVALID", "UNKNOWN", "NOT_REQUIRED"];
const HARD_PROOF_STATES = new Set(["CONFLICTING", "COMPROMISED", "INVALID"]);
const EPISTEMIC_PROOF_STATES = new Set(["MISSING", "STALE", "UNAVAILABLE", "UNAUTHENTICATED", "INSUFFICIENT", "UNKNOWN"]);
function zeroEffects() {
    return {
        canonicalWriteCount: 0,
        governedTargetMutationCount: 0,
        targetExecutionCount: 0,
        deploymentExecutionCount: 0,
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
function safeOptional(value, label) {
    return value === undefined ? undefined : safe(value, label);
}
function assertApplicability(value, label) {
    if (!APPLICABILITIES.includes(value))
        throw new Error(`HITO G13 requires explicit ${label} applicability`);
}
function assertAllDimensions(entries, label) {
    if (entries.length !== exports.G13_PROOF_DIMENSIONS.length)
        throw new Error(`HITO G13 requires exactly 15 ${label}`);
    const seen = new Set(entries.map((entry) => entry.dimension));
    if (seen.size !== exports.G13_PROOF_DIMENSIONS.length || exports.G13_PROOF_DIMENSIONS.some((dimension) => !seen.has(dimension))) {
        throw new Error(`HITO G13 requires each accepted proof dimension exactly once in ${label}`);
    }
}
function normalizedIdentitySet(values, label, required) {
    if (!Array.isArray(values))
        throw new Error(`HITO G13 requires an explicit ${label} collection`);
    const normalized = (0, semantic_canonicalization_1.canonicalSemanticStringSet)(values, label);
    if (required && normalized.length === 0)
        throw new Error(`HITO G13 requires nonempty ${label}`);
    return normalized;
}
function normalizedRequirement(requirement, index) {
    if (requirement === null || typeof requirement !== "object")
        throw new Error(`HITO G13 requirement[${index}] must be structured`);
    assertExactKeys(requirement, REQUIREMENT_KEYS, `HITO G13 requirement[${index}]`);
    if (!exports.G13_PROOF_DIMENSIONS.includes(requirement.dimension))
        throw new Error(`HITO G13 requirement[${index}] dimension is invalid`);
    assertApplicability(requirement.applicability, `requirement[${index}]`);
    const required = requirement.applicability === "REQUIRED";
    return {
        dimension: requirement.dimension,
        applicability: requirement.applicability,
        acceptedEvidenceIdentities: normalizedIdentitySet(requirement.acceptedEvidenceIdentities, `requirements[${index}].acceptedEvidenceIdentities`, required),
        acceptedProofClasses: normalizedIdentitySet(requirement.acceptedProofClasses, `requirements[${index}].acceptedProofClasses`, required),
        acceptedProducerIdentities: normalizedIdentitySet(requirement.acceptedProducerIdentities, `requirements[${index}].acceptedProducerIdentities`, required),
        acceptedProducerAuthorityIdentities: normalizedIdentitySet(requirement.acceptedProducerAuthorityIdentities, `requirements[${index}].acceptedProducerAuthorityIdentities`, required),
    };
}
function normalizedProof(proof, index) {
    if (proof === null || typeof proof !== "object")
        throw new Error(`HITO G13 proof[${index}] must be structured`);
    assertExactKeys(proof, PROOF_KEYS, `HITO G13 proof[${index}]`);
    if (!exports.G13_PROOF_DIMENSIONS.includes(proof.dimension))
        throw new Error(`HITO G13 proof[${index}] dimension is invalid`);
    if (!PROOF_STATES.includes(proof.state))
        throw new Error(`HITO G13 proof[${index}] state is invalid`);
    if (!Array.isArray(proof.limitations))
        throw new Error(`HITO G13 proof[${index}] requires explicit limitations`);
    if (proof.sourceRevision !== undefined && (!Number.isSafeInteger(proof.sourceRevision) || proof.sourceRevision < 0)) {
        throw new Error(`HITO G13 proof[${index}] source revision is invalid`);
    }
    return {
        dimension: proof.dimension,
        state: proof.state,
        ...(safeOptional(proof.evidenceIdentity, `proofs[${index}].evidenceIdentity`) === undefined ? {} : { evidenceIdentity: safe(proof.evidenceIdentity, `proofs[${index}].evidenceIdentity`) }),
        ...(safeOptional(proof.proofClass, `proofs[${index}].proofClass`) === undefined ? {} : { proofClass: safe(proof.proofClass, `proofs[${index}].proofClass`) }),
        ...(safeOptional(proof.producerIdentity, `proofs[${index}].producerIdentity`) === undefined ? {} : { producerIdentity: safe(proof.producerIdentity, `proofs[${index}].producerIdentity`) }),
        ...(safeOptional(proof.producerAuthorityIdentity, `proofs[${index}].producerAuthorityIdentity`) === undefined ? {} : { producerAuthorityIdentity: safe(proof.producerAuthorityIdentity, `proofs[${index}].producerAuthorityIdentity`) }),
        ...(safeOptional(proof.projectId, `proofs[${index}].projectId`) === undefined ? {} : { projectId: safe(proof.projectId, `proofs[${index}].projectId`) }),
        ...(safeOptional(proof.subjectId, `proofs[${index}].subjectId`) === undefined ? {} : { subjectId: safe(proof.subjectId, `proofs[${index}].subjectId`) }),
        ...(safeOptional(proof.scopeIdentity, `proofs[${index}].scopeIdentity`) === undefined ? {} : { scopeIdentity: safe(proof.scopeIdentity, `proofs[${index}].scopeIdentity`) }),
        ...(safeOptional(proof.targetIdentity, `proofs[${index}].targetIdentity`) === undefined ? {} : { targetIdentity: safe(proof.targetIdentity, `proofs[${index}].targetIdentity`) }),
        ...(safeOptional(proof.environmentIdentity, `proofs[${index}].environmentIdentity`) === undefined ? {} : { environmentIdentity: safe(proof.environmentIdentity, `proofs[${index}].environmentIdentity`) }),
        ...(proof.sourceRevision === undefined ? {} : { sourceRevision: proof.sourceRevision }),
        ...(safeOptional(proof.boundRealityIdentity, `proofs[${index}].boundRealityIdentity`) === undefined ? {} : { boundRealityIdentity: safe(proof.boundRealityIdentity, `proofs[${index}].boundRealityIdentity`) }),
        ...(safeOptional(proof.dimensionBindingIdentity, `proofs[${index}].dimensionBindingIdentity`) === undefined ? {} : { dimensionBindingIdentity: safe(proof.dimensionBindingIdentity, `proofs[${index}].dimensionBindingIdentity`) }),
        ...(safeOptional(proof.attemptIdentity, `proofs[${index}].attemptIdentity`) === undefined ? {} : { attemptIdentity: safe(proof.attemptIdentity, `proofs[${index}].attemptIdentity`) }),
        ...(safeOptional(proof.effectIdentity, `proofs[${index}].effectIdentity`) === undefined ? {} : { effectIdentity: safe(proof.effectIdentity, `proofs[${index}].effectIdentity`) }),
        limitations: (0, semantic_canonicalization_1.canonicalSemanticStringSet)(proof.limitations, `proofs[${index}].limitations`),
    };
}
function normalizedBindings(bindings, required) {
    if (bindings === undefined) {
        if (required)
            throw new Error("HITO G13 required release requires explicit proof-binding identities");
        return undefined;
    }
    if (bindings === null || typeof bindings !== "object")
        throw new Error("HITO G13 proof bindings must be structured");
    assertExactKeys(bindings, BINDING_KEYS, "HITO G13 proof bindings");
    return Object.fromEntries(BINDING_KEYS.map((key) => [key, safe(bindings[key], `requiredBindings.${key}`)]));
}
function normalizedRequest(request) {
    if (request === null || typeof request !== "object")
        throw new Error("HITO G13 requires an explicit structured release request");
    assertExactKeys(request, REQUEST_KEYS, "HITO G13 release request");
    assertApplicability(request.releaseApplicability, "release");
    if (!["COMPLETE", "INCOMPLETE", "UNKNOWN"].includes(request.proofSetCompleteness)) {
        throw new Error("HITO G13 requires explicit proof-set completeness");
    }
    if (request.sourceApplicability === null || typeof request.sourceApplicability !== "object") {
        throw new Error("HITO G13 requires explicit source applicability");
    }
    assertExactKeys(request.sourceApplicability, SOURCE_APPLICABILITY_KEYS, "HITO G13 source applicability");
    assertApplicability(request.sourceApplicability.g9TransitionCompletion, "G9 transition-completion");
    assertApplicability(request.sourceApplicability.g11ConflictDetection, "G11 conflict-detection");
    if (!Number.isSafeInteger(request.realityRevision) || request.realityRevision < 0)
        throw new Error("HITO G13 reality revision is invalid");
    if (!Array.isArray(request.requirements) || !Array.isArray(request.proofs))
        throw new Error("HITO G13 requires explicit requirement and proof collections");
    const requirements = request.requirements.map(normalizedRequirement);
    const proofs = request.proofs.map(normalizedProof);
    assertAllDimensions(requirements, "proof requirements");
    assertAllDimensions(proofs, "proof entries");
    const order = new Map(exports.G13_PROOF_DIMENSIONS.map((dimension, index) => [dimension, index]));
    requirements.sort((left, right) => order.get(left.dimension) - order.get(right.dimension));
    proofs.sort((left, right) => order.get(left.dimension) - order.get(right.dimension));
    return {
        releaseId: safe(request.releaseId, "request.releaseId"),
        projectId: safe(request.projectId, "request.projectId"),
        subjectId: safe(request.subjectId, "request.subjectId"),
        scopeIdentity: safe(request.scopeIdentity, "request.scopeIdentity"),
        targetIdentity: safe(request.targetIdentity, "request.targetIdentity"),
        environmentIdentity: safe(request.environmentIdentity, "request.environmentIdentity"),
        realityRevision: request.realityRevision,
        semanticRealityIdentity: safe(request.semanticRealityIdentity, "request.semanticRealityIdentity"),
        releaseApplicability: request.releaseApplicability,
        proofSetCompleteness: request.proofSetCompleteness,
        sourceApplicability: { ...request.sourceApplicability },
        ...(normalizedBindings(request.requiredBindings, request.releaseApplicability === "REQUIRED") === undefined
            ? {}
            : { requiredBindings: normalizedBindings(request.requiredBindings, true) }),
        requirements,
        proofs,
    };
}
function subjectExists(model, subjectId) {
    return subjectId === model.project.projectId
        || model.capabilities.some((entry) => entry.capabilityId === subjectId)
        || model.subsystems.some((entry) => entry.subsystemId === subjectId)
        || model.claims.some((entry) => entry.claimId === subjectId);
}
function validateSources(input, reasons) {
    if (input.g8Successor.rulesetVersion !== g8_engineering_reality_1.G8_ENGINEERING_REALITY_RULESET_VERSION
        || input.g8Successor.source.canonicalModelRevision !== input.model.canonicalState.modelRevision
        || input.g8Successor.source.canonicalModelIntegrityHash !== input.model.canonicalState.integrity.modelHash)
        reasons.push("G8_RELEASE_REALITY_AUTHORITY_MISMATCH");
    if (input.g10.rulesetVersion !== g10_semantic_history_diff_1.G10_SEMANTIC_HISTORY_DIFF_RULESET_VERSION
        || input.g10.source.successor.modelRevision !== input.model.canonicalState.modelRevision
        || input.g10.source.successor.modelIntegrityHash !== input.model.canonicalState.integrity.modelHash
        || input.g10.source.successor.semanticRealityIdentity !== input.g8Successor.semanticRealityIdentity)
        reasons.push("G10_RELEASE_HISTORY_AUTHORITY_MISMATCH");
    if (input.g9 !== undefined && (input.g9.rulesetVersion !== g9_transition_completion_1.G9_TRANSITION_COMPLETION_RULESET_VERSION
        || input.g9.assessmentId !== input.g10.source.g9AssessmentId
        || input.g9.successorSemanticIdentity !== input.g8Successor.semanticRealityIdentity))
        reasons.push("G9_RELEASE_COMPLETION_AUTHORITY_MISMATCH");
    if (input.g11 !== undefined && (input.g11.rulesetVersion !== g11_semantic_conflict_detection_1.G11_SEMANTIC_CONFLICT_RULESET_VERSION
        || input.g11.sources.canonicalModelRevision !== input.model.canonicalState.modelRevision
        || input.g11.sources.canonicalModelIntegrityHash !== input.model.canonicalState.integrity.modelHash
        || input.g11.sources.g8SemanticRealityIdentity !== input.g8Successor.semanticRealityIdentity
        || input.g11.sources.g10ProjectionId !== input.g10.projectionId
        || input.g11.sources.g9AssessmentId !== (input.g9?.assessmentId ?? null)))
        reasons.push("G11_RELEASE_CONFLICT_AUTHORITY_MISMATCH");
    if (input.g12.rulesetVersion !== g12_semantic_branch_merge_1.G12_SEMANTIC_BRANCH_MERGE_RULESET_VERSION
        || input.g12.sources.canonicalModelRevision !== input.model.canonicalState.modelRevision
        || input.g12.sources.canonicalModelIntegrityHash !== input.model.canonicalState.integrity.modelHash
        || input.g12.sources.successorSemanticRealityIdentity !== input.g8Successor.semanticRealityIdentity
        || input.g12.sources.g10ProjectionId !== input.g10.projectionId
        || input.g12.sources.g11AssessmentId !== (input.g11?.assessmentId ?? null)
        || input.g12.sources.g9AssessmentId !== (input.g9?.assessmentId ?? null))
        reasons.push("G12_RELEASE_BRANCH_MERGE_AUTHORITY_MISMATCH");
}
function expectedDimensionBinding(dimension, request, proof) {
    const bindings = request.requiredBindings;
    switch (dimension) {
        case "INTEGRITY": return bindings.integrityIdentity;
        case "PRODUCER_AUTHENTICITY": return proof.producerIdentity ?? "MISSING";
        case "PRODUCER_AUTHORITY": return proof.producerAuthorityIdentity ?? "MISSING";
        case "SUBJECT_TARGET_BINDING": return bindings.subjectTargetBindingIdentity;
        case "ENVIRONMENT_BINDING": return bindings.environmentBindingIdentity;
        case "REALITY_REVISION_BINDING": return bindings.realityRevisionBindingIdentity;
        case "ATTEMPT_EFFECT_BINDING": return `${bindings.attemptIdentity}:${bindings.effectIdentity}`;
        case "FRESHNESS_APPLICABILITY": return bindings.freshnessApplicabilityIdentity;
        case "CHAIN_OF_CUSTODY": return bindings.chainOfCustodyIdentity;
        case "REPLAY_RESISTANCE": return bindings.replayProtectionIdentity;
        case "INDEPENDENCE_DIVERSITY": return bindings.independenceDiversityIdentity;
        case "COMPROMISE_STATUS": return bindings.compromiseStatusIdentity;
        case "PROOF_CLASS_COVERAGE": return proof.proofClass ?? "MISSING";
        case "CLAIM_SCOPE_COVERAGE": return bindings.claimScopeIdentity;
        case "CONTRADICTION_CONFLICT_STATUS": return bindings.contradictionConflictIdentity;
    }
}
function establishedProofIssues(requirement, proof, request) {
    const issues = [];
    const requiredFields = [proof.evidenceIdentity, proof.proofClass, proof.producerIdentity, proof.producerAuthorityIdentity, proof.projectId, proof.subjectId, proof.scopeIdentity, proof.targetIdentity, proof.environmentIdentity, proof.sourceRevision, proof.boundRealityIdentity, proof.dimensionBindingIdentity];
    if (requiredFields.some((value) => value === undefined))
        return [`${proof.dimension}_PROOF_BINDING_INCOMPLETE`];
    if (!requirement.acceptedEvidenceIdentities.includes(proof.evidenceIdentity))
        issues.push(`${proof.dimension}_EVIDENCE_IDENTITY_REJECTED`);
    if (!requirement.acceptedProofClasses.includes(proof.proofClass))
        issues.push(`${proof.dimension}_PROOF_CLASS_REJECTED`);
    if (!requirement.acceptedProducerIdentities.includes(proof.producerIdentity))
        issues.push(`${proof.dimension}_PRODUCER_IDENTITY_REJECTED`);
    if (!requirement.acceptedProducerAuthorityIdentities.includes(proof.producerAuthorityIdentity))
        issues.push(`${proof.dimension}_PRODUCER_AUTHORITY_REJECTED`);
    if (proof.projectId !== request.projectId)
        issues.push(`${proof.dimension}_PROJECT_BINDING_MISMATCH`);
    if (proof.subjectId !== request.subjectId)
        issues.push(`${proof.dimension}_SUBJECT_BINDING_MISMATCH`);
    if (proof.scopeIdentity !== request.scopeIdentity)
        issues.push(`${proof.dimension}_SCOPE_BINDING_MISMATCH`);
    if (proof.targetIdentity !== request.targetIdentity)
        issues.push(`${proof.dimension}_TARGET_BINDING_MISMATCH`);
    if (proof.environmentIdentity !== request.environmentIdentity)
        issues.push(`${proof.dimension}_ENVIRONMENT_BINDING_MISMATCH`);
    if (proof.sourceRevision !== request.realityRevision)
        issues.push(`${proof.dimension}_REALITY_REVISION_BINDING_MISMATCH`);
    if (proof.boundRealityIdentity !== request.semanticRealityIdentity)
        issues.push(`${proof.dimension}_REALITY_IDENTITY_BINDING_MISMATCH`);
    if (proof.dimensionBindingIdentity !== expectedDimensionBinding(proof.dimension, request, proof)) {
        issues.push(`${proof.dimension}_DIMENSION_BINDING_MISMATCH`);
    }
    if (proof.dimension === "ATTEMPT_EFFECT_BINDING" && (proof.attemptIdentity !== request.requiredBindings?.attemptIdentity
        || proof.effectIdentity !== request.requiredBindings?.effectIdentity))
        issues.push("ATTEMPT_EFFECT_IDENTITY_MISMATCH");
    return issues;
}
function dimensionResult(requirement, proof, request) {
    const reasons = [];
    let effectiveState;
    if (request.releaseApplicability === "NOT_REQUIRED") {
        if (requirement.applicability === "NOT_REQUIRED" && proof.state === "NOT_REQUIRED") {
            effectiveState = "NOT_REQUIRED";
            reasons.push("DIMENSION_EXPLICITLY_NOT_REQUIRED");
        }
        else {
            effectiveState = "BLOCKED";
            reasons.push("NO_RELEASE_REQUIRED_DIMENSION_CONTRADICTION");
        }
    }
    else if (requirement.applicability !== "REQUIRED" || proof.state === "NOT_REQUIRED") {
        effectiveState = "BLOCKED";
        reasons.push("REQUIRED_RELEASE_DIMENSION_NOT_REQUIRED");
    }
    else if (HARD_PROOF_STATES.has(proof.state)) {
        effectiveState = "BLOCKED";
        reasons.push(`REQUIRED_PROOF_${proof.state}`);
    }
    else if (EPISTEMIC_PROOF_STATES.has(proof.state)) {
        effectiveState = "INDETERMINATE";
        reasons.push(`REQUIRED_PROOF_${proof.state}`);
    }
    else {
        const issues = establishedProofIssues(requirement, proof, request);
        effectiveState = issues.length === 0 ? "ESTABLISHED" : "BLOCKED";
        reasons.push(...(issues.length === 0 ? ["REQUIRED_PROOF_ESTABLISHED_AND_BOUND"] : issues));
    }
    return {
        dimension: proof.dimension,
        applicability: requirement.applicability,
        declaredState: proof.state,
        effectiveState,
        evidenceIdentity: proof.evidenceIdentity ?? null,
        proofClass: proof.proofClass ?? null,
        producerIdentity: proof.producerIdentity ?? null,
        reasonCodes: (0, semantic_canonicalization_1.canonicalSemanticSet)(reasons),
        limitations: structuredClone(proof.limitations),
    };
}
/**
 * Assesses proof-carrying release eligibility. It does not authorize, execute,
 * or report deployment, and it never treats integrity alone as semantic truth.
 */
function assessG13ProofCarryingRelease(input) {
    if (input === null || typeof input !== "object")
        throw new Error("HITO G13 requires a structured release input");
    assertExactKeys(input, INPUT_KEYS, "HITO G13 release input");
    (0, contracts_1.assertValidModel)(input.model);
    const before = (0, contracts_1.canonicalize)(input);
    const request = normalizedRequest(input.request);
    const reasonCodes = [];
    validateSources(input, reasonCodes);
    if (request.projectId !== input.model.project.projectId)
        reasonCodes.push("REQUEST_PROJECT_CANONICAL_BINDING_MISMATCH");
    if (!subjectExists(input.model, request.subjectId))
        reasonCodes.push("REQUEST_SUBJECT_CANONICAL_BINDING_MISMATCH");
    if (request.realityRevision !== input.model.canonicalState.modelRevision)
        reasonCodes.push("REQUEST_REALITY_REVISION_BINDING_MISMATCH");
    if (request.semanticRealityIdentity !== input.g8Successor.semanticRealityIdentity)
        reasonCodes.push("REQUEST_SEMANTIC_REALITY_BINDING_MISMATCH");
    if (request.proofSetCompleteness !== "COMPLETE" && request.releaseApplicability === "REQUIRED") {
        reasonCodes.push(`PROOF_SET_${request.proofSetCompleteness}`);
    }
    if (request.sourceApplicability.g9TransitionCompletion === "REQUIRED" && input.g9 === undefined)
        reasonCodes.push("G9_COMPLETION_REQUIRED_BUT_UNAVAILABLE");
    if (request.sourceApplicability.g11ConflictDetection === "REQUIRED" && input.g11 === undefined)
        reasonCodes.push("G11_CONFLICT_REQUIRED_BUT_UNAVAILABLE");
    if (input.g9 !== undefined) {
        if (input.g9.completionAssessment === "INDETERMINATE" || ["IN_PROGRESS", "INDETERMINATE"].includes(input.g9.recoveryAssessment)) {
            reasonCodes.push("G9_COMPLETION_UNRESOLVED");
        }
        else if (input.g9.completionAssessment !== "COMPLETE" || input.g9.transitionDisposition !== "SUCCEEDED") {
            reasonCodes.push("G9_COMPLETION_DOES_NOT_ESTABLISH_SUCCESSFUL_TRANSITION");
        }
    }
    if (input.g11?.conflictAssessment === "CONFLICT_DETECTED")
        reasonCodes.push("G11_CONFLICT_BLOCKS_RELEASE");
    if (input.g11?.conflictAssessment === "INDETERMINATE")
        reasonCodes.push("G11_CONFLICT_UNRESOLVED");
    if (input.g12.mergeEligibility === "ELIGIBLE_FOR_GOVERNED_MERGE")
        reasonCodes.push("UNMERGED_G12_CANDIDATE_CANNOT_SUPPORT_RELEASE");
    if (input.g12.mergeEligibility === "BLOCKED")
        reasonCodes.push("G12_MERGE_ASSESSMENT_BLOCKS_RELEASE");
    if (input.g12.mergeEligibility === "INDETERMINATE")
        reasonCodes.push("G12_MERGE_ASSESSMENT_UNRESOLVED");
    const requirementByDimension = new Map(request.requirements.map((entry) => [entry.dimension, entry]));
    const proofByDimension = new Map(request.proofs.map((entry) => [entry.dimension, entry]));
    const proofDimensions = exports.G13_PROOF_DIMENSIONS.map((dimension) => dimensionResult(requirementByDimension.get(dimension), proofByDimension.get(dimension), request));
    reasonCodes.push(...proofDimensions.flatMap((entry) => entry.reasonCodes));
    const establishedClasses = (0, semantic_canonicalization_1.canonicalSemanticStringSet)(proofDimensions.flatMap((entry) => (entry.effectiveState === "ESTABLISHED" && entry.proofClass !== null ? [entry.proofClass] : [])), "establishedProofClasses");
    const testOnly = request.releaseApplicability === "REQUIRED"
        && establishedClasses.length > 0
        && establishedClasses.every((value) => /^TEST(?:$|[:/_ -])/i.test(value));
    if (testOnly)
        reasonCodes.push("TEST_PROOF_ALONE_CANNOT_ESTABLISH_RELEASE");
    const hardBlocked = reasonCodes.some((code) => (code.includes("MISMATCH")
        || code.includes("REJECTED")
        || code.includes("BLOCKS_RELEASE")
        || code === "UNMERGED_G12_CANDIDATE_CANNOT_SUPPORT_RELEASE"
        || code === "G9_COMPLETION_DOES_NOT_ESTABLISH_SUCCESSFUL_TRANSITION"
        || code === "TEST_PROOF_ALONE_CANNOT_ESTABLISH_RELEASE"
        || code === "REQUIRED_RELEASE_DIMENSION_NOT_REQUIRED"
        || code === "NO_RELEASE_REQUIRED_DIMENSION_CONTRADICTION"
        || code.startsWith("REQUIRED_PROOF_CONFLICTING")
        || code.startsWith("REQUIRED_PROOF_COMPROMISED")
        || code.startsWith("REQUIRED_PROOF_INVALID")
        || code.endsWith("PROOF_BINDING_INCOMPLETE"))) || proofDimensions.some((entry) => entry.effectiveState === "BLOCKED");
    const unresolved = reasonCodes.some((code) => (code.includes("UNRESOLVED")
        || code.includes("UNAVAILABLE")
        || code.startsWith("PROOF_SET_")
        || code.startsWith("REQUIRED_PROOF_MISSING")
        || code.startsWith("REQUIRED_PROOF_STALE")
        || code.startsWith("REQUIRED_PROOF_UNAUTHENTICATED")
        || code.startsWith("REQUIRED_PROOF_INSUFFICIENT")
        || code.startsWith("REQUIRED_PROOF_UNKNOWN"))) || proofDimensions.some((entry) => entry.effectiveState === "INDETERMINATE");
    let releaseEligibility;
    if (hardBlocked) {
        releaseEligibility = "BLOCKED";
    }
    else if (unresolved) {
        releaseEligibility = "INDETERMINATE";
    }
    else if (request.releaseApplicability === "NOT_REQUIRED") {
        releaseEligibility = "NO_RELEASE_REQUIRED";
        reasonCodes.push("RELEASE_EXPLICITLY_NOT_REQUIRED");
    }
    else {
        releaseEligibility = "ELIGIBLE_FOR_GOVERNED_RELEASE";
        reasonCodes.push("ALL_FIFTEEN_REQUIRED_PROOF_DIMENSIONS_ESTABLISHED_AND_BOUND");
    }
    const sources = {
        canonicalModelRevision: input.model.canonicalState.modelRevision,
        canonicalModelIntegrityHash: input.model.canonicalState.integrity.modelHash,
        semanticRealityIdentity: input.g8Successor.semanticRealityIdentity,
        g9AssessmentId: input.g9?.assessmentId ?? null,
        g10ProjectionId: input.g10.projectionId,
        g11AssessmentId: input.g11?.assessmentId ?? null,
        g12AssessmentId: input.g12.assessmentId,
    };
    const finalReasons = (0, semantic_canonicalization_1.canonicalSemanticSet)(reasonCodes);
    const assessmentId = `hito_g13_release_${(0, semantic_canonicalization_1.sha256LengthPrefixedFrames)([
        { label: "ruleset", value: exports.G13_PROOF_CARRYING_RELEASE_RULESET_VERSION },
        { label: "request", value: request },
        { label: "sources", value: sources },
        { label: "dimensions", value: proofDimensions },
        { label: "assessment", value: { releaseEligibility, finalReasons } },
    ])}`;
    const integrityEstablished = proofDimensions.find((entry) => entry.dimension === "INTEGRITY")?.effectiveState === "ESTABLISHED";
    const result = {
        kind: "HITO_G13_PROOF_CARRYING_RELEASE_ASSESSMENT",
        rulesetVersion: exports.G13_PROOF_CARRYING_RELEASE_RULESET_VERSION,
        authority: exports.G13_PROOF_CARRYING_RELEASE_AUTHORITY,
        assessmentId,
        releaseId: request.releaseId,
        releaseEligibility,
        proofDimensions,
        sources,
        semanticTruthBoundary: {
            integrityEstablished,
            integrityProvesSemanticTruth: false,
            testProofAloneSufficient: false,
            gitStateIsReleaseTruth: false,
        },
        governanceBoundary: {
            releaseEligibilityOnly: true,
            deploymentAuthority: false,
            deploymentExecuted: false,
            deploymentSucceeded: false,
            targetExecuted: false,
        },
        reasonCodes: finalReasons,
        zeroEffectCounters: zeroEffects(),
        truthBoundary: "G13 derives bounded proof-carrying release eligibility across all 15 accepted dimensions. Eligibility is neither deployment authorization, deployment execution, nor deployment success; integrity alone is not semantic truth.",
        limitations: [
            "Every required proof must be explicitly applicable, established, accepted, and bound to producer, project, subject, scope, target, environment, canonical revision, and G8 reality.",
            "Missing, stale, unavailable, unauthenticated, unknown, or insufficient evidence remains epistemically indeterminate; conflicting, compromised, invalid, rejected, or misbound evidence blocks.",
            "A valid integrity identity or passing TEST proof alone is insufficient release proof, and Git state is not release truth.",
            "G12 merge eligibility is candidate-only; an unmerged candidate cannot support release reality and any actual transition remains owned by G9 completion assessment.",
            "No canonical write, target execution, deployment authority, deployment execution, provider/model call, network call, or namespace migration is present.",
            "Stronger evidence-adequacy, territory, genesis-trust, shadow-topology, semantic-camouflage, and TOCTOU qualification remain outside this accepted C4 contract.",
        ],
    };
    if ((0, contracts_1.canonicalize)(input) !== before)
        throw new Error("HITO G13 mutated caller or canonical authority input");
    return result;
}
