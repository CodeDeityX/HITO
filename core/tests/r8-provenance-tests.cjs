'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const provenance = require('../phase0/contracts/r2-provenance.cjs');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hito-r8-provenance-'));
const subject = 'hito_project_synthetic';
const content = 'synthetic initial evidence\n';
const receipt = {
  kind: 'HITO_LOCAL_FIRST_OBSERVATION_RECEIPT_R1',
  root,
  request: { subjectIdentity: subject, documentaryEvidence: [{ provenance: { sourcePath: 'initial.txt', contentSha256: provenance.sha(Buffer.from(content)) }, content }] },
  acquisition: { scope: 'EXPLICIT_ROOT_README_ONLY' }
};
const artifact = {
  artifactIdentity: provenance.identity('artifact', [root, 'initial.txt', provenance.sha(Buffer.from(content))]),
  path: 'initial.txt',
  dimension: 'architecture',
  authority: 'DOCUMENTARY_EVIDENCE_ONLY',
  state: 'OBSERVED',
  content,
  contentSha256: provenance.sha(Buffer.from(content)),
  bytes: Buffer.byteLength(content),
  provenance: provenance.initialProvenance({ root, subject, receipt, artifact: { path: 'initial.txt', contentSha256: provenance.sha(Buffer.from(content)), dimension: 'architecture', authority: 'DOCUMENTARY_EVIDENCE_ONLY', artifactIdentity: provenance.identity('artifact', [root, 'initial.txt', provenance.sha(Buffer.from(content))]) } })
};
const data = { kind: 'HITO_ADAPTIVE_EVIDENCE_DISCOVERY_R2', root, subjectIdentity: subject, artifacts: [artifact], history: [], legacySeedIdentities: [] };
const durablePath = path.join(root, 'durable.json');
fs.writeFileSync(durablePath, JSON.stringify(data));
const durableBefore = fs.readFileSync(durablePath);
const cases = [
  ['01_UNBOUND_INITIAL_ARTIFACT', () => ({ ...artifact, provenance: null })],
  ['02_FORGED_ORIGINATING_RECEIPT_IDENTITY', () => ({ ...artifact, provenance: { ...artifact.provenance, originatingObservationReceiptIdentity: 'forged' } })],
  ['03_FORGED_RECEIPT_DIGEST', () => ({ ...artifact, provenance: { ...artifact.provenance, originatingObservationReceiptDigest: 'forged' } })],
  ['04_WRONG_PROJECT_ROOT', () => ({ ...artifact, provenance: { ...artifact.provenance, projectRootIdentity: 'forged' } })],
  ['05_WRONG_SUBJECT', () => ({ ...artifact, provenance: { ...artifact.provenance, subjectIdentity: 'forged' } })],
  ['06_PATH_ABSENT_FROM_INITIAL_ACQUISITION', () => ({ ...artifact, provenance: { ...artifact.provenance, sourcePath: 'other.txt' } })],
  ['07_CONTENT_HASH_MISMATCH', () => ({ ...artifact, contentSha256: 'forged', artifactIdentity: 'artifact:forged' })],
  ['08_ARTIFACT_IDENTITY_MISMATCH', () => ({ ...artifact, artifactIdentity: 'artifact:forged' })],
  ['09_DIMENSION_ESCALATION', () => ({ ...artifact, provenance: { ...artifact.provenance, semanticDimension: 'ownership' } })],
  ['10_AUTHORITY_ESCALATION', () => ({ ...artifact, provenance: { ...artifact.provenance, authority: 'CANONICAL' } })],
  ['11_TRAVERSAL_RELABELLED_INITIAL', () => ({ ...data, artifacts: [artifact], history: [{ resultingArtifactIdentity: artifact.artifactIdentity }], legacySeedIdentities: [] })],
  ['12_INITIAL_RELABELLED_TRAVERSAL', () => ({ ...artifact, provenance: { ...artifact.provenance, route: 'TRAVERSAL_BOUND' } })],
  ['13_FORGED_RESULTING_ARTIFACT_IDENTITY', () => ({ ...artifact, provenance: { ...artifact.provenance, artifactIdentity: 'artifact:forged' } })],
  ['14_DETACHED_CHILD_PROVENANCE', () => ({ ...artifact, path: 'child/file.txt', provenance: { ...artifact.provenance, sourcePath: 'child/file.txt' } })],
  ['15_PERSISTED_ARTIFACT_MUTATION', () => ({ ...artifact, content: 'mutated\n' })],
  ['16_PERSISTED_RECEIPT_DIGEST_MUTATION', () => ({ ...data, digest: 'forged' })],
  ['17_DUPLICATE_PROVENANCE_AMBIGUITY', () => ({ ...data, artifacts: [artifact, artifact] })],
  ['18_ROOT_ESCAPE', () => ({ ...artifact, path: '../escape.txt' })],
  ['19_SYMLINK_REPARSE_ESCAPE', () => ({ ...artifact, path: 'link/escape.txt' })],
  ['20_FAILED_SELF_REOPEN', () => ({ ...data, subjectIdentity: 'wrong-subject' })]
];
const results = [];
for (const [name, mutate] of cases) {
  let rejected = false;
  const before = fs.readFileSync(durablePath);
  try {
    const candidate = mutate();
    if (candidate.digest && candidate.digest !== provenance.identity('receipt', candidate.data ?? data)) throw new Error('R2_RECEIPT_DIGEST');
    provenance.validateReceipt({ root, subject, receipt, data: { ...data, ...candidate, artifacts: candidate.artifacts ?? [candidate] } });
  } catch { rejected = true; }
  assert.equal(rejected, true, name);
  assert.deepEqual(fs.readFileSync(durablePath), before, `${name}_MUTATED_DURABLE_STATE`);
  results.push({ name, rejected });
}
assert.deepEqual(fs.readFileSync(durablePath), durableBefore, 'DURABLE_STATE_CHANGED');
console.log(JSON.stringify({ status: 'PASS', controls: results.length, results, priorDurableStateByteIdenticalAfterFailure: true }));
