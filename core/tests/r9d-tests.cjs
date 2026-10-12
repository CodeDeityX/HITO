'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const cp=require('node:child_process');
const entry=require('../phase0/cli/product-entry.cjs');
const adaptive=require('../phase0/cli/adaptive-discovery.cjs');
const r1=require('../phase0/cli/progressive-acquisition.cjs');
const fixture=path.join(__dirname,'fixtures','r10o-neutral-discovery');
function copyFixture(name){const root=fs.mkdtempSync(path.join(os.tmpdir(),`hito-r9d-${name}-`));fs.cpSync(fixture,root,{recursive:true});return root;}
function bare(name,readme='# bounded fixture\n'){const root=fs.mkdtempSync(path.join(os.tmpdir(),`hito-r9d-${name}-`));fs.writeFileSync(path.join(root,'README.md'),readme);return root;}
async function intake(root,options={}){await entry.execute('init',{explicit:'.',cwd:root});return entry.execute('intake',{explicit:'.',cwd:root,...options});}
function manifestPaths(result){return result.truth.artifacts.map(a=>a.path);}
(async()=>{
 const viselect=copyFixture('viselect');
 const vr=await intake(viselect);
 assert.equal(vr.truth.bootstrapAttempted,true);assert.equal(vr.truth.bootstrapAttemptCount,1);assert.equal(vr.truth.bootstrapReason,'POST_QUEUE_BOUNDED_RETRY');
 assert.ok(vr.truth.traversalHistory.some(h=>h.targetRelativePathOrModule==='.github/CONTRIBUTING.md'));
 assert.ok(manifestPaths(vr).includes('package.json'));assert.ok(manifestPaths(vr).includes('pnpm-workspace.yaml'));
 assert.equal(vr.truth.coverage.dimensions.projectMetadata.state,'PARTIALLY_OBSERVED');assert.equal(vr.truth.coverage.dimensions.workspace.state,'PARTIALLY_OBSERVED');
 assert.equal(vr.truth.stopReason,'STOP_QUEUE_EXHAUSTED_NO_ADDITIONAL_ADMISSIBLE_EVIDENCE');assert.equal(vr.truth.authorityBoundary.canonicalAuthority,false);
 assert.ok(vr.truth.costLedger.totalIntakeCost.filesExamined<vr.truth.acquisitionBudget.maxFilesRead);assert.ok(vr.truth.costLedger.totalIntakeCost.bytesExamined<vr.truth.acquisitionBudget.maxBytesRead);
 assert.equal(new Set(manifestPaths(vr)).size,manifestPaths(vr).length);
 const noLinks=bare('no-links');fs.writeFileSync(path.join(noLinks,'package.json'),'{}\n');fs.writeFileSync(path.join(noLinks,'pnpm-workspace.yaml'),'packages:\n  - packages/*\n');const ar=await intake(noLinks);assert.equal(ar.truth.bootstrapAttempted,true);assert.equal(ar.truth.bootstrapAttemptCount,1);assert.equal(ar.truth.bootstrapReason,'INITIAL_EMPTY_QUEUE');assert.ok(manifestPaths(ar).includes('package.json'));
 const useful=bare('useful','project: ./package.json\n');fs.writeFileSync(path.join(useful,'package.json'),'{}\n');const u=await intake(useful);assert.equal(u.truth.bootstrapAttemptCount,1);
 const budget=copyFixture('budget');const b=await intake(budget,{budget:{maxFilesRead:1,maxBytesRead:2097152,maxCandidatesPerSource:24,maxTraversedEdgesPerStage:32,maxTraversalDepth:4,maxElapsedMs:2000}});assert.equal(b.truth.bootstrapAttemptCount,0);assert.equal(b.truth.stopReason,'STOP_BUDGET_REACHED');
 const blocked=copyFixture('blocked');const blockedInit=await entry.execute('init',{explicit:'.',cwd:blocked});const blockedBase={artifacts:[r1.artifact(blocked,'README.md','architecture','DOCUMENTARY_EVIDENCE_ONLY',{state:'OBSERVED',content:fs.readFileSync(path.join(blocked,'README.md'),'utf8'),contentSha256:require('../phase0/contracts/product-entry-persistence.cjs').sha(fs.readFileSync(path.join(blocked,'README.md'))),bytes:fs.statSync(path.join(blocked,'README.md')).size})],history:[],cumulativeFiles:1,cumulativeBytes:fs.statSync(path.join(blocked,'README.md')).size};const bc=adaptive.run(blocked,blockedInit.truth.subjectIdentity,blockedBase,{bootstrap:true,blockingContradiction:true});assert.equal(bc.bootstrapAttemptCount,0);assert.equal(bc.stopReason,'STOP_BLOCKING_CONTRADICTION');
 const junction=bare('junction');const outside=fs.mkdtempSync(path.join(os.tmpdir(),'hito-r9d-outside-'));fs.mkdirSync(path.join(outside,'package.json'));const mk=cp.spawnSync('cmd.exe',['/d','/c','mklink','/J',path.join(junction,'package.json'),path.join(outside,'package.json')],{encoding:'utf8'});assert.equal(mk.status,0);const jr=await intake(junction);assert.equal(jr.truth.coverage.dimensions.projectMetadata.state,'UNAVAILABLE');assert.ok(!manifestPaths(jr).includes('package.json'));fs.rmSync(path.join(junction,'package.json'),{recursive:true,force:true});
 const duplicate=bare('duplicate','See [manifest](./package.json)\n');fs.writeFileSync(path.join(duplicate,'package.json'),'{}\n');const dr=await intake(duplicate);assert.equal(manifestPaths(dr).filter(p=>p==='package.json').length,1);assert.equal(dr.truth.bootstrapAttemptCount,1);
 const none=bare('none');const nr=await intake(none);assert.equal(nr.truth.bootstrapAttemptCount,1);assert.equal(nr.truth.bootstrapReason,'INITIAL_EMPTY_QUEUE');assert.ok(!manifestPaths(nr).includes('package.json'));
 const tests=['VISELECT_POST_QUEUE_RETRY','README_EDGE_TRAVERSED','BOOTSTRAP_ATTEMPT_AT_MOST_ONE','PACKAGE_JSON_QUALIFIED','PNPM_WORKSPACE_QUALIFIED','BUDGET_GOVERNS_RETRY','BLOCKING_CONTRADICTION_PREVENTS_RETRY','JUNCTION_BOOTSTRAP_FAIL_CLOSED','DUPLICATE_BOOTSTRAP_DEDUPLICATED','NO_ADMISSIBLE_BOOTSTRAP_TERMINATES','NO_FULL_TREE_SCAN','STOP_LABEL_TRUTHFUL'];
 console.log(JSON.stringify({status:'PASS',controls:tests.length,tests,viselect:{bootstrapAttempted:vr.truth.bootstrapAttempted,bootstrapAttemptCount:vr.truth.bootstrapAttemptCount,bootstrapReason:vr.truth.bootstrapReason,readmeEdgeTraversed:true,artifacts:manifestPaths(vr),projectMetadata:vr.truth.coverage.dimensions.projectMetadata.state,workspace:vr.truth.coverage.dimensions.workspace.state,architecture:vr.truth.coverage.dimensions.architecture.state,runtime:vr.truth.coverage.dimensions.runtime.state,tests:vr.truth.coverage.dimensions.tests.state,declaredIntent:vr.truth.coverage.dimensions.declaredIntent.state,drift:vr.truth.contradictions.assessment,next:vr.truth.nextStep.state,executionAuthority:vr.truth.acquisitionCapability.executionAuthority,filesExamined:vr.truth.costLedger.totalIntakeCost.filesExamined,bytesExamined:vr.truth.costLedger.totalIntakeCost.bytesExamined,budgetExhausted:vr.truth.stopReason==='STOP_BUDGET_REACHED'}}));
})().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
