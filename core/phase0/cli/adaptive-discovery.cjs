'use strict';
// Candidate-only acquisition adapter. Existing R1 support and semantic owners remain authoritative.
const fs=require('node:fs'),path=require('node:path'),{performance}=require('node:perf_hooks');
const store=require('../contracts/product-entry-persistence.cjs'),r1=require('./progressive-acquisition.cjs'),r2p=require('../contracts/r2-provenance.cjs');
const id=(tag,x)=>tag+':'+store.sha(Buffer.from(JSON.stringify(x)));
const DEFAULT_BUDGET=Object.freeze({maxCandidatesPerSource:24,maxTraversedEdgesPerStage:32,maxFilesRead:48,maxBytesRead:2097152,maxTraversalDepth:4,maxElapsedMs:2000});
const UNRESOLVED=new Set(['UNKNOWN','UNAVAILABLE','PARTIALLY_OBSERVED','INDETERMINATE','STALE']);
const CLASSES=Object.freeze({DOCUMENT_LOCAL_LINK:['architecture'],MANIFEST_PROJECT_REFERENCE:['projectMetadata'],WORKSPACE_REFERENCE:['workspace'],ENTRYPOINT_REFERENCE:['runtime'],CONFIG_RUNTIME_REFERENCE:['configuration','runtime'],VERIFIER_EVIDENCE_REFERENCE:['evidence','behavior','tests','currentness'],GOVERNANCE_STATUS_HISTORY_REFERENCE:['status','continuity'],TEST_TARGET_REFERENCE:['tests','evidence'],DIRECTORY_INDEX_REFERENCE:['structure']});
const targeting=require('./semantic-target-authority.cjs');
const bounded=require('../contracts/r2-bounded-state.cjs');
const physical=require('./physical-currentness.cjs');
const STOPS=['STOP_SUFFICIENT_TRUTH','STOP_JUSTIFIED_NEXT_ACTION','STOP_ACTIVE_QUESTION_ANSWERED','STOP_BLOCKING_CONTRADICTION','STOP_QUEUE_EXHAUSTED_NO_ADDITIONAL_ADMISSIBLE_EVIDENCE','STOP_LOW_MARGINAL_VALUE','STOP_BUDGET_REACHED','STOP_NO_HIGH_VALUE_EDGES','STOP_DEEPER_QUALIFICATION_REQUIRED'];
const CHILD_BINDING_KIND='BOUNDED_DIRECTORY_CHILD_PROVENANCE_R1';
function traversalEventIdentity(record){return id('r2-directory-traversal-event',[record.edgeIdentity,record.resultingArtifactIdentity,record.targetRelativePathOrModule,record.directoryTrace?.CHILD_CANDIDATE_SELECTION??[],record.directoryTrace?.CHILD_ARTIFACT_ADMITTED??[]]);}
function childBindingPayload(root,values){return {kind:CHILD_BINDING_KIND,edgeClass:'DIRECTORY_INDEX_REFERENCE',sourceArtifactIdentity:values.parentArtifactIdentity,sourceContentIdentity:values.parentContentIdentity,sourcePath:values.parentPath,containerSourcePath:values.parentPath,parentArtifactIdentity:values.parentArtifactIdentity,parentPath:values.parentPath,parentPathIdentity:id('r2-path',[root,values.parentPath]),parentContentIdentity:values.parentContentIdentity,childPathIdentity:id('r2-path',[root,values.childPath]),childPath:values.childPath,childContentIdentity:values.childContentIdentity,resultingArtifactIdentity:values.resultingArtifactIdentity,observationClass:'PHYSICAL_OBSERVATION',acquisitionClass:'BOUNDED_DIRECTORY_FILE_OBSERVATION',traversalSourceIdentity:values.traversalSourceIdentity,traversalEventIdentity:values.traversalEventIdentity,predecessorHistoryIdentity:values.predecessorHistoryIdentity,targetRelativePathOrModule:values.childPath,targetSemanticDimensions:['runtime'],authority:'PHYSICAL_OBSERVATION'};}
function makeChildBinding(root,parentArtifact,parentPath,child,childArtifact,parentRecord){
 const values={parentArtifactIdentity:parentArtifact.artifactIdentity,parentContentIdentity:parentArtifact.contentSha256,parentPath,childPath:child.path,childContentIdentity:child.observation.contentSha256,resultingArtifactIdentity:childArtifact.artifactIdentity,traversalSourceIdentity:traversalEventIdentity(parentRecord),traversalEventIdentity:traversalEventIdentity(parentRecord),predecessorHistoryIdentity:parentRecord.edgeIdentity};
 const payload=childBindingPayload(root,values),digest=store.sha(Buffer.from(JSON.stringify(payload))),historyIdentity=id('r2-child-history',payload);
 return {...payload,edgeIdentity:historyIdentity,historyIdentity,integrityDigest:digest};
}
function validateChildBindings(data,work){
 const history=data.history??[],artifacts=new Map((data.artifacts??[]).map(a=>[a.artifactIdentity,a])),events=new Map(history.filter(h=>h?.directoryTrace).map(h=>[h.edgeIdentity,h]));
 const statuses=[],validCurrent=new Set(),unverifiableCurrent=new Set();
 for(const binding of history.filter(h=>h?.kind===CHILD_BINDING_KIND)){
  bounded.recordWork(work,'HISTORY_LOOKUPS');
  const effectiveId=binding.resultingArtifactIdentity??binding.historicalResultingArtifactIdentity??null,current=effectiveId?artifacts.get(effectiveId):null;
  const values={parentArtifactIdentity:binding.parentArtifactIdentity,parentContentIdentity:binding.parentContentIdentity,parentPath:binding.parentPath,childPath:binding.childPath,childContentIdentity:binding.childContentIdentity,resultingArtifactIdentity:binding.historicalResultingArtifactIdentity??binding.resultingArtifactIdentity,traversalSourceIdentity:binding.traversalSourceIdentity,traversalEventIdentity:binding.traversalEventIdentity,predecessorHistoryIdentity:binding.predecessorHistoryIdentity};
  const complete=Object.values(values).every(v=>typeof v==='string'&&v.length>0)&&typeof binding.historyIdentity==='string'&&typeof binding.integrityDigest==='string';
  let integrityValid=false,eventValid=false;
  if(complete){const payload=childBindingPayload(data.root,values),identity=id('r2-child-history',payload),payloadMatches=Object.entries(payload).every(([key,value])=>JSON.stringify(key==='resultingArtifactIdentity'&&binding.resultingArtifactIdentity===null?binding.historicalResultingArtifactIdentity:binding[key])===JSON.stringify(value));integrityValid=payloadMatches&&binding.historyIdentity===identity&&binding.edgeIdentity===identity&&binding.integrityDigest===store.sha(Buffer.from(JSON.stringify(payload)));if(!integrityValid)throw Error('R2_DIRECTORY_CHILD_INTEGRITY');const event=events.get(values.predecessorHistoryIdentity);eventValid=!!event&&event.resultingArtifactIdentity===values.parentArtifactIdentity&&event.targetRelativePathOrModule===values.parentPath&&event.directoryTrace.CHILD_ARTIFACT_ADMITTED?.includes(values.childPath)===true&&event.edgeIdentity===values.predecessorHistoryIdentity&&traversalEventIdentity(event)===values.traversalEventIdentity;}
  const identityValid=complete&&integrityValid&&id('artifact',[data.root,values.parentPath,values.parentContentIdentity])===values.parentArtifactIdentity&&id('artifact',[data.root,values.childPath,values.childContentIdentity])===values.resultingArtifactIdentity&&id('r2-path',[data.root,values.parentPath])===binding.parentPathIdentity&&id('r2-path',[data.root,values.childPath])===binding.childPathIdentity;
  const currentValid=identityValid&&eventValid&&(!current||(current.path===values.childPath&&current.contentSha256===values.childContentIdentity&&current.artifactIdentity===values.resultingArtifactIdentity&&current.state==='OBSERVED'&&store.sha(Buffer.from(current.content))===values.childContentIdentity));
  if(currentValid){if(current)validCurrent.add(current.artifactIdentity);statuses.push({bindingIdentity:binding.historyIdentity,current:!!current,historical:!current,status:current?'CURRENT_VALID':'HISTORICAL_VALID'});continue;}
  if(current)unverifiableCurrent.add(current.artifactIdentity);
  const historicalId=effectiveId;binding.historicalResultingArtifactIdentity=historicalId;binding.resultingArtifactIdentity=null;binding.validationStatus='HISTORICAL_UNVERIFIABLE';statuses.push({bindingIdentity:binding.historyIdentity??null,current:false,historical:true,status:'HISTORICAL_UNVERIFIABLE'});
 }
 for(const artifactIdentity of unverifiableCurrent){const artifact=artifacts.get(artifactIdentity),evidence=r2p.routeEvidence({artifact,history,legacyIds:data.legacySeedIdentities??[]});if(!validCurrent.has(artifactIdentity)&&!evidence.initial&&!evidence.legacy)throw Error('R2_HISTORICAL_PROVENANCE_UNVERIFIABLE');}
 Object.defineProperty(data,'childProvenanceStatuses',{value:statuses,enumerable:false,configurable:true});
 return statuses;
}
// Bootstrap vocabulary is the existing T1/T2 named selections, excluding transport state.
// Nested qualification applies only to single-component names, never child/a/b seeds.
const BOOTSTRAP_SEEDS=[
 ['README.md','DOCUMENT_LOCAL_LINK','DOCUMENTARY_EVIDENCE_ONLY'],
 ...['package.json','pyproject.toml','Cargo.toml','go.mod','pom.xml'].map(p=>[p,'MANIFEST_PROJECT_REFERENCE','STRUCTURAL_DECLARATION']),
 ['pnpm-workspace.yaml','WORKSPACE_REFERENCE','STRUCTURAL_DECLARATION'],
 ...['ARCHITECTURE.md','docs/architecture.md'].map(p=>[p,'DOCUMENT_LOCAL_LINK','DOCUMENTARY_EVIDENCE_ONLY']),
 ...['STATUS.md','docs/status.md'].map(p=>[p,'GOVERNANCE_STATUS_HISTORY_REFERENCE','DOCUMENTARY_EVIDENCE_ONLY']),
 ...['src/index.js','src/main.js','src/main.py','main.py','index.js'].map(p=>[p,'ENTRYPOINT_REFERENCE','PHYSICAL_OBSERVATION']),
 ...['tsconfig.json','Dockerfile','.github/workflows/ci.yml','.github/workflows/ci.yaml'].map(p=>[p,'CONFIG_RUNTIME_REFERENCE','STRUCTURAL_DECLARATION']),
 ['tests/manifest.json','TEST_TARGET_REFERENCE','STRUCTURAL_DECLARATION'],
 ['evidence/manifest.json','VERIFIER_EVIDENCE_REFERENCE','STRUCTURAL_DECLARATION']
];
const BOOTSTRAP_LIMITS=Object.freeze({rootEntries:64,children:16});
function bootstrapSpec(rel,basis){
 if(basis==='ROOT')return BOOTSTRAP_SEEDS.find(s=>s[0]===rel);
 if(basis!=='ONE_CHILD_LEVEL'||!r1.safeRelative(rel)||rel.split('/').length!==2)return null;
 return BOOTSTRAP_SEEDS.find(s=>!s[0].includes('/')&&s[0]===rel.split('/')[1]);
}
function bootstrap(root,ctx,qualification){
 const start={...qualification.cost},listing={basis:'BOUNDED_ROOT_PHYSICAL_METADATA',limits:BOOTSTRAP_LIMITS,entries:[],entriesRead:0,truncated:false,childrenDeferred:[],directoryCalls:0},candidates=[],edges=[];
 // If enumeration overflows, no arbitrary prefix is admitted. Root exact names remain
 // eligible; all child discovery is deferred. This is independent of enumeration order.
 if(performance.now()>=qualification.deadline){ctx.exhausted=true;listing.reason='DEFERRED_TIME_BUDGET';}
 else {let dir;try{listing.directoryCalls++;dir=fs.opendirSync(root);let e;while(listing.entriesRead<=BOOTSTRAP_LIMITS.rootEntries){listing.directoryCalls++;e=dir.readSync();if(!e)break;listing.entriesRead++;if(listing.entriesRead>BOOTSTRAP_LIMITS.rootEntries){listing.truncated=true;listing.entries=[];listing.reason='DEFERRED_ROOT_ENTRY_LIMIT_ALL_CHILDREN';break;}listing.entries.push({name:e.name,type:e.isSymbolicLink()?'LINK':e.isDirectory()?'DIRECTORY':e.isFile()?'FILE':'OTHER'});if(performance.now()>=qualification.deadline){ctx.exhausted=true;listing.entries=[];listing.reason='DEFERRED_TIME_BUDGET';break;}}}finally{if(dir){listing.directoryCalls++;dir.closeSync();}}}
 listing.entries.sort((a,b)=>a.name<b.name?-1:a.name>b.name?1:0);
 const children=[];for(const e of listing.entries){if(!['DIRECTORY','LINK'].includes(e.type))continue;const reason=e.type==='LINK'?'BLOCKED_LINK_OR_ROOT_ESCAPE':e.name==='.maat'?'TRANSPORT_STATE_NOT_BOOTSTRAP_EVIDENCE':prune({localityStatus:'IN_ROOT',targetRelativePathOrModule:e.name+'/README.md'});if(reason){listing.childrenDeferred.push({path:e.name,reason});continue;}if(children.length>=BOOTSTRAP_LIMITS.children){listing.childrenDeferred.push({path:e.name,reason:'DEFERRED_CHILD_COUNT_LIMIT'});continue;}children.push(e.name);}
 const selections=[...BOOTSTRAP_SEEDS.map(s=>({relativePath:s[0],basis:'ROOT',spec:s})),...children.flatMap(c=>BOOTSTRAP_SEEDS.filter(s=>!s[0].includes('/')).map(s=>({relativePath:c+'/'+s[0],basis:'ONE_CHILD_LEVEL',spec:s})))].sort((a,b)=>a.relativePath<b.relativePath?-1:a.relativePath>b.relativePath?1:0);
 const contentIdentity=store.sha(Buffer.from(JSON.stringify(listing))),sourceIdentity=id('bootstrap-metadata',[root,contentIdentity]);
 for(const {relativePath,basis,spec} of selections){
  const before={...qualification.cost},row={relativePath,basis,outcome:null,reason:null};candidates.push(row);
  const exclusion=prune({localityStatus:'IN_ROOT',targetRelativePathOrModule:relativePath});
  if(exclusion){row.outcome='DEFERRED';row.reason=exclusion;row.metadataCalls=0;continue;}
  if(ctx.exhausted||performance.now()>=qualification.deadline){ctx.exhausted=true;row.outcome='DEFERRED';row.reason='DEFERRED_TIME_BUDGET';row.metadataCalls=0;continue;}
  const loc=require('./reference-anchor.cjs').qualify(root,'README.md','./'+relativePath,true,qualification);
  row.metadataCalls=qualification.cost.metadataCalls-before.metadataCalls;
  row.candidateChecks=loc.candidateChecks;
  if(loc.status!=='IN_ROOT'||!loc.candidateChecks.some(c=>c.target===relativePath&&c.state==='EXISTS_FILE')){row.outcome=loc.status.startsWith('DEFERRED')?'DEFERRED':'REJECTED';row.reason=loc.status==='IN_ROOT'?'NOT_REGULAR_FILE_NO_DIRECTORY_CRAWL':loc.status;if(loc.candidateChecks.some(c=>c.state==='NOT_CHECKED_TIME_BUDGET'))ctx.exhausted=true;continue;}
  const edge={edgeClass:spec[1],sourceArtifactIdentity:sourceIdentity,sourceContentIdentity:contentIdentity,sourcePath:'.',containerSourcePath:'.',...loc,targetRelativePathOrModule:relativePath,targetSemanticDimensions:CLASSES[spec[1]],discoveryBasis:{kind:'BOUNDED_BOOTSTRAP',basis,relativePath},localityStatus:loc.status,defaultTraversalEligibility:true};
  edge.edgeIdentity=id('r2-edge',edge);row.edgeIdentity=edge.edgeIdentity;row.outcome='QUALIFIED_CANDIDATE';edges.push(edge);
 }
 return {kind:'BOUNDED_BOOTSTRAP_R1',listing,sourceIdentity,contentIdentity,candidates,edges,cost:{references:qualification.cost.references-start.references,candidates:qualification.cost.candidates-start.candidates,metadataCalls:qualification.cost.metadataCalls-start.metadataCalls,directoryCalls:listing.directoryCalls,contentFiles:0,contentBytes:0},costScope:'Qualification is a subset of anchorQualificationCost; directoryCalls are additional metadata operations. Content traversal is a subset of adaptiveTraversalCost.'};
}
function validateBootstrapHistory(root,data){
 for(const h of data.history){if(h.discoveryBasis?.kind!=='BOUNDED_BOOTSTRAP')continue;
  const b=h.discoveryBasis,s=bootstrapSpec(b.relativePath,b.basis),run=data.bootstrapHistory?.find(x=>x.sourceIdentity===h.sourceArtifactIdentity&&x.contentIdentity===h.sourceContentIdentity&&x.candidates.some(c=>c.edgeIdentity===h.edgeIdentity));
  if(!s||!run||s[1]!==h.edgeClass||h.targetRelativePathOrModule!==b.relativePath||h.selectedTarget!==b.relativePath||prune({localityStatus:'IN_ROOT',targetRelativePathOrModule:b.relativePath})||b.relativePath.startsWith('.maat/'))throw Error('R2_BOOTSTRAP_BINDING');
  if(store.sha(Buffer.from(JSON.stringify(run.listing)))!==run.contentIdentity||id('bootstrap-metadata',[root,run.contentIdentity])!==run.sourceIdentity)throw Error('R2_BOOTSTRAP_METADATA_BINDING');
  if(b.basis==='ONE_CHILD_LEVEL'&&(run.listing.truncated||!run.listing.entries.some(e=>e.name===b.relativePath.split('/')[0]&&e.type==='DIRECTORY')||run.listing.childrenDeferred.some(e=>e.path===b.relativePath.split('/')[0])))throw Error('R2_BOOTSTRAP_CHILD_BINDING');
 }
}

function budgetSpec(input={}){if(Object.keys(input).some(k=>!Object.hasOwn(DEFAULT_BUDGET,k)))throw Error('R2_UNKNOWN_BUDGET');const b={...DEFAULT_BUDGET,...input};for(const v of Object.values(b))if(!Number.isSafeInteger(v)||v<=0)throw Error('R2_FINITE_POSITIVE_BUDGET_REQUIRED');return b;}
function resolveLocal(root,source,target){
 if(typeof target!=='string'||!target||target.length>1024)return {status:'BLOCKED_INVALID_TARGET'};
 if(/^[a-z][a-z0-9+.-]*:/i.test(target)||/^[/\\]{2}/.test(target)||path.isAbsolute(target))return {status:'DOCUMENTARY_EXTERNAL_REFERENCE_ONLY'};
 if(/[\x00-\x1f]/.test(target))return {status:'BLOCKED_INVALID_TARGET'};
 let clean;try{clean=decodeURIComponent(target.split('#')[0].split('?')[0]).replace(/\\/g,'/');}catch{return {status:'BLOCKED_INVALID_TARGET'};}
 if(!clean||clean.includes(':'))return {status:'BLOCKED_INVALID_TARGET'};
 const absolute=path.resolve(root,path.posix.dirname(source),clean);
 if(!store.inside(root,absolute))return {status:'BLOCKED_ROOT_ESCAPE'};
 const relative=path.relative(root,absolute).split(path.sep).join('/');
 try{store.safe(root,absolute);}catch{return {status:'BLOCKED_LINK_OR_ROOT_ESCAPE',relative};}
 return {status:'IN_ROOT',relative,absolute};
}
function classify(label,fallback='DOCUMENT_LOCAL_LINK'){
 if(/verif|receipt|evidence|proof/i.test(label))return 'VERIFIER_EVIDENCE_REFERENCE';
 if(/status|governance|history|decision/i.test(label))return 'GOVERNANCE_STATUS_HISTORY_REFERENCE';
 if(/workspace|member/i.test(label))return 'WORKSPACE_REFERENCE';
 if(/entrypoint|^main$|^bin$/i.test(label))return 'ENTRYPOINT_REFERENCE';
 if(/config|runtime|command/i.test(label))return 'CONFIG_RUNTIME_REFERENCE';
 if(/test|specification/i.test(label))return 'TEST_TARGET_REFERENCE';
 if(/directory|index|^files$/i.test(label))return 'DIRECTORY_INDEX_REFERENCE';
 if(/project|manifest|reference/i.test(label))return 'MANIFEST_PROJECT_REFERENCE';
 return fallback;
}
function extract(root,a,qualification={}){
 const edges=[],rejected=[];
 const pathLike=t=>typeof t==='string'&&(/^(?:\.{1,2}[/\\]|[a-z][a-z0-9+.-]*:)/i.test(t)||/[/\\]/.test(t)||/^[\w@+.-]+\.[a-z0-9]{1,12}$/i.test(t));
 const add=(target,label,basis,fallback,source=a.path,explicit=false)=>{
  if(typeof target!=='string')return;
  if(!explicit&&!pathLike(target)){rejected.push({sourcePath:source,value:target,classification:'SEMANTIC_VALUE_NOT_PATH'});return;}
  const edgeClass=classify(label,fallback),strong=explicit||basis==='EXPLICIT_LOCAL_DECLARATION'||basis==='EXPLICIT_JSON_FIELD',locality=require('./reference-anchor.cjs').qualify(root,source,target,strong,qualification);
  if(locality.status==='NON_FILESYSTEM_NAMESPACE'){rejected.push({sourceArtifactIdentity:a.artifactIdentity,sourceContentIdentity:a.contentSha256,sourcePath:source,...locality,classification:locality.anchorClassification});return;}
  const edge={edgeClass,sourceArtifactIdentity:a.artifactIdentity,sourceContentIdentity:a.contentSha256,sourcePath:source,containerSourcePath:a.path,...locality,targetRelativePathOrModule:locality.selectedTarget,targetSemanticDimensions:CLASSES[edgeClass],discoveryBasis:{kind:basis,label,reference:target},localityStatus:locality.status,defaultTraversalEligibility:locality.status==='IN_ROOT'};
  edge.edgeIdentity=id('r2-edge',edge);edges.push(edge);
 };
 const documentary=(text,source)=>{
  for(const m of text.matchAll(/\[([^\]\n]*)\]\(<?([^\s)>]+)>?(?:\s+"[^"\n]*")?\)/g))add(m[2],m[1],'EXPLICIT_DOCUMENT_LINK',undefined,source,true);
  for(const m of text.matchAll(/^\s*(entrypoint|main|runtime|config|project|workspace|receipt|verifier|evidence|report|status|history|governance|test|target|directoryIndex|file|path|script)\s*[:=]\s*["']?([^\s"'\r\n]+)["']?\s*$/gmi))add(m[2],m[1],'EXPLICIT_LOCAL_DECLARATION',undefined,source);
  // Only explicit code/quoted references and command arguments; never execute them.
  for(const line of text.split(/\r?\n/)){
   const command=/^\s*\.{1,2}[/\\]|\s-(?:File|f|script)\s|(?:^|\s)(?:powershell|pwsh|python\d*|node|bash|sh|ruby|perl)\s/i.test(line);
   const pathSlots=new Set([...line.matchAll(/(?:\b(?:powershell|pwsh|python\d*|node|bash|sh|ruby|perl)\s+(?!-)|\s-(?:File|f|script)\s+)["']?([^\s"'`]+)/gi)].map(m=>m[1]));
   // Restricted argument grammars establish path slots; arbitrary flags/literals do not.
   for(const m of line.matchAll(/\b(?:readFileSync|readFile|writeFileSync|writeFile|openSync|open|statSync|lstatSync|existsSync|accessSync|createReadStream|createWriteStream)\s*\(\s*["']([^"']+)["']/g))pathSlots.add(m[1]);
   const declaredPathContext=/\b(?:file|path|script|entrypoint|evidence|receipt|verifier|report)\s*(?:[:=]|(?:is|at)\s+)?\s*[`"']/i.test(line);
   const role=command?'verifier':/verif|evidence|report|receipt|proof|test/i.test(line)?'evidence':a.dimension==='evidence'?'evidence':'document';
   const spans=command?[line]:[...line.matchAll(/`([^`]+)`|"([^"\r\n]+)"|'([^'\r\n]+)'/g)].map(m=>m[1]??m[2]??m[3]);
   for(const span of spans)for(const m of span.matchAll(/(?:^|[\s"'=(])((?:\.{1,2}[/\\]|https?:\/\/)[^\s`"'<>),;]+|[\w@+.-]+(?:[/\\][\w@+.-]+)+[/\\]?|[\w@+.-]+\.[a-z0-9]{1,12})(?=$|[\s`"'),;])/gi))add(m[1],role,'EXPLICIT_CODE_REFERENCE',undefined,source,pathSlots.has(m[1])||declaredPathContext);
  }
 };
 let obj;try{obj=JSON.parse(a.content??'');}catch{documentary(a.content??'',a.path);}
 if(obj!==undefined){
  const walk=(v,key,depth,source)=>{
   if(depth>8)return;
   if(typeof v==='string'){
    if(/^(main|bin|entrypoint|runtime|config|configuration|project|projects|references|workspace|workspaces|members|receipt|receipts|evidence|verifier|report|status|history|governance|test|tests|target|targets|directoryIndex|files|file|path|script)$/i.test(key))add(v,key,'EXPLICIT_JSON_FIELD','MANIFEST_PROJECT_REFERENCE',source);
   }else if(Array.isArray(v)){for(const x of v)walk(x,key,depth+1,source);}
   else if(v&&typeof v==='object'){
    const origin=v.embeddedSourcePath??v.originSourcePath??v.provenance?.sourcePath??v.sourcePath;
    const payloadKeys=['content','text','documentaryContent','payload'];
    let context=null;
    if(typeof origin==='string'&&r1.safeRelative(origin)&&store.inside(root,path.resolve(root,origin.replace(/\\/g,'/'))))context=origin.replace(/\\/g,'/');
    for(const [k,x]of Object.entries(v)){
     if(payloadKeys.includes(k)&&typeof x==='string'){
      const hash=v.provenance?.contentSha256??v.contentSha256;
      if(context&&(!hash||store.sha(Buffer.from(x))===hash))documentary(x,context);
      else rejected.push({sourcePath:source,classification:'EMBEDDED_SOURCE_CONTEXT_UNAVAILABLE_OR_INVALID',field:k});
     }else if(!['provenance','embeddedSourcePath','originSourcePath'].includes(k))walk(x,/^(bin|references|workspaces|members)$/i.test(key)?key:k,depth+1,context??source);
    }
   }
  };walk(obj,'',0,a.path);
 }
 const unique=new Map();for(const e of edges){const k=JSON.stringify([e.sourcePath,e.selectedTarget??e.rawReference,e.edgeClass,e.localityStatus]);if(!unique.has(k))unique.set(k,e);else{const first=unique.get(k);(first.equivalentReferences??=[]).push({rawReference:e.rawReference,discoveryBasis:e.discoveryBasis,selectionBasis:e.selectionBasis});}}const result=[...unique.values()];result.referenceClassifications=rejected;return result;
}
function prune(e){
 if(e.localityStatus!=='IN_ROOT'){if(e.localityStatus==='MISSING_REFERENCED_LOCAL_ARTIFACT'){const reasons=(e.candidateChecks??[]).map(c=>prune({localityStatus:'IN_ROOT',targetRelativePathOrModule:c.target}));if(reasons.length&&reasons.every(r=>r==='DEFERRED_COSTLY_CATEGORY'))return 'DEFERRED_COSTLY_CATEGORY';}return e.localityStatus;}
 const p=e.targetRelativePathOrModule;
 if(p.split('/').some(s=>/^(node_modules|vendor|vendors|dependencies|third[_-]party|\.venv|venv|env|\.cache|cache|caches|__pycache__|target|build|dist|out|generated|coverage|\.git|\.svn|\.hg)$/i.test(s)))return 'DEFERRED_COSTLY_CATEGORY';
 if(/(?:^|\/)(?:[^/]*lock(?:\.json|\.yaml|\.toml)?|package-lock\.json|yarn\.lock)$/i.test(p))return 'DEFERRED_LOCKFILE_INTERNALS';
 if(/\.(?:exe|dll|so|dylib|a|o|class|jar|zip|gz|png|jpg|pdf|mp4|bin|log)$/i.test(p))return 'DEFERRED_BINARY_OR_UNQUALIFIED_LOG';
 if(/[\*\[\]{}]/.test(p))return 'DEFERRED_UNBOUNDED_PATTERN';
 return null;
}
function states(claims){return Object.fromEntries(r1.DIMENSIONS.map(d=>{const c=claims.filter(x=>x.semanticDimension===d);return [d,c.some(x=>x.currentness==='STALE')?'STALE':c.some(x=>x.currentness==='UNKNOWN')?'INDETERMINATE':c.length?'PARTIALLY_OBSERVED':'UNAVAILABLE'];}));}
function priority(e,dimensions,objective,capability=targeting.OFFLINE){const targets=targeting.align(e,capability).currentlyAdmissibleSemanticDimensions;const gaps=targets.filter(d=>UNRESOLVED.has(dimensions[d]));return [gaps.some(d=>dimensions[d]==='STALE')?0:gaps.some(d=>dimensions[d]!=='PARTIALLY_OBSERVED')?1:2,e.discoveryBasis.kind==='AGENT_SUGGESTED_EDGE_CANDIDATE'?2:e.discoveryBasis.kind==='EXPLICIT_DOCUMENT_LINK'?1:0,e.edgeClass==='DOCUMENT_LOCAL_LINK'?1:0,typeof objective==='string'&&targets.some(d=>objective.includes(d))?0:1,e.localityStatus==='IN_ROOT'?0:1,e.knownBytes??Number.MAX_SAFE_INTEGER,e.sourceFanout??0,e.alreadyObserved?1:0];}
function compare(a,b){for(let i=0;i<a.priority.length;i++)if(a.priority[i]!==b.priority[i])return a.priority[i]-b.priority[i];return a.edgeIdentity<b.edgeIdentity?-1:a.edgeIdentity>b.edgeIdentity?1:0;}
function authority(e){if(e.discoveryBasis?.kind==='BOUNDED_BOOTSTRAP'){const s=bootstrapSpec(e.discoveryBasis.relativePath,e.discoveryBasis.basis);if(!s||s[1]!==e.edgeClass)throw Error('R2_BOOTSTRAP_CLASS');return s[2];}if(e.discoveryBasis?.kind==='BOUNDED_ACTUAL_CHILD'||e.edgeClass==='DIRECTORY_INDEX_REFERENCE')return 'PHYSICAL_OBSERVATION';return /\.(md|txt|rst|adoc|html)$/i.test(e.targetRelativePathOrModule)||e.edgeClass==='DOCUMENT_LOCAL_LINK'||e.edgeClass==='GOVERNANCE_STATUS_HISTORY_REFERENCE'||e.edgeClass==='VERIFIER_EVIDENCE_REFERENCE'?'DOCUMENTARY_EVIDENCE_ONLY':['ENTRYPOINT_REFERENCE','CONFIG_RUNTIME_REFERENCE'].includes(e.edgeClass)?'PHYSICAL_OBSERVATION':'STRUCTURAL_DECLARATION';}
function read(root,rel,run){
 if(rel==='.')return {state:'INDETERMINATE',reason:'DIRECTORY_REFRESH_DEEPER_QUALIFICATION_REQUIRED'};
 if(run.cost.files>=run.budget.maxFilesRead||performance.now()-run.started>=run.budget.maxElapsedMs){run.exhausted=true;return {state:'INDETERMINATE',reason:'ACQUISITION_LIMIT'};}
 let p;try{p=store.safe(root,path.join(root,rel));if(!store.inside(root,p))throw Error();}catch{return {state:'UNAVAILABLE',reason:'LINK_OR_ROOT_ESCAPE'};}
 let stat;try{stat=fs.lstatSync(p);}catch(e){return {state:'UNAVAILABLE',reason:e.code==='ENOENT'?'NOT_FOUND_AT_CAPTURE':e.code};}
 if(stat.isDirectory()){
  const d=r1.readDirectoryBounded(root,rel,run.cost,run.directoryDepth??1);
  if(d.state!=='OBSERVED')return {state:'UNAVAILABLE',reason:d.reason??'DIRECTORY_NOT_ADMITTED',directoryAccounting:d};
  return {state:'OBSERVED',content:d.content,contentSha256:store.sha(Buffer.from(d.content||'')),bytes:0,directoryFiles:d.files,directoryAccounting:d};
 }
 if(!stat.isFile())return {state:'UNAVAILABLE',reason:'NOT_REGULAR_FILE_NO_DIRECTORY_CRAWL'};
 if(stat.size>run.budget.maxBytesRead-run.cost.bytes){run.exhausted=true;return {state:'INDETERMINATE',reason:'ACQUISITION_LIMIT'};}
 const fd=fs.openSync(p,'r');let b;try{const current=fs.fstatSync(fd);if(current.size>run.budget.maxBytesRead-run.cost.bytes){run.exhausted=true;return {state:'INDETERMINATE',reason:'ACQUISITION_LIMIT'};}b=Buffer.alloc(current.size);let n=0;while(n<b.length){const got=fs.readSync(fd,b,n,b.length-n,n);if(!got)break;n+=got;}b=b.subarray(0,n);}finally{fs.closeSync(fd);}
 run.cost.files++;run.cost.bytes+=b.length;
  return physical.observeBytes(b,store.sha);
}
function run(root,subject,prior,options={}){
 const budget=budgetSpec(options.budget),ctx={budget,cost:{files:0,bytes:0},started:performance.now(),exhausted:false};
 const anchorCost={references:0,candidates:0,metadataCalls:0},qualification={cost:anchorCost,deadline:ctx.started+budget.maxElapsedMs};
 let artifacts=structuredClone(prior.artifacts??[]);const oldClaims=artifacts.flatMap(a=>r1.claimsFor(a,subject));
 // R1 dependency invalidation is reused, with the R2 finite reader injected.
 const observations=new Map();const fresh=r1.refresh(root,{artifacts,claims:oldClaims},(rt,rel)=>{const v=read(rt,rel,ctx);observations.set(rel,v);return v;});fresh.cost={...ctx.cost};
 const dimensionsFor=claims=>{const ds=states(claims);for(const [d,v]of Object.entries(options.dimensionStates??{})){if(Object.hasOwn(ds,d)&&(!UNRESOLVED.has(v)||!claims.some(c=>c.semanticDimension===d)))ds[d]=v;}return ds;};
 const priorStates=dimensionsFor(fresh.claims),traversals=[],deferred=[],discovered=[],history=structuredClone(prior.history??[]);
 const visitedEdgeIdentities=new Set(prior.visitedEdgeIdentities??[]),visitedArtifactContentIdentities=new Set(prior.visitedArtifactContentIdentities??[]);
 const queueRankingSnapshots=[...(prior.queueRankingSnapshots??[])].slice(-bounded.LIMITS.MAX_QUEUE_SNAPSHOTS);let totalRankingEntries=queueRankingSnapshots.reduce((n,s)=>n+(s.ordering?.length??0),0);
 const queue=[],queued=new Set(),seenTargets=new Set(),activeClaims=[...fresh.claims];let ordinal=history.length;const referenceClassifications=[];
 // Root seed currentness is reacquired under the same budget. It is not an edge traversal.
 for(let i=0;i<artifacts.length;i++){const a=artifacts[i],now=observations.get(a.path);if(a.path==='README.md'&&!history.some(h=>h.resultingArtifactIdentity===a.artifactIdentity)&&now?.state==='OBSERVED'&&now.contentSha256!==a.contentSha256){const updated=r1.artifact(root,a.path,'architecture','DOCUMENTARY_EVIDENCE_ONLY',now);artifacts[i]=updated;for(let j=activeClaims.length-1;j>=0;j--)if(activeClaims[j].scope.path===a.path)activeClaims.splice(j,1);activeClaims.push(...r1.claimsFor(updated,subject));}}
 const defer=(e,reason)=>deferred.push({...e,priorDimensionStates:Object.fromEntries(e.targetSemanticDimensions.map(d=>[d,dimensionsFor(activeClaims)[d]])),traversalReason:'NOT_TRAVERSED',budgetSnapshot:{limits:budget,before:{...ctx.cost},after:{...ctx.cost}},discoveryOrdinal:discovered.findIndex(x=>x.edgeIdentity===e.edgeIdentity)+1,resultingArtifactIdentity:null,resultingEvidenceIdentities:[],resultingClaimIdentities:[],outcome:'DEFERRED',reason});
 const enqueue=(a,depth)=>{
  let edges=extract(root,a,qualification);referenceClassifications.push(...edges.referenceClassifications);if(edges.some(e=>e.candidateChecks?.some(c=>c.state==='NOT_CHECKED_TIME_BUDGET')))ctx.exhausted=true;if(depth===1){for(const suggestion of options.agentSuggestedEdges??[]){if(Object.keys(suggestion).some(k=>!['sourceArtifactIdentity','target','edgeClass'].includes(k)))throw Error('R2_AGENT_AUTHORITY_REJECTED');if(suggestion.sourceArtifactIdentity!==a.artifactIdentity)continue;if(!Object.hasOwn(CLASSES,suggestion.edgeClass))throw Error('R2_AGENT_EDGE_CLASS');const loc=require('./reference-anchor.cjs').qualify(root,a.path,suggestion.target,true,qualification),e={edgeClass:suggestion.edgeClass,sourceArtifactIdentity:a.artifactIdentity,sourceContentIdentity:a.contentSha256,sourcePath:a.path,...loc,targetRelativePathOrModule:loc.selectedTarget,targetSemanticDimensions:CLASSES[suggestion.edgeClass],discoveryBasis:{kind:'AGENT_SUGGESTED_EDGE_CANDIDATE',reference:suggestion.target},localityStatus:loc.status,defaultTraversalEligibility:loc.status==='IN_ROOT'};e.edgeIdentity=id('r2-edge',e);edges.push(e);}}
  admit(edges,depth);
 };
 const admit=(edges,depth)=>{
  const ds=dimensionsFor(activeClaims);edges=edges.map(e=>({...e,...targeting.align(e),depth,sourceFanout:edges.length,knownBytes:artifacts.find(a=>a.path===e.targetRelativePathOrModule)?.bytes,priority:priority(e,ds,options.objective)})).sort(compare);
  let admitted=0;const sourceTargets=new Set();for(const e of edges){if(queued.has(e.edgeIdentity))continue;queued.add(e.edgeIdentity);discovered.push(e);const reason=prune(e);if(reason){defer(e,reason);continue;}const gaps=e.currentlyAdmissibleSemanticDimensions.filter(d=>UNRESOLVED.has(ds[d]));if(!gaps.length){defer(e,'DEFERRED_NO_TARGET_GAP');continue;}const old=artifacts.find(a=>a.path===e.targetRelativePathOrModule),now=observations.get(e.targetRelativePathOrModule);const previouslyConsumed=old&&now?.contentSha256===old.contentSha256&&(visitedArtifactContentIdentities.has(id('r2-visit',[old.artifactIdentity,gaps.join('|')]))||visitedEdgeIdentities.has(e.edgeIdentity));if(sourceTargets.has(e.targetRelativePathOrModule)||previouslyConsumed){defer(e,'DEFERRED_DUPLICATE_OR_CYCLE');continue;}sourceTargets.add(e.targetRelativePathOrModule);if(admitted++>=budget.maxCandidatesPerSource){defer(e,'DEFERRED_FANOUT_LIMIT');continue;}queue.push(e);}
 };
 for(const a of artifacts){const now=observations.get(a.path);if(a.state==='OBSERVED'&&now?.contentSha256===a.contentSha256)enqueue(a,1);}
 let bootstrapRun=null,bootstrapAttemptCount=0,bootstrapReason=null;
 const attemptBootstrap=reason=>{bootstrapAttemptCount++;bootstrapReason=reason;bootstrapRun=bootstrap(root,ctx,qualification);admit(bootstrapRun.edges,1);delete bootstrapRun.edges;};
 if(options.bootstrap===true&&!queue.length&&!options.blockingContradiction&&!options.sufficientTruth&&!options.justifiedNextAction){attemptBootstrap('INITIAL_EMPTY_QUEUE');}
 // Changed acquired targets must be reached through their original recorded edge again.
 for(const h of history){if(fresh.changed.includes(h.targetRelativePathOrModule)){const e=discovered.find(x=>x.edgeIdentity===h.edgeIdentity);if(e)e.requalification=true;}}
 let stop=null;const stopPolicy=()=>{
  if(options.blockingContradiction)return 'STOP_BLOCKING_CONTRADICTION';
  if(options.sufficientTruth===true)return 'STOP_SUFFICIENT_TRUTH';
  if(options.justifiedNextAction===true)return 'STOP_JUSTIFIED_NEXT_ACTION';
  return null;
 };
 const drainQueue=()=>{while(queue.length){
  stop=stopPolicy();if(stop)break;
  if(ctx.exhausted||traversals.length>=budget.maxTraversedEdgesPerStage||performance.now()-ctx.started>=budget.maxElapsedMs){stop='STOP_BUDGET_REACHED';break;}
  const ds=dimensionsFor(activeClaims);for(const e of queue)e.priority=priority(e,ds,options.objective);queue.sort(compare);const allowance=Math.max(0,bounded.LIMITS.MAX_TOTAL_RANKING_ENTRIES-totalRankingEntries);const snapshot=bounded.boundedRankingSnapshot({ordinal:(prior.queueRankingSnapshots?.length??0)+queueRankingSnapshots.length+1,dimensionStates:ds,queue,totalEntryAllowance:allowance});queueRankingSnapshots.push(snapshot);totalRankingEntries+=snapshot.ordering.length;if(queueRankingSnapshots.length>bounded.LIMITS.MAX_QUEUE_SNAPSHOTS){const removed=queueRankingSnapshots.shift();totalRankingEntries-=removed.ordering.length;}const e=queue.shift();
  const gaps=e.currentlyAdmissibleSemanticDimensions.filter(d=>UNRESOLVED.has(ds[d]));
  if(!gaps.length){defer(e,'DEFERRED_NO_TARGET_GAP');continue;}
  if(e.depth>budget.maxTraversalDepth){defer(e,'DEFERRED_DEPTH_LIMIT');ctx.exhausted=true;continue;}
  const key=e.targetRelativePathOrModule,purpose=gaps.join('|'),old=artifacts.find(a=>a.path===key),obs=observations.get(key);
  const visit=old?id('r2-visit',[old.artifactIdentity,purpose]):null;
  if(seenTargets.has(key)||(old&&obs?.contentSha256===old.contentSha256&&(visitedArtifactContentIdentities.has(visit)||visitedEdgeIdentities.has(e.edgeIdentity)))){defer(e,'DEFERRED_DUPLICATE_OR_CYCLE');continue;}
  seenTargets.add(key);
  // Already refreshed bytes are reused. Duplicate targets do not consume another read.
  const before={...ctx.cost},observation=obs??read(root,key,ctx);
  const sameObservedIdentity=old&&old.contentSha256===observation.contentSha256;
  if(sameObservedIdentity&&(old.authority!==authority(e)||!gaps.includes(old.dimension))){defer(e,'DEFERRED_INCOMPATIBLE_PROVENANCE_ROUTE');continue;}
  const dimension=(sameObservedIdentity?old.dimension:null)??gaps.find(d=>ds[d]==='STALE')??gaps.find(d=>ds[d]!=='PARTIALLY_OBSERVED')??gaps[0],a=r1.artifact(root,key,dimension,authority(e),observation),claims=r1.claimsFor(a,subject);
  const record={...(e.discoveryBasis?.kind==='BOUNDED_BOOTSTRAP'?{discoveryBasis:e.discoveryBasis}:{}),...targeting.align(e),rankingInputs:{dimensionStates:{...ds},priority:[...e.priority],objective:options.objective??null},rawReference:e.rawReference,anchorClassification:e.anchorClassification,sourceDirectoryCandidate:e.sourceDirectoryCandidate,projectRootCandidate:e.projectRootCandidate,selectedAnchor:e.selectedAnchor,selectedTarget:e.selectedTarget,selectionBasis:e.selectionBasis,candidateChecks:e.candidateChecks,sourcePath:e.sourcePath,containerSourcePath:e.containerSourcePath,sourceArtifactIdentity:e.sourceArtifactIdentity,sourceContentIdentity:e.sourceContentIdentity,edgeIdentity:e.edgeIdentity,edgeClass:e.edgeClass,targetRelativePathOrModule:key,targetSemanticDimensions:gaps,priorDimensionStates:Object.fromEntries(gaps.map(d=>[d,ds[d]])),traversalReason:e.requalification?'STALE_SUPPORT_REQUALIFICATION':'EXPLICIT_EDGE_TO_UNRESOLVED_DIMENSION',depth:e.depth,budgetSnapshot:{limits:budget,before,after:{...ctx.cost}},discoveryOrdinal:++ordinal,resultingArtifactIdentity:observation.state==='OBSERVED'?a.artifactIdentity:null,resultingEvidenceIdentities:claims.flatMap(c=>c.evidenceIdentities),resultingClaimIdentities:claims.map(c=>c.claimIdentity),outcome:observation.state==='OBSERVED'?'TARGET_OBSERVED':'BLOCKED',reason:observation.reason??null,directoryTrace:observation.directoryAccounting?{SOURCE_ARTIFACT:e.sourcePath,EXTRACTED_REFERENCE:e.rawReference,REFERENCE_QUALIFICATION:{module:'reference-anchor.cjs',status:e.localityStatus,selectedTarget:e.selectedTarget},DIRECTORY_EDGE_ADMITTED:{edgeIdentity:e.edgeIdentity,edgeClass:e.edgeClass},DIRECTORY_TRAVERSAL:{module:'progressive-acquisition.cjs',function:'readDirectoryBounded'},CHILD_CANDIDATE_SELECTION:observation.directoryAccounting.files?.map(x=>x.path)??[],CHILD_ARTIFACT_ADMITTED:(observation.directoryFiles??[]).filter(x=>x.observation?.state==='OBSERVED').map(x=>x.path),CLAIM_AUTHORITY:claims.map(c=>({key:c.statement.key,authority:c.authority,verification:c.verification}))}:null};
  traversals.push(record);
  if(observation.state==='OBSERVED'){
   observations.set(key,observation);
   artifacts=artifacts.filter(x=>x.path!==key);artifacts.push(a);for(let i=activeClaims.length-1;i>=0;i--)if(activeClaims[i].scope.path===key)activeClaims.splice(i,1);activeClaims.push(...claims);
    if(Array.isArray(observation.directoryFiles)){for(const child of observation.directoryFiles){if(!child.observation||child.observation.state!=='OBSERVED')continue;observations.set(child.path,child.observation);const existing=artifacts.find(x=>x.path===child.path),ca=r1.artifact(root,child.path,'runtime','PHYSICAL_OBSERVATION',child.observation);if(existing&&existing.artifactIdentity!==ca.artifactIdentity){artifacts=artifacts.filter(x=>x.path!==child.path);for(let i=activeClaims.length-1;i>=0;i--)if(activeClaims[i].scope.path===child.path)activeClaims.splice(i,1);}const priorRoutes=existing&&existing.artifactIdentity===ca.artifactIdentity?r2p.routeEvidence({artifact:existing,history,legacyIds:prior.legacySeedIdentities??[]}):{supported:[]};if(!existing||existing.artifactIdentity!==ca.artifactIdentity||(!priorRoutes.initial&&!priorRoutes.legacy)){if(!artifacts.some(x=>x.artifactIdentity===ca.artifactIdentity)){artifacts.push(ca);activeClaims.push(...r1.claimsFor(ca,subject));}if(existing&&existing.artifactIdentity===ca.artifactIdentity&&(existing.authority!==ca.authority||existing.dimension!==ca.dimension))continue;const binding=makeChildBinding(root,a,key,child,ca,record);if(!history.some(h=>h.edgeIdentity===binding.edgeIdentity))history.push(binding);}}}
   if(Array.isArray(observation.directoryAccounting?.children)){const childEdges=observation.directoryAccounting.children.filter(c=>c.type==='DIRECTORY').map(c=>{const edge={edgeClass:'DIRECTORY_INDEX_REFERENCE',sourceArtifactIdentity:a.artifactIdentity,sourceContentIdentity:a.contentSha256,sourcePath:key,containerSourcePath:key,rawReference:c.path,referenceIntent:'BOUNDED_ACTUAL_CHILD_ENUMERATION',anchorClassification:'IN_ROOT_CHILD',sourceDirectoryCandidate:c.path,projectRootCandidate:null,selectedAnchor:'DIRECTORY_CHILD',selectedTarget:c.path,selectionBasis:'ACTUAL_FILESYSTEM_CHILD',candidateChecks:[{target:c.path,state:'EXISTS_DIRECTORY'}],status:'IN_ROOT',localityStatus:'IN_ROOT',relative:c.path,absolute:path.join(root,c.path),targetRelativePathOrModule:c.path,targetSemanticDimensions:CLASSES.DIRECTORY_INDEX_REFERENCE,discoveryBasis:{kind:'BOUNDED_ACTUAL_CHILD',parent:key,ordinal:c.ordinal},defaultTraversalEligibility:true,depth:e.depth+1};edge.edgeIdentity=id('r2-edge',edge);return edge;});if(childEdges.length)admit(childEdges,e.depth+1);}
   visitedEdgeIdentities.add(e.edgeIdentity);visitedArtifactContentIdentities.add(id('r2-visit',[a.artifactIdentity,purpose]));enqueue(a,e.depth+1);
  }
 }};
 drainQueue();
 if(!bootstrapRun&&options.bootstrap===true&&bootstrapAttemptCount===0&&!options.blockingContradiction&&!options.sufficientTruth&&!options.justifiedNextAction&&!ctx.exhausted&&!stopPolicy()){
  attemptBootstrap('POST_QUEUE_BOUNDED_RETRY');
  drainQueue();
 }
 if(!stop)stop=stopPolicy()??(ctx.exhausted?'STOP_BUDGET_REACHED':traversals.length?'STOP_QUEUE_EXHAUSTED_NO_ADDITIONAL_ADMISSIBLE_EVIDENCE':'STOP_NO_HIGH_VALUE_EDGES');
 for(const e of queue)defer(e,stop==='STOP_BUDGET_REACHED'?'DEFERRED_BUDGET_LIMIT':'DEFERRED_EARLY_STOP');
 if(bootstrapRun){for(const c of bootstrapRun.candidates){if(!c.edgeIdentity)continue;const t=traversals.find(e=>e.edgeIdentity===c.edgeIdentity),d=deferred.find(e=>e.edgeIdentity===c.edgeIdentity);c.outcome=t?.outcome??d?.outcome??'DEFERRED';c.reason=t?.reason??d?.reason??null;}bootstrapRun.contentCost={files:traversals.filter(e=>e.discoveryBasis?.kind==='BOUNDED_BOOTSTRAP').reduce((n,e)=>n+e.budgetSnapshot.after.files-e.budgetSnapshot.before.files,0),bytes:traversals.filter(e=>e.discoveryBasis?.kind==='BOUNDED_BOOTSTRAP').reduce((n,e)=>n+e.budgetSnapshot.after.bytes-e.budgetSnapshot.before.bytes,0)};}
 const after=dimensionsFor(activeClaims),gains=Object.keys(after).filter(d=>(['UNKNOWN','UNAVAILABLE','INDETERMINATE'].includes(priorStates[d])&&after[d]==='PARTIALLY_OBSERVED')||(priorStates[d]==='STALE'&&after[d]==='PARTIALLY_OBSERVED'));
 const baseObservationCost={files:prior.cumulativeFiles??0,bytes:prior.cumulativeBytes??0};
 const freshnessRefreshCost={...fresh.cost};
 const adaptiveTraversalCost={files:ctx.cost.files-fresh.cost.files,bytes:ctx.cost.bytes-fresh.cost.bytes,edgesAttempted:traversals.length,edgesObserved:traversals.filter(e=>e.outcome==='TARGET_OBSERVED').length,edgesBlocked:traversals.filter(e=>e.outcome==='BLOCKED').length,edgesDeferred:deferred.length};
 const costLedger={...(bootstrapRun?{bootstrapQualificationCost:bootstrapRun.cost,bootstrapContentCost:bootstrapRun.contentCost}:{}),anchorQualificationCost:{...anchorCost,contentFiles:0,contentBytes:0},baseObservationCost,freshnessRefreshCost,adaptiveTraversalCost,totalIntakeCost:{filesExamined:baseObservationCost.files+ctx.cost.files,bytesExamined:baseObservationCost.bytes+ctx.cost.bytes},scope:'Supporting subject content reads across saved stages and this intake. Reused payloads add zero reads. Receipt transport, module and metadata reads excluded; base instrumentation remains separate.'};
  const currentRows=new Map((fresh.observations??[]).map(item=>[item.path,item]));for(const [observedPath,observation] of observations){if(currentRows.has(observedPath))continue;currentRows.set(observedPath,{path:observedPath,state:observation.state,contentSha256:observation.contentSha256??null,bytes:observation.bytes??null,reason:observation.reason??null,physicalIdentityState:observation.state==='OBSERVED'?'UNCHANGED':'UNKNOWN',physicalIdentityReason:'OBSERVED_DURING_CURRENT_R2_INTAKE'});}fresh.observations=[...currentRows.values()];
  return {...(bootstrapRun||prior.bootstrapHistory?{bootstrapHistory:[...(prior.bootstrapHistory??[]),...(bootstrapRun?[bootstrapRun]:[])]}:{}),bootstrapAttempted:bootstrapAttemptCount>0,bootstrapAttemptCount,bootstrapReason,kind:'HITO_ADAPTIVE_EVIDENCE_DISCOVERY_R2',root,subjectIdentity:subject,stage:'R2',acquisitionCapability:targeting.OFFLINE,queueRankingSnapshots,dimensionsResolved:[],costLedger,referenceClassifications,legacySeedIdentities:prior.legacySeedIdentities??[],artifacts,claims:activeClaims,history:[...history,...traversals],visitedEdgeIdentities:[...visitedEdgeIdentities].sort(),visitedArtifactContentIdentities:[...visitedArtifactContentIdentities].sort(),discoveredEdges:discovered,traversedEdges:traversals,deferredEdges:deferred,deferredEdgeCount:deferred.length,stopReason:stop,budget,acquisitionCost:ctx.cost,cumulativeFiles:(prior.cumulativeFiles??0)+ctx.cost.files,cumulativeBytes:(prior.cumulativeBytes??0)+ctx.cost.bytes,stageMetrics:[],dimensionStates:after,priorDimensionStates:priorStates,materialSemanticGains:gains,successfulDeepening:gains.length>0,completeUnderstanding:false,refresh:{...fresh,claims:undefined},elapsedMs:performance.now()-ctx.started};
}
function cacheFile(root){return store.safe(root,path.join(store.paths(root).maatRoot,'adaptive-evidence-discovery-r2.json'));}
function diagnosticFile(root, data, error){
 const dir=store.safe(root,path.join(store.paths(root).maatRoot,'r2-provenance-diagnostics'));
 fs.mkdirSync(dir,{recursive:true});
 const candidate=(data?.artifacts??[]).map(a=>({path:a.path,artifactIdentity:a.artifactIdentity,dimension:a.dimension,authority:a.authority,contentIdentity:a.contentSha256??a.reason,routes:r2p.routeEvidence({artifact:a,history:data?.history??[],legacyIds:data?.legacySeedIdentities??[]}).supported,historyIdentities:(data?.history??[]).filter(h=>h.resultingArtifactIdentity===a.artifactIdentity).map(h=>h.edgeIdentity??h.resultingArtifactIdentity)}));
 const payload={kind:'HITO_R2_PROVENANCE_DIAGNOSTIC_R1',canonical:false,error:error?.message??String(error),root,subjectIdentity:data?.subjectIdentity??null,validatorStage:'BEFORE_CANONICAL_R2_RECEIPT_PERSISTENCE',candidates:candidate};
 const raw=JSON.stringify(payload);if(Buffer.byteLength(raw,'utf8')>65536)throw new Error('R2_DIAGNOSTIC_LIMIT');
 const file=path.join(dir,`diagnostic-${store.sha(Buffer.from(raw)).slice(0,32)}.json`);if(!store.exists(file))fs.writeFileSync(file,raw+'\n',{flag:'wx'});
 return file;
}
function load(root,subject){const p=cacheFile(root);if(!store.exists(p))return null;let raw;try{raw=bounded.readReceiptFile(p);}catch(error){if(error.message==='R2_BOUNDED_STATE_RECEIPT_BYTES_LIMIT')throw Error('R2_RECEIPT_LIMIT');throw error;}const {digest,data}=JSON.parse(raw.toString('utf8'));if(!data||digest!==id('receipt',data)||data.root!==root||data.subjectIdentity!==subject||data.kind!=='HITO_ADAPTIVE_EVIDENCE_DISCOVERY_R2')throw Error('R2_RECEIPT_BINDING');bounded.assertStateCounts(data);data.queueRankingSnapshots=bounded.normalizeLegacyRankingSnapshots(data.queueRankingSnapshots);
 validateBootstrapHistory(root,data);
 const legacy=data.legacySeedIdentities?.length?r1.load(root,subject):null;
 const work=bounded.createWorkCounters();validateChildBindings(data,work);const historyByArtifact=new Map();for(const h of data.history)if(h.resultingArtifactIdentity){historyByArtifact.set(h.resultingArtifactIdentity,h);bounded.recordWork(work,'HISTORY_LOOKUPS');}
 for(const a of data.artifacts){bounded.recordWork(work,'ARTIFACT_PROVENANCE_CHECKS');if((a.path!=='.'&&!r1.safeRelative(a.path))||a.artifactIdentity!==id('artifact',[root,a.path,a.contentSha256??a.reason])||(a.state==='OBSERVED'&&store.sha(Buffer.from(a.content))!==a.contentSha256))throw Error('R2_ARTIFACT_BINDING');const h=historyByArtifact.get(a.artifactIdentity);if(h){if(!CLASSES[h.edgeClass]||authority(h)!==a.authority||!h.targetSemanticDimensions.includes(a.dimension))throw Error('R2_AUTHORITY_ESCALATION');}else if(data.legacySeedIdentities?.includes(a.artifactIdentity)){if(!legacy?.artifacts.some(x=>JSON.stringify(x)===JSON.stringify(a)))throw Error('R2_LEGACY_SEED_BINDING');}else if(a.path!=='README.md'||a.authority!=='DOCUMENTARY_EVIDENCE_ONLY'||a.dimension!=='architecture'||a.state!=='OBSERVED')throw Error('R2_UNBOUND_SEED');}
 bounded.recordWork(work,'HISTORY_LOOKUPS',data.history.length);r2p.validateReceipt({root,subject,receipt:{request:null,acquisition:null},data,allowHistoricalReadme:true,onHistoryItems:count=>bounded.recordWork(work,'HISTORY_LOOKUPS',count)});
 const expected=[];for(const artifact of data.artifacts)expected.push(...r1.claimsFor(artifact,subject));try{bounded.validateClaimBindings(data.claims,expected,work);}catch{throw Error('R2_SUPPORT_BINDING');}
 Object.defineProperty(data,'reconstructionWork',{value:{...work,limits:{...bounded.RECONSTRUCTION_WORK_LIMITS},totalLimit:bounded.MAX_TOTAL_RECONSTRUCTION_WORK,indexedProvenance:true},enumerable:false,configurable:true});return data;}
function project(base,cache,fresh){
 const output=r1.deepen(base,cache,fresh,cache.elapsedMs??0),truth=output.truth;
 // Pure semantic extraction over the exact admitted artifact bytes; no additional target reads.
 const observedNow=new Map((fresh.observations??[]).map(x=>[x.path,x]));
 const currentArtifacts=cache.artifacts.filter(a=>{const now=observedNow.get(a.path);return a.state==='OBSERVED'&&!!now&&physical.comparePhysicalIdentity({...a,path:a.path},{...now,path:now.path??a.path}).state==='UNCHANGED';});
 const qualifiedSemanticFacts=require('./qualified-semantic-extraction.cjs').extract(currentArtifacts);
 truth.qualifiedSemanticFacts=qualifiedSemanticFacts;
 truth.semanticResultIdentity=id('r2-state',[truth.semanticResultIdentity,qualifiedSemanticFacts.facts.map(f=>f.factIdentity)]);
 for(const surface of [output.cli,output.vscode,output.agent]) if(surface) surface.qualifiedSemanticFacts=qualifiedSemanticFacts;
 if(output.cli?.status)output.cli.status.qualifiedSemanticFacts=qualifiedSemanticFacts;
 if(output.cli?.mri)output.cli.mri.qualifiedSemanticFacts=qualifiedSemanticFacts;
 truth.refresh.costScope='Additional projection/reopen refresh only; intake refresh and traversal are itemized in costLedger';
 truth.refresh.postIntakeRefreshCost={...fresh.cost};
 Object.assign(truth,{...(cache.bootstrapHistory?{bootstrapHistory:cache.bootstrapHistory}:{}),bootstrapAttempted:cache.bootstrapAttempted,bootstrapAttemptCount:cache.bootstrapAttemptCount,bootstrapReason:cache.bootstrapReason,acquisitionCapability:cache.acquisitionCapability,queueRankingSnapshots:cache.queueRankingSnapshots,dimensionsResolved:cache.dimensionsResolved,discoveredEdges:cache.discoveredEdges,traversedEdges:cache.traversedEdges,deferredEdges:cache.deferredEdges,deferredEdgeCount:cache.deferredEdgeCount,stopReason:truth.contradictions.blocking?'STOP_BLOCKING_CONTRADICTION':cache.stopReason,materialSemanticGains:cache.materialSemanticGains,successfulDeepening:cache.successfulDeepening,acquisitionBudget:cache.budget,traversalHistory:cache.history,referenceClassifications:cache.referenceClassifications,costLedger:cache.costLedger});
 truth.reconstructionWork={reopen:cache.reconstructionWork??null,refresh:fresh.reconstructionWork??null};
 truth.semanticResultIdentity=id('r2-state',[truth.semanticResultIdentity,truth.traversedEdges,truth.deferredEdges,truth.stopReason,truth.nextStep,truth.authorityBoundary]);
 const truthRef=truth.semanticResultIdentity;for(const surface of [output.cli,output.vscode,output.agent]){surface.truthRef=truthRef;delete surface.truth;}if(output.cli.status?.semanticResultIdentity)output.cli.status.semanticResultIdentity=truthRef;if(output.cli.why){output.cli.why.truthRef=truthRef;delete output.cli.why.truth;}if(output.vscode.progressiveAcquisition){output.vscode.progressiveAcquisition.truthRef=truthRef;delete output.vscode.progressiveAcquisition.truth;}if(output.agent.progressiveAcquisition){output.agent.progressiveAcquisition.truthRef=truthRef;delete output.agent.progressiveAcquisition.truth;}
 if(truth.freshness?.acquisition)truth.freshness.acquisition.scope='Base entry freshness only; see truth.costLedger for adaptive intake totals';
 output.cli.mri.sourceSemanticResultIdentity=truth.semanticResultIdentity;output.adaptiveAcquisitionMetrics={costLedger:cache.costLedger,cost:cache.acquisitionCost,budget:cache.budget,reconstructionWork:cache.reconstructionWork??null,successfulDeepening:cache.successfulDeepening,materialSemanticGains:cache.materialSemanticGains};return output;
}
async function apply(base,command,options={},receipt){
 const root=base.binding.activeRoot,subject=base.truth.subjectIdentity;let cache=load(root,subject);
 if(command!=='intake'&&!cache)return r1.apply(base,command,options);
 if(command==='intake'){
  if(options.stage&&!cache)return r1.apply(base,command,options);
  if(!cache){const legacy=r1.load(root,subject);const seeds=legacy?.artifacts??(receipt?.request.documentaryEvidence??[]).map(e=>r1.artifact(root,e.provenance.sourcePath,'architecture','DOCUMENTARY_EVIDENCE_ONLY',{state:'OBSERVED',content:e.content,contentSha256:e.provenance.contentSha256,bytes:Buffer.byteLength(e.content)}));if(receipt&&!legacy)for(const seed of seeds)seed.provenance=r2p.initialProvenance({root,subject,receipt,artifact:seed});cache={artifacts:seeds,history:[],legacySeedIdentities:legacy?seeds.map(a=>a.artifactIdentity):[],cumulativeFiles:legacy?.cumulativeFiles??receipt?.acquisition?.filesExamined??0,cumulativeBytes:legacy?.cumulativeBytes??receipt?.acquisition?.bytesExamined??0};}
  const input={bootstrap:true,budget:options.budget,objective:options.objective,agentSuggestedEdges:options.agentSuggestedEdges,dimensionStates:Object.fromEntries(Object.entries(base.truth.coverage?.dimensions??{}).map(([d,v])=>[d,v.state])),blockingContradiction:base.truth.contradictions?.blocking===true,sufficientTruth:base.truth.coverage?.completeUnderstanding===true,justifiedNextAction:base.truth.nextStep?.executionAuthority===true};
  // Preserve the exact historical empty receipt before replacing current transport.
  const previousFile=cacheFile(root);if(cache.artifacts.length===0&&store.exists(previousFile)){const raw=fs.readFileSync(previousFile),archive=store.safe(root,path.join(store.paths(root).maatRoot,'adaptive-empty-'+store.sha(raw)+'.json'));if(!store.exists(archive))fs.writeFileSync(archive,raw,{flag:'wx'});else if(!fs.readFileSync(archive).equals(raw))throw Error('R2_EMPTY_HISTORY_BINDING');}
  cache=run(root,subject,cache,input);
  try {
   validateChildBindings(cache,bounded.createWorkCounters());cache.artifacts=cache.artifacts.map(a=>r2p.canonicalizeArtifactRoute({artifact:a,history:cache.history,legacyIds:cache.legacySeedIdentities}).artifact);
   r2p.validateReceipt({root,subject,receipt:receipt??{request:null,acquisition:null},data:cache});
  } catch(error) {
   try { diagnosticFile(root,cache,error); } catch { /* original fail-closed error wins */ }
   throw error;
  }
  const p=cacheFile(root);bounded.writeReceiptAtomically(p,{digest:id('receipt',cache),data:cache});
  const fresh={claims:cache.claims,changed:cache.refresh.changed,uncertain:cache.refresh.uncertain,observations:cache.refresh.observations,cost:{files:0,bytes:0},semanticClaimsRebuilt:0};const out=project(base,cache,fresh);out.payload=out.truth;return out;
 }
 const ctx={budget:cache.budget,cost:{files:0,bytes:0},started:performance.now(),exhausted:false};const fresh=r1.refresh(root,cache,(rt,rel)=>read(rt,rel,ctx));fresh.cost={...ctx.cost};const out=project(base,cache,fresh);out.payload=out.cli[command];return out;
}
module.exports={apply,run,read,extract,resolveLocal,prune,priority,compare,states,budgetSpec,DEFAULT_BUDGET,CLASSES,STOPS,UNRESOLVED,validateChildBindings,project};
