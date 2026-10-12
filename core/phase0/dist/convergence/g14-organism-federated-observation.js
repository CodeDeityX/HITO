"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.G14_MANIFEST_SHA256 = exports.G14_CONTINUITY_SHA256 = exports.G14_TRACEABILITY_SHA256 = exports.G14_CASES_SHA256 = exports.G14_MODEL_SHA256 = exports.G14_CONTRACT_SHA256 = exports.G14_ORGANISM_FEDERATED_OBSERVATION_AUTHORITY = exports.G14_ORGANISM_FEDERATED_OBSERVATION_RULESET_VERSION = void 0;
exports.deriveG14OrganismFederatedObservation = deriveG14OrganismFederatedObservation;
const contracts_1 = require("../contracts");
const g8_engineering_reality_1 = require("./g8-engineering-reality");
const g9_transition_completion_1 = require("./g9-transition-completion");
const g10_semantic_history_diff_1 = require("./g10-semantic-history-diff");
const g11_semantic_conflict_detection_1 = require("./g11-semantic-conflict-detection");
const g12_semantic_branch_merge_1 = require("./g12-semantic-branch-merge");
const g13_proof_carrying_release_1 = require("./g13-proof-carrying-release");
const semantic_canonicalization_1 = require("./semantic-canonicalization");
exports.G14_ORGANISM_FEDERATED_OBSERVATION_RULESET_VERSION = "hito-organism-identity-federated-observation-v1-repair1";
exports.G14_ORGANISM_FEDERATED_OBSERVATION_AUTHORITY = "DERIVED / DETERMINISTIC / PROVENANCE_BOUND / READ_ONLY / NON_CANONICAL / NONEXECUTING";
exports.G14_CONTRACT_SHA256 = "1689fad7044639a2576eaef121221bb7299bbbc0a07d49c4aa809ef7f4656899";
exports.G14_MODEL_SHA256 = "4eb24f8741ca942778b4c4dcbfc7c927134cc342b579693b3a61f7aa95eae4dc";
exports.G14_CASES_SHA256 = "2ec3cea8a607225a040928f42fec23a2536cb4b7e6f813812585f1c9aad85097";
exports.G14_TRACEABILITY_SHA256 = "a1281f0647d35485c3da386cf1219d40f914eb522d2572ceabdf2d920bb482da";
exports.G14_CONTINUITY_SHA256 = "6ae85c8dd884a3c7ca1dd9dbceead42c36a7ef8acbf7fac91472772c5fabf67c";
exports.G14_MANIFEST_SHA256 = "28e8ff3940e69430804b4eeac8fcfc5a5faf71b2414f58a697aef4c3a935eccb";
const INPUT_KEYS = ["model", "g8Successor", "g9", "g10", "g11", "g12", "g13", "request"];
const REQUEST_KEYS = ["projectId", "subjectId", "claimKey", "scopeIdentity", "environmentIdentity", "targetIdentity", "requiredVariantIdentities", "applicability", "expectedMeaningIdentity", "currentTargetRevisionIdentity", "currentCausalPositionIdentity", "causalBinding", "territorySubject", "runtimeRealizationApplicability", "observations", "runtimeRealizations", "rolloutApplicability", "rolloutEnvelope", "dynamicIndirections"];
const TERRITORY_SUBJECT_KEYS = ["territoryEntityId", "class", "membershipAdmission"];
const MEMBERSHIP_ADMISSION_KEYS = ["authorityId", "state", "basis", "projectId", "territoryEntityId", "sourceModelRevision", "boundSemanticRealityIdentity"];
const AUTHORITY_KEYS = ["authorityId", "state", "basis"];
const FACT_KEYS = ["factId", "projectId", "subjectId", "claimKey", "scopeIdentity", "environmentIdentity", "targetIdentity", "variantIdentity", "observerId", "authority", "coverage", "applicability", "observedMeaningIdentity", "sourceBytesIdentity", "sourceModelRevision", "targetRevisionIdentity", "causalPositionIdentity", "wallClockFreshness", "physicalOccurrence", "semanticLegitimacy"];
const REALIZATION_KEYS = ["instanceId", "projectId", "capabilityId", "runtimeHomeId", "environmentIdentity", "targetIdentity", "variantIdentity", "generationIdentity", "observedState", "authority", "sourceModelRevision", "targetRevisionIdentity", "causalPositionIdentity", "semanticLegitimacy"];
const ROLLOUT_KEYS = ["rolloutId", "state", "projectId", "subjectId", "scopeIdentity", "environmentIdentity", "targetIdentity", "variantIdentities", "allowedGenerationIdentities", "authority", "sourceModelRevision", "targetRevisionIdentity", "causalPositionIdentity"];
const INDIRECTION_KEYS = ["indirectionId", "projectId", "subjectId", "scopeIdentity", "environmentIdentity", "targetIdentity", "variantIdentity", "state"];
const AUTHORITY_STATES = ["CURRENT", "STALE", "UNAVAILABLE", "UNAUTHENTICATED", "INVALID", "UNKNOWN"];
const AUTHORITY_BASES = ["EXPLICIT_GOVERNED_AUTHORITY", "REPOSITORY_TEXT", "AGENT_PROSE", "UNBOUND"];
const COVERAGE_STATES = ["BOUND_COMPLETE", "PARTIAL", "UNOBSERVED", "UNKNOWN"];
const FACT_APPLICABILITIES = ["APPLIES", "DOES_NOT_APPLY", "UNKNOWN"];
const WALL_CLOCK_STATES = ["FRESH", "STALE", "UNKNOWN"];
const PHYSICAL_STATES = ["OBSERVED", "NOT_OBSERVED", "UNKNOWN"];
const LEGITIMACY_STATES = ["AUTHORIZED", "UNAUTHORIZED", "UNKNOWN"];
const TERRITORY_CLASSES = ["CANONICAL_MEMBER", "EXPLICITLY_ADMITTED_MEMBER", "RUNTIME_REALIZATION", "EXTERNAL_DEPENDENCY", "EXTERNAL_TERRITORY"];
const REALIZATION_STATES = ["RUNNING", "STOPPED", "UNKNOWN"];
const ROLLOUT_STATES = ["ACCEPTED", "EXPIRED", "UNAUTHORIZED", "UNAVAILABLE", "UNKNOWN"];
const INDIRECTION_STATES = ["RESOLVED", "UNRESOLVED", "NOT_APPLICABLE"];
function zeroEffects() {
    return {
        canonicalWriteCount: 0,
        governedTargetMutationCount: 0,
        targetExecutionCount: 0,
        mergeExecutionCount: 0,
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
function normalizeClaimKey(value, label) {
    return safe(value, label).normalize("NFC").toLowerCase().replaceAll(/[^\p{L}\p{N}]+/gu, " ").trim();
}
function assertSafeRevision(value, label) {
    if (!Number.isSafeInteger(value) || value < 1)
        throw new Error(`HITO G14 requires a positive ${label}`);
}
function normalizeAuthority(authority, label) {
    if (authority === null || typeof authority !== "object")
        throw new Error(`${label} requires structured observer authority`);
    assertExactKeys(authority, AUTHORITY_KEYS, `${label} authority`);
    if (!AUTHORITY_STATES.includes(authority.state))
        throw new Error(`${label} authority state is invalid`);
    if (!AUTHORITY_BASES.includes(authority.basis))
        throw new Error(`${label} authority basis is invalid`);
    return { authorityId: safe(authority.authorityId, `${label}.authorityId`), state: authority.state, basis: authority.basis };
}
function normalizeRequest(request) {
    if (request === null || typeof request !== "object")
        throw new Error("HITO G14 requires an explicit structured observation request");
    assertExactKeys(request, REQUEST_KEYS, "HITO G14 observation request");
    if (request.applicability !== "REQUIRED" && request.applicability !== "NOT_APPLICABLE")
        throw new Error("HITO G14 requires explicit request applicability");
    if (request.causalBinding !== "REQUIRED" && request.causalBinding !== "NOT_REQUIRED")
        throw new Error("HITO G14 requires explicit causal-binding applicability");
    if (request.runtimeRealizationApplicability !== "REQUIRED" && request.runtimeRealizationApplicability !== "NOT_REQUIRED")
        throw new Error("HITO G14 requires explicit runtime-realization applicability");
    if (request.rolloutApplicability !== "REQUIRED" && request.rolloutApplicability !== "NOT_REQUIRED")
        throw new Error("HITO G14 requires explicit rollout applicability");
    if (request.applicability === "REQUIRED" && request.expectedMeaningIdentity === undefined)
        throw new Error("HITO G14 requires expected meaning for an applicable bounded claim");
    if (request.applicability === "NOT_APPLICABLE" && request.expectedMeaningIdentity !== undefined)
        throw new Error("HITO G14 rejects expected meaning for an explicitly non-applicable claim");
    if (!Array.isArray(request.requiredVariantIdentities) || request.requiredVariantIdentities.length === 0)
        throw new Error("HITO G14 requires at least one explicit bounded variant identity");
    if (!Array.isArray(request.observations) || !Array.isArray(request.runtimeRealizations) || !Array.isArray(request.dynamicIndirections))
        throw new Error("HITO G14 requires explicit observation, realization, and dynamic-indirection collections");
    if (request.territorySubject === null || typeof request.territorySubject !== "object")
        throw new Error("HITO G14 requires a structured territory subject");
    assertExactKeys(request.territorySubject, TERRITORY_SUBJECT_KEYS, "HITO G14 territory subject");
    if (!TERRITORY_CLASSES.includes(request.territorySubject.class))
        throw new Error("HITO G14 territory subject class is invalid");
    let membershipAdmission;
    if (request.territorySubject.membershipAdmission !== undefined) {
        const admission = request.territorySubject.membershipAdmission;
        if (admission === null || typeof admission !== "object")
            throw new Error("HITO G14 membership admission must be structured");
        assertExactKeys(admission, MEMBERSHIP_ADMISSION_KEYS, "HITO G14 membership admission");
        if (!AUTHORITY_STATES.includes(admission.state) || !AUTHORITY_BASES.includes(admission.basis))
            throw new Error("HITO G14 membership admission authority is invalid");
        assertSafeRevision(admission.sourceModelRevision, "membership admission source revision");
        membershipAdmission = {
            authorityId: safe(admission.authorityId, "membershipAdmission.authorityId"),
            state: admission.state,
            basis: admission.basis,
            projectId: safe(admission.projectId, "membershipAdmission.projectId"),
            territoryEntityId: safe(admission.territoryEntityId, "membershipAdmission.territoryEntityId"),
            sourceModelRevision: admission.sourceModelRevision,
            boundSemanticRealityIdentity: safe(admission.boundSemanticRealityIdentity, "membershipAdmission.boundSemanticRealityIdentity"),
        };
    }
    const facts = (0, semantic_canonicalization_1.canonicalSemanticSet)(request.observations.map((fact, index) => {
        if (fact === null || typeof fact !== "object")
            throw new Error(`HITO G14 observation[${index}] must be structured`);
        assertExactKeys(fact, FACT_KEYS, `HITO G14 observation[${index}]`);
        if (!COVERAGE_STATES.includes(fact.coverage) || !FACT_APPLICABILITIES.includes(fact.applicability) || !WALL_CLOCK_STATES.includes(fact.wallClockFreshness) || !PHYSICAL_STATES.includes(fact.physicalOccurrence) || !LEGITIMACY_STATES.includes(fact.semanticLegitimacy))
            throw new Error(`HITO G14 observation[${index}] has an invalid state`);
        assertSafeRevision(fact.sourceModelRevision, `observation[${index}] source revision`);
        return {
            factId: safe(fact.factId, `observations[${index}].factId`),
            projectId: safe(fact.projectId, `observations[${index}].projectId`),
            subjectId: safe(fact.subjectId, `observations[${index}].subjectId`),
            claimKey: safe(fact.claimKey, `observations[${index}].claimKey`),
            scopeIdentity: safe(fact.scopeIdentity, `observations[${index}].scopeIdentity`),
            environmentIdentity: safe(fact.environmentIdentity, `observations[${index}].environmentIdentity`),
            targetIdentity: safe(fact.targetIdentity, `observations[${index}].targetIdentity`),
            variantIdentity: safe(fact.variantIdentity, `observations[${index}].variantIdentity`),
            observerId: safe(fact.observerId, `observations[${index}].observerId`),
            authority: normalizeAuthority(fact.authority, `observations[${index}]`),
            coverage: fact.coverage,
            applicability: fact.applicability,
            observedMeaningIdentity: safe(fact.observedMeaningIdentity, `observations[${index}].observedMeaningIdentity`),
            sourceBytesIdentity: safe(fact.sourceBytesIdentity, `observations[${index}].sourceBytesIdentity`),
            sourceModelRevision: fact.sourceModelRevision,
            targetRevisionIdentity: safe(fact.targetRevisionIdentity, `observations[${index}].targetRevisionIdentity`),
            causalPositionIdentity: safe(fact.causalPositionIdentity, `observations[${index}].causalPositionIdentity`),
            wallClockFreshness: fact.wallClockFreshness,
            physicalOccurrence: fact.physicalOccurrence,
            semanticLegitimacy: fact.semanticLegitimacy,
        };
    }));
    const factIds = facts.map((fact) => fact.factId);
    if (new Set(factIds).size !== factIds.length)
        throw new Error("HITO G14 rejects duplicate observation fact identities");
    const realizations = (0, semantic_canonicalization_1.canonicalSemanticSet)(request.runtimeRealizations.map((realization, index) => {
        if (realization === null || typeof realization !== "object")
            throw new Error(`HITO G14 realization[${index}] must be structured`);
        assertExactKeys(realization, REALIZATION_KEYS, `HITO G14 realization[${index}]`);
        if (!REALIZATION_STATES.includes(realization.observedState) || !LEGITIMACY_STATES.includes(realization.semanticLegitimacy))
            throw new Error(`HITO G14 realization[${index}] has an invalid state`);
        assertSafeRevision(realization.sourceModelRevision, `realization[${index}] source revision`);
        return {
            instanceId: safe(realization.instanceId, `runtimeRealizations[${index}].instanceId`),
            projectId: safe(realization.projectId, `runtimeRealizations[${index}].projectId`),
            capabilityId: safe(realization.capabilityId, `runtimeRealizations[${index}].capabilityId`),
            runtimeHomeId: safe(realization.runtimeHomeId, `runtimeRealizations[${index}].runtimeHomeId`),
            environmentIdentity: safe(realization.environmentIdentity, `runtimeRealizations[${index}].environmentIdentity`),
            targetIdentity: safe(realization.targetIdentity, `runtimeRealizations[${index}].targetIdentity`),
            variantIdentity: safe(realization.variantIdentity, `runtimeRealizations[${index}].variantIdentity`),
            generationIdentity: safe(realization.generationIdentity, `runtimeRealizations[${index}].generationIdentity`),
            observedState: realization.observedState,
            authority: normalizeAuthority(realization.authority, `runtimeRealizations[${index}]`),
            sourceModelRevision: realization.sourceModelRevision,
            targetRevisionIdentity: safe(realization.targetRevisionIdentity, `runtimeRealizations[${index}].targetRevisionIdentity`),
            causalPositionIdentity: safe(realization.causalPositionIdentity, `runtimeRealizations[${index}].causalPositionIdentity`),
            semanticLegitimacy: realization.semanticLegitimacy,
        };
    }));
    const instanceIds = realizations.map((item) => item.instanceId);
    if (new Set(instanceIds).size !== instanceIds.length)
        throw new Error("HITO G14 rejects duplicate runtime instance identities");
    let rolloutEnvelope;
    if (request.rolloutEnvelope !== undefined) {
        const rollout = request.rolloutEnvelope;
        if (rollout === null || typeof rollout !== "object")
            throw new Error("HITO G14 rollout envelope must be structured");
        assertExactKeys(rollout, ROLLOUT_KEYS, "HITO G14 rollout envelope");
        if (!ROLLOUT_STATES.includes(rollout.state))
            throw new Error("HITO G14 rollout state is invalid");
        if (!Array.isArray(rollout.variantIdentities) || !Array.isArray(rollout.allowedGenerationIdentities))
            throw new Error("HITO G14 rollout envelope requires explicit variant and generation sets");
        assertSafeRevision(rollout.sourceModelRevision, "rollout source revision");
        rolloutEnvelope = {
            rolloutId: safe(rollout.rolloutId, "rollout.rolloutId"),
            state: rollout.state,
            projectId: safe(rollout.projectId, "rollout.projectId"),
            subjectId: safe(rollout.subjectId, "rollout.subjectId"),
            scopeIdentity: safe(rollout.scopeIdentity, "rollout.scopeIdentity"),
            environmentIdentity: safe(rollout.environmentIdentity, "rollout.environmentIdentity"),
            targetIdentity: safe(rollout.targetIdentity, "rollout.targetIdentity"),
            variantIdentities: (0, semantic_canonicalization_1.canonicalSemanticStringSet)(rollout.variantIdentities, "rollout.variantIdentities"),
            allowedGenerationIdentities: (0, semantic_canonicalization_1.canonicalSemanticStringSet)(rollout.allowedGenerationIdentities, "rollout.allowedGenerationIdentities"),
            authority: normalizeAuthority(rollout.authority, "rollout"),
            sourceModelRevision: rollout.sourceModelRevision,
            targetRevisionIdentity: safe(rollout.targetRevisionIdentity, "rollout.targetRevisionIdentity"),
            causalPositionIdentity: safe(rollout.causalPositionIdentity, "rollout.causalPositionIdentity"),
        };
    }
    if (request.rolloutApplicability === "REQUIRED" && rolloutEnvelope === undefined) {
        // Kept as an explicit missing authority state in the projection; never fabricated here.
    }
    if (request.rolloutApplicability === "NOT_REQUIRED" && rolloutEnvelope !== undefined)
        throw new Error("HITO G14 rejects a rollout envelope when rollout applicability is NOT_REQUIRED");
    const dynamicIndirections = (0, semantic_canonicalization_1.canonicalSemanticSet)(request.dynamicIndirections.map((entry, index) => {
        if (entry === null || typeof entry !== "object")
            throw new Error(`HITO G14 dynamic indirection[${index}] must be structured`);
        assertExactKeys(entry, INDIRECTION_KEYS, `HITO G14 dynamic indirection[${index}]`);
        if (!INDIRECTION_STATES.includes(entry.state))
            throw new Error(`HITO G14 dynamic indirection[${index}] state is invalid`);
        return {
            indirectionId: safe(entry.indirectionId, `dynamicIndirections[${index}].indirectionId`),
            projectId: safe(entry.projectId, `dynamicIndirections[${index}].projectId`),
            subjectId: safe(entry.subjectId, `dynamicIndirections[${index}].subjectId`),
            scopeIdentity: safe(entry.scopeIdentity, `dynamicIndirections[${index}].scopeIdentity`),
            environmentIdentity: safe(entry.environmentIdentity, `dynamicIndirections[${index}].environmentIdentity`),
            targetIdentity: safe(entry.targetIdentity, `dynamicIndirections[${index}].targetIdentity`),
            variantIdentity: safe(entry.variantIdentity, `dynamicIndirections[${index}].variantIdentity`),
            state: entry.state,
        };
    }));
    return {
        projectId: safe(request.projectId, "request.projectId"),
        subjectId: safe(request.subjectId, "request.subjectId"),
        claimKey: safe(request.claimKey, "request.claimKey"),
        scopeIdentity: safe(request.scopeIdentity, "request.scopeIdentity"),
        environmentIdentity: safe(request.environmentIdentity, "request.environmentIdentity"),
        targetIdentity: safe(request.targetIdentity, "request.targetIdentity"),
        requiredVariantIdentities: (0, semantic_canonicalization_1.canonicalSemanticStringSet)(request.requiredVariantIdentities, "request.requiredVariantIdentities"),
        applicability: request.applicability,
        ...(request.expectedMeaningIdentity === undefined ? {} : { expectedMeaningIdentity: safe(request.expectedMeaningIdentity, "request.expectedMeaningIdentity") }),
        currentTargetRevisionIdentity: safe(request.currentTargetRevisionIdentity, "request.currentTargetRevisionIdentity"),
        currentCausalPositionIdentity: safe(request.currentCausalPositionIdentity, "request.currentCausalPositionIdentity"),
        causalBinding: request.causalBinding,
        territorySubject: {
            territoryEntityId: safe(request.territorySubject.territoryEntityId, "territorySubject.territoryEntityId"),
            class: request.territorySubject.class,
            ...(membershipAdmission === undefined ? {} : { membershipAdmission }),
        },
        runtimeRealizationApplicability: request.runtimeRealizationApplicability,
        observations: facts,
        runtimeRealizations: realizations,
        rolloutApplicability: request.rolloutApplicability,
        ...(rolloutEnvelope === undefined ? {} : { rolloutEnvelope }),
        dynamicIndirections,
    };
}
function validatePredecessorAuthorities(input) {
    const reasons = [];
    const model = input.model;
    if (input.g8Successor.rulesetVersion !== g8_engineering_reality_1.G8_ENGINEERING_REALITY_RULESET_VERSION
        || input.g8Successor.source.canonicalModelRevision !== model.canonicalState.modelRevision
        || input.g8Successor.source.canonicalModelIntegrityHash !== model.canonicalState.integrity.modelHash)
        reasons.push("G8_SUCCESSOR_AUTHORITY_MISMATCH");
    if (input.g10.rulesetVersion !== g10_semantic_history_diff_1.G10_SEMANTIC_HISTORY_DIFF_RULESET_VERSION
        || input.g10.source.successor.modelRevision !== model.canonicalState.modelRevision
        || input.g10.source.successor.modelIntegrityHash !== model.canonicalState.integrity.modelHash
        || input.g10.source.successor.semanticRealityIdentity !== input.g8Successor.semanticRealityIdentity)
        reasons.push("G10_HISTORY_DIFF_AUTHORITY_MISMATCH");
    if (input.g9 !== undefined && (input.g9.rulesetVersion !== g9_transition_completion_1.G9_TRANSITION_COMPLETION_RULESET_VERSION
        || input.g9.assessmentId !== input.g10.source.g9AssessmentId
        || input.g9.successorSemanticIdentity !== input.g8Successor.semanticRealityIdentity))
        reasons.push("G9_TRANSITION_COMPLETION_AUTHORITY_MISMATCH");
    if (input.g11 !== undefined && (input.g11.rulesetVersion !== g11_semantic_conflict_detection_1.G11_SEMANTIC_CONFLICT_RULESET_VERSION
        || input.g11.sources.canonicalModelRevision !== model.canonicalState.modelRevision
        || input.g11.sources.g8SemanticRealityIdentity !== input.g8Successor.semanticRealityIdentity
        || input.g11.sources.g10ProjectionId !== input.g10.projectionId))
        reasons.push("G11_CONFLICT_AUTHORITY_MISMATCH");
    if (input.g12.rulesetVersion !== g12_semantic_branch_merge_1.G12_SEMANTIC_BRANCH_MERGE_RULESET_VERSION
        || input.g12.sources.canonicalModelRevision !== model.canonicalState.modelRevision
        || input.g12.sources.canonicalModelIntegrityHash !== model.canonicalState.integrity.modelHash
        || input.g12.sources.successorSemanticRealityIdentity !== input.g8Successor.semanticRealityIdentity
        || input.g12.sources.g10ProjectionId !== input.g10.projectionId)
        reasons.push("G12_BRANCH_MERGE_AUTHORITY_MISMATCH");
    if (input.g13 !== undefined && (input.g13.rulesetVersion !== g13_proof_carrying_release_1.G13_PROOF_CARRYING_RELEASE_RULESET_VERSION
        || input.g13.sources.canonicalModelRevision !== model.canonicalState.modelRevision
        || input.g13.sources.canonicalModelIntegrityHash !== model.canonicalState.integrity.modelHash
        || input.g13.sources.semanticRealityIdentity !== input.g8Successor.semanticRealityIdentity
        || input.g13.sources.g10ProjectionId !== input.g10.projectionId
        || input.g13.sources.g12AssessmentId !== input.g12.assessmentId))
        reasons.push("G13_RELEASE_AUTHORITY_MISMATCH");
    return reasons;
}
function canonicalSubjectExists(model, subjectId) {
    return subjectId === model.project.projectId
        || model.capabilities.some((item) => item.capabilityId === subjectId)
        || model.subsystems.some((item) => item.subsystemId === subjectId)
        || model.runtimeHomes.some((item) => item.runtimeHomeId === subjectId)
        || model.claims.some((item) => item.claimId === subjectId);
}
function deriveOrganismIdentity(model, request) {
    const capability = model.capabilities.find((item) => item.capabilityId === request.subjectId);
    const runtimeHome = capability?.runtimeHomeId === null || capability?.runtimeHomeId === undefined
        ? undefined
        : model.runtimeHomes.find((item) => item.runtimeHomeId === capability.runtimeHomeId && item.capabilityId === capability.capabilityId);
    const organismIdentityId = `hito_organism_${(0, semantic_canonicalization_1.sha256LengthPrefixedFrames)([
        { label: "identity-scheme", value: "hito-g14-persistent-organism-identity-v1" },
        { label: "project-id", value: model.project.projectId },
    ])}`;
    const persistentSubjectIdentity = `hito_subject_${(0, semantic_canonicalization_1.sha256LengthPrefixedFrames)([
        { label: "organism", value: organismIdentityId },
        { label: "subject-id", value: request.subjectId },
    ])}`;
    const persistentCapabilityIdentity = capability === undefined ? null : `hito_capability_${(0, semantic_canonicalization_1.sha256LengthPrefixedFrames)([
        { label: "organism", value: organismIdentityId },
        { label: "capability-id", value: capability.capabilityId },
    ])}`;
    const persistentRuntimeHomeIdentity = runtimeHome === undefined ? null : `hito_runtime_home_${(0, semantic_canonicalization_1.sha256LengthPrefixedFrames)([
        { label: "persistent-capability", value: persistentCapabilityIdentity },
        { label: "runtime-home-id", value: runtimeHome.runtimeHomeId },
    ])}`;
    const projectionId = `hito_g14_organism_projection_${(0, semantic_canonicalization_1.sha256LengthPrefixedFrames)([
        { label: "organism-identity", value: organismIdentityId },
        { label: "persistent-subject", value: persistentSubjectIdentity },
        { label: "persistent-capability", value: persistentCapabilityIdentity ?? "NOT_APPLICABLE" },
        { label: "persistent-runtime-home", value: persistentRuntimeHomeIdentity ?? "NOT_APPLICABLE" },
        { label: "canonical-model-integrity", value: model.canonicalState.integrity.modelHash },
    ])}`;
    return {
        organismIdentityId,
        projectionId,
        projectId: model.project.projectId,
        subjectId: request.subjectId,
        persistentSubjectIdentity,
        capabilityId: capability?.capabilityId ?? null,
        persistentCapabilityIdentity,
        runtimeHomeId: runtimeHome?.runtimeHomeId ?? null,
        persistentRuntimeHomeIdentity,
        canonicalModelRevision: model.canonicalState.modelRevision,
        ephemeralInstanceIdsExcludedFromPersistentIdentity: true,
        canonicalAuthority: false,
    };
}
function authorityIssues(authority, sourceModelRevision, targetRevisionIdentity, causalPositionIdentity, request, currentModelRevision) {
    const issues = [];
    if (authority.state !== "CURRENT")
        issues.push(`AUTHORITY_${authority.state}`);
    if (authority.basis !== "EXPLICIT_GOVERNED_AUTHORITY")
        issues.push(`AUTHORITY_BASIS_${authority.basis}`);
    if (sourceModelRevision > currentModelRevision)
        issues.push("SOURCE_MODEL_REVISION_FROM_FUTURE");
    if (targetRevisionIdentity !== request.currentTargetRevisionIdentity)
        issues.push("TARGET_REVISION_CAUSALLY_STALE");
    if (request.causalBinding === "REQUIRED" && causalPositionIdentity !== request.currentCausalPositionIdentity)
        issues.push("CAUSAL_POSITION_STALE");
    return issues;
}
function factIssues(fact, request, normalizedBoundedClaimKey, currentModelRevision) {
    const issues = authorityIssues(fact.authority, fact.sourceModelRevision, fact.targetRevisionIdentity, fact.causalPositionIdentity, request, currentModelRevision);
    if (fact.projectId !== request.projectId)
        issues.push("FACT_PROJECT_BINDING_MISMATCH");
    if (fact.subjectId !== request.subjectId)
        issues.push("FACT_SUBJECT_BINDING_MISMATCH");
    if (fact.scopeIdentity !== request.scopeIdentity)
        issues.push("FACT_SCOPE_BINDING_MISMATCH");
    if (fact.environmentIdentity !== request.environmentIdentity)
        issues.push("FACT_ENVIRONMENT_BINDING_MISMATCH");
    if (fact.targetIdentity !== request.targetIdentity)
        issues.push("FACT_TARGET_BINDING_MISMATCH");
    if (!request.requiredVariantIdentities.includes(fact.variantIdentity))
        issues.push("FACT_VARIANT_NOT_REQUESTED");
    if (normalizeClaimKey(fact.claimKey, `fact.${fact.factId}.claimKey`) !== normalizedBoundedClaimKey)
        issues.push("FACT_CLAIM_KEY_UNRELATED");
    if (fact.applicability !== "APPLIES")
        issues.push(`FACT_APPLICABILITY_${fact.applicability}`);
    if (fact.coverage !== "BOUND_COMPLETE")
        issues.push(`FACT_COVERAGE_${fact.coverage}`);
    if (fact.wallClockFreshness !== "FRESH")
        issues.push(`FACT_WALL_CLOCK_${fact.wallClockFreshness}`);
    return (0, semantic_canonicalization_1.canonicalSemanticStringSet)(issues, `fact.${fact.factId}.reasonCodes`);
}
function g11StateForIssues(fact, issues) {
    if (fact.authority.basis !== "EXPLICIT_GOVERNED_AUTHORITY" || fact.authority.state === "UNAUTHENTICATED")
        return "UNAUTHENTICATED";
    if (["STALE", "UNAVAILABLE", "INVALID", "UNKNOWN"].includes(fact.authority.state))
        return fact.authority.state;
    if (issues.some((issue) => issue.includes("STALE") || issue.startsWith("FACT_WALL_CLOCK_")))
        return "STALE";
    if (issues.some((issue) => issue.includes("MISMATCH") || issue.includes("NOT_REQUESTED") || issue.includes("UNRELATED")))
        return "INVALID";
    if (issues.some((issue) => issue.startsWith("FACT_COVERAGE_") || issue.startsWith("FACT_APPLICABILITY_")))
        return "UNKNOWN";
    return "CURRENT";
}
function deriveRuntimeRealizations(model, request, organism) {
    return (0, semantic_canonicalization_1.canonicalSemanticSet)(request.runtimeRealizations.map((observation) => {
        const reasons = authorityIssues(observation.authority, observation.sourceModelRevision, observation.targetRevisionIdentity, observation.causalPositionIdentity, request, model.canonicalState.modelRevision);
        const observerAuthorityApplicable = reasons.length === 0;
        const capability = model.capabilities.find((item) => item.capabilityId === observation.capabilityId);
        const runtimeHome = model.runtimeHomes.find((item) => item.runtimeHomeId === observation.runtimeHomeId);
        if (observation.projectId !== request.projectId || observation.projectId !== model.project.projectId)
            reasons.push("REALIZATION_PROJECT_BINDING_MISMATCH");
        if (observation.capabilityId !== request.subjectId)
            reasons.push("REALIZATION_SUBJECT_BINDING_MISMATCH");
        if (observation.environmentIdentity !== request.environmentIdentity)
            reasons.push("REALIZATION_ENVIRONMENT_BINDING_MISMATCH");
        if (observation.targetIdentity !== request.targetIdentity)
            reasons.push("REALIZATION_TARGET_BINDING_MISMATCH");
        if (!request.requiredVariantIdentities.includes(observation.variantIdentity))
            reasons.push("REALIZATION_VARIANT_NOT_REQUESTED");
        if (capability === undefined)
            reasons.push("REALIZATION_CAPABILITY_NOT_CANONICAL");
        if (runtimeHome === undefined || runtimeHome.capabilityId !== observation.capabilityId || capability?.runtimeHomeId !== observation.runtimeHomeId)
            reasons.push("REALIZATION_RUNTIME_HOME_NOT_CURRENTLY_BOUND");
        const bindingIssue = reasons.some((reason) => reason.includes("PROJECT_BINDING") || reason.includes("SUBJECT_BINDING") || reason.includes("CAPABILITY_NOT_CANONICAL") || reason.includes("RUNTIME_HOME_NOT_CURRENTLY_BOUND"));
        const uncertaintyIssue = reasons.some((reason) => reason.startsWith("AUTHORITY_") || reason.includes("STALE") || reason.includes("FUTURE") || reason.includes("ENVIRONMENT") || reason.includes("TARGET_BINDING") || reason.includes("VARIANT"));
        const bindingState = bindingIssue ? "UNBOUND" : uncertaintyIssue ? "INDETERMINATE" : "BOUND";
        const persistentCapabilityIdentity = organism.persistentCapabilityIdentity ?? `hito_unbound_capability_${(0, semantic_canonicalization_1.sha256LengthPrefixedFrames)([{ label: "capability-id", value: observation.capabilityId }])}`;
        const persistentRuntimeHomeIdentity = organism.persistentRuntimeHomeIdentity ?? `hito_unbound_runtime_home_${(0, semantic_canonicalization_1.sha256LengthPrefixedFrames)([{ label: "runtime-home-id", value: observation.runtimeHomeId }])}`;
        const realizationBindingId = `hito_realization_binding_${(0, semantic_canonicalization_1.sha256LengthPrefixedFrames)([
            { label: "persistent-capability", value: persistentCapabilityIdentity },
            { label: "persistent-runtime-home", value: persistentRuntimeHomeIdentity },
            { label: "environment", value: observation.environmentIdentity },
            { label: "target", value: observation.targetIdentity },
            { label: "variant", value: observation.variantIdentity },
            { label: "generation", value: observation.generationIdentity },
        ])}`;
        const runtimeInstanceIdentity = `hito_runtime_instance_${(0, semantic_canonicalization_1.sha256LengthPrefixedFrames)([
            { label: "realization-binding", value: realizationBindingId },
            { label: "ephemeral-instance", value: observation.instanceId },
        ])}`;
        return {
            instanceId: observation.instanceId,
            runtimeInstanceIdentity,
            realizationBindingId,
            persistentCapabilityIdentity,
            persistentRuntimeHomeIdentity,
            generationIdentity: observation.generationIdentity,
            variantIdentity: observation.variantIdentity,
            bindingState,
            active: observation.observedState === "RUNNING",
            authorityApplicable: observerAuthorityApplicable,
            semanticLegitimacy: observation.semanticLegitimacy,
            reasonCodes: (0, semantic_canonicalization_1.canonicalSemanticStringSet)(reasons, `realization.${observation.instanceId}.reasonCodes`),
        };
    }));
}
function deriveMembership(model, request, realizations, semanticRealityIdentity) {
    const territory = request.territorySubject;
    const canonicalEntity = territory.territoryEntityId === model.project.projectId
        || model.capabilities.some((item) => item.capabilityId === territory.territoryEntityId)
        || model.subsystems.some((item) => item.subsystemId === territory.territoryEntityId)
        || model.runtimeHomes.some((item) => item.runtimeHomeId === territory.territoryEntityId);
    const admission = territory.membershipAdmission;
    const admissionValid = admission !== undefined
        && admission.state === "CURRENT"
        && admission.basis === "EXPLICIT_GOVERNED_AUTHORITY"
        && admission.projectId === request.projectId
        && admission.territoryEntityId === territory.territoryEntityId
        && admission.sourceModelRevision === model.canonicalState.modelRevision
        && admission.boundSemanticRealityIdentity === semanticRealityIdentity;
    const realizationBound = realizations.some((item) => item.instanceId === territory.territoryEntityId && item.bindingState === "BOUND" && item.authorityApplicable);
    let membershipState;
    if (territory.class === "CANONICAL_MEMBER")
        membershipState = canonicalEntity ? "CANONICAL_MEMBER" : "INDETERMINATE";
    else if (territory.class === "EXPLICITLY_ADMITTED_MEMBER")
        membershipState = admissionValid ? "EXPLICITLY_ADMITTED_MEMBER" : "INDETERMINATE";
    else if (territory.class === "RUNTIME_REALIZATION")
        membershipState = realizationBound ? "ADMITTED_RUNTIME_REALIZATION" : "INDETERMINATE";
    else
        membershipState = "EXTERNAL_BOUNDARY";
    return {
        territoryEntityId: territory.territoryEntityId,
        declaredClass: territory.class,
        membershipState,
        organismMember: membershipState === "CANONICAL_MEMBER" || membershipState === "EXPLICITLY_ADMITTED_MEMBER",
        realizationOnly: membershipState === "ADMITTED_RUNTIME_REALIZATION",
        externalBoundary: membershipState === "EXTERNAL_BOUNDARY",
        admissionAuthorityId: admissionValid ? admission.authorityId : null,
    };
}
function relevantFactForVariant(fact, request, normalizedKey, variant) {
    return normalizeClaimKey(fact.claimKey, `fact.${fact.factId}.claimKey`) === normalizedKey
        && fact.subjectId === request.subjectId
        && fact.scopeIdentity === request.scopeIdentity
        && fact.environmentIdentity === request.environmentIdentity
        && fact.targetIdentity === request.targetIdentity
        && fact.variantIdentity === variant;
}
function assessVariant(input, request, normalizedKey, variantIdentity) {
    const relevant = request.observations.filter((fact) => relevantFactForVariant(fact, request, normalizedKey, variantIdentity));
    const projected = relevant.map((fact) => {
        const reasons = factIssues(fact, request, normalizedKey, input.model.canonicalState.modelRevision);
        return {
            factId: fact.factId,
            normalizedClaimKey: normalizedKey,
            variantIdentity: fact.variantIdentity,
            observedMeaningIdentity: fact.observedMeaningIdentity,
            observerId: fact.observerId,
            authorityApplicable: reasons.length === 0,
            coverage: fact.coverage,
            semanticLegitimacy: fact.semanticLegitimacy,
            reasonCodes: reasons,
        };
    });
    const g11Facts = relevant.map((fact) => {
        const issues = factIssues(fact, request, normalizedKey, input.model.canonicalState.modelRevision);
        const state = g11StateForIssues(fact, issues);
        const current = state === "CURRENT";
        return {
            factId: fact.factId,
            projectId: fact.projectId,
            subjectId: fact.subjectId,
            scopeIdentity: `g14_${(0, semantic_canonicalization_1.sha256LengthPrefixedFrames)([{ label: "scope", value: request.scopeIdentity }, { label: "environment", value: request.environmentIdentity }, { label: "variant", value: variantIdentity }])}`,
            targetIdentity: request.targetIdentity,
            semanticKey: fact.claimKey,
            acceptedMeaningIdentity: fact.observedMeaningIdentity,
            sourceBytesIdentity: fact.sourceBytesIdentity,
            causalPositionEventHash: current ? input.g10.source.successor.historyHead.eventHash : fact.causalPositionIdentity,
            authority: {
                authorityId: fact.authority.authorityId,
                state,
                sourceRevision: current ? input.model.canonicalState.modelRevision : fact.sourceModelRevision,
                boundRealityIdentity: current ? input.g8Successor.semanticRealityIdentity : `g14_unbound_${fact.factId}`,
            },
        };
    });
    const conflict = (0, g11_semantic_conflict_detection_1.detectG11BoundedSemanticConflict)({
        model: input.model,
        g8Successor: input.g8Successor,
        ...(input.g9 === undefined ? {} : { g9: input.g9 }),
        g10: input.g10,
        request: {
            projectId: request.projectId,
            subjectId: request.subjectId,
            scopeIdentity: `g14_${(0, semantic_canonicalization_1.sha256LengthPrefixedFrames)([{ label: "scope", value: request.scopeIdentity }, { label: "environment", value: request.environmentIdentity }, { label: "variant", value: variantIdentity }])}`,
            targetIdentity: request.targetIdentity,
            semanticKey: request.claimKey,
            factSetCompleteness: projected.some((fact) => fact.coverage !== "BOUND_COMPLETE") ? "INCOMPLETE" : "COMPLETE",
            applicability: {
                phase2Reconciliation: "NOT_REQUIRED",
                phase4ProtectedAuthority: "NOT_REQUIRED",
                g9TransitionCompletion: "NOT_REQUIRED",
            },
            facts: g11Facts,
        },
    });
    const authoritative = projected.filter((fact) => fact.authorityApplicable);
    const matching = authoritative.filter((fact) => fact.observedMeaningIdentity === request.expectedMeaningIdentity && fact.semanticLegitimacy === "AUTHORIZED");
    const divergent = authoritative.filter((fact) => fact.observedMeaningIdentity !== request.expectedMeaningIdentity || fact.semanticLegitimacy === "UNAUTHORIZED");
    const unknownLegitimacy = authoritative.some((fact) => fact.semanticLegitimacy === "UNKNOWN");
    let state;
    const reasons = [];
    if (conflict.conflictAssessment === "CONFLICT_DETECTED") {
        state = "DESYNCHRONIZED";
        reasons.push("AUTHORITATIVE_SAME_KEY_OBSERVER_CONFLICT");
    }
    else if (divergent.length > 0) {
        state = "DESYNCHRONIZED";
        reasons.push("AUTHORITATIVE_OBSERVED_REALITY_DIVERGES_FROM_GOVERNED_MEANING");
    }
    else if (authoritative.length === 0 || matching.length === 0 || unknownLegitimacy || conflict.conflictAssessment === "INDETERMINATE") {
        state = "INDETERMINATE";
        if (authoritative.length === 0)
            reasons.push("NO_AUTHORITATIVE_APPLICABLE_BOUND_OBSERVATION");
        if (unknownLegitimacy)
            reasons.push("SEMANTIC_LEGITIMACY_UNKNOWN");
        if (conflict.conflictAssessment === "INDETERMINATE")
            reasons.push("OBSERVER_CONFLICT_ASSESSMENT_INDETERMINATE");
    }
    else {
        state = "ALIGNED";
        reasons.push("BOUNDED_GOVERNED_AND_OBSERVED_MEANING_MATCH");
    }
    const coverageState = authoritative.length > 0
        ? "BOUND_COMPLETE"
        : relevant.length === 0
            ? "UNOBSERVED"
            : relevant.some((fact) => fact.coverage === "PARTIAL")
                ? "PARTIAL"
                : "UNKNOWN";
    return {
        assessment: {
            variantIdentity,
            conflictAssessmentId: conflict.assessmentId,
            conflictAssessment: conflict.conflictAssessment,
            authoritativeFactIds: (0, semantic_canonicalization_1.canonicalSemanticStringSet)(authoritative.map((fact) => fact.factId), `variant.${variantIdentity}.authoritativeFactIds`),
            matchingFactIds: (0, semantic_canonicalization_1.canonicalSemanticStringSet)(matching.map((fact) => fact.factId), `variant.${variantIdentity}.matchingFactIds`),
            divergentFactIds: (0, semantic_canonicalization_1.canonicalSemanticStringSet)(divergent.map((fact) => fact.factId), `variant.${variantIdentity}.divergentFactIds`),
            coverageState,
            state,
            reasonCodes: (0, semantic_canonicalization_1.canonicalSemanticStringSet)(reasons, `variant.${variantIdentity}.reasonCodes`),
        },
        facts: projected,
    };
}
function rolloutAssessment(model, request, realizations) {
    const active = realizations.filter((item) => item.active && item.authorityApplicable && item.bindingState === "BOUND");
    const generations = (0, semantic_canonicalization_1.canonicalSemanticStringSet)(active.map((item) => item.generationIdentity), "rollout.activeGenerationIdentities");
    const mixed = generations.length > 1;
    const envelope = request.rolloutEnvelope;
    const reasons = [];
    let acceptedEnvelope = false;
    let desynchronized = false;
    let indeterminate = false;
    let state = request.rolloutApplicability === "NOT_REQUIRED" ? "NOT_REQUIRED" : envelope?.state ?? "MISSING";
    if (mixed) {
        if (request.rolloutApplicability !== "REQUIRED" || envelope === undefined) {
            indeterminate = true;
            state = "MISSING";
            reasons.push("MIXED_GENERATIONS_REQUIRE_EXPLICIT_ROLLOUT_AUTHORITY");
        }
        else {
            const authorityCurrent = envelope.authority.state === "CURRENT" && envelope.authority.basis === "EXPLICIT_GOVERNED_AUTHORITY";
            const bindingCurrent = envelope.projectId === request.projectId
                && envelope.subjectId === request.subjectId
                && envelope.scopeIdentity === request.scopeIdentity
                && envelope.environmentIdentity === request.environmentIdentity
                && envelope.targetIdentity === request.targetIdentity
                && envelope.sourceModelRevision <= model.canonicalState.modelRevision
                && envelope.targetRevisionIdentity === request.currentTargetRevisionIdentity
                && (request.causalBinding === "NOT_REQUIRED" || envelope.causalPositionIdentity === request.currentCausalPositionIdentity)
                && request.requiredVariantIdentities.every((variant) => envelope.variantIdentities.includes(variant));
            if (!authorityCurrent || !bindingCurrent) {
                indeterminate = true;
                reasons.push("ROLLOUT_AUTHORITY_UNAVAILABLE_OR_BOUNDARY_MISMATCH");
            }
            else if (envelope.state === "ACCEPTED") {
                const residual = generations.filter((generation) => !envelope.allowedGenerationIdentities.includes(generation));
                if (residual.length > 0) {
                    desynchronized = true;
                    reasons.push("ACTIVE_GENERATION_OUTSIDE_ACCEPTED_ROLLOUT_ENVELOPE");
                }
                else {
                    acceptedEnvelope = true;
                    reasons.push("MIXED_GENERATIONS_INSIDE_ACCEPTED_BOUNDED_ROLLOUT_ENVELOPE");
                }
            }
            else if (envelope.state === "EXPIRED" || envelope.state === "UNAUTHORIZED") {
                desynchronized = true;
                reasons.push(envelope.state === "EXPIRED" ? "EXPIRED_ROLLOUT_RESIDUE_OBSERVED" : "UNAUTHORIZED_MIXED_RUNTIME_STATE_OBSERVED");
            }
            else {
                indeterminate = true;
                reasons.push("ROLLOUT_AUTHORITY_NOT_CURRENTLY_DECISIVE");
            }
        }
    }
    return {
        result: {
            applicability: request.rolloutApplicability,
            state,
            mixedGenerations: mixed,
            activeGenerationIdentities: generations,
            acceptedEnvelope,
            envelopeId: envelope?.rolloutId ?? null,
        },
        desynchronized,
        indeterminate,
        reasons,
    };
}
/**
 * Derives bounded organism identity, observer composition, runtime realization, and territory relation.
 * It never writes canonical state, executes a target, calls a provider, or claims unobserved territory.
 */
function deriveG14OrganismFederatedObservation(input) {
    if (input === null || typeof input !== "object")
        throw new Error("HITO G14 requires a structured derivation input");
    assertExactKeys(input, INPUT_KEYS, "HITO G14 derivation input");
    (0, contracts_1.assertValidModel)(input.model);
    const before = (0, contracts_1.canonicalize)(input);
    const request = normalizeRequest(input.request);
    const normalizedBoundedClaimKey = normalizeClaimKey(request.claimKey, "request.claimKey");
    const reasonCodes = validatePredecessorAuthorities(input);
    if (request.projectId !== input.model.project.projectId)
        reasonCodes.push("REQUEST_PROJECT_CANONICAL_BINDING_MISMATCH");
    if (!canonicalSubjectExists(input.model, request.subjectId))
        reasonCodes.push("REQUEST_SUBJECT_CANONICAL_BINDING_MISMATCH");
    const organismIdentity = deriveOrganismIdentity(input.model, request);
    const runtimeRealizations = deriveRuntimeRealizations(input.model, request, organismIdentity);
    const territoryMembership = deriveMembership(input.model, request, runtimeRealizations, input.g8Successor.semanticRealityIdentity);
    if (territoryMembership.membershipState === "INDETERMINATE")
        reasonCodes.push("TERRITORY_MEMBERSHIP_AUTHORITY_INDETERMINATE");
    if ((request.territorySubject.class === "EXTERNAL_DEPENDENCY" || request.territorySubject.class === "EXTERNAL_TERRITORY") && territoryMembership.organismMember)
        reasonCodes.push("EXTERNAL_TERRITORY_ILLEGALLY_PROMOTED_TO_ORGANISM_MEMBER");
    const variantResults = request.requiredVariantIdentities.map((variant) => assessVariant(input, request, normalizedBoundedClaimKey, variant));
    const variants = variantResults.map((item) => item.assessment).sort((left, right) => (0, semantic_canonicalization_1.compareSemanticCodePoints)(left.variantIdentity, right.variantIdentity));
    const observations = (0, semantic_canonicalization_1.canonicalSemanticSet)(variantResults.flatMap((item) => item.facts));
    const relevantIds = new Set(observations.map((fact) => fact.factId));
    const ignoredUnrelatedFactIds = (0, semantic_canonicalization_1.canonicalSemanticStringSet)(request.observations.filter((fact) => !relevantIds.has(fact.factId)).map((fact) => fact.factId), "ignoredUnrelatedFactIds");
    const establishedVariantIdentities = variants.filter((item) => item.state === "ALIGNED").map((item) => item.variantIdentity);
    const unobservedVariantIdentities = variants.filter((item) => item.coverageState !== "BOUND_COMPLETE").map((item) => item.variantIdentity);
    const coverageState = unobservedVariantIdentities.length === 0
        ? "BOUND_COMPLETE"
        : establishedVariantIdentities.length === 0 && variants.every((item) => item.coverageState === "UNOBSERVED")
            ? "UNOBSERVED"
            : variants.some((item) => item.coverageState === "PARTIAL")
                ? "PARTIAL"
                : "UNKNOWN";
    const relevantUnresolvedIndirectionIds = (0, semantic_canonicalization_1.canonicalSemanticStringSet)(request.dynamicIndirections.filter((entry) => entry.state === "UNRESOLVED"
        && entry.projectId === request.projectId
        && entry.subjectId === request.subjectId
        && entry.scopeIdentity === request.scopeIdentity
        && entry.environmentIdentity === request.environmentIdentity
        && entry.targetIdentity === request.targetIdentity
        && request.requiredVariantIdentities.includes(entry.variantIdentity)).map((entry) => entry.indirectionId), "dynamicUncertainty.relevantUnresolvedIndirectionIds");
    const rollout = rolloutAssessment(input.model, request, runtimeRealizations);
    reasonCodes.push(...rollout.reasons);
    const relevantRealizations = runtimeRealizations.filter((item) => request.requiredVariantIdentities.includes(item.variantIdentity));
    const activeAuthoritativeRealizations = relevantRealizations.filter((item) => item.active && item.authorityApplicable);
    let realizationDesynchronized = false;
    let realizationIndeterminate = false;
    if (request.runtimeRealizationApplicability === "REQUIRED") {
        if (activeAuthoritativeRealizations.length === 0) {
            realizationIndeterminate = true;
            reasonCodes.push("REQUIRED_RUNTIME_REALIZATION_UNOBSERVED");
        }
        if (activeAuthoritativeRealizations.some((item) => item.bindingState === "UNBOUND" && item.semanticLegitimacy === "UNAUTHORIZED")) {
            realizationDesynchronized = true;
            reasonCodes.push("AUTHORITATIVE_UNBOUND_UNAUTHORIZED_RUNTIME_REALIZATION_OBSERVED");
        }
        if (activeAuthoritativeRealizations.some((item) => item.bindingState !== "BOUND" && item.semanticLegitimacy !== "UNAUTHORIZED")) {
            realizationIndeterminate = true;
            reasonCodes.push("RUNTIME_REALIZATION_BINDING_INDETERMINATE");
        }
        if (activeAuthoritativeRealizations.some((item) => item.bindingState === "BOUND" && item.semanticLegitimacy === "UNKNOWN")) {
            realizationIndeterminate = true;
            reasonCodes.push("RUNTIME_REALIZATION_SEMANTIC_LEGITIMACY_UNKNOWN");
        }
        if (activeAuthoritativeRealizations.some((item) => item.bindingState === "BOUND" && item.semanticLegitimacy === "UNAUTHORIZED")) {
            realizationDesynchronized = true;
            reasonCodes.push("UNAUTHORIZED_RUNTIME_REALIZATION_OBSERVED");
        }
    }
    if (relevantUnresolvedIndirectionIds.length > 0)
        reasonCodes.push("UNRESOLVED_DYNAMIC_INDIRECTION_NARROWS_COVERAGE");
    const sourceMismatch = reasonCodes.some((code) => code.endsWith("AUTHORITY_MISMATCH") || code.includes("CANONICAL_BINDING_MISMATCH") || code === "TERRITORY_MEMBERSHIP_AUTHORITY_INDETERMINATE");
    const variantDesynchronized = variants.some((item) => item.state === "DESYNCHRONIZED");
    const variantIndeterminate = variants.some((item) => item.state === "INDETERMINATE");
    let territoryRelation;
    if (sourceMismatch)
        territoryRelation = "INDETERMINATE";
    else if (request.applicability === "NOT_APPLICABLE")
        territoryRelation = "NOT_APPLICABLE";
    else if (variantDesynchronized || realizationDesynchronized || rollout.desynchronized)
        territoryRelation = "DESYNCHRONIZED";
    else if (variantIndeterminate || realizationIndeterminate || rollout.indeterminate || relevantUnresolvedIndirectionIds.length > 0 || coverageState !== "BOUND_COMPLETE")
        territoryRelation = "INDETERMINATE";
    else
        territoryRelation = "ALIGNED";
    if (territoryRelation === "ALIGNED")
        reasonCodes.push("BOUNDED_GOVERNED_AND_OBSERVED_TERRITORY_ALIGNED");
    else if (territoryRelation === "DESYNCHRONIZED")
        reasonCodes.push("BOUNDED_AUTHORITATIVE_PHYSICAL_DIVERGENCE_ESTABLISHED_WITHOUT_LEGITIMIZING_IT");
    else if (territoryRelation === "INDETERMINATE")
        reasonCodes.push("BOUNDED_OBSERVATION_AUTHORITY_OR_COVERAGE_INSUFFICIENT");
    else
        reasonCodes.push("BOUNDED_TERRITORY_ASSESSMENT_EXPLICITLY_NOT_APPLICABLE");
    const sources = {
        canonicalModelRevision: input.model.canonicalState.modelRevision,
        canonicalModelIntegrityHash: input.model.canonicalState.integrity.modelHash,
        semanticRealityIdentity: input.g8Successor.semanticRealityIdentity,
        g9AssessmentId: input.g9?.assessmentId ?? null,
        g10ProjectionId: input.g10.projectionId,
        g11AssessmentId: input.g11?.assessmentId ?? null,
        g12AssessmentId: input.g12.assessmentId,
        g13AssessmentId: input.g13?.assessmentId ?? null,
    };
    const normalizedReasons = (0, semantic_canonicalization_1.canonicalSemanticStringSet)(reasonCodes, "reasonCodes");
    const projectionId = `hito_g14_observation_${(0, semantic_canonicalization_1.sha256LengthPrefixedFrames)([
        { label: "ruleset", value: exports.G14_ORGANISM_FEDERATED_OBSERVATION_RULESET_VERSION },
        { label: "organism", value: organismIdentity },
        { label: "bounded-request", value: request },
        { label: "sources", value: sources },
        { label: "territory-membership", value: territoryMembership },
        { label: "observations", value: observations },
        { label: "variants", value: variants },
        { label: "runtime-realizations", value: runtimeRealizations },
        { label: "rollout", value: rollout.result },
        { label: "dynamic-uncertainty", value: relevantUnresolvedIndirectionIds },
        { label: "assessment", value: { territoryRelation, reasonCodes: normalizedReasons } },
    ])}`;
    const result = {
        kind: "HITO_G14_ORGANISM_IDENTITY_FEDERATED_OBSERVATION_PROJECTION",
        rulesetVersion: exports.G14_ORGANISM_FEDERATED_OBSERVATION_RULESET_VERSION,
        authority: exports.G14_ORGANISM_FEDERATED_OBSERVATION_AUTHORITY,
        projectionId,
        territoryRelation,
        normalizedBoundedClaimKey,
        organismIdentity,
        territoryMembership,
        observations,
        ignoredUnrelatedFactIds,
        variants,
        observationCoverage: {
            requiredVariantIdentities: request.requiredVariantIdentities,
            establishedVariantIdentities: (0, semantic_canonicalization_1.canonicalSemanticStringSet)(establishedVariantIdentities, "observationCoverage.establishedVariantIdentities"),
            unobservedVariantIdentities: (0, semantic_canonicalization_1.canonicalSemanticStringSet)(unobservedVariantIdentities, "observationCoverage.unobservedVariantIdentities"),
            state: coverageState,
            boundedClaimOnly: true,
            fullTerritoryClaimed: false,
            configurationSpaceExhaustiveRequired: false,
        },
        runtimeRealizations,
        rollout: rollout.result,
        dynamicUncertainty: {
            relevantUnresolvedIndirectionIds,
            fabricatedEdgeCount: 0,
            completeIsolationClaimed: false,
        },
        sources,
        reasonCodes: normalizedReasons,
        governanceBoundary: {
            derivedOnly: true,
            canonicalAuthority: false,
            physicalOccurrenceProvesSemanticLegitimacy: false,
            semanticLegitimacyGranted: false,
            observationOnly: true,
            targetExecuted: false,
            universalFederation: false,
            cloudControlPlaneAuthority: false,
        },
        zeroEffectCounters: zeroEffects(),
        truthBoundary: "G14 composes typed, bounded, authority-bearing observations around derived organism identity. It never creates a scalar physical truth, canonical organism state, membership by occurrence, deployment authority, or execution effect.",
        limitations: [
            "Observation coverage is bounded to the explicit project, subject, claim key, scope, environment, target, and variants",
            "Unobserved external territory remains unobserved",
            "Runtime instances remain ephemeral realizations of persistent capability and runtime-home identity",
            "Physical occurrence does not confer semantic legitimacy",
            "Unresolved dynamic indirection prevents complete isolation or coverage claims without fabricating edges",
            "No universal federation, cloud synchronization, deployment enforcement, target execution, canonical write, provider call, network call, or namespace migration",
            "No G15 or later authority",
        ],
    };
    if ((0, contracts_1.canonicalize)(input) !== before)
        throw new Error("HITO G14 derivation mutated caller input");
    return result;
}
