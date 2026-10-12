'use strict';

// Shared deterministic R2 persistence/reconstruction limits. This module is a
// transport/validation policy only; it does not own semantic truth or intake.
const fs = require('node:fs');
const crypto = require('node:crypto');

const LIMITS = Object.freeze({
  MAX_RECEIPT_BYTES: 16 * 1024 * 1024,
  MAX_ARTIFACTS: 512,
  MAX_CLAIMS: 4096,
  MAX_DISCOVERED_EDGES: 16384,
  MAX_DEFERRED_EDGES: 16384,
  MAX_HISTORY_RECORDS: 4096,
  MAX_REFERENCE_CLASSIFICATIONS: 16384,
  MAX_QUEUE_SNAPSHOTS: 32,
  MAX_RANKING_ENTRIES_PER_SNAPSHOT: 1024,
  MAX_TOTAL_RANKING_ENTRIES: 8192,
  MACHINE_PROJECTION_MAX_BYTES: 4 * 1024 * 1024
});

const RECONSTRUCTION_WORK_LIMITS = Object.freeze({
  ARTIFACT_PROVENANCE_CHECKS: LIMITS.MAX_ARTIFACTS,
  ARTIFACT_REFRESH_CHECKS: LIMITS.MAX_ARTIFACTS,
  CLAIM_BINDING_CHECKS: LIMITS.MAX_CLAIMS,
  CLAIM_DEPENDENCY_CHECKS: LIMITS.MAX_CLAIMS * LIMITS.MAX_ARTIFACTS * 2,
  HISTORY_LOOKUPS: LIMITS.MAX_HISTORY_RECORDS * 3
});
const MAX_TOTAL_RECONSTRUCTION_WORK = Object.values(RECONSTRUCTION_WORK_LIMITS).reduce((sum, n) => sum + n, 0);

const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const array = value => Array.isArray(value) ? value : [];
const fail = code => { throw new Error(`R2_BOUNDED_STATE_${code}`); };

function countState(data) {
  const artifacts = array(data?.artifacts);
  const claims = array(data?.claims);
  const discoveredEdges = array(data?.discoveredEdges);
  const deferredEdges = array(data?.deferredEdges);
  const history = array(data?.history);
  const referenceClassifications = array(data?.referenceClassifications);
  const queueRankingSnapshots = array(data?.queueRankingSnapshots);
  const totalRankingEntries = queueRankingSnapshots.reduce((sum, snapshot) => sum + array(snapshot?.ordering).length, 0);
  return {
    artifacts: artifacts.length,
    claims: claims.length,
    discoveredEdges: discoveredEdges.length,
    deferredEdges: deferredEdges.length,
    history: history.length,
    referenceClassifications: referenceClassifications.length,
    queueRankingSnapshots: queueRankingSnapshots.length,
    totalRankingEntries
  };
}

function assertStateCounts(data) {
  const counts = countState(data);
  const checks = [
    ['ARTIFACTS', counts.artifacts, LIMITS.MAX_ARTIFACTS],
    ['CLAIMS', counts.claims, LIMITS.MAX_CLAIMS],
    ['DISCOVERED_EDGES', counts.discoveredEdges, LIMITS.MAX_DISCOVERED_EDGES],
    ['DEFERRED_EDGES', counts.deferredEdges, LIMITS.MAX_DEFERRED_EDGES],
    ['HISTORY_RECORDS', counts.history, LIMITS.MAX_HISTORY_RECORDS],
    ['REFERENCE_CLASSIFICATIONS', counts.referenceClassifications, LIMITS.MAX_REFERENCE_CLASSIFICATIONS],
    ['QUEUE_SNAPSHOTS', counts.queueRankingSnapshots, LIMITS.MAX_QUEUE_SNAPSHOTS],
    ['TOTAL_RANKING_ENTRIES', counts.totalRankingEntries, LIMITS.MAX_TOTAL_RANKING_ENTRIES]
  ];
  for (const [name, value, limit] of checks) if (value > limit) fail(`${name}_LIMIT`);
  for (const snapshot of array(data?.queueRankingSnapshots)) {
    if (array(snapshot?.ordering).length > LIMITS.MAX_RANKING_ENTRIES_PER_SNAPSHOT) fail('RANKING_ENTRIES_PER_SNAPSHOT_LIMIT');
  }
  return counts;
}

function assertReceiptBytes(bytes) {
  const length = Buffer.isBuffer(bytes) ? bytes.length : Buffer.byteLength(String(bytes), 'utf8');
  if (length > LIMITS.MAX_RECEIPT_BYTES) fail('RECEIPT_BYTES_LIMIT');
  return length;
}

function serializeReceipt(envelope) {
  assertStateCounts(envelope?.data);
  const serialized = `${JSON.stringify(envelope)}\n`;
  assertReceiptBytes(serialized);
  return serialized;
}

function readReceiptFile(file) {
  const stat = fs.statSync(file);
  if (stat.size > LIMITS.MAX_RECEIPT_BYTES) fail('RECEIPT_BYTES_LIMIT');
  const bytes = fs.readFileSync(file);
  assertReceiptBytes(bytes); // Recheck after stat to close a size-change window.
  return bytes;
}

function writeReceiptAtomically(file, envelope) {
  const serialized = serializeReceipt(envelope); // Fail before creating a stage file.
  const temporary = `${file}.stage`;
  let fd;
  let created = false;
  try {
    fd = fs.openSync(temporary, 'wx');
    created = true;
    fs.writeFileSync(fd, serialized);
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    fd = undefined;
    fs.renameSync(temporary, file);
  } catch (error) {
    if (fd !== undefined) {
      try { fs.closeSync(fd); } catch {}
    }
    if (created) {
      try { fs.rmSync(temporary, { force: true }); } catch {}
    }
    throw error;
  }
  return Buffer.byteLength(serialized, 'utf8');
}

function createWorkCounters() {
  return { ARTIFACT_PROVENANCE_CHECKS: 0, ARTIFACT_REFRESH_CHECKS: 0, CLAIM_BINDING_CHECKS: 0, CLAIM_DEPENDENCY_CHECKS: 0, HISTORY_LOOKUPS: 0, TOTAL_WORK: 0 };
}

function recordWork(work, key, units = 1) {
  if (!work || !Object.hasOwn(RECONSTRUCTION_WORK_LIMITS, key) || !Number.isSafeInteger(units) || units < 0) fail('WORK_COUNTER_INVALID');
  const next = work[key] + units;
  if (next > RECONSTRUCTION_WORK_LIMITS[key]) fail(`${key}_LIMIT`);
  const total = work.TOTAL_WORK + units;
  if (total > MAX_TOTAL_RECONSTRUCTION_WORK) fail('TOTAL_RECONSTRUCTION_WORK_LIMIT');
  work[key] = next;
  work.TOTAL_WORK = total;
  return work;
}

function validateClaimBindings(claims, expectedClaims, work = createWorkCounters()) {
  const expectedByIdentity = new Map();
  for (const claim of expectedClaims) expectedByIdentity.set(claim.claimIdentity, claim);
  const identities = new Set();
  if (claims.length !== expectedByIdentity.size) fail('CLAIM_BINDING_COUNT');
  for (const claim of claims) {
    recordWork(work, 'CLAIM_BINDING_CHECKS');
    if (identities.has(claim.claimIdentity) || !['CURRENT', 'STALE', 'UNKNOWN'].includes(claim.currentness)) fail('CLAIM_BINDING_STATE');
    identities.add(claim.claimIdentity);
    const expected = expectedByIdentity.get(claim.claimIdentity);
    if (!expected || JSON.stringify({ ...claim, currentness: 'CURRENT' }) !== JSON.stringify(expected)) fail('CLAIM_BINDING_MISMATCH');
  }
  return { work, expectedCount: expectedByIdentity.size };
}

function rankingRow(edge, rank) {
  const eligible = array(edge?.currentlyAdmissibleSemanticDimensions);
  return {
    edgeIdentity: edge?.edgeIdentity ?? null,
    rank,
    priority: array(edge?.priority),
    eligibleDimensions: eligible,
    eligibility: eligible.length ? 'ELIGIBLE_FOR_BOUNDED_SUPPORT' : 'NO_ADMISSIBLE_DIMENSION',
    reasonCode: eligible.length ? null : 'OUTSIDE_ACTIVE_ACQUISITION_CAPABILITY'
  };
}

function boundedRankingSnapshot({ ordinal, dimensionStates, queue, totalEntryAllowance = LIMITS.MAX_RANKING_ENTRIES_PER_SNAPSHOT }) {
  const allRows = array(queue).map((edge, index) => rankingRow(edge, index + 1));
  const cap = Math.max(0, Math.min(LIMITS.MAX_RANKING_ENTRIES_PER_SNAPSHOT, totalEntryAllowance));
  const ordering = allRows.slice(0, cap);
  const omittedRows = allRows.slice(cap);
  return {
    schema: 'HITO_R2_QUEUE_RANKING_SUMMARY_R1',
    ordinal,
    dimensionStates: { ...(dimensionStates ?? {}) },
    ordering,
    totalEntries: allRows.length,
    omittedEntries: omittedRows.length,
    omittedEntriesDigest: omittedRows.length ? sha256(JSON.stringify(omittedRows)) : null,
    summaryDigest: sha256(JSON.stringify({ ordinal, dimensionStates: dimensionStates ?? {}, allRows })),
    complete: omittedRows.length === 0
  };
}

function normalizeLegacyRankingSnapshots(snapshots) {
  return array(snapshots).map((snapshot, index) => {
    if (snapshot?.schema === 'HITO_R2_QUEUE_RANKING_SUMMARY_R1') return snapshot;
    const ordering = array(snapshot?.ordering).map((entry, i) => ({
      edgeIdentity: entry?.edgeIdentity ?? null,
      rank: i + 1,
      priority: array(entry?.priority),
      eligibleDimensions: array(entry?.currentlyAdmissibleSemanticDimensions),
      eligibility: array(entry?.currentlyAdmissibleSemanticDimensions).length ? 'ELIGIBLE_FOR_BOUNDED_SUPPORT' : 'NO_ADMISSIBLE_DIMENSION',
      reasonCode: array(entry?.currentlyAdmissibleSemanticDimensions).length ? null : 'LEGACY_DETAIL_NOT_RETAINED'
    }));
    const digest = sha256(JSON.stringify(snapshot));
    return {
      schema: 'HITO_R2_QUEUE_RANKING_SUMMARY_R1',
      ordinal: index + 1,
      dimensionStates: { ...(snapshot?.dimensionStates ?? {}) },
      ordering: ordering.slice(0, LIMITS.MAX_RANKING_ENTRIES_PER_SNAPSHOT),
      totalEntries: ordering.length,
      omittedEntries: Math.max(0, ordering.length - LIMITS.MAX_RANKING_ENTRIES_PER_SNAPSHOT),
      omittedEntriesDigest: ordering.length > LIMITS.MAX_RANKING_ENTRIES_PER_SNAPSHOT ? sha256(JSON.stringify(ordering.slice(LIMITS.MAX_RANKING_ENTRIES_PER_SNAPSHOT))) : null,
      summaryDigest: digest,
      complete: false,
      legacyRichDetailsOmitted: true
    };
  });
}

module.exports = {
  LIMITS,
  RECONSTRUCTION_WORK_LIMITS,
  MAX_TOTAL_RECONSTRUCTION_WORK,
  sha256,
  countState,
  assertStateCounts,
  assertReceiptBytes,
  serializeReceipt,
  readReceiptFile,
  writeReceiptAtomically,
  createWorkCounters,
  recordWork,
  validateClaimBindings,
  boundedRankingSnapshot,
  normalizeLegacyRankingSnapshots
};
