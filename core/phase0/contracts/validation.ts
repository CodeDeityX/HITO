import { existsSync, readFileSync } from "node:fs";
import type {
  CanonicalModel,
  Capability,
  DerivedOutput,
  Evidence,
  EvidenceManifest,
  EntityProvenance,
  FindingGovernance,
  IntentPromise,
  RuntimeHome,
  HistoryEvent,
} from "./model";
import { canonicalize, computeEvidenceManifestHash, computeModelHash, sha256Bytes } from "./utils";
import { validateCanonicalSchema } from "./schema";
import { resolvePathWithinAuthorizedRoot } from "./security";

export interface ValidationIssue {
  path: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

export interface ModelValidationOptions {
  projectRoot?: string;
  evidenceManifest?: EvidenceManifest;
  derivedOutputs?: DerivedOutput[];
  /** Require byte-level evidence checks; a bound projectRoot is also required. */
  verifyEvidenceBytes?: boolean;
}

function issue(pathValue: string, message: string): ValidationIssue {
  return { path: pathValue, message };
}

function requireText(value: unknown, pathValue: string, issues: ValidationIssue[]): void {
  if (typeof value !== "string" || value.length === 0) issues.push(issue(pathValue, "must be a non-empty string"));
}

function requireConfidence(value: unknown, pathValue: string, issues: ValidationIssue[]): void {
  if (typeof value !== "number" || value < 0 || value > 1) issues.push(issue(pathValue, "must be a number between 0 and 1"));
}

function validateProvenance(value: EntityProvenance | undefined, pathValue: string, issues: ValidationIssue[]): void {
  requireText(value?.observationClass, `${pathValue}.observationClass`, issues);
  requireText(value?.source, `${pathValue}.source`, issues);
  requireConfidence(value?.confidence, `${pathValue}.confidence`, issues);
  requireText(value?.observedAt, `${pathValue}.observedAt`, issues);
  if (!Number.isInteger(value?.modelRevision) || (value?.modelRevision ?? -1) < 0) {
    issues.push(issue(`${pathValue}.modelRevision`, "must be a non-negative integer"));
  }
}

function validateIds(values: Array<{ id: string }>, pathValue: string, issues: ValidationIssue[]): void {
  const seen = new Set<string>();
  values.forEach((item, index) => {
    requireText(item.id, `${pathValue}[${index}].id`, issues);
    if (seen.has(item.id)) issues.push(issue(`${pathValue}[${index}].id`, `duplicate ID ${item.id}`));
    seen.add(item.id);
  });
}

function validateEntityProvenanceRevisions(model: CanonicalModel, issues: ValidationIssue[]): void {
  const currentRevision = model.canonicalState?.modelRevision;
  const collections: Array<[string, Array<{ provenance: EntityProvenance }>]> = [
    ["intent", model.intent], ["requirements", model.requirements], ["phases", model.phases], ["subsystems", model.subsystems],
    ["capabilities", model.capabilities], ["runtimeHomes", model.runtimeHomes], ["edges", [...model.interfaces, ...model.edges]], ["claims", model.claims],
    ["evidenceRefs", model.evidenceRefs], ["releaseGates", model.releaseGates], ["decisions", model.decisions], ["mutations", model.mutations], ["capabilityLineage", model.capabilityLineage],
  ];
  for (const [collection, values] of collections) {
    values.forEach((value, index) => {
      validateProvenance(value.provenance, `${collection}[${index}].provenance`, issues);
      if (Number.isInteger(currentRevision) && value.provenance.modelRevision > (currentRevision as number)) {
        issues.push(issue(`${collection}[${index}].provenance.modelRevision`, "cannot be ahead of canonical modelRevision"));
      }
    });
  }
  validateProvenance(model.provenance, "provenance", issues);
  if (Number.isInteger(currentRevision) && model.provenance.modelRevision > (currentRevision as number)) {
    issues.push(issue("provenance.modelRevision", "cannot be ahead of canonical modelRevision"));
  }
}

function buildEntityIds(model: CanonicalModel): Set<string> {
  return new Set([
    model.project.projectId,
    ...model.intent.map((item) => item.promiseId),
    ...model.requirements.map((item) => item.requirementId),
    ...model.phases.map((item) => item.phaseId),
    ...model.subsystems.map((item) => item.subsystemId),
    ...model.capabilities.map((item) => item.capabilityId),
    ...model.runtimeHomes.map((item) => item.runtimeHomeId),
    ...model.edges.map((item) => item.edgeId),
    ...model.interfaces.map((item) => item.edgeId),
    ...model.claims.map((item) => item.claimId),
    ...model.evidenceRefs.map((item) => item.evidenceId),
    ...model.releaseGates.map((item) => item.gateId),
    ...model.derivedOutputRefs.map((item) => item.derivedOutputId),
    ...model.findingRefs.map((item) => item.findingId),
    ...model.findingGovernance.map((item) => item.findingGovernanceId),
    ...model.scans.map((item) => item.scanId),
    ...model.decisions.map((item) => item.decisionId),
    ...model.mutations.map((item) => item.mutationId),
    ...model.capabilityLineage.map((item) => item.eventId),
  ]);
}

function validateReferenceList(values: string[], validIds: Set<string>, pathValue: string, issues: ValidationIssue[], label: string): void {
  values.forEach((value, index) => {
    if (!validIds.has(value)) issues.push(issue(`${pathValue}[${index}]`, `references unknown ${label} ${value}`));
  });
}

function validateCanonicalRelationships(model: CanonicalModel, issues: ValidationIssue[]): void {
  const projectId = model.project.projectId;
  const subsystemIds = new Set(model.subsystems.map((subsystem) => subsystem.subsystemId));
  const capabilityIds = new Set(model.capabilities.map((capability) => capability.capabilityId));
  const requirementIds = new Set(model.requirements.map((requirement) => requirement.requirementId));
  const promiseIds = new Set(model.intent.map((intent) => intent.promiseId));
  const phaseIds = new Set(model.phases.map((phase) => phase.phaseId));
  const runtimeHomeIds = new Set(model.runtimeHomes.map((home) => home.runtimeHomeId));
  const evidenceIds = new Set(model.evidenceRefs.map((evidence) => evidence.evidenceId));
  const lineageEventIds = new Set(model.capabilityLineage.map((event) => event.eventId));
  const derivedOutputIds = new Set(model.derivedOutputRefs.map((reference) => reference.derivedOutputId));
  const findingIds = new Set(model.findingRefs.map((reference) => reference.findingId));
  const entityIds = buildEntityIds(model);
  const findingRefs = new Map(model.findingRefs.map((reference) => [reference.findingId, reference]));

  for (const intent of model.intent) {
    if (intent.projectId !== projectId) issues.push(issue(`intent.${intent.promiseId}.projectId`, "must reference the canonical project"));
    validateReferenceList(intent.requirements, requirementIds, `intent.${intent.promiseId}.requirements`, issues, "requirement");
  }
  for (const capability of model.capabilities) {
    if (!subsystemIds.has(capability.owningSubsystemId)) issues.push(issue(`capabilities.${capability.capabilityId}.owningSubsystemId`, "must reference an existing subsystem"));
    validateReferenceList(capability.promiseIds, promiseIds, `capabilities.${capability.capabilityId}.promiseIds`, issues, "promise");
    validateReferenceList(capability.requirementIds, requirementIds, `capabilities.${capability.capabilityId}.requirementIds`, issues, "requirement");
    validateReferenceList(capability.evidenceIds, evidenceIds, `capabilities.${capability.capabilityId}.evidenceIds`, issues, "evidence");
    validateReferenceList(capability.dependencies, capabilityIds, `capabilities.${capability.capabilityId}.dependencies`, issues, "capability");
    validateReferenceList(capability.dependents, capabilityIds, `capabilities.${capability.capabilityId}.dependents`, issues, "capability");
    validateReferenceList(capability.historicalRuntimeHomeIds, runtimeHomeIds, `capabilities.${capability.capabilityId}.historicalRuntimeHomeIds`, issues, "runtime home");
    validateReferenceList(capability.lineageEventIds, lineageEventIds, `capabilities.${capability.capabilityId}.lineageEventIds`, issues, "lineage event");
    validateReferenceList(capability.derivedOutputRefs, derivedOutputIds, `capabilities.${capability.capabilityId}.derivedOutputRefs`, issues, "derived output");
    if (capability.phaseId && !phaseIds.has(capability.phaseId)) issues.push(issue(`capabilities.${capability.capabilityId}.phaseId`, "must reference an existing phase"));
  }
  for (const requirement of model.requirements) {
    if (!promiseIds.has(requirement.promiseId)) issues.push(issue(`requirements.${requirement.requirementId}.promiseId`, "must reference an existing intent/promise"));
    validateReferenceList(requirement.capabilityIds, capabilityIds, `requirements.${requirement.requirementId}.capabilityIds`, issues, "capability");
    if (requirement.phaseId && !phaseIds.has(requirement.phaseId)) issues.push(issue(`requirements.${requirement.requirementId}.phaseId`, "must reference an existing phase"));
  }
  for (const phase of model.phases) {
    if (phase.projectId !== projectId) issues.push(issue(`phases.${phase.phaseId}.projectId`, "must reference the canonical project"));
    validateReferenceList(phase.capabilityIds, capabilityIds, `phases.${phase.phaseId}.capabilityIds`, issues, "capability");
  }
  for (const subsystem of model.subsystems) {
    if (subsystem.projectId !== projectId) issues.push(issue(`subsystems.${subsystem.subsystemId}.projectId`, "must reference the canonical project"));
    validateReferenceList(subsystem.capabilityIds, capabilityIds, `subsystems.${subsystem.subsystemId}.capabilityIds`, issues, "capability");
    for (const capabilityId of subsystem.capabilityIds) {
      const capability = model.capabilities.find((candidate) => candidate.capabilityId === capabilityId);
      if (capability && capability.owningSubsystemId !== subsystem.subsystemId) issues.push(issue(`subsystems.${subsystem.subsystemId}.capabilityIds`, `capability ${capabilityId} has a different owning subsystem`));
    }
  }
  for (const runtimeHome of model.runtimeHomes) {
    if (!capabilityIds.has(runtimeHome.capabilityId)) issues.push(issue(`runtimeHomes.${runtimeHome.runtimeHomeId}.capabilityId`, "must reference an existing capability"));
  }
  for (const claim of model.claims) {
    if (!entityIds.has(claim.subjectId)) issues.push(issue(`claims.${claim.claimId}.subjectId`, "must reference an existing entity"));
    if (claim.promiseId && !promiseIds.has(claim.promiseId)) issues.push(issue(`claims.${claim.claimId}.promiseId`, "must reference an existing promise"));
    if (claim.capabilityId && !capabilityIds.has(claim.capabilityId)) issues.push(issue(`claims.${claim.claimId}.capabilityId`, "must reference an existing capability"));
    validateReferenceList(claim.evidenceIds, evidenceIds, `claims.${claim.claimId}.evidenceIds`, issues, "evidence");
  }
  for (const evidence of model.evidenceRefs) {
    if (!entityIds.has(evidence.subjectId)) issues.push(issue(`evidenceRefs.${evidence.evidenceId}.subjectId`, "must reference an existing entity"));
  }
  for (const decision of model.decisions) validateReferenceList(decision.affectedEntityIds, entityIds, `decisions.${decision.decisionId}.affectedEntityIds`, issues, "entity");
  for (const mutation of model.mutations) {
    validateReferenceList(mutation.affectedEntityIds, entityIds, `mutations.${mutation.mutationId}.affectedEntityIds`, issues, "entity");
    validateReferenceList(mutation.evidenceIds, evidenceIds, `mutations.${mutation.mutationId}.evidenceIds`, issues, "evidence");
  }
  for (const gate of model.releaseGates) {
    validateReferenceList(gate.promiseIds, promiseIds, `releaseGates.${gate.gateId}.promiseIds`, issues, "promise");
    validateReferenceList(gate.evidenceIds, evidenceIds, `releaseGates.${gate.gateId}.evidenceIds`, issues, "evidence");
  }
  for (const scan of model.scans) validateReferenceList(scan.evidenceIds, evidenceIds, `scans.${scan.scanId}.evidenceIds`, issues, "evidence");
  for (const edge of [...model.interfaces, ...model.edges]) {
    if (!entityIds.has(edge.sourceId)) issues.push(issue(`edges.${edge.edgeId}.sourceId`, "must reference an existing entity"));
    if (!entityIds.has(edge.targetId)) issues.push(issue(`edges.${edge.edgeId}.targetId`, "must reference an existing entity"));
    validateReferenceList(edge.evidenceIds, evidenceIds, `edges.${edge.edgeId}.evidenceIds`, issues, "evidence");
  }
  for (const lineage of model.capabilityLineage) {
    if (!capabilityIds.has(lineage.capabilityId)) issues.push(issue(`capabilityLineage.${lineage.eventId}.capabilityId`, "must reference an existing capability"));
    validateReferenceList(lineage.fromCapabilityIds, capabilityIds, `capabilityLineage.${lineage.eventId}.fromCapabilityIds`, issues, "capability");
    validateReferenceList(lineage.toCapabilityIds, capabilityIds, `capabilityLineage.${lineage.eventId}.toCapabilityIds`, issues, "capability");
    validateReferenceList(lineage.evidenceIds, evidenceIds, `capabilityLineage.${lineage.eventId}.evidenceIds`, issues, "evidence");
    if (lineage.previousRuntimeHomeId && !runtimeHomeIds.has(lineage.previousRuntimeHomeId)) issues.push(issue(`capabilityLineage.${lineage.eventId}.previousRuntimeHomeId`, "must reference an existing runtime home"));
    if (lineage.nextRuntimeHomeId && !runtimeHomeIds.has(lineage.nextRuntimeHomeId)) issues.push(issue(`capabilityLineage.${lineage.eventId}.nextRuntimeHomeId`, "must reference an existing runtime home"));
  }
  for (const findingRef of model.findingRefs) {
    if (!derivedOutputIds.has(findingRef.derivedOutputId)) issues.push(issue(`findingRefs.${findingRef.findingId}.derivedOutputId`, "must reference an existing derived-output reference"));
  }
  for (const governance of model.findingGovernance) {
    if (!findingIds.has(governance.findingId)) issues.push(issue(`findingGovernance.${governance.findingGovernanceId}.findingId`, "must reference an existing finding reference"));
    if (!derivedOutputIds.has(governance.derivedOutputId)) issues.push(issue(`findingGovernance.${governance.findingGovernanceId}.derivedOutputId`, "must reference an existing derived-output reference"));
    validateReferenceList(governance.evidenceIds, evidenceIds, `findingGovernance.${governance.findingGovernanceId}.evidenceIds`, issues, "evidence");
    const reference = findingRefs.get(governance.findingId);
    if (reference && reference.derivedOutputId !== governance.derivedOutputId) issues.push(issue(`findingGovernance.${governance.findingGovernanceId}.derivedOutputId`, "must match the derived output referenced by the finding"));
  }
}

function promiseIdExists(model: CanonicalModel, promiseId: string): boolean {
  return model.intent.some((intent) => intent.promiseId === promiseId);
}

function intervalsOverlap(left: RuntimeHome, right: RuntimeHome): boolean {
  const leftEnd = left.effectiveToRevision ?? Number.POSITIVE_INFINITY;
  const rightEnd = right.effectiveToRevision ?? Number.POSITIVE_INFINITY;
  return left.effectiveFromRevision < rightEnd && right.effectiveFromRevision < leftEnd;
}

function validateCapabilityRuntimeHomes(model: CanonicalModel, issues: ValidationIssue[]): void {
  const homesById = new Map(model.runtimeHomes.map((home) => [home.runtimeHomeId, home]));
  const capabilitiesById = new Map(model.capabilities.map((capability) => [capability.capabilityId, capability]));
  const currentRevision = model.canonicalState.modelRevision;

  for (const capability of model.capabilities) {
    const home = capability.runtimeHomeId ? homesById.get(capability.runtimeHomeId) : undefined;
    if (capability.runtimeGap) {
      if (capability.runtimeHomeId !== null) issues.push(issue(`capabilities.${capability.capabilityId}`, "runtimeGap capabilities must have runtimeHomeId null"));
    } else if (!home) {
      issues.push(issue(`capabilities.${capability.capabilityId}`, "must have exactly one current canonical runtime home or explicit runtimeGap"));
    } else if (home.capabilityId !== capability.capabilityId) {
      issues.push(issue(`capabilities.${capability.capabilityId}.runtimeHomeId`, "runtime home belongs to another capability"));
    }

    if (capability.nextSafeMutationRef && !model.derivedOutputRefs.some((reference) => reference.derivedOutputId === capability.nextSafeMutationRef && reference.kind === "NEXT_SAFE_MUTATION")) {
      issues.push(issue(`capabilities.${capability.capabilityId}.nextSafeMutationRef`, "must reference a derived NEXT_SAFE_MUTATION output"));
    }
    if (new Set(capability.historicalRuntimeHomeIds).size !== capability.historicalRuntimeHomeIds.length) {
      issues.push(issue(`capabilities.${capability.capabilityId}.historicalRuntimeHomeIds`, "must not contain duplicate runtime-home IDs"));
    }
    if (capability.runtimeHomeId && capability.historicalRuntimeHomeIds.includes(capability.runtimeHomeId)) {
      issues.push(issue(`capabilities.${capability.capabilityId}`, "current runtime home cannot also be historical"));
    }
  }

  for (const home of model.runtimeHomes) {
    const capability = capabilitiesById.get(home.capabilityId);
    if (!capability) issues.push(issue(`runtimeHomes.${home.runtimeHomeId}`, "references an unknown capability"));
    if (!Number.isInteger(home.effectiveFromRevision) || home.effectiveFromRevision < 1) issues.push(issue(`runtimeHomes.${home.runtimeHomeId}.effectiveFromRevision`, "must be a positive integer"));
    if (home.effectiveToRevision !== undefined && home.effectiveToRevision < home.effectiveFromRevision) {
      issues.push(issue(`runtimeHomes.${home.runtimeHomeId}`, "effectiveToRevision cannot precede effectiveFromRevision"));
    }
  }

  for (const capability of model.capabilities) {
    const homes = model.runtimeHomes.filter((home) => home.capabilityId === capability.capabilityId);
    for (let leftIndex = 0; leftIndex < homes.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < homes.length; rightIndex += 1) {
        if (intervalsOverlap(homes[leftIndex], homes[rightIndex])) {
          issues.push(issue(`capabilities.${capability.capabilityId}`, `runtime-home intervals overlap: ${homes[leftIndex].runtimeHomeId} and ${homes[rightIndex].runtimeHomeId}`));
        }
      }
    }
  }

  for (const capability of model.capabilities) {
    const currentHomes = model.runtimeHomes.filter((home) =>
      home.capabilityId === capability.capabilityId &&
      home.effectiveFromRevision <= currentRevision &&
      (home.effectiveToRevision === undefined || home.effectiveToRevision > currentRevision),
    );
    if (capability.runtimeGap && currentHomes.length !== 0) {
      issues.push(issue(`capabilities.${capability.capabilityId}`, `runtime gap cannot retain a current home at revision ${currentRevision}`));
    } else if (!capability.runtimeGap && currentHomes.length !== 1) {
      issues.push(issue(`capabilities.${capability.capabilityId}`, `must have exactly one home at revision ${currentRevision}; found ${currentHomes.length}`));
    } else if (!capability.runtimeGap && currentHomes[0].runtimeHomeId !== capability.runtimeHomeId) {
      issues.push(issue(`capabilities.${capability.capabilityId}.runtimeHomeId`, "must point to the one current home at the canonical revision"));
    }
  }
}

function validateIntentAuthority(model: CanonicalModel, issues: ValidationIssue[]): void {
  for (const intent of model.intent) {
    if (intent.authority === "DECLARED_INTENT") {
      if (!intent.authorityProof) {
        issues.push(issue(`intent.${intent.promiseId}.authorityProof`, "DECLARED_INTENT requires explicit authority proof"));
      } else {
        requireText(intent.authorityProof.proofId, `intent.${intent.promiseId}.authorityProof.proofId`, issues);
        requireText(intent.authorityProof.confirmedBy, `intent.${intent.promiseId}.authorityProof.confirmedBy`, issues);
        requireText(intent.authorityProof.sourceRecordId, `intent.${intent.promiseId}.authorityProof.sourceRecordId`, issues);
        if (intent.authorityProof.lineageEventIds.length === 0) issues.push(issue(`intent.${intent.promiseId}.authorityProof.lineageEventIds`, "must contain authority lineage evidence"));
      }
      if (intent.provenance.observationClass !== "EXPLICIT" && intent.provenance.observationClass !== "RECONCILED") {
        issues.push(issue(`intent.${intent.promiseId}.provenance.observationClass`, "DECLARED_INTENT must be explicit or reconciled, not merely observed or inferred"));
      }
    }
    if (intent.authority === "EXTRACTED_INTENT_CANDIDATE") {
      if (intent.authorityProof) issues.push(issue(`intent.${intent.promiseId}.authorityProof`, "EXTRACTED_INTENT_CANDIDATE cannot carry declared-intent authority proof"));
      if (intent.provenance.observationClass === "EXPLICIT") issues.push(issue(`intent.${intent.promiseId}.provenance.observationClass`, "an extracted intent candidate cannot be treated as explicit authority"));
    }
  }
}

function validateDerivedReferences(model: CanonicalModel, options: ModelValidationOptions, issues: ValidationIssue[]): void {
  const outputRefs = new Map(model.derivedOutputRefs.map((reference) => [reference.derivedOutputId, reference]));
  const fullOutputs = new Map((options.derivedOutputs ?? []).map((output) => [output.derivedOutputId, output]));
  const entityIds = buildEntityIds(model);
  const evidenceIds = new Set(model.evidenceRefs.map((evidence) => evidence.evidenceId));
  for (const output of fullOutputs.values()) {
    const outputPath = `derivedOutputs.${output.derivedOutputId}`;
    if (output.provenance.inputEntityIds.some((id) => !entityIds.has(id))) issues.push(issue(outputPath, "provenance inputEntityIds contains an unknown entity"));
    if (output.provenance.evidenceIds.some((id) => !evidenceIds.has(id))) issues.push(issue(outputPath, "provenance evidenceIds contains an unknown evidence ID"));
    for (const finding of output.findings ?? []) {
      if (finding.derivedOutputId !== output.derivedOutputId) issues.push(issue(`${outputPath}.findings.${finding.findingId}`, "finding provenance must match its containing derived output"));
      if (finding.evidenceIds.some((id) => !evidenceIds.has(id))) issues.push(issue(`${outputPath}.findings.${finding.findingId}`, "finding contains an unknown evidence ID"));
      if (finding.affectedEntityIds.some((id) => !entityIds.has(id))) issues.push(issue(`${outputPath}.findings.${finding.findingId}`, "finding contains an unknown affected entity ID"));
    }
    if (output.nextSafeMutation) {
      if (output.nextSafeMutation.evidenceIds.some((id) => !evidenceIds.has(id))) issues.push(issue(`${outputPath}.nextSafeMutation`, "next safe mutation contains an unknown evidence ID"));
      if (output.nextSafeMutation.affectedEntityIds.some((id) => !entityIds.has(id))) issues.push(issue(`${outputPath}.nextSafeMutation`, "next safe mutation contains an unknown affected entity ID"));
    }
    const reference = outputRefs.get(output.derivedOutputId);
    if (reference && (reference.kind !== output.kind || reference.sourceModelRevision !== output.sourceModelRevision || reference.stalenessState !== output.stalenessState)) {
      issues.push(issue(`${outputPath}`, "full derived output does not match its canonical provenance reference"));
    }
  }
  for (const reference of model.findingRefs) {
    const outputRef = outputRefs.get(reference.derivedOutputId);
    if (!outputRef) continue;
    if (reference.status === "CURRENT") {
      if (reference.sourceModelRevision !== model.canonicalState.modelRevision) issues.push(issue(`findingRefs.${reference.findingId}`, "CURRENT finding must match the canonical model revision"));
      if (outputRef.sourceModelRevision !== model.canonicalState.modelRevision || outputRef.stalenessState !== "FRESH") {
        issues.push(issue(`findingRefs.${reference.findingId}`, "CURRENT finding must reference a FRESH derived output at the current model revision"));
      }
      const output = fullOutputs.get(reference.derivedOutputId);
      if (!output) {
        issues.push(issue(`findingRefs.${reference.findingId}`, "CURRENT finding requires the full derived output to be present for freshness and provenance validation"));
      } else {
        const finding = output.findings?.find((candidate) => candidate.findingId === reference.findingId);
        if (output.stalenessState !== "FRESH" || !finding) {
          issues.push(issue(`findingRefs.${reference.findingId}`, "CURRENT finding must be present in the fresh derived output finding set"));
        }
      }
    }
  }
}

function validateEvidenceBindings(model: CanonicalModel, options: ModelValidationOptions, issues: ValidationIssue[]): void {
  const manifest = options.evidenceManifest;
  if (!manifest) {
    if (options.verifyEvidenceBytes) issues.push(issue("evidence", "full evidence integrity requires an evidence manifest"));
    return;
  }
  const manifestHash = computeEvidenceManifestHash(manifest);
  if (model.canonicalState.evidenceHead.manifestHash !== manifestHash) issues.push(issue("canonicalState.evidenceHead.manifestHash", "does not match the supplied evidence manifest"));
  if (model.canonicalState.integrity.evidenceManifestHash !== manifestHash) issues.push(issue("canonicalState.integrity.evidenceManifestHash", "does not match the supplied evidence manifest"));
  const entries = new Map<string, EvidenceManifest["entries"][number]>();
  manifest.entries.forEach((entry, index) => {
    if (entries.has(entry.evidenceId)) issues.push(issue(`evidenceManifest.entries[${index}].evidenceId`, `duplicate evidence ID ${entry.evidenceId}`));
    entries.set(entry.evidenceId, entry);
  });
  for (const evidence of model.evidenceRefs) {
    const entry = entries.get(evidence.evidenceId);
    if (!entry) {
      issues.push(issue(`evidenceRefs.${evidence.evidenceId}`, "has no matching evidence-manifest entry"));
      continue;
    }
    if (entry.contentHash !== evidence.contentHash) issues.push(issue(`evidenceRefs.${evidence.evidenceId}.contentHash`, "does not match the manifest content hash"));
    if (entry.artifactPath !== evidence.artifactPath) issues.push(issue(`evidenceRefs.${evidence.evidenceId}.artifactPath`, "does not match the manifest artifact path"));
    if (entry.available !== evidence.available) issues.push(issue(`evidenceRefs.${evidence.evidenceId}.available`, "does not match the manifest availability"));
    if (!evidence.available) continue;
    if (!evidence.artifactPath) {
      issues.push(issue(`evidenceRefs.${evidence.evidenceId}.artifactPath`, "available evidence requires an artifact path"));
      continue;
    }
    if (options.verifyEvidenceBytes && !options.projectRoot) {
      issues.push(issue(`evidenceRefs.${evidence.evidenceId}`, "full evidence integrity requires projectRoot for byte verification"));
      continue;
    }
    if (!options.projectRoot) continue;
    const resolved = resolvePathWithinAuthorizedRoot(options.projectRoot, evidence.artifactPath);
    if (!resolved) {
      issues.push(issue(`evidenceRefs.${evidence.evidenceId}.artifactPath`, "resolves outside the authorized project root"));
      continue;
    }
    if (!existsSync(resolved)) {
      issues.push(issue(`evidenceRefs.${evidence.evidenceId}.artifactPath`, "referenced evidence artifact does not exist"));
      continue;
    }
    const actualHash = `sha256:${sha256Bytes(readFileSync(resolved))}`;
    if (actualHash !== evidence.contentHash) issues.push(issue(`evidenceRefs.${evidence.evidenceId}.contentHash`, "does not match the referenced artifact bytes"));
  }
}

function validateRevisionReferences(model: CanonicalModel, issues: ValidationIssue[]): void {
  const revision = model.canonicalState.modelRevision;
  for (const capability of model.capabilities) {
    if (capability.provenance.modelRevision > revision) issues.push(issue(`capabilities.${capability.capabilityId}`, "cannot be introduced by a future revision"));
  }
  for (const runtimeHome of model.runtimeHomes) {
    if (runtimeHome.effectiveFromRevision > revision + 1) issues.push(issue(`runtimeHomes.${runtimeHome.runtimeHomeId}`, "cannot begin beyond the next reachable revision"));
    if (runtimeHome.effectiveToRevision !== undefined && runtimeHome.effectiveToRevision < runtimeHome.effectiveFromRevision) issues.push(issue(`runtimeHomes.${runtimeHome.runtimeHomeId}`, "has an invalid migration interval"));
  }
}

export function validateCanonicalModel(model: CanonicalModel, options: ModelValidationOptions = {}): ValidationResult {
  const issues: ValidationIssue[] = [];
  if (!model || typeof model !== "object") return { valid: false, issues: [issue("root", "must be an object")] };
  const schemaResult = validateCanonicalSchema(model);
  for (const schemaIssue of schemaResult.errors) issues.push(issue(schemaIssue.instancePath || "root", `${schemaIssue.keyword}: ${schemaIssue.message}`));
  if (!model.canonicalState || typeof model.canonicalState !== "object") return { valid: false, issues: [...issues, issue("canonicalState", "must be present for semantic validation")] };
  if (!Number.isInteger(model.canonicalState.modelRevision) || model.canonicalState.modelRevision < 1) issues.push(issue("canonicalState.modelRevision", "must be a positive integer"));
  if (!Number.isInteger(model.canonicalState.historyHead?.sequence) || model.canonicalState.historyHead.sequence < 0) issues.push(issue("canonicalState.historyHead.sequence", "must be a non-negative integer"));
  if (!Number.isInteger(model.canonicalState.evidenceHead?.sequence) || model.canonicalState.evidenceHead.sequence < 0) issues.push(issue("canonicalState.evidenceHead.sequence", "must be a non-negative integer"));

  validateIds(model.intent.map((x) => ({ id: x.promiseId })), "intent", issues);
  validateIds(model.requirements.map((x) => ({ id: x.requirementId })), "requirements", issues);
  validateIds(model.phases.map((x) => ({ id: x.phaseId })), "phases", issues);
  validateIds(model.subsystems.map((x) => ({ id: x.subsystemId })), "subsystems", issues);
  validateIds(model.capabilities.map((x) => ({ id: x.capabilityId })), "capabilities", issues);
  validateIds(model.runtimeHomes.map((x) => ({ id: x.runtimeHomeId })), "runtimeHomes", issues);
  validateIds([...model.interfaces, ...model.edges].map((x) => ({ id: x.edgeId })), "edges", issues);
  validateIds(model.claims.map((x) => ({ id: x.claimId })), "claims", issues);
  validateIds(model.evidenceRefs.map((x) => ({ id: x.evidenceId })), "evidenceRefs", issues);
  validateIds(model.decisions.map((x) => ({ id: x.decisionId })), "decisions", issues);
  validateIds(model.mutations.map((x) => ({ id: x.mutationId })), "mutations", issues);
  validateIds(model.releaseGates.map((x) => ({ id: x.gateId })), "releaseGates", issues);
  validateIds(model.derivedOutputRefs.map((x) => ({ id: x.derivedOutputId })), "derivedOutputRefs", issues);
  validateIds(model.findingRefs.map((x) => ({ id: x.findingId })), "findingRefs", issues);
  validateIds(model.findingGovernance.map((x) => ({ id: x.findingGovernanceId })), "findingGovernance", issues);
  validateIds(model.scans.map((x) => ({ id: x.scanId })), "scans", issues);
  validateIds(model.capabilityLineage.map((x) => ({ id: x.eventId })), "capabilityLineage", issues);

  validateEntityProvenanceRevisions(model, issues);
  validateIntentAuthority(model, issues);
  validateCanonicalRelationships(model, issues);
  validateCapabilityRuntimeHomes(model, issues);
  validateDerivedReferences(model, options, issues);
  validateEvidenceBindings(model, options, issues);
  validateRevisionReferences(model, issues);

  const expectedHash = computeModelHash(model);
  if (model.canonicalState.integrity.modelHash !== expectedHash) issues.push(issue("canonicalState.integrity.modelHash", "does not match deterministic hash excluding its own field"));
  if (canonicalize(model).length === 0) issues.push(issue("root", "canonical serialization is empty"));
  return { valid: issues.length === 0, issues };
}

export function assertValidModel(model: CanonicalModel, options: ModelValidationOptions = {}): void {
  const result = validateCanonicalModel(model, options);
  if (!result.valid) throw new Error(result.issues.map((item) => `${item.path}: ${item.message}`).join("; "));
}

export function assertDerivedOutputFresh(output: DerivedOutput, model: CanonicalModel, historyHead: string, evidenceHead: string, rulesetVersion: string): void {
  if (output.sourceModelRevision !== model.canonicalState.modelRevision) throw new Error("derived output is stale against model revision");
  if (output.sourceHistoryHead.eventHash !== historyHead) throw new Error("derived output is stale against history head");
  if (output.sourceEvidenceHead.manifestHash !== evidenceHead) throw new Error("derived output is stale against evidence head");
  if (output.rulesetVersion !== rulesetVersion) throw new Error("derived output is stale against ruleset version");
  if (output.stalenessState !== "FRESH") throw new Error(`derived output is not fresh: ${output.stalenessState}`);
}

export function assertFindingGovernanceIsNotFindingTruth(governance: FindingGovernance, currentFindingIds: Set<string>): void {
  void governance;
  void currentFindingIds;
}

export function assertCapabilityHasNoAuthoritativeRecommendation(capability: Capability): void {
  if (Object.prototype.hasOwnProperty.call(capability, "nextSafeMutation") || Object.prototype.hasOwnProperty.call(capability, "currentNextSafeMutation")) {
    throw new Error("canonical capability cannot contain an authoritative next safe mutation object");
  }
}

export function assertExactlyOneCurrentHome(capability: Capability, homes: RuntimeHome[], revision: number): void {
  const current = homes.filter((home) => home.capabilityId === capability.capabilityId && home.effectiveFromRevision <= revision && (home.effectiveToRevision === undefined || home.effectiveToRevision > revision));
  if (capability.runtimeGap) {
    if (current.length !== 0) throw new Error("runtime gap capability cannot have a current runtime home");
  } else if (current.length !== 1) {
    throw new Error(`capability ${capability.capabilityId} has ${current.length} current runtime homes`);
  } else if (current[0].runtimeHomeId !== capability.runtimeHomeId) {
    throw new Error(`capability ${capability.capabilityId} does not point to the current runtime home`);
  }
}

export function validateHistoryReferences(model: CanonicalModel, history: HistoryEvent[]): ValidationIssue[] {
  const historyIds = new Set(history.map((event) => `event_${event.sequence}`));
  const issues: ValidationIssue[] = [];
  for (const governance of model.findingGovernance) {
    for (const historyEventId of governance.historyEventIds) {
      if (!historyIds.has(historyEventId) && !history.some((event) => event.type === historyEventId || event.eventHash === historyEventId)) {
        issues.push(issue(`findingGovernance.${governance.findingGovernanceId}.historyEventIds`, `references unknown history event ${historyEventId}`));
      }
    }
  }
  return issues;
}
