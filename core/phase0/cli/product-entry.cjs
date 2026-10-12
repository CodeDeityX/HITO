'use strict';
const fs=require('node:fs'),path=require('node:path');
const {performance}=require('node:perf_hooks');
const store=require('../contracts/product-entry-persistence.cjs');
const {observeHitoFirst}=require('../dist/convergence/g16-installability-migration-recovery.js');
const {readHitoRuntimeFromProjectRoot}=require('../dist/convergence/runtime.js');
const {readCanonicalRevisionValidated}=require('../dist/contracts/persistence.js');
const continuityCapsule=require('./continuity-capsule.cjs');
const {project,story}=require('../hosts/shared/product-entry-host.cjs');
const COMMANDS=['root','init','status','next','why','mri','intake','story'];
function resolveRoot({explicit,cwd=process.cwd(),workspaceRoots}={}){
 const current=fs.realpathSync.native(path.resolve(cwd));let root,selection;
 if(explicit!==undefined){root=fs.realpathSync.native(path.resolve(current,explicit));selection='EXPLICIT_PATH';}
 else{
  if(workspaceRoots!==undefined){if(!Array.isArray(workspaceRoots)||workspaceRoots.length!==1)throw Error('AMBIGUOUS_ROOT_EXPLICIT_SELECTION_REQUIRED');root=fs.realpathSync.native(path.resolve(current,workspaceRoots[0]));selection='SINGLE_WORKSPACE_ROOT';}
  else{
   let cursor=current;
   while(true){if(store.exists(path.join(cursor,'.maat'))){root=cursor;selection='NEAREST_HITO_STATE';break;}const parent=path.dirname(cursor);if(parent===cursor)break;cursor=parent;}
   if(!root){root=current;selection='CWD_ONLY_UNGOVERNED';}
  }
 }
 if(!fs.statSync(root).isDirectory())throw Error('PROJECT_ROOT_NOT_DIRECTORY');
 store.paths(root);
 return {activeRoot:root,selection,cwd:current,cwdInsideActiveRoot:store.inside(root,current),gitRootAuthority:false};
}
function acquire(root){
 const documentaryEvidence=[],exclusions=[];let files=0,bytes=0;
 const name='README.md',p=path.join(root,name),subjectIdentity=store.identity(root);
 if(store.exists(p)){
  const stat=fs.lstatSync(p);
  if(stat.isSymbolicLink()||!store.inside(root,fs.realpathSync.native(p)))exclusions.push({path:name,reason:'LINK_EXCLUDED'});
  else if(!stat.isFile())exclusions.push({path:name,reason:'NOT_REGULAR_FILE'});
  else if(stat.size>1048576)exclusions.push({path:name,reason:'BYTE_LIMIT'});
  else{
   // Open one bounded document; physical bytes are passed to the accepted UTF-8 hash gate.
   const fd=fs.openSync(p,'r');let raw;
   try{const b=Buffer.alloc(1048577);const n=fs.readSync(fd,b,0,b.length,0);raw=b.subarray(0,n);}finally{fs.closeSync(fd);}
   files++;bytes+=raw.length;
   if(raw.length>1048576)exclusions.push({path:name,reason:'BYTE_LIMIT'});
   else{
    const content=raw.toString('utf8');
    if(!Buffer.from(content).equals(raw))exclusions.push({path:name,reason:'NOT_LOSSLESS_UTF8'});
    else documentaryEvidence.push({evidenceId:'document:README.md',authorityClass:'DOCUMENTARY_EVIDENCE_ONLY',content,provenance:{subjectIdentity,sourcePath:name,contentSha256:store.sha(raw),capturedAt:new Date().toISOString()}});
   }
  }
 }
 return {request:{mode:'FIRST_OBSERVATION',priorState:'NO_PRIOR_STATE_ADMITTED',subjectIdentity,documentaryEvidence},exclusions,acquisition:{scope:'EXPLICIT_ROOT_README_ONLY',filesExamined:files,bytesExamined:bytes,unobserved:'All paths other than root README.md; no recursion, directory listing, Git discovery, or total-file census'}};
}
function freshness(root,receipt){
 const current=acquire(root);
 const old=new Map(receipt.request.documentaryEvidence.map(e=>[e.provenance.sourcePath,e.provenance.contentSha256]));
 const now=new Map(current.request.documentaryEvidence.map(e=>[e.provenance.sourcePath,e.provenance.contentSha256]));
 const changed=[...new Set([...old.keys(),...now.keys()])].filter(k=>old.get(k)!==now.get(k));
 return {state:changed.length||JSON.stringify(receipt.exclusions)!==JSON.stringify(current.exclusions)?'STALE_BOUNDED_EVIDENCE':'UNCHANGED_BOUNDED_EVIDENCE',changedFiles:changed.length,scope:'README.md only; remaining project currentness UNAVAILABLE',acquisition:current.acquisition};
}
const measured=(value,unit,basis)=>({state:'MEASURED',value,unit,basis});
const unavailable=basis=>({state:'UNAVAILABLE',value:null,unit:'unspecified',basis});
async function execute(command,options={}){
 if(Object.keys(options).some(k=>!['explicit','cwd','workspaceRoots','composition','stage','budget','objective','agentSuggestedEdges','continuityCapsule','canonical'].includes(k)))throw Error('UNSUPPORTED_OPTION');
 if(options.canonical&&(command!=='intake'||options.stage||options.composition||options.budget||options.objective))throw Error('CANONICAL_INTAKE_OPTION_CONFLICT');
 if(options.continuityCapsule===true&&command!=='story')throw Error('R10M_CAPSULE_OPTION_REQUIRES_STORY');
 const started=performance.now();if(!COMMANDS.includes(command))throw Error('UNKNOWN_COMMAND');
 if(command==='init'&&!options.explicit)throw Error('INIT_REQUIRES_EXPLICIT_ROOT');
 const binding=resolveRoot(options),root=binding.activeRoot,p=store.paths(root);
 if(command==='root'){
  const existing=store.read(root);let id=existing?.observed.result.subjectIdentity??null;
  if(store.exists(p.model))id=(await readCanonicalRevisionValidated(root)).model.project.projectId;
  if(!existing&&store.exists(p.maatRoot)&&!store.exists(p.model))throw Error('INCOMPLETE_HITO_STATE');
  return {...binding,projectIdentity:id};
 }
 if(options.canonical){
  const bootstrap=await require('../convergence/canonical-bootstrap.cjs').admit(root);
  if(bootstrap.state==='CANONICAL_INITIAL_ADMISSION')return {binding,bootstrap,payload:bootstrap};
  const continued=await execute('intake',{...options,canonical:undefined});
  continued.bootstrap=bootstrap;
  return continued;
 }
 let state,observed,receipt,created=false,readBytes=0;
 if(store.exists(p.model)||store.exists(p.history)||store.exists(p.evidenceManifest)){
  const file=options.composition?store.safe(root,path.resolve(root,options.composition)):null;
  const input=file?JSON.parse(fs.readFileSync(file,'utf8')):await require('../convergence/canonical-bootstrap.cjs').read(root);
  if(!input)throw Error('CANONICAL_CONTINUATION_REQUIRES_EXPLICIT_COMPOSITION_INPUT');
  const snapshot=await readHitoRuntimeFromProjectRoot(root,input);
  if(snapshot.kind!=='HITO_1_0_C7_COMPOSITION_SNAPSHOT')throw Error('C7_HOST_INPUT_REQUIRED');
  const canonical=await readCanonicalRevisionValidated(root);
  state={root,snapshot,canonicalModel:canonical.model,subjectIdentity:canonical.model.project.projectId,provenance:{compositionPath:file?path.relative(root,file):'.maat/canonical-bootstrap-composition.json',compositionSha256:store.sha(Buffer.from(JSON.stringify(input)))}};
 }else{
  const saved=store.read(root);
  if(saved){({receipt,observed}=saved);readBytes=saved.bytes;}
  else{
   if(command!=='init')throw Error('PROJECT_NOT_INITIALIZED');
   if(store.exists(p.maatRoot))throw Error('INCOMPLETE_HITO_STATE_NO_FIRST_OBSERVATION_FALLBACK');
   const acquired=acquire(root);receipt={kind:'HITO_LOCAL_FIRST_OBSERVATION_RECEIPT_R1',root,...acquired};
   observed=observeHitoFirst(receipt.request);store.create(root,receipt);created=true;
  }
  state={root,result:observed.result,exclusions:receipt.exclusions,continuityMode:created?'FIRST_OBSERVATION':'CONTINUATION',continuityBasis:created?'NO_PRIOR_STATE_ADMITTED':'REOPEN_SAME_NONCANONICAL_OBSERVATION; comparative history NOT_APPLICABLE',freshness:created?{state:'CAPTURED_BOUNDED_EVIDENCE',scope:receipt.acquisition.scope}:command==='intake'&&!options.stage?{state:'DEFERRED_TO_BOUNDED_R2_REFRESH',changedFiles:null,scope:'R2 acquisition budget owns supporting-content refresh',acquisition:{filesExamined:0,bytesExamined:0}}:freshness(root,receipt)};
 }
 const truthAt=performance.now()-started,projections=project(state),pulseAt=performance.now()-started;
 const metrics=observed?structuredClone(observed.instrumentation):Object.fromEntries(['time_to_first_useful_truth','time_to_first_useful_pulse','time_to_first_correct_next_step_or_no_justified_next','files_examined_before_useful_truth','bytes_examined_before_useful_truth','total_project_files','semantic_coverage','unknown_count','excluded_evidence_count','incorrect_claim_count','human_intervention_count','refresh_cost','changed_files_since_previous_run'].map(k=>[k,unavailable('Canonical adapter did not instrument internal reads') ]));
 metrics.time_to_first_useful_truth=measured(truthAt,'ms','Command API entry through root binding, bounded acquisition/reopen, validated semantic result and persistence; process startup excluded');
 metrics.time_to_first_useful_pulse=measured(pulseAt,'ms','Command API entry through shared Project Pulse payload availability; physical UI rendering not measured');
 metrics.time_to_first_correct_next_step_or_no_justified_next=measured(pulseAt,'ms','Shared next payload available; correctness subject to regression and independent review');
 if(receipt){
  const acq=created?receipt.acquisition:state.freshness.acquisition;
  metrics.files_examined_before_useful_truth=measured(acq.filesExamined+(created?0:1),'files','Documentary content reads plus reopened receipt; code/module/metadata reads excluded');
  metrics.bytes_examined_before_useful_truth=measured(acq.bytesExamined+readBytes,'bytes','Documentary content and persisted receipt bytes read; output bytes excluded');
  metrics.excluded_evidence_count=measured(receipt.exclusions.length,'records','Explicit root README.md acquisition exclusions; unobserved paths are not counted as exclusions');
  if(!created){metrics.refresh_cost=measured(pulseAt,'ms','Receipt replay and bounded currentness check; no new observation or canonical revision');metrics.changed_files_since_previous_run=measured(state.freshness.changedFiles,'files','Changes since persisted observation in README.md only; whole-project changes UNAVAILABLE');}
 }
 const output={binding,...projections,instrumentation:metrics,payload:command==='init'?projections.cli.status:command==='story'?projections.cli.story:projections.cli[command]};
 const applied=await require('./adaptive-discovery.cjs').apply(output,command,options,receipt);
 if(options.continuityCapsule===true&&!state.canonicalModel)throw Error('R10M_VALIDATED_CANONICAL_STATE_REQUIRED');
 if(state.canonicalModel){
  applied.continuityCapsule=continuityCapsule.deriveContinuityCapsule({canonicalModel:state.canonicalModel,g15:state.snapshot.c6.g15,truth:applied.truth,structuralGraph:require('./structural-how.cjs').derive(root,state.canonicalModel)});
  if(options.continuityCapsule===true){applied.payload=applied.continuityCapsule;applied.continuityCapsuleOnly=true;}
 }
 if(applied.truth){applied.cli.story=story(applied.truth,applied.cli,applied.vscode?.bridge);if(command==='story')applied.payload=applied.cli.story;}
 return applied;
}
function parse(args){
 const command=args.shift(),options={};let format='TEXT';
 while(args.length){const a=args.shift();if(a==='--root'){if(options.explicit!==undefined||!args.length)throw Error('AMBIGUOUS_ROOT');options.explicit=args.shift();}else if(a==='--composition'){if(options.composition||!args.length)throw Error('INVALID_COMPOSITION');options.composition=args.shift();}else if(a==='--canonical'){if(command!=='intake'||options.canonical)throw Error('CANONICAL_OPTION_REQUIRES_INTAKE');options.canonical=true;}else if(a==='--stage'){if(command!=='intake'||options.stage||!args.length)throw Error('INVALID_STAGE');options.stage=args.shift();if(!['T1','T2'].includes(options.stage))throw Error('INVALID_STAGE');}else if(a==='--budget'){if(command!=='intake'||options.budget||!args.length)throw Error('INVALID_BUDGET');options.budget=JSON.parse(args.shift());}else if(a==='--objective'){if(command!=='intake'||options.objective||!args.length)throw Error('INVALID_OBJECTIVE');options.objective=args.shift();}else if(a==='--continuity-capsule'){if(command!=='story'||options.continuityCapsule)throw Error('R10M_CAPSULE_OPTION_REQUIRES_STORY');options.continuityCapsule=true;}else if(a==='--json'){format='JSON';}else if(command==='init'&&!a.startsWith('--')&&options.explicit===undefined)options.explicit=a;else throw Error('AMBIGUOUS_OR_UNSUPPORTED_ARGUMENT');}
 return {command,options,format};
}
module.exports={execute,resolveRoot,parse,acquire,COMMANDS};
