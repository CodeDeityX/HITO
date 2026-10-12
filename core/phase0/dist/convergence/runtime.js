"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HITO_C7_COMPOSITION_AUTHORITY = exports.HITO_C7_COMPOSITION_RULESET_VERSION = exports.HITO_C7_COMPOSITION_CONTRACT_VERSION = exports.HITO_C6_COMPOSITION_AUTHORITY = exports.HITO_C6_COMPOSITION_RULESET_VERSION = exports.HITO_C6_COMPOSITION_CONTRACT_VERSION = exports.HITO_C5_COMPOSITION_AUTHORITY = exports.HITO_C5_COMPOSITION_RULESET_VERSION = exports.HITO_C5_COMPOSITION_CONTRACT_VERSION = exports.HITO_C4_COMPOSITION_AUTHORITY = exports.HITO_C4_COMPOSITION_RULESET_VERSION = exports.HITO_C4_COMPOSITION_CONTRACT_VERSION = exports.HITO_C3_COMPOSITION_AUTHORITY = exports.HITO_C3_COMPOSITION_RULESET_VERSION = exports.HITO_C3_COMPOSITION_CONTRACT_VERSION = exports.HITO_C2_COMPOSITION_AUTHORITY = exports.HITO_C2_COMPOSITION_RULESET_VERSION = exports.HITO_C2_COMPOSITION_CONTRACT_VERSION = exports.HITO_C1_COMPOSITION_AUTHORITY = exports.HITO_C1_COMPOSITION_RULESET_VERSION = exports.HITO_C1_COMPOSITION_CONTRACT_VERSION = void 0;
exports.composeHitoRuntime = composeHitoRuntime;
exports.readHitoRuntimeFromProjectRoot = readHitoRuntimeFromProjectRoot;
const contracts_1 = require("../contracts");
const projection_1 = require("../phase3/projection");
const decision_engine_1 = require("../phase4/decision-engine");
const reality_judge_1 = require("../phase5/reality-judge");
const projection_2 = require("../phase6/projection");
const peg_1 = require("../phase7/peg");
const g8_engineering_reality_1 = require("./g8-engineering-reality");
const g9_transition_completion_1 = require("./g9-transition-completion");
const g10_semantic_history_diff_1 = require("./g10-semantic-history-diff");
const g11_semantic_conflict_detection_1 = require("./g11-semantic-conflict-detection");
const g12_semantic_branch_merge_1 = require("./g12-semantic-branch-merge");
const g13_proof_carrying_release_1 = require("./g13-proof-carrying-release");
const g14_organism_federated_observation_1 = require("./g14-organism-federated-observation");
const g15_universal_protocol_projection_1 = require("./g15-universal-protocol-projection");
const g16_installability_migration_recovery_1 = require("./g16-installability-migration-recovery");
const semantic_canonicalization_1 = require("./semantic-canonicalization");
exports.HITO_C1_COMPOSITION_CONTRACT_VERSION = "1.0.0";
exports.HITO_C1_COMPOSITION_RULESET_VERSION = "hito-1.0-c1-composition-spine-v1";
exports.HITO_C1_COMPOSITION_AUTHORITY = "DERIVED / READ_ONLY / NON_CANONICAL / NON_EXECUTING";
exports.HITO_C2_COMPOSITION_CONTRACT_VERSION = "1.0.0";
exports.HITO_C2_COMPOSITION_RULESET_VERSION = "hito-1.0-c2-g8-g9-semantic-kernel-v1";
exports.HITO_C2_COMPOSITION_AUTHORITY = "HEADLESS ORCHESTRATION / DERIVED / READ_ONLY / NON_CANONICAL / NON_EXECUTING";
exports.HITO_C3_COMPOSITION_CONTRACT_VERSION = "1.0.0";
exports.HITO_C3_COMPOSITION_RULESET_VERSION = "hito-1.0-c3-g10-g11-history-diff-conflict-v1";
exports.HITO_C3_COMPOSITION_AUTHORITY = "HEADLESS ORCHESTRATION / DERIVED / READ_ONLY / NON_CANONICAL / NON_EXECUTING / DETECTION_NOT_RESOLUTION";
exports.HITO_C4_COMPOSITION_CONTRACT_VERSION = "1.0.0";
exports.HITO_C4_COMPOSITION_RULESET_VERSION = "hito-1.0-c4-g12-g13-branch-merge-release-v1";
exports.HITO_C4_COMPOSITION_AUTHORITY = "HEADLESS ORCHESTRATION / DERIVED / READ_ONLY / NON_CANONICAL / NON_EXECUTING / ELIGIBILITY_NOT_EXECUTION";
exports.HITO_C5_COMPOSITION_CONTRACT_VERSION = "1.0.0";
exports.HITO_C5_COMPOSITION_RULESET_VERSION = "hito-1.0-c5-g14-organism-federated-observation-v1";
exports.HITO_C5_COMPOSITION_AUTHORITY = "HEADLESS ORCHESTRATION / DERIVED / READ_ONLY / NON_CANONICAL / NON_EXECUTING / BOUNDED_OBSERVATION_ONLY";
exports.HITO_C6_COMPOSITION_CONTRACT_VERSION = "1.0.0";
exports.HITO_C6_COMPOSITION_RULESET_VERSION = "hito-1.0-c6-g15-universal-protocol-projection-v1";
exports.HITO_C6_COMPOSITION_AUTHORITY = "HEADLESS ORCHESTRATION / DERIVED / READ_ONLY / NON_CANONICAL / NON_EXECUTING / PROJECTION_ONLY";
exports.HITO_C7_COMPOSITION_CONTRACT_VERSION = "1.0.0";
exports.HITO_C7_COMPOSITION_RULESET_VERSION = "hito-1.0-c7-g16-installability-migration-recovery-v1";
exports.HITO_C7_COMPOSITION_AUTHORITY = "HEADLESS ORCHESTRATION / DERIVED / READ_ONLY / NON_CANONICAL / NONEXECUTING / BOUNDED OPERATIONAL ASSESSMENT ONLY";
const PURE_INPUT_KEYS = ["model", "phase4Request", "phase5Request", "phase7Request"];
const PERSISTED_INPUT_KEYS = ["phase4Request", "phase5Request", "phase7Request"];
const C2_PURE_INPUT_KEYS = ["model", "phase4Request", "phase5Request", "phase7Request", "g8Request", "g9Request"];
const C2_PERSISTED_INPUT_KEYS = ["phase4Request", "phase5Request", "phase7Request", "g8Request", "g9Request"];
const C2_G8_REQUEST_KEYS = ["current", "predecessor"];
const C2_PREDECESSOR_KEYS = ["model", "request"];
const C3_PURE_INPUT_KEYS = ["model", "phase4Request", "phase5Request", "phase7Request", "g8Request", "g9Request", "g10Request", "g11Request"];
const C3_PERSISTED_INPUT_KEYS = ["phase4Request", "phase5Request", "phase7Request", "g8Request", "g9Request", "g10Request", "g11Request"];
const C3_G10_REQUEST_KEYS = ["predecessorHistory", "successorHistory", "request"];
const C3_PERSISTED_G10_REQUEST_KEYS = ["predecessorHistory", "request"];
const C4_PURE_INPUT_KEYS = ["model", "phase4Request", "phase5Request", "phase7Request", "g8Request", "g9Request", "g10Request", "g11Request", "g12Request", "g13Request"];
const C4_PERSISTED_INPUT_KEYS = ["phase4Request", "phase5Request", "phase7Request", "g8Request", "g9Request", "g10Request", "g11Request", "g12Request", "g13Request"];
const C5_PURE_INPUT_KEYS = ["model", "phase4Request", "phase5Request", "phase7Request", "g8Request", "g9Request", "g10Request", "g11Request", "g12Request", "g13Request", "g14Request"];
const C5_PERSISTED_INPUT_KEYS = ["phase4Request", "phase5Request", "phase7Request", "g8Request", "g9Request", "g10Request", "g11Request", "g12Request", "g13Request", "g14Request"];
const C6_PURE_INPUT_KEYS = ["model", "phase4Request", "phase5Request", "phase7Request", "g8Request", "g9Request", "g10Request", "g11Request", "g12Request", "g13Request", "g14Request", "g15Request"];
const C6_PERSISTED_INPUT_KEYS = ["phase4Request", "phase5Request", "phase7Request", "g8Request", "g9Request", "g10Request", "g11Request", "g12Request", "g13Request", "g14Request", "g15Request"];
const C7_PURE_INPUT_KEYS = ["model", "phase4Request", "phase5Request", "phase7Request", "g8Request", "g9Request", "g10Request", "g11Request", "g12Request", "g13Request", "g14Request", "g15Request", "g16Request"];
const C7_PERSISTED_INPUT_KEYS = ["phase4Request", "phase5Request", "phase7Request", "g8Request", "g9Request", "g10Request", "g11Request", "g12Request", "g13Request", "g14Request", "g15Request", "g16Request"];
const PHASE7_REQUEST_KEYS = ["proposal", "observations", "diagnostics", "phase5Applicability"];
function assertExactKeys(value, allowed, label) {
    const unsupported = Object.keys(value).filter((key) => !allowed.includes(key)).sort();
    if (unsupported.length > 0) {
        throw new Error(`${label} rejects unsupported or precomputed authority fields: ${unsupported.join(", ")}`);
    }
}
function assertCompositionDependencies(input) {
    if (input.phase5Request !== undefined && input.phase4Request === undefined) {
        throw new Error("HITO C1 fails closed: Phase 5 requires an explicit Phase-4 request in the same composition call");
    }
    if (input.phase7Request !== undefined && input.phase4Request === undefined) {
        throw new Error("HITO C1 fails closed: Phase 7 requires an explicit Phase-4 request in the same composition call");
    }
    if (input.phase7Request === undefined)
        return;
    assertExactKeys(input.phase7Request, PHASE7_REQUEST_KEYS, "HITO C1 Phase-7 request");
    if (input.phase5Request !== undefined) {
        if (Object.hasOwn(input.phase7Request, "phase5Applicability")) {
            throw new Error("HITO C1 fails closed: caller Phase-5 applicability cannot override the same-call Phase-5 authority");
        }
        return;
    }
    if (input.phase7Request.phase5Applicability === undefined) {
        throw new Error("HITO C1 fails closed: Phase 7 without Phase 5 requires explicit Phase-5 applicability");
    }
}
function assertC2Dependencies(input) {
    if (input.g8Request === null || typeof input.g8Request !== "object") {
        throw new Error("HITO C2 requires an explicit structured G8 request");
    }
    assertExactKeys(input.g8Request, C2_G8_REQUEST_KEYS, "HITO C2 G8 request");
    if (input.g8Request.current === undefined)
        throw new Error("HITO C2 requires an explicit current G8 derivation request");
    if (input.g8Request.predecessor !== undefined) {
        if (input.g8Request.predecessor === null || typeof input.g8Request.predecessor !== "object") {
            throw new Error("HITO C2 predecessor request must be structured");
        }
        assertExactKeys(input.g8Request.predecessor, C2_PREDECESSOR_KEYS, "HITO C2 predecessor request");
    }
    if (input.g9Request !== undefined && input.g8Request.predecessor === undefined) {
        throw new Error("HITO C2 fails closed: G9 requires an explicit predecessor model/request pair for same-call G8 comparison");
    }
}
function assertC3Dependencies(input) {
    if (input.g8Request.predecessor === undefined) {
        throw new Error("HITO C3 fails closed: G10 requires an explicit predecessor model/request pair for same-call G8 comparison");
    }
    if (input.g10Request === null || typeof input.g10Request !== "object") {
        throw new Error("HITO C3 requires an explicit structured G10 request");
    }
    assertExactKeys(input.g10Request, C3_G10_REQUEST_KEYS, "HITO C3 G10 request");
    if (!Array.isArray(input.g10Request.predecessorHistory) || !Array.isArray(input.g10Request.successorHistory)) {
        throw new Error("HITO C3 requires explicit predecessor and successor canonical history collections");
    }
}
function assertC4Dependencies(input) {
    if (input.g12Request === null || typeof input.g12Request !== "object") {
        throw new Error("HITO C4 requires an explicit structured G12 request");
    }
    if (input.g13Request !== undefined && (input.g13Request === null || typeof input.g13Request !== "object")) {
        throw new Error("HITO C4 G13 request must be structured when supplied");
    }
}
function assertC5Dependencies(input) {
    if (input.g14Request === null || typeof input.g14Request !== "object") {
        throw new Error("HITO C5 requires an explicit structured G14 request");
    }
}
function assertC6Dependencies(input) {
    if (input.g15Request === null || typeof input.g15Request !== "object") {
        throw new Error("HITO C6 requires an explicit structured G15 request");
    }
}
function assertC7Dependencies(input) {
    if (input.g16Request === null || typeof input.g16Request !== "object") {
        throw new Error("HITO C7 requires an explicit structured G16 request");
    }
}
function sourceIdentity(model, phase3) {
    return `hito_c1_source_${(0, contracts_1.sha256Text)((0, contracts_1.canonicalize)({
        canonicalModelRevision: model.canonicalState.modelRevision,
        historyHead: model.canonicalState.historyHead,
        evidenceHead: model.canonicalState.evidenceHead,
        phase3PulseSemanticHash: phase3.pulse.source.semanticHash,
        phase3MriSemanticHash: phase3.mri.source.semanticHash,
        c1RulesetVersion: exports.HITO_C1_COMPOSITION_RULESET_VERSION,
    }))}`;
}
/**
 * Pure, deterministic C1 orchestration over the existing Phase 3-7 authorities.
 * It derives authority in-call and has no write, execution, provider, network, or migration path.
 */
function composeHitoC1Runtime(input) {
    if (input === null || typeof input !== "object")
        throw new Error("HITO C1 requires a structured composition input");
    assertExactKeys(input, PURE_INPUT_KEYS, "HITO C1 composition input");
    assertCompositionDependencies(input);
    const inputBefore = (0, contracts_1.canonicalize)(input);
    const phase3 = (0, projection_1.derivePhase3ProjectionBundle)(input.model);
    const phase4 = input.phase4Request === undefined
        ? undefined
        : (0, decision_engine_1.derivePhase4Decision)(input.model, input.phase4Request);
    const phase5 = phase4 === undefined || input.phase5Request === undefined
        ? undefined
        : (0, reality_judge_1.derivePhase5RealityJudge)(input.model, input.phase5Request, phase4);
    const phase6 = phase4 === undefined || phase5 === undefined || input.phase5Request === undefined
        ? undefined
        : (0, projection_2.derivePhase6ReadOnlyProjections)({
            model: input.model,
            phase4,
            phase5,
            phase5Request: input.phase5Request,
        });
    let phase7;
    if (phase4 !== undefined && input.phase7Request !== undefined) {
        const phase5Input = phase5 !== undefined && input.phase5Request !== undefined
            ? {
                state: "APPLICABLE_AUTHENTICATED_PHASE5_JUDGMENT",
                request: input.phase5Request,
                result: phase5,
            }
            : { state: input.phase7Request.phase5Applicability };
        phase7 = (0, peg_1.assessPhase7PreEffect)({
            model: input.model,
            proposal: input.phase7Request.proposal,
            phase4,
            phase5: phase5Input,
            observations: input.phase7Request.observations,
            ...(input.phase7Request.diagnostics === undefined ? {} : { diagnostics: input.phase7Request.diagnostics }),
        });
    }
    const resolvedSourceIdentity = sourceIdentity(input.model, phase3);
    const compositionId = `hito_c1_composition_${(0, contracts_1.sha256Text)((0, contracts_1.canonicalize)({
        sourceIdentity: resolvedSourceIdentity,
        c1RulesetVersion: exports.HITO_C1_COMPOSITION_RULESET_VERSION,
        phase3: {
            pulse: phase3.pulse.source.semanticHash,
            mri: phase3.mri.source.semanticHash,
        },
        phase4: phase4?.source.derivedOutput.derivedOutputId ?? "ABSENT",
        phase5: phase5?.judgeResultId ?? "ABSENT",
        phase6: phase6 === undefined ? "ABSENT" : {
            operator: phase6.operator.operatorProjectionId,
            agent: phase6.agent.agentContextId,
        },
        phase7: phase7?.assessmentId ?? "ABSENT",
    }))}`;
    const result = {
        kind: "HITO_1_0_C1_COMPOSITION_SNAPSHOT",
        contract: {
            contractVersion: exports.HITO_C1_COMPOSITION_CONTRACT_VERSION,
            rulesetVersion: exports.HITO_C1_COMPOSITION_RULESET_VERSION,
            authority: exports.HITO_C1_COMPOSITION_AUTHORITY,
        },
        compositionId,
        source: {
            sourceIdentity: resolvedSourceIdentity,
            canonicalModelRevision: input.model.canonicalState.modelRevision,
            canonicalModelIntegrityHash: input.model.canonicalState.integrity.modelHash,
            historyHead: structuredClone(input.model.canonicalState.historyHead),
            evidenceHead: structuredClone(input.model.canonicalState.evidenceHead),
        },
        rulesets: {
            c1: exports.HITO_C1_COMPOSITION_RULESET_VERSION,
            phase3: projection_1.PHASE3_RULESET_VERSION,
            phase4: phase4 === undefined ? null : decision_engine_1.PHASE4_RULESET_VERSION,
            phase5: phase5 === undefined ? null : reality_judge_1.PHASE5_RULESET_VERSION,
            phase6: phase6 === undefined ? null : projection_2.PHASE6_RULESET_VERSION,
            phase7: phase7 === undefined ? null : peg_1.PHASE7_RULESET_VERSION,
            phase7Contract: phase7 === undefined ? null : peg_1.PHASE7_CONTRACT_VERSION,
        },
        presence: {
            phase3: true,
            phase4: phase4 !== undefined,
            phase5: phase5 !== undefined,
            phase6: phase6 !== undefined,
            phase7: phase7 !== undefined,
        },
        phase3,
        ...(phase4 === undefined ? {} : { phase4 }),
        ...(phase5 === undefined ? {} : { phase5 }),
        ...(phase6 === undefined ? {} : { phase6 }),
        ...(phase7 === undefined ? {} : { phase7 }),
        laterSemanticAuthority: { g8: false, g9: false, g10Plus: false },
        zeroEffectCounters: {
            canonicalWriteCount: 0,
            governedTargetMutationCount: 0,
            targetExecutionCount: 0,
            providerModelCallCount: 0,
            networkCallCount: 0,
            namespaceMigrationCount: 0,
        },
        truthBoundary: "C1 composes existing Phase 3-7 derived authorities over one validated canonical model. It is read-only, noncanonical, nonexecuting, and grants no G8-or-later semantic authority.",
        limitations: [
            "No canonical write",
            "No target execution",
            "No provider or model call",
            "No network call",
            "No namespace migration",
            "No G8, G9, or later semantic authority",
        ],
    };
    if ((0, contracts_1.canonicalize)(input) !== inputBefore)
        throw new Error("HITO C1 composition mutated caller input");
    return result;
}
function c1InputFromC2(input) {
    return {
        model: input.model,
        ...(input.phase4Request === undefined ? {} : { phase4Request: input.phase4Request }),
        ...(input.phase5Request === undefined ? {} : { phase5Request: input.phase5Request }),
        ...(input.phase7Request === undefined ? {} : { phase7Request: input.phase7Request }),
    };
}
function composeHitoC2Runtime(input) {
    assertExactKeys(input, C2_PURE_INPUT_KEYS, "HITO C2 composition input");
    assertCompositionDependencies(input);
    assertC2Dependencies(input);
    const inputBefore = (0, contracts_1.canonicalize)(input);
    const c1 = composeHitoC1Runtime(c1InputFromC2(input));
    const successor = (0, g8_engineering_reality_1.deriveG8EngineeringRealityFromSameCallPhase3)(input.model, c1.phase3, input.g8Request.current);
    let predecessor;
    let comparison;
    if (input.g8Request.predecessor !== undefined) {
        const predecessorC1 = composeHitoC1Runtime({ model: input.g8Request.predecessor.model });
        predecessor = (0, g8_engineering_reality_1.deriveG8EngineeringRealityFromSameCallPhase3)(input.g8Request.predecessor.model, predecessorC1.phase3, input.g8Request.predecessor.request);
        comparison = (0, g8_engineering_reality_1.compareG8EngineeringReality)(predecessor, successor);
    }
    const g9 = input.g9Request === undefined
        ? undefined
        : (0, g9_transition_completion_1.assessG9SemanticTransitionCompletion)({
            predecessorModel: input.g8Request.predecessor?.model,
            successorModel: input.model,
            predecessor: predecessor,
            successor,
            comparison: comparison,
            request: input.g9Request,
            ...(c1.phase4 === undefined ? {} : { phase4: c1.phase4 }),
            ...(c1.phase5 === undefined ? {} : { phase5: c1.phase5 }),
            ...(c1.phase7 === undefined ? {} : { phase7: c1.phase7 }),
        });
    const compositionId = `hito_c2_composition_${(0, semantic_canonicalization_1.sha256LengthPrefixedFrames)([
        { label: "c2-ruleset", value: exports.HITO_C2_COMPOSITION_RULESET_VERSION },
        { label: "c1-composition", value: c1.compositionId },
        { label: "g8-successor", value: successor.derivationEnvelopeIdentity },
        { label: "g8-predecessor", value: predecessor?.derivationEnvelopeIdentity ?? "ABSENT" },
        { label: "g8-comparison", value: comparison?.comparisonId ?? "ABSENT" },
        { label: "g9-assessment", value: g9?.assessmentId ?? "ABSENT" },
    ])}`;
    const result = {
        kind: "HITO_1_0_C2_COMPOSITION_SNAPSHOT",
        contract: {
            contractVersion: exports.HITO_C2_COMPOSITION_CONTRACT_VERSION,
            rulesetVersion: exports.HITO_C2_COMPOSITION_RULESET_VERSION,
            authority: exports.HITO_C2_COMPOSITION_AUTHORITY,
        },
        compositionId,
        c1,
        rulesets: {
            c2: exports.HITO_C2_COMPOSITION_RULESET_VERSION,
            g8: g8_engineering_reality_1.G8_ENGINEERING_REALITY_RULESET_VERSION,
            g9: g9 === undefined ? null : g9_transition_completion_1.G9_TRANSITION_COMPLETION_RULESET_VERSION,
        },
        presence: { g8: true, g8Comparison: comparison !== undefined, g9: g9 !== undefined },
        g8: {
            successor,
            ...(predecessor === undefined ? {} : { predecessor }),
            ...(comparison === undefined ? {} : { comparison }),
        },
        ...(g9 === undefined ? {} : { g9 }),
        laterSemanticAuthority: { g8: true, g9: g9 !== undefined, g10Plus: false },
        zeroEffectCounters: {
            canonicalWriteCount: 0,
            governedTargetMutationCount: 0,
            targetExecutionCount: 0,
            providerModelCallCount: 0,
            networkCallCount: 0,
            namespaceMigrationCount: 0,
        },
        truthBoundary: "C2 is bounded headless orchestration. C1 remains the Phase 3-7 spine, G8 owns derived Engineering Reality semantics, and G9 owns derived transition-completion assessment.",
        limitations: [
            "No canonical RealityState or SemanticTransition",
            "No canonical write or target execution",
            "No provider/model or runtime network call",
            "No namespace migration",
            "No later convergence-stage implementation",
        ],
    };
    if ((0, contracts_1.canonicalize)(input) !== inputBefore)
        throw new Error("HITO C2 composition mutated caller input");
    return result;
}
function c2InputFromC3(input) {
    return {
        model: input.model,
        ...(input.phase4Request === undefined ? {} : { phase4Request: input.phase4Request }),
        ...(input.phase5Request === undefined ? {} : { phase5Request: input.phase5Request }),
        ...(input.phase7Request === undefined ? {} : { phase7Request: input.phase7Request }),
        g8Request: input.g8Request,
        ...(input.g9Request === undefined ? {} : { g9Request: input.g9Request }),
    };
}
function composeHitoC3Runtime(input) {
    assertExactKeys(input, C3_PURE_INPUT_KEYS, "HITO C3 composition input");
    assertCompositionDependencies(input);
    assertC2Dependencies(input);
    assertC3Dependencies(input);
    const inputBefore = (0, contracts_1.canonicalize)(input);
    const c2 = composeHitoC2Runtime(c2InputFromC3(input));
    const predecessorRequest = input.g8Request.predecessor;
    const predecessor = c2.g8.predecessor;
    const comparison = c2.g8.comparison;
    const g10 = (0, g10_semantic_history_diff_1.deriveG10SemanticHistoryDiff)({
        predecessorModel: predecessorRequest.model,
        successorModel: input.model,
        predecessorHistory: input.g10Request.predecessorHistory,
        successorHistory: input.g10Request.successorHistory,
        predecessor,
        successor: c2.g8.successor,
        comparison,
        ...(c2.g9 === undefined ? {} : { g9: c2.g9 }),
        request: input.g10Request.request,
    });
    const g11 = input.g11Request === undefined
        ? undefined
        : (0, g11_semantic_conflict_detection_1.detectG11BoundedSemanticConflict)({
            model: input.model,
            g8Successor: c2.g8.successor,
            ...(c2.g9 === undefined ? {} : { g9: c2.g9 }),
            g10,
            ...(c2.c1.phase4 === undefined ? {} : { phase4: c2.c1.phase4 }),
            request: input.g11Request,
        });
    const compositionId = `hito_c3_composition_${(0, semantic_canonicalization_1.sha256LengthPrefixedFrames)([
        { label: "c3-ruleset", value: exports.HITO_C3_COMPOSITION_RULESET_VERSION },
        { label: "c2-composition", value: c2.compositionId },
        { label: "g10-projection", value: g10.projectionId },
        { label: "g11-assessment", value: g11?.assessmentId ?? "ABSENT" },
    ])}`;
    const result = {
        kind: "HITO_1_0_C3_COMPOSITION_SNAPSHOT",
        contract: {
            contractVersion: exports.HITO_C3_COMPOSITION_CONTRACT_VERSION,
            rulesetVersion: exports.HITO_C3_COMPOSITION_RULESET_VERSION,
            authority: exports.HITO_C3_COMPOSITION_AUTHORITY,
        },
        compositionId,
        c2,
        rulesets: {
            c3: exports.HITO_C3_COMPOSITION_RULESET_VERSION,
            g10: g10_semantic_history_diff_1.G10_SEMANTIC_HISTORY_DIFF_RULESET_VERSION,
            g11: g11 === undefined ? null : g11_semantic_conflict_detection_1.G11_SEMANTIC_CONFLICT_RULESET_VERSION,
        },
        presence: { g10: true, g11: g11 !== undefined },
        g10,
        ...(g11 === undefined ? {} : { g11 }),
        laterSemanticAuthority: {
            g8: true,
            g9: c2.g9 !== undefined,
            g10: true,
            g11: g11 !== undefined,
            g12Plus: false,
        },
        zeroEffectCounters: {
            canonicalWriteCount: 0,
            governedTargetMutationCount: 0,
            targetExecutionCount: 0,
            providerModelCallCount: 0,
            networkCallCount: 0,
            namespaceMigrationCount: 0,
        },
        truthBoundary: "C3 is bounded headless orchestration. C2 remains the G8/G9 semantic kernel, G10 owns derived causal history/diff projection, and G11 detects but never resolves bounded semantic conflict.",
        limitations: [
            "No canonical SemanticHistory or SemanticDiff",
            "No second history store, revision ledger, reconciliation engine, or decision engine",
            "No conflict resolution, winner selection, branch or merge execution",
            "No canonical write, target execution, provider/model call, runtime network call, or namespace migration",
            "No G12 or later implementation",
        ],
    };
    if ((0, contracts_1.canonicalize)(input) !== inputBefore)
        throw new Error("HITO C3 composition mutated caller input");
    return result;
}
function c3InputFromC4(input) {
    return {
        model: input.model,
        ...(input.phase4Request === undefined ? {} : { phase4Request: input.phase4Request }),
        ...(input.phase5Request === undefined ? {} : { phase5Request: input.phase5Request }),
        ...(input.phase7Request === undefined ? {} : { phase7Request: input.phase7Request }),
        g8Request: input.g8Request,
        ...(input.g9Request === undefined ? {} : { g9Request: input.g9Request }),
        g10Request: input.g10Request,
        ...(input.g11Request === undefined ? {} : { g11Request: input.g11Request }),
    };
}
function composeHitoC4Runtime(input) {
    assertExactKeys(input, C4_PURE_INPUT_KEYS, "HITO C4 composition input");
    assertCompositionDependencies(input);
    assertC2Dependencies(input);
    assertC3Dependencies(input);
    assertC4Dependencies(input);
    const inputBefore = (0, contracts_1.canonicalize)(input);
    const c3 = composeHitoC3Runtime(c3InputFromC4(input));
    const predecessor = c3.c2.g8.predecessor;
    const comparison = c3.c2.g8.comparison;
    const g12 = (0, g12_semantic_branch_merge_1.assessG12SemanticBranchMerge)({
        model: input.model,
        predecessor,
        successor: c3.c2.g8.successor,
        comparison,
        ...(c3.c2.g9 === undefined ? {} : { g9: c3.c2.g9 }),
        g10: c3.g10,
        ...(c3.g11 === undefined ? {} : { g11: c3.g11 }),
        request: input.g12Request,
    });
    const g13 = input.g13Request === undefined
        ? undefined
        : (0, g13_proof_carrying_release_1.assessG13ProofCarryingRelease)({
            model: input.model,
            g8Successor: c3.c2.g8.successor,
            ...(c3.c2.g9 === undefined ? {} : { g9: c3.c2.g9 }),
            g10: c3.g10,
            ...(c3.g11 === undefined ? {} : { g11: c3.g11 }),
            g12,
            request: input.g13Request,
        });
    const compositionId = `hito_c4_composition_${(0, semantic_canonicalization_1.sha256LengthPrefixedFrames)([
        { label: "c4-ruleset", value: exports.HITO_C4_COMPOSITION_RULESET_VERSION },
        { label: "c3-composition", value: c3.compositionId },
        { label: "g12-assessment", value: g12.assessmentId },
        { label: "g13-assessment", value: g13?.assessmentId ?? "ABSENT" },
    ])}`;
    const result = {
        kind: "HITO_1_0_C4_COMPOSITION_SNAPSHOT",
        contract: {
            contractVersion: exports.HITO_C4_COMPOSITION_CONTRACT_VERSION,
            rulesetVersion: exports.HITO_C4_COMPOSITION_RULESET_VERSION,
            authority: exports.HITO_C4_COMPOSITION_AUTHORITY,
        },
        compositionId,
        c3,
        rulesets: {
            c4: exports.HITO_C4_COMPOSITION_RULESET_VERSION,
            g12: g12_semantic_branch_merge_1.G12_SEMANTIC_BRANCH_MERGE_RULESET_VERSION,
            g13: g13 === undefined ? null : g13_proof_carrying_release_1.G13_PROOF_CARRYING_RELEASE_RULESET_VERSION,
        },
        presence: { g12: true, g13: g13 !== undefined },
        g12,
        ...(g13 === undefined ? {} : { g13 }),
        laterSemanticAuthority: {
            g8: true,
            g9: c3.c2.g9 !== undefined,
            g10: true,
            g11: c3.g11 !== undefined,
            g12: true,
            g13: g13 !== undefined,
            g14Plus: false,
        },
        zeroEffectCounters: {
            canonicalWriteCount: 0,
            governedTargetMutationCount: 0,
            targetExecutionCount: 0,
            mergeExecutionCount: 0,
            deploymentExecutionCount: 0,
            providerModelCallCount: 0,
            networkCallCount: 0,
            namespaceMigrationCount: 0,
        },
        truthBoundary: "C4 is bounded headless orchestration. C3 remains the G10/G11 history/conflict layer, G12 owns candidate-only branch/merge assessment, and G13 owns proof-carrying release eligibility only.",
        limitations: [
            "No merged reality, merge execution, deployment authority, deployment execution, or deployment success",
            "No canonical write, target execution, provider/model call, runtime network call, or namespace migration",
            "G9 remains the only implemented transition-completion owner",
            "No G14 or later implementation",
        ],
    };
    if ((0, contracts_1.canonicalize)(input) !== inputBefore)
        throw new Error("HITO C4 composition mutated caller input");
    return result;
}
function c4InputFromC5(input) {
    return {
        model: input.model,
        ...(input.phase4Request === undefined ? {} : { phase4Request: input.phase4Request }),
        ...(input.phase5Request === undefined ? {} : { phase5Request: input.phase5Request }),
        ...(input.phase7Request === undefined ? {} : { phase7Request: input.phase7Request }),
        g8Request: input.g8Request,
        ...(input.g9Request === undefined ? {} : { g9Request: input.g9Request }),
        g10Request: input.g10Request,
        ...(input.g11Request === undefined ? {} : { g11Request: input.g11Request }),
        g12Request: input.g12Request,
        ...(input.g13Request === undefined ? {} : { g13Request: input.g13Request }),
    };
}
function composeHitoC5Runtime(input) {
    assertExactKeys(input, C5_PURE_INPUT_KEYS, "HITO C5 composition input");
    assertCompositionDependencies(input);
    assertC2Dependencies(input);
    assertC3Dependencies(input);
    assertC4Dependencies(input);
    assertC5Dependencies(input);
    const inputBefore = (0, contracts_1.canonicalize)(input);
    const c4 = composeHitoC4Runtime(c4InputFromC5(input));
    const g14 = (0, g14_organism_federated_observation_1.deriveG14OrganismFederatedObservation)({
        model: input.model,
        g8Successor: c4.c3.c2.g8.successor,
        ...(c4.c3.c2.g9 === undefined ? {} : { g9: c4.c3.c2.g9 }),
        g10: c4.c3.g10,
        ...(c4.c3.g11 === undefined ? {} : { g11: c4.c3.g11 }),
        g12: c4.g12,
        ...(c4.g13 === undefined ? {} : { g13: c4.g13 }),
        request: input.g14Request,
    });
    const compositionId = `hito_c5_composition_${(0, semantic_canonicalization_1.sha256LengthPrefixedFrames)([
        { label: "c5-ruleset", value: exports.HITO_C5_COMPOSITION_RULESET_VERSION },
        { label: "c4-composition", value: c4.compositionId },
        { label: "g14-projection", value: g14.projectionId },
    ])}`;
    const result = {
        kind: "HITO_1_0_C5_COMPOSITION_SNAPSHOT",
        contract: {
            contractVersion: exports.HITO_C5_COMPOSITION_CONTRACT_VERSION,
            rulesetVersion: exports.HITO_C5_COMPOSITION_RULESET_VERSION,
            authority: exports.HITO_C5_COMPOSITION_AUTHORITY,
        },
        compositionId,
        c4,
        rulesets: {
            c5: exports.HITO_C5_COMPOSITION_RULESET_VERSION,
            g14: g14_organism_federated_observation_1.G14_ORGANISM_FEDERATED_OBSERVATION_RULESET_VERSION,
        },
        presence: { g14: true },
        g14,
        laterSemanticAuthority: {
            g8: true,
            g9: c4.c3.c2.g9 !== undefined,
            g10: true,
            g11: c4.c3.g11 !== undefined,
            g12: true,
            g13: c4.g13 !== undefined,
            g14: true,
            g15Plus: false,
        },
        zeroEffectCounters: {
            canonicalWriteCount: 0,
            governedTargetMutationCount: 0,
            targetExecutionCount: 0,
            mergeExecutionCount: 0,
            deploymentExecutionCount: 0,
            providerModelCallCount: 0,
            networkCallCount: 0,
            namespaceMigrationCount: 0,
        },
        truthBoundary: "C5 is bounded headless orchestration. C4 remains the branch/merge/release eligibility layer, while G14 owns only derived organism identity, bounded federated observation, runtime-realization lineage, and territory relationship assessment.",
        limitations: [
            "No canonical OrganismIdentity, FederatedObservation, or RuntimeRealization",
            "No scalar physical truth, universal federation, cloud control plane, or deployment enforcement",
            "No canonical write, target execution, provider/model call, runtime network call, or namespace migration",
            "No G15 or later implementation",
        ],
    };
    if ((0, contracts_1.canonicalize)(input) !== inputBefore)
        throw new Error("HITO C5 composition mutated caller input");
    return result;
}
function c5InputFromC6(input) {
    return {
        model: input.model,
        ...(input.phase4Request === undefined ? {} : { phase4Request: input.phase4Request }),
        ...(input.phase5Request === undefined ? {} : { phase5Request: input.phase5Request }),
        ...(input.phase7Request === undefined ? {} : { phase7Request: input.phase7Request }),
        g8Request: input.g8Request,
        ...(input.g9Request === undefined ? {} : { g9Request: input.g9Request }),
        g10Request: input.g10Request,
        ...(input.g11Request === undefined ? {} : { g11Request: input.g11Request }),
        g12Request: input.g12Request,
        ...(input.g13Request === undefined ? {} : { g13Request: input.g13Request }),
        g14Request: input.g14Request,
    };
}
function composeHitoC6Runtime(input) {
    assertExactKeys(input, C6_PURE_INPUT_KEYS, "HITO C6 composition input");
    assertCompositionDependencies(input);
    assertC2Dependencies(input);
    assertC3Dependencies(input);
    assertC4Dependencies(input);
    assertC5Dependencies(input);
    assertC6Dependencies(input);
    const inputBefore = (0, contracts_1.canonicalize)(input);
    const c5 = composeHitoC5Runtime(c5InputFromC6(input));
    const g15 = (0, g15_universal_protocol_projection_1.deriveG15UniversalProtocolProjection)({ model: input.model, c5, request: input.g15Request });
    const compositionId = `hito_c6_composition_${(0, semantic_canonicalization_1.sha256LengthPrefixedFrames)([
        { label: "c6-ruleset", value: exports.HITO_C6_COMPOSITION_RULESET_VERSION },
        { label: "c5-composition", value: c5.compositionId },
        { label: "g15-envelope", value: g15.envelopeId },
    ])}`;
    const result = {
        kind: "HITO_1_0_C6_COMPOSITION_SNAPSHOT",
        contract: {
            contractVersion: exports.HITO_C6_COMPOSITION_CONTRACT_VERSION,
            rulesetVersion: exports.HITO_C6_COMPOSITION_RULESET_VERSION,
            authority: exports.HITO_C6_COMPOSITION_AUTHORITY,
        },
        compositionId,
        c5,
        rulesets: {
            c6: exports.HITO_C6_COMPOSITION_RULESET_VERSION,
            g15: g15_universal_protocol_projection_1.G15_UNIVERSAL_PROTOCOL_PROJECTION_RULESET_VERSION,
        },
        presence: { g15: true },
        g15,
        laterSemanticAuthority: {
            g8: true,
            g9: c5.c4.c3.c2.g9 !== undefined,
            g10: true,
            g11: c5.c4.c3.g11 !== undefined,
            g12: true,
            g13: c5.c4.g13 !== undefined,
            g14: true,
            g15: true,
            g16Plus: false,
        },
        zeroEffectCounters: {
            canonicalWriteCount: 0,
            governedTargetMutationCount: 0,
            targetExecutionCount: 0,
            mergeExecutionCount: 0,
            deploymentExecutionCount: 0,
            providerModelCallCount: 0,
            networkCallCount: 0,
            namespaceMigrationCount: 0,
            gitMutationCount: 0,
        },
        truthBoundary: "C6 is bounded headless orchestration over the exact same-call C5 snapshot. G15 owns presentation only and grants no canonical, semantic, ontology, mutation, execution, provider, network, Git, migration, or G16 authority.",
        limitations: [
            "No canonical write, target execution, merge, deployment, provider/model call, runtime network call, Git mutation, or namespace migration",
            "No browser-shell rewire, model-assisted interaction, cloud control plane, install/attach/recovery, or G16 implementation",
            "Projection modes cannot alter underlying governed truth",
        ],
    };
    if ((0, contracts_1.canonicalize)(input) !== inputBefore)
        throw new Error("HITO C6 composition mutated caller input");
    return result;
}
function c6InputFromC7(input) {
    return {
        model: input.model,
        ...(input.phase4Request === undefined ? {} : { phase4Request: input.phase4Request }),
        ...(input.phase5Request === undefined ? {} : { phase5Request: input.phase5Request }),
        ...(input.phase7Request === undefined ? {} : { phase7Request: input.phase7Request }),
        g8Request: input.g8Request,
        ...(input.g9Request === undefined ? {} : { g9Request: input.g9Request }),
        g10Request: input.g10Request,
        ...(input.g11Request === undefined ? {} : { g11Request: input.g11Request }),
        g12Request: input.g12Request,
        ...(input.g13Request === undefined ? {} : { g13Request: input.g13Request }),
        g14Request: input.g14Request,
        g15Request: input.g15Request,
    };
}
function composeHitoC7Runtime(input) {
    assertExactKeys(input, C7_PURE_INPUT_KEYS, "HITO C7 composition input");
    assertCompositionDependencies(input);
    assertC2Dependencies(input);
    assertC3Dependencies(input);
    assertC4Dependencies(input);
    assertC5Dependencies(input);
    assertC6Dependencies(input);
    assertC7Dependencies(input);
    const inputBefore = (0, contracts_1.canonicalize)(input);
    const c6 = composeHitoC6Runtime(c6InputFromC7(input));
    const g16 = (0, g16_installability_migration_recovery_1.deriveG16InstallabilityMigrationRecovery)({ model: input.model, c6, request: input.g16Request });
    const compositionId = `hito_c7_composition_${(0, semantic_canonicalization_1.sha256LengthPrefixedFrames)([
        { label: "c7-ruleset", value: exports.HITO_C7_COMPOSITION_RULESET_VERSION },
        { label: "c6-composition", value: c6.compositionId },
        { label: "g16-assessment", value: g16.assessmentId },
    ])}`;
    const result = {
        kind: "HITO_1_0_C7_COMPOSITION_SNAPSHOT",
        contract: {
            contractVersion: exports.HITO_C7_COMPOSITION_CONTRACT_VERSION,
            rulesetVersion: exports.HITO_C7_COMPOSITION_RULESET_VERSION,
            authority: exports.HITO_C7_COMPOSITION_AUTHORITY,
        },
        compositionId,
        c6,
        rulesets: {
            c7: exports.HITO_C7_COMPOSITION_RULESET_VERSION,
            g16: g16_installability_migration_recovery_1.G16_INSTALLABILITY_MIGRATION_RECOVERY_RULESET_VERSION,
        },
        presence: { g16: true },
        g16,
        laterSemanticAuthority: {
            g8: true,
            g9: c6.c5.c4.c3.c2.g9 !== undefined,
            g10: true,
            g11: c6.c5.c4.c3.g11 !== undefined,
            g12: true,
            g13: c6.c5.c4.g13 !== undefined,
            g14: true,
            g15: true,
            g16: true,
            g17Plus: false,
        },
        zeroEffectCounters: {
            realPredecessorCanonicalWrites: 0,
            isolatedFixtureHitoStateWrites: 0,
            applicationSourceMutations: 0,
            nonHitoTargetMutations: 0,
            targetCommandExecutions: 0,
            mergeExecutionCount: 0,
            deploymentExecutionCount: 0,
            providerModelRuntimeCalls: 0,
            unauthorizedNetworkCalls: 0,
            gitMutations: 0,
            hitoNamespaceCreations: 0,
            maatToHitoMigrations: 0,
        },
        truthBoundary: "C7 is bounded headless assessment over the exact same-call C6 snapshot. G16 operational modes are not ontology; C7 composes no operational write, target execution, migration, provider, network, Git, deployment, or G17 authority.",
        limitations: [
            "Operational attach and recovery writes are available only through separately explicit isolated C7 fixture adapters",
            "No application/non-HITO mutation, .hito creation, .maat-to-.hito migration, dual write, target command, deployment, provider/model call, network call, Git mutation, or external control-plane mutation",
            "No universal enforcement, OS/language/parser/compiler parity, enterprise scale, remote backup/sync, or G17 implementation",
            "C6 CLI command surface remains unchanged",
        ],
    };
    if ((0, contracts_1.canonicalize)(input) !== inputBefore)
        throw new Error("HITO C7 composition mutated caller input");
    return result;
}
function composeHitoRuntime(input) {
    if (input === null || typeof input !== "object")
        throw new Error("HITO composition requires a structured input");
    if (Object.hasOwn(input, "g16Request"))
        return composeHitoC7Runtime(input);
    if (Object.hasOwn(input, "g15Request"))
        return composeHitoC6Runtime(input);
    if (Object.hasOwn(input, "g14Request"))
        return composeHitoC5Runtime(input);
    if (Object.hasOwn(input, "g12Request"))
        return composeHitoC4Runtime(input);
    if (Object.hasOwn(input, "g10Request"))
        return composeHitoC3Runtime(input);
    if (Object.hasOwn(input, "g8Request"))
        return composeHitoC2Runtime(input);
    return composeHitoC1Runtime(input);
}
async function readHitoRuntimeFromProjectRoot(projectRoot, input = {}) {
    if (input === null || typeof input !== "object")
        throw new Error("HITO composition requires a structured persisted input");
    if (Object.hasOwn(input, "g16Request")) {
        assertExactKeys(input, C7_PERSISTED_INPUT_KEYS, "HITO C7 persisted composition input");
        const g10Request = input.g10Request;
        if (g10Request === null || typeof g10Request !== "object")
            throw new Error("HITO C7 requires a structured persisted G10 request");
        assertExactKeys(g10Request, C3_PERSISTED_G10_REQUEST_KEYS, "HITO C7 persisted G10 request");
    }
    else if (Object.hasOwn(input, "g15Request")) {
        assertExactKeys(input, C6_PERSISTED_INPUT_KEYS, "HITO C6 persisted composition input");
        const g10Request = input.g10Request;
        if (g10Request === null || typeof g10Request !== "object")
            throw new Error("HITO C6 requires a structured persisted G10 request");
        assertExactKeys(g10Request, C3_PERSISTED_G10_REQUEST_KEYS, "HITO C6 persisted G10 request");
    }
    else if (Object.hasOwn(input, "g14Request")) {
        assertExactKeys(input, C5_PERSISTED_INPUT_KEYS, "HITO C5 persisted composition input");
        const g10Request = input.g10Request;
        if (g10Request === null || typeof g10Request !== "object")
            throw new Error("HITO C5 requires a structured persisted G10 request");
        assertExactKeys(g10Request, C3_PERSISTED_G10_REQUEST_KEYS, "HITO C5 persisted G10 request");
    }
    else if (Object.hasOwn(input, "g12Request")) {
        assertExactKeys(input, C4_PERSISTED_INPUT_KEYS, "HITO C4 persisted composition input");
        const g10Request = input.g10Request;
        if (g10Request === null || typeof g10Request !== "object")
            throw new Error("HITO C4 requires a structured persisted G10 request");
        assertExactKeys(g10Request, C3_PERSISTED_G10_REQUEST_KEYS, "HITO C4 persisted G10 request");
    }
    else if (Object.hasOwn(input, "g10Request")) {
        assertExactKeys(input, C3_PERSISTED_INPUT_KEYS, "HITO C3 persisted composition input");
        const g10Request = input.g10Request;
        if (g10Request === null || typeof g10Request !== "object")
            throw new Error("HITO C3 requires a structured persisted G10 request");
        assertExactKeys(g10Request, C3_PERSISTED_G10_REQUEST_KEYS, "HITO C3 persisted G10 request");
    }
    else if (Object.hasOwn(input, "g8Request")) {
        assertExactKeys(input, C2_PERSISTED_INPUT_KEYS, "HITO C2 persisted composition input");
    }
    else {
        assertExactKeys(input, PERSISTED_INPUT_KEYS, "HITO C1 persisted composition input");
    }
    const persisted = await (0, contracts_1.readCanonicalRevisionValidated)(projectRoot);
    if (Object.hasOwn(input, "g16Request")) {
        const c7 = input;
        return composeHitoRuntime({
            ...c7,
            model: persisted.model,
            g10Request: {
                predecessorHistory: c7.g10Request.predecessorHistory,
                successorHistory: persisted.history,
                request: c7.g10Request.request,
            },
        });
    }
    if (Object.hasOwn(input, "g15Request")) {
        const c6 = input;
        return composeHitoRuntime({
            ...c6,
            model: persisted.model,
            g10Request: {
                predecessorHistory: c6.g10Request.predecessorHistory,
                successorHistory: persisted.history,
                request: c6.g10Request.request,
            },
        });
    }
    if (Object.hasOwn(input, "g14Request")) {
        const c5 = input;
        return composeHitoRuntime({
            ...c5,
            model: persisted.model,
            g10Request: {
                predecessorHistory: c5.g10Request.predecessorHistory,
                successorHistory: persisted.history,
                request: c5.g10Request.request,
            },
        });
    }
    if (Object.hasOwn(input, "g12Request")) {
        const c4 = input;
        return composeHitoRuntime({
            ...c4,
            model: persisted.model,
            g10Request: {
                predecessorHistory: c4.g10Request.predecessorHistory,
                successorHistory: persisted.history,
                request: c4.g10Request.request,
            },
        });
    }
    if (Object.hasOwn(input, "g10Request")) {
        const c3 = input;
        return composeHitoRuntime({
            ...c3,
            model: persisted.model,
            g10Request: {
                predecessorHistory: c3.g10Request.predecessorHistory,
                successorHistory: persisted.history,
                request: c3.g10Request.request,
            },
        });
    }
    return Object.hasOwn(input, "g8Request")
        ? composeHitoRuntime({ ...input, model: persisted.model })
        : composeHitoRuntime({ ...input, model: persisted.model });
}
