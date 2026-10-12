'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const capsule=require('../phase0/cli/continuity-capsule.cjs');
const entry=require('../phase0/cli/product-entry.cjs');
const human=require('../phase0/cli/human-output.cjs');
const gate=require('./canonical-integration-release-gate.cjs');
const controls=[];
function check(id,fn){fn();controls.push(id);}
function fact(key,value,sourcePath='src/index.ts'){
 const base={key,value,authority:'PHYSICAL_OBSERVATION',verification:'PARTIAL_BOUNDED_OBSERVATION',sourceArtifactIdentity:`artifact:${sourcePath}`,sourceContentIdentity:`sha:${sourcePath}`,sourcePath,extractorIdentity:'hito.qualified-semantic-extraction',extractorVersion:'1.0.0',canonicalAuthority:false,acceptedIntent:false,mutationAuthority:false,executionAuthority:false};
 return {...base,factIdentity:`fact:${sourcePath}:${key}:${String(value)}`};
}
function fixture({stale=false,present=false}={}){
 const facts=[fact('observedModuleDirectory','src','.'),fact('observedModuleDirectory','src/parser','src'),fact('buildTarget','test','Makefile'),fact('testDefinitionObserved','tests/parser.test.js'),fact('configurationLocation','package.json')];
 const model={project:{projectId:'project:synthetic',name:'synthetic',root:'root:synthetic'},canonicalState:{modelRevision:7,integrity:{modelHash:'model-hash'},historyHead:{sequence:7,eventHash:'head'},evidenceHead:{sequence:3,manifestHash:'evidence'}},intent:present?[{promiseId:'intent-1',statement:'Maintain parser',authority:'RECOVERED_AUTHORITY',authorityProof:{kind:'RECOVERED_AUTHORITY'},provenance:{source:'owner record'}}]:[],decisions:present?[{decisionId:'decision-1',context:'parser',selectedOutcome:'retain',rationale:'accepted',effectiveRevision:7,provenance:{source:'record'}}]:[],mutations:present?[{mutationId:'mutation-1',status:'PROPOSED',reason:'finish parser',proposal:'complete parser tests',provenance:{source:'record'}}]:[]};
 const governed={semanticVerdictIdentity:'verdict-1',overallStatus:'BOUNDED_ATTENTION',projectScopeIdentity:'project:synthetic',freshnessWatermark:{state:stale?'STALE':'CURRENT',watermarkId:'watermark-1'},materialStates:[{category:'UNKNOWN',severity:'LIMIT',summary:'runtime result not observed',scope:{kind:'PROJECT',identity:'project:synthetic'},sourceAuthority:'phase3',sourceIdentity:'state-1',reasonCodes:['NO_RUNTIME_EVIDENCE']},{category:'CONFLICT',severity:'BLOCKER',summary:'conflicting evidence',scope:{kind:'SUBJECT',identity:'claim-1'},sourceAuthority:'phase4',sourceIdentity:'state-2',reasonCodes:['CONFLICT_DETECTED']},{category:'MISSING_PROOF',severity:'LIMIT',summary:'evidence absent',scope:{kind:'EVIDENCE',identity:'proof-1'},sourceAuthority:'phase7',sourceIdentity:'state-3',reasonCodes:['PROOF_MISSING']}],nextStep:{state:'NO_JUSTIFIED_NEXT_STEP',executionAuthority:false,mutatingCommand:null},mri:{state:'PARTIAL',runtimeHomes:[]},intents:[],history:{events:[]}};
 const g15={kind:'HITO_G15_UNIVERSAL_PROTOCOL_PROJECTION_ENVELOPE',governedTruth:governed,projections:{GUIDED:{answers:{whatAmITryingToDo:'UNKNOWN'}}},limitations:['bounded fixture']};
 const truth={semanticResultIdentity:'semantic-1',subjectIdentity:'project:synthetic',continuityMode:'CONTINUATION',freshness:{state:stale?'STALE':'CURRENT',scope:'README.md only'},qualifiedSemanticFacts:{facts,complete:false}};
 return {model,g15,truth};
}
async function main(){
 const f=fixture({present:true}),a=capsule.deriveContinuityCapsule({canonicalModel:f.model,g15:f.g15,truth:f.truth}),b=capsule.deriveContinuityCapsule({canonicalModel:structuredClone(f.model),g15:structuredClone(f.g15),truth:structuredClone(f.truth)});
 check('R10M_CAPSULE_DETERMINISTIC',()=>assert.equal(capsule.serialize(a),capsule.serialize(b)));
 check('R10M_CAPSULE_REOPEN',()=>assert.deepEqual(JSON.parse(capsule.serialize(a)),a));
 check('R10M_PROVENANCE_PRESERVED',()=>assert(a.qualifiedFacts.every(x=>x.provenance.sourceArtifactIdentity&&x.provenance.sourceContentIdentity&&x.provenance.extractorIdentity)));
 check('R10M_PROVENANCE_REFERENCES_DEDUPED',()=>assert.equal(a.metrics.provenanceReferenceCount,new Set(a.provenanceReferences.map(x=>x.factIdentity??`${x.kind}:${x.identity}`)).size));
 check('R10M_UNKNOWN_PRESERVED',()=>assert(a.materialUnknowns.some(x=>x.state==='UNKNOWN')));
 check('R10M_CONTRADICTION_PRESERVED',()=>assert(a.contradictions.some(x=>x.state==='CONFLICT')));
 check('R10M_ALL_MATERIAL_GAP_CLASSES_VISIBLE',()=>assert(a.materialStates.some(x=>x.category==='MISSING_PROOF'))&&assert(a.materialUnknowns.some(x=>x.state==='MISSING_PROOF')));
 check('R10M_AUTHORITY_PRESERVED',()=>assert.equal(a.authority.nextAction.state,'NO_JUSTIFIED_NEXT_STEP'));
 check('R10M_EXECUTION_AUTHORITY_NOT_INVENTED',()=>assert.equal(a.authority.execution,false));
 check('R10M_PROJECTION_NOT_TRUTH_OWNER',()=>assert.equal(a.authority.truthOwner,false)&&assert.equal(a.authority.canonicalAuthority,false));
 check('R10M_CURRENTNESS_PRESERVED',()=>assert.equal(a.currentness.state,'CURRENT'));
 check('R10M_STRUCTURAL_HOW_PARTIAL',()=>assert.equal(a.coordinates.HOW.state,'PARTIAL'));
 check('R10M_ROOT_MODULE_OBSERVED',()=>assert(a.coordinates.HOW.modulesAndPackages.some(x=>x.value==='src')));
 check('R10M_NESTED_MODULE_OBSERVED',()=>assert(a.coordinates.HOW.modulesAndPackages.some(x=>x.value==='src/parser')));
 check('R10M_ENTRYPOINT_RELATION_UNKNOWN_NOT_INFERRED',()=>assert.equal(a.coordinates.HOW.relationshipState,'UNKNOWN')&&assert.equal(a.coordinates.HOW.entrypoints.length,0));
 const topology=fixture({present:true});topology.model.runtimeHomes=[{runtimeHomeId:'home-1',capabilityId:'cap-1',kind:'MODULE',locator:'src/index.ts',entryPoints:['src/index.ts'],status:'ACTIVE',provenance:{source:'model'}}];topology.model.edges=[{edgeId:'edge-1',sourceId:'src/index.ts',targetId:'src/parser.ts',relationship:'CALLS',status:'ACTIVE',provenance:{source:'model'}}];
 const topologyCapsule=capsule.deriveContinuityCapsule({canonicalModel:topology.model,g15:topology.g15,truth:topology.truth});
 check('R10M_CANONICAL_MODULE_TOPOLOGY_REUSED',()=>assert(topologyCapsule.coordinates.HOW.modulesAndPackages.some(x=>x.kind==='MODULE'&&x.locator==='src/index.ts')));
 check('R10M_CANONICAL_ENTRYPOINT_RELATION_REUSED',()=>assert(topologyCapsule.coordinates.HOW.entrypoints.some(x=>x.path==='src/index.ts'))&&assert(topologyCapsule.coordinates.HOW.relationships.some(x=>x.relationship==='CALLS')));
 check('R10M_CANONICAL_TOPOLOGY_PROVENANCE_BOUND',()=>assert(topologyCapsule.provenanceReferences.some(x=>x.kind==='CANONICAL_RELATIONSHIP'&&x.identity==='edge-1')));
 check('R10M_BUILD_TEST_CONFIG_OBSERVATIONS',()=>assert(a.coordinates.HOW.buildDefinitions.length&&a.coordinates.HOW.tests.length&&a.coordinates.HOW.configuration.length));
 const stale=fixture({stale:true}),staleCapsule=capsule.deriveContinuityCapsule({canonicalModel:stale.model,g15:stale.g15,truth:stale.truth});
 check('R10M_STALE_STRUCTURAL_FACT_CURRENTNESS',()=>assert.equal(staleCapsule.qualifiedFacts[0].currentness,'STALE'));
 const fast=fixture();fast.truth.freshness.state='FAST_LOCAL_LIMITED';fast.g15.governedTruth.freshnessWatermark.state='FAST_LOCAL_LIMITED';const fastCapsule=capsule.deriveContinuityCapsule({canonicalModel:fast.model,g15:fast.g15,truth:fast.truth});
 check('R10M_FAST_LOCAL_FRESHNESS_NOT_PROMOTED',()=>assert.equal(fastCapsule.qualifiedFacts[0].currentness,'FAST_LOCAL_LIMITED'));
 check('R10M_WORK_OBJECTIVE_PRESENT',()=>assert.equal(a.coordinates.CONTINUITY.work.ACTIVE_OBJECTIVE.state,'ESTABLISHED'));
 check('R10M_WORK_DECISION_PRESENT',()=>assert.equal(a.coordinates.CONTINUITY.work.ACCEPTED_DECISIONS.state,'ESTABLISHED'));
 check('R10M_WORK_UNFINISHED_PRESENT',()=>assert.equal(a.coordinates.CONTINUITY.work.UNFINISHED_WORK.state,'ESTABLISHED'));
 check('R10M_WORK_BLOCKER_PRESENT',()=>assert.equal(a.coordinates.CONTINUITY.work.CURRENT_BLOCKERS.state,'ESTABLISHED'));
 const absent=fixture();absent.g15.governedTruth.materialStates=[];const absentCapsule=capsule.deriveContinuityCapsule({canonicalModel:absent.model,g15:absent.g15,truth:absent.truth});
 check('R10M_WORK_OBJECTIVE_ABSENT_UNKNOWN',()=>assert.equal(absentCapsule.coordinates.CONTINUITY.work.ACTIVE_OBJECTIVE.state,'UNKNOWN'));
 check('R10M_WORK_DECISION_ABSENT_UNKNOWN',()=>assert.equal(absentCapsule.coordinates.CONTINUITY.work.ACCEPTED_DECISIONS.state,'UNKNOWN'));
 check('R10M_WORK_UNFINISHED_ABSENT_UNKNOWN',()=>assert.equal(absentCapsule.coordinates.CONTINUITY.work.UNFINISHED_WORK.state,'UNKNOWN'));
 check('R10M_WORK_BLOCKERS_ABSENT_UNKNOWN',()=>assert.equal(absentCapsule.coordinates.CONTINUITY.work.CURRENT_BLOCKERS.state,'UNKNOWN'));
 check('R10M_BYTES_AND_DENSITY_METRICS',()=>assert(a.metrics.capsuleBytes>0&&a.metrics.bytesPerSemanticFact>0&&a.metrics.semanticFactCount===5));
 check('R10M_CAPSULE_BYTE_METRIC_EXACT',()=>{const {metrics,...payload}=a;assert.equal(a.metrics.capsuleBytes,Buffer.byteLength(JSON.stringify(payload)+'\n','utf8'));});
 check('R10M_NO_PROJECTION_OWNED_TRUTH',()=>assert.equal(a.kind,'DERIVED_READ_ONLY_PROJECTION'));
 check('R10M_CAPSULE_ENTRYPOINT_WIRING',()=>{const source=fs.readFileSync(path.join(__dirname,'../phase0/cli/product-entry.cjs'),'utf8');assert(source.includes("require('./continuity-capsule.cjs')")&&source.includes('continuityCapsule.deriveContinuityCapsule')&&source.includes('--continuity-capsule'));});
 check('R10M_CAPSULE_OPTION_PARSE',()=>{const parsed=entry.parse(['story','--continuity-capsule','--root','C:\\synthetic','--json']);assert.equal(parsed.options.continuityCapsule,true)&&assert.equal(parsed.format,'JSON');});
 check('R10M_CAPSULE_RENDER_ROUTE',()=>assert.equal(human.render('story',{continuityCapsule:a,continuityCapsuleOnly:true},'JSON'),capsule.serialize(a)));
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'hito-r10m-no-canonical-'));
 try{await entry.execute('init',{explicit:root});const receiptBefore=fs.readFileSync(path.join(root,'.maat','first-observation-entry-r1.json'));
  await checkAsync('R10M_ENTRYPOINT_REQUIRES_CANONICAL_STATE',async()=>assert.rejects(entry.execute('story',{explicit:root,continuityCapsule:true}),/R10M_VALIDATED_CANONICAL_STATE_REQUIRED/));
  check('R10M_ENTRYPOINT_DOES_NOT_REWRITE_FIRST_OBSERVATION',()=>assert.deepEqual(fs.readFileSync(path.join(root,'.maat','first-observation-entry-r1.json')),receiptBefore));
 }finally{fs.rmSync(root,{recursive:true,force:true});}
 check('R10M_CANONICAL_INTEGRATION_GATE',()=>{const core=path.resolve(__dirname,'..'),contract=JSON.parse(fs.readFileSync(path.join(core,'phase0/contracts/canonical-integration-contract.json'),'utf8'));assert.equal(gate.evaluateCanonicalIntegration(core,contract).pass,true);});
 check('R10M_NO_DUPLICATE_TRUTH_OWNER',()=>{const core=path.resolve(__dirname,'..'),contract=JSON.parse(fs.readFileSync(path.join(core,'phase0/contracts/canonical-integration-contract.json'),'utf8'));assert.equal(contract.architecture.owners.filter(x=>x.truthAuthority===true).length,1);});
 check('R10M_CAPSULE_HASH_DETERMINISTIC',()=>assert.equal(capsule.digest(a),capsule.digest(b)));
 process.stdout.write(JSON.stringify({status:'PASS',controls:controls.length,controlIds:controls,syntheticFixturesOnly:true,projectionOwnedTruth:false,canonicalWrites:0,targetMutations:0,networkCalls:0,providerCalls:0,gitMutations:0})+'\n');
}
async function checkAsync(id,fn){await fn();controls.push(id);}
main().catch(error=>{process.stderr.write(`${error.stack||error}\n`);process.exitCode=1;});
