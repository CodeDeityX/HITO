'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const policy = require('../phase0/contracts/r2-bounded-state.cjs');
const provenance = require('../phase0/contracts/r2-provenance.cjs');
const projection = require('../phase0/cli/bounded-projection.cjs');
const coordinates = require('../phase0/cli/four-coordinate-projection.cjs');
const { render } = require('../phase0/cli/human-output.cjs');

const ids = [
 'R10D_01_ONE_CANONICAL_TRUTH_TREE','R10D_02_TRUTH_REF_IS_SEMANTIC_IDENTITY','R10D_03_NO_EMBEDDED_SURFACE_TRUTH','R10D_04_NESTED_TRUTH_REPLACED_BY_REFERENCE','R10D_05_FOUR_COORDINATES_PRESENT','R10D_06_COORDINATES_DERIVED_NOT_CANONICAL','R10D_07_COORDINATE_PROJECTION_NO_EXECUTION_AUTHORITY','R10D_08_NO_INVENTED_NEXT_STEP_AUTHORITY',
 'R10D_09_RECEIPT_WRITER_SHARED_BYTE_CAP','R10D_10_RECEIPT_READER_SHARED_BYTE_CAP','R10D_11_WRITE_LIMIT_FAILS_BEFORE_STAGE','R10D_12_EXISTING_RECEIPT_BYTES_PRESERVED_ON_REJECT','R10D_13_VALID_WRITE_REOPENS_EXACT_BYTES','R10D_14_RECEIPT_JSON_HAS_ONE_TERMINATING_NEWLINE','R10D_15_STATE_ARTIFACT_COUNT_CAP','R10D_16_STATE_CLAIM_COUNT_CAP','R10D_17_DISCOVERED_EDGE_COUNT_CAP','R10D_18_DEFERRED_EDGE_COUNT_CAP','R10D_19_HISTORY_COUNT_CAP','R10D_20_REFERENCE_CLASSIFICATION_COUNT_CAP','R10D_21_QUEUE_SNAPSHOT_COUNT_CAP','R10D_22_TOTAL_RANKING_ENTRY_CAP','R10D_23_PER_SNAPSHOT_RANKING_CAP','R10D_24_RANKING_TRUNCATION_EXPLICIT','R10D_25_RANKING_OMISSION_DIGEST_DETERMINISTIC',
 'R10D_26_INDEXED_PROVENANCE_EQUIVALENT_TO_FILTER','R10D_27_LAST_HISTORY_BINDING_PRESERVED','R10D_28_LEGACY_MEMBERSHIP_INDEXED','R10D_29_CLAIM_VALIDATION_INDEXED','R10D_30_CLAIM_DUPLICATE_REJECTED','R10D_31_CLAIM_UNKNOWN_STATE_REJECTED','R10D_32_CLAIM_MISMATCH_REJECTED','R10D_33_RECONSTRUCTION_WORK_COUNTED','R10D_34_RECONSTRUCTION_WORK_LIMIT_FAILS_CLOSED','R10D_35_RECONSTRUCTION_WORK_TOTAL_BOUNDED','R10D_36_NEUTRAL_AMPLIFICATION_FIXTURE_EXCEEDS_R10C_COUNTS',
 'R10D_37_MACHINE_OUTPUT_DETERMINISTIC','R10D_38_MACHINE_OUTPUT_BYTE_CAP','R10D_39_MACHINE_OPTIONAL_DETAIL_OMISSION_MARKED','R10D_40_MACHINE_OMISSION_COUNT_AND_DIGEST','R10D_41_MACHINE_REQUIRED_TRUTH_RETAINED','R10D_42_MACHINE_TRUTH_REF_PARITY','R10D_43_HUMAN_OUTPUT_CAP_INHERITED','R10D_44_CONFLICT_STATE_NOT_PROMOTED','R10D_45_UNKNOWN_STATE_NOT_PROMOTED','R10D_46_STALE_STATE_NOT_PROMOTED','R10D_47_CLAIM_AUTHORITY_NOT_PROMOTED','R10D_48_ROOT_BINDING_NOT_INVENTED','R10D_49_NO_PROVIDER_OR_NETWORK_SURFACE','R10D_50_NO_TARGET_EXECUTION_AUTHORITY','R10D_51_NO_CANONICAL_WRITE_AUTHORITY'
];
const executed = new Set();
function control(id, fn) { fn(); executed.add(id); }
function failWith(errorCode, fn) { assert.throws(fn, new RegExp(errorCode)); }

const truth = {
  semanticResultIdentity: 'semantic:fixture-1', subjectIdentity: 'subject:synthetic', projectRoot: 'C:/fixture',
  unknowns: { declaredIntent: { state: 'UNKNOWN' }, runtime: { state: 'STALE' }, behavior: { state: 'CONFLICTED' }, currentness: { state: 'INDETERMINATE' } },
  coverage: { state: 'PARTIAL', dimensions: { declaredIntent: { state: 'UNKNOWN' }, runtime: { state: 'STALE' }, behavior: { state: 'CONFLICTED' }, currentness: { state: 'INDETERMINATE' } } },
  nextStep: { state: 'NO_JUSTIFIED_NEXT_STEP', executionAuthority: false },
  authorityBoundary: { executionAuthority: false, canonicalAuthority: false },
  freshness: { state: 'UNKNOWN' }, claims: [], provenance: [], queueRankingSnapshots: [], discoveredEdges: [],
  traversedEdges: [], deferredEdges: [], referenceClassifications: []
};
const rawResult = { truth, cli: { truth, why: { truth }, story: { truth } }, vscode: { truth }, agent: { truth, context: { truth } } };
const compact = projection.projectForMachine(rawResult);

control(ids[0], () => assert.equal(Object.keys(compact).filter(k => k === 'truth').length, 1));
control(ids[1], () => assert.equal(compact.cli.truthRef, truth.semanticResultIdentity));
control(ids[2], () => { for (const surface of [compact.cli, compact.vscode, compact.agent]) assert.equal(Object.hasOwn(surface, 'truth'), false); });
control(ids[3], () => assert.equal(compact.cli.why.truthRef, truth.semanticResultIdentity));
const four = coordinates.deriveFourCoordinates(truth);
control(ids[4], () => assert.deepEqual(Object.keys(four.coordinates), ['WHAT', 'HOW', 'RESULT', 'CONTINUITY']));
control(ids[5], () => assert.equal(four.canonical, false));
control(ids[6], () => assert.equal(four.authority.executionAuthority, false));
control(ids[7], () => assert.equal(truth.nextStep.executionAuthority, false));

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'hito-r10d-'));
try {
 const file = path.join(temp, 'receipt.json');
 const baseData = { artifacts: [], claims: [], discoveredEdges: [], deferredEdges: [], history: [], referenceClassifications: [], queueRankingSnapshots: [] };
 const envelope = { digest: 'fixture', data: baseData };
 const bytes = policy.serializeReceipt(envelope);
 control(ids[8], () => { const tooLarge = { digest: 'x', data: { ...baseData, oversized: 'x'.repeat(policy.LIMITS.MAX_RECEIPT_BYTES) } }; assert.equal(policy.assertReceiptBytes(bytes), Buffer.byteLength(bytes)); failWith('RECEIPT_BYTES_LIMIT', () => policy.writeReceiptAtomically(path.join(temp, 'rejected.json'), tooLarge)); assert.equal(fs.existsSync(path.join(temp, 'rejected.json.stage')), false); });
 control(ids[9], () => { fs.writeFileSync(file, Buffer.alloc(policy.LIMITS.MAX_RECEIPT_BYTES + 1)); failWith('RECEIPT_BYTES_LIMIT', () => policy.readReceiptFile(file)); });
 const original = Buffer.from('prior-receipt-bytes\n'); fs.writeFileSync(file, original);
 const overflow = { ...baseData, artifacts: Array(policy.LIMITS.MAX_ARTIFACTS + 1).fill({}) };
 control(ids[10], () => failWith('ARTIFACTS_LIMIT', () => policy.writeReceiptAtomically(file, { digest: 'bad', data: overflow })));
 control(ids[11], () => assert.deepEqual(fs.readFileSync(file), original));
 control(ids[12], () => { policy.writeReceiptAtomically(file, envelope); assert.equal(fs.readFileSync(file, 'utf8'), bytes); });
 control(ids[13], () => assert.equal(bytes.endsWith('\n') && !bytes.endsWith('\n\n'), true));

 const caps = [
  ['artifacts', policy.LIMITS.MAX_ARTIFACTS, 'ARTIFACTS_LIMIT', ids[14]], ['claims', policy.LIMITS.MAX_CLAIMS, 'CLAIMS_LIMIT', ids[15]],
  ['discoveredEdges', policy.LIMITS.MAX_DISCOVERED_EDGES, 'DISCOVERED_EDGES_LIMIT', ids[16]], ['deferredEdges', policy.LIMITS.MAX_DEFERRED_EDGES, 'DEFERRED_EDGES_LIMIT', ids[17]],
  ['history', policy.LIMITS.MAX_HISTORY_RECORDS, 'HISTORY_RECORDS_LIMIT', ids[18]], ['referenceClassifications', policy.LIMITS.MAX_REFERENCE_CLASSIFICATIONS, 'REFERENCE_CLASSIFICATIONS_LIMIT', ids[19]],
  ['queueRankingSnapshots', policy.LIMITS.MAX_QUEUE_SNAPSHOTS, 'QUEUE_SNAPSHOTS_LIMIT', ids[20]]
 ];
 for (const [key, limit, error, testId] of caps) control(testId, () => failWith(error, () => policy.assertStateCounts({ ...baseData, [key]: Array(limit + 1).fill({ ordering: [] }) })));
 const manyRows = Array.from({ length: policy.LIMITS.MAX_RANKING_ENTRIES_PER_SNAPSHOT + 1 }, (_, i) => ({ edgeIdentity: `edge:${i}`, priority: [i], currentlyAdmissibleSemanticDimensions: ['runtime'] }));
 control(ids[21], () => failWith('TOTAL_RANKING_ENTRIES_LIMIT', () => policy.assertStateCounts({ ...baseData, queueRankingSnapshots: [{ ordering: Array(policy.LIMITS.MAX_TOTAL_RANKING_ENTRIES + 1).fill({}) }] })));
 control(ids[22], () => failWith('RANKING_ENTRIES_PER_SNAPSHOT_LIMIT', () => policy.assertStateCounts({ ...baseData, queueRankingSnapshots: [{ ordering: manyRows }] })));
 const queue = manyRows.concat(manyRows);
 const summary = policy.boundedRankingSnapshot({ ordinal: 1, dimensionStates: { runtime: 'UNKNOWN' }, queue, totalEntryAllowance: 128 });
 control(ids[23], () => assert.equal(summary.complete, false));
 control(ids[24], () => assert.equal(summary.omittedEntriesDigest, policy.boundedRankingSnapshot({ ordinal: 1, dimensionStates: { runtime: 'UNKNOWN' }, queue, totalEntryAllowance: 128 }).omittedEntriesDigest));

 const hist = [{ resultingArtifactIdentity: 'a', edgeIdentity: 'first' }, { resultingArtifactIdentity: 'b' }, { resultingArtifactIdentity: 'a', edgeIdentity: 'last' }];
 const ix = provenance.createProvenanceIndexes(hist, ['a']);
 control(ids[25], () => assert.deepEqual(provenance.routeEvidence({ artifact: { artifactIdentity: 'a' }, history: hist, legacyIds: ['a'] }), provenance.routeEvidence({ artifact: { artifactIdentity: 'a' }, history: hist, legacyIds: ['a'], indexes: ix })));
 control(ids[26], () => assert.equal(ix.historyByArtifact.get('a').at(-1).edgeIdentity, 'last'));
 control(ids[27], () => assert.equal(ix.legacySet.has('a'), true));
 const expectedClaims = Array.from({ length: 768 }, (_, i) => ({ claimIdentity: `claim:${i}`, semanticDimension: 'runtime', authority: 'STRUCTURAL_DECLARATION', verification: 'OBSERVED', currentness: 'CURRENT' }));
 const currentClaims = expectedClaims.map(claim => ({ ...claim, currentness: 'CURRENT' }));
 const work = policy.createWorkCounters();
 control(ids[28], () => assert.equal(policy.validateClaimBindings(currentClaims, expectedClaims, work).expectedCount, 768));
 control(ids[29], () => failWith('CLAIM_BINDING_COUNT', () => policy.validateClaimBindings([...currentClaims, currentClaims[0]], expectedClaims)));
 control(ids[30], () => failWith('CLAIM_BINDING_STATE', () => policy.validateClaimBindings([{ ...currentClaims[0], currentness: 'FABRICATED' }, ...currentClaims.slice(1)], expectedClaims)));
 control(ids[31], () => failWith('CLAIM_BINDING_MISMATCH', () => policy.validateClaimBindings([{ ...currentClaims[0], authority: 'VERIFIED_RESULT' }, ...currentClaims.slice(1)], expectedClaims)));
 control(ids[32], () => assert.equal(work.CLAIM_BINDING_CHECKS, 768));
 control(ids[33], () => failWith('CLAIM_BINDING_CHECKS_LIMIT', () => { const w = policy.createWorkCounters(); policy.recordWork(w, 'CLAIM_BINDING_CHECKS', policy.RECONSTRUCTION_WORK_LIMITS.CLAIM_BINDING_CHECKS + 1); }));
 control(ids[34], () => assert.ok(work.TOTAL_WORK <= policy.MAX_TOTAL_RECONSTRUCTION_WORK));

 // Neutral amplification fixture exceeds prior small forensic fixture scale without project names or authority claims.
 const synthetic = { artifacts: Array(96).fill({}), claims: Array(768).fill({}), discoveredEdges: Array(2048).fill({}), deferredEdges: Array(1024).fill({}), history: Array(3072).fill({}), referenceClassifications: Array(2048).fill({}), queueRankingSnapshots: Array.from({ length: 32 }, () => ({ ordering: Array(256).fill({}) })) };
 control(ids[35], () => assert.deepEqual(policy.assertStateCounts(synthetic), { artifacts: 96, claims: 768, discoveredEdges: 2048, deferredEdges: 1024, history: 3072, referenceClassifications: 2048, queueRankingSnapshots: 32, totalRankingEntries: 8192 }));
} finally { fs.rmSync(temp, { recursive: true, force: true }); }

const amplified = { truth: { ...truth, discoveredEdges: Array.from({ length: 16 }, (_, i) => ({ i, payload: 'x'.repeat(350000) })) }, cli: { truth }, vscode: { truth }, agent: { truth } };
const machine1 = projection.serializeMachineProjection(amplified);
const machine2 = projection.serializeMachineProjection(amplified);
const parsed = JSON.parse(machine1);
control(ids[36], () => assert.equal(machine1, machine2));
control(ids[37], () => assert.ok(Buffer.byteLength(machine1) <= policy.LIMITS.MACHINE_PROJECTION_MAX_BYTES));
control(ids[38], () => assert.equal(parsed.projectionComplete, false));
control(ids[39], () => { assert.ok(parsed.omittedCounts.discoveredEdges > 0); assert.match(parsed.omittedDigests.discoveredEdges, /^[a-f0-9]{64}$/); });
control(ids[40], () => assert.equal(parsed.truth.semanticResultIdentity, truth.semanticResultIdentity));
control(ids[41], () => assert.equal(parsed.agent.truthRef, parsed.truth.semanticResultIdentity));
control(ids[42], () => { const human = render('status', { ...rawResult, binding: { activeRoot: truth.projectRoot }, cli: { ...rawResult.cli, status: { truthRef: truth.semanticResultIdentity } } }, 'TEXT'); assert.ok(Buffer.byteLength(human) <= 14336); });
control(ids[43], () => assert.equal(four.coordinates.RESULT.state, 'CONFLICTED'));
control(ids[44], () => assert.equal(four.coordinates.WHAT.state, 'UNKNOWN'));
control(ids[45], () => assert.equal(four.coordinates.HOW.state, 'STALE'));
control(ids[46], () => assert.equal(four.authority.ownsTruth, false));
control(ids[47], () => assert.equal(truth.projectRoot, 'C:/fixture'));
control(ids[48], () => assert.equal(Object.keys(policy).some(k => /provider|network/i.test(k)), false));
control(ids[49], () => assert.equal(four.authority.executionAuthority, false));
control(ids[50], () => assert.equal(four.authority.nextStepAuthority, false));

assert.equal(ids.length, 51);
assert.deepEqual([...executed].sort(), [...ids].sort());
console.log(JSON.stringify({ status: 'PASS', controls: executed.size, controlIds: [...executed], amplification: policy.countState(syntheticFixture()) }));

function syntheticFixture() { return { artifacts: Array(96).fill({}), claims: Array(768).fill({}), discoveredEdges: Array(2048).fill({}), deferredEdges: Array(1024).fill({}), history: Array(3072).fill({}), referenceClassifications: Array(2048).fill({}), queueRankingSnapshots: Array.from({ length: 32 }, () => ({ ordering: Array(256).fill({}) })) }; }
