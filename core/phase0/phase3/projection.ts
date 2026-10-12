import {
  assertValidModel,
  canonicalize,
  createDerivedOutput,
  derivedOutputInputsFromModel,
  sha256Text,
} from "../contracts";
import type {
  CanonicalModel,
  Capability,
  DerivedOutput,
  EntityProvenance,
  LifecycleStatus,
  ObservationClass,
  RuntimeHome,
} from "../contracts";

export const PHASE3_RULESET_VERSION = "phase3-pulse-mri-v1";
export const PHASE3_GENERATED_AT = "1970-01-01T00:00:00.000Z";

export type PulseConditionKind = "RUNTIME_GAP" | "AMBIGUITY" | "CONFLICT" | "HISTORICAL_TRANSITION" | "INSUFFICIENT_EVIDENCE" | "UNKNOWN" | "RETIRED";
export type MriNodeKind = "PROJECT" | "SUBSYSTEM" | "CAPABILITY" | "RUNTIME_HOME";

export interface ProjectionSource {
  modelRevision: number;
  historySequence: number;
  evidenceSequence: number;
  derivedOutput: DerivedOutput;
  semanticHash: string;
}

export interface PulseCondition {
  conditionId: string;
  kind: PulseConditionKind;
  label: string;
  detail: string;
  affectedEntityIds: string[];
  provenance: EntityProvenance;
}

export interface ProjectPulseProjection {
  kind: "PROJECT_PULSE";
  source: ProjectionSource;
  project: {
    projectId: string;
    name: string;
    repository?: string;
    projectType: string;
    modelRevision: number;
    lastScanId: string | null;
    governedState: string;
  };
  capabilityCounts: Record<LifecycleStatus, number>;
  runtime: {
    currentHomeIds: string[];
    historicalHomeIds: string[];
    runtimeGapCapabilityIds: string[];
    unresolvedCapabilityIds: string[];
    ambiguityCount: number;
    conflictCount: number;
  };
  evidence: Record<ObservationClass, number>;
  conditions: PulseCondition[];
  unknowns: PulseCondition[];
  truthBoundary: string;
}

export interface EngineeringMriNode {
  nodeId: string;
  kind: MriNodeKind;
  label: string;
  lifecycleStatus?: LifecycleStatus;
  provenance: EntityProvenance;
  details: Record<string, string | string[] | boolean | number | undefined>;
}

export interface EngineeringMriEdge {
  edgeId: string;
  sourceId: string;
  targetId: string;
  relationship: string;
  status: "CURRENT" | "HISTORICAL" | "CANONICAL";
  provenance: EntityProvenance;
  evidenceIds: string[];
}

export interface EngineeringMriProjection {
  kind: "ENGINEERING_MRI";
  source: ProjectionSource;
  nodes: EngineeringMriNode[];
  edges: EngineeringMriEdge[];
  ambiguities: Array<{ anchor: string; candidateIds: string[]; reason: string }>;
  conflicts: Array<{ anchor: string; candidateIds: string[]; reason: string }>;
  truthBoundary: string;
}

function sorted<T>(items: readonly T[], key: (item: T) => string): T[] {
  return [...items].sort((left, right) => key(left).localeCompare(key(right)));
}

function currentHomes(model: CanonicalModel): RuntimeHome[] {
  const revision = model.canonicalState.modelRevision;
  return sorted(
    model.runtimeHomes.filter((home) => home.effectiveFromRevision <= revision && (home.effectiveToRevision === undefined || home.effectiveToRevision > revision)),
    (home) => home.runtimeHomeId,
  );
}

function historicalHomes(model: CanonicalModel): RuntimeHome[] {
  const revision = model.canonicalState.modelRevision;
  return sorted(
    model.runtimeHomes.filter((home) => !(home.effectiveFromRevision <= revision && (home.effectiveToRevision === undefined || home.effectiveToRevision > revision))),
    (home) => home.runtimeHomeId,
  );
}

function pulseProvenance(model: CanonicalModel, source: string, observationClass: ObservationClass = "RECONCILED"): EntityProvenance {
  return {
    observationClass,
    source,
    confidence: 1,
    observedAt: PHASE3_GENERATED_AT,
    modelRevision: model.canonicalState.modelRevision,
  };
}

function projectionSource(model: CanonicalModel, kind: "PROJECT_PULSE" | "MRI_VERDICT", semantic: unknown): ProjectionSource {
  const derivedOutput = createDerivedOutput(
    kind,
    derivedOutputInputsFromModel(model, PHASE3_RULESET_VERSION),
    {
      inputEntityIds: [
        model.project.projectId,
        ...sorted(model.subsystems, (subsystem) => subsystem.subsystemId).map((subsystem) => subsystem.subsystemId),
        ...sorted(model.capabilities, (capability) => capability.capabilityId).map((capability) => capability.capabilityId),
        ...sorted(model.runtimeHomes, (home) => home.runtimeHomeId).map((home) => home.runtimeHomeId),
      ],
      evidenceIds: sorted(model.evidenceRefs, (evidence) => evidence.evidenceId).map((evidence) => evidence.evidenceId),
      ruleIds: [PHASE3_RULESET_VERSION],
      derivationSteps: ["validated-canonical-model", kind === "PROJECT_PULSE" ? "pulse-projection" : "mri-projection"],
    },
    PHASE3_GENERATED_AT,
    "maat-phase3",
  );
  return {
    modelRevision: model.canonicalState.modelRevision,
    historySequence: model.canonicalState.historyHead.sequence,
    evidenceSequence: model.canonicalState.evidenceHead.sequence,
    derivedOutput,
    semanticHash: sha256Text(canonicalize(semantic)),
  };
}

function emptyLifecycleCounts(): Record<LifecycleStatus, number> {
  return {
    PROPOSED: 0,
    APPROVED: 0,
    IMPLEMENTING: 0,
    LIVE: 0,
    PARTIAL: 0,
    BLOCKED: 0,
    DEGRADED: 0,
    UNKNOWN: 0,
    NOT_FOUND: 0,
    DEPRECATED: 0,
    SUPERSEDED: 0,
    RETIRED: 0,
  };
}

function emptyEvidenceCounts(): Record<ObservationClass, number> {
  return { EXPLICIT: 0, OBSERVED: 0, RECONCILED: 0, INFERRED: 0, UNKNOWN: 0 };
}

function phaseState(model: CanonicalModel): string {
  const current = sorted(model.phases, (phase) => phase.phaseId).find((phase) => phase.status === "IMPLEMENTING") ?? sorted(model.phases, (phase) => phase.phaseId)[0];
  return current ? `${current.name}: ${current.status}` : "UNKNOWN";
}

function latestScanId(model: CanonicalModel): string | null {
  const scans = sorted(model.scans, (scan) => `${scan.completedAt ?? ""}:${scan.scanId}`);
  return scans.length === 0 ? null : scans[scans.length - 1].scanId;
}

function capabilityCondition(model: CanonicalModel, capability: Capability, kind: PulseConditionKind, label: string, detail: string): PulseCondition {
  return {
    conditionId: `pulse:${kind.toLowerCase()}:${capability.capabilityId}`,
    kind,
    label,
    detail,
    affectedEntityIds: [capability.capabilityId],
    provenance: capability.provenance,
  };
}

export function deriveProjectPulse(model: CanonicalModel): ProjectPulseProjection {
  assertValidModel(model);
  const capabilityCounts = emptyLifecycleCounts();
  const evidence = emptyEvidenceCounts();
  const conditions: PulseCondition[] = [];
  const unknowns: PulseCondition[] = [];
  const current = currentHomes(model);
  const historical = historicalHomes(model);

  for (const capability of sorted(model.capabilities, (item) => item.capabilityId)) {
    capabilityCounts[capability.lifecycleStatus] += 1;
    evidence[capability.provenance.observationClass] += 1;
    if (capability.runtimeGap) {
      conditions.push(capabilityCondition(model, capability, "RUNTIME_GAP", "Runtime home: UNRESOLVED", "The canonical capability declares an explicit runtime gap; Pulse does not infer a replacement."));
    }
    if (capability.lifecycleStatus === "RETIRED") {
      conditions.push(capabilityCondition(model, capability, "RETIRED", "Capability: RETIRED", "The canonical lifecycle marks this capability as retired."));
    }
    if (capability.lifecycleStatus === "UNKNOWN" || capability.provenance.observationClass === "UNKNOWN") {
      unknowns.push(capabilityCondition(model, capability, "UNKNOWN", "Condition: UNKNOWN", "The canonical model does not establish this capability condition beyond UNKNOWN."));
    }
    if (capability.verificationState === "UNVERIFIED" || capability.evidenceIds.length === 0) {
      conditions.push(capabilityCondition(model, capability, "INSUFFICIENT_EVIDENCE", "Verification: INSUFFICIENT EVIDENCE", "The canonical model does not provide sufficient evidence for a stronger verification statement."));
    }
  }
  for (const evidenceRef of sorted(model.evidenceRefs, (item) => item.evidenceId)) evidence[evidenceRef.provenance.observationClass] += 1;
  const trace = model.reconciliationTrace;
  for (const ambiguity of trace?.ambiguities ?? []) {
    conditions.push({
      conditionId: `pulse:ambiguity:${ambiguity.anchor}`,
      kind: "AMBIGUITY",
      label: "Identity: AMBIGUOUS",
      detail: ambiguity.reason,
      affectedEntityIds: [...ambiguity.candidateIds].sort(),
      provenance: pulseProvenance(model, "phase3:pulse:reconciliation-trace", "RECONCILED"),
    });
  }
  for (const conflict of trace?.conflicts ?? []) {
    conditions.push({
      conditionId: `pulse:conflict:${conflict.anchor}`,
      kind: "CONFLICT",
      label: "Runtime ownership: CONFLICT",
      detail: conflict.reason,
      affectedEntityIds: [...conflict.candidateIds].sort(),
      provenance: pulseProvenance(model, "phase3:pulse:reconciliation-trace", "RECONCILED"),
    });
  }
  for (const event of sorted(model.capabilityLineage, (item) => item.eventId)) {
    if (event.type === "MOVE" || event.type === "RETIRED" || event.type === "RESTORED") {
      conditions.push({
        conditionId: `pulse:transition:${event.eventId}`,
        kind: "HISTORICAL_TRANSITION",
        label: `Historical transition: ${event.type}`,
        detail: event.reason,
        affectedEntityIds: [event.capabilityId, ...event.fromCapabilityIds, ...event.toCapabilityIds].sort(),
        provenance: event.provenance,
      });
    }
  }
  const semantic = {
    projectId: model.project.projectId,
    revision: model.canonicalState.modelRevision,
    capabilityCounts,
    current: current.map((home) => home.runtimeHomeId),
    historical: historical.map((home) => home.runtimeHomeId),
    evidence,
    conditions: sorted(conditions, (condition) => condition.conditionId),
    unknowns: sorted(unknowns, (condition) => condition.conditionId),
  };
  return {
    kind: "PROJECT_PULSE",
    source: projectionSource(model, "PROJECT_PULSE", semantic),
    project: {
      projectId: model.project.projectId,
      name: model.project.name,
      repository: model.project.repository,
      projectType: model.project.projectType,
      modelRevision: model.canonicalState.modelRevision,
      lastScanId: latestScanId(model),
      governedState: phaseState(model),
    },
    capabilityCounts,
    runtime: {
      currentHomeIds: current.map((home) => home.runtimeHomeId),
      historicalHomeIds: historical.map((home) => home.runtimeHomeId),
      runtimeGapCapabilityIds: sorted(model.capabilities.filter((capability) => capability.runtimeGap), (capability) => capability.capabilityId).map((capability) => capability.capabilityId),
      unresolvedCapabilityIds: sorted(model.capabilities.filter((capability) => capability.lifecycleStatus === "UNKNOWN"), (capability) => capability.capabilityId).map((capability) => capability.capabilityId),
      ambiguityCount: trace?.ambiguities.length ?? 0,
      conflictCount: trace?.conflicts.length ?? 0,
    },
    evidence,
    conditions: sorted(conditions, (condition) => condition.conditionId),
    unknowns: sorted(unknowns, (condition) => condition.conditionId),
    truthBoundary: "Project Pulse is a deterministic derived projection of the validated canonical model and evidence references. It does not execute the project, infer runtime proof from source presence, mutate canonical state, or recommend a next action.",
  };
}

function capabilityNode(model: CanonicalModel, capability: Capability): EngineeringMriNode {
  const homes = sorted(model.runtimeHomes.filter((home) => home.capabilityId === capability.capabilityId), (home) => home.runtimeHomeId);
  return {
    nodeId: capability.capabilityId,
    kind: "CAPABILITY",
    label: capability.name,
    lifecycleStatus: capability.lifecycleStatus,
    provenance: capability.provenance,
    details: {
      purpose: capability.purpose,
      owningSubsystemId: capability.owningSubsystemId,
      runtimeHomeId: capability.runtimeHomeId ?? "UNRESOLVED",
      runtimeGap: capability.runtimeGap,
      historicalRuntimeHomeIds: [...capability.historicalRuntimeHomeIds].sort(),
      implementationRefs: [...capability.implementationRefs].sort(),
      dependencies: [...capability.dependencies].sort(),
      lineageEventIds: [...capability.lineageEventIds].sort(),
      evidenceIds: [...capability.evidenceIds].sort(),
      verificationState: capability.verificationState,
      runtimeTruthLevel: capability.runtimeTruthLevel,
      currentRuntimeTenureCount: homes.filter((home) => home.runtimeHomeId === capability.runtimeHomeId).length,
    },
  };
}

export function deriveEngineeringMri(model: CanonicalModel): EngineeringMriProjection {
  assertValidModel(model);
  const revision = model.canonicalState.modelRevision;
  const nodes: EngineeringMriNode[] = [{
    nodeId: model.project.projectId,
    kind: "PROJECT",
    label: model.project.name,
    lifecycleStatus: undefined,
    provenance: model.project.provenance,
    details: { projectType: model.project.projectType, modelRevision: revision },
  }];
  const edges: EngineeringMriEdge[] = [];
  for (const subsystem of sorted(model.subsystems, (item) => item.subsystemId)) {
    nodes.push({
      nodeId: subsystem.subsystemId,
      kind: "SUBSYSTEM",
      label: subsystem.name,
      provenance: subsystem.provenance,
      details: { responsibility: subsystem.responsibility, capabilityIds: [...subsystem.capabilityIds].sort() },
    });
    edges.push({ edgeId: `derived:owns:${model.project.projectId}:${subsystem.subsystemId}`, sourceId: model.project.projectId, targetId: subsystem.subsystemId, relationship: "OWNS", status: "CANONICAL", provenance: subsystem.provenance, evidenceIds: [] });
  }
  for (const capability of sorted(model.capabilities, (item) => item.capabilityId)) {
    nodes.push(capabilityNode(model, capability));
    edges.push({ edgeId: `derived:owns:${capability.owningSubsystemId}:${capability.capabilityId}`, sourceId: capability.owningSubsystemId, targetId: capability.capabilityId, relationship: "OWNS", status: "CANONICAL", provenance: capability.provenance, evidenceIds: [...capability.evidenceIds].sort() });
  }
  for (const home of sorted(model.runtimeHomes, (item) => item.runtimeHomeId)) {
    const current = home.effectiveFromRevision <= revision && (home.effectiveToRevision === undefined || home.effectiveToRevision > revision);
    nodes.push({
      nodeId: home.runtimeHomeId,
      kind: "RUNTIME_HOME",
      label: home.locator,
      lifecycleStatus: home.status,
      provenance: home.provenance,
      details: { kind: home.kind, locator: home.locator, entryPoints: [...home.entryPoints].sort(), current, effectiveFromRevision: home.effectiveFromRevision, effectiveToRevision: home.effectiveToRevision ?? "OPEN" },
    });
    edges.push({ edgeId: `derived:homes:${home.capabilityId}:${home.runtimeHomeId}`, sourceId: home.capabilityId, targetId: home.runtimeHomeId, relationship: "HOMES", status: current ? "CURRENT" : "HISTORICAL", provenance: home.provenance, evidenceIds: [] });
  }
  const knownCapabilityIds = new Set(model.capabilities.map((capability) => capability.capabilityId));
  for (const capability of sorted(model.capabilities, (item) => item.capabilityId)) {
    for (const dependencyId of [...capability.dependencies].sort()) {
      if (knownCapabilityIds.has(dependencyId)) edges.push({ edgeId: `derived:depends:${capability.capabilityId}:${dependencyId}`, sourceId: capability.capabilityId, targetId: dependencyId, relationship: "DEPENDS_ON", status: "CANONICAL", provenance: capability.provenance, evidenceIds: [...capability.evidenceIds].sort() });
    }
  }
  for (const edge of sorted([...model.interfaces, ...model.edges], (item) => item.edgeId)) {
    edges.push({ edgeId: edge.edgeId, sourceId: edge.sourceId, targetId: edge.targetId, relationship: edge.relationship, status: "CANONICAL", provenance: edge.provenance, evidenceIds: [...edge.evidenceIds].sort() });
  }
  const ambiguities = sorted(model.reconciliationTrace?.ambiguities ?? [], (item) => item.anchor).map((item) => ({ anchor: item.anchor, candidateIds: [...item.candidateIds].sort(), reason: item.reason }));
  const conflicts = sorted(model.reconciliationTrace?.conflicts ?? [], (item) => item.anchor).map((item) => ({ anchor: item.anchor, candidateIds: [...item.candidateIds].sort(), reason: item.reason }));
  const semantic = { projectId: model.project.projectId, revision, nodes: sorted(nodes, (node) => node.nodeId), edges: sorted(edges, (edge) => edge.edgeId), ambiguities, conflicts };
  return {
    kind: "ENGINEERING_MRI",
    source: projectionSource(model, "MRI_VERDICT", semantic),
    nodes: sorted(nodes, (node) => node.nodeId),
    edges: sorted(edges, (edge) => edge.edgeId),
    ambiguities,
    conflicts,
    truthBoundary: "Engineering MRI is a deterministic, read-only relationship projection. Its edges come only from canonical ownership, runtime-home, dependency, interface, or edge records; absent relationships are not rendered as edges.",
  };
}

export interface Phase3ProjectionBundle {
  version: "phase3-pulse-mri-v1";
  pulse: ProjectPulseProjection;
  mri: EngineeringMriProjection;
}

export function derivePhase3ProjectionBundle(model: CanonicalModel): Phase3ProjectionBundle {
  const pulse = deriveProjectPulse(model);
  const mri = deriveEngineeringMri(model);
  return { version: "phase3-pulse-mri-v1", pulse, mri };
}
