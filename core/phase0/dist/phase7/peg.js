"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PROTECTED_APPLICABILITY_BASIS_CODES = exports.INFORMATION_AUTHORITY_REASON_CODES = exports.FRESHNESS_REASON_CODES = exports.OPERATIONAL_REASON_CODES = exports.SEMANTIC_REASON_CODES = exports.OPERATIONAL_FACT_KINDS = exports.PHASE7_AUTHORITY = exports.PHASE7_CONTRACT_VERSION = exports.PHASE7_RULESET_VERSION = void 0;
exports.proposalIdentity = proposalIdentity;
exports.observationRecordContentIdentity = observationRecordContentIdentity;
exports.observationSetIdentity = observationSetIdentity;
exports.diagnosticSetIdentity = diagnosticSetIdentity;
exports.isClosedFactValue = isClosedFactValue;
exports.assessPhase7PreEffect = assessPhase7PreEffect;
exports.__testOnlyDeriveProtectedAuthorityApplicability = __testOnlyDeriveProtectedAuthorityApplicability;
exports.verifyPhase7AssessmentOutput = verifyPhase7AssessmentOutput;
/**
 * HITO Phase 7 PEG Repair 1 — bounded, local, derived, read-only, advisory,
 * non-executing, non-mutating assessment. Readiness requirements are HITO-owned
 * policy; observations are supplied bounded facts; callers identify action only.
 */
const contracts_1 = require("../contracts");
const decision_engine_1 = require("../phase4/decision-engine");
const reality_judge_1 = require("../phase5/reality-judge");
exports.PHASE7_RULESET_VERSION = "hito-phase7-pre-effect-assessment-v1-repair5";
exports.PHASE7_CONTRACT_VERSION = "1.2.0";
exports.PHASE7_AUTHORITY = "DERIVED / READ_ONLY / ADVISORY / NON_EXECUTING / NON_MUTATING";
exports.OPERATIONAL_FACT_KINDS = ["REPOSITORY_BINDING", "CWD_BINDING", "PATH_CONTAINMENT", "SYMLINK_CONTAINMENT", "PROTECTED_WORKTREE_STATE", "TOOLCHAIN_AVAILABILITY", "EXECUTABLE_AVAILABILITY", "SERVICE_AVAILABILITY", "PORT_AVAILABILITY", "PERMISSION_SUFFICIENCY"];
exports.SEMANTIC_REASON_CODES = ["SEM_ALREADY_SATISFIED", "SEM_DUPLICATE_CAPABILITY", "SEM_OWNER_MISMATCH", "SEM_RUNTIME_HOME_MISMATCH", "SEM_DO_NOT_TOUCH_CONFLICT", "SEM_PHASE4_ACTION_INCOMPATIBLE", "SEM_DECLARED_INTENT_CONTRADICTION", "SEM_CONTINUITY_CONTRADICTION", "SEM_UNSUPPORTED_COMPLETION_INTENT"];
exports.OPERATIONAL_REASON_CODES = ["OPS_REPOSITORY_MISMATCH", "OPS_CWD_MISMATCH", "OPS_EXECUTABLE_UNAVAILABLE", "OPS_TOOLCHAIN_UNAVAILABLE", "OPS_PROTECTED_DIRTY_STATE", "OPS_SERVICE_UNAVAILABLE", "OPS_PORT_UNAVAILABLE", "OPS_PERMISSION_INSUFFICIENT", "OPS_PATH_ESCAPE", "OPS_SYMLINK_ESCAPE"];
exports.FRESHNESS_REASON_CODES = ["FRESH_PHASE4_STALE", "FRESH_PHASE5_STALE", "FRESH_OBSERVATION_STALE"];
exports.INFORMATION_AUTHORITY_REASON_CODES = ["AUTH_PHASE4_MISMATCH", "AUTH_PHASE5_MISMATCH", "AUTH_CROSS_PROJECT_MIX", "AUTH_RULESET_MISMATCH", "AUTH_RULESET_DOWNGRADE", "PHASE4_NOT_APPLICABLE", "PHASE4_APPLICABILITY_UNKNOWN", "PHASE5_NOT_APPLICABLE", "PHASE5_APPLICABILITY_UNKNOWN", "OBSERVATION_UNAVAILABLE", "OBSERVATION_UNKNOWN", "INPUT_UNTRUSTED_CONTENT", "INPUT_MALFORMED", "INFO_INSUFFICIENT", "DIAGNOSTIC_REJECTED", "DIAGNOSTIC_SPOOFED", "OUTPUT_TAMPERED"];
exports.PROTECTED_APPLICABILITY_BASIS_CODES = ["CAPABILITY_PROTECTED_EXACT", "RUNTIME_HOME_PROTECTED_EXACT", "CAPABILITY_EXPLICITLY_UNAFFECTED", "PATH_APPLICABILITY_UNREPRESENTABLE", "OWNER_APPLICABILITY_UNREPRESENTABLE", "NO_EXPLICIT_NEGATIVE_AUTHORITY", "AUTHORITY_CONFLICT", "NO_TARGET_ANCHOR", "MALFORMED_PROTECTED_AUTHORITY_IDENTIFIER"];
const sortUnique = (items) => [...new Set(items)].sort((a, b) => a.localeCompare(b));
const hash = (value) => (0, contracts_1.sha256Text)((0, contracts_1.canonicalize)(value));
const normalizedText = (value) => value.normalize("NFC").replaceAll("\r\n", "\n").trim();
const zeroEffects = () => ({ canonicalModelMutation: false, governedTargetSourceMutation: false, targetExecutionCount: 0, environmentWriteCount: 0, providerModelCallCount: 0, unauthorizedNetworkCallCount: 0, humanCommitmentImplied: false, executionPermissionImplied: false });
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
function normalizeRelativePath(value) {
    const normalized = normalizedText(value).replaceAll("\\", "/").replace(/\/+/g, "/").replace(/^(\.\/)+/, "");
    if (!normalized || normalized.startsWith("/") || normalized.startsWith("//") || /^[A-Za-z]:/.test(normalized) || normalized.split("/").some((segment) => segment === ".." || segment.length === 0))
        return undefined;
    return normalized;
}
function normalizeCwd(value) {
    const normalized = normalizedText(value).replaceAll("\\", "/").replace(/\/+/g, "/").replace(/^(\.\/)+/, "") || ".";
    if (normalized.startsWith("/") || normalized.startsWith("//") || /^[A-Za-z]:/.test(normalized) || normalized.split("/").some((segment) => segment === ".."))
        return undefined;
    return normalized;
}
function normalizeExecutable(value) {
    const normalized = normalizedText(value);
    if (!/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(normalized) || /\.\.|\s|['"`;|&$><*?]/.test(normalized) || normalized.startsWith("/") || normalized.startsWith("//") || /^[A-Za-z]:/.test(normalized))
        return undefined;
    return normalized;
}
function normalizedIdentifier(value) { return typeof value === "string" && normalizedText(value) === value && /^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(value); }
function normalizedScope(value) { return typeof value === "string" && normalizeRelativePath(value) === value; }
function exactKeys(value, allowed) { return Object.keys(value).every((key) => allowed.includes(key)) && allowed.every((key) => own(value, key)); }
function normalizedIdentifierSet(values) { return values.every(normalizedIdentifier) ? sortUnique(values) : undefined; }
function unsupportedStructuredPolicy(value) {
    if (!value || typeof value !== "object" || Array.isArray(value))
        return false;
    const forbidden = /^(requiredObservationKeys|requiredFacts|requiredChecks|expectedValue|expectedState|expectedPredicate|readinessPolicy|policyOverride|forceReady)$/i;
    return Object.keys(value).some((key) => forbidden.test(key));
}
function currentRuntimeHome(model, capabilityId) {
    return model.runtimeHomes.filter((home) => home.capabilityId === capabilityId && home.effectiveFromRevision <= model.canonicalState.modelRevision && (home.effectiveToRevision === undefined || home.effectiveToRevision > model.canonicalState.modelRevision)).sort((a, b) => a.runtimeHomeId.localeCompare(b.runtimeHomeId))[0]?.runtimeHomeId;
}
function proposalValidation(proposal) {
    if (proposal.subject !== "ONE_BOUNDED_PROPOSED_ACTION" || !normalizedText(proposal.objective) || !proposal.targetScope || !Array.isArray(proposal.references))
        return { valid: false, paths: [], reason: "INPUT_MALFORMED" };
    if (["MOVE", "REPLACE", "DELETE", "RECOVER", "MIGRATE", "OTHER_BOUNDED"].includes(proposal.effectClass) || unsupportedStructuredPolicy(proposal.targetScope))
        return { valid: false, paths: [], reason: "INPUT_MALFORMED" };
    if ([proposal.targetScope.capabilityId, proposal.targetScope.ownerSubsystemId, proposal.targetScope.runtimeHomeId, proposal.targetScope.promiseId, proposal.targetScope.repositoryIdentity].some((identifier) => identifier !== undefined && !normalizedIdentifier(identifier)))
        return { valid: false, paths: [], reason: "INPUT_MALFORMED" };
    const paths = (proposal.targetScope.paths ?? []).map(normalizeRelativePath);
    if (paths.some((path) => path === undefined))
        return { valid: false, paths: [], reason: "INPUT_MALFORMED" };
    let command;
    if (proposal.targetScope.command !== undefined) {
        if (!["VERIFY", "EXECUTE_COMMAND"].includes(proposal.effectClass))
            return { valid: false, paths: [], reason: "INPUT_MALFORMED" };
        const executable = normalizeExecutable(proposal.targetScope.command);
        if (!executable)
            return { valid: false, paths: [], reason: "INPUT_MALFORMED" };
        command = { kind: "NORMALIZED_COMMAND_SUBJECT", executable, pathSubjects: sortUnique(paths.filter((path) => path !== undefined)), cwdDependence: proposal.effectClass === "EXECUTE_COMMAND" ? "REQUIRED" : "NOT_REQUIRED", sourceKind: "STRUCTURED_COMMAND_REFERENCE" };
    }
    if (proposal.targetScope.cwd !== undefined && normalizeCwd(proposal.targetScope.cwd) === undefined)
        return { valid: false, paths: [], reason: "INPUT_MALFORMED" };
    return { valid: true, paths: sortUnique(paths.filter((path) => path !== undefined)), command };
}
function proposalIdentity(proposal) {
    const validation = proposalValidation(proposal);
    if (!validation.valid)
        throw new Error("INPUT_MALFORMED: no valid proposal identity");
    return `proposal_${hash({ subject: proposal.subject, objective: normalizedText(proposal.objective), effectClass: proposal.effectClass, targetScope: { capabilityId: proposal.targetScope.capabilityId ?? null, ownerSubsystemId: proposal.targetScope.ownerSubsystemId ?? null, runtimeHomeId: proposal.targetScope.runtimeHomeId ?? null, promiseId: proposal.targetScope.promiseId ?? null, repositoryIdentity: proposal.targetScope.repositoryIdentity ?? null, cwd: proposal.targetScope.cwd ? normalizeCwd(proposal.targetScope.cwd) : null, paths: validation.paths, command: validation.command ?? null }, references: sortUnique(proposal.references.map(normalizedText)), payload: proposal.payload, contractVersion: exports.PHASE7_CONTRACT_VERSION })}`;
}
function identityFactValue(value) {
    if (!value)
        return null;
    if (value.kind === "PROTECTED_WORKTREE_STATE") {
        const normalized = normalizedIdentifierSet(value.protectedAuthorityIds);
        return normalized ? { ...value, protectedAuthorityIds: normalized } : value;
    }
    return value;
}
function observationRecordContentIdentity(record, boundProposalIdentity) {
    return `observation_${hash({ proposalIdentity: boundProposalIdentity, observationKey: record.observationKey, normalizedValue: identityFactValue(record.normalizedValue), observationProvenance: record.observationProvenance, collectionOutcome: record.collectionOutcome, repositoryIdentity: record.repositoryIdentity ?? null, repositoryRoot: record.repositoryRoot ?? null, cwd: record.cwd ? normalizeCwd(record.cwd) : null, boundedScope: record.boundedScope, collectorIdentity: record.collectorIdentity, sourceIdentity: record.sourceIdentity, permissionBasis: record.permissionBasis, limitations: sortUnique(record.limitations ?? []), contractVersion: exports.PHASE7_CONTRACT_VERSION })}`;
}
function observationSetIdentity(proposal, observations, boundProposalIdentity) {
    const proposalId = boundProposalIdentity ?? proposalIdentity(proposal);
    const records = observations.map((record) => ({ identity: observationRecordContentIdentity(record, proposalId), key: record.observationKey, collectorSource: `${record.collectorIdentity}:${record.sourceIdentity}`, permission: record.permissionBasis })).sort((a, b) => a.identity.localeCompare(b.identity));
    return `observation_set_${hash({ proposalIdentity: proposalId, recordContentIdentities: sortUnique(records.map((record) => record.identity)), materialBindingKeys: sortUnique(records.map((record) => record.key)), collectorSourceBindings: sortUnique(records.map((record) => record.collectorSource)), permissionBindings: sortUnique(records.map((record) => record.permission)), contractVersion: exports.PHASE7_CONTRACT_VERSION })}`;
}
function diagnosticSetIdentity(input) {
    if (!input)
        return "ABSENT";
    return `diagnostic_${hash({ collectorIdentity: input.collectorIdentity, sourceKind: input.sourceKind, boundedScope: input.boundedScope, records: [...input.records].sort((a, b) => (0, contracts_1.canonicalize)(a).localeCompare((0, contracts_1.canonicalize)(b))), observationProvenance: input.observationProvenance, collectionOutcome: input.collectionOutcome, observationFreshness: input.observationFreshness, permissionBasis: input.permissionBasis, limitations: sortUnique(input.limitations ?? []), rejected: input.rejected === true, spoofed: input.spoofed === true, contractVersion: exports.PHASE7_CONTRACT_VERSION })}`;
}
function phase4Adapter(model, supplied, proposalCapabilityId) {
    if (supplied.kind !== "HITO_PHASE4_DECISION_REPORT" || supplied.source.derivedOutput.rulesetVersion !== decision_engine_1.PHASE4_RULESET_VERSION) {
        const reason = /(?:v0|legacy|downgrade)/i.test(supplied.source.derivedOutput.rulesetVersion) ? "AUTH_RULESET_DOWNGRADE" : "AUTH_RULESET_MISMATCH";
        return { state: "AUTHORITY_MISMATCH", information: ["AUTH_PHASE4_MISMATCH", reason], freshness: [] };
    }
    const staleness = (0, contracts_1.evaluateStaleness)(supplied.source.derivedOutput, (0, contracts_1.derivedOutputInputsFromModel)(model, decision_engine_1.PHASE4_RULESET_VERSION));
    if (staleness !== "FRESH" || supplied.source.modelRevision !== model.canonicalState.modelRevision || supplied.source.historySequence !== model.canonicalState.historyHead.sequence || supplied.source.evidenceSequence !== model.canonicalState.evidenceHead.sequence)
        return { state: "STALE_PHASE4_AUTHORITY", information: [], freshness: ["FRESH_PHASE4_STALE"] };
    if ((0, contracts_1.canonicalize)((0, decision_engine_1.derivePhase4Decision)(model, supplied.request)) !== (0, contracts_1.canonicalize)(supplied))
        return { state: "AUTHORITY_MISMATCH", information: ["AUTH_PHASE4_MISMATCH"], freshness: [] };
    if (supplied.reconciliation.state === "NOT_FOUND")
        return { state: "NOT_APPLICABLE", information: ["PHASE4_NOT_APPLICABLE"], freshness: [] };
    if (supplied.reconciliation.state === "UNKNOWN")
        return { state: "UNKNOWN", information: ["PHASE4_APPLICABILITY_UNKNOWN"], freshness: [] };
    if (proposalCapabilityId !== undefined && ![...supplied.reconciliation.candidateCapabilityIds, ...supplied.reconciliation.relatedCapabilityIds].includes(proposalCapabilityId))
        return { state: "NOT_APPLICABLE", information: ["PHASE4_NOT_APPLICABLE"], freshness: [] };
    return { state: "AUTHENTICATED_APPLICABLE_PHASE4", information: [], freshness: [] };
}
function phase5Adapter(model, phase4, input, proposalCapabilityId) {
    if (input.state === "NO_APPLICABLE_PHASE5_JUDGMENT")
        return { state: input.state, information: ["PHASE5_NOT_APPLICABLE"], freshness: [] };
    if (input.state === "UNKNOWN_PHASE5_APPLICABILITY")
        return { state: input.state, information: ["PHASE5_APPLICABILITY_UNKNOWN"], freshness: [] };
    if (input.state === "STALE_PHASE5_AUTHORITY")
        return { state: input.state, information: [], freshness: ["FRESH_PHASE5_STALE"] };
    if (!input.request || !input.result || input.result.kind !== "HITO_PHASE5_REALITY_JUDGE_RESULT" || input.result.rulesetVersion !== reality_judge_1.PHASE5_RULESET_VERSION || input.result.derivedOutput.rulesetVersion !== reality_judge_1.PHASE5_RULESET_VERSION)
        return { state: "AUTHORITY_MISMATCH", information: ["AUTH_PHASE5_MISMATCH", "AUTH_RULESET_MISMATCH"], freshness: [] };
    if ((0, reality_judge_1.evaluatePhase5JudgeStaleness)(input.result, model) !== "FRESH" || input.result.sourceModelRevision !== model.canonicalState.modelRevision || input.result.sourceHistoryHead.sequence !== model.canonicalState.historyHead.sequence || input.result.sourceEvidenceHead.sequence !== model.canonicalState.evidenceHead.sequence)
        return { state: "STALE_PHASE5_AUTHORITY", information: [], freshness: ["FRESH_PHASE5_STALE"] };
    if ((0, contracts_1.canonicalize)((0, reality_judge_1.derivePhase5RealityJudge)(model, input.request, phase4)) !== (0, contracts_1.canonicalize)(input.result) || (proposalCapabilityId !== undefined && (input.request.subjectId !== proposalCapabilityId || input.result.subject.id !== proposalCapabilityId)))
        return { state: "AUTHORITY_MISMATCH", information: ["AUTH_PHASE5_MISMATCH"], freshness: [] };
    return { state: "APPLICABLE_AUTHENTICATED_PHASE5_JUDGMENT", information: [], freshness: [], result: input.result };
}
function derivedCurrent(record, records, seen = new Set()) {
    if (seen.has(record.observationKey))
        return false;
    if (record.observationProvenance === "DIRECT")
        return record.collectionOutcome === "OBSERVED" && record.observationFreshness === "CURRENT" && record.presentEquivalenceVerified === true;
    if (record.observationProvenance !== "DERIVED" || record.collectionOutcome !== "OBSERVED" || record.observationFreshness !== "CURRENT")
        return false;
    const next = new Set(seen);
    next.add(record.observationKey);
    return (record.dependencyKeys ?? []).length > 0 && (record.dependencyKeys ?? []).every((key) => {
        const dependencies = records.get(key) ?? [];
        return dependencies.length > 0 && dependencies.every((dependency) => derivedCurrent(dependency, records, next));
    });
}
function hasSensitiveKey(value) {
    if (typeof value === "string")
        return /credential|private.?key|token|browser.?history|secret/i.test(value);
    if (Array.isArray(value))
        return value.some(hasSensitiveKey);
    if (value && typeof value === "object")
        return Object.entries(value).some(([key, nested]) => hasSensitiveKey(key) || hasSensitiveKey(nested));
    return false;
}
function untrustedInstructionLikeContent(value) {
    if (typeof value === "string")
        return /ignore\s+hito|you are authorized|delete this|this is canonical|run this command|authorized to commit/i.test(value);
    if (Array.isArray(value))
        return value.some(untrustedInstructionLikeContent);
    if (value && typeof value === "object")
        return Object.values(value).some(untrustedInstructionLikeContent);
    return false;
}
function actionContext(model, proposal) {
    const capabilityId = proposal.targetScope.capabilityId;
    if (!capabilityId || !model.capabilities.some((capability) => capability.capabilityId === capabilityId))
        return undefined;
    return { repositoryIdentity: model.project.projectId, repositoryRoot: ".", cwd: ".", capabilityId, cwdRequired: proposal.effectClass === "EXECUTE_COMMAND" };
}
function operationFor(effect) {
    return { CREATE: "CREATE_PATH", MODIFY: "MODIFY_PATH", CONFIGURE: "CONFIGURE_SCOPE", CONNECT: "CONNECT_TARGET", DISCONNECT: "DISCONNECT_TARGET", VERIFY: "VERIFY_SUBJECT", EXECUTE_COMMAND: "EXECUTE_COMMAND_ATTEMPT" }[effect];
}
function hasUsableTargetAnchor(proposal, paths) {
    return proposal.targetScope.capabilityId !== undefined || proposal.targetScope.runtimeHomeId !== undefined || proposal.targetScope.ownerSubsystemId !== undefined || paths.length > 0;
}
function deriveProtectedAuthorityApplicabilityInternal(authority, proposal, validation) {
    const boundary = authority.phase4.proposal.doNotTouch;
    const consumedLists = [boundary.protectedCapabilityIds, boundary.unaffectedCapabilityIds, boundary.currentRuntimeHomeIds, boundary.stateAuthorities, boundary.eventAuthorities, boundary.persistenceAuthorities, boundary.evidenceAuthorityIds];
    if (consumedLists.some((list) => normalizedIdentifierSet(list) === undefined))
        return { state: "UNKNOWN", matchedScopeBasis: ["MALFORMED_PROTECTED_AUTHORITY_IDENTIFIER"], expectedProtectedAuthorityIds: [] };
    const protectedCapabilities = new Set(boundary.protectedCapabilityIds);
    const unaffectedCapabilities = new Set(boundary.unaffectedCapabilityIds);
    const currentHomes = new Set(boundary.currentRuntimeHomeIds);
    const capabilityId = proposal.targetScope.capabilityId;
    const runtimeHomeId = proposal.targetScope.runtimeHomeId;
    const globalAuthorityConflict = [...protectedCapabilities].some((id) => unaffectedCapabilities.has(id));
    if (globalAuthorityConflict)
        return { state: "UNKNOWN", matchedScopeBasis: ["AUTHORITY_CONFLICT"], expectedProtectedAuthorityIds: [] };
    const basis = [];
    if (capabilityId && protectedCapabilities.has(capabilityId))
        basis.push("CAPABILITY_PROTECTED_EXACT");
    if (runtimeHomeId && currentHomes.has(runtimeHomeId))
        basis.push("RUNTIME_HOME_PROTECTED_EXACT");
    if (basis.length > 0)
        return { state: "APPLIES", matchedScopeBasis: sortUnique(basis), expectedProtectedAuthorityIds: sortUnique([...boundary.protectedCapabilityIds, ...boundary.currentRuntimeHomeIds, ...boundary.stateAuthorities, ...boundary.eventAuthorities, ...boundary.persistenceAuthorities, ...boundary.evidenceAuthorityIds]) };
    if (!hasUsableTargetAnchor(proposal, validation.paths))
        return { state: "UNKNOWN", matchedScopeBasis: ["NO_TARGET_ANCHOR"], expectedProtectedAuthorityIds: [] };
    if (proposal.targetScope.ownerSubsystemId !== undefined)
        return { state: "UNKNOWN", matchedScopeBasis: ["OWNER_APPLICABILITY_UNREPRESENTABLE"], expectedProtectedAuthorityIds: [] };
    if (validation.paths.length > 0)
        return { state: "UNKNOWN", matchedScopeBasis: ["PATH_APPLICABILITY_UNREPRESENTABLE"], expectedProtectedAuthorityIds: [] };
    if (runtimeHomeId !== undefined && !currentHomes.has(runtimeHomeId))
        return { state: "UNKNOWN", matchedScopeBasis: ["NO_EXPLICIT_NEGATIVE_AUTHORITY"], expectedProtectedAuthorityIds: [] };
    if (capabilityId && unaffectedCapabilities.has(capabilityId))
        return { state: "DOES_NOT_APPLY", matchedScopeBasis: ["CAPABILITY_EXPLICITLY_UNAFFECTED"], expectedProtectedAuthorityIds: [] };
    return { state: "UNKNOWN", matchedScopeBasis: ["NO_EXPLICIT_NEGATIVE_AUTHORITY"], expectedProtectedAuthorityIds: [] };
}
function wMaterial(effect) { return ["CREATE", "MODIFY", "CONFIGURE", "CONNECT", "DISCONNECT"].includes(effect); }
function deriveRequirements(model, proposal, validation, phase4State, authenticatedPhase4) {
    const context = actionContext(model, proposal);
    const operation = operationFor(proposal.effectClass);
    if (!operation || !validation.valid)
        return { requirements: [], sufficient: false, context };
    let protectedAuthorityApplicability;
    if (wMaterial(proposal.effectClass)) {
        if (!context || proposal.targetScope.repositoryIdentity !== context.repositoryIdentity)
            return { requirements: [], sufficient: false, context };
        if (phase4State !== "AUTHENTICATED_APPLICABLE_PHASE4" || !authenticatedPhase4)
            return { requirements: [], sufficient: false, context };
        protectedAuthorityApplicability = deriveProtectedAuthorityApplicabilityInternal({ phase4: authenticatedPhase4, authenticated: true }, proposal, validation);
    }
    if (!context)
        return { requirements: [], sufficient: false, context, protectedAuthorityApplicability };
    const requirements = [
        { id: "REPOSITORY_BINDING", kind: "REPOSITORY_BINDING", context },
        { id: `PERMISSION_SUFFICIENCY:${operation}`, kind: "PERMISSION_SUFFICIENCY", operation, scope: context.capabilityId, context },
    ];
    for (const path of validation.paths) {
        requirements.push({ id: `PATH_CONTAINMENT:${path}`, kind: "PATH_CONTAINMENT", path, context });
        requirements.push({ id: `SYMLINK_CONTAINMENT:${path}`, kind: "SYMLINK_CONTAINMENT", path, context });
    }
    if (wMaterial(proposal.effectClass)) {
        const w = protectedAuthorityApplicability;
        if (!w)
            return { requirements, sufficient: false, context };
        if (w.state === "APPLIES")
            requirements.push({ id: "PROTECTED_WORKTREE_STATE", kind: "PROTECTED_WORKTREE_STATE", expectedProtectedAuthorityIds: w.expectedProtectedAuthorityIds, context });
        if (w.state === "UNKNOWN")
            return { requirements, sufficient: false, context, protectedAuthorityApplicability: w };
    }
    if (validation.command) {
        requirements.push({ id: `EXECUTABLE_AVAILABILITY:${validation.command.executable}`, kind: "EXECUTABLE_AVAILABILITY", executable: validation.command.executable, context });
        if (context.cwdRequired && validation.command.cwdDependence === "REQUIRED")
            requirements.push({ id: "CWD_BINDING", kind: "CWD_BINDING", context });
    }
    return { requirements, sufficient: requirements.length > 0, context, protectedAuthorityApplicability };
}
function matchingObservations(requirement, observations, proposalId) {
    return observations.filter((record) => {
        const value = record.normalizedValue;
        if (!value || value.kind !== requirement.kind)
            return false;
        if (requirement.path && "path" in value && value.path !== requirement.path)
            return false;
        if (requirement.operation && value.kind === "PERMISSION_SUFFICIENCY" && (value.operation !== requirement.operation || value.scope !== requirement.scope))
            return false;
        if (requirement.executable && value.kind === "EXECUTABLE_AVAILABILITY" && value.executable !== requirement.executable)
            return false;
        return true;
    }).sort((a, b) => observationRecordContentIdentity(a, proposalId).localeCompare(observationRecordContentIdentity(b, proposalId)));
}
function isClosedFactValue(value) {
    if (!value || typeof value !== "object" || Array.isArray(value) || !own(value, "kind"))
        return false;
    const candidate = value;
    if (unsupportedStructuredPolicy(candidate))
        return false;
    switch (candidate.kind) {
        case "REPOSITORY_BINDING": return exactKeys(candidate, ["kind", "repositoryIdentity", "repositoryRoot"]) && normalizedIdentifier(candidate.repositoryIdentity) && typeof candidate.repositoryRoot === "string" && normalizeCwd(candidate.repositoryRoot) === candidate.repositoryRoot;
        case "CWD_BINDING": return exactKeys(candidate, ["kind", "cwd"]) && typeof candidate.cwd === "string" && normalizeCwd(candidate.cwd) === candidate.cwd;
        case "PATH_CONTAINMENT": return exactKeys(candidate, ["kind", "path", "containment"]) && typeof candidate.path === "string" && normalizeRelativePath(candidate.path) === candidate.path && (candidate.containment === "CONTAINED" || candidate.containment === "ESCAPES_ROOT");
        case "SYMLINK_CONTAINMENT": return exactKeys(candidate, ["kind", "path", "resolution"]) && typeof candidate.path === "string" && normalizeRelativePath(candidate.path) === candidate.path && (candidate.resolution === "CONTAINED" || candidate.resolution === "ESCAPES_ROOT" || candidate.resolution === "UNRESOLVED");
        case "PROTECTED_WORKTREE_STATE": return exactKeys(candidate, ["kind", "state", "protectedAuthorityIds"]) && (candidate.state === "CLEAN" || candidate.state === "DIRTY" || candidate.state === "PROTECTED_CONFLICT") && Array.isArray(candidate.protectedAuthorityIds) && candidate.protectedAuthorityIds.every(normalizedIdentifier);
        case "TOOLCHAIN_AVAILABILITY": return exactKeys(candidate, ["kind", "toolchainId", "state"]) && normalizedIdentifier(candidate.toolchainId) && (candidate.state === "AVAILABLE" || candidate.state === "UNAVAILABLE");
        case "EXECUTABLE_AVAILABILITY": return exactKeys(candidate, ["kind", "executable", "state"]) && typeof candidate.executable === "string" && normalizeExecutable(candidate.executable) === candidate.executable && (candidate.state === "AVAILABLE" || candidate.state === "UNAVAILABLE");
        case "SERVICE_AVAILABILITY": return exactKeys(candidate, ["kind", "serviceId", "state"]) && normalizedIdentifier(candidate.serviceId) && (candidate.state === "AVAILABLE" || candidate.state === "UNAVAILABLE");
        case "PORT_AVAILABILITY": return exactKeys(candidate, ["kind", "port", "state"]) && Number.isInteger(candidate.port) && candidate.port >= 1 && candidate.port <= 65535 && (candidate.state === "AVAILABLE" || candidate.state === "OCCUPIED" || candidate.state === "REACHABLE" || candidate.state === "UNREACHABLE");
        case "PERMISSION_SUFFICIENCY": return exactKeys(candidate, ["kind", "operation", "scope", "state"]) && ["CREATE_PATH", "MODIFY_PATH", "CONFIGURE_SCOPE", "CONNECT_TARGET", "DISCONNECT_TARGET", "VERIFY_SUBJECT", "EXECUTE_COMMAND_ATTEMPT"].includes(String(candidate.operation)) && normalizedScope(candidate.scope) && (candidate.state === "SUFFICIENT" || candidate.state === "INSUFFICIENT");
        default: return false;
    }
}
function coherentObservation(requirement, record, context, proposalId) {
    if (record.proposalIdentity !== proposalId || record.repositoryIdentity !== context.repositoryIdentity || record.repositoryRoot !== context.repositoryRoot || record.boundedScope !== context.capabilityId)
        return false;
    if (!normalizedIdentifier(record.collectorIdentity) || !normalizedIdentifier(record.sourceIdentity) || !normalizedIdentifier(record.permissionBasis))
        return false;
    if (requirement.kind === "CWD_BINDING" && record.cwd !== context.cwd)
        return false;
    return true;
}
function predicateFailure(requirement, record) {
    const value = record.normalizedValue;
    if (!value || !isClosedFactValue(value) || value.kind !== requirement.kind)
        return undefined;
    const context = requirement.context;
    if (!context)
        return undefined;
    switch (value.kind) {
        case "REPOSITORY_BINDING": return value.repositoryIdentity === context.repositoryIdentity && value.repositoryRoot === context.repositoryRoot ? undefined : "OPS_REPOSITORY_MISMATCH";
        case "CWD_BINDING": return value.cwd === context.cwd ? undefined : "OPS_CWD_MISMATCH";
        case "PATH_CONTAINMENT": return value.containment === "CONTAINED" ? undefined : "OPS_PATH_ESCAPE";
        case "SYMLINK_CONTAINMENT": return value.resolution === "CONTAINED" ? undefined : value.resolution === "ESCAPES_ROOT" ? "OPS_SYMLINK_ESCAPE" : undefined;
        case "PROTECTED_WORKTREE_STATE": {
            const expected = requirement.expectedProtectedAuthorityIds;
            const observed = normalizedIdentifierSet(value.protectedAuthorityIds);
            return value.state === "CLEAN" && expected !== undefined && observed !== undefined && (0, contracts_1.canonicalize)(observed) === (0, contracts_1.canonicalize)(expected) ? undefined : "OPS_PROTECTED_DIRTY_STATE";
        }
        case "TOOLCHAIN_AVAILABILITY": return value.state === "AVAILABLE" ? undefined : "OPS_TOOLCHAIN_UNAVAILABLE";
        case "EXECUTABLE_AVAILABILITY": return value.state === "AVAILABLE" ? undefined : "OPS_EXECUTABLE_UNAVAILABLE";
        case "SERVICE_AVAILABILITY": return value.state === "AVAILABLE" ? undefined : "OPS_SERVICE_UNAVAILABLE";
        case "PORT_AVAILABILITY": return ["AVAILABLE", "REACHABLE"].includes(value.state) ? undefined : "OPS_PORT_UNAVAILABLE";
        case "PERMISSION_SUFFICIENCY": return value.state === "SUFFICIENT" ? undefined : "OPS_PERMISSION_INSUFFICIENT";
    }
}
function assessPhase7PreEffect(input) {
    (0, contracts_1.assertValidModel)(input.model);
    const before = (0, contracts_1.canonicalize)(input.model);
    const validation = proposalValidation(input.proposal);
    const proposalId = validation.valid ? proposalIdentity(input.proposal) : `proposal_malformed_no_valid_identity_${hash({ subject: input.proposal.subject, effectClass: input.proposal.effectClass, objective: input.proposal.objective, contractVersion: exports.PHASE7_CONTRACT_VERSION })}`;
    const observationId = observationSetIdentity(input.proposal, input.observations, proposalId);
    const diagnosticId = diagnosticSetIdentity(input.diagnostics);
    const semantic = [];
    const operational = [];
    const freshness = [];
    const information = [];
    const limitations = ["Derived advisory assessment", "HITO-owned readiness policy", "No target execution", "No environment write", "No commitment or execution authority"];
    const phase4 = phase4Adapter(input.model, input.phase4, input.proposal.targetScope.capabilityId);
    const phase5 = phase5Adapter(input.model, input.phase4, input.phase5, input.proposal.targetScope.capabilityId);
    information.push(...phase4.information, ...phase5.information);
    freshness.push(...phase4.freshness, ...phase5.freshness);
    if (!validation.valid)
        information.push("INPUT_MALFORMED");
    if (input.observations.some((record) => unsupportedStructuredPolicy(record)))
        information.push("INPUT_MALFORMED");
    if (untrustedInstructionLikeContent(input.proposal.payload))
        information.push("INPUT_UNTRUSTED_CONTENT");
    if (input.proposal.targetScope.repositoryIdentity !== undefined && input.proposal.targetScope.repositoryIdentity !== input.model.project.projectId)
        information.push("AUTH_CROSS_PROJECT_MIX");
    if (hasSensitiveKey(input.diagnostics?.records ?? []))
        information.push("DIAGNOSTIC_REJECTED");
    if (input.diagnostics?.spoofed === true)
        information.push("DIAGNOSTIC_SPOOFED");
    if (input.diagnostics?.rejected === true)
        information.push("DIAGNOSTIC_REJECTED");
    const capability = input.proposal.targetScope.capabilityId ? input.model.capabilities.find((item) => item.capabilityId === input.proposal.targetScope.capabilityId) : undefined;
    if (capability) {
        if (input.proposal.targetScope.ownerSubsystemId && input.proposal.targetScope.ownerSubsystemId !== capability.owningSubsystemId)
            semantic.push("SEM_OWNER_MISMATCH");
        if (input.proposal.targetScope.runtimeHomeId && input.proposal.targetScope.runtimeHomeId !== currentRuntimeHome(input.model, capability.capabilityId))
            semantic.push("SEM_RUNTIME_HOME_MISMATCH");
        if (input.proposal.targetScope.promiseId && !capability.promiseIds.includes(input.proposal.targetScope.promiseId))
            semantic.push("SEM_DECLARED_INTENT_CONTRADICTION");
        if (input.proposal.effectClass === "CREATE")
            semantic.push("SEM_DUPLICATE_CAPABILITY");
        if (/already satisfied/i.test(input.proposal.objective))
            semantic.push("SEM_ALREADY_SATISFIED");
    }
    if (validation.paths.some((path) => path === ".maat" || path.startsWith(".maat/")))
        semantic.push("SEM_DO_NOT_TOUCH_CONFLICT");
    if (phase4.state === "AUTHENTICATED_APPLICABLE_PHASE4") {
        if (input.phase4.contradictions.some((item) => item.code === "DO_NOT_TOUCH_CONFLICT"))
            semantic.push("SEM_DO_NOT_TOUCH_CONFLICT");
        if (input.phase4.contradictions.some((item) => item.code === "COMPETING_RUNTIME_HOME"))
            semantic.push("SEM_CONTINUITY_CONTRADICTION");
        if (input.phase4.noDoubleWork.action === "BLOCKED")
            semantic.push("SEM_PHASE4_ACTION_INCOMPATIBLE");
    }
    if (/complete|done|verified|ready/i.test(input.proposal.objective) && phase5.result && !["VERIFIED_CONTINUITY", "VERIFIED_WITH_OBSERVATIONS"].includes(phase5.result.verdict))
        semantic.push("SEM_UNSUPPORTED_COMPLETION_INTENT");
    if (phase5.state === "UNKNOWN_PHASE5_APPLICABILITY")
        limitations.push("Phase 5 applicability remains UNKNOWN");
    if (phase5.state === "NO_APPLICABLE_PHASE5_JUDGMENT")
        limitations.push("No applicable Phase 5 judgment was supplied or required");
    const records = new Map();
    for (const record of input.observations) {
        const existing = records.get(record.observationKey) ?? [];
        existing.push(record);
        records.set(record.observationKey, existing);
    }
    const policy = information.includes("INPUT_MALFORMED") ? { requirements: [], sufficient: false, context: undefined, protectedAuthorityApplicability: undefined } : deriveRequirements(input.model, input.proposal, validation, phase4.state, input.phase4);
    if (!information.includes("INPUT_MALFORMED") && !policy.sufficient)
        information.push("INFO_INSUFFICIENT");
    if (policy.protectedAuthorityApplicability?.state === "UNKNOWN")
        limitations.push(`Protected authority applicability UNKNOWN: ${policy.protectedAuthorityApplicability.matchedScopeBasis.join(",")}`);
    for (const requirement of policy.requirements) {
        const matches = matchingObservations(requirement, input.observations, proposalId);
        if (!matches.length || !policy.context) {
            information.push("OBSERVATION_UNKNOWN");
            continue;
        }
        for (const observation of matches) {
            if (observation.collectionOutcome === "UNAVAILABLE") {
                information.push("OBSERVATION_UNAVAILABLE");
                continue;
            }
            if (observation.collectionOutcome === "UNKNOWN") {
                information.push("OBSERVATION_UNKNOWN");
                continue;
            }
            if (observation.observationFreshness === "STALE") {
                freshness.push("FRESH_OBSERVATION_STALE");
                continue;
            }
            if (observation.observationFreshness === "UNKNOWN") {
                information.push("OBSERVATION_UNKNOWN");
                continue;
            }
            const closed = isClosedFactValue(observation.normalizedValue);
            const coherent = closed && derivedCurrent(observation, records) && coherentObservation(requirement, observation, policy.context, proposalId);
            const selectedProtectedWorktree = requirement.kind === "PROTECTED_WORKTREE_STATE" && policy.protectedAuthorityApplicability?.state === "APPLIES";
            if (!closed || !coherent) {
                if (selectedProtectedWorktree)
                    operational.push("OPS_PROTECTED_DIRTY_STATE");
                else
                    information.push("OBSERVATION_UNKNOWN");
                continue;
            }
            const failure = predicateFailure(requirement, observation);
            if (failure)
                operational.push(failure);
            if (observation.normalizedValue && observation.normalizedValue.kind === "SYMLINK_CONTAINMENT" && observation.normalizedValue.resolution === "UNRESOLVED")
                information.push("OBSERVATION_UNKNOWN");
        }
    }
    const semanticPermissibility = semantic.length > 0 ? "BLOCK" : information.includes("AUTH_PHASE4_MISMATCH") || information.includes("AUTH_PHASE5_MISMATCH") || information.includes("PHASE4_APPLICABILITY_UNKNOWN") || information.includes("PHASE5_APPLICABILITY_UNKNOWN") ? "UNKNOWN" : "ALLOW";
    const operationalReadiness = operational.length > 0 ? "BLOCK" : freshness.includes("FRESH_OBSERVATION_STALE") || information.includes("INPUT_MALFORMED") || information.includes("INFO_INSUFFICIENT") || information.includes("OBSERVATION_UNAVAILABLE") || information.includes("OBSERVATION_UNKNOWN") ? "UNKNOWN" : "READY";
    const freshnessState = information.includes("INPUT_MALFORMED") ? "UNKNOWN" : freshness.length > 0 ? "STALE" : information.includes("OBSERVATION_UNKNOWN") || phase4.state === "UNKNOWN" || phase5.state === "UNKNOWN_PHASE5_APPLICABILITY" ? "UNKNOWN" : "CURRENT";
    const informationAuthority = information.includes("INPUT_MALFORMED") ? "MALFORMED_INPUT" : information.some((code) => code.startsWith("AUTH_")) ? "AUTHORITY_MISMATCH" : information.includes("OBSERVATION_UNAVAILABLE") ? "UNAVAILABLE" : information.includes("PHASE4_NOT_APPLICABLE") || information.includes("PHASE5_NOT_APPLICABLE") ? "NOT_APPLICABLE" : information.length > 0 ? "INSUFFICIENT" : "SUFFICIENT";
    const contradiction = semantic.some((code) => ["SEM_DO_NOT_TOUCH_CONFLICT", "SEM_CONTINUITY_CONTRADICTION", "SEM_PHASE4_ACTION_INCOMPATIBLE"].includes(code)) ? "PRESENT" : semanticPermissibility === "UNKNOWN" ? "UNKNOWN" : "NONE";
    const nextGovernedRoute = semanticPermissibility === "BLOCK" ? "RESOLVE_CONTRADICTION_REQUIRED" : informationAuthority === "AUTHORITY_MISMATCH" || freshnessState === "STALE" ? "REFRESH_AUTHORITY_REQUIRED" : operationalReadiness === "UNKNOWN" ? "COLLECT_PERMITTED_OBSERVATION_REQUIRED" : informationAuthority === "NOT_APPLICABLE" ? "NOT_APPLICABLE" : "HUMAN_REVIEW_REQUIRED";
    const result = {
        kind: "HITO_PHASE7_PRE_EFFECT_ASSESSMENT", assessmentId: `assessment_${hash({ proposalId, modelRevision: input.model.canonicalState.modelRevision, history: input.model.canonicalState.historyHead, evidence: input.model.canonicalState.evidenceHead, phase4: input.phase4.source.derivedOutput.derivedOutputId, phase5: phase5.result?.judgeResultId ?? phase5.state, observationId, diagnosticId, ruleset: exports.PHASE7_RULESET_VERSION, contract: exports.PHASE7_CONTRACT_VERSION })}`,
        rulesetVersion: exports.PHASE7_RULESET_VERSION, authority: exports.PHASE7_AUTHORITY, proposalIdentity: proposalId, observationSetIdentity: observationId, diagnosticSetIdentity: diagnosticId, semanticPermissibility, operationalReadiness, freshness: freshnessState, contradiction, informationAuthority, phase4State: phase4.state, phase5State: phase5.state,
        semanticReasonCodes: sortUnique(semantic), operationalReasonCodes: sortUnique(operational), freshnessReasonCodes: sortUnique(freshness), informationAuthorityReasonCodes: sortUnique(information), nextGovernedRoute,
        source: { modelRevision: input.model.canonicalState.modelRevision, historySequence: input.model.canonicalState.historyHead.sequence, evidenceSequence: input.model.canonicalState.evidenceHead.sequence, phase4Identity: input.phase4.source.derivedOutput.derivedOutputId, phase5IdentityOrState: phase5.result?.judgeResultId ?? phase5.state }, protectedAuthorityApplicability: policy.protectedAuthorityApplicability, limitations: sortUnique(limitations), zeroEffectCounters: zeroEffects(),
    };
    if ((0, contracts_1.canonicalize)(input.model) !== before)
        throw new Error("Phase 7 assessment mutated canonical HITO model");
    return result;
}
/** Test-scoped normalized authenticated fixture; production callers use assessPhase7PreEffect. */
function __testOnlyDeriveProtectedAuthorityApplicability(phase4, proposal, validation) {
    return deriveProtectedAuthorityApplicabilityInternal({ phase4, authenticated: true }, proposal, validation);
}
/** Recomputes immutable advisory output; a non-equal supplied result is explicitly untrusted. */
function verifyPhase7AssessmentOutput(input, supplied) {
    const expected = assessPhase7PreEffect(input);
    return (0, contracts_1.canonicalize)(expected) === (0, contracts_1.canonicalize)(supplied) ? { valid: true, reasonCodes: [] } : { valid: false, reasonCodes: ["OUTPUT_TAMPERED"] };
}
