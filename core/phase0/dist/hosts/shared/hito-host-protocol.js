"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HITO_FIRST_OBSERVATION_HOST_VERSION = exports.HITO_PRE_C9_HOST_AUTHORITY = exports.HITO_PRE_C9_HOST_PROTOCOL_VERSION = void 0;
exports.assertHitoHostC7Snapshot = assertHitoHostC7Snapshot;
exports.projectHitoHostProtocol = projectHitoHostProtocol;
exports.projectHitoFirstObservationHost = projectHitoFirstObservationHost;
const contracts_1 = require("../../contracts");
const g15_universal_protocol_projection_1 = require("../../convergence/g15-universal-protocol-projection");
const g16_installability_migration_recovery_1 = require("../../convergence/g16-installability-migration-recovery");
exports.HITO_PRE_C9_HOST_PROTOCOL_VERSION = "hito-pre-c9-host-protocol-v1";
exports.HITO_PRE_C9_HOST_AUTHORITY = "DERIVED / DETERMINISTIC / READ_ONLY / NON_CANONICAL / NONEXECUTING / HOST_PROJECTION_ONLY";
const C7_SNAPSHOT_KEYS = [
    "kind",
    "contract",
    "compositionId",
    "c6",
    "rulesets",
    "presence",
    "g16",
    "laterSemanticAuthority",
    "zeroEffectCounters",
    "truthBoundary",
    "limitations",
];
function isRecord(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}
function invariant(condition, message) {
    if (!condition)
        throw new Error(`HITO pre-C9 host rejected input: ${message}`);
}
function assertExactKeys(value, allowed, label) {
    const unsupported = Object.keys(value).filter((key) => !allowed.includes(key)).sort();
    invariant(unsupported.length === 0, `${label} rejects unsupported or precomputed authority fields: ${unsupported.join(", ")}`);
}
function assertZeroRecord(value, label) {
    invariant(isRecord(value), `${label} must be a structured zero-effect record`);
    for (const [name, count] of Object.entries(value))
        invariant(count === 0, `${label}.${name} must remain zero`);
}
function source(sourcePath, sourceAuthority, sourceIdentity, presentationTransform = "NONE") {
    return { sourcePath, sourceAuthority, sourceIdentity, presentationTransform };
}
function field(value, provenance) {
    return { value, provenance, semanticAuthority: false, executionAuthority: false };
}
function clone(value) {
    return structuredClone(value);
}
function deepFreeze(value) {
    if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
        Object.freeze(value);
        for (const nested of Object.values(value))
            deepFreeze(nested);
    }
    return value;
}
/**
 * Validates only source binding and zero-effect invariants. Semantic decisions
 * remain owned by the existing C7/G15/G16 runtime and are never recomputed here.
 */
function assertHitoHostC7Snapshot(value) {
    invariant(isRecord(value), "an exact structured C7 snapshot is required");
    assertExactKeys(value, C7_SNAPSHOT_KEYS, "C7 snapshot");
    const snapshot = value;
    invariant(snapshot.kind === "HITO_1_0_C7_COMPOSITION_SNAPSHOT", "C7 snapshot kind mismatch");
    invariant(snapshot.c6.kind === "HITO_1_0_C6_COMPOSITION_SNAPSHOT", "same-call C6 snapshot is missing");
    invariant(snapshot.c6.g15.kind === "HITO_G15_UNIVERSAL_PROTOCOL_PROJECTION_ENVELOPE", "G15 envelope kind mismatch");
    invariant(snapshot.g16.kind === "HITO_G16_INSTALLABILITY_MIGRATION_RECOVERY_ASSESSMENT", "G16 assessment kind mismatch");
    invariant(snapshot.c6.g15.semanticVerdictIdentity === snapshot.c6.g15.governedTruth.semanticVerdictIdentity, "G15 governed truth identity mismatch");
    invariant(snapshot.g16.sourceAuthorities.c6CompositionIdentity === snapshot.c6.compositionId, "G16 is not bound to the same C6 composition");
    invariant(snapshot.g16.sourceAuthorities.g15EnvelopeIdentity === snapshot.c6.g15.envelopeId, "G16 is not bound to the same G15 envelope");
    invariant(snapshot.g16.sourceAuthorities.g15SemanticVerdictIdentity === snapshot.c6.g15.semanticVerdictIdentity, "G16 semantic continuity disagrees with G15");
    invariant(snapshot.g16.reconciliation.acceptedSemanticContinuityIdentity === snapshot.c6.g15.semanticVerdictIdentity, "G16 reconciliation continuity disagrees with G15");
    invariant((0, contracts_1.canonicalize)(snapshot.g16.reconciliation.nextGovernanceStep) === (0, contracts_1.canonicalize)(snapshot.c6.g15.governedTruth.nextStep), "G16 next governance step is not exact G15/Phase4 authority");
    invariant(snapshot.c6.g15.governedTruth.materialStateCount === snapshot.c6.g15.governedTruth.materialStates.length, "G15 material-state count mismatch");
    invariant(snapshot.c6.g15.governedTruth.warningsDropped === 0, "G15 warnings were dropped");
    invariant(snapshot.c6.g15.governedTruth.lifecycle.percentagesUsed === false, "completion percentages are forbidden");
    invariant(snapshot.g16.operationalMode.classification === "OPERATIONAL_MODE_NOT_ONTOLOGY", "G16 operational mode became ontology");
    invariant(g16_installability_migration_recovery_1.G16_OPERATIONAL_MODES.includes(snapshot.g16.operationalMode.effective), "G16 operational mode is invalid");
    invariant(snapshot.g16.attach.liveCanonicalNamespace === ".maat/", ".maat canonical namespace drifted");
    invariant(snapshot.g16.migration.executionAuthorized === false && snapshot.g16.migration.hitoNamespaceCreationAuthorized === false, "migration or .hito creation authority was introduced");
    invariant(snapshot.g16.migration.migrationCompleted === false, "namespace migration was fabricated");
    invariant(snapshot.laterSemanticAuthority.g17Plus === false, "G17-or-later authority is forbidden");
    assertZeroRecord(snapshot.zeroEffectCounters, "C7 snapshot effects");
    assertZeroRecord(snapshot.c6.g15.zeroEffectCounters, "G15 projection effects");
    assertZeroRecord(snapshot.g16.zeroEffectCounters, "G16 assessment effects");
    for (const mode of g15_universal_protocol_projection_1.G15_PROJECTION_MODES) {
        const view = (0, g15_universal_protocol_projection_1.selectG15Projection)(snapshot.c6.g15, mode);
        invariant(view.hiddenMaterialStateCount === 0 && view.warningsDropped === 0, `${mode} hides material state`);
        invariant(view.semanticVerdictIdentity === snapshot.c6.g15.semanticVerdictIdentity, `${mode} semantic truth disagrees`);
    }
}
/** Mechanical host projection over an already-composed, same-call C7 snapshot. */
function projectHitoHostProtocol(snapshot, mode) {
    assertHitoHostC7Snapshot(snapshot);
    invariant(g15_universal_protocol_projection_1.G15_PROJECTION_MODES.includes(mode), `unsupported presentation mode ${String(mode)}`);
    const before = (0, contracts_1.canonicalize)(snapshot);
    const envelope = snapshot.c6.g15;
    const truth = envelope.governedTruth;
    const view = (0, g15_universal_protocol_projection_1.selectG15Projection)(envelope, mode);
    const phase3 = snapshot.c6.c5.c4.c3.c2.c1.phase3;
    const safePulse = (0, g15_universal_protocol_projection_1.sanitizeG15ProjectionCopy)(clone(phase3.pulse));
    const safeG16 = (0, g15_universal_protocol_projection_1.sanitizeG15ProjectionCopy)(clone(snapshot.g16));
    const protectedAuthorities = clone(truth.materialStates.filter((item) => item.category === "PROTECTED_AUTHORITY"));
    const coverageMaterialStates = clone(truth.materialStates.filter((item) => item.category === "OBSERVATION_COVERAGE_LIMIT"));
    const history = (0, g15_universal_protocol_projection_1.sanitizeG15ProjectionCopy)(clone(truth.history));
    const g15Source = source("snapshot.c6.g15.governedTruth", envelope.authority, envelope.semanticVerdictIdentity);
    const g16Source = source("snapshot.g16", snapshot.g16.authority, snapshot.g16.assessmentId, "G15_SANITIZED_COPY");
    const phase3PulseSource = source("snapshot.c6.c5.c4.c3.c2.c1.phase3.pulse", "PHASE3_DERIVED_OUTPUT", phase3.pulse.source.semanticHash, "G15_SANITIZED_COPY");
    const phase3MriSource = source("snapshot.c6.g15.governedTruth.mri", envelope.authority, phase3.mri.source.semanticHash);
    const viewSource = source(`snapshot.c6.g15.projections.${mode}`, envelope.authority, view.projectionId);
    const result = {
        kind: "HITO_PRE_C9_HOST_PROTOCOL_PROJECTION",
        protocolVersion: exports.HITO_PRE_C9_HOST_PROTOCOL_VERSION,
        authority: exports.HITO_PRE_C9_HOST_AUTHORITY,
        mode,
        source: {
            c7CompositionIdentity: snapshot.compositionId,
            c6CompositionIdentity: snapshot.c6.compositionId,
            g15EnvelopeIdentity: envelope.envelopeId,
            semanticVerdictIdentity: envelope.semanticVerdictIdentity,
            g16AssessmentIdentity: snapshot.g16.assessmentId,
            phase3PulseIdentity: phase3.pulse.source.semanticHash,
            phase3MriIdentity: phase3.mri.source.semanticHash,
            selectedViewIdentity: view.projectionId,
        },
        projectPulse: field({
            phase3Pulse: safePulse,
            status: truth.overallStatus,
            currentClaim: clone(view.currentClaim),
            materialStateGroups: clone(view.materialStateGroups),
            materialStateCount: view.materialStateCount,
            answers: clone(view.answers),
        }, [phase3PulseSource, g15Source, viewSource]),
        next: field({
            nextStep: clone(truth.nextStep),
            actionRoute: clone(truth.actionRoute),
            explanation: view.answers.whatNext,
            mutatingCommand: null,
        }, [source("snapshot.c6.g15.governedTruth.nextStep", envelope.authority, truth.nextStep.nextSafeMutationIdentity), viewSource]),
        why: field({
            explanation: view.answers.why,
            materialStateGroups: clone(view.materialStateGroups),
            materialStates: clone(truth.materialStates),
            semanticVerdictIdentity: truth.semanticVerdictIdentity,
        }, [g15Source, viewSource]),
        mri: field(clone(truth.mri), [phase3MriSource]),
        history: field(history, [source("snapshot.c6.g15.governedTruth.history", envelope.authority, truth.history.sourceProjectionId, "G15_SANITIZED_COPY")]),
        evidence: field({
            phase3EvidenceClasses: clone(safePulse.evidence),
            checks: clone(truth.check),
            evidenceHead: clone(truth.freshnessWatermark.evidenceHead),
            evidenceApplicability: truth.freshnessWatermark.evidenceApplicability,
        }, [phase3PulseSource, source("snapshot.c6.g15.governedTruth.check", envelope.authority, truth.semanticVerdictIdentity)]),
        protectedAuthorities: field(protectedAuthorities, [source("snapshot.c6.g15.governedTruth.materialStates[category=PROTECTED_AUTHORITY]", envelope.authority, truth.semanticVerdictIdentity, "EXACT_TYPED_SUBSET")]),
        runtimeState: field({
            phase3Runtime: clone(safePulse.runtime),
            operationalMode: clone(safeG16.operationalMode),
            discovery: clone(safeG16.discovery),
            reconciliation: clone(safeG16.reconciliation),
            compatibility: clone(safeG16.compatibility),
            migration: clone(safeG16.migration),
        }, [phase3PulseSource, g16Source]),
        freshness: field(clone(truth.freshnessWatermark), [source("snapshot.c6.g15.governedTruth.freshnessWatermark", envelope.authority, truth.freshnessWatermark.watermarkId)]),
        coverage: field({
            observationCoverage: truth.freshnessWatermark.observationCoverage,
            observationApplicability: truth.freshnessWatermark.observationApplicability,
            evidenceApplicability: truth.freshnessWatermark.evidenceApplicability,
            coverageMaterialStates,
            support: clone(safeG16.support),
            enforcementCoverage: clone(safeG16.enforcementCoverage),
        }, [g15Source, g16Source]),
        intentProvenance: field({
            governedAndPresentedIntents: clone(truth.intents),
            extractedIntentCandidates: clone(safeG16.discovery.observation?.extractedIntentCandidates ?? []),
            declaredIntentImported: false,
        }, [source("snapshot.c6.g15.governedTruth.intents", envelope.authority, truth.semanticVerdictIdentity), g16Source]),
        uxAnswers: clone(view.answers),
        governanceBoundary: {
            hostNeutral: true,
            derivedOnly: true,
            readOnly: true,
            canonicalAuthority: false,
            ontologyAuthority: false,
            nextStepAuthority: false,
            realityJudgeAuthority: false,
            executionAuthority: false,
            browserDependency: false,
            modelProviderDependency: false,
        },
        zeroEffectCounters: {
            canonicalWrites: 0,
            hitoStateWrites: 0,
            targetMutations: 0,
            targetExecutions: 0,
            providerModelCalls: 0,
            unauthorizedNetworkCalls: 0,
            gitMutations: 0,
            hitoNamespaceCreations: 0,
            namespaceMigrations: 0,
        },
    };
    invariant((0, contracts_1.canonicalize)(snapshot) === before, "host projection mutated the C7 snapshot");
    return deepFreeze(result);
}
const g15_universal_protocol_projection_2 = require("../../convergence/g15-universal-protocol-projection");
exports.HITO_FIRST_OBSERVATION_HOST_VERSION = "hito-first-observation-host-r1";
function projectHitoFirstObservationHost(result) {
    (0, g15_universal_protocol_projection_2.assertHitoFirstObservationResult)(result);
    return {
        kind: "HITO_FIRST_OBSERVATION_HOST_PAYLOAD",
        version: exports.HITO_FIRST_OBSERVATION_HOST_VERSION,
        mode: "FIRST_OBSERVATION",
        priorState: "NO_PRIOR_STATE_ADMITTED",
        semanticResult: structuredClone(result),
        source: { semanticResultIdentity: result.semanticResultIdentity, subjectIdentity: result.subjectIdentity },
        boundary: { derivedOnly: true, canonicalAuthority: false, ontologyAuthority: false, executionAuthority: false },
    };
}
