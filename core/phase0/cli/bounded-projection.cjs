'use strict';

const { LIMITS, sha256 } = require('../contracts/r2-bounded-state.cjs');

function referenceTree(value, truthRef, depth = 0) {
  if (depth > 32) return '[DEPTH_LIMIT]';
  if (Array.isArray(value)) return value.map(item => referenceTree(item, truthRef, depth + 1));
  if (!value || typeof value !== 'object') return value;
  const out = {};
  for (const [key, child] of Object.entries(value)) {
    if (key === 'truth') out.truthRef = truthRef;
    else if (key === 'truthRef') out.truthRef = truthRef;
    else out[key] = referenceTree(child, truthRef, depth + 1);
  }
  return out;
}

function projectForMachine(result) {
  const truth = result?.truth;
  if (!truth || typeof truth.semanticResultIdentity !== 'string') throw Error('R2_PROJECTION_TRUTH_REQUIRED');
  const truthRef = truth.semanticResultIdentity;
  const output = { ...result, truth: structuredClone(truth) };
  output.fourCoordinateProjection = require('./four-coordinate-projection.cjs').deriveFourCoordinates(truth);
  for (const key of ['cli', 'vscode', 'agent']) if (output[key]) output[key] = referenceTree(output[key], truthRef);
  if (output.cli) output.cli.truthRef = truthRef;
  if (output.vscode) output.vscode.truthRef = truthRef;
  if (output.agent) output.agent.truthRef = truthRef;
  return output;
}

function serializeMachineProjection(result) {
  const projection = projectForMachine(result);
  const optional = ['queueRankingSnapshots', 'discoveredEdges', 'traversedEdges', 'deferredEdges', 'referenceClassifications', 'bootstrapHistory', 'traversalHistory'];
  const encode = () => {
    delete projection.projectionDigest;
    projection.projectionDigest = sha256(JSON.stringify(projection));
    return JSON.stringify(projection, null, 2) + '\n';
  };
  projection.projectionComplete = true;
  let serialized = encode();
  if (Buffer.byteLength(serialized) > LIMITS.MACHINE_PROJECTION_MAX_BYTES) {
    const truth = projection.truth;
    projection.projectionComplete = false;
    projection.omittedSections = [];
    projection.omittedCounts = {};
    projection.omittedDigests = {};
    for (const key of optional) {
      if (!Array.isArray(truth[key])) continue;
      const value = truth[key];
      projection.omittedSections.push(key);
      projection.omittedCounts[key] = value.length;
      projection.omittedDigests[key] = sha256(JSON.stringify(value));
      truth[key] = [];
      serialized = encode();
      if (Buffer.byteLength(serialized) <= LIMITS.MACHINE_PROJECTION_MAX_BYTES) break;
    }
  }
  if (Buffer.byteLength(serialized) > LIMITS.MACHINE_PROJECTION_MAX_BYTES) throw Error('R2_MACHINE_PROJECTION_REQUIRED_TRUTH_LIMIT');
  return serialized;
}

module.exports = { projectForMachine, serializeMachineProjection };
