import { sha256Text } from "./utils";
import type {
  Capability,
  CapabilityLineageEvent,
  CanonicalModel,
  EntityProvenance,
  RuntimeHome,
} from "./model";

export interface IdentityCandidate {
  capabilityId: string;
  immutableAnchor: string;
  kind: string;
  semanticContractAnchor: string;
  evidenceAgreement: boolean;
  lifecycleStatus?: "ACTIVE" | "RETIRED" | "SUPERSEDED";
}

export interface IdentityObservation {
  immutableAnchor?: string;
  kind: string;
  semanticContractAnchor: string;
}

export type IdentityMatch =
  | { kind: "MATCHED"; capabilityId: string }
  | { kind: "NEW_CANDIDATE"; capabilityId: string }
  | { kind: "UNRESOLVED"; candidateIds: string[]; reason: string };

export function deterministicCapabilityId(projectId: string, immutableAnchor: string): string {
  return `cap_${sha256Text(`${projectId}:capability:${immutableAnchor}`).slice(0, 24)}`;
}

export function conservativeIdentityMatch(projectId: string, observation: IdentityObservation, candidates: IdentityCandidate[]): IdentityMatch {
  const matches = candidates.filter((candidate) =>
    observation.immutableAnchor !== undefined &&
    candidate.immutableAnchor === observation.immutableAnchor &&
    candidate.kind === observation.kind &&
    candidate.semanticContractAnchor === observation.semanticContractAnchor &&
    candidate.evidenceAgreement &&
    candidate.lifecycleStatus !== "RETIRED" &&
    candidate.lifecycleStatus !== "SUPERSEDED",
  );
  if (matches.length === 1) return { kind: "MATCHED", capabilityId: matches[0].capabilityId };
  if (matches.length > 1) return { kind: "UNRESOLVED", candidateIds: matches.map((candidate) => candidate.capabilityId).sort(), reason: "ambiguous immutable-anchor match" };
  return { kind: "NEW_CANDIDATE", capabilityId: deterministicCapabilityId(projectId, observation.immutableAnchor ?? `${observation.kind}:${observation.semanticContractAnchor}`) };
}

function provenance(model: CanonicalModel, source: string, observationClass: EntityProvenance["observationClass"] = "RECONCILED"): EntityProvenance {
  return {
    observationClass,
    source,
    confidence: 1,
    observedAt: new Date(0).toISOString(),
    modelRevision: model.canonicalState.modelRevision,
  };
}

function addLineageEvent(model: CanonicalModel, event: CapabilityLineageEvent): void {
  model.capabilityLineage.push(event);
}

function releaseCurrentRuntimeHome(model: CanonicalModel, capability: Capability): string | undefined {
  const previous = capability.runtimeHomeId ?? undefined;
  if (!previous) {
    capability.runtimeGap = true;
    capability.runtimeHomeId = null;
    return undefined;
  }
  const oldHome = model.runtimeHomes.find((home) => home.runtimeHomeId === previous);
  if (oldHome) oldHome.effectiveToRevision = model.canonicalState.modelRevision;
  capability.historicalRuntimeHomeIds = [...new Set([...capability.historicalRuntimeHomeIds, previous])];
  capability.runtimeHomeId = null;
  capability.runtimeGap = true;
  return previous;
}

function eventId(capabilityId: string, type: string, revision: number, ordinal: number): string {
  return `lineage_${sha256Text(`${capabilityId}:${type}:${revision}:${ordinal}`).slice(0, 24)}`;
}

function updateHomeForMove(model: CanonicalModel, capability: Capability, nextRuntimeHomeId: string): void {
  const nextHome = model.runtimeHomes.find((home) => home.runtimeHomeId === nextRuntimeHomeId);
  if (nextHome && nextHome.capabilityId !== capability.capabilityId) throw new Error("runtime home cannot be assigned to another capability");
  const previous = capability.runtimeHomeId;
  if (previous === nextRuntimeHomeId) return;
  if (previous) {
    const oldHome = model.runtimeHomes.find((home) => home.runtimeHomeId === previous);
    if (oldHome) {
      oldHome.effectiveToRevision = model.canonicalState.modelRevision;
      capability.historicalRuntimeHomeIds = [...new Set([...capability.historicalRuntimeHomeIds, previous])];
    }
  }
  capability.runtimeHomeId = nextRuntimeHomeId;
  capability.runtimeGap = false;
}

export function renameCapability(model: CanonicalModel, capabilityId: string, nextName: string, reason: string): CanonicalModel {
  const clone = structuredClone(model);
  const capability = requireCapability(clone, capabilityId);
  const previousName = capability.name;
  capability.name = nextName;
  capability.aliases = [...new Set([...capability.aliases, previousName])].sort();
  const event = createEvent(clone, capabilityId, "RENAME", [capabilityId], [capabilityId], reason, [], undefined, undefined);
  addLineageEvent(clone, event);
  capability.lineageEventIds.push(event.eventId);
  return clone;
}

export function moveCapability(model: CanonicalModel, capabilityId: string, nextRuntimeHome: RuntimeHome, reason: string): CanonicalModel {
  const clone = structuredClone(model);
  const capability = requireCapability(clone, capabilityId);
  const existingHome = clone.runtimeHomes.find((home) => home.runtimeHomeId === nextRuntimeHome.runtimeHomeId);
  if (!existingHome) clone.runtimeHomes.push(nextRuntimeHome);
  const previousHome = capability.runtimeHomeId ?? undefined;
  updateHomeForMove(clone, capability, nextRuntimeHome.runtimeHomeId);
  const event = createEvent(clone, capabilityId, "MOVE", [capabilityId], [capabilityId], reason, [], previousHome, nextRuntimeHome.runtimeHomeId);
  addLineageEvent(clone, event);
  capability.lineageEventIds.push(event.eventId);
  return clone;
}

export function mergeCapabilities(model: CanonicalModel, survivingId: string, absorbedIds: string[], reason: string): CanonicalModel {
  const clone = structuredClone(model);
  const survivor = requireCapability(clone, survivingId);
  for (const absorbedId of absorbedIds) {
    const absorbed = requireCapability(clone, absorbedId);
    if (absorbedId === survivingId) throw new Error("a capability cannot be merged into itself");
    const previousRuntimeHomeId = releaseCurrentRuntimeHome(clone, absorbed);
    absorbed.lifecycleStatus = "SUPERSEDED";
    absorbed.aliases = [...new Set([...absorbed.aliases, absorbed.name])];
    const event = createEvent(clone, absorbedId, "MERGED_INTO", [absorbedId], [survivingId], reason, absorbed.evidenceIds, previousRuntimeHomeId, survivor.runtimeHomeId ?? undefined);
    addLineageEvent(clone, event);
    absorbed.lineageEventIds.push(event.eventId);
    survivor.dependencies = [...new Set([...survivor.dependencies, ...absorbed.dependencies])].sort();
    survivor.evidenceIds = [...new Set([...survivor.evidenceIds, ...absorbed.evidenceIds])].sort();
  }
  return clone;
}

export function splitCapability(model: CanonicalModel, parentId: string, children: Capability[], reason: string): CanonicalModel {
  const clone = structuredClone(model);
  const parent = requireCapability(clone, parentId);
  const childIds = children.map((child) => child.capabilityId);
  if (childIds.length === 0 || new Set(childIds).size !== childIds.length || childIds.includes(parentId)) throw new Error("split children must be distinct new identities");
  if (childIds.some((childId) => clone.capabilities.some((capability) => capability.capabilityId === childId))) throw new Error("split child identity already exists");
  const previousRuntimeHomeId = releaseCurrentRuntimeHome(clone, parent);
  parent.lifecycleStatus = "SUPERSEDED";
  clone.capabilities.push(...children);
  const event = createEvent(clone, parentId, "SPLIT_INTO", [parentId], childIds, reason, parent.evidenceIds, previousRuntimeHomeId, undefined);
  addLineageEvent(clone, event);
  parent.lineageEventIds.push(event.eventId);
  return clone;
}

export function supersedeCapability(model: CanonicalModel, previousId: string, replacementId: string, reason: string): CanonicalModel {
  const clone = structuredClone(model);
  if (previousId === replacementId) throw new Error("a capability cannot supersede itself");
  const previous = requireCapability(clone, previousId);
  const replacement = requireCapability(clone, replacementId);
  const previousRuntimeHomeId = releaseCurrentRuntimeHome(clone, previous);
  previous.lifecycleStatus = "SUPERSEDED";
  const event = createEvent(clone, previousId, "SUPERSEDES", [previousId], [replacementId], reason, previous.evidenceIds, previousRuntimeHomeId, replacement.runtimeHomeId ?? undefined);
  addLineageEvent(clone, event);
  previous.lineageEventIds.push(event.eventId);
  return clone;
}

export function retireCapability(model: CanonicalModel, capabilityId: string, reason: string): CanonicalModel {
  const clone = structuredClone(model);
  const capability = requireCapability(clone, capabilityId);
  const previousRuntimeHomeId = releaseCurrentRuntimeHome(clone, capability);
  capability.lifecycleStatus = "RETIRED";
  const event = createEvent(clone, capabilityId, "RETIRED", [capabilityId], [], reason, capability.evidenceIds, previousRuntimeHomeId, undefined);
  addLineageEvent(clone, event);
  capability.lineageEventIds.push(event.eventId);
  return clone;
}

export function restoreCapability(model: CanonicalModel, capabilityId: string, reason: string, evidenceIds: string[]): CanonicalModel {
  const clone = structuredClone(model);
  const capability = requireCapability(clone, capabilityId);
  if (evidenceIds.length === 0) throw new Error("restoration requires explicit evidence IDs");
  assertEvidenceIdsExist(clone, evidenceIds);
  if (capability.lifecycleStatus !== "RETIRED" && capability.lifecycleStatus !== "SUPERSEDED") {
    throw new Error("only retired or superseded capabilities can be restored");
  }
  capability.lifecycleStatus = "LIVE";
  capability.health = "HEALTHY_WITH_OBSERVATIONS";
  capability.evidenceIds = [...new Set([...capability.evidenceIds, ...evidenceIds])].sort();
  const event = createEvent(clone, capabilityId, "RESTORED", [capabilityId], [capabilityId], reason, evidenceIds, capability.runtimeHomeId ?? undefined, capability.runtimeHomeId ?? undefined);
  addLineageEvent(clone, event);
  capability.lineageEventIds.push(event.eventId);
  return clone;
}

function assertEvidenceIdsExist(model: CanonicalModel, evidenceIds: string[]): void {
  const knownEvidenceIds = new Set(model.evidenceRefs.map((evidence) => evidence.evidenceId));
  const unknown = evidenceIds.filter((evidenceId) => !knownEvidenceIds.has(evidenceId));
  if (unknown.length > 0) throw new Error(`lineage event references unknown evidence IDs: ${unknown.join(", ")}`);
}

function requireCapability(model: CanonicalModel, capabilityId: string): Capability {
  const capability = model.capabilities.find((item) => item.capabilityId === capabilityId);
  if (!capability) throw new Error(`unknown capability ${capabilityId}`);
  return capability;
}

function createEvent(
  model: CanonicalModel,
  capabilityId: string,
  type: CapabilityLineageEvent["type"],
  fromCapabilityIds: string[],
  toCapabilityIds: string[],
  reason: string,
  evidenceIds: string[],
  previousRuntimeHomeId?: string,
  nextRuntimeHomeId?: string,
): CapabilityLineageEvent {
  assertEvidenceIdsExist(model, evidenceIds);
  const eventIdentifier = eventId(capabilityId, type, model.canonicalState.modelRevision, model.capabilityLineage.length);
  return {
    eventId: eventIdentifier,
    capabilityId,
    type,
    fromCapabilityIds,
    toCapabilityIds,
    previousRuntimeHomeId,
    nextRuntimeHomeId,
    reason,
    authority: "EXPLICIT",
    effectiveRevision: model.canonicalState.modelRevision,
    evidenceIds,
    provenance: provenance(model, `phase0:lineage:${type}`, "EXPLICIT"),
  };
}
