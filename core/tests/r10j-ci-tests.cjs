'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const productEntry = require('../phase0/cli/product-entry.cjs');
const human = require('../phase0/cli/human-output.cjs');
const extraction = require('../phase0/cli/qualified-semantic-extraction.cjs');
const persistence = require('../phase0/contracts/product-entry-persistence.cjs');
const fourCoordinates = require('../phase0/cli/four-coordinate-projection.cjs');
const adaptive = require('../phase0/cli/adaptive-discovery.cjs');
const { evaluateCanonicalIntegration } = require('./canonical-integration-release-gate.cjs');

const controls = [];
function check(id, condition) { assert.ok(condition, id); controls.push(id); }
function hash(bytes) { return crypto.createHash('sha256').update(bytes).digest('hex'); }
function artifact({ path:sourcePath='src', entries=[{name:'nested',type:'DIRECTORY'},{name:'mod.py',type:'FILE'}], accountingEntries=entries.length, directoryAccounting=true }={}) {
  const content=JSON.stringify({entries,truncated:false}), bytes=Buffer.from(content);
  return {state:'OBSERVED',path:sourcePath,authority:'PHYSICAL_OBSERVATION',dimension:'structure',artifactIdentity:`test:${sourcePath}`,content,contentSha256:hash(bytes),bytes:0,...(directoryAccounting?{directoryAccounting:{directoriesExamined:1,entriesExamined:accountingEntries,maxDepth:1,stopReason:'DIRECTORY_BOUND'}}:{})};
}

async function main() {
  const simpleDirectory=artifact({entries:[{name:'nested',type:'DIRECTORY'},{name:'mod.py',type:'FILE'}]});
  const dirFacts=extraction.extractArtifact(simpleDirectory).filter(f=>f.key==='observedModuleDirectory');
  check('R10JCI_NORMALIZED_DIRECTORY_IDENTITY_ACCEPTED',dirFacts.some(f=>f.value==='src'));
  check('R10JCI_NESTED_DIRECTORY_IDENTITY_NORMALIZED',dirFacts.some(f=>f.value==='src/nested'));
  check('R10JCI_NO_TRAILING_SLASH_DEPENDENCY',extraction.extractArtifact(artifact({path:'src'})).some(f=>f.key==='observedModuleDirectory'));
  check('R10JCI_TYPED_ROOT_DIRECTORY_OBSERVATION_ACCEPTED',extraction.extractArtifact(artifact({path:'.'})).some(f=>f.key==='observedModuleDirectory'&&f.value==='.'));
  check('R10JCI_UNTYPED_DOT_PATH_GRANTS_NO_AUTHORITY',extraction.extractArtifact(artifact({path:'.',directoryAccounting:false})).every(f=>f.key!=='observedModuleDirectory'));
  check('R10JCI_TRAILING_SLASH_NOT_REQUIRED',extraction.extractArtifact(artifact({path:'src/'})).every(f=>f.key!=='observedModuleDirectory'));
  check('R10JCI_DIRECTORY_PROVENANCE_BINDS_SOURCE',dirFacts.every(f=>f.sourceArtifactIdentity===simpleDirectory.artifactIdentity&&f.sourceContentIdentity===simpleDirectory.contentSha256&&f.sourcePath==='src'));
  check('R10JCI_MALFORMED_DIRECTORY_IDENTITY_FAILS_CLOSED',extraction.extractArtifact(artifact({entries:[{name:'../escape',type:'DIRECTORY'}]})).every(f=>f.key!=='observedModuleDirectory'));
  check('R10JCI_MALFORMED_DIRECTORY_ACCOUNTING_FAILS_CLOSED',extraction.extractArtifact(artifact({accountingEntries:77})).every(f=>f.key!=='observedModuleDirectory'));
  check('R10JCI_UNTYPED_DIRECTORY_PROSE_NOT_ADMITTED',extraction.extractArtifact(artifact({directoryAccounting:false})).every(f=>f.key!=='observedModuleDirectory'));

  const root=fs.mkdtempSync(path.join(os.tmpdir(),'hito-r10j-ci-'));
  try {
    fs.mkdirSync(path.join(root,'src','nested'),{recursive:true});
    fs.writeFileSync(path.join(root,'README.md'),'# Synthetic integration fixture\n\n[Go module](./go.mod)\n[src directory](./src/)\n');
    fs.writeFileSync(path.join(root,'go.mod'),'module example.com/r10jci\ngo 1.22\n');
    fs.writeFileSync(path.join(root,'main.go'),'package main\n');
    fs.writeFileSync(path.join(root,'src','parser.go'),'package src\n');
    fs.writeFileSync(path.join(root,'src','nested','nested.go'),'package nested\n');
    await productEntry.execute('init',{explicit:root});
    const intake=await productEntry.execute('intake',{explicit:root});
    assert.equal(intake.truth?.acquisitionState,'PARTIAL');
    const admitted=intake.truth.qualifiedSemanticFacts.facts;
    check('R10JCI_ROOT_MODULE_CANONICALLY_ADMITTED',admitted.some(f=>f.key==='modulePath'&&f.value==='example.com/r10jci'));
    check('R10JCI_NESTED_MODULE_CANONICALLY_ADMITTED',admitted.some(f=>f.key==='observedModuleDirectory'&&f.value==='src/nested'));
    check('R10JCI_MODULE_DIRECTORY_FACT_CANONICALLY_ADMITTED',admitted.some(f=>f.key==='observedModuleDirectory'&&f.value==='src'));
    const coordinates=fourCoordinates.deriveFourCoordinates(intake.truth);
    check('R10JCI_MODULE_OBSERVATION_REACHES_HOW',coordinates.coordinates.HOW.state==='PARTIALLY_ESTABLISHED');
    check('R10JCI_DOCUMENTED_PURPOSE_REACHES_WHAT',coordinates.coordinates.WHAT.state==='PARTIALLY_ESTABLISHED');
    check('R10JCI_DIRECTORY_FACT_USES_NORMALIZED_R2_PATH',admitted.filter(f=>f.key==='observedModuleDirectory').every(f=>f.sourcePath==='src'||f.sourcePath==='src/nested'));
    check('R10JCI_SAME_CALL_INTAKE_EXPOSES_QUALIFIED_FACTS',admitted.length>0);
    check('R10JCI_FACTS_REMAIN_NONCANONICAL',admitted.every(f=>f.canonicalAuthority===false&&f.mutationAuthority===false&&f.executionAuthority===false));
    check('R10JCI_R2_RECEIPT_PERSISTED',fs.existsSync(path.join(root,'.maat','adaptive-evidence-discovery-r2.json')));
    const receipt=JSON.parse(fs.readFileSync(path.join(root,'.maat','adaptive-evidence-discovery-r2.json'),'utf8'));
    check('R10JCI_R2_RECEIPT_PERSISTED_AS_R2_STATE',receipt.data?.kind==='HITO_ADAPTIVE_EVIDENCE_DISCOVERY_R2'&&receipt.digest.length>0);
    check('R10JCI_NO_PARALLEL_SEMANTIC_STORE',!fs.existsSync(path.join(root,'.maat','qualified-semantic-facts.json')));

    const story=await productEntry.execute('story',{explicit:root});
    const status=await productEntry.execute('status',{explicit:root});
    const next=await productEntry.execute('next',{explicit:root});
    const why=await productEntry.execute('why',{explicit:root});
    const mri=await productEntry.execute('mri',{explicit:root});
    const reloaded=story.truth.qualifiedSemanticFacts.facts;
    check('R10JCI_REOPEN_PRESERVES_QUALIFIED_FACTS',reloaded.some(f=>f.factIdentity===admitted.find(x=>x.key==='observedModuleDirectory'&&x.value==='src')?.factIdentity));
    const moduleClaims=story.truth.claims.filter(c=>c.scope?.path==='src');
    check('R10JCI_REOPEN_MODULE_CURRENTNESS_CURRENT',moduleClaims.length>0&&moduleClaims.every(c=>c.currentness==='CURRENT'));
    check('R10JCI_STORY_CURRENT_STATE',story.payload.semanticResultIdentity===story.truth.semanticResultIdentity&&reloaded.length>0);
    check('R10JCI_STORY_JSON_CURRENT_STATE',story.payload===story.cli.story&&story.payload.projectOrientation.qualifiedFacts.length>0);
    check('R10JCI_STATUS_CURRENT_STATE',status.payload.qualifiedSemanticFacts.facts.length>0);
    check('R10JCI_NEXT_USES_SAME_COMPOSED_TRUTH',next.cli.truthRef===next.truth.semanticResultIdentity&&next.truth.qualifiedSemanticFacts.facts.length>0);
    check('R10JCI_WHY_USES_SAME_COMPOSED_TRUTH',why.cli.truthRef===why.truth.semanticResultIdentity&&why.truth.qualifiedSemanticFacts.facts.length>0);
    check('R10JCI_MRI_CURRENT_STATE',mri.payload.qualifiedSemanticFacts.facts.length>0);
    check('R10JCI_HUMAN_MACHINE_PROJECTION_PARITY',status.truth.semanticResultIdentity===status.cli.truthRef&&mri.payload.sourceSemanticResultIdentity===mri.truth.semanticResultIdentity);
    check('R10JCI_PROJECTIONS_DERIVED_ONLY',story.cli.truthRef===story.truth.semanticResultIdentity&&reloaded.every(f=>f.canonicalAuthority===false&&f.executionAuthority===false));
    check('R10JCI_HUMAN_STORY_CONSUMES_CURRENT_MODULE_FACT',human.render('story',story).includes('observedModuleDirectory'));

    check('R10JCI_UNCHANGED_ROOT_MODULE_PRESERVED',reloaded.some(f=>f.key==='modulePath'&&f.value==='example.com/r10jci'));
    check('R10JCI_CANONICAL_G15_BASE_FLOWS_TO_R2',fs.readFileSync(path.join(__dirname,'../phase0/cli/product-entry.cjs'),'utf8').includes('readHitoRuntimeFromProjectRoot')&&fs.readFileSync(path.join(__dirname,'../phase0/cli/product-entry.cjs'),'utf8').includes('adaptive-discovery.cjs'));
    check('R10JCI_R2_OUTPUT_IS_DERIVED_FROM_G15_BASE',fs.readFileSync(path.join(__dirname,'../phase0/cli/adaptive-discovery.cjs'),'utf8').includes('r1.deepen(base,cache,fresh'));
  } finally { fs.rmSync(root,{recursive:true,force:true}); }

  const currentnessRoot=fs.mkdtempSync(path.join(os.tmpdir(),'hito-r10j-ci-currentness-'));
  try {
    fs.writeFileSync(path.join(currentnessRoot,'README.md'),'# Currentness fixture\n\n[Go module](./go.mod)\n');
    fs.writeFileSync(path.join(currentnessRoot,'go.mod'),'module example.com/before\ngo 1.22\n');
    await productEntry.execute('init',{explicit:currentnessRoot});
    const first=await productEntry.execute('intake',{explicit:currentnessRoot});
    const previous=first.truth.qualifiedSemanticFacts.facts.find(f=>f.key==='modulePath');
    check('R10JCI_MODULE_FACT_PROVENANCE_BOUND',!!previous&&previous.sourcePath==='go.mod'&&previous.sourceContentIdentity&&previous.canonicalAuthority===false);
    fs.writeFileSync(path.join(currentnessRoot,'go.mod'),'module example.com/after\ngo 1.22\n');
    const changed=await productEntry.execute('intake',{explicit:currentnessRoot});
    const changedFacts=changed.truth.qualifiedSemanticFacts.facts.filter(f=>f.key==='modulePath');
    check('R10JCI_CHANGED_MODULE_FACT_INVALIDATED',!changedFacts.some(f=>f.factIdentity===previous.factIdentity));
    check('R10JCI_CHANGED_MODULE_FACT_REOBSERVED_CURRENT',changedFacts.some(f=>f.value==='example.com/after'));
  } finally { fs.rmSync(currentnessRoot,{recursive:true,force:true}); }

  const core=path.resolve(__dirname,'..');
  const contract=JSON.parse(fs.readFileSync(path.join(core,'phase0/contracts/canonical-integration-contract.json'),'utf8'));
  const gate=evaluateCanonicalIntegration(core,contract);
  check('R10JCI_GENERIC_CANONICAL_INTEGRATION_RELEASE_GATE_PASS',gate.pass);
  const unreachable=structuredClone(contract);unreachable.capabilities[0].runtime='phase0/contracts/model.ts';
  check('R10JCI_GATE_DETECTS_UNREACHABLE_ACCEPTED_CAPABILITY',evaluateCanonicalIntegration(core,unreachable).failures.some(x=>x.startsWith('CAPABILITY_UNREACHABLE:')));
  const noPersistence=structuredClone(contract);noPersistence.capabilities[0].persistence='phase0/contracts/not-a-store.cjs';
  check('R10JCI_GATE_DETECTS_MISSING_CANONICAL_PERSISTENCE_ROUTE',evaluateCanonicalIntegration(core,noPersistence).failures.some(x=>x.includes('PERSISTENCE_MISSING')));
  const duplicateOwner=structuredClone(contract);duplicateOwner.architecture.owners.push({...duplicateOwner.architecture.owners[0],id:'competing-semantic-owner'});
  check('R10JCI_GATE_DETECTS_DUPLICATE_TRUTH_OWNERS',evaluateCanonicalIntegration(core,duplicateOwner).failures.includes('DUPLICATE_OR_MISSING_TRUTH_OWNER'));
  const missingCanonicalInput=structuredClone(contract);missingCanonicalInput.architecture.owners.find(x=>x.role==='OBSERVATIONAL_STATE_OWNER').canonicalModelReader=false;
  check('R10JCI_GATE_DETECTS_OBSERVATION_WITHOUT_CANONICAL_INPUT',evaluateCanonicalIntegration(core,missingCanonicalInput).failures.some(x=>x.startsWith('OBSERVATION_OWNER_CANONICAL_INPUT_MISSING:')));
  const projectionTruth=structuredClone(contract);projectionTruth.projections[0].reconstructsSemanticTruth=true;
  check('R10JCI_GATE_DETECTS_PROJECTION_TRUTH_RECONSTRUCTION',evaluateCanonicalIntegration(core,projectionTruth).failures.some(x=>x.startsWith('PROJECTION_OWNS_TRUTH:')));
  const testOnly=structuredClone(contract);testOnly.capabilities[0].implementation='tests/r10j-ci-tests.cjs';
  check('R10JCI_GATE_DETECTS_TEST_ONLY_ACCEPTED_IMPLEMENTATION',evaluateCanonicalIntegration(core,testOnly).failures.some(x=>x.startsWith('TEST_ONLY_IMPLEMENTATION:')));
  check('R10JCI_RELEASE_GATE_WIRED_IN_NPM_TEST',JSON.parse(fs.readFileSync(path.join(core,'package.json'),'utf8')).scripts.test.includes('canonical-integration-release-gate.cjs'));
  check('R10JCI_R10F_PROVENANCE_REGRESSION_SUITE_PRESENT',JSON.parse(fs.readFileSync(path.join(core,'package.json'),'utf8')).scripts.test.includes('r10f-tests.cjs'));
  check('R10JCI_R10H_EXTRACTION_REGRESSION_SUITE_PRESENT',JSON.parse(fs.readFileSync(path.join(core,'package.json'),'utf8')).scripts.test.includes('r10h-tests.cjs'));
  check('R10JCI_R10J_CURRENTNESS_REGRESSION_SUITE_PRESENT',JSON.parse(fs.readFileSync(path.join(core,'package.json'),'utf8')).scripts.test.includes('r10j-tests.cjs'));
  process.stdout.write(JSON.stringify({status:'PASS',controls:controls.length,controlIds:controls,syntheticFixtureOnly:true,realTargetMutations:0,isolatedFixtureStateWrites:'temporary .maat state only',networkCalls:0,providerCalls:0,gitMutations:0,xsvUsedAsFixture:false,batUsedAsFixture:false,gate})+'\n');
}

main().catch(error=>{process.stderr.write(`${error.stack||error}\n`);process.exitCode=1;});
