'use strict';

// Shared R2 provenance contract. It is used before persistence and during reopen.
const crypto = require('node:crypto');
const path = require('node:path');

const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const identity = (tag, value) => `${tag}:${sha(Buffer.from(JSON.stringify(value)))}`;

function receiptDigest(receipt) {
  return sha(Buffer.from(JSON.stringify(receipt ?? null)));
}

function initialProvenance({ root, subject, receipt, artifact }) {
  const evidence = (receipt?.request?.documentaryEvidence ?? []).find(
    item => item.provenance?.sourcePath === artifact.path
  );
  if (!evidence) return null;
  return {
    route: 'INITIAL_SEED_BOUND',
    projectRootIdentity: identity('project-root', root),
    subjectIdentity: subject,
    originatingObservationReceiptIdentity: identity('observation-receipt', receiptDigest(receipt)),
    originatingObservationReceiptDigest: receiptDigest(receipt),
    sourcePath: artifact.path,
    contentIdentity: artifact.contentSha256 ?? artifact.reason,
    boundedInitialAcquisitionMembership: {
      scope: receipt.acquisition?.scope ?? null,
      sourcePath: evidence.provenance.sourcePath,
      contentSha256: evidence.provenance.contentSha256
    },
    semanticDimension: artifact.dimension,
    authority: artifact.authority,
    artifactIdentity: artifact.artifactIdentity
  };
}

const ROUTES = Object.freeze(['INITIAL_SEED_BOUND', 'LEGACY_SEED_BOUND', 'TRAVERSAL_BOUND']);
const ROUTE_PRIORITY = Object.freeze({ LEGACY_SEED_BOUND: 0, INITIAL_SEED_BOUND: 1, TRAVERSAL_BOUND: 2 });

function createProvenanceIndexes(history = [], legacyIds = []) {
  const historyByArtifact = new Map();
  for (const item of history) {
    const key = item?.resultingArtifactIdentity;
    if (!key) continue;
    if (!historyByArtifact.has(key)) historyByArtifact.set(key, []);
    historyByArtifact.get(key).push(item);
  }
  return { historyByArtifact, legacySet: new Set(legacyIds) };
}

function routeEvidence({ artifact, history = [], legacyIds = [], indexes, onHistoryItems }) {
  const key = artifact?.artifactIdentity;
  const traversal = indexes ? (indexes.historyByArtifact.get(key) ?? []) : history.filter(item => item?.resultingArtifactIdentity === key);
  if (onHistoryItems) onHistoryItems(traversal.length);
  const legacy = indexes ? indexes.legacySet.has(key) : legacyIds.includes(key);
  const initial = artifact?.provenance?.route === 'INITIAL_SEED_BOUND' || artifact?.provenance?.canonicalRoute === 'INITIAL_SEED_BOUND';
  return { traversal, legacy, initial, supported: [initial && 'INITIAL_SEED_BOUND', legacy && 'LEGACY_SEED_BOUND', traversal.length && 'TRAVERSAL_BOUND'].filter(Boolean) };
}

function routeCompatible({ artifact, traversal }) {
  for (const item of traversal) {
    const dimensions = item?.targetSemanticDimensions;
    if (Array.isArray(dimensions) && dimensions.length && !dimensions.includes(artifact.dimension)) return false;
    if (item?.authority && item.authority !== artifact.authority) return false;
  }
  return true;
}

function canonicalizeArtifactRoute({ artifact, history = [], legacyIds = [] }) {
  const evidence = routeEvidence({ artifact, history, legacyIds });
  if (!evidence.supported.length) return { artifact, routes: [], canonicalRoute: null };
  if (!routeCompatible({ artifact, traversal: evidence.traversal })) throw new Error('R2_PROVENANCE_ROUTE_AMBIGUOUS');
  const canonicalRoute = [...evidence.supported].sort((a, b) => ROUTE_PRIORITY[a] - ROUTE_PRIORITY[b])[0];
  const next = { ...artifact };
  const prior = artifact.provenance && typeof artifact.provenance === 'object' ? artifact.provenance : {};
  next.provenance = { ...prior, route: canonicalRoute, canonicalRoute };
  return { artifact: next, routes: evidence.supported, canonicalRoute };
}

function validateArtifact({ root, subject, receipt, artifact, history, legacyIds, indexes, onHistoryItems, allowHistoricalReadme }) {
  if (!artifact || typeof artifact.path !== 'string' || artifact.path.includes('\\') || path.isAbsolute(artifact.path) || artifact.path.split('/').some(part => !part || part === '.' || part === '..')) {
    throw new Error('R2_PROVENANCE_PATH_BINDING');
  }
  const expectedIdentity = identity('artifact', [root, artifact.path, artifact.contentSha256 ?? artifact.reason]);
  if (artifact.artifactIdentity !== expectedIdentity) throw new Error('R2_ARTIFACT_BINDING');
  if (artifact.state === 'OBSERVED' && sha(Buffer.from(artifact.content)) !== artifact.contentSha256) throw new Error('R2_CONTENT_BINDING');

  const evidence = routeEvidence({ artifact, history, legacyIds, indexes, onHistoryItems });
  const canonical = artifact.provenance?.canonicalRoute;
  const traversal = evidence.traversal.length > 0;
  const legacy = evidence.legacy;
  const initial = evidence.initial;
  const routes = canonical ? Number(ROUTES.includes(canonical)) : Number(traversal) + Number(legacy) + Number(initial);
  if (routes === 0) {
    if (allowHistoricalReadme && artifact.path === 'README.md' && artifact.authority === 'DOCUMENTARY_EVIDENCE_ONLY' && artifact.dimension === 'architecture' && artifact.state === 'OBSERVED') return;
    throw new Error('R2_UNBOUND_SEED');
  }
  if (routes !== 1) {
    if (allowHistoricalReadme && artifact.path === 'README.md' && artifact.authority === 'DOCUMENTARY_EVIDENCE_ONLY' && artifact.dimension === 'architecture' && artifact.state === 'OBSERVED') return;
    throw new Error('R2_PROVENANCE_ROUTE_AMBIGUOUS');
  }
  if (canonical && !ROUTES.includes(canonical)) throw new Error('R2_PROVENANCE_ROUTE_AMBIGUOUS');
  if (canonical === 'INITIAL_SEED_BOUND' && !initial) throw new Error('R2_INITIAL_SEED_PROVENANCE');
  if (canonical === 'LEGACY_SEED_BOUND' && !legacy) throw new Error('R2_LEGACY_SEED_BINDING');
  if (canonical === 'TRAVERSAL_BOUND' && !traversal) throw new Error('R2_PROVENANCE_ROUTE_AMBIGUOUS');
  if (canonical === 'TRAVERSAL_BOUND' || canonical === 'LEGACY_SEED_BOUND' || traversal || legacy) return;
  const p = artifact.provenance;
  const expected = receipt?.request ? initialProvenance({ root, subject, receipt, artifact }) : null;
  if (!p || p.projectRootIdentity !== identity('project-root', root) || p.subjectIdentity !== subject || p.sourcePath !== artifact.path || p.contentIdentity !== (artifact.contentSha256 ?? artifact.reason) || p.artifactIdentity !== artifact.artifactIdentity || typeof p.originatingObservationReceiptDigest !== 'string' || typeof p.originatingObservationReceiptIdentity !== 'string' || !p.boundedInitialAcquisitionMembership?.scope) throw new Error('R2_INITIAL_SEED_PROVENANCE');
  if (expected) {
    const comparable = { ...p }; delete comparable.canonicalRoute;
    if (JSON.stringify(comparable) !== JSON.stringify(expected)) throw new Error('R2_INITIAL_SEED_PROVENANCE');
  }
}

function validateReceipt({ root, subject, receipt, data, allowHistoricalReadme = false, onHistoryItems }) {
  if (!data || data.kind !== 'HITO_ADAPTIVE_EVIDENCE_DISCOVERY_R2' || data.root !== root || data.subjectIdentity !== subject) throw new Error('R2_RECEIPT_BINDING');
  const history = Array.isArray(data.history) ? data.history : [];
  const legacyIds = Array.isArray(data.legacySeedIdentities) ? data.legacySeedIdentities : [];
  const indexes = createProvenanceIndexes(history, legacyIds);
  const artifacts = data.artifacts ?? [];
  const identities = artifacts.map(artifact => artifact?.artifactIdentity);
  if (new Set(identities).size !== identities.length) throw new Error('R2_DUPLICATE_ARTIFACT_IDENTITY');
  for (const artifact of artifacts) validateArtifact({ root, subject, receipt, artifact, history, legacyIds, indexes, onHistoryItems, allowHistoricalReadme });
  return true;
}

module.exports = { sha, identity, receiptDigest, initialProvenance, createProvenanceIndexes, routeEvidence, canonicalizeArtifactRoute, validateArtifact, validateReceipt, ROUTES };
