'use strict';
const assert=require('node:assert/strict');
const host=require('../phase0/hosts/shared/product-entry-host.cjs');
const provenance=require('../phase0/contracts/r2-provenance.cjs');

const base=(shape,claims)=>({subjectIdentity:`r9f-r9-${shape}`,semanticResultIdentity:`semantic-${shape}`,claims,coverage:{dimensions:{declaredIntent:'UNKNOWN',runtime:'UNKNOWN',ownership:'UNKNOWN',integration:'UNKNOWN'}},gaps:{declaredIntent:{state:'UNKNOWN'},runtime:{state:'UNKNOWN'}},nextStep:{code:'NO_JUSTIFIED_NEXT_STEP',reason:'mutation authority absent'},provenance:[]});
const claim=(key,value,authority,verification,path)=>({claimIdentity:`claim:${key}:${path}`,statement:{key,value},authority,verification,currentness:'CURRENT',scope:{subjectIdentity:'subject',path},evidenceIdentities:[`evidence:${path}`]});
const shapes={
 javascript:[claim('name','js-demo','STRUCTURAL_DECLARATION','STRUCTURALLY_SUPPORTED','package.json'),claim('version','1.0.0','STRUCTURAL_DECLARATION','STRUCTURALLY_SUPPORTED','package.json'),claim('modulePath','src/index.js','PHYSICAL_OBSERVATION','PHYSICALLY_OBSERVED','src/index.js'),claim('testDefinition','TEST_DEFINITION_AVAILABLE','PHYSICAL_OBSERVATION','PHYSICALLY_OBSERVED','tests/demo.js')],
 python:[claim('project.name','py-demo','PHYSICAL_OBSERVATION','PHYSICALLY_OBSERVED','pyproject.toml'),claim('project.description','Documentary purpose','DOCUMENTARY_EVIDENCE_ONLY','NOT_VERIFIED','pyproject.toml'),claim('project.requires-python','>=3.10','PHYSICAL_OBSERVATION','PHYSICALLY_OBSERVED','pyproject.toml'),claim('build-system.build-backend','hatchling.build','PHYSICAL_OBSERVATION','PHYSICALLY_OBSERVED','pyproject.toml'),claim('modulePath','pkg/core.py','PHYSICAL_OBSERVATION','PHYSICALLY_OBSERVED','pkg/core.py')],
 rust:[claim('name','rust-demo','STRUCTURAL_DECLARATION','STRUCTURALLY_SUPPORTED','Cargo.toml'),claim('modulePath','src/lib.rs','PHYSICAL_OBSERVATION','PHYSICALLY_OBSERVED','src/lib.rs'),claim('testDefinition','TEST_DEFINITION_AVAILABLE','PHYSICAL_OBSERVATION','PHYSICALLY_OBSERVED','tests/lib.rs')]
};
const tests=[];
for(const [shape,claims] of Object.entries(shapes)){
 const out=host.story(base(shape,claims),{status:{},next:{code:'NO_JUSTIFIED_NEXT_STEP',reason:'mutation authority absent'},why:{}});
 const o=out.projectOrientation;
 assert.ok(o.qualifiedFacts.length>0,`${shape}_qualified`);tests.push(`${shape}_qualified`);
 assert.notEqual(out.project.authority,'CANONICAL',`${shape}_no_authority_escalation`);tests.push(`${shape}_no_authority_escalation`);
 assert.equal(out.executionAuthority,false,`${shape}_execution_false`);tests.push(`${shape}_execution_false`);
 assert.equal(out.next.code,'NO_JUSTIFIED_NEXT_STEP',`${shape}_no_justified_next_step`);tests.push(`${shape}_no_justified_next_step`);
 assert.equal(o.qualifiedFacts.some(f=>f.authority==='DOCUMENTARY_EVIDENCE_ONLY'&&f.verification==='NOT_VERIFIED'),shape==='python',`${shape}_documentary_qualification`);tests.push(`${shape}_documentary_qualification`);
 assert.equal(o.qualifiedFacts.some(f=>f.key==='testDefinition'),['javascript','rust'].includes(shape),`${shape}_tests_only_when_observed`);tests.push(`${shape}_tests_only_when_observed`);
}
const doc=host.story(base('doc',[claim('project.description','purpose','DOCUMENTARY_EVIDENCE_ONLY','NOT_VERIFIED','README.md')]),{status:{},next:{code:'NO_JUSTIFIED_NEXT_STEP'},why:{}});
assert.notEqual(doc.project.authority,'CANONICAL');assert.equal(doc.projectOrientation.qualifiedFacts[0].authority,'DOCUMENTARY_EVIDENCE_ONLY');tests.push('documentary_does_not_become_intent');
assert.equal(doc.projectOrientation.qualifiedFacts[0].verification,'NOT_VERIFIED');tests.push('documentary_not_verified');
assert.equal(doc.projectOrientation.modules.length,0);tests.push('unobserved_modules_unavailable');
assert.equal(doc.projectOrientation.additionalFactsAvailable,false);tests.push('bounded_fact_count');
assert.equal(doc.executionAuthority,false);tests.push('protected_execution_false');
assert.equal(doc.semanticResultIdentity,'semantic-doc');tests.push('semantic_identity_preserved');
for(const shape of Object.keys(shapes))assert.ok(host.story(base(shape,shapes[shape]),{status:{},next:{code:'NO_JUSTIFIED_NEXT_STEP'},why:{}}).projectOrientation.qualifiedFacts.every(f=>f.claimIdentity),`${shape}_claim_provenance`),tests.push(`${shape}_claim_provenance`);
assert.equal(typeof provenance.validateReceipt,'function');tests.push('r8_validator_still_available');
console.log(JSON.stringify({status:'PASS',controls:tests.length,tests,shapes:Object.keys(shapes),authorityBound:true,executionAuthority:false,mutationAuthority:false}));
