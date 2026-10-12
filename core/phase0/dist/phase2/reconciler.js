"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.phase2ObservationFingerprint = phase2ObservationFingerprint;
exports.reconcilePhase2Snapshot = reconcilePhase2Snapshot;
exports.reconcilePhase2 = reconcilePhase2;
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
const persistence_1 = require("../contracts/persistence");
const persistence_2 = require("../contracts/persistence");
const utils_1 = require("../contracts/utils");
const PHASE_2_SCHEMA_VERSION = "0.1.0";
const PHASE_2_OBSERVATION_SOURCE = "phase2:deterministic-reconciliation";
const PHASE_2_RELEASE_CONTRACT = "Observed repository model only; no semantic inference, UI, provider call, or project mutation is claimed.";
const PHASE_2_PHASE_ID = "phase_2_deterministic_reconciliation";
const ENTRYPOINT_NAMES = new Set(["index.ts", "index.tsx", "main.ts", "main.tsx", "server.ts", "server.tsx", "app.ts", "app.tsx", "worker.ts", "worker.tsx"]);
function stableId(prefix, anchor) {
    return `${prefix}_${(0, utils_1.sha256Text)(anchor).slice(0, 32)}`;
}
function normalizeRelativePath(value) {
    return value.replaceAll("\\", "/").replace(/^\.\//, "");
}
function sortedUnique(values) {
    return [...new Set(values)].sort((left, right) => left < right ? -1 : left > right ? 1 : 0);
}
function observationClassFor(scan) {
    if (scan.failures.length > 0 || scan.unknowns.length > 0)
        return "UNKNOWN";
    return "OBSERVED";
}
function provenance(scan, sourceRef, observationClass = observationClassFor(scan)) {
    return {
        observationClass,
        source: PHASE_2_OBSERVATION_SOURCE,
        sourceRef,
        confidence: observationClass === "UNKNOWN" ? 0 : 1,
        observedAt: scan.startedAt,
        modelRevision: 1,
    };
}
function stableScanInput(scan) {
    const normalizedFailures = scan.failures
        .map((item) => ({ ...item, relativePath: item.relativePath ? normalizeRelativePath(item.relativePath) : undefined }))
        .sort((left, right) => (0, utils_1.canonicalize)(left).localeCompare((0, utils_1.canonicalize)(right)));
    const normalizedUnknowns = scan.unknowns
        .map((item) => ({ ...item, relativePath: item.relativePath ? normalizeRelativePath(item.relativePath) : undefined }))
        .sort((left, right) => (0, utils_1.canonicalize)(left).localeCompare((0, utils_1.canonicalize)(right)));
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
function phase2ObservationFingerprint(scan) {
    return (0, utils_1.sha256Text)((0, utils_1.canonicalize)(stableScanInput(scan)));
}
function projectManifest(scan) {
    return [...scan.manifests]
        .filter((item) => item.manifestKind === "NODE_PACKAGE_JSON")
        .sort((left, right) => normalizeRelativePath(left.relativePath).localeCompare(normalizeRelativePath(right.relativePath)))[0];
}
function projectTypeFor(scan) {
    if (scan.manifests.some((item) => item.manifestKind === "NODE_PACKAGE_JSON"))
        return "javascript-typescript-node";
    return "repository-observation";
}
function projectIdentityAnchor(scan) {
    const manifest = projectManifest(scan);
    return (0, utils_1.canonicalize)({
        repositoryType: scan.repositoryType,
        projectType: projectTypeFor(scan),
        packageName: manifest?.name ?? "",
    });
}
function groupFor(relativePath) {
    const normalized = normalizeRelativePath(relativePath);
    const first = normalized.split("/")[0];
    if (!first || first === normalized)
        return "repository-core";
    if (first === "src" || first === "app" || first === "lib" || first === "server" || first === "client" || first === "packages")
        return first;
    return first;
}
function inventoryForGroup(scan, group) {
    return scan.inventory.filter((item) => item.included && groupFor(item.relativePath) === group);
}
function manifestsForGroup(scan, group) {
    return scan.manifests.filter((item) => groupFor(item.relativePath) === group);
}
function contentHashesFor(entries) {
    return sortedUnique(entries.map((entry) => entry.contentHash).filter((value) => Boolean(value)));
}
function runtimeCandidatesFor(entries) {
    const entrypoints = entries
        .filter((entry) => ENTRYPOINT_NAMES.has(node_path_1.default.posix.basename(normalizeRelativePath(entry.relativePath))))
        .map((entry) => ({
        locator: normalizeRelativePath(entry.relativePath),
        entryPoints: [node_path_1.default.posix.basename(normalizeRelativePath(entry.relativePath))],
        contentHashes: entry.contentHash ? [entry.contentHash] : [],
    }))
        .sort((left, right) => left.locator < right.locator ? -1 : left.locator > right.locator ? 1 : 0);
    return entrypoints.map((entry) => ({
        anchor: (0, utils_1.canonicalize)({ locator: entry.locator, entryPoints: entry.entryPoints }),
        locator: entry.locator,
        entryPoints: entry.entryPoints,
        contentHashes: entry.contentHashes,
    }));
}
function candidateDataFor(scan) {
    const groups = sortedUnique(scan.inventory.filter((item) => item.included).map((item) => groupFor(item.relativePath)));
    const result = [];
    for (const group of groups) {
        const entries = inventoryForGroup(scan, group);
        const manifests = manifestsForGroup(scan, group);
        const sourceEntries = entries.filter((entry) => entry.classification === "SOURCE");
        const manifestEntries = entries.filter((entry) => entry.classification === "MANIFEST");
        if (sourceEntries.length > 0) {
            result.push({
                kind: "CAPABILITY",
                anchor: (0, utils_1.canonicalize)({ group, role: "source" }),
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
                anchor: (0, utils_1.canonicalize)({ group, role: "manifest", paths: manifestPaths }),
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
      result.push({kind:'CAPABILITY', anchor:(0, utils_1.canonicalize)({role:'structural-definition',path:relative}), label:`${relative} structural definition`, group:groupFor(relative), sourcePaths:[relative], contentHashes:entry.contentHash?[entry.contentHash]:[], runtimeLocators:[], provenanceClass:observationClassFor(scan)});
    }
    if (result.length === 0 && scan.inventory.some((item) => item.included)) {
        const entries = scan.inventory.filter((item) => item.included);
        result.push({
            kind: "CAPABILITY",
            anchor: (0, utils_1.canonicalize)({ group: "repository-core", role: "observed-files" }),
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
function priorAnchorFromImplementationRefs(capability) {
    return capability.implementationRefs.find((value) => value.startsWith("phase2-anchor:"))?.slice("phase2-anchor:".length);
}
function priorContentHashes(capability) {
    return new Set(capability.implementationRefs.filter((value) => value.startsWith("phase2-content:")).map((value) => value.slice("phase2-content:".length)));
}
function priorObservedPaths(capability) {
    return new Set(capability.implementationRefs.filter((value) => !value.startsWith("phase2-") && value.length > 0).map(normalizeRelativePath));
}
function priorSubsystemAnchor(subsystem) {
    return subsystem.responsibility.match(/phase2-anchor:([^\]]+)/)?.[1];
}
function candidateProvenance(scan, sourceRef, modelRevision, observationClass) {
    return { ...provenance(scan, sourceRef, observationClass), modelRevision };
}
function clone(value) {
    return structuredClone(value);
}
function baseModel(scan, projectId, projectName, modelRevision) {
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
function currentSubsystems(scan, projectId, revision) {
    const groups = sortedUnique(scan.inventory.filter((item) => item.included).map((item) => groupFor(item.relativePath)));
    return groups.map((group) => ({
        subsystemId: stableId("subsystem", (0, utils_1.canonicalize)({ group })),
        projectId,
        name: group === "repository-core" ? "Repository Core" : group,
        responsibility: `Observed structural responsibility for ${group} [phase2-anchor:${(0, utils_1.canonicalize)({ group })}]`,
        capabilityIds: [],
        provenance: candidateProvenance(scan, `phase2:subsystem:${group}`, revision, observationClassFor(scan)),
    }));
}
function setRuntimeHomeHistory(capability, previousHomeId, currentHomeId = capability.runtimeHomeId) {
    return sortedUnique([
        ...capability.historicalRuntimeHomeIds,
        ...(previousHomeId ? [previousHomeId] : []),
    ]).filter((id) => id !== currentHomeId);
}
function createCapability(scan, data, capabilityId, subsystemId, revision, prior, runtimeHomeId, runtimeGap, runtimeHomeHistory) {
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
function historicalCapability(prior, revision, scan) {
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
function runtimeHome(scan, capabilityId, runtime, revision, status = "LIVE", effectiveFromRevision = revision, effectiveToRevision, tenureKey) {
    return {
        runtimeHomeId: stableId("runtime", (0, utils_1.canonicalize)({ capabilityId, locator: runtime.locator, entryPoints: runtime.entryPoints, ...(tenureKey ? { tenureKey } : {}) })),
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
function reusableCurrentRuntimeHome(prior, runtimeHomes, runtime, revision) {
    if (!prior || prior.lifecycleStatus !== "LIVE" || !prior.runtimeHomeId)
        return undefined;
    const current = runtimeHomes.find((home) => home.runtimeHomeId === prior.runtimeHomeId
        && home.capabilityId === prior.capabilityId
        && home.status === "LIVE"
        && home.effectiveFromRevision <= revision
        && home.effectiveToRevision === undefined);
    if (!current)
        return undefined;
    const currentIdentity = (0, utils_1.canonicalize)({ locator: current.locator, entryPoints: sortedUnique(current.entryPoints) });
    const observedIdentity = (0, utils_1.canonicalize)({ locator: runtime.locator, entryPoints: sortedUnique(runtime.entryPoints) });
    return currentIdentity === observedIdentity ? current : undefined;
}
function choosePriorCapability(data, generatedId, priorCapabilities, usedPriorIds, observedPaths) {
    const direct = priorCapabilities.find((candidate) => candidate.capabilityId === generatedId && !usedPriorIds.has(candidate.capabilityId));
    if (direct)
        return { prior: direct, capabilityId: direct.capabilityId, ambiguous: [] };
    const matches = priorCapabilities.filter((candidate) => {
        if (usedPriorIds.has(candidate.capabilityId))
            return false;
        const priorHashes = priorContentHashes(candidate);
        const priorPaths = priorObservedPaths(candidate);
        const priorPathsDisappeared = priorPaths.size === 0 || [...priorPaths].every((sourcePath) => !observedPaths.has(sourcePath));
        return priorPathsDisappeared && data.contentHashes.some((hash) => priorHashes.has(hash));
    });
    if (matches.length === 1)
        return { capabilityId: matches[0].capabilityId, ambiguous: [], movedFrom: matches[0] };
    if (matches.length > 1)
        return { capabilityId: generatedId, ambiguous: matches };
    return { capabilityId: generatedId, ambiguous: [] };
}
function candidateRecord(scan, kind, candidateId, anchor, label, status, sourcePaths, revision, matchedPriorId, alternatives) {
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
function changedRawIds(previous, next) {
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
    const previousJson = (0, utils_1.canonicalize)(previous);
    const nextJson = (0, utils_1.canonicalize)(next);
    if (previousJson === nextJson)
        return [];
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
function buildScanRecord(scan, stableFingerprint, projectId, revision) {
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
function addLineageEvent(scan, model, capability, type, revision, previousRuntimeHomeId, nextRuntimeHomeId) {
    const eventId = stableId("lineage", (0, utils_1.canonicalize)({ capabilityId: capability.capabilityId, type, revision, previousRuntimeHomeId, nextRuntimeHomeId }));
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
function normalizeModelCollections(model) {
    model.subsystems.sort((left, right) => left.subsystemId < right.subsystemId ? -1 : left.subsystemId > right.subsystemId ? 1 : 0);
    model.capabilities.sort((left, right) => left.capabilityId < right.capabilityId ? -1 : left.capabilityId > right.capabilityId ? 1 : 0);
    model.runtimeHomes.sort((left, right) => left.runtimeHomeId < right.runtimeHomeId ? -1 : left.runtimeHomeId > right.runtimeHomeId ? 1 : 0);
    model.capabilityLineage.sort((left, right) => left.eventId < right.eventId ? -1 : left.eventId > right.eventId ? 1 : 0);
    model.scans.sort((left, right) => left.scanId < right.scanId ? -1 : left.scanId > right.scanId ? 1 : 0);
    for (const subsystem of model.subsystems)
        subsystem.capabilityIds = sortedUnique(subsystem.capabilityIds);
    for (const capability of model.capabilities) {
        capability.implementationRefs = sortedUnique(capability.implementationRefs);
        capability.historicalRuntimeHomeIds = sortedUnique(capability.historicalRuntimeHomeIds);
        capability.lineageEventIds = sortedUnique(capability.lineageEventIds);
    }
    if (model.reconciliationTrace) {
        model.reconciliationTrace.candidates.sort((left, right) => left.candidateId < right.candidateId ? -1 : left.candidateId > right.candidateId ? 1 : 0);
        model.reconciliationTrace.ambiguities.sort((left, right) => (0, utils_1.canonicalize)(left).localeCompare((0, utils_1.canonicalize)(right)));
        model.reconciliationTrace.conflicts.sort((left, right) => (0, utils_1.canonicalize)(left).localeCompare((0, utils_1.canonicalize)(right)));
    }
}
function reconcilePhase2Snapshot(scan, previous) {
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
    const candidates = [];
    const ambiguities = [];
    const conflicts = [];
    const moveContinuity = [];
    const priorCapabilities = priorModel?.capabilities ?? [];
    const usedPriorIds = new Set();
    const observedPaths = new Set(scan.inventory.filter((item) => item.included).map((item) => normalizeRelativePath(item.relativePath)));
    const oldRuntimeHomeById = new Map((priorModel?.runtimeHomes ?? []).map((home) => [home.runtimeHomeId, home]));
    const nextRuntimeHomes = (priorModel?.runtimeHomes ?? []).map((home) => clone(home));
    const nextCapabilityIds = new Set();
    const subsystemByAnchor = new Map();
    const existingSubsystems = priorModel?.subsystems ?? [];
    for (const subsystem of existingSubsystems) {
        const anchor = priorSubsystemAnchor(subsystem);
        if (anchor)
            subsystemByAnchor.set(anchor, subsystem);
    }
    const generatedSubsystems = currentSubsystems(scan, projectId, revision);
    const generatedSubsystemAnchors = new Set(generatedSubsystems.map((generated) => (0, utils_1.canonicalize)({ group: generated.name === "Repository Core" ? "repository-core" : generated.name })));
    model.subsystems = existingSubsystems.filter((subsystem) => {
        const anchor = priorSubsystemAnchor(subsystem);
        return !anchor || !generatedSubsystemAnchors.has(anchor);
    });
    for (const generated of generatedSubsystems) {
        const anchor = (0, utils_1.canonicalize)({ group: generated.name === "Repository Core" ? "repository-core" : generated.name });
        const prior = subsystemByAnchor.get(anchor);
        const subsystem = prior ? { ...clone(prior), projectId, name: generated.name, provenance: generated.provenance } : generated;
        model.subsystems.push(subsystem);
        candidates.push(candidateRecord(scan, "SUBSYSTEM", subsystem.subsystemId, anchor, subsystem.name, prior ? "MATCHED" : "INTRODUCED", [], revision, prior?.subsystemId));
    }
    for (const data of candidateDataFor(scan)) {
        const generatedId = stableId("capability", data.anchor);
        const choice = choosePriorCapability(data, generatedId, priorCapabilities, usedPriorIds, observedPaths);
        const subsystem = model.subsystems.find((item) => item.name === (data.group === "repository-core" ? "Repository Core" : data.group));
        const subsystemId = subsystem?.subsystemId ?? stableId("subsystem", (0, utils_1.canonicalize)({ group: data.group }));
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
            if (!existing)
                nextRuntimeHomes.push(currentRuntimeHome);
            if (prior?.runtimeHomeId && prior.runtimeHomeId !== runtimeHomeId) {
                const oldHome = oldRuntimeHomeById.get(prior.runtimeHomeId);
                if (oldHome) {
                    const oldIndex = nextRuntimeHomes.findIndex((home) => home.runtimeHomeId === oldHome.runtimeHomeId);
                    if (oldIndex >= 0)
                        nextRuntimeHomes[oldIndex] = { ...nextRuntimeHomes[oldIndex], effectiveToRevision: revision };
                }
                historicalHomes = setRuntimeHomeHistory(prior, prior.runtimeHomeId, runtimeHomeId);
                if (!choice.ambiguous.length)
                    moveContinuity.push({ previousId: prior.runtimeHomeId, currentId: currentRuntimeHome.runtimeHomeId, sourcePath: currentRuntime.locator, matchedBy: "CONTENT_HASH" });
            }
        }
        if ((!currentRuntimeHome || isRuntimeConflict) && prior?.runtimeHomeId) {
            const oldHomeIndex = nextRuntimeHomes.findIndex((home) => home.runtimeHomeId === prior.runtimeHomeId && home.effectiveToRevision === undefined);
            if (oldHomeIndex >= 0)
                nextRuntimeHomes[oldHomeIndex] = { ...nextRuntimeHomes[oldHomeIndex], effectiveToRevision: revision };
            historicalHomes = setRuntimeHomeHistory(prior, prior.runtimeHomeId, null);
        }
        if (isRuntimeConflict) {
            const blockedCandidateIds = [];
            for (const candidate of runtimeCandidates) {
                const blocked = runtimeHome(scan, capabilityId, candidate, revision, "BLOCKED", revision + 1);
                nextRuntimeHomes.push(blocked);
                blockedCandidateIds.push(blocked.runtimeHomeId);
            }
            conflicts.push({ kind: "RUNTIME_HOME", anchor: data.anchor, candidateIds: blockedCandidateIds, reason: "RUNTIME_HOME_CONFLICT" });
            runtimeHomeId = null;
        }
        const status = choice.ambiguous.length > 0 ? "AMBIGUOUS" : prior ? "MATCHED" : "INTRODUCED";
        const capability = createCapability(scan, data, capabilityId, subsystemId, revision, prior, runtimeHomeId, runtimeGap, historicalHomes);
        if (prior)
            usedPriorIds.add(prior.capabilityId);
        if (choice.movedFrom || prior) {
            const lineagePrior = choice.movedFrom ?? prior;
            if (lineagePrior)
                usedPriorIds.add(lineagePrior.capabilityId);
            if (capability.runtimeHomeId && lineagePrior?.runtimeHomeId && capability.runtimeHomeId !== lineagePrior.runtimeHomeId) {
                addLineageEvent(scan, model, capability, "MOVE", revision, lineagePrior.runtimeHomeId, capability.runtimeHomeId);
            }
        }
        else if (!prior && choice.ambiguous.length === 0) {
            addLineageEvent(scan, model, capability, "INTRODUCED", revision);
        }
        if (prior?.lifecycleStatus === "RETIRED" && capability.lifecycleStatus === "LIVE") {
            addLineageEvent(scan, model, capability, "RESTORED", revision, restoredFromHome?.runtimeHomeId ?? undefined, capability.runtimeHomeId ?? undefined);
        }
        nextCapabilityIds.add(capability.capabilityId);
        model.capabilities.push(capability);
        candidates.push(candidateRecord(scan, "CAPABILITY", capability.capabilityId, data.anchor, data.label, status, data.sourcePaths, revision, prior?.capabilityId ?? choice.movedFrom?.capabilityId, choice.ambiguous.map((item) => item.capabilityId)));
        if (isRuntimeConflict) {
            for (const blockedId of conflicts.at(-1)?.candidateIds ?? [])
                candidates.push(candidateRecord(scan, "RUNTIME_HOME", blockedId, data.anchor, `${data.label} runtime candidate`, "CONFLICT", data.sourcePaths, revision, undefined, conflicts.at(-1)?.candidateIds));
        }
        else if (currentRuntimeHome && currentRuntime) {
            candidates.push(candidateRecord(scan, "RUNTIME_HOME", currentRuntimeHome.runtimeHomeId, `${data.anchor}|${currentRuntime.anchor}`, `${data.label} runtime home`, prior?.runtimeHomeId ? "MATCHED" : "INTRODUCED", [currentRuntime.locator], revision, prior?.runtimeHomeId ?? undefined));
        }
    }
    for (const prior of priorCapabilities) {
        if (usedPriorIds.has(prior.capabilityId) || nextCapabilityIds.has(prior.capabilityId))
            continue;
        if (!priorAnchorFromImplementationRefs(prior))
            continue;
        const retired = historicalCapability(prior, revision, scan);
        model.capabilities.push(retired);
        usedPriorIds.add(prior.capabilityId);
        addLineageEvent(scan, model, retired, "RETIRED", revision, prior.runtimeHomeId ?? undefined);
        if (prior.runtimeHomeId) {
            const oldHome = oldRuntimeHomeById.get(prior.runtimeHomeId);
            if (oldHome) {
                const oldIndex = nextRuntimeHomes.findIndex((home) => home.runtimeHomeId === oldHome.runtimeHomeId);
                if (oldIndex >= 0)
                    nextRuntimeHomes[oldIndex] = { ...nextRuntimeHomes[oldIndex], effectiveToRevision: revision };
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
    model.scans = [...(priorModel?.scans ?? []).filter((existing) => existing.scanId !== scanRecord.scanId), scanRecord];
    normalizeModelCollections(model);
    const changedIds = changedRawIds(priorModel, model);
    const previousHistory = previous?.history ?? [];
    const history = [...previousHistory];
    const reconciliationEvent = (0, persistence_1.buildHistoryEvent)((history.at(-1)?.sequence ?? 0) + 1, "model.reconciled", {
        modelRevision: revision,
        reason: priorModel ? "Reconcile Phase 1 observations into the next deterministic Phase 2 model revision." : "Initialize the deterministic Phase 2 observed repository model.",
        changedEntityIds: changedIds.length > 0 ? changedIds : [projectId],
        affectedEntityIds: changedIds.length > 0 ? changedIds : [projectId],
        reconciliationId: `reconciliation_phase2_${stableFingerprint.slice(0, 32)}`,
        scanId: scanRecord.scanId,
    }, history.at(-1)?.eventHash ?? null);
    history.push(reconciliationEvent);
    const evidenceManifest = previous?.evidenceManifest ?? { schemaVersion: PHASE_2_SCHEMA_VERSION, entries: [] };
    const snapshot = (0, persistence_1.prepareCanonicalRevision)({ model, history, evidenceManifest });
    const validation = (0, persistence_2.validatePersistenceSnapshot)(snapshot);
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
            matchedPriorIds: candidates.filter((candidate) => candidate.status === "MATCHED" && candidate.matchedPriorId).map((candidate) => candidate.matchedPriorId),
            introducedIds: candidates.filter((candidate) => candidate.status === "INTRODUCED").map((candidate) => candidate.candidateId),
            historicalIds: candidates.filter((candidate) => candidate.status === "HISTORICAL").map((candidate) => candidate.candidateId),
        },
        moveContinuity,
        persistence: { written: false, maatRoot: (0, persistence_1.persistencePaths)(node_path_1.default.resolve(".")).maatRoot },
        validation: { valid: validation.valid, issues: validation.divergence },
    };
}
async function fileExists(filePath) {
    return node_fs_1.promises.access(filePath).then(() => true).catch(() => false);
}
async function hasAnyCanonicalFiles(paths) {
    return (await Promise.all([paths.model, paths.history, paths.evidenceManifest].map(fileExists))).some(Boolean);
}
async function hasAllCanonicalFiles(paths) {
    return (await Promise.all([paths.model, paths.history, paths.evidenceManifest].map(fileExists))).every(Boolean);
}
async function reconcilePhase2(scan, options) {
    const root = node_path_1.default.resolve(options.root);
    const paths = (0, persistence_1.persistencePaths)(root);
    let previous;
    const hasAny = await hasAnyCanonicalFiles(paths);
    if (hasAny) {
        if (!await hasAllCanonicalFiles(paths))
            throw new Error("current canonical state is incomplete; recovery required");
        if (options.allowExistingMaatRead === false)
            throw new Error("existing .maat/ read is not authorized for this reconciliation");
        previous = await (0, persistence_1.readCanonicalRevisionValidated)(root);
    }
    else if (options.persist && options.initializeMaat !== true) {
        throw new Error("explicit .maat/ initialization authorization is required before first canonical write");
    }
    const result = reconcilePhase2Snapshot(scan, previous);
    result.persistence.maatRoot = paths.maatRoot;
    if (!result.validation.valid)
        throw new Error(`Phase 2 reconciliation produced invalid canonical state: ${result.validation.issues.join(", ")}`);
    if (options.persist) {
        await (0, persistence_1.stageCanonicalRevision)(root, result.snapshot);
        result.persistence = { written: true, paths, maatRoot: paths.maatRoot };
    }
    return result;
}
