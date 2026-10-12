import { createHash } from "node:crypto";
import type {
  CanonicalModel,
  Capability,
  EvidenceManifest,
  EntityProvenance,
  HistoryEvent,
  PersistenceSnapshot,
  RuntimeHome,
} from "../contracts";
import {
  buildHistoryEvent,
  cloneWithModelHash,
  computeEvidenceManifestHash,
  prepareCanonicalRevision,
} from "../contracts";

export const FIXTURE_TIMESTAMP = "2026-08-19T00:00:00.000Z";
export const FIXTURE_EVIDENCE_PATH = "phase0/fixtures/phase0-evidence-artifact.txt";
export const FIXTURE_EVIDENCE_BYTES = "MAAT_PHASE_0_FIXTURE_EVIDENCE\n";
export const FIXTURE_EVIDENCE_HASH = `sha256:${createHash("sha256").update(FIXTURE_EVIDENCE_BYTES, "utf8").digest("hex")}`;

export function fixtureProvenance(source: string, observationClass: EntityProvenance["observationClass"] = "RECONCILED"): EntityProvenance {
  return {
    observationClass,
    source,
    confidence: 1,
    observedAt: FIXTURE_TIMESTAMP,
    modelRevision: 1,
  };
}

function runtimeHome(runtimeHomeId: string, capabilityId: string, locator: string, entryPoints: string[]): RuntimeHome {
  return {
    runtimeHomeId,
    capabilityId,
    kind: "MODULE",
    locator,
    entryPoints,
    effectiveFromRevision: 1,
    status: "LIVE",
    provenance: fixtureProvenance("phase0:fixture:runtime-home", "EXPLICIT"),
  };
}

export function createMinimalModel(): CanonicalModel {
  const provenance = fixtureProvenance("phase0:fixture", "EXPLICIT");
  const projectId = "project_maat_phase0";
  const promiseId = "promise_phase0";
  const requirementId = "requirement_phase0";
  const phaseId = "phase_0";
  const subsystemId = "subsystem_constitution";
  const capabilities: Capability[] = [
    {
      capabilityId: "cap_schema_contract",
      name: "Canonical Schema Contract",
      purpose: "Define and validate MAAT canonical engineering truth.",
      questionAnswered: "What canonical facts can MAAT represent and validate?",
      promiseIds: [promiseId],
      requirementIds: [requirementId],
      owningSubsystemId: subsystemId,
      runtimeHomeId: "runtime_phase0_schema",
      runtimeGap: false,
      historicalRuntimeHomeIds: [],
      implementationRefs: ["phase0/contracts/model.ts", "phase0/contracts/validation.ts", "phase0/contracts/canonical-model.schema.json"],
      dependencies: [],
      dependents: ["cap_verification_contract"],
      lifecycleStatus: "LIVE",
      health: "HEALTHY",
      verificationState: "TEST_VERIFIED",
      runtimeTruthLevel: "TEST_VERIFIED",
      evidenceIds: ["evidence_phase0_fixture"],
      claimBoundary: "Canonical contract and deterministic validation only; no repository scan or UI behavior.",
      phaseId,
      lineageEventIds: ["lineage_schema_introduced"],
      derivedOutputRefs: [],
      aliases: [],
      provenance,
    },
    {
      capabilityId: "cap_persistence_contract",
      name: "Canonical Persistence Contract",
      purpose: "Persist canonical state with deterministic integrity, atomicity, recovery, and divergence handling.",
      questionAnswered: "How does MAAT preserve canonical state without silent loss or corruption?",
      promiseIds: [promiseId],
      requirementIds: [requirementId],
      owningSubsystemId: subsystemId,
      runtimeHomeId: "runtime_phase0_persistence",
      runtimeGap: false,
      historicalRuntimeHomeIds: [],
      implementationRefs: ["phase0/contracts/persistence.ts", "phase0/contracts/utils.ts"],
      dependencies: ["cap_schema_contract"],
      dependents: ["cap_verification_contract"],
      lifecycleStatus: "LIVE",
      health: "HEALTHY",
      verificationState: "TEST_VERIFIED",
      runtimeTruthLevel: "TEST_VERIFIED",
      evidenceIds: ["evidence_phase0_fixture"],
      claimBoundary: "Canonical persistence primitives and fixtures only; no external repository mutation.",
      phaseId,
      lineageEventIds: ["lineage_persistence_introduced"],
      derivedOutputRefs: [],
      aliases: [],
      provenance,
    },
    {
      capabilityId: "cap_security_contract",
      name: "Local Security Contract",
      purpose: "Define fail-closed local API, permission, session, CSRF, origin, and root-confinement boundaries.",
      questionAnswered: "What may Phase 0 trust or permit locally?",
      promiseIds: [promiseId],
      requirementIds: [requirementId],
      owningSubsystemId: subsystemId,
      runtimeHomeId: "runtime_phase0_security",
      runtimeGap: false,
      historicalRuntimeHomeIds: [],
      implementationRefs: ["phase0/contracts/security.ts"],
      dependencies: ["cap_schema_contract"],
      dependents: ["cap_verification_contract"],
      lifecycleStatus: "LIVE",
      health: "HEALTHY",
      verificationState: "TEST_VERIFIED",
      runtimeTruthLevel: "TEST_VERIFIED",
      evidenceIds: ["evidence_phase0_fixture"],
      claimBoundary: "Security policy contract only; no network, cloud, connector, or project-write behavior.",
      phaseId,
      lineageEventIds: ["lineage_security_introduced"],
      derivedOutputRefs: [],
      aliases: [],
      provenance,
    },
    {
      capabilityId: "cap_verification_contract",
      name: "Phase 0 Verification Contract",
      purpose: "Generate deterministic fixtures and evidence that prove the bounded Phase 0 contract surface.",
      questionAnswered: "What evidence is sufficient to evaluate this phase without overclaiming runtime behavior?",
      promiseIds: [promiseId],
      requirementIds: [requirementId],
      owningSubsystemId: subsystemId,
      runtimeHomeId: "runtime_phase0_verification",
      runtimeGap: false,
      historicalRuntimeHomeIds: [],
      implementationRefs: ["phase0/tests/run-tests.ts", "phase0/fixtures/factory.ts", "phase0/tools/generate-fixture.ts"],
      dependencies: ["cap_schema_contract", "cap_persistence_contract", "cap_security_contract"],
      dependents: [],
      lifecycleStatus: "LIVE",
      health: "HEALTHY",
      verificationState: "TEST_VERIFIED",
      runtimeTruthLevel: "TEST_VERIFIED",
      evidenceIds: ["evidence_phase0_fixture"],
      claimBoundary: "Deterministic contract evidence only; no real-project scan or consumer UI proof.",
      phaseId,
      lineageEventIds: ["lineage_verification_introduced"],
      derivedOutputRefs: [],
      aliases: [],
      provenance,
    },
  ];

  const intentProof = {
    proofId: "proof_intent_phase0_owner",
    kind: "OWNER_CONFIRMATION" as const,
    confirmedBy: "MAAT_TASK_1A_AUTHORIZED_DIRECTIVE",
    confirmedAt: FIXTURE_TIMESTAMP,
    sourceRecordId: "PHASE_0_LOCK_REPAIR_MUTATION_ENVELOPE",
    lineageEventIds: ["event_intent_confirmed"],
  };

  const model: CanonicalModel = {
    schemaVersion: "0.1.0",
    project: {
      projectId,
      name: "MAAT Phase 0",
      root: ".",
      projectType: "typescript-node-package",
      health: "HEALTHY",
      provenance,
    },
    intent: [{
      promiseId,
      projectId,
      statement: "Represent and validate MAAT canonical engineering truth deterministically.",
      authority: "DECLARED_INTENT",
      requirements: [requirementId],
      constraints: ["Phase 0 only", "No scanner implementation", "No UI", "No external mutation"],
      authorityProof: intentProof,
      provenance,
    }],
    releaseContract: "Phase 0 contract suite passes with evidence; no later-phase behavior is claimed.",
    requirements: [{
      requirementId,
      promiseId,
      statement: "Validate canonical entities, lineage, persistence, evidence integrity, and authority boundaries.",
      phaseId,
      capabilityIds: capabilities.map((capability) => capability.capabilityId),
      provenance,
    }],
    phases: [{
      phaseId,
      projectId,
      name: "Constitution and Canonical Schema Contract",
      status: "IMPLEMENTING",
      capabilityIds: capabilities.map((capability) => capability.capabilityId),
      entryCriteria: ["Task 0 locked", "Task 1A repair directive authorized"],
      exitCriteria: ["All Phase 0 original and adversarial tests and evidence pass"],
      lockVerdict: "AWAITING_INDEPENDENT_LOCK_REVIEW",
      provenance,
    }],
    subsystems: [{
      subsystemId,
      projectId,
      name: "Constitution & Canonical Schema",
      responsibility: "Own the canonical model, invariants, truth boundaries, persistence, security contracts, and Phase 0 evidence.",
      capabilityIds: capabilities.map((capability) => capability.capabilityId),
      provenance,
    }],
    capabilities,
    runtimeHomes: [
      runtimeHome("runtime_phase0_schema", "cap_schema_contract", "phase0/contracts", ["model.ts", "validation.ts", "canonical-model.schema.json"]),
      runtimeHome("runtime_phase0_persistence", "cap_persistence_contract", "phase0/contracts", ["persistence.ts", "utils.ts"]),
      runtimeHome("runtime_phase0_security", "cap_security_contract", "phase0/contracts", ["security.ts"]),
      runtimeHome("runtime_phase0_verification", "cap_verification_contract", "phase0/tests", ["run-tests.ts"]),
    ],
    interfaces: [],
    edges: [],
    configurationItems: ["package.json", "pnpm-lock.yaml", "phase0/package.json", "phase0/tsconfig.json"],
    claims: capabilities.map((capability) => ({
      claimId: `claim_${capability.capabilityId}`,
      subjectId: capability.capabilityId,
      statement: `${capability.name} is implemented within the bounded Phase 0 contract scope.`,
      location: capability.implementationRefs[0],
      claimType: "PHASE_0_IMPLEMENTATION",
      promiseId,
      capabilityId: capability.capabilityId,
      audience: "MAAT lock reviewer",
      environment: "sandbox",
      evidenceRequirement: "Named deterministic tests and fixture validation.",
      truthBoundary: capability.claimBoundary,
      limitations: ["No real repository scan", "No UI proof", "No later-phase runtime claim"],
      status: "PARTIALLY_PROVEN",
      requiredAction: "Independent lock review before Phase 1.",
      evidenceIds: ["evidence_phase0_fixture"],
      provenance,
    })),
    evidenceRefs: [{
      evidenceId: "evidence_phase0_fixture",
      subjectId: "cap_verification_contract",
      source: "phase0:deterministic-fixture",
      environment: "sandbox",
      artifactPath: FIXTURE_EVIDENCE_PATH,
      verificationLevel: "TEST_VERIFIED",
      capturedAt: FIXTURE_TIMESTAMP,
      contentHash: FIXTURE_EVIDENCE_HASH,
      available: true,
      truthBoundary: "Fixture bytes and contract evidence only; not proof of real-project runtime behavior.",
      reproducibility: "Regenerated from phase0/fixtures/factory.ts and phase0/fixtures/phase0-evidence-artifact.txt.",
      provenance,
    }],
    releaseGates: [{
      gateId: "gate_phase0",
      name: "Phase 0 contract gate",
      criterion: "All required Phase 0 original and adversarial contract tests pass.",
      status: "UNKNOWN",
      evidenceIds: ["evidence_phase0_fixture"],
      blocker: true,
      promiseIds: [promiseId],
      provenance,
    }],
    derivedOutputRefs: [],
    findingRefs: [],
    findingGovernance: [],
    scans: [],
    decisions: [
      {
        decisionId: "decision_intent_phase0",
        context: "Task 1A authorized Phase 0 repair",
        options: ["Begin later-phase scanning", "Repair Phase 0 contracts only"],
        selectedOutcome: "Repair Phase 0 contracts only",
        rationale: "The authorized directive explicitly excludes Phase 1 and later capabilities.",
        affectedEntityIds: [phaseId, ...capabilities.map((capability) => capability.capabilityId)],
        effectiveRevision: 1,
        provenance,
      },
      {
        decisionId: "decision_self_governance_phase0",
        context: "MAAT must govern its own Phase 0 mutation",
        options: ["Treat code existence as completion", "Require explicit evidence and lock review"],
        selectedOutcome: "Require explicit evidence and lock review",
        rationale: "Runtime evidence and independent lock review remain required before Phase 1.",
        affectedEntityIds: [phaseId, "gate_phase0"],
        effectiveRevision: 1,
        provenance,
      },
    ],
    mutations: [{
      mutationId: "MAAT-TASK-1A-001",
      reason: "Close adversarial Phase 0 contract gaps without expanding scope.",
      affectedEntityIds: [phaseId, ...capabilities.map((capability) => capability.capabilityId)],
      expectedEffect: "Phase 0 canonical contracts reject malformed, stale, divergent, unsafe, and non-reproducible states.",
      proposal: "Repair existing Phase 0 implementation in place and add adversarial tests.",
      risk: "Overclaiming Phase 0 as a real-project runtime proof.",
      rollbackPath: "Quarantine the repair revision and restore the previous reviewed Phase 0 bundle.",
      proofPlan: ["Original 22 tests", "Task 1A adversarial tests", "Typecheck", "Fixture hash validation", "Scope audit"],
      status: "COMPLETED",
      evidenceIds: ["evidence_phase0_fixture"],
      effectiveRevision: 1,
      provenance,
    }],
    capabilityLineage: capabilities.map((capability) => ({
      eventId: capability.lineageEventIds[0],
      capabilityId: capability.capabilityId,
      type: "INTRODUCED" as const,
      fromCapabilityIds: [],
      toCapabilityIds: [capability.capabilityId],
      reason: "Phase 0 self-governance responsibility decomposition.",
      authority: "EXPLICIT" as const,
      effectiveRevision: 1,
      evidenceIds: ["evidence_phase0_fixture"],
      provenance,
    })),
    canonicalState: {
      modelRevision: 1,
      historyHead: { sequence: 0, eventHash: "GENESIS" },
      evidenceHead: { sequence: 0, manifestHash: "" },
      integrity: { modelHash: "", historyHash: "", evidenceManifestHash: "" },
    },
    provenance,
  };
  return model;
}

export function createHistory(): HistoryEvent[] {
  return [
    buildHistoryEvent(1, "phase.started", { phaseId: "phase_0", mutationId: "MAAT-PHASE-0-001" }, null),
    buildHistoryEvent(2, "intent.confirmed", { promiseId: "promise_phase0", proofId: "proof_intent_phase0_owner" }, null),
  ].map((event, index, events) => index === 0 ? event : buildHistoryEvent(event.sequence, event.type, event.payload, events[index - 1].eventHash));
}

export function createEvidenceManifest(): EvidenceManifest {
  return {
    schemaVersion: "0.1.0",
    entries: [{
      evidenceId: "evidence_phase0_fixture",
      contentHash: FIXTURE_EVIDENCE_HASH,
      artifactPath: FIXTURE_EVIDENCE_PATH,
      available: true,
    }],
  };
}

export function createPreparedSnapshot(): PersistenceSnapshot {
  const model = createMinimalModel();
  return prepareCanonicalRevision({ model, history: createHistory(), evidenceManifest: createEvidenceManifest() });
}

export function createPreparedModel(): CanonicalModel {
  return cloneWithModelHash(createMinimalModel());
}

export function createFixtureManifestHash(): string {
  return computeEvidenceManifestHash(createEvidenceManifest());
}
