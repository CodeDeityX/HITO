'use strict';
const fs = require('node:fs');
const path = require('node:path');

function sourcePath(root, relative) { return path.join(root, ...relative.split('/')); }
function source(root, relative) { return fs.readFileSync(sourcePath(root, relative), 'utf8'); }
function evaluateCanonicalIntegration(root, contract) {
  const failures = [];
  const exists = p => fs.existsSync(sourcePath(root, p));
  const owners = contract?.architecture?.owners;
  if (!Array.isArray(owners)) return { pass:false, failures:['OWNERSHIP_CONTRACT_MISSING'] };
  const truthOwners = owners.filter(x => x.truthAuthority === true);
  if (truthOwners.length !== 1) failures.push('DUPLICATE_OR_MISSING_TRUTH_OWNER');
  for (const owner of owners) {
    if (!exists(owner.source)) failures.push(`OWNER_SOURCE_MISSING:${owner.id}`);
    if (owner.role === 'OBSERVATIONAL_STATE_OWNER' && (owner.truthAuthority !== false || owner.canonicalModelWriter !== false)) failures.push(`OBSERVATION_OWNER_ESCALATES:${owner.id}`);
    if (owner.role === 'OBSERVATIONAL_STATE_OWNER' && owner.canonicalModelReader !== true) failures.push(`OBSERVATION_OWNER_CANONICAL_INPUT_MISSING:${owner.id}`);
  }
  if (contract.architecture.model !== 'MULTIPLE_COORDINATED_OWNERS' || typeof contract.architecture.directionalContract !== 'string' || contract.architecture.directionalContract.length < 40) failures.push('DIRECTIONAL_STATE_CONTRACT_MISSING');
  const reachable = new Set(contract.runtimeEntrypoints ?? []);
  let changed = true;
  while (changed) {
    changed = false;
    for (const edge of contract.wiring ?? []) {
      if (!reachable.has(edge.from) || !exists(edge.from) || !exists(edge.to)) continue;
      const text = source(root, edge.from);
      if (!(edge.tokens ?? []).every(token => text.includes(token))) continue;
      if (!reachable.has(edge.to)) { reachable.add(edge.to); changed = true; }
    }
  }
  for (const edge of contract.wiring ?? []) {
    if (!exists(edge.from) || !exists(edge.to)) failures.push(`WIRING_SOURCE_MISSING:${edge.from}->${edge.to}`);
    else if (!(edge.tokens ?? []).every(token => source(root, edge.from).includes(token))) failures.push(`WIRING_EDGE_NOT_EXECUTABLE:${edge.from}->${edge.to}`);
  }
  for (const capability of contract.capabilities ?? []) {
    for (const role of ['implementation','runtime','persistence','currentness']) {
      const p = capability[role];
      if (typeof p !== 'string' || !exists(p)) failures.push(`CAPABILITY_${role.toUpperCase()}_MISSING:${capability.id}`);
      else if (!reachable.has(p)) failures.push(`CAPABILITY_UNREACHABLE:${capability.id}:${role}`);
    }
    if (/^(?:tests?|fixtures?)\//i.test(capability.implementation ?? '')) failures.push(`TEST_ONLY_IMPLEMENTATION:${capability.id}`);
    if (!exists(capability.witness) || !/^tests\//.test(capability.witness)) failures.push(`INTEGRATION_WITNESS_MISSING:${capability.id}`);
    for (const projection of capability.projections ?? []) if (!exists(projection) || !reachable.has(projection)) failures.push(`CAPABILITY_PROJECTION_UNREACHABLE:${capability.id}:${projection}`);
  }
  for (const projection of contract.projections ?? []) {
    if (!exists(projection.source) || !reachable.has(projection.source)) failures.push(`PROJECTION_UNREACHABLE:${projection.id}`);
    if (projection.derivedOnly !== true || projection.reconstructsSemanticTruth !== false) failures.push(`PROJECTION_OWNS_TRUTH:${projection.id}`);
    if (exists(projection.source)) for (const forbidden of projection.forbiddenSemanticImports ?? []) if (source(root, projection.source).includes(forbidden)) failures.push(`PROJECTION_SEMANTIC_RECONSTRUCTION:${projection.id}:${forbidden}`);
  }
  const witness = contract.integrationWitness;
  if (!witness || !exists(witness.source) || !/^tests\//.test(witness.source)) failures.push('RUNTIME_INTEGRATION_WITNESS_MISSING');
  else {
    const testSource = source(root, witness.source);
    for (const token of witness.requiredTokens ?? []) if (!testSource.includes(token)) failures.push(`WITNESS_DOES_NOT_EXERCISE_ENTRYPOINT:${token}`);
    if (testSource.includes(`implementation: '${witness.source}'`) || testSource.includes(`implementation: "${witness.source}"`)) failures.push('TEST_ONLY_ACCEPTED_IMPLEMENTATION');
  }
  const pkg = JSON.parse(source(root, 'package.json'));
  if (!pkg.scripts?.test?.includes('canonical-integration-release-gate.cjs')) failures.push('RELEASE_GATE_NOT_WIRED_TO_TEST');
  if (!pkg.scripts?.test?.includes('node tests/r10m-cb-tests.cjs') || !exists('tests/r10m-cb-tests.cjs')) failures.push('PACKAGED_BOOTSTRAP_PRODUCT_PATH_GATE_MISSING');
  if (!pkg.scripts?.test?.includes('node tests/r10o-tests.cjs') || !exists('tests/r10o-tests.cjs')) failures.push('R10O_PACKAGED_STRUCTURAL_PRODUCT_GATE_MISSING');
  if (!pkg.scripts?.test?.includes('node tests/r10o-e1-tests.cjs') || !exists('tests/r10o-e1-tests.cjs')) failures.push('R10O_E1_PACKAGED_ESM_GATE_MISSING');
  const capabilityIds = new Set((contract.capabilities ?? []).map(c => c.id));
  if (capabilityIds.size !== (contract.capabilities ?? []).length) failures.push('DUPLICATE_CAPABILITY_ID');
  return { pass:failures.length===0, failures, truthOwnerCount:truthOwners.length, reachableModules:[...reachable].sort(), capabilityCount:capabilityIds.size, stateArchitecture:contract.architecture.model };
}

if (require.main === module) {
  const root = path.resolve(__dirname, '..');
  const contract = JSON.parse(source(root, 'phase0/contracts/canonical-integration-contract.json'));
  const result = evaluateCanonicalIntegration(root, contract);
  const controlIds = ['CANONICAL_INTEGRATION_OWNER_CONTRACT','CANONICAL_MODEL_TO_OBSERVATION_DIRECTION','CANONICAL_CAPABILITY_REACHABILITY','CANONICAL_PERSISTENCE_ROUTE','CANONICAL_CURRENTNESS_ROUTE','CANONICAL_PROJECTION_DERIVED_ONLY','CANONICAL_RELEASE_GATE_WIRED'];
  process.stdout.write(JSON.stringify({ status:result.pass?'PASS':'FAIL', ...result, controlIds })+'\n');
  if (!result.pass) process.exitCode=1;
}

module.exports = { evaluateCanonicalIntegration };
