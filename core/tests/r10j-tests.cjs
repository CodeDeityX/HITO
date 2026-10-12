'use strict';
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { performance } = require('node:perf_hooks');
const acquisition = require('../phase0/cli/progressive-acquisition.cjs');
const adaptive = require('../phase0/cli/adaptive-discovery.cjs');
const physical = require('../phase0/cli/physical-currentness.cjs');
const store = require('../phase0/contracts/product-entry-persistence.cjs');
const boundedProjection = require('../phase0/cli/bounded-projection.cjs');
const human = require('../phase0/cli/human-output.cjs');
const host = require('../phase0/hosts/shared/product-entry-host.cjs');
const contradictionGate = require('../phase0/phase4/acquisition-contradiction-gate.cjs');

const ids = [
  'R10J_01_UNCHANGED_BINARY_BYTES',
  'R10J_02_UNCHANGED_INVALID_UTF8_BYTES',
  'R10J_03_BINARY_TO_NON_TEXT_SAME_IDENTITY',
  'R10J_04_TEXT_TO_NON_TEXT_SAME_IDENTITY',
  'R10J_05_NON_TEXT_TO_TEXT_SAME_IDENTITY',
  'R10J_06_SAME_PATH_CHANGED_BYTES',
  'R10J_07_SAME_LENGTH_CHANGED_HASH',
  'R10J_08_CHANGED_IDENTITY_SAME_CLASS',
  'R10J_09_CURRENT_IDENTITY_UNAVAILABLE',
  'R10J_10_PRIOR_IDENTITY_UNAVAILABLE',
  'R10J_11_MISSING_CURRENT_ARTIFACT_UNKNOWN',
  'R10J_12_STALE_PRIOR_IDENTITY_UNKNOWN',
  'R10J_13_DEPENDENT_FACT_RETAINED_ON_EQUAL_IDENTITY',
  'R10J_14_DEPENDENT_FACT_INVALIDATED_ON_CHANGED_IDENTITY',
  'R10J_15_FALSE_CONTRADICTION_ABSENT',
  'R10J_16_REAL_MUTATION_CONTRADICTION_RETAINED',
  'R10J_17_PERSISTENCE_REOPEN_PRESERVES_IDENTITY_CLASS',
  'R10J_18_PROVENANCE_PRESERVED',
  'R10J_19_MACHINE_PROJECTION_PRESERVES_IDENTITY_STATE',
  'R10J_20_HUMAN_PROJECTION_PRESERVES_IDENTITY_STATE',
  'R10J_21_BOUNDEDNESS_PRESERVED',
  'R10J_22_EXECUTION_AUTHORITY_FALSE',
  'R10J_23_ACCEPTED_INTENT_UNINFERRED',
  'R10J_24_RUNTIME_SUCCESS_UNINFERRED',
  'R10J_25_TEST_BUILD_SUCCESS_UNINFERRED',
  'R10J_26_RENAMED_PATH_CHANGES_IDENTITY',
  'R10J_27_BOUNDED_READER_RETAINS_INVALID_UTF8_IDENTITY',
  'R10J_28_QUALIFIED_FACT_PRESERVED_ON_EQUAL_IDENTITY',
  'R10J_29_QUALIFIED_FACT_INVALIDATED_ON_CHANGED_IDENTITY',
  'R10J_30_QUALIFIED_FACT_UNKNOWN_WITHOUT_COMPARABLE_IDENTITY',
  'R10J_31_ADAPTIVE_READER_RETAINS_INVALID_UTF8_IDENTITY'
];
const ran = new Set();
function control(id, fn) { fn(); ran.add(id); }
const sha = value => crypto.createHash('sha256').update(Buffer.from(value)).digest('hex');
function observation(pathValue, bytes, state) {
  const result = physical.observeBytes(Buffer.from(bytes), store.sha);
  return { path: pathValue, ...result, ...(state ? { state } : {}) };
}
function claim(pathValue) {
  return {
    claimIdentity: `claim:synthetic:${pathValue}`,
    semanticDimension: 'runtime',
    statement: { key: 'physicalArtifact', value: 'bounded physical support observed' },
    authority: 'PHYSICAL_OBSERVATION',
    verification: 'PHYSICALLY_OBSERVED',
    currentness: 'CURRENT',
    evidenceIdentities: ['evidence:synthetic:opaque'],
    artifactIdentities: ['artifact:synthetic:opaque'],
    contentIdentities: ['content:synthetic:opaque'],
    invalidationDependencies: [pathValue],
    scope: { subjectIdentity: 'subject:synthetic', path: pathValue },
    canonicalAuthority: false,
    mutationAuthority: false,
    executionAuthority: false
  };
}
function cacheFor(oldObservation, oldClaim = claim(oldObservation.path)) {
  return { artifacts: [{ ...oldObservation, artifactIdentity: 'artifact:synthetic:opaque', authority: 'PHYSICAL_OBSERVATION' }], claims: [oldClaim] };
}
function baseFor(root, refresh) {
  return {
    binding: { activeRoot: root },
    truth: {
      semanticResultIdentity: 'semantic:synthetic-base',
      subjectIdentity: 'subject:synthetic',
      projectRoot: root,
      nextStep: { state: 'NO_JUSTIFIED_NEXT_STEP', mutatingCommand: null, executionAuthority: false },
      coverage: { state: 'PARTIAL', completeUnderstanding: false, dimensions: {} },
      freshness: { state: 'UNKNOWN' },
      authorityBoundary: { canonicalAuthority: false, executionAuthority: false, acceptedIntentInferred: false, runtimeSuccessInferred: false, testSuccessInferred: false, buildSuccessInferred: false }
    },
    cli: { status: { purpose: 'UNKNOWN' }, next: { state: 'NO_JUSTIFIED_NEXT_STEP', executionAuthority: false }, why: {}, story: { physicallyObserved: { supportingRefresh: refresh } } },
    vscode: {},
    agent: {}
  };
}
function physicalRefresh(oldObservation, currentObservation) {
  return acquisition.refresh('C:/synthetic-root', cacheFor(oldObservation), (_root, _rel) => currentObservation);
}

(async () => {
  const binary = Buffer.from([0x00, 0x41, 0x7f]);
  const invalidUtf8 = Buffer.from([0xc3, 0x28]);
  const binaryObserved = { path: 'samples/opaque.dat', state: 'OBSERVED', content: binary.toString('utf8'), contentSha256: sha(binary), bytes: binary.length };
  const binaryCurrent = observation('samples/opaque.dat', binary);
  const invalidOld = { path: 'samples/invalid.dat', state: 'OBSERVED', contentSha256: sha(invalidUtf8), bytes: invalidUtf8.length };
  const invalidCurrent = observation('samples/invalid.dat', invalidUtf8);

  control(ids[0], () => assert.equal(physical.comparePhysicalIdentity(binaryObserved, binaryCurrent).state, 'UNCHANGED'));
  control(ids[1], () => { assert.equal(invalidCurrent.reason, 'NON_TEXT_OR_INVALID_UTF8'); assert.equal(physical.comparePhysicalIdentity(invalidOld, invalidCurrent).state, 'UNCHANGED'); });
  control(ids[2], () => assert.equal(physical.comparePhysicalIdentity(binaryObserved, { ...binaryCurrent, reason: 'NON_TEXT_OR_INVALID_UTF8' }).state, 'UNCHANGED'));
  control(ids[3], () => assert.equal(physical.comparePhysicalIdentity({ ...binaryObserved, state: 'OBSERVED', content: 'text projection' }, { ...binaryCurrent, state: 'UNAVAILABLE' }).state, 'UNCHANGED'));
  control(ids[4], () => assert.equal(physical.comparePhysicalIdentity({ ...binaryObserved, state: 'UNAVAILABLE' }, { ...binaryCurrent, state: 'OBSERVED' }).state, 'UNCHANGED'));
  control(ids[5], () => assert.equal(physical.comparePhysicalIdentity(binaryObserved, observation('samples/opaque.dat', Buffer.from([0x00, 0x42, 0x7f]))).state, 'CHANGED'));
  control(ids[6], () => assert.equal(physical.comparePhysicalIdentity(observation('same/path.bin', Buffer.from([0, 1])), observation('same/path.bin', Buffer.from([0, 2]))).reason, 'PHYSICAL_BYTE_IDENTITY_CHANGED'));
  control(ids[7], () => assert.equal(physical.comparePhysicalIdentity({ ...binaryObserved, state: 'OBSERVED' }, { ...observation('samples/opaque.dat', Buffer.from([0x00, 0x42, 0x7f])), state: 'OBSERVED' }).state, 'CHANGED'));
  control(ids[8], () => assert.equal(physical.comparePhysicalIdentity(binaryObserved, { path: binaryObserved.path, state: 'UNAVAILABLE', reason: 'ACQUISITION_LIMIT' }).state, 'UNKNOWN'));
  control(ids[9], () => assert.equal(physical.comparePhysicalIdentity({ path: 'samples/opaque.dat', state: 'OBSERVED' }, binaryCurrent).state, 'UNKNOWN'));
  control(ids[10], () => assert.equal(physical.comparePhysicalIdentity(binaryObserved, { path: binaryObserved.path, state: 'UNAVAILABLE', reason: 'NOT_FOUND_AT_CAPTURE' }).state, 'UNKNOWN'));
  control(ids[11], () => assert.equal(physical.comparePhysicalIdentity({ ...binaryObserved, currentness: 'STALE' }, binaryCurrent).state, 'UNKNOWN'));

  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hito-r10j-physical-'));
  try {
    const subject = 'subject:synthetic-r10j';
    const target = 'samples/opaque.dat';
    const targetPath = path.join(root, ...target.split('/'));
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, binary);
    const persistedPrior = { path: target, state: 'OBSERVED', content: binary.toString('utf8'), contentSha256: store.sha(binary), bytes: binary.length };
    const artifact = acquisition.artifact(root, target, 'runtime', 'PHYSICAL_OBSERVATION', persistedPrior);
    const claims = acquisition.claimsFor(artifact, subject);
    const persisted = {
      kind: 'HITO_PROGRESSIVE_ACQUISITION_R1', root, subjectIdentity: subject, stage: 'T2',
      artifacts: [artifact], claims, cumulativeFiles: 1, cumulativeBytes: binary.length, acquisitionCost: {}, stageMetrics: []
    };
    const maatRoot = store.paths(root).maatRoot;
    fs.mkdirSync(maatRoot, { recursive: true });
    const cacheFile = path.join(maatRoot, 'progressive-acquisition-t2-r1.json');
    const cacheId = value => `receipt:${store.sha(Buffer.from(JSON.stringify(value)))}`;
    fs.writeFileSync(cacheFile, JSON.stringify({ digest: cacheId(persisted), data: persisted }) + '\n', { flag: 'wx' });
    const reopened = acquisition.load(root, subject);
    const fresh = acquisition.refresh(root, reopened);

    control(ids[12], () => assert.equal(fresh.claims[0].currentness, 'CURRENT'));
    control(ids[13], () => {
      fs.writeFileSync(targetPath, Buffer.from([0x00, 0x42, 0x7f]));
      const changed = acquisition.refresh(root, reopened);
      assert.equal(changed.claims[0].currentness, 'STALE');
      assert.deepEqual(changed.changed, [target]);
    });
    control(ids[14], () => {
      const unchanged = acquisition.refresh(root, reopened, (_r, _p) => binaryCurrent);
      const gate = contradictionGate.assessAcquisitionContradictions(unchanged.claims, reopened.artifacts, null);
      assert.equal(gate.items.some(item => item.assessment === 'SUPPORT_IDENTITY_MISMATCH'), false);
    });
    control(ids[15], () => {
      const changed = acquisition.refresh(root, reopened);
      const gate = contradictionGate.assessAcquisitionContradictions(changed.claims, reopened.artifacts, null);
      assert.equal(gate.blocking, true);
      assert.equal(gate.items.some(item => item.assessment === 'SUPPORT_IDENTITY_MISMATCH'), true);
      assert.equal(gate.nextStep.executionAuthority, false);
    });
    control(ids[16], () => {
      const roundTrip = JSON.parse(JSON.stringify(reopened));
      const reloaded = acquisition.load(root, subject);
      const observed = acquisition.refresh(root, reloaded, (_r, _p) => binaryCurrent);
      assert.equal(roundTrip.artifacts[0].contentSha256, observed.observations[0].contentSha256);
      assert.equal(observed.observations[0].physicalIdentityState, 'UNCHANGED');
    });
    control(ids[17], () => {
      const refreshed = acquisition.refresh(root, reopened, (_r, _p) => binaryCurrent);
      assert.deepEqual(refreshed.claims[0].evidenceIdentities, claims[0].evidenceIdentities);
      assert.equal(refreshed.claims[0].authority, 'PHYSICAL_OBSERVATION');
      assert.equal(refreshed.claims[0].canonicalAuthority, false);
    });

    const equalFresh = acquisition.refresh(root, reopened, (_r, _p) => binaryCurrent);
    const equalOutput = acquisition.deepen(baseFor(root, equalFresh), reopened, equalFresh, 0);
    equalOutput.cli.story = host.story(equalOutput.truth, equalOutput.cli, null);
    control(ids[18], () => {
      const json = JSON.parse(boundedProjection.serializeMachineProjection(equalOutput));
      assert.equal(json.truth.refresh.observations[0].physicalIdentityState, 'UNCHANGED');
    });
    control(ids[19], () => assert.match(human.render('story', equalOutput, 'TEXT'), /PHYSICAL IDENTITY:.*samples\/opaque\.dat=UNCHANGED/));

    const largePath = path.join(root, 'large.bin');
    const largeBytes = Buffer.alloc(acquisition.LIMITS.fileBytes + 1, 0x61);
    fs.writeFileSync(largePath, largeBytes);
    const largeOld = { path: 'large.bin', state: 'OBSERVED', content: largeBytes.toString('utf8'), contentSha256: store.sha(largeBytes), bytes: largeBytes.length };
    const largeCache = { artifacts: [acquisition.artifact(root, 'large.bin', 'runtime', 'PHYSICAL_OBSERVATION', largeOld)], claims: acquisition.claimsFor(acquisition.artifact(root, 'large.bin', 'runtime', 'PHYSICAL_OBSERVATION', largeOld), subject) };
    const boundedRefresh = acquisition.refresh(root, largeCache);
    control(ids[20], () => { assert.deepEqual(boundedRefresh.uncertain, ['large.bin']); assert.equal(boundedRefresh.cost.files, 0); assert.equal(boundedRefresh.cost.bytes, 0); });

    const unknownFresh = acquisition.refresh(root, reopened, (_r, _p) => ({ path: target, state: 'UNAVAILABLE', reason: 'NOT_FOUND_AT_CAPTURE' }));
    const unknownOutput = acquisition.deepen(baseFor(root, unknownFresh), reopened, unknownFresh, 0);
    control(ids[21], () => {
      assert.equal(unknownOutput.truth.claims[0].currentness, 'UNKNOWN');
      assert.equal(unknownOutput.truth.nextStep.executionAuthority, false);
    });
    control(ids[22], () => assert.equal(unknownOutput.truth.claims.some(item => ['acceptedIntent', 'declaredIntent'].includes(item.statement?.key)), false));
    control(ids[23], () => assert.equal(unknownOutput.truth.claims.some(item => ['runtimeSuccess', 'runtimePass'].includes(item.statement?.key)), false));
    control(ids[24], () => {
      assert.equal(unknownOutput.truth.claims.some(item => ['testSuccess', 'testPass', 'buildSuccess', 'buildPass'].includes(item.statement?.key)), false);
      assert.equal(unknownOutput.truth.gaps.find(gap => gap.dimension === 'declaredIntent').state, 'UNAVAILABLE');
    });
    control(ids[25], () => assert.equal(physical.comparePhysicalIdentity(binaryObserved, { ...binaryCurrent, path: 'samples/renamed.dat' }).state, 'CHANGED'));
    control(ids[26], () => {
      const invalidPath = path.join(root, 'samples', 'invalid.dat');
      fs.writeFileSync(invalidPath, invalidUtf8);
      const actual = acquisition.readBounded(root, 'samples/invalid.dat', { files: 0, bytes: 0 });
      assert.equal(actual.state, 'UNAVAILABLE');
      assert.equal(actual.reason, 'NON_TEXT_OR_INVALID_UTF8');
      assert.equal(actual.bytes, invalidUtf8.length);
      assert.equal(actual.contentSha256, store.sha(invalidUtf8));
    });
    const readmeContent = '# Neutral Fixture\n\nThis is a synthetic project description.\n';
    const readmeObservation = { path: 'README.md', state: 'OBSERVED', content: readmeContent, contentSha256: store.sha(Buffer.from(readmeContent)), bytes: Buffer.byteLength(readmeContent) };
    const readmeArtifact = acquisition.artifact(root, 'README.md', 'architecture', 'DOCUMENTARY_EVIDENCE_ONLY', readmeObservation);
    const readmeClaims = acquisition.claimsFor(readmeArtifact, subject);
    const readmeCache = {
      kind: 'HITO_PROGRESSIVE_ACQUISITION_R1', root, subjectIdentity: subject, stage: 'T2',
      artifacts: [readmeArtifact], claims: readmeClaims, cumulativeFiles: 1, cumulativeBytes: readmeObservation.bytes,
      acquisitionCost: {}, stageMetrics: [], budget: {}, reconstructionWork: null,
      bootstrapAttempted: false, bootstrapAttemptCount: 0, bootstrapReason: null, acquisitionCapability: null,
      queueRankingSnapshots: [], dimensionsResolved: {}, discoveredEdges: [], traversedEdges: [], deferredEdges: [],
      deferredEdgeCount: 0, stopReason: 'NO_ADMISSIBLE_EDGE', materialSemanticGains: [], successfulDeepening: false,
      history: [], referenceClassifications: [], costLedger: {}
    };
    const projectedFor = current => {
      const freshRead = acquisition.refresh(root, readmeCache, (_r, _p) => current);
      return adaptive.project(baseFor(root, freshRead), readmeCache, freshRead);
    };
    control(ids[27], () => assert.ok(projectedFor({ path: 'README.md', state: 'UNAVAILABLE', reason: 'TEXT_UNAVAILABLE_FOR_PROJECTION', contentSha256: readmeObservation.contentSha256, bytes: readmeObservation.bytes }).truth.qualifiedSemanticFacts.facts.length > 0));
    control(ids[28], () => assert.equal(projectedFor({ path: 'README.md', state: 'OBSERVED', content: 'changed', contentSha256: store.sha(Buffer.from('changed')), bytes: 7 }).truth.qualifiedSemanticFacts.facts.length, 0));
    control(ids[29], () => assert.equal(projectedFor({ path: 'README.md', state: 'UNAVAILABLE', reason: 'NOT_FOUND_AT_CAPTURE' }).truth.qualifiedSemanticFacts.facts.length, 0));
    control(ids[30], () => {
      const run = { budget: { maxFilesRead: 4, maxBytesRead: 4096, maxElapsedMs: 1000 }, cost: { files: 0, bytes: 0 }, started: performance.now(), directoryDepth: 1 };
      const actual = adaptive.read(root, 'samples/invalid.dat', run);
      assert.equal(actual.state, 'UNAVAILABLE');
      assert.equal(actual.reason, 'NON_TEXT_OR_INVALID_UTF8');
      assert.equal(actual.contentSha256, store.sha(invalidUtf8));
      assert.equal(actual.bytes, invalidUtf8.length);
    });
    assert.equal(ran.size, 31);
    process.stdout.write(JSON.stringify({ status: 'PASS', controls: ran.size, controlIds: [...ran], syntheticFixtureOnly: true, hitoStateWrites: 1, targetMutations: 2, targetExecution: false, providerCalls: 0, networkCalls: 0 }) + '\n');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
