import { promises as fs } from "node:fs";
import path from "node:path";
import type {
  Capability,
  CanonicalModel,
  EntityProvenance,
  HistoryEvent,
  RuntimeHome,
  Subsystem,
  ReconciliationAmbiguity,
  ReconciliationCandidate,
  ReconciliationConflict,
} from "../contracts/model";
import {
  buildHistoryEvent,
  persistencePaths,
  prepareCanonicalRevision,
  readCanonicalRevisionValidated,
  stageCanonicalRevision,
  type PersistencePaths,
  type PersistenceSnapshot,
} from "../contracts/persistence";
import { validatePersistenceSnapshot } from "../contracts/persistence";
import { canonicalize, sha256Text } from "../contracts/utils";
import type {
  Phase1InventoryEntry,
  Phase1ManifestObservation,
  Phase1ScanResult,
} from "../phase1/scanner";

const PHASE_2_SCHEMA_VERSION = "0.1.0";
const PHASE_2_OBSERVATION_SOURCE = "phase2:deterministic-reconciliation";
const PHASE_2_RELEASE_CONTRACT = "Observed repository model only; no semantic inference, UI, provider call, or project mutation is claimed.";
const PHASE_2_PHASE_ID = "phase_2_deterministic_reconciliation";
const ENTRYPOINT_NAMES = new Set(["index.ts", "index.tsx", "main.ts", "main.tsx", "server.ts", "server.tsx", "app.ts", "app.tsx", "worker.ts", "worker.tsx"]);

type CandidateKind = ReconciliationCandidate["kind"];
type CandidateStatus = ReconciliationCandidate["status"];

export type Phase2Ambiguity = ReconciliationAmbiguity;
export type Phase2Conflict = ReconciliationConflict;
export type Phase2Candidate = ReconciliationCandidate;

export interface Phase2ReconciliationOptions {
  root: string;
  persist?: boolean;
  initializeMaat?: boolean;
  allowExistingMaatRead?: boolean;
}

export interface Phase2ReconciliationResult {
  scanFingerprint: string;
  model: CanonicalModel;
  snapshot: PersistenceSnapshot;
  candidates: Phase2Candidate[];
  ambiguities: Phase2Ambiguity[];
  conflicts: Phase2Conflict[];
  identityStability: {
    projectId: string;
    subsystemIds: string[];
    capabilityIds: string[];
    runtimeHomeIds: string[];
    matchedPriorIds: string[];
    introducedIds: string[];
    historicalIds: string[];
  };
  moveContinuity: Array<{ previousId: string; currentId: string; sourcePath: string; matchedBy: "CONTENT_HASH" }>;
  persistence: {
    written: boolean;
    paths?: PersistencePaths;
    maatRoot: string;
  };
  validation: { valid: boolean; issues: string[] };
}

interface CandidateData {
  kind: Exclude<CandidateKind, "PROJECT" | "RUNTIME_HOME">;
  anchor: string;
  label: string;
  group: string;
  sourcePaths: string[];
  contentHashes: string[];
  runtimeLocators: string[];
  provenanceClass: EntityProvenance["observationClass"];
}

interface RuntimeCandidateData {
  anchor: string;
  locator: string;
  entryPoints: string[];
  contentHashes: string[];
}

function stableId(prefix: string, anchor: string): string {
  return `${prefix}_${sha256Text(anchor).slice(0, 32)}`;
}

function normalizeRelativePath(value: string): string {
  return value.replaceAll("\\", "/").replace(/^\.\//, "");
}

function sortedUnique(values: readonly string[]): string[] {
  return [...new Set(values)].sort((left, right) => left < right ? -1 : left > right ? 1 : 0);
}

function observationClassFor(scan: Phase1ScanResult): EntityProvenance["observationClass"] {
  if (scan.failures.length > 0 || scan.unknowns.length > 0) return "UNKNOWN";
  return "OBSERVED";
}

function provenance(scan: Phase1ScanResult, sourceRef: string, observationClass = observationClassFor(scan)): EntityProvenance {
  return {
    observationClass,
    source: PHASE_2_OBSERVATION_SOURCE,
    sourceRef,
    confidence: observationClass === "UNKNOWN" ? 0 : 1,
    observedAt: scan.startedAt,
    modelRevision: 1,
  };
}

function stableScanInput(scan: Phase1ScanResult): unknown {
  const normalizedFailures = scan.failures
    .map((item) => ({ ...item, relativePath: item.relativePath ? normalizeRelativePath(item.relativePath) : undefined }))
    .sort((left, right) => canonicalize(left).localeCompare(canonicalize(right)));
  const normalizedUnknowns = scan.unknowns
    .map((item) => ({ ...item, relativePath: item.relativePath ? normalizeRelativePath(item.relativePath) : undefined }))
    .sort((left, right) => canonicalize(left).localeCompare(canonicalize(right)));
  return {
    repositoryType: scan.repositoryType,
    scope: {
      include: sortedUnique(scan.scope.include.map(normalizeRelativePath)),
      exclude: sortedUnique(scan.scope.exclude.map(normalizeRelativePath)),
      followSymlinks: scan.scope.followSymlinks,
      executeCommands: scan.scope.executeCommands,
      networkAccess: scan.scope.networkAccess,
      phase: scan.scope.phase,
      contentHashing: scan.scope.contentHashing,
      ignoreRules: sortedUnique(scan.scope.ignoreRules.map(normalizeRelativePath)),
      exclusionPolicyVersion: scan.scope.exclusionPolicyVersion,
    },
    git: {
      available: scan.git.available,
      repositoryType: scan.git.repositoryType,
      branch: scan.git.branch,
      head: scan.git.head,
      trackedFiles: sortedUnique(scan.git.trackedFiles.map(normalizeRelativePath)),
      recentCommits: scan.git.recentCommits,
    },
    manifests: [...scan.manifests]
      .map((item) => ({
        ...item,
        relativePath: normalizeRelativePath(item.relativePath),
        scriptNames: sortedUnique(item.scriptNames ?? []),
        signals: sortedUnique(item.signals ?? []),
      }))
      .sort((left, right) => left.relativePath < right.relativePath ? -1 : left.relativePath > right.relativePath ? 1 : 0),
    inventory: [...scan.inventory]
      .map((item) => ({ ...item, relativePath: normalizeRelativePath(item.relativePath) }))
      .sort((left, right) => left.relativePath < right.relativePath ? -1 : left.relativePath > right.relativePath ? 1 : 0),
    exclusions: [...scan.exclusions]
      .map((item) => ({ ...item, relativePath: normalizeRelativePath(item.relativePath) }))
      .sort((left, right) => left.relativePath < right.relativePath ? -1 : left.relativePath > right.relativePath ? 1 : 0),
    failures: normalizedFailures,
    unknowns: normalizedUnknowns,
  };
}

export function phase2ObservationFingerprint(scan: Phase1ScanResult): string {
  return sha256Text(canonicalize(stableScanInput(scan)));
}

function projectManifest(scan: Phase1ScanResult): Phase1ManifestObservation | undefined {
  return [...scan.manifests]
    .filter((item) => item.manifestKind === "NODE_PACKAGE_JSON")
    .sort((left, right) => normalizeRelativePath(left.relativePath).localeCompare(normalizeRelativePath(right.relativePath)))[0];
}

function projectTypeFor(scan: Phase1ScanResult): string {
  if (scan.manifests.some((item) => item.manifestKind === "NODE_PACKAGE_JSON")) return "javascript-typescript-node";
  return "repository-observation";
}

function projectIdentityAnchor(scan: Phase1ScanResult): string {
  const manifest = projectManifest(scan);
  return canonicalize({
    repositoryType: scan.repositoryType,
    projectType: projectTypeFor(scan),
    packageName: manifest?.name ?? "",
  });
}

function groupFor(relativePath: string): string {
  const normalized = normalizeRelativePath(relativePath);
  const first = normalized.split("/")[0];
  if (!first || first === normalized) return "repository-core";
  if (first === "src" || first === "app" || first === "lib" || first === "server" || first === "client" || first === "packages") return first;
  return first;
}

function inventoryForGroup(scan: Phase1ScanResult, group: string): Phase1InventoryEntry[] {
  return scan.inventory.filter((item) => item.included && groupFor(item.relativePath) === group);
}

function manifestsForGroup(scan: Phase1ScanResult, group: string): Phase1ManifestObservation[] {
  return scan.manifests.filter((item) => groupFor(item.relativePath) === group);
}

function contentHashesFor(entries: Phase1InventoryEntry[]): string[] {
  return sortedUnique(entries.map((entry) => entry.contentHash).filter((value): value is string => Boolean(value)));
}

function runtimeCandidatesFor(entries: Phase1InventoryEntry[]): RuntimeCandidateData[] {
  const entrypoints = entries
    .filter((entry) => ENTRYPOINT_NAMES.has(path.posix.basename(normalizeRelativePath(entry.relativePath))))
    .map((entry) => ({
      locator: normalizeRelativePath(entry.relativePath),
      entryPoints: [path.posix.basename(normalizeRelativePath(entry.relativePath))],
      contentHashes: entry.contentHash ? [entry.contentHash] : [],
    }))
    .sort((left, right) => left.locator < right.locator ? -1 : left.locator > right.locator ? 1 : 0);
  return entrypoints.map((entry) => ({
    anchor: canonicalize({ locator: entry.locator, entryPoints: entry.entryPoints }),
    locator: entry.locator,
    entryPoints: entry.entryPoints,
    contentHashes: entry.contentHashes,
  }));
}

function candidateDataFor(scan: Phase1ScanResult): CandidateData[] {
  const groups = sortedUnique(scan.inventory.filter((item) => item.included).map((item) => groupFor(item.relativePath)));
  const result: CandidateData[] = [];
  for (const group of groups) {
    const entries = inventoryForGroup(scan, group);
    const manifests = manifestsForGroup(scan, group);
    const sourceEntries = entries.filter((entry) => entry.classification === "SOURCE");
    const manifestEntries = entries.filter((entry) => entry.classification === "MANIFEST");
    if (sourceEntries.length > 0) {
      result.push({
        kind: "CAPABILITY",
        anchor: canonicalize({ group, role: "source" }),
        label: `${group} source implementation`,
        group,
        sourcePaths: sortedUnique(sourceEntries.map((entry) => normalizeRelativePath(entry.relativePath))),
        contentHashes: contentHashesFor(sourceEntries),
        runtimeLocators: runtimeCandidatesFor(sourceEntries).map((candidate) => candidate.locator),
        provenanceClass: observationClassFor(scan),
      });
    }
    if (manifestEntries.length > 0 || manifests.length > 0) {
      const manifestPaths = sortedUnique(manifestEntries.map((entry) => normalizeRelativePath(entry.relativePath)));
      result.push({
        kind: "CAPABILITY",
        anchor: canonicalize({ group, role: "manifest", paths: manifestPaths }),
        label: `${group} package manifest`,
        group,
        sourcePaths: manifestPaths,
        contentHashes: contentHashesFor(manifestEntries),
        runtimeLocators: sortedUnique(manifestEntries.map((entry) => normalizeRelativePath(entry.relativePath))),
        provenanceClass: observationClassFor(scan),
      });
    }
  }
  for (const entry of scan.inventory.filter(item => item.included && !['SOURCE','MANIFEST'].includes(item.classification) && /(?:tsconfig\.json|\.ya?ml)$/.test(item.relativePath))) {
      const relative = normalizeRelativePath(entry.relativePath);
      result.push({kind:'CAPABILITY', anchor:canonicalize({role:'structural-definition',path:relative}), label:`${relative} structural definition`, group:groupFor(relative), sourcePaths:[relative], contentHashes:entry.contentHash?[entry.contentHash]:[], runtimeLocators:[], provenanceClass:observationClassFor(scan)});
    }
    if (result.length === 0 && scan.inventory.some((item) => item.included)) {
    const entries = scan.inventory.filter((item) => item.included);
    result.push({
      kind: "CAPABILITY",
      anchor: canonicalize({ group: "repository-core", role: "observed-files" }),
      label: "repository observed files",
      group: "repository-core",
      sourcePaths: sortedUnique(entries.map((entry) => normalizeRelativePath(entry.relativePath))),
      contentHashes: contentHashesFor(entries),
      runtimeLocators: [],
      provenanceClass: observationClassFor(scan),
    });
  }
  return result.sort((left, right) => left.anchor < right.anchor ? -1 : left.anchor > right.anchor ? 1 : 0);
}

function priorAnchorFromImplementationRefs(capability: Capability): string | undefined {
  return capability.implementationRefs.find((value) => value.startsWith("phase2-anchor:"))?.slice("phase2-anchor:".length);
}

function priorContentHashes(capability: Capability): Set<string> {
  return new Set(capability.implementationRefs.filter((value) => value.startsWith("phase2-content:")).map((value) => value.slice("phase2-content:".length)));
}

function priorObservedPaths(capability: Capability): Set<string> {
  return new Set(capability.implementationRefs.filter((value) => !value.startsWith("phase2-") && value.length > 0).map(normalizeRelativePath));
}

function priorSubsystemAnchor(subsystem: Subsystem): string | undefined {
  return subsystem.responsibility.match(/phase2-anchor:([^\]]+)/)?.[1];
}

function candidateProvenance(scan: Phase1ScanResult, sourceRef: string, modelRevision: number, observationClass: EntityProvenance["observationClass"]): EntityProvenance {
  return { ...provenance(scan, sourceRef, observationClass), modelRevision };
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function baseModel(scan: Phase1ScanResult, projectId: string, projectName: string, modelRevision: number): CanonicalModel {
  const modelProvenance = candidateProvenance(scan, "phase2:model", modelRevision, observationClassFor(scan));
  return {
    schemaVersion: PHASE_2_SCHEMA_VERSION,
    project: {
      projectId,
      name: projectName,
      root: ".",
      repository: scan.repositoryType === "GIT" ? "GIT_READ_ONLY" : undefined,
      projectType: projectTypeFor(scan),
      health: scan.failures.length > 0 || scan.unknowns.length > 0 ? "INDETERMINATE" : "HEALTHY_WITH_OBSERVATIONS",
      provenance: modelProvenance,
    },
    intent: [],
    releaseContract: PHASE_2_RELEASE_CONTRACT,
    requirements: [],
    phases: [],
    subsystems: [],
    capabilities: [],
    runtimeHomes: [],
    interfaces: [],
    edges: [],
    configurationItems: sortedUnique(scan.inventory.filter((item) => item.included).map((item) => normalizeRelativePath(item.relativePath))),
    claims: [],
    evidenceRefs: [],
    releaseGates: [],
    derivedOutputRefs: [],
    findingRefs: [],
    findingGovernance: [],
    scans: [],
    decisions: [],
    mutations: [],
    capabilityLineage: [],
    canonicalState: {
      modelRevision,
      historyHead: { sequence: 0, eventHash: "GENESIS" },
      evidenceHead: { sequence: 0, manifestHash: "" },
      integrity: { modelHash: "", historyHash: "", evidenceManifestHash: "" },
    },
    provenance: modelProvenance,
  };
}

function currentSubsystems(scan: Phase1ScanResult, projectId: string, revision: number): Subsystem[] {
  const groups = sortedUnique(scan.inventory.filter((item) => item.included).map((item) => groupFor(item.relativePath)));
  return groups.map((group) => ({
    subsystemId: stableId("subsystem", canonicalize({ group })),
    projectId,
    name: group === "repository-core" ? "Repository Core" : group,
    responsibility: `Observed structural responsibility for ${group} [phase2-anchor:${canonicalize({ group })}]`,
    capabilityIds: [],
    provenance: candidateProvenance(scan, `phase2:subsystem:${group}`, revision, observationClassFor(scan)),
  }));
}

function setRuntimeHomeHistory(capability: Capability, previousHomeId: string | null, currentHomeId: string | null = capability.runtimeHomeId): string[] {
  return sortedUnique([
    ...capability.historicalRuntimeHomeIds,
    ...(previousHomeId ? [previousHomeId] : []),
  ]).filter((id) => id !== currentHomeId);
}

function createCapability(
  scan: Phase1ScanResult,
  data: CandidateData,
  capabilityId: string,
  subsystemId: string,
  revision: number,
  prior: Capability | undefined,
  runtimeHomeId: string | null,
  runtimeGap: boolean,
  runtimeHomeHistory: string[],
): Capability {
  const implementationRefs = sortedUnique([
    ...data.sourcePaths,
        ...scan.inventory.filter(entry => entry.included && data.sourcePaths.includes(normalizeRelativePath(entry.relativePath)) && entry.contentHash).map(entry => `phase2-source:${JSON.stringify({path: normalizeRelativePath(entry.relativePath), sha256: entry.contentHash})}`),
    `phase2-anchor:${data.anchor}`,
    ...data.contentHashes.map((hash) => `phase2-content:${hash}`),
    "phase2-provenance:OBSERVED_OR_UNKNOWN",
  ]);
  return {
    capabilityId,
    name: prior?.name ?? data.label,
    purpose: prior?.purpose ?? `Observed implementation signal for ${data.label}.`,
    questionAnswered: prior?.questionAnswered ?? `What repository evidence supports ${data.label}?`,
    promiseIds: prior?.promiseIds ?? [],
    requirementIds: prior?.requirementIds ?? [],
    owningSubsystemId: subsystemId,
    runtimeHomeId,
    runtimeGap,
    historicalRuntimeHomeIds: runtimeHomeHistory,
    implementationRefs,
    dependencies: prior?.dependencies ?? [],
    dependents: prior?.dependents ?? [],
    lifecycleStatus: runtimeGap ? "DEGRADED" : "LIVE",
    health: runtimeGap ? "RECONCILIATION_REQUIRED" : scan.failures.length > 0 || scan.unknowns.length > 0 ? "HEALTHY_WITH_OBSERVATIONS" : "HEALTHY",
    verificationState: "SOURCE_VERIFIED",
    runtimeTruthLevel: "SOURCE_ONLY",
    evidenceIds: prior?.evidenceIds ?? [],
    claimBoundary: "Observed and reconciled candidate only; no declared intent, semantic ownership, runtime proof, or provider inference.",
    phaseId: prior?.phaseId,
    lineageEventIds: prior?.lineageEventIds ? [...prior.lineageEventIds] : [],
    derivedOutputRefs: prior?.derivedOutputRefs ? [...prior.derivedOutputRefs] : [],
    aliases: prior?.aliases ? [...prior.aliases] : [],
    provenance: candidateProvenance(scan, `phase2:capability:${data.anchor}`, revision, data.provenanceClass),
  };
}

function historicalCapability(prior: Capability, revision: number, scan: Phase1ScanResult): Capability {
  const oldHome = prior.runtimeHomeId;
  return {
    ...clone(prior),
    runtimeHomeId: null,
    runtimeGap: true,
    historicalRuntimeHomeIds: setRuntimeHomeHistory(prior, oldHome, null),
    lifecycleStatus: "RETIRED",
    health: "RECONCILIATION_REQUIRED",
    provenance: candidateProvenance(scan, `phase2:historical:${prior.capabilityId}`, revision, "RECONCILED"),
  };
}

function runtimeHome(
  scan: Phase1ScanResult,
  capabilityId: string,
  runtime: RuntimeCandidateData,
  revision: number,
  status: RuntimeHome["status"] = "LIVE",
  effectiveFromRevision = revision,
  effectiveToRevision?: number,
  tenureKey?: string,
): RuntimeHome {
  return {
    runtimeHomeId: stableId("runtime", canonicalize({ capabilityId, locator: runtime.locator, entryPoints: runtime.entryPoints, ...(tenureKey ? { tenureKey } : {}) })),
    capabilityId,
    kind: "MODULE",
    locator: runtime.locator,
    entryPoints: runtime.entryPoints,
    effectiveFromRevision,
    ...(effectiveToRevision === undefined ? {} : { effectiveToRevision }),
    status,
    provenance: candidateProvenance(scan, `phase2:runtime:${runtime.locator}`, revision, observationClassFor(scan)),
  };
}

function reusableCurrentRuntimeHome(
  prior: Capability | undefined,
  runtimeHomes: RuntimeHome[],
  runtime: RuntimeCandidateData,
  revision: number,
): RuntimeHome | undefined {
  if (!prior || prior.lifecycleStatus !== "LIVE" || !prior.runtimeHomeId) return undefined;
  const current = runtimeHomes.find((home) =>
    home.runtimeHomeId === prior.runtimeHomeId
    && home.capabilityId === prior.capabilityId
    && home.status === "LIVE"
    && home.effectiveFromRevision <= revision
    && home.effectiveToRevision === undefined,
  );
  if (!current) return undefined;
  const currentIdentity = canonicalize({ locator: current.locator, entryPoints: sortedUnique(current.entryPoints) });
  const observedIdentity = canonicalize({ locator: runtime.locator, entryPoints: sortedUnique(runtime.entryPoints) });
  return currentIdentity === observedIdentity ? current : undefined;
}

function choosePriorCapability(
  data: CandidateData,
  generatedId: string,
  priorCapabilities: Capability[],
  usedPriorIds: Set<string>,
  observedPaths: Set<string>,
): { prior?: Capability; capabilityId: string; ambiguous: Capability[]; movedFrom?: Capability } {
  const direct = priorCapabilities.find((candidate) => candidate.capabilityId === generatedId && !usedPriorIds.has(candidate.capabilityId));
  if (direct) return { prior: direct, capabilityId: direct.capabilityId, ambiguous: [] };
  const matches = priorCapabilities.filter((candidate) => {
    if (usedPriorIds.has(candidate.capabilityId)) return false;
    const priorHashes = priorContentHashes(candidate);
    const priorPaths = priorObservedPaths(candidate);
    const priorPathsDisappeared = priorPaths.size === 0 || [...priorPaths].every((sourcePath) => !observedPaths.has(sourcePath));
    return priorPathsDisappeared && data.contentHashes.some((hash) => priorHashes.has(hash));
  });
  if (matches.length === 1) return { capabilityId: matches[0].capabilityId, ambiguous: [], movedFrom: matches[0] };
  if (matches.length > 1) return { capabilityId: generatedId, ambiguous: matches };
  return { capabilityId: generatedId, ambiguous: [] };
}

function candidateRecord(
  scan: Phase1ScanResult,
  kind: CandidateKind,
  candidateId: string,
  anchor: string,
  label: string,
  status: CandidateStatus,
  sourcePaths: string[],
  revision: number,
  matchedPriorId?: string,
  alternatives?: string[],
): Phase2Candidate {
  return {
    kind,
    candidateId,
    anchor,
    label,
    status,
    sourcePaths: sortedUnique(sourcePaths),
    ...(matchedPriorId ? { matchedPriorId } : {}),
    ...(alternatives && alternatives.length > 0 ? { alternatives: sortedUnique(alternatives) } : {}),
    provenance: candidateProvenance(scan, `phase2:candidate:${anchor}`, revision, observationClassFor(scan)),
  };
}

function changedRawIds(previous: CanonicalModel | undefined, next: CanonicalModel): string[] {
  if (!previous) {
    return sortedUnique([
      next.project.projectId,
      ...next.subsystems.map((item) => item.subsystemId),
      ...next.capabilities.map((item) => item.capabilityId),
      ...next.runtimeHomes.map((item) => item.runtimeHomeId),
      ...next.scans.map((item) => item.scanId),
      ...next.capabilityLineage.map((item) => item.eventId),
    ]);
  }
  const previousJson = canonicalize(previous);
  const nextJson = canonicalize(next);
  if (previousJson === nextJson) return [];
  const ids = [
    next.project.projectId,
    ...next.subsystems.map((item) => item.subsystemId),
    ...next.capabilities.map((item) => item.capabilityId),
    ...next.runtimeHomes.map((item) => item.runtimeHomeId),
    ...next.scans.map((item) => item.scanId),
    ...next.capabilityLineage.map((item) => item.eventId),
  ];
  return sortedUnique(ids);
}

function buildScanRecord(scan: Phase1ScanResult, stableFingerprint: string, projectId: string, revision: number) {
  return {
    scanId: `scan_phase2_${stableFingerprint.slice(0, 32)}`,
    scope: `PHASE1_SCOPE:${scan.scope.exclusionPolicyVersion}`,
    adapterIds: sortedUnique(["filesystem", "git-read-only", ...(scan.manifests.length > 0 ? ["javascript-typescript-node-semantic"] : [])]),
    status: scan.status,
    startedAt: scan.startedAt,
    ...(scan.completedAt ? { completedAt: scan.completedAt } : {}),
    evidenceIds: [],
    provenance: candidateProvenance(scan, `phase2:scan:${stableFingerprint}`, revision, observationClassFor(scan)),
  };
}

function addLineageEvent(
  scan: Phase1ScanResult,
  model: CanonicalModel,
  capability: Capability,
  type: "INTRODUCED" | "MOVE" | "RETIRED" | "RESTORED",
  revision: number,
  previousRuntimeHomeId?: string,
  nextRuntimeHomeId?: string,
): string {
  const eventId = stableId("lineage", canonicalize({ capabilityId: capability.capabilityId, type, revision, previousRuntimeHomeId, nextRuntimeHomeId }));
  if (model.capabilityLineage.some((event) => event.eventId === eventId)) {
    capability.lineageEventIds = sortedUnique([...capability.lineageEventIds, eventId]);
    return eventId;
  }
  model.capabilityLineage.push({
    eventId,
    capabilityId: capability.capabilityId,
    type,
    fromCapabilityIds: type === "INTRODUCED" ? [] : [capability.capabilityId],
    toCapabilityIds: type === "RETIRED" ? [] : [capability.capabilityId],
    ...(previousRuntimeHomeId ? { previousRuntimeHomeId } : {}),
    ...(nextRuntimeHomeId ? { nextRuntimeHomeId } : {}),
    reason: `Deterministic Phase 2 reconciliation ${type.toLowerCase()} continuity.`,
    authority: "RECONCILED",
    effectiveRevision: revision,
    evidenceIds: [],
    provenance: candidateProvenance(scan, `phase2:lineage:${eventId}`, revision, "RECONCILED"),
  });
  capability.lineageEventIds = sortedUnique([...capability.lineageEventIds, eventId]);
  return eventId;
}

function normalizeModelCollections(model: CanonicalModel): void {
  model.subsystems.sort((left, right) => left.subsystemId < right.subsystemId ? -1 : left.subsystemId > right.subsystemId ? 1 : 0);
  model.capabilities.sort((left, right) => left.capabilityId < right.capabilityId ? -1 : left.capabilityId > right.capabilityId ? 1 : 0);
  model.runtimeHomes.sort((left, right) => left.runtimeHomeId < right.runtimeHomeId ? -1 : left.runtimeHomeId > right.runtimeHomeId ? 1 : 0);
  model.capabilityLineage.sort((left, right) => left.eventId < right.eventId ? -1 : left.eventId > right.eventId ? 1 : 0);
  model.scans.sort((left, right) => left.scanId < right.scanId ? -1 : left.scanId > right.scanId ? 1 : 0);
  for (const subsystem of model.subsystems) subsystem.capabilityIds = sortedUnique(subsystem.capabilityIds);
  for (const capability of model.capabilities) {
    capability.implementationRefs = sortedUnique(capability.implementationRefs);
    capability.historicalRuntimeHomeIds = sortedUnique(capability.historicalRuntimeHomeIds);
    capability.lineageEventIds = sortedUnique(capability.lineageEventIds);
  }
  if (model.reconciliationTrace) {
    model.reconciliationTrace.candidates.sort((left, right) => left.candidateId < right.candidateId ? -1 : left.candidateId > right.candidateId ? 1 : 0);
    model.reconciliationTrace.ambiguities.sort((left, right) => canonicalize(left).localeCompare(canonicalize(right)));
    model.reconciliationTrace.conflicts.sort((left, right) => canonicalize(left).localeCompare(canonicalize(right)));
  }
}

export function reconcilePhase2Snapshot(
  scan: Phase1ScanResult,
  previous?: PersistenceSnapshot,
): Phase2ReconciliationResult {
  const stableFingerprint = phase2ObservationFingerprint(scan);
  const priorModel = previous?.model;
  const revision = priorModel ? priorModel.canonicalState.modelRevision + 1 : 1;
  const manifest = projectManifest(scan);
  const projectId = priorModel?.project.projectId ?? stableId("project", projectIdentityAnchor(scan));
  const projectName = priorModel?.project.name ?? manifest?.name ?? "Observed Repository";
  const model = priorModel ? clone(priorModel) : baseModel(scan, projectId, projectName, revision);
  model.capabilities = (priorModel?.capabilities ?? []).filter((capability) => !priorAnchorFromImplementationRefs(capability));
  model.canonicalState.modelRevision = revision;
  model.project.projectId = projectId;
  model.project.name = projectName;
  model.project.root = ".";
  model.project.projectType = projectTypeFor(scan);
  model.project.repository = scan.repositoryType === "GIT" ? "GIT_READ_ONLY" : undefined;
  model.project.health = scan.failures.length > 0 || scan.unknowns.length > 0 ? "INDETERMINATE" : "HEALTHY_WITH_OBSERVATIONS";
  model.project.provenance = candidateProvenance(scan, "phase2:project", revision, observationClassFor(scan));
  model.provenance = candidateProvenance(scan, "phase2:model", revision, observationClassFor(scan));
  model.configurationItems = sortedUnique(scan.inventory.filter((item) => item.included).map((item) => normalizeRelativePath(item.relativePath)));

  const candidates: Phase2Candidate[] = [];
  const ambiguities: Phase2Ambiguity[] = [];
  const conflicts: Phase2Conflict[] = [];
  const moveContinuity: Phase2ReconciliationResult["moveContinuity"] = [];
  const priorCapabilities = priorModel?.capabilities ?? [];
  const usedPriorIds = new Set<string>();
  const observedPaths = new Set(scan.inventory.filter((item) => item.included).map((item) => normalizeRelativePath(item.relativePath)));
  const oldRuntimeHomeById = new Map((priorModel?.runtimeHomes ?? []).map((home) => [home.runtimeHomeId, home]));
  const nextRuntimeHomes: RuntimeHome[] = (priorModel?.runtimeHomes ?? []).map((home) => clone(home));
  const nextCapabilityIds = new Set<string>();

  const subsystemByAnchor = new Map<string, Subsystem>();
  const existingSubsystems = priorModel?.subsystems ?? [];
  for (const subsystem of existingSubsystems) {
    const anchor = priorSubsystemAnchor(subsystem);
    if (anchor) subsystemByAnchor.set(anchor, subsystem);
  }
  const generatedSubsystems = currentSubsystems(scan, projectId, revision);
  const generatedSubsystemAnchors = new Set(generatedSubsystems.map((generated) => canonicalize({ group: generated.name === "Repository Core" ? "repository-core" : generated.name })));
  model.subsystems = existingSubsystems.filter((subsystem) => {
    const anchor = priorSubsystemAnchor(subsystem);
    return !anchor || !generatedSubsystemAnchors.has(anchor);
  });
  for (const generated of generatedSubsystems) {
    const anchor = canonicalize({ group: generated.name === "Repository Core" ? "repository-core" : generated.name });
    const prior = subsystemByAnchor.get(anchor);
    const subsystem = prior ? { ...clone(prior), projectId, name: generated.name, provenance: generated.provenance } : generated;
    model.subsystems.push(subsystem);
    candidates.push(candidateRecord(scan, "SUBSYSTEM", subsystem.subsystemId, anchor, subsystem.name, prior ? "MATCHED" : "INTRODUCED", [], revision, prior?.subsystemId));
  }

  for (const data of candidateDataFor(scan)) {
    const generatedId = stableId("capability", data.anchor);
    const choice = choosePriorCapability(data, generatedId, priorCapabilities, usedPriorIds, observedPaths);
    const subsystem = model.subsystems.find((item) => item.name === (data.group === "repository-core" ? "Repository Core" : data.group));
    const subsystemId = subsystem?.subsystemId ?? stableId("subsystem", canonicalize({ group: data.group }));
    if (choice.ambiguous.length > 0) {
      ambiguities.push({ kind: "CAPABILITY", anchor: data.anchor, candidateIds: choice.ambiguous.map((item) => item.capabilityId), reason: "AMBIGUOUS_SUCCESSOR" });
    }
    const prior = choice.prior ?? choice.movedFrom;
    const capabilityId = choice.capabilityId;
    const runtimeCandidates = runtimeCandidatesFor(inventoryForGroup(scan, data.group).filter((entry) => data.sourcePaths.includes(normalizeRelativePath(entry.relativePath))));
    const isRuntimeConflict = runtimeCandidates.length > 1 && data.anchor.includes('"role":"source"');
    const currentRuntime = runtimeCandidates.length === 1 ? runtimeCandidates[0] : undefined;
    const restoring = prior?.lifecycleStatus === "RETIRED" && currentRuntime !== undefined && choice.ambiguous.length === 0;
    const restoredFromHome = restoring
      ? [...nextRuntimeHomes]
        .filter((home) => home.capabilityId === capabilityId && home.effectiveToRevision !== undefined)
        .sort((left, right) => (right.effectiveToRevision ?? 0) - (left.effectiveToRevision ?? 0) || left.runtimeHomeId.localeCompare(right.runtimeHomeId))[0]
      : undefined;
    const reusableHome = currentRuntime && choice.ambiguous.length === 0
      ? reusableCurrentRuntimeHome(prior, nextRuntimeHomes, currentRuntime, revision)
      : undefined;
    const currentRuntimeHome = currentRuntime && choice.ambiguous.length === 0
      ? reusableHome ?? runtimeHome(scan, capabilityId, currentRuntime, revision, "LIVE", revision, undefined, restoring ? `restoration:${revision}` : undefined)
      : undefined;
    let runtimeHomeId = currentRuntimeHome?.runtimeHomeId ?? null;
    let runtimeGap = currentRuntime === undefined || isRuntimeConflict || choice.ambiguous.length > 0;
    let historicalHomes = prior ? setRuntimeHomeHistory(prior, prior.runtimeHomeId) : [];
    for (let homeIndex = 0; homeIndex < nextRuntimeHomes.length; homeIndex += 1) {
      const home = nextRuntimeHomes[homeIndex];
      if (home.capabilityId === capabilityId && home.status === "BLOCKED" && home.effectiveFromRevision <= revision && home.effectiveToRevision === undefined) {
        nextRuntimeHomes[homeIndex] = { ...home, effectiveToRevision: revision };
      }
    }
    if (currentRuntimeHome && currentRuntime) {
      const existing = nextRuntimeHomes.find((home) => home.runtimeHomeId === currentRuntimeHome.runtimeHomeId);
      if (!existing) nextRuntimeHomes.push(currentRuntimeHome);
      if (prior?.runtimeHomeId && prior.runtimeHomeId !== runtimeHomeId) {
        const oldHome = oldRuntimeHomeById.get(prior.runtimeHomeId);
        if (oldHome) {
          const oldIndex = nextRuntimeHomes.findIndex((home) => home.runtimeHomeId === oldHome.runtimeHomeId);
          if (oldIndex >= 0) nextRuntimeHomes[oldIndex] = { ...nextRuntimeHomes[oldIndex], effectiveToRevision: revision };
        }
        historicalHomes = setRuntimeHomeHistory(prior, prior.runtimeHomeId, runtimeHomeId);
        if (!choice.ambiguous.length) moveContinuity.push({ previousId: prior.runtimeHomeId, currentId: currentRuntimeHome.runtimeHomeId, sourcePath: currentRuntime.locator, matchedBy: "CONTENT_HASH" });
      }
    }
    if ((!currentRuntimeHome || isRuntimeConflict) && prior?.runtimeHomeId) {
      const oldHomeIndex = nextRuntimeHomes.findIndex((home) => home.runtimeHomeId === prior.runtimeHomeId && home.effectiveToRevision === undefined);
      if (oldHomeIndex >= 0) nextRuntimeHomes[oldHomeIndex] = { ...nextRuntimeHomes[oldHomeIndex], effectiveToRevision: revision };
      historicalHomes = setRuntimeHomeHistory(prior, prior.runtimeHomeId, null);
    }
    if (isRuntimeConflict) {
      const blockedCandidateIds: string[] = [];
      for (const candidate of runtimeCandidates) {
        const blocked = runtimeHome(scan, capabilityId, candidate, revision, "BLOCKED", revision + 1);
        nextRuntimeHomes.push(blocked);
        blockedCandidateIds.push(blocked.runtimeHomeId);
      }
      conflicts.push({ kind: "RUNTIME_HOME", anchor: data.anchor, candidateIds: blockedCandidateIds, reason: "RUNTIME_HOME_CONFLICT" });
      runtimeHomeId = null;
    }
    const status: CandidateStatus = choice.ambiguous.length > 0 ? "AMBIGUOUS" : prior ? "MATCHED" : "INTRODUCED";
    const capability = createCapability(scan, data, capabilityId, subsystemId, revision, prior, runtimeHomeId, runtimeGap, historicalHomes);
    if (prior) usedPriorIds.add(prior.capabilityId);
    if (choice.movedFrom || prior) {
      const lineagePrior = choice.movedFrom ?? prior;
      if (lineagePrior) usedPriorIds.add(lineagePrior.capabilityId);
      if (capability.runtimeHomeId && lineagePrior?.runtimeHomeId && capability.runtimeHomeId !== lineagePrior.runtimeHomeId) {
        addLineageEvent(scan, model, capability, "MOVE", revision, lineagePrior.runtimeHomeId, capability.runtimeHomeId);
      }
    } else if (!prior && choice.ambiguous.length === 0) {
      addLineageEvent(scan, model, capability, "INTRODUCED", revision);
    }
    if (prior?.lifecycleStatus === "RETIRED" && capability.lifecycleStatus === "LIVE") {
      addLineageEvent(scan, model, capability, "RESTORED", revision, restoredFromHome?.runtimeHomeId ?? undefined, capability.runtimeHomeId ?? undefined);
    }
    nextCapabilityIds.add(capability.capabilityId);
    model.capabilities.push(capability);
    candidates.push(candidateRecord(scan, "CAPABILITY", capability.capabilityId, data.anchor, data.label, status, data.sourcePaths, revision, prior?.capabilityId ?? choice.movedFrom?.capabilityId, choice.ambiguous.map((item) => item.capabilityId)));
    if (isRuntimeConflict) {
      for (const blockedId of conflicts.at(-1)?.candidateIds ?? []) candidates.push(candidateRecord(scan, "RUNTIME_HOME", blockedId, data.anchor, `${data.label} runtime candidate`, "CONFLICT", data.sourcePaths, revision, undefined, conflicts.at(-1)?.candidateIds));
    } else if (currentRuntimeHome && currentRuntime) {
      candidates.push(candidateRecord(scan, "RUNTIME_HOME", currentRuntimeHome.runtimeHomeId, `${data.anchor}|${currentRuntime.anchor}`, `${data.label} runtime home`, prior?.runtimeHomeId ? "MATCHED" : "INTRODUCED", [currentRuntime.locator], revision, prior?.runtimeHomeId ?? undefined));
    }
  }

  for (const prior of priorCapabilities) {
    if (usedPriorIds.has(prior.capabilityId) || nextCapabilityIds.has(prior.capabilityId)) continue;
    if (!priorAnchorFromImplementationRefs(prior)) continue;
    const retired = historicalCapability(prior, revision, scan);
    model.capabilities.push(retired);
    usedPriorIds.add(prior.capabilityId);
    addLineageEvent(scan, model, retired, "RETIRED", revision, prior.runtimeHomeId ?? undefined);
    if (prior.runtimeHomeId) {
      const oldHome = oldRuntimeHomeById.get(prior.runtimeHomeId);
      if (oldHome) {
        const oldIndex = nextRuntimeHomes.findIndex((home) => home.runtimeHomeId === oldHome.runtimeHomeId);
        if (oldIndex >= 0) nextRuntimeHomes[oldIndex] = { ...nextRuntimeHomes[oldIndex], effectiveToRevision: revision };
      }
    }
    candidates.push(candidateRecord(scan, "CAPABILITY", prior.capabilityId, priorAnchorFromImplementationRefs(prior) ?? prior.capabilityId, prior.name, "HISTORICAL", prior.implementationRefs.filter((value) => !value.startsWith("phase2-")), revision, prior.capabilityId));
  }

  model.runtimeHomes = nextRuntimeHomes.filter((home, index, values) => values.findIndex((candidate) => candidate.runtimeHomeId === home.runtimeHomeId) === index);
  for (const subsystem of model.subsystems) {
    subsystem.capabilityIds = model.capabilities.filter((capability) => capability.owningSubsystemId === subsystem.subsystemId).map((capability) => capability.capabilityId);
  }
  const scanRecord = buildScanRecord(scan, stableFingerprint, projectId, revision);
  candidates.unshift(candidateRecord(scan, "PROJECT", model.project.projectId, projectIdentityAnchor(scan), projectName, priorModel ? "MATCHED" : "INTRODUCED", [], revision, priorModel?.project.projectId));
  model.reconciliationTrace = {
    traceId: `reconciliation_phase2_${stableFingerprint.slice(0, 32)}_r${revision}`,
    scanFingerprint: stableFingerprint,
    modelRevision: revision,
    candidates,
    ambiguities,
    conflicts,
    provenance: candidateProvenance(scan, "phase2:reconciliation-trace", revision, "RECONCILED"),
  };
  model.scans = [...(priorModel?.scans ?? []).filter((existing) => existing.scanId !== scanRecord.scanId), scanRecord as CanonicalModel["scans"][number]];
  normalizeModelCollections(model);
  const changedIds = changedRawIds(priorModel, model);
  const previousHistory = previous?.history ?? [];
  const history = [...previousHistory];
  const reconciliationEvent = buildHistoryEvent(
    (history.at(-1)?.sequence ?? 0) + 1,
    "model.reconciled",
    {
      modelRevision: revision,
      reason: priorModel ? "Reconcile Phase 1 observations into the next deterministic Phase 2 model revision." : "Initialize the deterministic Phase 2 observed repository model.",
      changedEntityIds: changedIds.length > 0 ? changedIds : [projectId],
      affectedEntityIds: changedIds.length > 0 ? changedIds : [projectId],
      reconciliationId: `reconciliation_phase2_${stableFingerprint.slice(0, 32)}`,
      scanId: scanRecord.scanId,
    },
    history.at(-1)?.eventHash ?? null,
  );
  history.push(reconciliationEvent);
  const evidenceManifest = previous?.evidenceManifest ?? { schemaVersion: PHASE_2_SCHEMA_VERSION, entries: [] };
  const snapshot = prepareCanonicalRevision({ model, history, evidenceManifest });
  const validation = validatePersistenceSnapshot(snapshot);
  const projectCandidateId = model.project.projectId;
  return {
    scanFingerprint: stableFingerprint,
    model: snapshot.model,
    snapshot,
    candidates,
    ambiguities,
    conflicts,
    identityStability: {
      projectId: projectCandidateId,
      subsystemIds: model.subsystems.map((item) => item.subsystemId),
      capabilityIds: model.capabilities.map((item) => item.capabilityId),
      runtimeHomeIds: model.runtimeHomes.map((item) => item.runtimeHomeId),
      matchedPriorIds: candidates.filter((candidate) => candidate.status === "MATCHED" && candidate.matchedPriorId).map((candidate) => candidate.matchedPriorId as string),
      introducedIds: candidates.filter((candidate) => candidate.status === "INTRODUCED").map((candidate) => candidate.candidateId),
      historicalIds: candidates.filter((candidate) => candidate.status === "HISTORICAL").map((candidate) => candidate.candidateId),
    },
    moveContinuity,
    persistence: { written: false, maatRoot: persistencePaths(path.resolve(".")).maatRoot },
    validation: { valid: validation.valid, issues: validation.divergence },
  };
}

async function fileExists(filePath: string): Promise<boolean> {
  return fs.access(filePath).then(() => true).catch(() => false);
}

async function hasAnyCanonicalFiles(paths: PersistencePaths): Promise<boolean> {
  return (await Promise.all([paths.model, paths.history, paths.evidenceManifest].map(fileExists))).some(Boolean);
}

async function hasAllCanonicalFiles(paths: PersistencePaths): Promise<boolean> {
  return (await Promise.all([paths.model, paths.history, paths.evidenceManifest].map(fileExists))).every(Boolean);
}

export async function reconcilePhase2(
  scan: Phase1ScanResult,
  options: Phase2ReconciliationOptions,
): Promise<Phase2ReconciliationResult> {
  const root = path.resolve(options.root);
  const paths = persistencePaths(root);
  let previous: PersistenceSnapshot | undefined;
  const hasAny = await hasAnyCanonicalFiles(paths);
  if (hasAny) {
    if (!await hasAllCanonicalFiles(paths)) throw new Error("current canonical state is incomplete; recovery required");
    if (options.allowExistingMaatRead === false) throw new Error("existing .maat/ read is not authorized for this reconciliation");
    previous = await readCanonicalRevisionValidated(root);
  } else if (options.persist && options.initializeMaat !== true) {
    throw new Error("explicit .maat/ initialization authorization is required before first canonical write");
  }
  const result = reconcilePhase2Snapshot(scan, previous);
  result.persistence.maatRoot = paths.maatRoot;
  if (!result.validation.valid) throw new Error(`Phase 2 reconciliation produced invalid canonical state: ${result.validation.issues.join(", ")}`);
  if (options.persist) {
    await stageCanonicalRevision(root, result.snapshot);
    result.persistence = { written: true, paths, maatRoot: paths.maatRoot };
  }
  return result;
}
