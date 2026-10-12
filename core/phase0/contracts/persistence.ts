import { randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { Capability, CanonicalModel, Evidence, EvidenceManifest, HistoryEvent, RuntimeHome } from "./model";
import { canonicalize, computeEvidenceManifestHash, computeHistoryHash, computeModelHash, sha256Text } from "./utils";
import { validateCanonicalModel } from "./validation";

export const GENESIS_EVENT_HASH = "GENESIS";
export const MALFORMED_LOCK_GRACE_MS = 30_000;

const PHASE_0_HISTORY_TYPES = new Set([
  "model.reconciled", "decision.recorded", "capability.introduced", "capability.renamed", "capability.moved",
  "capability.superseded", "capability.retired", "capability.restored", "capability.merged", "capability.split",
  "mutation.proposed", "mutation.approved", "mutation.rejected", "mutation.completed", "evidence.recorded",
  "evidence.availability.changed", "recovery.opened", "recovery.completed", "phase.locked",
  "phase.started", "intent.confirmed",
]);

function objectPayload(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function payloadRevision(payload: unknown): number | undefined {
  const value = objectPayload(payload);
  const candidate = value?.modelRevision ?? value?.effectiveRevision ?? value?.resultingRevision;
  return typeof candidate === "number" && Number.isInteger(candidate) ? candidate : undefined;
}

type CanonicalEntityKind =
  | "PROJECT"
  | "PROMISE"
  | "REQUIREMENT"
  | "PHASE"
  | "SUBSYSTEM"
  | "CAPABILITY"
  | "RUNTIME_HOME"
  | "EDGE"
  | "CLAIM"
  | "EVIDENCE"
  | "DECISION"
  | "MUTATION"
  | "LINEAGE"
  | "RELEASE_GATE"
  | "SCAN"
  | "FINDING"
  | "FINDING_GOVERNANCE"
  | "DERIVED_OUTPUT";

type CanonicalEntityId = string;

function typedIdentity(kind: CanonicalEntityKind, rawId: string): CanonicalEntityId {
  return `${kind}:${rawId}`;
}

interface CanonicalIdentityIndex {
  idsByKind: Map<CanonicalEntityKind, Set<string>>;
  runtimeHomeIdsByCapability: Map<string, Set<string>>;
}

function createCanonicalIdentityIndex(...models: CanonicalModel[]): CanonicalIdentityIndex {
  const idsByKind = new Map<CanonicalEntityKind, Set<string>>();
  const runtimeHomeIdsByCapability = new Map<string, Set<string>>();
  const add = (kind: CanonicalEntityKind, rawId: string | undefined): void => {
    if (!rawId || rawId.trim().length === 0) return;
    const ids = idsByKind.get(kind) ?? new Set<string>();
    ids.add(rawId);
    idsByKind.set(kind, ids);
  };
  for (const model of models) {
    add("PROJECT", model.project.projectId);
    for (const item of model.intent) add("PROMISE", item.promiseId);
    for (const item of model.requirements) add("REQUIREMENT", item.requirementId);
    for (const item of model.phases) add("PHASE", item.phaseId);
    for (const item of model.subsystems) add("SUBSYSTEM", item.subsystemId);
    for (const item of model.capabilities) {
      add("CAPABILITY", item.capabilityId);
      if (item.runtimeHomeId) {
        const homeIds = runtimeHomeIdsByCapability.get(item.capabilityId) ?? new Set<string>();
        homeIds.add(item.runtimeHomeId);
        runtimeHomeIdsByCapability.set(item.capabilityId, homeIds);
      }
    }
    for (const item of model.runtimeHomes) {
      add("RUNTIME_HOME", item.runtimeHomeId);
      const homeIds = runtimeHomeIdsByCapability.get(item.capabilityId) ?? new Set<string>();
      homeIds.add(item.runtimeHomeId);
      runtimeHomeIdsByCapability.set(item.capabilityId, homeIds);
    }
    for (const item of [...model.interfaces, ...model.edges]) add("EDGE", item.edgeId);
    for (const item of model.claims) add("CLAIM", item.claimId);
    for (const item of model.evidenceRefs) add("EVIDENCE", item.evidenceId);
    for (const item of model.releaseGates) add("RELEASE_GATE", item.gateId);
    for (const item of model.derivedOutputRefs) add("DERIVED_OUTPUT", item.derivedOutputId);
    for (const item of model.findingRefs) add("FINDING", item.findingId);
    for (const item of model.findingGovernance) add("FINDING_GOVERNANCE", item.findingGovernanceId);
    for (const item of model.scans) add("SCAN", item.scanId);
    for (const item of model.decisions) add("DECISION", item.decisionId);
    for (const item of model.mutations) add("MUTATION", item.mutationId);
    for (const item of model.capabilityLineage) add("LINEAGE", item.eventId);
  }
  return { idsByKind, runtimeHomeIdsByCapability };
}

function typedIdentityForExpectedKind(rawId: unknown, kind: CanonicalEntityKind, index: CanonicalIdentityIndex): CanonicalEntityId | undefined {
  return typeof rawId === "string" && index.idsByKind.get(kind)?.has(rawId) ? typedIdentity(kind, rawId) : undefined;
}

function resolveUntypedIdentity(rawId: unknown, index: CanonicalIdentityIndex): CanonicalEntityId | undefined {
  if (typeof rawId !== "string" || rawId.trim().length === 0) return undefined;
  const matches: CanonicalEntityId[] = [];
  for (const [kind, ids] of index.idsByKind) if (ids.has(rawId)) matches.push(typedIdentity(kind, rawId));
  return matches.length === 1 ? matches[0] : undefined;
}

function payloadEntityIds(payload: unknown): string[] {
  const value = objectPayload(payload);
  if (!value) return [];
  const ids: string[] = [];
  const scalarKeys = [
    "entityId", "projectId", "promiseId", "requirementId", "phaseId", "subsystemId", "capabilityId",
    "runtimeHomeId", "evidenceId", "claimId", "gateId", "releaseGateId", "scanId", "decisionId",
    "mutationId", "lineageEventId", "findingId", "findingGovernanceId", "derivedOutputId", "edgeId", "interfaceId",
    "previousRuntimeHomeId", "nextRuntimeHomeId", "replacementCapabilityId", "supersededByCapabilityId",
    "previousCapabilityId", "nextCapabilityId",
  ];
  for (const key of scalarKeys) if (typeof value[key] === "string" && (value[key] as string).length > 0) ids.push(value[key] as string);
  const arrayKeys = [
    "affectedEntityIds", "changedEntityIds", "capabilityIds", "affectedCapabilityIds", "evidenceIds",
    "fromCapabilityIds", "toCapabilityIds", "lineageEventIds",
  ];
  for (const key of arrayKeys) {
    if (Array.isArray(value[key])) ids.push(...(value[key] as unknown[]).filter((item): item is string => typeof item === "string" && item.length > 0));
  }
  return [...new Set(ids)];
}

function hasNonEmptyString(payload: Record<string, unknown>, key: string): boolean {
  return typeof payload[key] === "string" && (payload[key] as string).trim().length > 0;
}

function hasNonEmptyStringArray(payload: Record<string, unknown>, keys: string[]): boolean {
  return keys.some((key) => Array.isArray(payload[key]) && (payload[key] as unknown[]).some((item) => typeof item === "string" && item.trim().length > 0));
}

function hasBoolean(payload: Record<string, unknown>, key: string): boolean {
  return typeof payload[key] === "boolean";
}

function hasIdentityInformation(payload: Record<string, unknown>): boolean {
  return (
    (hasNonEmptyString(payload, "previousName") && hasNonEmptyString(payload, "nextName"))
    || (hasNonEmptyString(payload, "previousIdentity") && hasNonEmptyString(payload, "nextIdentity"))
    || (hasNonEmptyString(payload, "previousCapabilityId") && hasNonEmptyString(payload, "nextCapabilityId"))
    || hasNonEmptyString(payload, "lineageEventId")
    || hasNonEmptyStringArray(payload, ["lineageEventIds"])
  );
}

function hasReplacementInformation(payload: Record<string, unknown>): boolean {
  return (
    hasNonEmptyString(payload, "replacementCapabilityId")
    || hasNonEmptyString(payload, "supersededByCapabilityId")
    || hasNonEmptyString(payload, "replacementId")
    || hasNonEmptyStringArray(payload, ["toCapabilityIds"])
    || (hasNonEmptyStringArray(payload, ["capabilityIds", "affectedCapabilityIds", "affectedEntityIds"]) && payloadEntityIds(payload).length >= 2)
  );
}

function appendedHistory(previous: PersistenceSnapshot, next: PersistenceSnapshot): HistoryEvent[] {
  return next.history.slice(previous.history.length);
}

function entityRecordId(value: unknown, idKey: string): string | undefined {
  const record = objectPayload(value);
  return typeof record?.[idKey] === "string" && (record[idKey] as string).length > 0 ? record[idKey] as string : undefined;
}

function addCollectionChanges(changeSet: Set<CanonicalEntityId>, previous: readonly unknown[], next: readonly unknown[], idKey: string, kind: CanonicalEntityKind): void {
  const previousById = new Map<string, unknown>();
  const nextById = new Map<string, unknown>();
  for (const item of previous) {
    const id = entityRecordId(item, idKey);
    if (id) previousById.set(id, item);
  }
  for (const item of next) {
    const id = entityRecordId(item, idKey);
    if (id) nextById.set(id, item);
  }
  for (const id of new Set([...previousById.keys(), ...nextById.keys()])) {
    if (canonicalize(previousById.get(id)) !== canonicalize(nextById.get(id))) changeSet.add(typedIdentity(kind, id));
  }
}

function addScalarBoundaryChange(changeSet: Set<CanonicalEntityId>, previousValue: unknown, nextValue: unknown, projectIds: Set<string>): void {
  if (canonicalize(previousValue) !== canonicalize(nextValue)) for (const projectId of projectIds) changeSet.add(typedIdentity("PROJECT", projectId));
}

function lineageAffectedEntityIds(event: CanonicalModel["capabilityLineage"][number]): string[] {
  return [...new Set([event.capabilityId, ...event.fromCapabilityIds, ...event.toCapabilityIds])];
}

function addLineageChanges(changeSet: Set<CanonicalEntityId>, previous: CanonicalModel["capabilityLineage"], next: CanonicalModel["capabilityLineage"]): void {
  const previousById = new Map(previous.map((event) => [event.eventId, event]));
  const nextById = new Map(next.map((event) => [event.eventId, event]));
  for (const eventId of new Set([...previousById.keys(), ...nextById.keys()])) {
    const prior = previousById.get(eventId);
    const current = nextById.get(eventId);
    if (canonicalize(prior) !== canonicalize(current)) {
      changeSet.add(typedIdentity("LINEAGE", eventId));
      for (const id of prior ? lineageAffectedEntityIds(prior) : []) changeSet.add(typedIdentity("CAPABILITY", id));
      for (const id of current ? lineageAffectedEntityIds(current) : []) changeSet.add(typedIdentity("CAPABILITY", id));
    }
  }
}

/**
 * Returns the bounded set of typed canonical entity identities whose semantic
 * value changed between two model revisions. Persistence-derived heads/hashes
 * and the revision counter itself are intentionally excluded.
 */
export function canonicalChangeSet(previous: CanonicalModel, next: CanonicalModel): Set<CanonicalEntityId> {
  const changeSet = new Set<CanonicalEntityId>();
  const projectIds = new Set([previous.project.projectId, next.project.projectId]);
  addCollectionChanges(changeSet, [previous.project], [next.project], "projectId", "PROJECT");
  addCollectionChanges(changeSet, previous.intent, next.intent, "promiseId", "PROMISE");
  addCollectionChanges(changeSet, previous.requirements, next.requirements, "requirementId", "REQUIREMENT");
  addCollectionChanges(changeSet, previous.phases, next.phases, "phaseId", "PHASE");
  addCollectionChanges(changeSet, previous.subsystems, next.subsystems, "subsystemId", "SUBSYSTEM");
  addCollectionChanges(changeSet, previous.capabilities, next.capabilities, "capabilityId", "CAPABILITY");
  addCollectionChanges(changeSet, previous.runtimeHomes, next.runtimeHomes, "runtimeHomeId", "RUNTIME_HOME");
  addCollectionChanges(changeSet, previous.interfaces, next.interfaces, "edgeId", "EDGE");
  addCollectionChanges(changeSet, previous.edges, next.edges, "edgeId", "EDGE");
  addCollectionChanges(changeSet, previous.claims, next.claims, "claimId", "CLAIM");
  addCollectionChanges(changeSet, previous.evidenceRefs, next.evidenceRefs, "evidenceId", "EVIDENCE");
  addCollectionChanges(changeSet, previous.releaseGates, next.releaseGates, "gateId", "RELEASE_GATE");
  addCollectionChanges(changeSet, previous.derivedOutputRefs, next.derivedOutputRefs, "derivedOutputId", "DERIVED_OUTPUT");
  addCollectionChanges(changeSet, previous.findingRefs, next.findingRefs, "findingId", "FINDING");
  addCollectionChanges(changeSet, previous.findingGovernance, next.findingGovernance, "findingGovernanceId", "FINDING_GOVERNANCE");
  addCollectionChanges(changeSet, previous.scans, next.scans, "scanId", "SCAN");
  addCollectionChanges(changeSet, previous.decisions, next.decisions, "decisionId", "DECISION");
  addCollectionChanges(changeSet, previous.mutations, next.mutations, "mutationId", "MUTATION");
  addLineageChanges(changeSet, previous.capabilityLineage, next.capabilityLineage);
  addScalarBoundaryChange(changeSet, previous.schemaVersion, next.schemaVersion, projectIds);
  addScalarBoundaryChange(changeSet, previous.releaseContract, next.releaseContract, projectIds);
  addScalarBoundaryChange(changeSet, previous.configurationItems, next.configurationItems, projectIds);
  addScalarBoundaryChange(changeSet, previous.reconciliationTrace, next.reconciliationTrace, projectIds);
  addScalarBoundaryChange(changeSet, previous.provenance, next.provenance, projectIds);
  return changeSet;
}

function addCoverage(coverage: Set<CanonicalEntityId>, issues: string[], rawId: unknown, kind: CanonicalEntityKind, index: CanonicalIdentityIndex, label: string): void {
  if (typeof rawId !== "string" || rawId.trim().length === 0) return;
  const typed = typedIdentityForExpectedKind(rawId, kind, index);
  if (!typed) issues.push(`history reference ${label} must resolve to ${kind} identity: ${rawId}`);
  else coverage.add(typed);
}

function addGenericCoverage(coverage: Set<CanonicalEntityId>, issues: string[], rawIds: unknown, index: CanonicalIdentityIndex, label: string): void {
  if (rawIds === undefined) return;
  if (!Array.isArray(rawIds) || rawIds.length === 0 || rawIds.some((value) => typeof value !== "string" || value.trim().length === 0)) {
    issues.push(`history reference ${label} must be a non-empty array of canonical IDs`);
    return;
  }
  for (const rawId of rawIds) {
    const typed = resolveUntypedIdentity(rawId, index);
    if (!typed) issues.push(`history reference ${label} cannot resolve canonical identity: ${String(rawId)}`);
    else coverage.add(typed);
  }
}

function addTypedArrayCoverage(
  coverage: Set<CanonicalEntityId>,
  issues: string[],
  rawIds: unknown,
  kind: CanonicalEntityKind,
  index: CanonicalIdentityIndex,
  label: string,
): void {
  if (rawIds === undefined) return;
  if (!Array.isArray(rawIds) || rawIds.length === 0 || rawIds.some((value) => typeof value !== "string" || value.trim().length === 0)) {
    issues.push(`history reference ${label} must be a non-empty array of ${kind} IDs`);
    return;
  }
  for (const rawId of rawIds) {
    const typed = typedIdentityForExpectedKind(rawId, kind, index);
    if (!typed) issues.push(`history reference ${label} must resolve to ${kind} identity: ${String(rawId)}`);
    else coverage.add(typed);
  }
}

function addTypedCapabilityArrayCoverage(
  coverage: Set<CanonicalEntityId>,
  issues: string[],
  rawIds: unknown,
  index: CanonicalIdentityIndex,
  label: string,
): void {
  addTypedArrayCoverage(coverage, issues, rawIds, "CAPABILITY", index, label);
  if (!Array.isArray(rawIds)) return;
  for (const rawId of rawIds) {
    if (!typedIdentityForExpectedKind(rawId, "CAPABILITY", index)) continue;
    for (const runtimeHomeId of index.runtimeHomeIdsByCapability.get(rawId) ?? []) {
      coverage.add(typedIdentity("RUNTIME_HOME", runtimeHomeId));
    }
  }
}

function typedCoverageForEvent(event: HistoryEvent, index: CanonicalIdentityIndex): { coverage: Set<CanonicalEntityId>; issues: string[] } {
  const coverage = new Set<CanonicalEntityId>();
  const issues: string[] = [];
  const payload = objectPayload(event.payload);
  if (!payload) return { coverage, issues };
  const add = (key: string, kind: CanonicalEntityKind): void => addCoverage(coverage, issues, payload[key], kind, index, `${event.type}.${key}`);
  const addGeneric = (key: string): void => addGenericCoverage(coverage, issues, payload[key], index, `${event.type}.${key}`);
  switch (event.type) {
    case "model.reconciled":
      addGeneric("changedEntityIds");
      addGeneric("affectedEntityIds");
      break;
    case "evidence.recorded":
    case "evidence.availability.changed":
      add("evidenceId", "EVIDENCE");
      break;
    case "phase.locked":
    case "phase.started":
      add("phaseId", "PHASE");
      break;
    case "intent.confirmed":
      add("promiseId", "PROMISE");
      break;
    case "decision.recorded":
      add("decisionId", "DECISION");
      addGeneric("affectedEntityIds");
      break;
    case "mutation.proposed":
    case "mutation.approved":
    case "mutation.rejected":
    case "mutation.completed":
      add("mutationId", "MUTATION");
      addGeneric("affectedEntityIds");
      break;
    case "capability.introduced":
    case "capability.renamed":
    case "capability.moved":
    case "capability.retired":
    case "capability.restored":
    case "capability.superseded":
      add("capabilityId", "CAPABILITY");
      add("lineageEventId", "LINEAGE");
      if (event.type === "capability.moved") {
        add("previousRuntimeHomeId", "RUNTIME_HOME");
        add("nextRuntimeHomeId", "RUNTIME_HOME");
      }
      break;
    case "capability.merged":
    case "capability.split": {
      const capabilityArrayKeys = ["capabilityIds", "affectedCapabilityIds", "fromCapabilityIds", "toCapabilityIds"];
      let hasCapabilityArray = false;
      for (const key of capabilityArrayKeys) {
        if (payload[key] !== undefined) hasCapabilityArray = true;
        addTypedCapabilityArrayCoverage(coverage, issues, payload[key], index, `${event.type}.${key}`);
      }
      if (!hasCapabilityArray) {
        issues.push(`history event ${event.type} requires capability-semantic identity arrays`);
      }
      if (payload.affectedEntityIds !== undefined) {
        issues.push(`history event ${event.type} does not authorize generic affectedEntityIds coverage`);
      }
      add("previousRuntimeHomeId", "RUNTIME_HOME");
      add("nextRuntimeHomeId", "RUNTIME_HOME");
      add("lineageEventId", "LINEAGE");
      break;
    }
    case "recovery.opened":
    case "recovery.completed":
      // Recovery history is durable operational evidence, not generic semantic authority.
      if (payload.projectId !== undefined) {
        const typedProject = typedIdentityForExpectedKind(payload.projectId, "PROJECT", index);
        if (!typedProject) issues.push(`history reference ${event.type}.projectId must resolve to PROJECT identity`);
      }
      if (payload.affectedEntityIds !== undefined || payload.changedEntityIds !== undefined) {
        issues.push(`history event ${event.type} cannot authorize generic canonical entity coverage`);
      }
      break;
    default:
      if (event.type.startsWith("extension.")) {
        addGeneric("changedEntityIds");
        addGeneric("affectedEntityIds");
      }
      break;
  }
  return { coverage, issues };
}

function revisionBoundDecision(decision: CanonicalModel["decisions"][number], revision: number): boolean {
  return decision.effectiveRevision === revision && decision.provenance.modelRevision === revision;
}

function revisionBoundMutation(mutation: CanonicalModel["mutations"][number], revision: number): boolean {
  return mutation.provenance.modelRevision === revision
    && (mutation.effectiveRevision === undefined || (mutation.effectiveRevision >= 1 && mutation.effectiveRevision <= revision));
}

function recordAffectedCoverage(
  rawIds: string[],
  index: CanonicalIdentityIndex,
  issues: string[],
  label: string,
): Set<CanonicalEntityId> {
  const coverage = new Set<CanonicalEntityId>();
  for (const rawId of rawIds) {
    const typed = resolveUntypedIdentity(rawId, index);
    if (!typed) issues.push(`${label} contains an unknown or ambiguous canonical identity: ${rawId}`);
    else coverage.add(typed);
  }
  return coverage;
}

function eventAffectedCoverageWithinRecord(
  payload: Record<string, unknown>,
  recordCoverage: Set<CanonicalEntityId>,
  index: CanonicalIdentityIndex,
  issues: string[],
  label: string,
): Set<CanonicalEntityId> {
  const eventCoverage = new Set<CanonicalEntityId>();
  if (payload.affectedEntityIds === undefined) {
    for (const identity of recordCoverage) eventCoverage.add(identity);
    return eventCoverage;
  }
  if (!Array.isArray(payload.affectedEntityIds) || payload.affectedEntityIds.length === 0 || payload.affectedEntityIds.some((value) => typeof value !== "string" || value.trim().length === 0)) {
    return eventCoverage;
  }
  for (const rawId of payload.affectedEntityIds as unknown[]) {
    if (typeof rawId !== "string") continue;
    const typed = resolveUntypedIdentity(rawId, index);
    if (!typed) {
      issues.push(`${label}.affectedEntityIds contains an unknown or ambiguous canonical identity: ${rawId}`);
      continue;
    }
    if (!recordCoverage.has(typed)) {
      issues.push(`${label}.affectedEntityIds contains an entity absent from the canonical record: ${rawId}`);
      continue;
    }
    eventCoverage.add(typed);
  }
  return eventCoverage;
}

function mutationTransitionValid(
  previous: CanonicalModel["mutations"][number] | undefined,
  current: CanonicalModel["mutations"][number],
  eventType: string,
): boolean {
  const changed = !previous || canonicalize(previous) !== canonicalize(current);
  switch (eventType) {
    case "mutation.proposed":
      return current.status === "PROPOSED" && (!previous || (previous.status === "PROPOSED" && changed));
    case "mutation.approved":
      return Boolean(previous && previous.status === "PROPOSED" && current.status === "APPROVED" && changed);
    case "mutation.rejected":
      return Boolean(previous && (previous.status === "PROPOSED" || previous.status === "APPROVED") && current.status === "REJECTED" && changed);
    case "mutation.completed":
      return Boolean(previous && previous.status === "APPROVED" && current.status === "COMPLETED" && changed);
    default:
      return false;
  }
}

function phaseTransitionFingerprint(phase: CanonicalModel["phases"][number], includeLockVerdict: boolean): string {
  const { phaseId: _phaseId, status: _status, lockVerdict, provenance, ...semanticFields } = phase;
  return canonicalize({
    ...semanticFields,
    ...(includeLockVerdict ? { lockVerdict } : {}),
    provenance: { ...provenance, modelRevision: undefined },
  });
}

function hasIndependentPhaseSemanticAuthority(previous: PersistenceSnapshot, next: PersistenceSnapshot, phaseId: string): boolean {
  const index = createCanonicalIdentityIndex(previous.model, next.model);
  const revision = next.model.canonicalState.modelRevision;
  return appendedHistory(previous, next).some((event) => {
    if (event.type !== "model.reconciled" && !event.type.startsWith("extension.")) return false;
    if (payloadRevision(event.payload) !== revision) return false;
    const payload = objectPayload(event.payload);
    if (!payload) return false;
    const typed = typedCoverageForEvent(event, index);
    return typed.issues.length === 0 && typed.coverage.has(typedIdentity("PHASE", phaseId));
  });
}

function isLockedPhaseVerdict(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const normalized = value.replace(/[_.-]+/g, " ").trim().toUpperCase();
  return new Set(["LOCKED", "VERIFIED", "PASSED", "PASS", "APPROVED"]).has(normalized);
}

function validatePhaseEventAuthority(previous: PersistenceSnapshot, next: PersistenceSnapshot): string[] {
  const issues: string[] = [];
  const revision = next.model.canonicalState.modelRevision;
  for (const event of appendedHistory(previous, next)) {
    if (event.type !== "phase.started" && event.type !== "phase.locked") continue;
    const payload = objectPayload(event.payload);
    const phaseId = payload?.phaseId;
    const current = typeof phaseId === "string" ? next.model.phases.find((phase) => phase.phaseId === phaseId) : undefined;
    const prior = typeof phaseId === "string" ? previous.model.phases.find((phase) => phase.phaseId === phaseId) : undefined;
    if (!current || !prior) {
      issues.push(`${event.type} must resolve to the same real Phase in both the previous and resulting canonical models`);
      continue;
    }
    if (current.provenance.modelRevision !== revision) {
      issues.push(`${event.type} ${current.phaseId} must bind the resulting Phase provenance to modelRevision ${revision}`);
    }

    if (event.type === "phase.started") {
      const validStart = (prior.status === "PROPOSED" || prior.status === "APPROVED") && current.status === "IMPLEMENTING";
      if (!validStart) {
        issues.push(`phase.started ${current.phaseId} does not represent a valid transition into IMPLEMENTING`);
        continue;
      }
      if (phaseTransitionFingerprint(prior, true) !== phaseTransitionFingerprint(current, true) && !hasIndependentPhaseSemanticAuthority(previous, next, current.phaseId)) {
        issues.push(`phase.started ${current.phaseId} cannot authorize Phase fields outside the start transition`);
      }
      continue;
    }

    if (!isLockedPhaseVerdict(current.lockVerdict)) {
      issues.push(`phase.locked ${current.phaseId} requires a valid lock transition with an affirmative resulting lockVerdict`);
      continue;
    }
    const statusTransition = (prior.status === "PROPOSED" || prior.status === "APPROVED" || prior.status === "IMPLEMENTING")
      && current.status === "LIVE";
    const lockVerdictChanged = prior.lockVerdict !== current.lockVerdict;
    const verdictTransition = lockVerdictChanged
      && isLockedPhaseVerdict(current.lockVerdict)
      && !isLockedPhaseVerdict(prior.lockVerdict);
    if (!statusTransition && !verdictTransition) {
      issues.push(`phase.locked ${current.phaseId} does not represent a valid lock transition into LIVE or a verified lockVerdict`);
      continue;
    }
    if (lockVerdictChanged && !isLockedPhaseVerdict(current.lockVerdict)) {
      issues.push(`phase.locked ${current.phaseId} requires a verified or locked resulting lockVerdict when lockVerdict changes`);
    }
    if (phaseTransitionFingerprint(prior, false) !== phaseTransitionFingerprint(current, false) && !hasIndependentPhaseSemanticAuthority(previous, next, current.phaseId)) {
      issues.push(`phase.locked ${current.phaseId} cannot authorize Phase fields outside the lock transition`);
    }
  }
  return issues;
}

function intentPromiseBodyFingerprint(intent: CanonicalModel["intent"][number]): string {
  const { provenance: _provenance, authorityProof: _authorityProof, ...semanticFields } = intent;
  return canonicalize(semanticFields);
}

function intentProofFingerprint(intent: CanonicalModel["intent"][number]): string | undefined {
  return intent.authorityProof ? canonicalize(intent.authorityProof) : undefined;
}

function sameStringArray(left: string[], right: string[]): boolean {
  return canonicalize([...left].sort()) === canonicalize([...right].sort());
}

function validateIntentConfirmationAuthority(previous: PersistenceSnapshot, next: PersistenceSnapshot): string[] {
  const issues: string[] = [];
  const revision = next.model.canonicalState.modelRevision;
  const appendedConfirmations = appendedHistory(previous, next).filter((event) => event.type === "intent.confirmed");
  for (const event of appendedConfirmations) {
    const payload = objectPayload(event.payload);
    const promiseId = payload?.promiseId;
    const current = typeof promiseId === "string" ? next.model.intent.find((intent) => intent.promiseId === promiseId) : undefined;
    const prior = typeof promiseId === "string" ? previous.model.intent.find((intent) => intent.promiseId === promiseId) : undefined;
    if (!current || !prior) {
      issues.push(`intent.confirmed must resolve to the same real Promise in both the previous and resulting canonical models`);
      continue;
    }
    if (current.authority !== "DECLARED_INTENT" || !current.authorityProof) {
      issues.push(`intent.confirmed ${current.promiseId} requires resulting DECLARED_INTENT with current authorityProof`);
      continue;
    }
    if (current.provenance.modelRevision !== revision) {
      issues.push(`intent.confirmed ${current.promiseId} must bind Promise provenance to modelRevision ${revision}`);
    }
    if (payload?.proofId !== current.authorityProof.proofId) {
      issues.push(`intent.confirmed ${current.promiseId} proofId must match the resulting authorityProof`);
    }
    if (payload?.sourceRecordId !== undefined && payload.sourceRecordId !== current.authorityProof.sourceRecordId) {
      issues.push(`intent.confirmed ${current.promiseId} sourceRecordId must match the resulting authorityProof`);
    }
    if (payload?.confirmedAt !== undefined && payload.confirmedAt !== current.authorityProof.confirmedAt) {
      issues.push(`intent.confirmed ${current.promiseId} confirmedAt must match the resulting authorityProof`);
    }
    if (payload?.lineageEventIds !== undefined) {
      if (!Array.isArray(payload.lineageEventIds) || payload.lineageEventIds.length === 0 || payload.lineageEventIds.some((value) => typeof value !== "string" || value.trim().length === 0)) {
        issues.push(`intent.confirmed ${current.promiseId} lineageEventIds must be a non-empty string array`);
      } else if (!sameStringArray(payload.lineageEventIds as string[], current.authorityProof.lineageEventIds)) {
        issues.push(`intent.confirmed ${current.promiseId} lineageEventIds must match the resulting authorityProof`);
      }
    }

    const matchingEvents = appendedConfirmations.filter((candidate) => objectPayload(candidate.payload)?.promiseId === current.promiseId);
    if (matchingEvents.length > 1) issues.push(`intent.confirmed ${current.promiseId} cannot be repeated within one model revision`);

    const priorBody = intentPromiseBodyFingerprint(prior);
    const currentBody = intentPromiseBodyFingerprint(current);
    const bodyChanged = priorBody !== currentBody;
    const priorProof = intentProofFingerprint(prior);
    const currentProof = intentProofFingerprint(current);
    const proofChanged = priorProof !== currentProof;

    if (prior.authority === "EXTRACTED_INTENT_CANDIDATE") {
      if (current.authority !== "DECLARED_INTENT" || !current.authorityProof) {
        issues.push(`intent.confirmed ${current.promiseId} must transition an extracted intent candidate into declared intent`);
      }
      continue;
    }

    if (prior.authority !== "DECLARED_INTENT") {
      issues.push(`intent.confirmed ${current.promiseId} requires a supported prior intent authority state`);
      continue;
    }
    if (!bodyChanged && !proofChanged) {
      issues.push(`intent.confirmed ${current.promiseId} cannot be reused for an unchanged declared Promise`);
      continue;
    }
    if (bodyChanged && !proofChanged) {
      issues.push(`intent.confirmed ${current.promiseId} cannot reuse an old authorityProof for changed Promise content`);
      continue;
    }
    if (proofChanged && prior.authorityProof && current.authorityProof) {
      if (prior.authorityProof.sourceRecordId === current.authorityProof.sourceRecordId) {
        issues.push(`intent.confirmed ${current.promiseId} requires a new sourceRecordId for a new confirmation authority`);
      }
      if (sameStringArray(prior.authorityProof.lineageEventIds, current.authorityProof.lineageEventIds)) {
        issues.push(`intent.confirmed ${current.promiseId} requires new confirmation lineage for the resulting revision`);
      }
    }
  }
  return issues;
}

function authorityCoverageForEvent(
  previous: CanonicalModel,
  next: CanonicalModel,
  event: HistoryEvent,
  index: CanonicalIdentityIndex,
): { coverage: Set<CanonicalEntityId>; issues: string[] } {
  const coverage = new Set<CanonicalEntityId>();
  const issues: string[] = [];
  const payload = objectPayload(event.payload);
  const revision = next.canonicalState.modelRevision;
  if (!payload || payloadRevision(event.payload) !== revision) return { coverage, issues };

  if (event.type === "decision.recorded") {
    const decisionId = payload.decisionId;
    const decision = typeof decisionId === "string" ? next.decisions.find((candidate) => candidate.decisionId === decisionId) : undefined;
    if (!decision) {
      issues.push(`decision.recorded must resolve to a current canonical Decision: ${String(decisionId)}`);
      return { coverage, issues };
    }
    if (!revisionBoundDecision(decision, revision)) {
      issues.push(`decision.recorded ${decision.decisionId} is not valid for modelRevision ${revision}`);
    }
    const recordCoverage = recordAffectedCoverage(decision.affectedEntityIds, index, issues, `Decision ${decision.decisionId}`);
    const eventCoverage = eventAffectedCoverageWithinRecord(payload, recordCoverage, index, issues, `decision.recorded ${decision.decisionId}`);
    coverage.add(typedIdentity("DECISION", decision.decisionId));
    for (const identity of eventCoverage) coverage.add(identity);
    return { coverage, issues };
  }

  if (event.type.startsWith("mutation.")) {
    const mutationId = payload.mutationId;
    const mutation = typeof mutationId === "string" ? next.mutations.find((candidate) => candidate.mutationId === mutationId) : undefined;
    if (!mutation) {
      issues.push(`${event.type} must resolve to a current canonical Mutation: ${String(mutationId)}`);
      return { coverage, issues };
    }
    if (!revisionBoundMutation(mutation, revision)) {
      issues.push(`${event.type} ${mutation.mutationId} is not valid for modelRevision ${revision}`);
    }
    const prior = previous.mutations.find((candidate) => candidate.mutationId === mutation.mutationId);
    if (!mutationTransitionValid(prior, mutation, event.type)) {
      issues.push(`${event.type} ${mutation.mutationId} does not represent a valid canonical Mutation status transition`);
    }
    const recordCoverage = recordAffectedCoverage(mutation.affectedEntityIds, index, issues, `Mutation ${mutation.mutationId}`);
    const eventCoverage = eventAffectedCoverageWithinRecord(payload, recordCoverage, index, issues, `${event.type} ${mutation.mutationId}`);
    coverage.add(typedIdentity("MUTATION", mutation.mutationId));
    for (const identity of eventCoverage) coverage.add(identity);
    return { coverage, issues };
  }

  return { coverage, issues };
}

/**
 * Returns type-resolved, event-authorized canonical identities using the
 * governed previous/candidate model identity context. Context-free calls are
 * intentionally impossible because raw IDs are not canonical identities.
 */
export function historyCoverage(previous: CanonicalModel, next: CanonicalModel, appendedEvents: HistoryEvent[]): Set<CanonicalEntityId> {
  const coverage = new Set<CanonicalEntityId>();
  const index = createCanonicalIdentityIndex(previous, next);
  for (const event of appendedEvents) {
    const result = typedCoverageForEvent(event, index);
    const authority = authorityCoverageForEvent(previous, next, event, index);
    for (const id of result.coverage) coverage.add(id);
    for (const id of authority.coverage) coverage.add(id);
  }
  return coverage;
}

function typedHistoryCoverage(previous: PersistenceSnapshot, next: PersistenceSnapshot, events: HistoryEvent[]): { coverage: Set<CanonicalEntityId>; issues: string[] } {
  const index = createCanonicalIdentityIndex(previous.model, next.model);
  const coverage = new Set<CanonicalEntityId>();
  const issues: string[] = [];
  const revision = next.model.canonicalState.modelRevision;
  for (const event of events) {
    const result = typedCoverageForEvent(event, index);
    const authority = authorityCoverageForEvent(previous.model, next.model, event, index);
    for (const id of result.coverage) coverage.add(id);
    for (const id of authority.coverage) coverage.add(id);
    issues.push(...result.issues, ...authority.issues);
    const coveredCapabilities = [...coverage]
      .filter((id) => id.startsWith("CAPABILITY:"))
      .map((id) => id.slice("CAPABILITY:".length));
    if (coveredCapabilities.length > 0 && event.type.startsWith("capability.")) {
      for (const lineage of next.model.capabilityLineage) {
        if (lineage.effectiveRevision !== revision || !lineageHistoryTypes(lineage.type).includes(event.type)) continue;
        if (lineageAffectedEntityIds(lineage).some((capabilityId) => coveredCapabilities.includes(capabilityId))) {
          coverage.add(typedIdentity("LINEAGE", lineage.eventId));
        }
      }
    }
  }
  return { coverage, issues };
}

export function validateCausalHistoryCoverage(previous: PersistenceSnapshot, next: PersistenceSnapshot): string[] {
  if (next.model.canonicalState.modelRevision <= 1) return [];
  const changeSet = canonicalChangeSet(previous.model, next.model);
  const typedCoverage = typedHistoryCoverage(previous, next, appendedHistory(previous, next));
  const uncovered = [...changeSet].filter((id) => !typedCoverage.coverage.has(id)).sort();
  const issues = [...typedCoverage.issues];
  if (uncovered.length > 0) issues.push(`canonical semantic change lacks causal history coverage for entity IDs: ${uncovered.join(", ")}`);
  return issues;
}

function hasBoundHistoryEvent(previous: PersistenceSnapshot, next: PersistenceSnapshot, types: string[], entityId?: string, predicate?: (payload: Record<string, unknown>) => boolean): boolean {
  return appendedHistory(previous, next).some((event) => {
    if (!types.includes(event.type) || payloadRevision(event.payload) !== next.model.canonicalState.modelRevision) return false;
    const payload = objectPayload(event.payload);
    if (!payload) return false;
    if (entityId) {
      const typed = typedHistoryCoverage(previous, next, [event]).coverage;
      const expectedKinds: CanonicalEntityKind[] = types.some((type) => type.startsWith("evidence.")) ? ["EVIDENCE"] : ["CAPABILITY"];
      if (!expectedKinds.some((kind) => typed.has(typedIdentity(kind, entityId)))) return false;
    }
    return predicate ? predicate(payload) : true;
  });
}

function lineageEventsForRevision(model: CanonicalModel, revision: number) {
  return model.capabilityLineage.filter((event) => event.effectiveRevision === revision);
}

function lineageCovers(event: CanonicalModel["capabilityLineage"][number], capabilityId: string, type: string): boolean {
  return event.type === type && (event.capabilityId === capabilityId || event.fromCapabilityIds.includes(capabilityId) || event.toCapabilityIds.includes(capabilityId));
}

function validatePhase0HistoryEvents(previous: PersistenceSnapshot, next: PersistenceSnapshot): string[] {
  const issues: string[] = [];
  const revision = next.model.canonicalState.modelRevision;
  for (const event of appendedHistory(previous, next)) {
    if (!PHASE_0_HISTORY_TYPES.has(event.type) && !event.type.startsWith("extension.")) {
      issues.push(`history event type ${event.type} is not an approved Phase 0 event or explicit extension`);
      continue;
    }
    const payload = objectPayload(event.payload);
    if (!payload) {
      issues.push(`history event ${event.type} payload must be an object`);
      continue;
    }
    if (payloadRevision(event.payload) !== revision || typeof payload.modelRevision !== "number") {
      issues.push(`history event ${event.type} must bind explicitly to modelRevision ${revision}`);
    }

    const requireString = (key: string): void => {
      if (!hasNonEmptyString(payload, key)) issues.push(`history event ${event.type} requires non-empty ${key}`);
    };
    const requireIds = (keys: string[]): void => {
      if (!hasNonEmptyStringArray(payload, keys)) issues.push(`history event ${event.type} requires non-empty entity IDs in ${keys.join(" or ")}`);
    };

    if (event.type.startsWith("extension.")) continue;

    switch (event.type) {
      case "model.reconciled":
        requireString("reason");
        requireIds(["changedEntityIds", "affectedEntityIds"]);
        break;
      case "decision.recorded":
        requireString("decisionId");
        if (payload.affectedEntityIds !== undefined && !hasNonEmptyStringArray(payload, ["affectedEntityIds"])) requireIds(["affectedEntityIds"]);
        break;
      case "capability.introduced":
      case "capability.retired":
      case "capability.restored":
        requireString("capabilityId");
        break;
      case "capability.renamed":
        requireString("capabilityId");
        if (!hasIdentityInformation(payload)) issues.push(`history event ${event.type} requires previous/new identity information or an explicit lineage reference`);
        break;
      case "capability.moved":
        requireString("capabilityId");
        requireString("previousRuntimeHomeId");
        requireString("nextRuntimeHomeId");
        requireString("reason");
        break;
      case "capability.superseded":
        requireString("capabilityId");
        if (!hasReplacementInformation(payload)) issues.push(`history event ${event.type} requires replacement capability identity`);
        break;
      case "capability.merged":
      case "capability.split": {
        requireIds(["capabilityIds", "affectedCapabilityIds", "fromCapabilityIds", "toCapabilityIds"]);
        if (payload.affectedEntityIds !== undefined) {
          issues.push(`history event ${event.type} does not authorize generic affectedEntityIds`);
        }
        break;
      }
      case "mutation.proposed":
      case "mutation.approved":
      case "mutation.rejected":
      case "mutation.completed":
        requireString("mutationId");
        break;
      case "evidence.recorded":
        requireString("evidenceId");
        break;
      case "evidence.availability.changed":
        requireString("evidenceId");
        if (!hasBoolean(payload, "previousAvailable")) issues.push(`history event ${event.type} requires boolean previousAvailable`);
        if (!hasBoolean(payload, "nextAvailable")) issues.push(`history event ${event.type} requires boolean nextAvailable`);
        requireString("reason");
        break;
      case "phase.locked":
        requireString("phaseId");
        break;
      case "phase.started":
        requireString("phaseId");
        break;
      case "intent.confirmed":
        requireString("promiseId");
        requireString("proofId");
        break;
      case "recovery.opened":
        requireString("recoveryId");
        if (!hasNonEmptyString(payload, "recoveryAction") && !hasNonEmptyString(payload, "action")) issues.push(`history event ${event.type} requires recovery action`);
        requireString("reason");
        break;
      case "recovery.completed":
        requireString("recoveryId");
        if (!hasNonEmptyString(payload, "recoveryAction") && !hasNonEmptyString(payload, "action")) issues.push(`history event ${event.type} requires recovery action`);
        requireString("reason");
        requireString("result");
        break;
      default:
        break;
    }
  }
  return issues;
}

function lineageHistoryTypes(type: CanonicalModel["capabilityLineage"][number]["type"]): string[] {
  const specific: Record<CanonicalModel["capabilityLineage"][number]["type"], string[]> = {
    INTRODUCED: ["capability.introduced"],
    RENAME: ["capability.renamed"],
    MOVE: ["capability.moved"],
    MERGED_INTO: ["capability.merged"],
    SPLIT_INTO: ["capability.split"],
    SUPERSEDES: ["capability.superseded"],
    RETIRED: ["capability.retired"],
    RESTORED: ["capability.restored"],
  };
  return [...specific[type], "model.reconciled"];
}

function lineageTransitionExists(previous: CanonicalModel, next: CanonicalModel, event: CanonicalModel["capabilityLineage"][number]): boolean {
  const previousById = new Map(previous.capabilities.map((capability) => [capability.capabilityId, capability]));
  const nextById = new Map(next.capabilities.map((capability) => [capability.capabilityId, capability]));
  const prior = previousById.get(event.capabilityId);
  const current = nextById.get(event.capabilityId);
  switch (event.type) {
    case "INTRODUCED":
      return !prior && Boolean(current) && event.toCapabilityIds.includes(event.capabilityId);
    case "RENAME":
      return Boolean(prior && current && prior.name !== current.name);
    case "MOVE":
      return Boolean(
        prior && current
        && prior.runtimeHomeId !== current.runtimeHomeId
        && event.previousRuntimeHomeId === (prior.runtimeHomeId ?? undefined)
        && event.nextRuntimeHomeId === (current.runtimeHomeId ?? undefined),
      );
    case "RETIRED":
      return Boolean(prior && current && prior.lifecycleStatus !== "RETIRED" && current.lifecycleStatus === "RETIRED");
    case "RESTORED":
      return Boolean(prior && current && (prior.lifecycleStatus === "RETIRED" || prior.lifecycleStatus === "SUPERSEDED") && current.lifecycleStatus === "LIVE");
    case "SUPERSEDES":
      return Boolean(
        prior && current && current.lifecycleStatus === "SUPERSEDED"
        && event.fromCapabilityIds.includes(event.capabilityId)
        && event.toCapabilityIds.some((capabilityId) => nextById.has(capabilityId) && capabilityId !== event.capabilityId),
      );
    case "MERGED_INTO":
      return Boolean(
        prior && current && current.lifecycleStatus === "SUPERSEDED"
        && event.fromCapabilityIds.includes(event.capabilityId)
        && event.toCapabilityIds.some((capabilityId) => nextById.has(capabilityId) && capabilityId !== event.capabilityId),
      );
    case "SPLIT_INTO":
      return Boolean(
        prior && current && current.lifecycleStatus === "SUPERSEDED"
        && event.fromCapabilityIds.includes(event.capabilityId)
        && event.toCapabilityIds.length > 0
        && event.toCapabilityIds.every((capabilityId) => nextById.has(capabilityId) && !previousById.has(capabilityId)),
      );
  }
}

function validatePriorLineagePreserved(previous: PersistenceSnapshot, next: PersistenceSnapshot): string[] {
  const issues: string[] = [];
  const nextByEventId = new Map(next.model.capabilityLineage.map((event) => [event.eventId, event]));
  for (const priorEvent of previous.model.capabilityLineage) {
    const currentEvent = nextByEventId.get(priorEvent.eventId);
    if (!currentEvent) {
      issues.push(`prior capability lineage event ${priorEvent.eventId} disappeared`);
      continue;
    }
    if (canonicalize(priorEvent) !== canonicalize(currentEvent)) {
      issues.push(`prior capability lineage event ${priorEvent.eventId} is immutable and cannot be rewritten`);
    }
  }

  const nextCapabilitiesById = new Map(next.model.capabilities.map((capability) => [capability.capabilityId, capability]));
  for (const priorCapability of previous.model.capabilities) {
    const currentCapability = nextCapabilitiesById.get(priorCapability.capabilityId);
    if (!currentCapability) continue;
    for (const lineageEventId of priorCapability.lineageEventIds) {
      if (!currentCapability.lineageEventIds.includes(lineageEventId)) {
        issues.push(`capability ${priorCapability.capabilityId} lost prior lineage reference ${lineageEventId}`);
      }
    }
  }
  return issues;
}

function validateNewLineageHistoryBinding(previous: PersistenceSnapshot, next: PersistenceSnapshot): string[] {
  const issues: string[] = [];
  const previousEventIds = new Set(previous.model.capabilityLineage.map((event) => event.eventId));
  const revision = next.model.canonicalState.modelRevision;
  const nextCapabilitiesById = new Map(next.model.capabilities.map((capability) => [capability.capabilityId, capability]));
  for (const event of next.model.capabilityLineage.filter((candidate) => !previousEventIds.has(candidate.eventId))) {
    if (event.effectiveRevision !== revision) issues.push(`new capability lineage event ${event.eventId} must bind to modelRevision ${revision}`);
    const capability = nextCapabilitiesById.get(event.capabilityId);
    if (!capability) {
      issues.push(`new capability lineage event ${event.eventId} references capability ${event.capabilityId} that is not present`);
    } else if (!capability.lineageEventIds.includes(event.eventId)) {
      issues.push(`capability ${event.capabilityId} does not reference new lineage event ${event.eventId}`);
    }
    if (!lineageTransitionExists(previous.model, next.model, event)) {
      issues.push(`new capability lineage event ${event.eventId} does not match a capability transition`);
    }
    const affectedIds = new Set(lineageAffectedEntityIds(event));
    const hasMatchingHistory = appendedHistory(previous, next).some((historyEvent) => {
      if (!lineageHistoryTypes(event.type).includes(historyEvent.type) || payloadRevision(historyEvent.payload) !== revision) return false;
      const typed = typedHistoryCoverage(previous, next, [historyEvent]).coverage;
      return [...affectedIds].some((capabilityId) => typed.has(typedIdentity("CAPABILITY", capabilityId)))
        && (objectPayload(historyEvent.payload)?.lineageEventId === undefined || typed.has(typedIdentity("LINEAGE", event.eventId)));
    });
    if (!hasMatchingHistory) {
      issues.push(`new capability lineage event ${event.eventId} lacks matching revision-bound history`);
    }
  }
  return issues;
}

function evidenceIdentityFields(evidence: Evidence): unknown {
  return {
    subjectId: evidence.subjectId,
    source: evidence.source,
    environment: evidence.environment,
    artifactPath: evidence.artifactPath,
    verificationLevel: evidence.verificationLevel,
    capturedAt: evidence.capturedAt,
    contentHash: evidence.contentHash,
    truthBoundary: evidence.truthBoundary,
    reproducibility: evidence.reproducibility,
    provenance: { source: evidence.provenance.source, sourceRef: evidence.provenance.sourceRef },
  };

}

function validateSemanticCapabilityTransitions(previous: PersistenceSnapshot, next: PersistenceSnapshot, issues: string[]): void {
  const previousById = new Map(previous.model.capabilities.map((capability) => [capability.capabilityId, capability]));
  const nextById = new Map(next.model.capabilities.map((capability) => [capability.capabilityId, capability]));
  const lineage = lineageEventsForRevision(next.model, next.model.canonicalState.modelRevision);
  const history = appendedHistory(previous, next);
  const historyFor = (types: string[], capabilityId: string) => hasBoundHistoryEvent(previous, next, types, capabilityId);
  const hasLineage = (capabilityId: string, types: string[]) => lineage.some((event) => types.some((type) => lineageCovers(event, capabilityId, type)));

  for (const [capabilityId, prior] of previousById) {
    const current = nextById.get(capabilityId);
    if (!current) {
      if (!hasLineage(capabilityId, ["SUPERSEDES", "MERGED_INTO", "SPLIT_INTO", "RETIRED"])) issues.push(`capability identity ${capabilityId} disappeared without explicit lineage`);
      continue;
    }
    if (prior.name !== current.name && !(hasLineage(capabilityId, ["RENAME"]) && historyFor(["capability.renamed", "model.reconciled"], capabilityId))) {
      issues.push(`capability ${capabilityId} name changed without RENAME lineage and revision-bound history`);
    }
    if (prior.runtimeHomeId !== current.runtimeHomeId) {
      const move = lineage.find((event) => event.capabilityId === capabilityId && event.type === "MOVE" && event.previousRuntimeHomeId === (prior.runtimeHomeId ?? undefined) && event.nextRuntimeHomeId === (current.runtimeHomeId ?? undefined));
      const removalTransition = lineage.some((event) => ["RETIRED", "SUPERSEDES", "MERGED_INTO", "SPLIT_INTO"].includes(event.type) && lineageCovers(event, capabilityId, event.type) && event.previousRuntimeHomeId === (prior.runtimeHomeId ?? undefined));
      if (!move && !removalTransition) issues.push(`capability ${capabilityId} runtime home changed without explicit lineage`);
      if (!(historyFor(["capability.moved", "capability.retired", "capability.superseded", "capability.merged", "capability.split", "model.reconciled"], capabilityId))) issues.push(`capability ${capabilityId} runtime-home transition lacks revision-bound history`);
    }
    if (prior.lifecycleStatus !== current.lifecycleStatus) {
      const requiredTypes = current.lifecycleStatus === "SUPERSEDED" ? ["SUPERSEDES", "MERGED_INTO", "SPLIT_INTO"] : current.lifecycleStatus === "RETIRED" ? ["RETIRED"] : (prior.lifecycleStatus === "RETIRED" || prior.lifecycleStatus === "SUPERSEDED") && current.lifecycleStatus === "LIVE" ? ["RESTORED"] : [];
      if (requiredTypes.length > 0 && !hasLineage(capabilityId, requiredTypes)) issues.push(`capability ${capabilityId} lifecycle transition to ${current.lifecycleStatus} lacks explicit lineage`);
      if (requiredTypes.length > 0 && !historyFor(["capability.superseded", "capability.retired", "capability.restored", "capability.merged", "capability.split", "model.reconciled"], capabilityId)) issues.push(`capability ${capabilityId} lifecycle transition lacks revision-bound history`);
    }
  }
  for (const current of next.model.capabilities) {
    if (!previousById.has(current.capabilityId)) {
      const introduced = lineage.some((event) => event.capabilityId === current.capabilityId && event.type === "INTRODUCED") || lineage.some((event) => event.type === "SPLIT_INTO" && event.toCapabilityIds.includes(current.capabilityId));
      if (!introduced) issues.push(`capability ${current.capabilityId} was introduced without INTRODUCED or SPLIT_INTO lineage`);
      if (!historyFor(["capability.introduced", "capability.split", "model.reconciled"], current.capabilityId)) issues.push(`capability ${current.capabilityId} introduction lacks revision-bound history`);
    }
  }
}

function validateSemanticEvidenceTransitions(previous: PersistenceSnapshot, next: PersistenceSnapshot, issues: string[]): void {
  const previousById = new Map(previous.model.evidenceRefs.map((evidence) => [evidence.evidenceId, evidence]));
  const nextById = new Map(next.model.evidenceRefs.map((evidence) => [evidence.evidenceId, evidence]));
  for (const [evidenceId, prior] of previousById) {
    const current = nextById.get(evidenceId);
    if (!current) {
      issues.push(`evidence identity ${evidenceId} disappeared from canonical evidence records`);
      continue;
    }
    if (canonicalize(evidenceIdentityFields(prior)) !== canonicalize(evidenceIdentityFields(current))) {
      issues.push(`evidence identity ${evidenceId} is immutable and cannot be rewritten`);
    }
    if (prior.available !== current.available && !hasBoundHistoryEvent(previous, next, ["evidence.availability.changed"], evidenceId, (payload) => payload.reason !== undefined && typeof payload.reason === "string" && (payload.previousAvailable === prior.available || payload.previousAvailable === undefined) && (payload.nextAvailable === current.available || payload.nextAvailable === undefined))) {
      issues.push(`evidence identity ${evidenceId} availability changed without explicit evidence.availability.changed history`);
    }
  }
  const previousManifestById = new Map(previous.evidenceManifest.entries.map((entry) => [entry.evidenceId, entry]));
  const nextManifestById = new Map(next.evidenceManifest.entries.map((entry) => [entry.evidenceId, entry]));
  const revision = next.model.canonicalState.modelRevision;
  for (const [evidenceId, current] of nextById) {
    if (previousById.has(evidenceId)) continue;
    const entry = nextManifestById.get(evidenceId);
    if (!entry) {
      issues.push(`new evidence identity ${evidenceId} lacks a matching evidence-manifest entry`);
      continue;
    }
    if (entry.contentHash !== current.contentHash || entry.artifactPath !== current.artifactPath || entry.available !== current.available) {
      issues.push(`new evidence identity ${evidenceId} does not agree with its evidence-manifest entry`);
    }
    const matchingEvents = appendedHistory(previous, next).filter((event) => event.type === "evidence.recorded" && payloadRevision(event.payload) === revision && objectPayload(event.payload)?.evidenceId === evidenceId);
    if (matchingEvents.length === 0) {
      issues.push(`new evidence identity ${evidenceId} requires revision-bound evidence.recorded history`);
      continue;
    }
    const typed = typedHistoryCoverage(previous, next, matchingEvents);
    if (!typed.coverage.has(typedIdentity("EVIDENCE", evidenceId))) {
      issues.push(`new evidence identity ${evidenceId} evidence.recorded history is not type-correct`);
    }
    for (const event of matchingEvents) {
      const payload = objectPayload(event.payload);
      if (payload?.contentHash !== undefined && payload.contentHash !== current.contentHash) issues.push(`evidence.recorded ${evidenceId} contentHash does not match candidate Evidence`);
      if (payload?.artifactPath !== undefined && payload.artifactPath !== current.artifactPath) issues.push(`evidence.recorded ${evidenceId} artifactPath does not match candidate Evidence`);
      if (payload?.available !== undefined && payload.available !== current.available) issues.push(`evidence.recorded ${evidenceId} availability does not match candidate Evidence`);
    }
  }
}

function validateSemanticTransition(previous: PersistenceSnapshot, next: PersistenceSnapshot): string[] {
  const issues: string[] = [];
  if (next.model.canonicalState.modelRevision > 1) {
    if (next.history.length <= previous.history.length) issues.push("non-bootstrap canonical revision must append history");
    issues.push(...validatePhase0HistoryEvents(previous, next));
    if (appendedHistory(previous, next).length > 0 && !appendedHistory(previous, next).some((event) => payloadRevision(event.payload) === next.model.canonicalState.modelRevision)) issues.push("new canonical revision requires explicitly revision-bound history");
  }
  issues.push(...validatePhaseEventAuthority(previous, next));
  issues.push(...validateIntentConfirmationAuthority(previous, next));
  validateSemanticCapabilityTransitions(previous, next, issues);
  validateSemanticEvidenceTransitions(previous, next, issues);
  return issues;
}


export interface PersistenceSnapshot {
  model: CanonicalModel;
  history: HistoryEvent[];
  evidenceManifest: EvidenceManifest;
}

export interface PersistenceValidationOptions {
  projectRoot?: string;
  verifyEvidenceBytes?: boolean;
}

export interface PersistenceValidation {
  valid: boolean;
  divergence: string[];
}

export type TransactionState =
  | "NO_CANONICAL_STATE"
  | "HEALTHY_CANONICAL_STATE"
  | "PENDING_STAGE"
  | "PENDING_JOURNAL"
  | "PARTIAL_PROMOTION"
  | "DIVERGENT_LIVE_STATE"
  | "QUARANTINED_CANDIDATE"
  | "VALID_PREVIOUS_REVISION"
  | "UNRECOVERABLE_DIVERGENCE";

export interface TransactionStateClassification {
  state: TransactionState;
  reason: string;
  pendingFiles: string[];
  liveFiles: string[];
  previousFiles: string[];
}

export type DurabilityRole =
  | "STAGED_MODEL"
  | "STAGED_HISTORY"
  | "STAGED_EVIDENCE_MANIFEST"
  | "STAGED_JOURNAL"
  | "PREVIOUS_MODEL"
  | "PREVIOUS_HISTORY"
  | "PREVIOUS_EVIDENCE_MANIFEST"
  | "RESTORED_MODEL"
  | "RESTORED_HISTORY"
  | "RESTORED_EVIDENCE_MANIFEST";

export interface DurabilityObserver {
  onDurableWrite?: (filePath: string, role: DurabilityRole) => void | Promise<void>;
  onDirectorySync?: (directoryPath: string) => void | Promise<void>;
}

export interface RecoveryResult {
  status: "COMPLETED" | "NOTHING_TO_RECOVER" | "QUARANTINED";
  state?: TransactionState;
  quarantinePath?: string;
  reason?: string;
}

interface CommitJournal {
  schemaVersion: "0.1.0";
  transactionId: string;
  state: "STAGED";
  modelHash: string;
  historyHash: string;
  evidenceManifestHash: string;
  stagedFiles: string[];
}

interface LockRecord {
  schemaVersion: "0.1.0";
  pid: number;
  instanceToken: string;
  createdAt: number;
}

interface OwnedLock {
  handle: fs.FileHandle;
  lockPath: string;
  ownerPath: string;
  instanceToken: string;
}

export interface PersistencePaths {
  maatRoot: string;
  model: string;
  history: string;
  evidenceManifest: string;
  lock: string;
  journal: string;
  stagedModel: string;
  stagedHistory: string;
  stagedEvidenceManifest: string;
  stagedJournal: string;
  previousModel: string;
  previousHistory: string;
  previousEvidenceManifest: string;
}

export function persistencePaths(root: string): PersistencePaths {
  const maatRoot = path.join(root, ".maat");
  const previousRoot = path.join(maatRoot, "previous");
  return {
    maatRoot,
    model: path.join(maatRoot, "model.json"),
    history: path.join(maatRoot, "history.jsonl"),
    evidenceManifest: path.join(maatRoot, "evidence-manifest.json"),
    lock: path.join(maatRoot, ".canonical.lock"),
    journal: path.join(maatRoot, "canonical-commit.json"),
    stagedModel: path.join(maatRoot, "model.json.stage"),
    stagedHistory: path.join(maatRoot, "history.jsonl.stage"),
    stagedEvidenceManifest: path.join(maatRoot, "evidence-manifest.json.stage"),
    stagedJournal: path.join(maatRoot, "canonical-commit.json.stage"),
    previousModel: path.join(previousRoot, "model.json"),
    previousHistory: path.join(previousRoot, "history.jsonl"),
    previousEvidenceManifest: path.join(previousRoot, "evidence-manifest.json"),
  };
}

export function hashHistoryEvent(sequence: number, type: string, payload: unknown, previousEventHash: string | null): string {
  return sha256Text(canonicalize({ sequence, type, payload, previousEventHash }));
}

export function buildHistoryEvent(sequence: number, type: string, payload: unknown, previousEventHash: string | null): HistoryEvent {
  return { sequence, type, payload, previousEventHash, eventHash: hashHistoryEvent(sequence, type, payload, previousEventHash) };
}

export function validateHistoryChain(history: HistoryEvent[]): string[] {
  const issues: string[] = [];
  let previous: string | null = null;
  history.forEach((event, index) => {
    if (event.sequence !== index + 1) issues.push(`history sequence must be ordered at index ${index}`);
    if (event.previousEventHash !== previous) issues.push(`history previous hash mismatch at sequence ${event.sequence}`);
    const expected = hashHistoryEvent(event.sequence, event.type, event.payload, event.previousEventHash);
    if (event.eventHash !== expected) issues.push(`history event hash mismatch at sequence ${event.sequence}`);
    previous = event.eventHash;
  });
  return issues;
}

function validateRuntimeHomeIntervalTransition(previous: PersistenceSnapshot, next: PersistenceSnapshot, issues: string[]): void {
  const previousHomes = new Map(previous.model.runtimeHomes.map((home) => [home.runtimeHomeId, home]));
  const nextHomes = new Map(next.model.runtimeHomes.map((home) => [home.runtimeHomeId, home]));
  const nextRevision = next.model.canonicalState.modelRevision;
  for (const [runtimeHomeId, prior] of previousHomes) {
    const current = nextHomes.get(runtimeHomeId);
    if (!current) {
      issues.push(`runtime home ${runtimeHomeId} disappeared during the revision transition`);
      continue;
    }
    const { effectiveToRevision: _priorClosure, ...priorWithoutClosure } = prior;
    const { effectiveToRevision: _currentClosure, ...currentWithoutClosure } = current;
    if (canonicalize(priorWithoutClosure) !== canonicalize(currentWithoutClosure)) {
      issues.push(`runtime home ${runtimeHomeId} identity or metadata was rewritten during the revision transition`);
    }
    if (prior.effectiveToRevision !== undefined) {
      if (current.effectiveToRevision !== prior.effectiveToRevision) {
        issues.push(`closed runtime home ${runtimeHomeId} effectiveToRevision was rewritten`);
      }
    } else if (current.effectiveToRevision !== undefined && current.effectiveToRevision !== nextRevision) {
      issues.push(`runtime home ${runtimeHomeId} may only close at the next canonical revision`);
    }
  }

  const previousCapabilities = new Map(previous.model.capabilities.map((capability) => [capability.capabilityId, capability]));
  const nextCapabilities = new Map(next.model.capabilities.map((capability) => [capability.capabilityId, capability]));
  for (const [capabilityId, prior] of previousCapabilities) {
    if (!prior.runtimeHomeId) continue;
    const current = nextCapabilities.get(capabilityId);
    if (!current) continue;
    if (current.runtimeHomeId === prior.runtimeHomeId) {
      const retained = nextHomes.get(prior.runtimeHomeId);
      if (retained?.effectiveToRevision !== undefined) issues.push(`current runtime home ${prior.runtimeHomeId} for capability ${capabilityId} cannot have a closed interval`);
      continue;
    }
    if (!current.historicalRuntimeHomeIds.includes(prior.runtimeHomeId)) {
      issues.push(`capability ${capabilityId} changed runtime home without preserving prior home ${prior.runtimeHomeId} in historicalRuntimeHomeIds`);
    }
    const closed = nextHomes.get(prior.runtimeHomeId);
    if (!closed || closed.effectiveToRevision !== nextRevision) {
      issues.push(`prior current runtime home ${prior.runtimeHomeId} for capability ${capabilityId} must remain present and close at revision ${nextRevision}`);
    }
  }
}

export function validateRevisionTransition(previous: PersistenceSnapshot, next: PersistenceSnapshot): string[] {
  const issues: string[] = [];
  const previousRevision = previous.model.canonicalState.modelRevision;
  const nextRevision = next.model.canonicalState.modelRevision;
  if (nextRevision <= previousRevision) issues.push("canonical modelRevision must increase monotonically");
  if (next.history.length < previous.history.length) issues.push("history cannot lose prior events during a revision transition");

  const nextEvidenceById = new Map(next.evidenceManifest.entries.map((entry) => [entry.evidenceId, entry]));
  for (const previousEntry of previous.evidenceManifest.entries) {
    const nextEntry = nextEvidenceById.get(previousEntry.evidenceId);
    if (!nextEntry) {
      issues.push(`evidence identity ${previousEntry.evidenceId} disappeared during the revision transition`);
      continue;
    }
    if (nextEntry.contentHash !== previousEntry.contentHash) {
      issues.push(`evidence identity ${previousEntry.evidenceId} content hash changed during the revision transition`);
    }
    if (nextEntry.artifactPath !== previousEntry.artifactPath) {
      issues.push(`evidence identity ${previousEntry.evidenceId} artifact path changed during the revision transition`);
    }
  }

  const shared = Math.min(previous.history.length, next.history.length);
  for (let index = 0; index < shared; index += 1) {
    if (previous.history[index].eventHash !== next.history[index].eventHash) {
      issues.push(`history prefix diverges at sequence ${index + 1}`);
      break;
    }
  }
  if (next.model.canonicalState.historyHead.sequence < previous.model.canonicalState.historyHead.sequence) issues.push("history head sequence cannot move backward");
  if (next.model.canonicalState.evidenceHead.sequence < previous.model.canonicalState.evidenceHead.sequence) issues.push("evidence head sequence cannot move backward");
  issues.push(...validateSemanticTransition(previous, next));
  validateRuntimeHomeIntervalTransition(previous, next, issues);
  issues.push(...validateCausalHistoryCoverage(previous, next));
  issues.push(...validatePriorLineagePreserved(previous, next));
  issues.push(...validateNewLineageHistoryBinding(previous, next));
  return issues;
}

export function prepareCanonicalRevision(snapshot: PersistenceSnapshot): PersistenceSnapshot {
  const model = structuredClone(snapshot.model);
  const history = structuredClone(snapshot.history);
  const evidenceManifest = structuredClone(snapshot.evidenceManifest);
  const lastEvent = history[history.length - 1];
  model.canonicalState.historyHead = { sequence: lastEvent?.sequence ?? 0, eventHash: lastEvent?.eventHash ?? GENESIS_EVENT_HASH };
  model.canonicalState.evidenceHead = { sequence: evidenceManifest.entries.length, manifestHash: computeEvidenceManifestHash(evidenceManifest) };
  model.canonicalState.integrity.historyHash = computeHistoryHash(history);
  model.canonicalState.integrity.evidenceManifestHash = computeEvidenceManifestHash(evidenceManifest);
  model.canonicalState.integrity.modelHash = computeModelHash(model);
  return { model, history, evidenceManifest };
}

export function validatePersistenceSnapshot(snapshot: PersistenceSnapshot, options: PersistenceValidationOptions = {}): PersistenceValidation {
  const divergence: string[] = [];
  const modelValidation = validateCanonicalModel(snapshot.model, {
    evidenceManifest: snapshot.evidenceManifest,
    projectRoot: options.projectRoot,
    verifyEvidenceBytes: options.verifyEvidenceBytes ?? Boolean(options.projectRoot),
  });
  if (!modelValidation.valid) divergence.push(...modelValidation.issues.map((item) => `model ${item.path}: ${item.message}`));
  divergence.push(...validateHistoryChain(snapshot.history));
  const expectedModelHash = computeModelHash(snapshot.model);
  if (snapshot.model.canonicalState.integrity.modelHash !== expectedModelHash) divergence.push("modelHash divergence");
  const historyHead = snapshot.history[snapshot.history.length - 1];
  const expectedHistorySequence = historyHead?.sequence ?? 0;
  const expectedHistoryEventHash = historyHead?.eventHash ?? GENESIS_EVENT_HASH;
  if (snapshot.model.canonicalState.historyHead.sequence !== expectedHistorySequence) divergence.push("history head sequence divergence");
  if (snapshot.model.canonicalState.historyHead.eventHash !== expectedHistoryEventHash) divergence.push("history head event divergence");
  const expectedHistoryHash = computeHistoryHash(snapshot.history);
  if (snapshot.model.canonicalState.integrity.historyHash !== expectedHistoryHash) divergence.push("historyHash divergence");
  const expectedEvidenceHash = computeEvidenceManifestHash(snapshot.evidenceManifest);
  if (snapshot.model.canonicalState.evidenceHead.manifestHash !== expectedEvidenceHash) divergence.push("evidence head manifest divergence");
  if (snapshot.model.canonicalState.integrity.evidenceManifestHash !== expectedEvidenceHash) divergence.push("evidenceManifestHash divergence");
  if (snapshot.model.canonicalState.evidenceHead.sequence !== snapshot.evidenceManifest.entries.length) divergence.push("evidence head sequence divergence");
  return { valid: divergence.length === 0, divergence };
}

function lockRecord(instanceToken: string): LockRecord {
  return { schemaVersion: "0.1.0", pid: process.pid, instanceToken, createdAt: Date.now() };
}

async function processIsAlive(pid: number): Promise<boolean> {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

async function readLockRecord(lockPath: string): Promise<LockRecord | undefined> {
  try {
    const parsed = JSON.parse(await fs.readFile(lockPath, "utf8")) as Partial<LockRecord>;
    if (parsed.schemaVersion !== "0.1.0" || !Number.isInteger(parsed.pid) || (parsed.pid as number) <= 0 || typeof parsed.instanceToken !== "string" || parsed.instanceToken.length === 0 || !Number.isFinite(parsed.createdAt)) return undefined;
    return parsed as LockRecord;
  } catch {
    return undefined;
  }
}

async function renameStaleLock(lockPath: string): Promise<boolean> {
  const stalePath = `${lockPath}.stale-${randomBytes(8).toString("hex")}`;
  try {
    await fs.rename(lockPath, stalePath);
    await fs.rm(stalePath, { force: true });
    return true;
  } catch {
    return false;
  }
}

async function hasOpenDescriptorForPath(filePath: string): Promise<boolean> {
  const normalized = path.resolve(filePath);
  let processEntries: string[];
  try {
    processEntries = await fs.readdir("/proc");
  } catch {
    return false;
  }
  for (const processEntry of processEntries.filter((entry) => /^\d+$/.test(entry))) {
    let descriptorEntries: string[];
    try {
      descriptorEntries = await fs.readdir(path.join("/proc", processEntry, "fd"));
    } catch {
      continue;
    }
    for (const descriptorEntry of descriptorEntries) {
      try {
        const target = await fs.readlink(path.join("/proc", processEntry, "fd", descriptorEntry));
        if (path.resolve(target.replace(/ \(deleted\)$/, "")) === normalized) return true;
      } catch {
        // Descriptors may close while the directory is being inspected.
      }
    }
  }
  return false;
}

async function takeOverStaleLock(lockPath: string, allowMalformedRecovery = false): Promise<boolean> {
  const record = await readLockRecord(lockPath);
  if (record) return !(await processIsAlive(record.pid)) && await renameStaleLock(lockPath);
  if (await hasOpenDescriptorForPath(lockPath)) return false;
  try {
    const metadata = await fs.stat(lockPath);
    const aged = Date.now() - metadata.mtimeMs > MALFORMED_LOCK_GRACE_MS;
    // A malformed residue is recoverable only when no descriptor still proves
    // ownership and the residue is clearly aged, or an explicit recovery call
    // has established abandonment. Age never overrides an open descriptor.
    return (allowMalformedRecovery || aged) && await renameStaleLock(lockPath);
  } catch {
    return false;
  }
}

async function acquireExclusiveLock(lockPath: string, options: { allowMalformedRecovery?: boolean } = {}): Promise<OwnedLock> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const instanceToken = randomBytes(16).toString("hex");
    const ownerPath = `${lockPath}.owner-${instanceToken}`;
    let ownerHandle: fs.FileHandle | undefined;
    try {
      ownerHandle = await fs.open(ownerPath, "wx");
      await ownerHandle.writeFile(`${JSON.stringify(lockRecord(instanceToken))}\n`, "utf8");
      await ownerHandle.sync();
      await syncDirectory(path.dirname(lockPath));
      await fs.link(ownerPath, lockPath);
      return { handle: ownerHandle, lockPath, ownerPath, instanceToken };
    } catch (error) {
      if (ownerHandle) await ownerHandle.close().catch(() => undefined);
      await fs.rm(ownerPath, { force: true }).catch(() => undefined);
      if (attempt === 0 && await takeOverStaleLock(lockPath, options.allowMalformedRecovery)) continue;
      throw new Error(`canonical persistence lock is already held: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  throw new Error("canonical persistence lock is already held");
}

async function releaseExclusiveLock(lock: OwnedLock): Promise<void> {
  await lock.handle.close();
  const current = await readLockRecord(lock.lockPath);
  if (current?.instanceToken === lock.instanceToken) {
    await fs.rm(lock.lockPath, { force: true });
    await fs.rm(lock.ownerPath, { force: true });
    await syncDirectory(path.dirname(lock.lockPath));
  }
}

async function writeBufferDurably(filePath: string, contents: Uint8Array, observer: DurabilityObserver | undefined, role: DurabilityRole): Promise<void> {
  const handle = await fs.open(filePath, "w");
  let flushed = false;
  try {
    await handle.writeFile(contents);
    await handle.sync();
    flushed = true;
  } finally {
    await handle.close();
  }
  if (flushed) await observer?.onDurableWrite?.(filePath, role);
}

async function writeTextDurably(filePath: string, contents: string, observer: DurabilityObserver | undefined, role: DurabilityRole): Promise<void> {
  await writeBufferDurably(filePath, Buffer.from(contents, "utf8"), observer, role);
}

async function syncDirectory(directoryPath: string, observer?: DurabilityObserver): Promise<void> {
  try {
    const handle = await fs.open(directoryPath, "r");
    try {
      await handle.sync();
    } finally {
      await handle.close();
    }
    await observer?.onDirectorySync?.(directoryPath);
  } catch {
    // Some platforms do not permit directory fsync; file fsync remains mandatory.
  }
}

async function renameDurably(from: string, to: string, directoryPath: string, observer?: DurabilityObserver): Promise<void> {
  await fs.rename(from, to);
  await syncDirectory(directoryPath, observer);
}

function carryForwardRecoveryHistory(previous: PersistenceSnapshot, candidate: PersistenceSnapshot): PersistenceSnapshot {
  const common = Math.min(previous.history.length, candidate.history.length);
  let prefix = 0;
  while (prefix < common && previous.history[prefix].eventHash === candidate.history[prefix].eventHash) prefix += 1;
  const recoveryTail = previous.history.slice(prefix);
  if (recoveryTail.length === 0 || !recoveryTail.every((event) => event.type === "recovery.completed" || event.type === "recovery.opened")) return candidate;
  if (candidate.history.length < prefix) return candidate;
  const next = structuredClone(candidate);
  const merged = [...candidate.history.slice(0, prefix), ...recoveryTail];
  let previousHash = merged[merged.length - 1]?.eventHash ?? null;
  let sequence = merged.length + 1;
  for (const event of candidate.history.slice(prefix)) {
    const rebuilt = buildHistoryEvent(sequence, event.type, event.payload, previousHash);
    merged.push(rebuilt);
    previousHash = rebuilt.eventHash;
    sequence += 1;
  }
  next.history = merged;
  return next;
}

function journalFor(prepared: PersistenceSnapshot, transactionId: string): CommitJournal {
  return {
    schemaVersion: "0.1.0",
    transactionId,
    state: "STAGED",
    modelHash: prepared.model.canonicalState.integrity.modelHash,
    historyHash: prepared.model.canonicalState.integrity.historyHash,
    evidenceManifestHash: prepared.model.canonicalState.integrity.evidenceManifestHash,
    stagedFiles: ["model.json.stage", "history.jsonl.stage", "evidence-manifest.json.stage"],
  };
}

async function fileExists(filePath: string): Promise<boolean> {
  return fs.access(filePath).then(() => true).catch(() => false);
}

async function existingFiles(filePaths: string[]): Promise<string[]> {
  const existing: string[] = [];
  for (const filePath of filePaths) if (await fileExists(filePath)) existing.push(filePath);
  return existing;
}

async function allFilesExist(filePaths: string[]): Promise<boolean> {
  const values = await Promise.all(filePaths.map((filePath) => fileExists(filePath)));
  return values.every(Boolean);
}

async function anyFilesExist(filePaths: string[]): Promise<boolean> {
  const values = await Promise.all(filePaths.map((filePath) => fileExists(filePath)));
  return values.some(Boolean);
}

async function readSnapshotFromFiles(modelPath: string, historyPath: string, evidenceManifestPath: string): Promise<PersistenceSnapshot> {
  const model = JSON.parse(await fs.readFile(modelPath, "utf8")) as CanonicalModel;
  const historyText = await fs.readFile(historyPath, "utf8");
  const history = historyText.trim() ? historyText.trim().split("\n").map((line) => JSON.parse(line) as HistoryEvent) : [];
  const evidenceManifest = JSON.parse(await fs.readFile(evidenceManifestPath, "utf8")) as EvidenceManifest;
  return { model, history, evidenceManifest };
}

async function readOptionalSnapshot(paths: { model: string; history: string; evidenceManifest: string }): Promise<PersistenceSnapshot | undefined> {
  if (!await allFilesExist([paths.model, paths.history, paths.evidenceManifest])) return undefined;
  try {
    return await readSnapshotFromFiles(paths.model, paths.history, paths.evidenceManifest);
  } catch {
    return undefined;
  }
}

async function existingCommittedRevision(root: string, paths: PersistencePaths): Promise<PersistenceSnapshot | undefined> {
  const liveFiles = [paths.model, paths.history, paths.evidenceManifest];
  if (!await anyFilesExist(liveFiles)) return undefined;
  if (!await allFilesExist(liveFiles)) throw new Error("current canonical state is incomplete; recovery required");
  const current = await readSnapshotFromFiles(paths.model, paths.history, paths.evidenceManifest);
  const validation = validatePersistenceSnapshot(current, { projectRoot: root, verifyEvidenceBytes: true });
  if (!validation.valid) throw new Error(`current canonical state is divergent; recovery required: ${validation.divergence.join(", ")}`);
  return current;
}

async function assertNoPendingTransaction(paths: PersistencePaths): Promise<void> {
  const pendingFiles = [paths.journal, paths.stagedJournal, paths.stagedModel, paths.stagedHistory, paths.stagedEvidenceManifest];
  if (await anyFilesExist(pendingFiles)) throw new Error("recovery required: pending canonical transaction exists");
}

async function backupCurrentRevision(paths: PersistencePaths, previous: PersistenceSnapshot | undefined, observer?: DurabilityObserver): Promise<void> {
  if (!previous) return;
  const previousRoot = path.dirname(paths.previousModel);
  const modelBytes = await fs.readFile(paths.model);
  const historyBytes = await fs.readFile(paths.history);
  const evidenceBytes = await fs.readFile(paths.evidenceManifest);
  await fs.rm(previousRoot, { recursive: true, force: true });
  await fs.mkdir(previousRoot, { recursive: true });
  await writeBufferDurably(paths.previousModel, modelBytes, observer, "PREVIOUS_MODEL");
  await writeBufferDurably(paths.previousHistory, historyBytes, observer, "PREVIOUS_HISTORY");
  await writeBufferDurably(paths.previousEvidenceManifest, evidenceBytes, observer, "PREVIOUS_EVIDENCE_MANIFEST");
  await syncDirectory(previousRoot, observer);
}

async function restorePreviousRevision(paths: PersistencePaths, observer?: DurabilityObserver): Promise<void> {
  const modelBytes = await fs.readFile(paths.previousModel);
  const historyBytes = await fs.readFile(paths.previousHistory);
  const evidenceBytes = await fs.readFile(paths.previousEvidenceManifest);
  await writeBufferDurably(paths.model, modelBytes, observer, "RESTORED_MODEL");
  await writeBufferDurably(paths.history, historyBytes, observer, "RESTORED_HISTORY");
  await writeBufferDurably(paths.evidenceManifest, evidenceBytes, observer, "RESTORED_EVIDENCE_MANIFEST");
  await syncDirectory(paths.maatRoot, observer);
}

async function cleanupPreviousRevision(paths: PersistencePaths): Promise<void> {
  await fs.rm(path.dirname(paths.previousModel), { recursive: true, force: true });
}

export type CommitFailpoint = "AFTER_STAGED_JOURNAL" | "AFTER_JOURNAL" | "AFTER_MODEL_RENAME" | "AFTER_HISTORY_RENAME" | "AFTER_EVIDENCE_RENAME";

async function commitStagedRevision(paths: PersistencePaths, transactionId: string, failpoint?: CommitFailpoint, observer?: DurabilityObserver): Promise<void> {
  const journalText = await fs.readFile(paths.journal, "utf8");
  const journal = JSON.parse(journalText) as CommitJournal;
  if (journal.transactionId !== transactionId) throw new Error("canonical commit journal transaction mismatch");
  if (journal.state !== "STAGED") throw new Error("canonical commit journal state is invalid");
  if (failpoint === "AFTER_JOURNAL") throw new Error("injected interrupted transaction after journal commit");
  await renameDurably(paths.stagedModel, paths.model, paths.maatRoot, observer);
  if (failpoint === "AFTER_MODEL_RENAME") throw new Error("injected interrupted transaction after model rename");
  await renameDurably(paths.stagedHistory, paths.history, paths.maatRoot, observer);
  if (failpoint === "AFTER_HISTORY_RENAME") throw new Error("injected interrupted transaction after history rename");
  await renameDurably(paths.stagedEvidenceManifest, paths.evidenceManifest, paths.maatRoot, observer);
  if (failpoint === "AFTER_EVIDENCE_RENAME") throw new Error("injected interrupted transaction after evidence rename");
  await fs.rm(paths.stagedJournal, { force: true });
  await fs.rm(paths.journal, { force: true });
  await cleanupPreviousRevision(paths);
  await syncDirectory(paths.maatRoot, observer);
}

interface StageCanonicalRevisionOptions {
  failAfterStage?: boolean;
  failpoint?: CommitFailpoint;
  durabilityObserver?: DurabilityObserver;
  recoveryHistoryOnly?: boolean;
}

async function stageCanonicalRevisionLocked(root: string, paths: PersistencePaths, snapshot: PersistenceSnapshot, options: StageCanonicalRevisionOptions = {}): Promise<void> {
  await assertNoPendingTransaction(paths);
  const previous = await existingCommittedRevision(root, paths);
  const prepared = prepareCanonicalRevision(previous ? carryForwardRecoveryHistory(previous, snapshot) : snapshot);
  const validation = validatePersistenceSnapshot(prepared, { projectRoot: root, verifyEvidenceBytes: true });
  if (!validation.valid) throw new Error(`cannot stage divergent snapshot: ${validation.divergence.join(", ")}`);
  if (!previous && prepared.model.canonicalState.modelRevision !== 1) throw new Error("bootstrap canonical modelRevision must be 1");
  if (previous) {
    const transitionIssues = options.recoveryHistoryOnly ? validateRecoveryHistoryOnlyTransition(previous, prepared) : validateRevisionTransition(previous, prepared);
    if (transitionIssues.length > 0) throw new Error(`canonical revision transition rejected: ${transitionIssues.join(", ")}`);
  }
  await backupCurrentRevision(paths, previous, options.durabilityObserver);
  const transactionId = `txn-${prepared.model.canonicalState.modelRevision}-${prepared.model.canonicalState.integrity.modelHash.slice(0, 12)}`;
  const historyBytes = prepared.history.map((event) => canonicalize(event)).join("\n") + (prepared.history.length ? "\n" : "");
  await writeTextDurably(paths.stagedModel, `${JSON.stringify(prepared.model, null, 2)}\n`, options.durabilityObserver, "STAGED_MODEL");
  await writeTextDurably(paths.stagedHistory, historyBytes, options.durabilityObserver, "STAGED_HISTORY");
  await writeTextDurably(paths.stagedEvidenceManifest, `${JSON.stringify(prepared.evidenceManifest, null, 2)}\n`, options.durabilityObserver, "STAGED_EVIDENCE_MANIFEST");
  await writeTextDurably(paths.stagedJournal, `${JSON.stringify(journalFor(prepared, transactionId), null, 2)}\n`, options.durabilityObserver, "STAGED_JOURNAL");
  if (options.failpoint === "AFTER_STAGED_JOURNAL") throw new Error("injected interrupted transaction after staged journal write");
  await renameDurably(paths.stagedJournal, paths.journal, paths.maatRoot, options.durabilityObserver);
  if (options.failAfterStage) throw new Error("injected interrupted transaction after staging");
  await commitStagedRevision(paths, transactionId, options.failpoint, options.durabilityObserver);
}

export async function stageCanonicalRevision(root: string, snapshot: PersistenceSnapshot, options: StageCanonicalRevisionOptions = {}): Promise<PersistencePaths> {
  const paths = persistencePaths(root);
  await fs.mkdir(paths.maatRoot, { recursive: true });
  const lock = await acquireExclusiveLock(paths.lock);
  try {
    await stageCanonicalRevisionLocked(root, paths, snapshot, options);
  } finally {
    await releaseExclusiveLock(lock);
  }
  return paths;
}

export async function readCanonicalRevisionRaw(root: string): Promise<PersistenceSnapshot> {
  const paths = persistencePaths(root);
  return readSnapshotFromFiles(paths.model, paths.history, paths.evidenceManifest);
}

export async function readCanonicalRevisionValidated(root: string): Promise<PersistenceSnapshot> {
  const snapshot = await readCanonicalRevisionRaw(root);
  const validation = validatePersistenceSnapshot(snapshot, { projectRoot: root, verifyEvidenceBytes: true });
  if (!validation.valid) throw new Error(`canonical revision is divergent: ${validation.divergence.join(", ")}`);
  return snapshot;
}

/** Canonical/current reads are validated; use readCanonicalRevisionRaw only for diagnostics. */
export async function readCanonicalRevision(root: string): Promise<PersistenceSnapshot> {
  return readCanonicalRevisionValidated(root);
}

async function quarantineFiles(paths: PersistencePaths, files: string[], quarantineLabel: string, reason: string, state: TransactionState = "QUARANTINED_CANDIDATE"): Promise<RecoveryResult> {
  const quarantinePath = path.join(paths.maatRoot, "quarantine", quarantineLabel);
  await fs.mkdir(quarantinePath, { recursive: true });
  for (const filePath of [...new Set(files)]) {
    try {
      let target = path.join(quarantinePath, path.basename(filePath));
      if (await fileExists(target)) target = path.join(quarantinePath, `${path.basename(filePath)}.${randomBytes(4).toString("hex")}`);
      await fs.rename(filePath, target);
    } catch {
      // Preserve whatever remains when a source disappeared or cannot be moved.
    }
  }
  return { status: "QUARANTINED", state, quarantinePath, reason };
}

async function validSnapshotAt(paths: { model: string; history: string; evidenceManifest: string }, root: string): Promise<PersistenceSnapshot | undefined> {
  const snapshot = await readOptionalSnapshot(paths);
  if (!snapshot) return undefined;
  const validation = validatePersistenceSnapshot(snapshot, { projectRoot: root, verifyEvidenceBytes: true });
  return validation.valid ? snapshot : undefined;
}

async function hasDirectoryMaterial(directoryPath: string): Promise<boolean> {
  try {
    return (await fs.readdir(directoryPath)).length > 0;
  } catch {
    return false;
  }
}

function transactionPaths(paths: PersistencePaths): string[] {
  return [paths.journal, paths.stagedJournal, paths.stagedModel, paths.stagedHistory, paths.stagedEvidenceManifest];
}

function livePaths(paths: PersistencePaths): string[] {
  return [paths.model, paths.history, paths.evidenceManifest];
}

function previousPaths(paths: PersistencePaths): { model: string; history: string; evidenceManifest: string } {
  return { model: paths.previousModel, history: paths.previousHistory, evidenceManifest: paths.previousEvidenceManifest };
}

export async function classifyPersistenceState(root: string): Promise<TransactionStateClassification> {
  const paths = persistencePaths(root);
  const pendingFiles = await existingFiles(transactionPaths(paths));
  const liveFiles = await existingFiles(livePaths(paths));
  const previousFilePaths = await existingFiles([paths.previousModel, paths.previousHistory, paths.previousEvidenceManifest]);
  const currentValid = await validSnapshotAt({ model: paths.model, history: paths.history, evidenceManifest: paths.evidenceManifest }, root);
  const previousValid = await validSnapshotAt(previousPaths(paths), root);
  const quarantinePresent = await hasDirectoryMaterial(path.join(paths.maatRoot, "quarantine"));
  const liveComplete = liveFiles.length === 3;
  const liveAny = liveFiles.length > 0;
  const journalPresent = pendingFiles.includes(paths.journal);
  const stagedPresent = pendingFiles.some((filePath) => [paths.stagedJournal, paths.stagedModel, paths.stagedHistory, paths.stagedEvidenceManifest].includes(filePath));

  if (currentValid) {
    if (journalPresent) return { state: "PENDING_JOURNAL", reason: "a promoted commit journal remains while live canonical files are currently valid", pendingFiles, liveFiles, previousFiles: previousFilePaths };
    if (stagedPresent) return { state: "PENDING_STAGE", reason: "staged transaction material remains beside a valid live revision", pendingFiles, liveFiles, previousFiles: previousFilePaths };
    if (quarantinePresent) return { state: "QUARANTINED_CANDIDATE", reason: "a valid live revision remains after candidate material was quarantined", pendingFiles, liveFiles, previousFiles: previousFilePaths };
    return { state: "HEALTHY_CANONICAL_STATE", reason: "complete live canonical files validate as one coherent revision", pendingFiles, liveFiles, previousFiles: previousFilePaths };
  }

  if (journalPresent && liveAny) return { state: "PARTIAL_PROMOTION", reason: liveComplete ? "a commit journal exists alongside divergent live canonical files" : "a commit journal exists alongside an incomplete live canonical set", pendingFiles, liveFiles, previousFiles: previousFilePaths };
  if (journalPresent) return { state: "PENDING_JOURNAL", reason: "a promoted commit journal remains unresolved", pendingFiles, liveFiles, previousFiles: previousFilePaths };
  if (stagedPresent) return { state: "PENDING_STAGE", reason: "staged canonical transaction material remains without a promoted journal", pendingFiles, liveFiles, previousFiles: previousFilePaths };
  if (liveAny && !liveComplete) return { state: "PARTIAL_PROMOTION", reason: "live canonical files are incomplete without a journal", pendingFiles, liveFiles, previousFiles: previousFilePaths };
  if (liveAny) return { state: "DIVERGENT_LIVE_STATE", reason: "all live canonical files exist but fail integrity validation", pendingFiles, liveFiles, previousFiles: previousFilePaths };
  if (previousValid) return { state: "VALID_PREVIOUS_REVISION", reason: "no usable live revision exists but a complete previous revision is available", pendingFiles, liveFiles, previousFiles: previousFilePaths };
  if (previousFilePaths.length > 0) return { state: "UNRECOVERABLE_DIVERGENCE", reason: "neither live nor previous canonical material validates", pendingFiles, liveFiles, previousFiles: previousFilePaths };
  if (quarantinePresent) return { state: "QUARANTINED_CANDIDATE", reason: "transaction material exists only in quarantine and no canonical revision is live", pendingFiles, liveFiles, previousFiles: previousFilePaths };
  return { state: "NO_CANONICAL_STATE", reason: "no live, pending, or previous canonical material exists", pendingFiles, liveFiles, previousFiles: previousFilePaths };
}

function validateRecoveryHistoryOnlyTransition(previous: PersistenceSnapshot, next: PersistenceSnapshot): string[] {
  const issues: string[] = [];
  if (next.model.canonicalState.modelRevision !== previous.model.canonicalState.modelRevision) issues.push("recovery history-only commit cannot change modelRevision");
  if (next.history.length <= previous.history.length) issues.push("recovery history-only commit must append history");
  for (let index = 0; index < previous.history.length; index += 1) {
    if (previous.history[index].eventHash !== next.history[index]?.eventHash) {
      issues.push(`history prefix diverges at sequence ${index + 1}`);
      break;
    }
  }
  for (const event of next.history.slice(previous.history.length)) {
    if (!event.type.startsWith("recovery.")) issues.push(`recovery history-only commit may append only recovery events, received ${event.type}`);
    if (payloadRevision(event.payload) !== next.model.canonicalState.modelRevision) issues.push(`recovery event ${event.type} must bind to the current modelRevision`);
  }
  const previousModel = structuredClone(previous.model);
  const nextModel = structuredClone(next.model);
  delete (previousModel.canonicalState as Partial<typeof previousModel.canonicalState>).historyHead;
  delete (nextModel.canonicalState as Partial<typeof nextModel.canonicalState>).historyHead;
  delete (previousModel.canonicalState as Partial<typeof previousModel.canonicalState>).integrity;
  delete (nextModel.canonicalState as Partial<typeof nextModel.canonicalState>).integrity;
  if (canonicalize(previousModel) !== canonicalize(nextModel)) issues.push("recovery history-only commit changed canonical model meaning");
  if (canonicalize(previous.evidenceManifest) !== canonicalize(next.evidenceManifest)) issues.push("recovery history-only commit changed evidence manifest");
  return issues;
}

async function recordRecoveryHistoryLocked(root: string, paths: PersistencePaths, recoveryId: string, action: string, reason: string, result: string, candidateRevision: number | undefined, options: { durabilityObserver?: DurabilityObserver } = {}): Promise<void> {
  const current = await existingCommittedRevision(root, paths);
  if (!current) return;
  const next = structuredClone(current);
  const previousEvent = next.history[next.history.length - 1];
  const currentRevision = current.model.canonicalState.modelRevision;
  next.history.push(buildHistoryEvent(next.history.length + 1, "recovery.completed", {
    recoveryId,
    modelRevision: currentRevision,
    priorCanonicalRevision: currentRevision,
    candidateRevision,
    recoveryAction: action,
    reason,
    result,
    evidenceIds: [],
    timestamp: new Date().toISOString(),
  }, previousEvent?.eventHash ?? null));
  await stageCanonicalRevisionLocked(root, paths, next, { ...options, recoveryHistoryOnly: true });
}

export async function recoverStagedRevision(root: string, quarantineLabel = "recovery-0001", options: { durabilityObserver?: DurabilityObserver; allowMalformedLockRecovery?: boolean } = {}): Promise<RecoveryResult> {
  const paths = persistencePaths(root);
  await fs.mkdir(paths.maatRoot, { recursive: true });
  const lock = await acquireExclusiveLock(paths.lock, { allowMalformedRecovery: options.allowMalformedLockRecovery }).catch((error) => {
    throw error;
  });
  try {
    const pending = await existingFiles(transactionPaths(paths));
    const liveFilePaths = livePaths(paths);
    const liveFiles = await existingFiles(liveFilePaths);
    const previousFilePaths = await existingFiles([paths.previousModel, paths.previousHistory, paths.previousEvidenceManifest]);
    const journalPresent = await fileExists(paths.journal);
    const currentValid = await validSnapshotAt({ model: paths.model, history: paths.history, evidenceManifest: paths.evidenceManifest }, root);
    const previousValid = await validSnapshotAt(previousPaths(paths), root);

    if (pending.length === 0 && !currentValid && liveFiles.length === 0 && !previousValid && previousFilePaths.length === 0) {
      return { status: "NOTHING_TO_RECOVER", state: "NO_CANONICAL_STATE", reason: "no canonical transaction or revision material exists" };
    }

    if (!journalPresent) {
      if (currentValid) {
        if (pending.length === 0) return { status: "NOTHING_TO_RECOVER", state: "HEALTHY_CANONICAL_STATE", reason: "complete live canonical revision is healthy" };
        const result = await quarantineFiles(paths, pending, quarantineLabel, "staged transaction has no promoted commit journal", "QUARANTINED_CANDIDATE");
        await recordRecoveryHistoryLocked(root, paths, quarantineLabel, "QUARANTINE_PREJOURNAL_RESIDUE", result.reason ?? "staged transaction quarantined", "QUARANTINED", undefined, options);
        return result;
      }
      if (previousValid) {
        const result = await quarantineFiles(paths, [...pending, ...liveFiles], quarantineLabel, "incomplete or divergent live state restored from previous revision", "VALID_PREVIOUS_REVISION");
        await restorePreviousRevision(paths, options.durabilityObserver);
        await cleanupPreviousRevision(paths);
        await syncDirectory(paths.maatRoot, options.durabilityObserver);
        await recordRecoveryHistoryLocked(root, paths, quarantineLabel, "RESTORE_PREVIOUS_REVISION", result.reason ?? "previous revision restored", "COMPLETED", previousValid.model.canonicalState.modelRevision, options);
        return { status: "COMPLETED", state: "VALID_PREVIOUS_REVISION", quarantinePath: result.quarantinePath, reason: `${result.reason}; previous revision restored durably` };
      }
      if (pending.length === 0 && liveFiles.length === 0) {
        return { status: "NOTHING_TO_RECOVER", state: previousFilePaths.length > 0 ? "UNRECOVERABLE_DIVERGENCE" : "NO_CANONICAL_STATE", reason: "no usable canonical revision exists" };
      }
      return quarantineFiles(paths, [...pending, ...liveFiles], quarantineLabel, "unrecoverable divergent canonical state without a valid previous revision", "UNRECOVERABLE_DIVERGENCE");
    }

    try {
      const journal = JSON.parse(await fs.readFile(paths.journal, "utf8")) as CommitJournal;
      if (journal.schemaVersion !== "0.1.0" || journal.state !== "STAGED" || typeof journal.transactionId !== "string") throw new Error("invalid commit journal");
      const sourcePath = async (stagedPath: string, livePath: string): Promise<string> => {
        if (await fileExists(stagedPath)) return stagedPath;
        if (await fileExists(livePath)) return livePath;
        throw new Error(`missing staged or live persistence file: ${path.basename(livePath)}`);
      };
      const modelSource = await sourcePath(paths.stagedModel, paths.model);
      const historySource = await sourcePath(paths.stagedHistory, paths.history);
      const evidenceSource = await sourcePath(paths.stagedEvidenceManifest, paths.evidenceManifest);
      const recoveredSnapshot = await readSnapshotFromFiles(modelSource, historySource, evidenceSource);
      const validation = validatePersistenceSnapshot(recoveredSnapshot, { projectRoot: root, verifyEvidenceBytes: true });
      if (!validation.valid) throw new Error(validation.divergence.join(", "));
      if (recoveredSnapshot.model.canonicalState.integrity.modelHash !== journal.modelHash) throw new Error("journal model hash mismatch");
      if (recoveredSnapshot.model.canonicalState.integrity.historyHash !== journal.historyHash) throw new Error("journal history hash mismatch");
      if (recoveredSnapshot.model.canonicalState.integrity.evidenceManifestHash !== journal.evidenceManifestHash) throw new Error("journal evidence hash mismatch");
      for (const [stagedPath, livePath] of [[paths.stagedModel, paths.model], [paths.stagedHistory, paths.history], [paths.stagedEvidenceManifest, paths.evidenceManifest]] as const) {
        if (await fileExists(stagedPath)) await renameDurably(stagedPath, livePath, paths.maatRoot, options.durabilityObserver);
      }
      await fs.rm(paths.journal, { force: true });
      await fs.rm(paths.stagedJournal, { force: true });
      await cleanupPreviousRevision(paths);
      await syncDirectory(paths.maatRoot, options.durabilityObserver);
      await recordRecoveryHistoryLocked(root, paths, journal.transactionId, "COMPLETE_PROMOTED_JOURNAL", "validated journal and canonical files were completed", "COMPLETED", recoveredSnapshot.model.canonicalState.modelRevision, options);
      return { status: "COMPLETED", state: "HEALTHY_CANONICAL_STATE", reason: "validated journal and canonical files were completed" };
    } catch (error) {
      const currentAfterFailure = await validSnapshotAt({ model: paths.model, history: paths.history, evidenceManifest: paths.evidenceManifest }, root);
      const previousAfterFailure = await validSnapshotAt(previousPaths(paths), root);
      const existingLiveFiles = await existingFiles(liveFilePaths);
      let liveMatchesFailedJournal = false;
      if (currentAfterFailure) {
        try {
          const failedJournal = JSON.parse(await fs.readFile(paths.journal, "utf8")) as CommitJournal;
          liveMatchesFailedJournal = currentAfterFailure.model.canonicalState.integrity.modelHash === failedJournal.modelHash
            || currentAfterFailure.model.canonicalState.integrity.historyHash === failedJournal.historyHash;
        } catch {
          liveMatchesFailedJournal = false;
        }
      }
      if (currentAfterFailure && !liveMatchesFailedJournal) {
        const result = await quarantineFiles(paths, pending, quarantineLabel, error instanceof Error ? error.message : String(error), "QUARANTINED_CANDIDATE");
        await recordRecoveryHistoryLocked(root, paths, quarantineLabel, "QUARANTINE_CORRUPT_CANDIDATE", result.reason ?? "corrupt candidate quarantined", "QUARANTINED", undefined, options);
        return { ...result, reason: `${result.reason ?? "recovery failed"}; preserved complete live revision in canonical paths` };
      }
      if (previousAfterFailure) {
        const result = await quarantineFiles(paths, [...pending, ...existingLiveFiles], quarantineLabel, error instanceof Error ? error.message : String(error), "VALID_PREVIOUS_REVISION");
        await restorePreviousRevision(paths, options.durabilityObserver);
        await cleanupPreviousRevision(paths);
        await syncDirectory(paths.maatRoot, options.durabilityObserver);
        await recordRecoveryHistoryLocked(root, paths, quarantineLabel, "RESTORE_PREVIOUS_REVISION_AFTER_FAILURE", result.reason ?? "previous revision restored after recovery failure", "COMPLETED", previousAfterFailure.model.canonicalState.modelRevision, options);
        return { ...result, state: "VALID_PREVIOUS_REVISION", reason: `${result.reason ?? "recovery failed"}; restored previous complete revision durably` };
      }
      return quarantineFiles(paths, [...pending, ...existingLiveFiles], quarantineLabel, error instanceof Error ? error.message : String(error), "UNRECOVERABLE_DIVERGENCE");
    }
  } finally {
    await releaseExclusiveLock(lock);
  }
}
