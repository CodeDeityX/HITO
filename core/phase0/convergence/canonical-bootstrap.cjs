'use strict';
// Lifecycle orchestration only. G16 owns bounded acquisition, Phase2 owns
// model construction, Phase0 owns commits, and C7 owns semantic composition.
const fs=require('node:fs'),path=require('node:path');
const store=require('../contracts/product-entry-persistence.cjs');
const g16=require('../dist/convergence/g16-installability-migration-recovery.js');
const {reconcilePhase2}=require('../dist/phase2/reconciler.js');
const persistence=require('../dist/contracts/persistence.js');
const runtime=require('../dist/convergence/runtime.js');
const FILE='canonical-bootstrap-composition.json';
const PATHS=['README.md','package.json','tsconfig.json'];
const structural=require('../cli/structural-how.cjs');
function file(root){return store.safe(root,path.join(root,'.maat',FILE));}
function authorityRequest(){return {requiredAuthorities:[{coordinateId:'accepted-project-intent',required:true,state:'UNKNOWN'}],contextFacts:[]};}
function composition(previous,current){
 const before=previous.model,after=current.model,projectId=after.project.projectId;
 const request=authorityRequest();
 const g8Request={current:request,predecessor:{model:before,request}};
 const c2=runtime.composeHitoRuntime({model:after,g8Request});
 const subjectId=before.capabilityLineage.find(e=>after.capabilityLineage.some(n=>n.eventId===e.eventId))?.capabilityId;
 if(!subjectId)throw Error('CANONICAL_BOOTSTRAP_G12_LINEAGE_UNAVAILABLE');
 const tip=(model,reality)=>({branchId:'canonical-observation-lifecycle',projectId,historyHeadEventHash:model.canonicalState.historyHead.eventHash,semanticRealityIdentity:reality.semanticRealityIdentity,sourceBytesIdentity:model.canonicalState.integrity.modelHash,lineageEventIds:model.capabilityLineage.filter(e=>e.capabilityId===subjectId).map(e=>e.eventId)});
 const scopeIdentity='bounded-canonical-observation',targetIdentity=projectId;
 return {
  g8Request,
  g10Request:{predecessorHistory:previous.history,request:{historyScope:'HEADS_AND_CONNECTING_CAUSAL_PATH',causalComparisonApplicability:'REQUIRED',g9CompletionLinkApplicability:'NOT_REQUIRED',selectedEventHashes:[]}},
  g12Request:{projectId,subjectId,scopeIdentity,targetIdentity,mergeApplicability:'NOT_REQUIRED',g9CompletionApplicability:'NOT_REQUIRED',g11ConflictApplicability:'NOT_REQUIRED',predecessorTip:tip(before,c2.g8.predecessor),successorTip:tip(after,c2.g8.successor),commonBase:{applicability:'NOT_REQUIRED',state:'NOT_REQUIRED'},protectedAuthority:{applicability:'NOT_REQUIRED',state:'NOT_REQUIRED'}},
  g14Request:{projectId,subjectId:projectId,claimKey:'bounded-local-observation-only',scopeIdentity,environmentIdentity:'local-unobserved-runtime',targetIdentity,requiredVariantIdentities:['local'],applicability:'NOT_APPLICABLE',currentTargetRevisionIdentity:after.canonicalState.integrity.modelHash,currentCausalPositionIdentity:after.canonicalState.historyHead.eventHash,causalBinding:'NOT_REQUIRED',territorySubject:{territoryEntityId:projectId,class:'CANONICAL_MEMBER'},runtimeRealizationApplicability:'NOT_REQUIRED',observations:[],runtimeRealizations:[],rolloutApplicability:'NOT_REQUIRED',dynamicIndirections:[]},
  g15Request:{snapshotReadKind:'VALIDATED_CANONICAL',presentationData:[]},
  g16Request:{currentMode:'OBSERVATION_DISCOVERY',requestedMode:'OBSERVATION_DISCOVERY',canonicalAvailability:'VALIDATED_CANONICAL',compatibility:{engineProtocolIdentity:g16.G16_ENGINE_PROTOCOL_IDENTITY,producingRulesetVersion:g16.G16_INSTALLABILITY_MIGRATION_RECOVERY_RULESET_VERSION,canonicalSchemaVersion:after.schemaVersion,evidenceIdentity:after.canonicalState.integrity.modelHash,historicalBindings:[]},reconciliation:{outOfBandOccurrence:'UNKNOWN',observedStateIdentity:null,scopeIdentity,reasonCodes:['UNOBSERVED_PROJECT_STATE_REMAINS_UNKNOWN']}}
 };
}
function save(root,record){
 const dest=file(root),tmp=store.safe(root,dest+'.'+process.pid+'.tmp');
 const bytes=JSON.stringify(record)+'\n';
 fs.writeFileSync(tmp,bytes,{flag:'wx'});
 fs.renameSync(tmp,dest);
}
async function admit(root){
 if(!store.read(root))throw Error('CANONICAL_BOOTSTRAP_REQUIRES_NORMAL_INIT');
 const classification=await persistence.classifyPersistenceState(root);
 if(!['NO_CANONICAL_STATE','HEALTHY_CANONICAL_STATE'].includes(classification.state))throw Error('CANONICAL_BOOTSTRAP_RECOVERY_REQUIRED');
 const previous=classification.state==='HEALTHY_CANONICAL_STATE'?await persistence.readCanonicalRevisionValidated(root):null;
 const {observation,scan}=await g16.discoverG16ProjectForReconciliation(root,{relativePaths:structural.discover(root),maxBytesPerFile:65536,observedAt:new Date().toISOString()});
 if(!observation.selectedFilesUnchanged)throw Error('CANONICAL_BOOTSTRAP_CHANGED_DURING_OBSERVATION');
 if(!scan.inventory.length)throw Error('CANONICAL_BOOTSTRAP_QUALIFIED_EVIDENCE_REQUIRED');
 if(observation.unknowns.length)throw Error('CANONICAL_BOOTSTRAP_INPUT_UNAVAILABLE_REOBSERVATION_REQUIRED');
 // Missing/unobserved territory is explicitly retained by the existing owner.
 scan.unknowns.push({code:'UNAVAILABLE_IN_SAFE_READ_ONLY_MODE',message:'Bounded canonical bootstrap: unselected paths and runtime/accepted intent are UNKNOWN; structural selection is explicitly bounded.'});
 const admitted=await reconcilePhase2(scan,{root,persist:false,initializeMaat:true,allowExistingMaatRead:true});
 const input=previous?composition(previous,admitted.snapshot):null;
 // Validate every downstream request before committing a new revision.
 if(input)runtime.composeHitoRuntime({...input,model:admitted.model,g10Request:{...input.g10Request,successorHistory:admitted.snapshot.history}});
 await persistence.stageCanonicalRevision(root,admitted.snapshot);
 const current=await persistence.readCanonicalRevisionValidated(root);
 if(current.model.canonicalState.integrity.modelHash!==admitted.model.canonicalState.integrity.modelHash)throw Error('CANONICAL_BOOTSTRAP_CONCURRENT_REVISION');
 const record={schema:'hito.canonical-bootstrap-composition.v1',root:fs.realpathSync.native(root),modelHash:current.model.canonicalState.integrity.modelHash,observationIdentity:observation.observationIdentity,sourceHashes:PATHS.map(p=>({path:p,sha256:observation.observedFiles.find(x=>x.relativePath===p)?.contentHash??null})),state:previous?'CANONICAL_CONTINUATION_READY':'CANONICAL_INITIAL_ADMISSION',comparisonBasis:previous?'ACTUAL_PRIOR_PERSISTED_REVISION':'NO_PRIOR_MODEL_EXISTS',input};
 if(record.input){const snapshot=await runtime.readHitoRuntimeFromProjectRoot(root,record.input);if(snapshot.kind!=='HITO_1_0_C7_COMPOSITION_SNAPSHOT')throw Error('CANONICAL_BOOTSTRAP_C7_REQUIRED');}
 save(root,record);
 return {state:record.state,revision:current.model.canonicalState.modelRevision,canonicalModelOwner:'phase2/reconciler.reconcilePhase2',canonicalPersistenceCreated:true,next:previous?null:'Run hito intake --canonical to acquire a real successor observation; no predecessor was fabricated.',executionAuthority:false};
}
async function read(root){
 if(!fs.existsSync(file(root)))return null;
 if(fs.statSync(file(root)).size>1048576)throw Error('CANONICAL_BOOTSTRAP_COMPOSITION_BYTE_LIMIT');
 const record=JSON.parse(fs.readFileSync(file(root),'utf8'));
 if(!Array.isArray(record.sourceHashes)||record.sourceHashes.length!==PATHS.length||!record.sourceHashes.every((x,i)=>x.path===PATHS[i]&&(x.sha256===null||/^[a-f0-9]{64}$/.test(x.sha256))))throw Error('CANONICAL_BOOTSTRAP_SOURCE_SCOPE_MISMATCH');
 const canonical=await persistence.readCanonicalRevisionValidated(root);
 if(record.schema!=='hito.canonical-bootstrap-composition.v1'||record.root!==fs.realpathSync.native(root)||record.modelHash!==canonical.model.canonicalState.integrity.modelHash)throw Error('CANONICAL_BOOTSTRAP_BINDING_MISMATCH');
 if(!record.input)throw Error('CANONICAL_BOOTSTRAP_REAL_SUCCESSOR_OBSERVATION_REQUIRED');
 const previousModel=record.input.g8Request?.predecessor?.model;
 const previousHistory=record.input.g10Request?.predecessorHistory;
 if(!previousModel||!Array.isArray(previousHistory)||previousHistory.length===0||previousHistory.length>=canonical.history.length||!previousHistory.every((e,i)=>JSON.stringify(e)===JSON.stringify(canonical.history[i])))throw Error('CANONICAL_BOOTSTRAP_PREDECESSOR_HISTORY_MISMATCH');
 const expected=composition({model:previousModel,history:previousHistory},canonical);
 if(JSON.stringify(expected)!==JSON.stringify(record.input))throw Error('CANONICAL_BOOTSTRAP_COMPOSITION_CONTRACT_MISMATCH');
 for(const item of record.sourceHashes){const p=store.safe(root,path.join(root,item.path));if(item.sha256===null){if(fs.existsSync(p))throw Error('CANONICAL_BOOTSTRAP_SOURCE_STALE_REOBSERVATION_REQUIRED');}else if(!fs.existsSync(p)||fs.statSync(p).size>1048576||store.sha(fs.readFileSync(p))!==item.sha256)throw Error('CANONICAL_BOOTSTRAP_SOURCE_STALE_REOBSERVATION_REQUIRED');}
 return record.input;
}
module.exports={admit,read,composition};
