"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.G15_PROJECTION_MODES = exports.G15_MANIFEST_SHA256 = exports.G15_CONTINUITY_SHA256 = exports.G15_TRACEABILITY_SHA256 = exports.G15_CASES_SHA256 = exports.G15_MODEL_SHA256 = exports.G15_CONTRACT_SHA256 = exports.G15_UNIVERSAL_PROTOCOL_PROJECTION_AUTHORITY = exports.G15_UNIVERSAL_PROTOCOL_PROJECTION_RULESET_VERSION = void 0;
exports.sanitizeG15ProjectionText = sanitizeG15ProjectionText;
exports.sanitizeG15ProjectionCopy = sanitizeG15ProjectionCopy;
exports.deriveG15UniversalProtocolProjection = deriveG15UniversalProtocolProjection;
exports.selectG15Projection = selectG15Projection;
exports.deriveHitoFirstObservation = deriveHitoFirstObservation;
exports.assertHitoFirstObservationResult = assertHitoFirstObservationResult;
const contracts_1 = require("../contracts");
const semantic_canonicalization_1 = require("./semantic-canonicalization");
exports.G15_UNIVERSAL_PROTOCOL_PROJECTION_RULESET_VERSION = "hito-universal-protocol-projection-v1-repair1";
exports.G15_UNIVERSAL_PROTOCOL_PROJECTION_AUTHORITY = "DERIVED / DETERMINISTIC / READ_ONLY / NON_CANONICAL / NONEXECUTING / PROJECTION_ONLY";
exports.G15_CONTRACT_SHA256 = "a1db4e865ef6f265c3fa2a34ac0915932181bcbd5c2ef9c699f8fb582fb457ea";
exports.G15_MODEL_SHA256 = "25df991c8f6e5e0235a7ec2585f7f0c4bd50df426ca28044a1762793a526f123";
exports.G15_CASES_SHA256 = "c563c97df4b3ffea11f2f15dde36e2cf9c45b447e261afaf48016609abcd5842";
exports.G15_TRACEABILITY_SHA256 = "9ec0c39c18d8b51b92811b69aedb23d9fb683468e42ed3a8e19855cb1b0324d7";
exports.G15_CONTINUITY_SHA256 = "882d08ddcc26ada71bb722bfa97654c78f9eee55b553c644150cf17730fc263c";
exports.G15_MANIFEST_SHA256 = "4cdade5192394eb679cbe1f3d96489d891e1fd34ef39ecdef68d1c067e80c7d4";
exports.G15_PROJECTION_MODES = ["GUIDED", "ENGINEER", "FORENSIC"];
const INPUT_KEYS = ["model", "c5", "request"];
const REQUEST_KEYS = ["snapshotReadKind", "presentationData"];
const DATUM_KEYS = ["datumId", "kind", "text", "scope", "provenance"];
const SCOPE_KEYS = ["kind", "identity"];
const PRESENTATION_KINDS = [
    "TARGET_LABEL",
    "REPOSITORY_LABEL",
    "EVIDENCE_LABEL",
    "EXTERNAL_OBSERVER_LABEL",
    "MODEL_PROSE",
    "AGENT_PROPOSAL",
    "RECOMMENDATION",
    "COMMITMENT",
];
const SCOPE_KINDS = ["PROJECT", "SUBJECT", "TARGET", "EVIDENCE", "ACTION", "SEMANTIC_COORDINATE"];
const LIFECYCLE_STATES = ["COMPLETE", "PARTIAL", "BLOCKED", "UNKNOWN", "NOT_STARTED"];
function assertExactKeys(value, allowed, label) {
    const unsupported = Object.keys(value).filter((key) => !allowed.includes(key)).sort(semantic_canonicalization_1.compareSemanticCodePoints);
    if (unsupported.length > 0)
        throw new Error(`${label} rejects unsupported or precomputed authority fields: ${unsupported.join(", ")}`);
}
function boundedUntrustedString(value, label) {
    if (typeof value !== "string")
        throw new Error(`HITO G15 requires ${label} to be a string`);
    if (value.length > 65_536)
        throw new Error(`HITO G15 rejects oversized ${label}`);
    return value;
}
/** Projection-only neutralization. The source value is never changed. */
function sanitizeG15ProjectionText(source) {
    let rendered = "";
    for (const character of source.normalize("NFC")) {
        const codePoint = character.codePointAt(0);
        const isC0 = codePoint <= 0x1f || codePoint === 0x7f;
        const isC1 = codePoint >= 0x80 && codePoint <= 0x9f;
        const isBidiControl = codePoint === 0x061c
            || codePoint === 0x200e
            || codePoint === 0x200f
            || (codePoint >= 0x202a && codePoint <= 0x202e)
            || (codePoint >= 0x2066 && codePoint <= 0x2069);
        const isFormatControl = /\p{Cf}/u.test(character);
        if (isC0 || isC1 || isBidiControl || isFormatControl) {
            rendered += `⟦U+${codePoint.toString(16).toUpperCase().padStart(4, "0")}⟧`;
            continue;
        }
        if (character === "&")
            rendered += "&amp;";
        else if (character === "<")
            rendered += "&lt;";
        else if (character === ">")
            rendered += "&gt;";
        else if (character === "\"")
            rendered += "&quot;";
        else if (character === "'")
            rendered += "&#39;";
        else
            rendered += character;
    }
    return rendered
        .replaceAll("HITO_VERDICT", "HITO⟦UNTRUSTED_TEXT⟧VERDICT")
        .replaceAll("HITO_STATUS", "HITO⟦UNTRUSTED_TEXT⟧STATUS")
        .replaceAll("HITO_AUTHORITY", "HITO⟦UNTRUSTED_TEXT⟧AUTHORITY");
}
/** Recursively creates a presentation-safe copy without mutating semantic/canonical input. */
function sanitizeG15ProjectionCopy(value) {
    if (typeof value === "string")
        return sanitizeG15ProjectionText(value);
    if (Array.isArray(value))
        return value.map((entry) => sanitizeG15ProjectionCopy(entry));
    if (value !== null && typeof value === "object") {
        return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, sanitizeG15ProjectionCopy(nested)]));
    }
    return value;
}
function stableIdentity(prefix, frames) {
    return `${prefix}_${(0, semantic_canonicalization_1.sha256LengthPrefixedFrames)(frames)}`;
}
function normalizeRequest(request) {
    if (request === null || typeof request !== "object")
        throw new Error("HITO G15 requires an explicit structured projection request");
    assertExactKeys(request, REQUEST_KEYS, "HITO G15 projection request");
    if (request.snapshotReadKind !== "VALIDATED_CANONICAL" && request.snapshotReadKind !== "FAST_LOCAL") {
        throw new Error("HITO G15 requires an explicit supported snapshot read kind");
    }
    if (!Array.isArray(request.presentationData))
        throw new Error("HITO G15 requires an explicit presentationData collection");
    const presentationData = request.presentationData.map((datum, index) => {
        if (datum === null || typeof datum !== "object")
            throw new Error(`HITO G15 presentationData[${index}] must be structured`);
        assertExactKeys(datum, DATUM_KEYS, `HITO G15 presentationData[${index}]`);
        if (!PRESENTATION_KINDS.includes(datum.kind))
            throw new Error(`HITO G15 presentationData[${index}] kind is invalid`);
        if (datum.scope === null || typeof datum.scope !== "object")
            throw new Error(`HITO G15 presentationData[${index}] scope must be structured`);
        assertExactKeys(datum.scope, SCOPE_KEYS, `HITO G15 presentationData[${index}] scope`);
        if (!SCOPE_KINDS.includes(datum.scope.kind))
            throw new Error(`HITO G15 presentationData[${index}] scope kind is invalid`);
        return {
            datumId: boundedUntrustedString(datum.datumId, `presentationData[${index}].datumId`),
            kind: datum.kind,
            text: boundedUntrustedString(datum.text, `presentationData[${index}].text`),
            scope: {
                kind: datum.scope.kind,
                identity: boundedUntrustedString(datum.scope.identity, `presentationData[${index}].scope.identity`),
            },
            provenance: boundedUntrustedString(datum.provenance, `presentationData[${index}].provenance`),
        };
    }).sort((left, right) => (0, semantic_canonicalization_1.compareSemanticCodePoints)((0, contracts_1.canonicalize)(left), (0, contracts_1.canonicalize)(right)));
    return { snapshotReadKind: request.snapshotReadKind, presentationData };
}
function assertC5Authority(model, c5) {
    if (c5 === null || typeof c5 !== "object" || c5.kind !== "HITO_1_0_C5_COMPOSITION_SNAPSHOT") {
        throw new Error("HITO G15 requires an authentic structured C5 composition snapshot");
    }
    const c1 = c5.c4?.c3?.c2?.c1;
    if (c1 === undefined
        || c1.source.canonicalModelRevision !== model.canonicalState.modelRevision
        || c1.source.canonicalModelIntegrityHash !== model.canonicalState.integrity.modelHash
        || c1.source.historyHead.sequence !== model.canonicalState.historyHead.sequence
        || c1.source.historyHead.eventHash !== model.canonicalState.historyHead.eventHash
        || c1.source.evidenceHead.sequence !== model.canonicalState.evidenceHead.sequence
        || c1.source.evidenceHead.manifestHash !== model.canonicalState.evidenceHead.manifestHash) {
        throw new Error("HITO G15 rejects C5 authority not bound to the supplied canonical model");
    }
    if (c5.g14.sources.canonicalModelRevision !== model.canonicalState.modelRevision
        || c5.g14.sources.canonicalModelIntegrityHash !== model.canonicalState.integrity.modelHash
        || c5.laterSemanticAuthority.g15Plus !== false) {
        throw new Error("HITO G15 rejects mismatched or forward-authority C5 input");
    }
    const counters = [c5.zeroEffectCounters, c5.g14.zeroEffectCounters];
    if (counters.some((counter) => Object.values(counter).some((value) => value !== 0))) {
        throw new Error("HITO G15 rejects a predecessor snapshot reporting effects");
    }
}
function materialHeadline(category) {
    const headlines = {
        UNKNOWN: "Required truth remains unknown",
        INDETERMINATE: "The available authority cannot decide this bounded question",
        CONFLICT: "Conflicting semantic authority requires attention",
        CONTRADICTION: "An unresolved contradiction is present",
        PROTECTED_AUTHORITY: "Protected authority and do-not-touch boundaries apply",
        STALE_OR_CAUSALLY_INAPPLICABLE_PROOF: "Proof is stale or not causally applicable",
        DESYNCHRONIZED_TERRITORY: "Observed territory differs from governed meaning",
        MISSING_PROOF: "Required proof is missing",
        MISSING_OR_INSUFFICIENT_AUTHORITY: "Required authority is missing or insufficient",
        OBSERVATION_COVERAGE_LIMIT: "Observation coverage is bounded or incomplete",
        NO_JUSTIFIED_NEXT_STEP: "No governed next step is currently justified",
    };
    return headlines[category];
}
function severityRank(value) {
    return value === "BLOCKER" ? 3 : value === "LIMIT" ? 2 : 1;
}
function allG14ReasonCodes(c5) {
    return [...new Set([
            ...c5.g14.reasonCodes,
            ...c5.g14.observations.flatMap((observation) => observation.reasonCodes),
            ...c5.g14.variants.flatMap((variant) => variant.reasonCodes),
            ...c5.g14.runtimeRealizations.flatMap((realization) => realization.reasonCodes),
        ])].sort(semantic_canonicalization_1.compareSemanticCodePoints);
}
function collectMaterialStates(model, c5) {
    const c4 = c5.c4;
    const c3 = c4.c3;
    const c2 = c3.c2;
    const c1 = c2.c1;
    const projectId = model.project.projectId;
    const values = [];
    const add = (category, severity, scope, sourceAuthority, sourceIdentity, reasonCodes, summary = materialHeadline(category)) => {
        const normalizedReasons = [...new Set(reasonCodes)].sort(semantic_canonicalization_1.compareSemanticCodePoints);
        const normalizedScope = { kind: scope.kind, identity: scope.identity, globalImpact: scope.globalImpact === true };
        values.push({
            materialStateId: stableIdentity("hito_g15_material", [
                { label: "category", value: category },
                { label: "severity", value: severity },
                { label: "scope", value: normalizedScope },
                { label: "source-authority", value: sourceAuthority },
                { label: "source-identity", value: sourceIdentity },
                { label: "reasons", value: normalizedReasons },
            ]),
            category,
            severity,
            scope: normalizedScope,
            sourceAuthority,
            sourceIdentity,
            summary,
            reasonCodes: normalizedReasons,
        });
    };
    for (const condition of c1.phase3.pulse.unknowns) {
        add("UNKNOWN", "LIMIT", {
            kind: condition.affectedEntityIds.length === 1 ? "SUBJECT" : "PROJECT",
            identity: condition.affectedEntityIds[0] ?? projectId,
            globalImpact: false,
        }, "PHASE3_PROJECT_PULSE", condition.conditionId, [condition.kind], condition.detail);
    }
    for (const conflict of c1.phase3.mri.conflicts) {
        add("CONFLICT", "BLOCKER", { kind: "SUBJECT", identity: conflict.anchor }, "PHASE3_ENGINEERING_MRI", c1.phase3.mri.source.semanticHash, [conflict.reason]);
    }
    for (const ambiguity of c1.phase3.mri.ambiguities) {
        add("INDETERMINATE", "LIMIT", { kind: "SUBJECT", identity: ambiguity.anchor }, "PHASE3_ENGINEERING_MRI", c1.phase3.mri.source.semanticHash, [ambiguity.reason]);
    }
    for (const coordinate of c2.g8.successor.unresolvedSemanticCoordinates) {
        const category = coordinate.state === "STALE"
            ? "STALE_OR_CAUSALLY_INAPPLICABLE_PROOF"
            : coordinate.state === "CONFLICTING" ? "CONFLICT" : coordinate.state === "UNKNOWN" ? "UNKNOWN" : "MISSING_OR_INSUFFICIENT_AUTHORITY";
        add(category, coordinate.state === "CONFLICTING" ? "BLOCKER" : "LIMIT", { kind: "SEMANTIC_COORDINATE", identity: coordinate.coordinateId }, "G8_ENGINEERING_REALITY", c2.g8.successor.semanticRealityIdentity, [coordinate.state, coordinate.reason]);
    }
    if (c2.g9 !== undefined) {
        for (const criterion of c2.g9.criteria.filter((entry) => entry.effectiveState !== "ESTABLISHED" && entry.effectiveState !== "NOT_REQUIRED")) {
            const category = criterion.effectiveState === "INDETERMINATE" ? "UNKNOWN" : "MISSING_OR_INSUFFICIENT_AUTHORITY";
            add(category, "LIMIT", { kind: "SUBJECT", identity: c2.g9.transitionId }, "G9_TRANSITION_COMPLETION", c2.g9.assessmentId, criterion.reasonCodes);
        }
    }
    if (c3.g10.diffAssessment === "INDETERMINATE" || c3.g10.causalRelation === "INDETERMINATE") {
        const localizedCoordinate = c2.g8.successor.unresolvedSemanticCoordinates[0];
        add("INDETERMINATE", "LIMIT", localizedCoordinate === undefined
            ? { kind: "PROJECT", identity: projectId, globalImpact: true }
            : { kind: "SEMANTIC_COORDINATE", identity: localizedCoordinate.coordinateId, globalImpact: false }, "G10_SEMANTIC_HISTORY", c3.g10.projectionId, c3.g10.reasonCodes);
    }
    else if (c3.g10.causalRelation === "DIVERGENT") {
        add("CONFLICT", "BLOCKER", { kind: "PROJECT", identity: projectId, globalImpact: true }, "G10_SEMANTIC_HISTORY", c3.g10.projectionId, c3.g10.reasonCodes);
    }
    if (c3.g11 !== undefined && c3.g11.conflictAssessment !== "NO_CONFLICT") {
        add(c3.g11.conflictAssessment === "CONFLICT_DETECTED" ? "CONFLICT" : "INDETERMINATE", c3.g11.conflictAssessment === "CONFLICT_DETECTED" ? "BLOCKER" : "LIMIT", { kind: "SUBJECT", identity: c3.g11.normalizedBoundedClaimKey }, "G11_CONFLICT_DETECTION", c3.g11.assessmentId, c3.g11.reasonCodes);
    }
    if (c1.phase4 !== undefined) {
        const phase4 = c1.phase4;
        for (const contradiction of phase4.contradictions) {
            add(contradiction.code.includes("CONFLICT") || contradiction.code.startsWith("COMPETING") ? "CONFLICT" : "CONTRADICTION", contradiction.severity === "CRITICAL" || contradiction.severity === "HIGH" ? "BLOCKER" : "LIMIT", { kind: "SUBJECT", identity: contradiction.affectedEntityIds[0] ?? projectId }, "PHASE4_NEXT_SAFE_MUTATION", contradiction.contradictionId, [contradiction.code], contradiction.summary);
        }
        for (const unknown of phase4.reconciliation.unknowns) {
            add("UNKNOWN", "LIMIT", { kind: "SUBJECT", identity: phase4.reconciliation.candidateCapabilityIds[0] ?? projectId }, "PHASE4_NEXT_SAFE_MUTATION", phase4.source.derivedOutput.derivedOutputId, [unknown]);
        }
        const protectedScope = phase4.proposal.doNotTouch.protectedCapabilityIds[0]
            ?? phase4.proposal.doNotTouch.currentRuntimeHomeIds[0]
            ?? projectId;
        add("PROTECTED_AUTHORITY", "NOTICE", { kind: "SUBJECT", identity: protectedScope }, "PHASE4_DO_NOT_TOUCH", phase4.source.derivedOutput.derivedOutputId, [
            ...phase4.proposal.doNotTouch.redZones,
            ...phase4.proposal.doNotTouch.stateAuthorities,
            ...phase4.proposal.doNotTouch.eventAuthorities,
            ...phase4.proposal.doNotTouch.persistenceAuthorities,
        ]);
        if (phase4.source.derivedOutput.stalenessState !== "FRESH") {
            add("STALE_OR_CAUSALLY_INAPPLICABLE_PROOF", "BLOCKER", { kind: "ACTION", identity: phase4.proposal.mutation.mutationId }, "PHASE4_NEXT_SAFE_MUTATION", phase4.source.derivedOutput.derivedOutputId, [phase4.source.derivedOutput.stalenessState]);
        }
    }
    else {
        add("NO_JUSTIFIED_NEXT_STEP", "LIMIT", { kind: "ACTION", identity: projectId }, "PHASE4_NEXT_SAFE_MUTATION", "ABSENT", ["PHASE4_NEXT_SAFE_MUTATION_ABSENT"]);
    }
    if (c1.phase5 !== undefined) {
        for (const unknown of c1.phase5.unknowns)
            add("UNKNOWN", "LIMIT", { kind: "SUBJECT", identity: c1.phase5.subject.id }, "PHASE5_REALITY_JUDGE", c1.phase5.judgeResultId, [unknown]);
        for (const contradiction of c1.phase5.contradictions)
            add("CONTRADICTION", "BLOCKER", { kind: "SUBJECT", identity: c1.phase5.subject.id }, "PHASE5_REALITY_JUDGE", c1.phase5.judgeResultId, [contradiction]);
        for (const evidenceId of c1.phase5.staleEvidence)
            add("STALE_OR_CAUSALLY_INAPPLICABLE_PROOF", "LIMIT", { kind: "EVIDENCE", identity: evidenceId }, "PHASE5_REALITY_JUDGE", c1.phase5.judgeResultId, ["PRESENT_STALE"]);
        for (const evidence of c1.phase5.availableEvidence.filter((entry) => entry.state === "MISSING" || entry.state === "UNREADABLE_OR_INVALID")) {
            add("MISSING_PROOF", "LIMIT", { kind: "EVIDENCE", identity: evidence.evidenceId }, "PHASE5_REALITY_JUDGE", c1.phase5.judgeResultId, [evidence.state, evidence.reason]);
        }
        if (c1.phase5.verdict === "INDETERMINATE")
            add("INDETERMINATE", "LIMIT", { kind: "SUBJECT", identity: c1.phase5.subject.id }, "PHASE5_REALITY_JUDGE", c1.phase5.judgeResultId, [c1.phase5.verdict]);
        if (c1.phase5.stalenessState !== "FRESH")
            add("STALE_OR_CAUSALLY_INAPPLICABLE_PROOF", "BLOCKER", { kind: "SUBJECT", identity: c1.phase5.subject.id }, "PHASE5_REALITY_JUDGE", c1.phase5.judgeResultId, [c1.phase5.stalenessState]);
    }
    if (c1.phase7 !== undefined) {
        if (c1.phase7.contradiction !== "NONE")
            add(c1.phase7.contradiction === "PRESENT" ? "CONFLICT" : "UNKNOWN", c1.phase7.contradiction === "PRESENT" ? "BLOCKER" : "LIMIT", { kind: "ACTION", identity: c1.phase7.proposalIdentity }, "PHASE7_PRE_EFFECT", c1.phase7.assessmentId, c1.phase7.semanticReasonCodes);
        if (c1.phase7.freshness !== "CURRENT")
            add("STALE_OR_CAUSALLY_INAPPLICABLE_PROOF", "LIMIT", { kind: "ACTION", identity: c1.phase7.proposalIdentity }, "PHASE7_PRE_EFFECT", c1.phase7.assessmentId, c1.phase7.freshnessReasonCodes);
        if (c1.phase7.informationAuthority !== "SUFFICIENT")
            add("MISSING_OR_INSUFFICIENT_AUTHORITY", "LIMIT", { kind: "ACTION", identity: c1.phase7.proposalIdentity }, "PHASE7_PRE_EFFECT", c1.phase7.assessmentId, c1.phase7.informationAuthorityReasonCodes);
        if (c1.phase7.protectedAuthorityApplicability?.state === "APPLIES" || c1.phase7.protectedAuthorityApplicability?.state === "UNKNOWN")
            add("PROTECTED_AUTHORITY", c1.phase7.protectedAuthorityApplicability.state === "APPLIES" ? "BLOCKER" : "LIMIT", { kind: "ACTION", identity: c1.phase7.proposalIdentity }, "PHASE7_PRE_EFFECT", c1.phase7.assessmentId, c1.phase7.protectedAuthorityApplicability.matchedScopeBasis);
    }
    if (c4.g12.branchRelation === "INDETERMINATE" || c4.g12.mergeEligibility === "INDETERMINATE")
        add("INDETERMINATE", "LIMIT", { kind: "SUBJECT", identity: c4.g12.branchTips.successor.branchId }, "G12_BRANCH_MERGE", c4.g12.assessmentId, c4.g12.reasonCodes);
    if (c4.g12.protectedAuthority.state !== "CURRENT" && c4.g12.protectedAuthority.state !== "NOT_REQUIRED") {
        const category = c4.g12.protectedAuthority.state === "STALE" ? "STALE_OR_CAUSALLY_INAPPLICABLE_PROOF" : c4.g12.protectedAuthority.state === "CONFLICTING" ? "CONFLICT" : "MISSING_OR_INSUFFICIENT_AUTHORITY";
        add(category, c4.g12.protectedAuthority.state === "CONFLICTING" ? "BLOCKER" : "LIMIT", { kind: "SUBJECT", identity: c4.g12.branchTips.successor.branchId }, "G12_BRANCH_MERGE", c4.g12.assessmentId, [c4.g12.protectedAuthority.state]);
    }
    if (c4.g13 !== undefined) {
        for (const dimension of c4.g13.proofDimensions.filter((entry) => entry.effectiveState !== "ESTABLISHED" && entry.effectiveState !== "NOT_REQUIRED")) {
            const category = dimension.declaredState === "STALE"
                ? "STALE_OR_CAUSALLY_INAPPLICABLE_PROOF"
                : dimension.declaredState === "MISSING" ? "MISSING_PROOF"
                    : dimension.declaredState === "CONFLICTING" || dimension.declaredState === "COMPROMISED" || dimension.declaredState === "INVALID" ? "CONFLICT"
                        : dimension.effectiveState === "INDETERMINATE" ? "MISSING_OR_INSUFFICIENT_AUTHORITY" : "CONTRADICTION";
            add(category, dimension.effectiveState === "BLOCKED" ? "BLOCKER" : "LIMIT", { kind: "EVIDENCE", identity: dimension.dimension }, "G13_RELEASE_ELIGIBILITY", c4.g13.assessmentId, dimension.reasonCodes);
        }
    }
    if (c5.g14.territoryRelation === "DESYNCHRONIZED")
        add("DESYNCHRONIZED_TERRITORY", "BLOCKER", { kind: "TARGET", identity: c5.g14.organismIdentity.subjectId }, "G14_FEDERATED_OBSERVATION", c5.g14.projectionId, c5.g14.reasonCodes);
    else if (c5.g14.territoryRelation === "INDETERMINATE")
        add("INDETERMINATE", "LIMIT", { kind: "TARGET", identity: c5.g14.organismIdentity.subjectId }, "G14_FEDERATED_OBSERVATION", c5.g14.projectionId, c5.g14.reasonCodes);
    if (c5.g14.observationCoverage.state !== "BOUND_COMPLETE" && c5.g14.territoryRelation !== "NOT_APPLICABLE")
        add("OBSERVATION_COVERAGE_LIMIT", "LIMIT", { kind: "TARGET", identity: c5.g14.organismIdentity.subjectId }, "G14_FEDERATED_OBSERVATION", c5.g14.projectionId, [c5.g14.observationCoverage.state, ...c5.g14.observationCoverage.unobservedVariantIdentities]);
    for (const reasonCode of allG14ReasonCodes(c5)) {
        if (/STALE|EXPIRED|CAUSAL|WALL_CLOCK/i.test(reasonCode))
            add("STALE_OR_CAUSALLY_INAPPLICABLE_PROOF", "LIMIT", { kind: "TARGET", identity: c5.g14.organismIdentity.subjectId }, "G14_FEDERATED_OBSERVATION", c5.g14.projectionId, [reasonCode]);
        if (/AUTHORITY.*(?:UNAVAILABLE|UNAUTHENTICATED|INVALID|UNKNOWN|MISMATCH|INDETERMINATE|NOT_CURRENT)|UNBOUND/i.test(reasonCode))
            add("MISSING_OR_INSUFFICIENT_AUTHORITY", "LIMIT", { kind: "TARGET", identity: c5.g14.organismIdentity.subjectId }, "G14_FEDERATED_OBSERVATION", c5.g14.projectionId, [reasonCode]);
    }
    return values.sort((left, right) => (0, semantic_canonicalization_1.compareSemanticCodePoints)(left.materialStateId, right.materialStateId));
}
function groupMaterialStates(states) {
    const groups = new Map();
    for (const state of states) {
        const key = (0, contracts_1.canonicalize)({ category: state.category, scope: state.scope });
        groups.set(key, [...(groups.get(key) ?? []), state]);
    }
    return [...groups.values()].map((entries) => {
        const severity = [...entries].sort((left, right) => severityRank(right.severity) - severityRank(left.severity))[0].severity;
        const category = entries[0].category;
        const scope = entries[0].scope;
        return {
            groupId: stableIdentity("hito_g15_material_group", [
                { label: "category", value: category },
                { label: "scope", value: scope },
                { label: "items", value: entries.map((entry) => entry.materialStateId).sort(semantic_canonicalization_1.compareSemanticCodePoints) },
            ]),
            category,
            severity,
            scope,
            count: entries.length,
            materialStateIds: entries.map((entry) => entry.materialStateId).sort(semantic_canonicalization_1.compareSemanticCodePoints),
            sourceAuthorities: [...new Set(entries.map((entry) => entry.sourceAuthority))].sort(semantic_canonicalization_1.compareSemanticCodePoints),
            headline: materialHeadline(category),
        };
    }).sort((left, right) => (0, semantic_canonicalization_1.compareSemanticCodePoints)(left.groupId, right.groupId));
}
function freshnessWatermark(c5, readKind) {
    const c1 = c5.c4.c3.c2.c1;
    const g13 = c5.c4.g13;
    const reasons = [];
    if (readKind === "FAST_LOCAL")
        reasons.push("FAST_LOCAL_SNAPSHOT_HAS_BOUNDED_FRESHNESS_AND_COVERAGE");
    if (c1.phase4?.source.derivedOutput.stalenessState !== undefined && c1.phase4.source.derivedOutput.stalenessState !== "FRESH")
        reasons.push("PHASE4_AUTHORITY_STALE");
    if (c1.phase5?.stalenessState !== undefined && c1.phase5.stalenessState !== "FRESH")
        reasons.push("PHASE5_AUTHORITY_STALE");
    if (g13?.proofDimensions.some((dimension) => dimension.declaredState === "STALE"))
        reasons.push("RELEASE_PROOF_STALE");
    if (allG14ReasonCodes(c5).some((reason) => /STALE|EXPIRED|CAUSAL|WALL_CLOCK/i.test(reason)))
        reasons.push("OBSERVATION_OR_AUTHORITY_STALE_OR_CAUSALLY_INAPPLICABLE");
    if (c5.g14.observationCoverage.state !== "BOUND_COMPLETE" && c5.g14.territoryRelation !== "NOT_APPLICABLE")
        reasons.push("OBSERVATION_COVERAGE_NOT_COMPLETE");
    if (c5.g14.territoryRelation === "INDETERMINATE")
        reasons.push("OBSERVED_TERRITORY_INDETERMINATE");
    const normalizedReasons = [...new Set(reasons)].sort(semantic_canonicalization_1.compareSemanticCodePoints);
    const stale = normalizedReasons.some((reason) => /STALE|EXPIRED|CAUSALLY/.test(reason));
    const state = stale
        ? "STALE"
        : readKind === "FAST_LOCAL" ? "FAST_LOCAL_LIMITED"
            : normalizedReasons.length > 0 ? "INDETERMINATE" : "CURRENT";
    const observationApplicability = c5.g14.territoryRelation === "NOT_APPLICABLE" ? "NOT_APPLICABLE" : c5.g14.territoryRelation === "INDETERMINATE" ? "INDETERMINATE" : "APPLICABLE";
    const evidenceApplicability = g13 === undefined && c1.phase5 === undefined
        ? "NOT_REQUESTED"
        : g13?.releaseEligibility === "INDETERMINATE" || c1.phase5?.verdict === "INDETERMINATE" ? "INDETERMINATE" : "APPLICABLE";
    const material = {
        state,
        snapshotReadKind: readKind,
        realityRevisionObserved: c1.source.canonicalModelRevision,
        canonicalModelIntegrityHash: c1.source.canonicalModelIntegrityHash,
        historyHead: c1.source.historyHead,
        evidenceHead: c1.source.evidenceHead,
        observationProjectionIdentity: c5.g14.projectionId,
        observationApplicability,
        evidenceApplicability,
        observationCoverage: c5.g14.observationCoverage.state,
        causalPositionIdentity: c5.c4.c3.g10.source.successor.historyHead.eventHash,
        reasonCodes: normalizedReasons,
        currentClaimBounded: true,
    };
    return {
        watermarkId: stableIdentity("hito_g15_freshness", [{ label: "freshness", value: material }]),
        ...material,
    };
}
function nextStep(c5) {
    const phase4 = c5.c4.c3.c2.c1.phase4;
    if (phase4 === undefined) {
        return {
            state: "NO_JUSTIFIED_NEXT_STEP",
            sourcePhase4DecisionIdentity: null,
            nextSafeMutationIdentity: null,
            reasonCodes: ["PHASE4_NEXT_SAFE_MUTATION_ABSENT"],
            exactSourceAuthorityBound: true,
            executionAuthority: false,
        };
    }
    const identity = stableIdentity("hito_g15_phase4_next", [
        { label: "phase4-decision", value: phase4.source.derivedOutput.derivedOutputId },
        { label: "exact-next-safe-mutation", value: phase4.proposal },
    ]);
    return {
        state: "PHASE4_NEXT_SAFE_MUTATION",
        sourcePhase4DecisionIdentity: phase4.source.derivedOutput.derivedOutputId,
        nextSafeMutationIdentity: identity,
        projection: sanitizeG15ProjectionCopy(structuredClone(phase4.proposal)),
        exactSourceAuthorityBound: true,
        executionAuthority: false,
    };
}
function actionRoute(step) {
    const available = step.state === "PHASE4_NEXT_SAFE_MUTATION";
    return {
        state: available ? "GOVERNED_HANDOFF_AVAILABLE" : "NO_GOVERNED_HANDOFF",
        routeId: stableIdentity("hito_g15_action_route", [{ label: "next-step", value: available ? step.nextSafeMutationIdentity : "ABSENT" }]),
        sourceNextSafeMutationIdentity: available ? step.nextSafeMutationIdentity : null,
        destination: available ? "SEPARATE_GOVERNED_ACTION_WORKFLOW" : "NONE",
        mutatingCommand: null,
        semanticAuthority: false,
        executionAuthority: false,
    };
}
function lifecycle(model, c5) {
    const c1 = c5.c4.c3.c2.c1;
    const declared = model.intent.filter((intent) => intent.authority === "DECLARED_INTENT");
    const extracted = model.intent.filter((intent) => intent.authority === "EXTRACTED_INTENT_CANDIDATE");
    const idea = declared.length > 0 ? "COMPLETE" : extracted.length > 0 ? "UNKNOWN" : "NOT_STARTED";
    const what = declared.length === 0 ? (extracted.length > 0 ? "UNKNOWN" : "NOT_STARTED") : model.requirements.length > 0 ? "COMPLETE" : "NOT_STARTED";
    const statuses = model.capabilities.map((capability) => capability.lifecycleStatus);
    const build = statuses.length === 0 ? "NOT_STARTED"
        : statuses.some((state) => state === "UNKNOWN") ? "UNKNOWN"
            : statuses.some((state) => state === "BLOCKED" || state === "DEGRADED") ? "BLOCKED"
                : statuses.every((state) => ["LIVE", "DEPRECATED"].includes(state)) ? "COMPLETE"
                    : "PARTIAL";
    const pulse = c1.phase3.pulse;
    const connect = pulse.runtime.conflictCount > 0 ? "BLOCKED"
        : pulse.runtime.unresolvedCapabilityIds.length > 0 ? "UNKNOWN"
            : pulse.runtime.runtimeGapCapabilityIds.length > 0 ? "PARTIAL"
                : model.runtimeHomes.length === 0 ? "NOT_STARTED" : "COMPLETE";
    const release = c5.c4.g13;
    const phase5 = c1.phase5;
    const prove = release !== undefined
        ? release.releaseEligibility === "ELIGIBLE_FOR_GOVERNED_RELEASE" ? "COMPLETE"
            : release.releaseEligibility === "BLOCKED" ? "BLOCKED"
                : release.releaseEligibility === "INDETERMINATE" ? "UNKNOWN" : "NOT_STARTED"
        : phase5 === undefined ? "NOT_STARTED"
            : phase5.verdict === "INDETERMINATE" ? "UNKNOWN"
                : phase5.verdict === "BLOCKED" || phase5.verdict === "REPAIR_REQUIRED" || phase5.verdict === "COURSE_CHANGE_REQUIRED" ? "BLOCKED"
                    : phase5.verdict.startsWith("VERIFIED") ? "COMPLETE" : "PARTIAL";
    const result = c5.g14.territoryRelation === "ALIGNED" ? "COMPLETE"
        : c5.g14.territoryRelation === "DESYNCHRONIZED" ? "BLOCKED"
            : c5.g14.territoryRelation === "INDETERMINATE" ? "UNKNOWN" : "NOT_STARTED";
    return {
        kind: "HITO_G15_GUIDED_LIFECYCLE_PROJECTION",
        stages: [
            { stage: "IDEA", state: idea, basis: [declared.length > 0 ? "DECLARED_INTENT_PRESENT" : extracted.length > 0 ? "ONLY_EXTRACTED_INTENT_CANDIDATE_PRESENT" : "NO_INTENT_RECORD_PRESENT"] },
            { stage: "WHAT", state: what, basis: [`DECLARED_INTENT_COUNT_${declared.length}`, `REQUIREMENT_COUNT_${model.requirements.length}`] },
            { stage: "BUILD", state: build, basis: [`CAPABILITY_COUNT_${model.capabilities.length}`, ...[...new Set(statuses)].sort(semantic_canonicalization_1.compareSemanticCodePoints)] },
            { stage: "CONNECT", state: connect, basis: [`RUNTIME_GAP_COUNT_${pulse.runtime.runtimeGapCapabilityIds.length}`, `UNRESOLVED_COUNT_${pulse.runtime.unresolvedCapabilityIds.length}`, `CONFLICT_COUNT_${pulse.runtime.conflictCount}`] },
            { stage: "PROVE", state: prove, basis: [release?.releaseEligibility ?? phase5?.verdict ?? "NO_PROOF_AUTHORITY_REQUESTED"] },
            { stage: "RESULT", state: result, basis: [c5.g14.territoryRelation, c5.g14.observationCoverage.state] },
        ],
        allowedStates: LIFECYCLE_STATES,
        percentagesUsed: false,
        canonicalOntologyAuthority: false,
        truthBoundary: "IDEA/WHAT/BUILD/CONNECT/PROVE/RESULT is a read-only human projection over existing HITO authority, not a canonical ontology, coordinate, movement, or rail.",
    };
}
function projectedIntents(model, presentationData) {
    const canonical = model.intent.map((intent) => ({
        intentProjectionId: stableIdentity("hito_g15_intent", [{ label: "promise", value: intent.promiseId }, { label: "authority", value: intent.authority }, { label: "statement", value: intent.statement }]),
        recordKind: "CANONICAL_INTENT_RECORD",
        sourceAuthority: intent.authority,
        displayedRole: intent.authority === "DECLARED_INTENT" ? "DECLARED_GOVERNED_INTENT" : "EXTRACTED_INTENT_CANDIDATE_NOT_AUTHORITY",
        executionAuthority: false,
        scope: { kind: "PROJECT", identity: sanitizeG15ProjectionText(intent.projectId) },
        text: sanitizeG15ProjectionText(intent.statement),
        provenance: sanitizeG15ProjectionText(intent.provenance.source),
    }));
    const external = presentationData.map((datum) => {
        const displayedRole = datum.kind === "AGENT_PROPOSAL"
            ? "AGENT_PROPOSAL_NOT_CANONICAL_TRUTH"
            : datum.kind === "RECOMMENDATION" ? "RECOMMENDATION_NOT_COMMITMENT"
                : datum.kind === "COMMITMENT" ? "COMMITMENT_NOT_EXECUTION_AUTHORITY" : "UNTRUSTED_CONTEXT_ONLY";
        return {
            intentProjectionId: stableIdentity("hito_g15_untrusted_presentation", [{ label: "datum", value: datum }]),
            recordKind: "UNTRUSTED_PRESENTATION_RECORD",
            sourceAuthority: "UNTRUSTED_PRESENTATION_DATA",
            displayedRole,
            executionAuthority: false,
            scope: sanitizeG15ProjectionCopy(datum.scope),
            text: sanitizeG15ProjectionText(datum.text),
            provenance: sanitizeG15ProjectionText(datum.provenance),
        };
    });
    return [...canonical, ...external].sort((left, right) => (0, semantic_canonicalization_1.compareSemanticCodePoints)(left.intentProjectionId, right.intentProjectionId));
}
function historyProjection(c5) {
    const g10 = c5.c4.c3.g10;
    return sanitizeG15ProjectionCopy({
        kind: "HITO_G15_G10_HISTORY_REUSE_PROJECTION",
        sourceProjectionId: g10.projectionId,
        diffAssessment: g10.diffAssessment,
        causalRelation: g10.causalRelation,
        positions: structuredClone(g10.positions),
        causalEdges: structuredClone(g10.causalEdges),
        semanticCoordinateDeltas: structuredClone(g10.semanticCoordinateDeltas),
        secondHistoryStoreCreated: false,
        canonicalAuthority: false,
    });
}
function checkProjection(model, c5, freshness, states) {
    const conflict = states.some((state) => state.category === "CONFLICT" || state.category === "CONTRADICTION");
    const protectedAuthority = states.some((state) => state.category === "PROTECTED_AUTHORITY");
    const checks = [
        { checkId: "canonical-source-binding", state: "SATISFIED", scope: { kind: "PROJECT", identity: model.project.projectId }, detail: "The projection is bound to the supplied validated canonical model identity." },
        { checkId: "freshness-watermark", state: freshness.state === "CURRENT" ? "SATISFIED" : freshness.state === "STALE" ? "ATTENTION" : "INDETERMINATE", scope: { kind: "PROJECT", identity: model.project.projectId }, detail: `Freshness state is ${freshness.state}.` },
        { checkId: "semantic-conflict", state: conflict ? "ATTENTION" : "SATISFIED", scope: { kind: "PROJECT", identity: model.project.projectId }, detail: conflict ? "One or more bounded conflicts or contradictions are visible." : "No upstream bounded conflict is present in this snapshot." },
        { checkId: "protected-authority", state: protectedAuthority ? "ATTENTION" : "NOT_APPLICABLE", scope: { kind: "PROJECT", identity: model.project.projectId }, detail: protectedAuthority ? "Protected authority remains visible and nonexecuting." : "No applicable protected-authority projection is present." },
        { checkId: "observation-coverage", state: c5.g14.observationCoverage.state === "BOUND_COMPLETE" ? "SATISFIED" : "INDETERMINATE", scope: { kind: "TARGET", identity: c5.g14.organismIdentity.subjectId }, detail: `Bounded observation coverage is ${c5.g14.observationCoverage.state}.` },
        { checkId: "execution-authority", state: "NOT_APPLICABLE", scope: { kind: "ACTION", identity: model.project.projectId }, detail: "G15 and its CLI grant no execution authority." },
    ];
    return sanitizeG15ProjectionCopy({ kind: "HITO_G15_BOUNDED_CHECK_PROJECTION", checks, executionPerformed: false, canonicalAuthority: false });
}
function overallStatus(states) {
    if (states.some((state) => state.scope.globalImpact && state.severity === "BLOCKER"))
        return "GLOBALLY_BLOCKED";
    if (states.some((state) => state.scope.globalImpact && (state.category === "UNKNOWN" || state.category === "INDETERMINATE")))
        return "GLOBALLY_INDETERMINATE";
    return states.length > 0 ? "BOUNDED_ATTENTION" : "BOUNDED_CURRENT";
}
function answersFor(mode, model, truth) {
    const declared = truth.intents.filter((intent) => intent.displayedRole === "DECLARED_GOVERNED_INTENT");
    const candidates = truth.intents.filter((intent) => intent.displayedRole === "EXTRACTED_INTENT_CANDIDATE_NOT_AUTHORITY");
    const missing = truth.materialStateGroups.length === 0
        ? "No material bounded limitation is present in this snapshot."
        : `${truth.materialStateCount} material state(s) remain visible across ${truth.materialStateGroups.length} affected scope group(s).`;
    const next = truth.nextStep.state === "PHASE4_NEXT_SAFE_MUTATION"
        ? truth.nextStep.projection.plainLanguageAction
        : "No governed next step is currently justified.";
    const why = truth.nextStep.state === "PHASE4_NEXT_SAFE_MUTATION"
        ? truth.nextStep.projection.reasonNextSafe
        : truth.nextStep.reasonCodes.join(", ");
    const safe = truth.nextStep.state === "PHASE4_NEXT_SAFE_MUTATION"
        ? truth.nextStep.projection.safeZone.join(", ") || "Only the separately governed bounded handoff is identified; no execution occurs here."
        : "No change scope is justified by current Phase 4 authority.";
    const protectedText = truth.nextStep.state === "PHASE4_NEXT_SAFE_MUTATION"
        ? truth.nextStep.projection.doNotTouch.redZones.join(", ")
        : "Canonical state and governed targets remain protected.";
    const proof = truth.lifecycle.stages.find((stage) => stage.stage === "PROVE")?.state ?? "UNKNOWN";
    const result = truth.lifecycle.stages.find((stage) => stage.stage === "RESULT")?.state ?? "UNKNOWN";
    const trying = declared[0]?.text
        ?? (candidates.length > 0 ? `Extracted intent candidate (not declared authority): ${candidates[0].text}` : "No declared intent is available in this bounded snapshot.");
    const answers = {
        whereAmI: `${sanitizeG15ProjectionText(model.project.name)} is at canonical model revision ${truth.freshnessWatermark.realityRevisionObserved}; bounded status is ${truth.overallStatus}.`,
        whatAmITryingToDo: trying,
        whatIsMissing: missing,
        whatNext: next,
        why,
        whatIsSafeToChange: safe,
        whatShouldINotTouch: protectedText,
        whenIsThisDone: `Proof projection is ${proof}; bounded observed-result projection is ${result}. Neither grants deployment or execution authority.`,
    };
    return mode === "GUIDED" ? answers : {
        ...answers,
        why: `${answers.why} Semantic verdict identity: ${truth.semanticVerdictIdentity}.`,
    };
}
function projectionView(mode, model, truth) {
    const details = mode === "GUIDED"
        ? {
            groupedMaterialScopeCount: truth.materialStateGroups.length,
            advancedDetailsAvailable: true,
            internalAuthorityJargonRequiredForOrdinaryUse: false,
        }
        : mode === "ENGINEER"
            ? {
                freshness: truth.freshnessWatermark,
                nextStepIdentity: truth.nextStep.nextSafeMutationIdentity,
                actionRoute: truth.actionRoute,
                sourceAuthorities: truth.sourceAuthorities,
                materialStates: truth.materialStates,
            }
            : {
                freshness: truth.freshnessWatermark,
                nextStep: truth.nextStep,
                actionRoute: truth.actionRoute,
                sourceAuthorities: truth.sourceAuthorities,
                materialStates: truth.materialStates,
                mri: truth.mri,
                history: truth.history,
                checks: truth.check,
            };
    const base = {
        kind: "HITO_G15_PROTOCOL_VIEW",
        mode,
        semanticVerdictIdentity: truth.semanticVerdictIdentity,
        trustedChrome: {
            origin: "TYPED_HITO_FIELDS_ONLY",
            label: "HITO BOUNDED STATUS",
            status: truth.overallStatus,
        },
        currentClaim: {
            bounded: true,
            freshnessWatermarkId: truth.freshnessWatermark.watermarkId,
            freshnessState: truth.freshnessWatermark.state,
        },
        materialStateGroups: truth.materialStateGroups,
        materialStateCount: truth.materialStateCount,
        hiddenMaterialStateCount: 0,
        warningsDropped: 0,
        lifecycle: truth.lifecycle,
        intents: truth.intents,
        answers: answersFor(mode, model, truth),
        explanationVerbosity: mode === "GUIDED" ? "MINIMAL_PROGRESSIVE_DISCLOSURE" : mode === "ENGINEER" ? "SEMANTIC_DETAIL" : "MAXIMUM_DETERMINISTIC_DETAIL",
        advancedDetailsAvailable: true,
        details,
    };
    return {
        ...base,
        projectionId: stableIdentity("hito_g15_view", [
            { label: "mode", value: mode },
            { label: "semantic-verdict", value: truth.semanticVerdictIdentity },
            { label: "presentation", value: base },
        ]),
    };
}
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
        gitMutationCount: 0,
    };
}
/**
 * Pure G15 projection over one same-call C5 snapshot. It renders and sanitizes
 * existing truth; it never owns, upgrades, resolves, writes, or executes it.
 */
function deriveG15UniversalProtocolProjection(input) {
    if (input === null || typeof input !== "object")
        throw new Error("HITO G15 requires a structured derivation input");
    assertExactKeys(input, INPUT_KEYS, "HITO G15 derivation input");
    (0, contracts_1.assertValidModel)(input.model);
    assertC5Authority(input.model, input.c5);
    const before = (0, contracts_1.canonicalize)(input);
    const request = normalizeRequest(input.request);
    const rawMaterialStates = collectMaterialStates(input.model, input.c5);
    const materialStates = sanitizeG15ProjectionCopy(rawMaterialStates);
    const materialStateGroups = sanitizeG15ProjectionCopy(groupMaterialStates(rawMaterialStates));
    const freshness = sanitizeG15ProjectionCopy(freshnessWatermark(input.c5, request.snapshotReadKind));
    const step = nextStep(input.c5);
    const route = actionRoute(step);
    const lifecycleProjection = sanitizeG15ProjectionCopy(lifecycle(input.model, input.c5));
    const intents = projectedIntents(input.model, request.presentationData);
    const history = historyProjection(input.c5);
    const mri = sanitizeG15ProjectionCopy(structuredClone(input.c5.c4.c3.c2.c1.phase3.mri));
    const sourceAuthorities = sanitizeG15ProjectionCopy({
        c5CompositionIdentity: input.c5.compositionId,
        phase3PulseIdentity: input.c5.c4.c3.c2.c1.phase3.pulse.source.semanticHash,
        phase3MriIdentity: input.c5.c4.c3.c2.c1.phase3.mri.source.semanticHash,
        phase4DecisionIdentity: input.c5.c4.c3.c2.c1.phase4?.source.derivedOutput.derivedOutputId ?? null,
        phase5JudgmentIdentity: input.c5.c4.c3.c2.c1.phase5?.judgeResultId ?? null,
        phase7AssessmentIdentity: input.c5.c4.c3.c2.c1.phase7?.assessmentId ?? null,
        g8RealityIdentity: input.c5.c4.c3.c2.g8.successor.semanticRealityIdentity,
        g9AssessmentIdentity: input.c5.c4.c3.c2.g9?.assessmentId ?? null,
        g10ProjectionIdentity: input.c5.c4.c3.g10.projectionId,
        g11AssessmentIdentity: input.c5.c4.c3.g11?.assessmentId ?? null,
        g12AssessmentIdentity: input.c5.c4.g12.assessmentId,
        g13AssessmentIdentity: input.c5.c4.g13?.assessmentId ?? null,
        g14ProjectionIdentity: input.c5.g14.projectionId,
    });
    const rawSemanticIdentityMaterial = {
        rulesetVersion: exports.G15_UNIVERSAL_PROTOCOL_PROJECTION_RULESET_VERSION,
        c5CompositionIdentity: input.c5.compositionId,
        freshness,
        materialStates: rawMaterialStates,
        nextStepIdentity: step.nextSafeMutationIdentity,
        actionRoute: route,
        lifecycle: lifecycleProjection,
        intents,
        sourceAuthorities,
    };
    const semanticVerdictIdentity = stableIdentity("hito_g15_semantic_verdict", [{ label: "governed-truth", value: rawSemanticIdentityMaterial }]);
    const partialTruth = {
        semanticVerdictIdentity,
        overallStatus: overallStatus(rawMaterialStates),
        projectScopeIdentity: sanitizeG15ProjectionText(input.model.project.projectId),
        freshnessWatermark: freshness,
        materialStates,
        materialStateGroups,
        materialStateCount: materialStates.length,
        warningsDropped: 0,
        nextStep: step,
        actionRoute: route,
        lifecycle: lifecycleProjection,
        intents,
        mri,
        history,
        sourceAuthorities,
        approximationBoundary: "HITO assesses bounded declarations, observations, evidence, authority, freshness, and semantic constraints. It does not claim omniscience or proof of arbitrary program semantics.",
    };
    const governedTruth = {
        ...partialTruth,
        check: checkProjection(input.model, input.c5, freshness, materialStates),
    };
    const projections = Object.fromEntries(exports.G15_PROJECTION_MODES.map((mode) => [mode, projectionView(mode, input.model, governedTruth)]));
    const envelopeId = stableIdentity("hito_g15_envelope", [
        { label: "semantic-verdict", value: semanticVerdictIdentity },
        { label: "projection-identities", value: exports.G15_PROJECTION_MODES.map((mode) => projections[mode].projectionId) },
    ]);
    const result = {
        kind: "HITO_G15_UNIVERSAL_PROTOCOL_PROJECTION_ENVELOPE",
        rulesetVersion: exports.G15_UNIVERSAL_PROTOCOL_PROJECTION_RULESET_VERSION,
        authority: exports.G15_UNIVERSAL_PROTOCOL_PROJECTION_AUTHORITY,
        envelopeId,
        semanticVerdictIdentity,
        governedTruth,
        projections,
        oneTruthManyProjections: true,
        modelAssistedRenderingUsed: false,
        rendererMayRewriteGovernedFields: false,
        governanceBoundary: {
            derivedOnly: true,
            readOnly: true,
            canonicalAuthority: false,
            ontologyAuthority: false,
            nextSafeMutationAuthority: false,
            realityJudgeAuthority: false,
            observationTruthAuthority: false,
            evidenceTruthAuthority: false,
            targetExecuted: false,
        },
        zeroEffectCounters: zeroEffects(),
        truthBoundary: "G15 is a universal read-only protocol projection over the exact same-call C5 authority. Modes alter presentation depth only; they cannot alter governed truth, authority, scope, freshness, protection, conflicts, unknowns, or next-step identity.",
        limitations: [
            "No canonical, ontology, evidence, observation, mutation, execution, merge, deployment, provider, network, Git, or namespace-migration authority",
            "Projection integrity neutralizes hostile presentation data only in projection copies",
            "Freshness and coverage remain bounded to the explicit upstream snapshot and observations",
            "No semantic-camouflage detection is invented when upstream semantic evidence is absent",
            "No G16 or later authority",
        ],
    };
    if ((0, contracts_1.canonicalize)(input) !== before)
        throw new Error("HITO G15 derivation mutated caller or canonical input");
    return result;
}
function selectG15Projection(envelope, mode) {
    if (envelope.kind !== "HITO_G15_UNIVERSAL_PROTOCOL_PROJECTION_ENVELOPE"
        || envelope.rulesetVersion !== exports.G15_UNIVERSAL_PROTOCOL_PROJECTION_RULESET_VERSION
        || envelope.semanticVerdictIdentity !== envelope.governedTruth.semanticVerdictIdentity) {
        throw new Error("HITO G15 projection selection rejects an invalid envelope");
    }
    if (!exports.G15_PROJECTION_MODES.includes(mode))
        throw new Error("HITO G15 projection selection rejects an invalid mode");
    const selected = envelope.projections[mode];
    if (selected.semanticVerdictIdentity !== envelope.semanticVerdictIdentity)
        throw new Error("HITO G15 projection mode disagrees with governed truth");
    return selected;
}
const node_crypto_1 = require("node:crypto");
/** Exact JSON shape gate shared by first-observation request validation only. */
function firstObservationKeys(value, keys, label) {
    if (value === null || typeof value !== "object" || Array.isArray(value)
        || Object.keys(value).sort().join("\0") !== [...keys].sort().join("\0")) {
        throw new Error(`HITO first observation rejects ${label} schema`);
    }
}
/** G15 projection over supplied documentary bytes; performs no discovery or truth promotion. */
function deriveHitoFirstObservation(request) {
    firstObservationKeys(request, ["mode", "priorState", "subjectIdentity", "documentaryEvidence"], "request");
    if (request.mode !== "FIRST_OBSERVATION" || request.priorState !== "NO_PRIOR_STATE_ADMITTED") {
        throw new Error("HITO first observation requires explicit FIRST_OBSERVATION and NO_PRIOR_STATE_ADMITTED");
    }
    if (typeof request.subjectIdentity !== "string" || !request.subjectIdentity.trim()
        || request.subjectIdentity.length > 4096 || !Array.isArray(request.documentaryEvidence)
        || request.documentaryEvidence.length > 10000)
        throw new Error("Invalid first-observation subject or evidence collection");
    const ids = new Set();
    const evidence = request.documentaryEvidence.map((item) => {
        firstObservationKeys(item, ["evidenceId", "authorityClass", "content", "provenance"], "documentary evidence");
        firstObservationKeys(item.provenance, ["subjectIdentity", "sourcePath", "contentSha256", "capturedAt"], "documentary provenance");
        if (typeof item.evidenceId !== "string" || !item.evidenceId.trim() || ids.has(item.evidenceId)
            || item.authorityClass !== "DOCUMENTARY_EVIDENCE_ONLY" || typeof item.content !== "string"
            || Buffer.byteLength(item.content, "utf8") > 1048576
            || item.provenance.subjectIdentity !== request.subjectIdentity
            || typeof item.provenance.sourcePath !== "string" || !item.provenance.sourcePath.trim()
            || typeof item.provenance.capturedAt !== "string"
            || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(item.provenance.capturedAt)
            || !Number.isFinite(Date.parse(item.provenance.capturedAt))
            || item.provenance.contentSha256 !== (0, node_crypto_1.createHash)("sha256").update(Buffer.from(item.content, "utf8")).digest("hex")) {
            throw new Error("HITO first observation rejects unbound documentary evidence or authority escalation");
        }
        ids.add(item.evidenceId);
        return structuredClone(item);
    }).sort((a, b) => (0, semantic_canonicalization_1.compareSemanticCodePoints)(a.evidenceId, b.evidenceId));
    const body = {
        kind: "HITO_FIRST_OBSERVATION_SEMANTIC_RESULT",
        version: "hito-first-observation-semantic-r1",
        mode: "FIRST_OBSERVATION",
        priorState: "NO_PRIOR_STATE_ADMITTED",
        subjectIdentity: request.subjectIdentity,
        documentaryEvidence: evidence,
        dimensions: {
            declaredIntent: "UNAVAILABLE", canonicalAuthority: "UNAVAILABLE",
            runtimeState: "UNAVAILABLE", ownership: "UNAVAILABLE",
            integration: "UNAVAILABLE", conflictAssessment: "INDETERMINATE",
            comparativeHistory: "NOT_APPLICABLE",
        },
        coverage: { state: "PARTIAL", completeUnderstanding: false,
            warning: "First observation: partial coverage. Documentary evidence does not establish intent, canonical authority, runtime, ownership, integration, or absence of conflict." },
        nextStep: { state: "NO_JUSTIFIED_NEXT_STEP", executionAuthority: false, mutatingCommand: null },
        boundary: { derivedOnly: true, canonicalAuthority: false, ontologyAuthority: false, executionAuthority: false },
    };
    return freezeFirstObservation({ ...body, semanticResultIdentity: `hito_first_observation_r1_${(0, node_crypto_1.createHash)("sha256").update((0, contracts_1.canonicalize)(body), "utf8").digest("hex")}` });
}
function freezeFirstObservation(value) {
    if (value !== null && typeof value === "object") {
        for (const child of Object.values(value))
            freezeFirstObservation(child);
        Object.freeze(value);
    }
    return value;
}
/** A caller-supplied result must exactly match the documentary projection, including every gap. */
function assertHitoFirstObservationResult(value) {
    if (!value || typeof value !== "object")
        throw new Error("Invalid first-observation result");
    const expected = deriveHitoFirstObservation({ mode: value.mode, priorState: value.priorState,
        subjectIdentity: value.subjectIdentity, documentaryEvidence: value.documentaryEvidence });
    if ((0, contracts_1.canonicalize)(value) !== (0, contracts_1.canonicalize)(expected))
        throw new Error("First-observation result identity, schema, or semantic fields drifted");
}
