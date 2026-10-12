'use strict';
// Bounded noncanonical evidence adapter. Canonical model and G15 remain owners.
const fs=require('node:fs'),path=require('node:path'),{performance}=require('node:perf_hooks');
const store=require('../contracts/product-entry-persistence.cjs');
const bounded=require('../contracts/r2-bounded-state.cjs');
const physical=require('./physical-currentness.cjs');
const {assessAcquisitionContradictions}=require('../phase4/acquisition-contradiction-gate.cjs');
const LIMITS=Object.freeze({files:48,bytes:2097152,fileBytes:262144,entries:64,directoryDepth:1,directoryFiles:8});
const DIMENSIONS=['continuity','projectMetadata','workspace','structure','architecture','status','runtime','configuration','tests','evidence','declaredIntent','ownership','integration','behavior'];
const T1=[['README.md','architecture','DOCUMENTARY_EVIDENCE_ONLY'],['package.json','projectMetadata','STRUCTURAL_DECLARATION'],['pyproject.toml','projectMetadata','STRUCTURAL_DECLARATION'],['Cargo.toml','projectMetadata','STRUCTURAL_DECLARATION'],['go.mod','projectMetadata','STRUCTURAL_DECLARATION'],['pom.xml','projectMetadata','STRUCTURAL_DECLARATION'],['pnpm-workspace.yaml','workspace','STRUCTURAL_DECLARATION'],['.maat/first-observation-entry-r1.json','continuity','PHYSICAL_OBSERVATION']];
const T2=[['ARCHITECTURE.md','architecture','DOCUMENTARY_EVIDENCE_ONLY'],['STATUS.md','status','DOCUMENTARY_EVIDENCE_ONLY'],['docs/architecture.md','architecture','DOCUMENTARY_EVIDENCE_ONLY'],['docs/status.md','status','DOCUMENTARY_EVIDENCE_ONLY'],['src/index.js','runtime','PHYSICAL_OBSERVATION'],['src/main.js','runtime','PHYSICAL_OBSERVATION'],['src/main.py','runtime','PHYSICAL_OBSERVATION'],['main.py','runtime','PHYSICAL_OBSERVATION'],['index.js','runtime','PHYSICAL_OBSERVATION'],['tsconfig.json','configuration','STRUCTURAL_DECLARATION'],['Dockerfile','configuration','STRUCTURAL_DECLARATION'],['.github/workflows/ci.yml','configuration','STRUCTURAL_DECLARATION'],['.github/workflows/ci.yaml','configuration','STRUCTURAL_DECLARATION'],['tests/manifest.json','tests','STRUCTURAL_DECLARATION'],['evidence/manifest.json','evidence','STRUCTURAL_DECLARATION']];
const id=(tag,x)=>tag+':'+store.sha(Buffer.from(JSON.stringify(x)));
// Deliberately bounded TOML reader: only the exact scalar/table grammar used by
// the supported project metadata fields is admitted. Everything else fails closed.
function boundedPyproject(content){
 const out={}, lines=String(content).split(/\r?\n/), sections=[]; let section='';
 for(const raw of lines){
  const line=raw.replace(/\s+#.*$/,'').trim(); if(!line)continue;
  const header=/^\[([^\[\]]+)\]$/.exec(line); if(header){section=header[1].trim();sections.push(section);continue;}
  const m=/^([A-Za-z][A-Za-z0-9_-]*)\s*=\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")$/.exec(line);
  if(!m)continue;
  const key=m[1], rawValue=m[2], value=rawValue[0]==='"'?rawValue.slice(1,-1).replace(/\\(["\\nrt])/g,(_,c)=>({n:'\n',r:'\r',t:'\t'}[c]??c)):rawValue.slice(1,-1);
  if(section==='project'&&['name','version','description','requires-python'].includes(key))out[`project.${key}`]=value;
  if(section==='build-system'&&key==='build-backend')out['build-system.build-backend']=value;
 }
 // A malformed target assignment must not yield a guessed value. Require the
 // supported sections to have syntactically valid target lines when present.
 for(const [section, keys] of [['project',['name','version','description','requires-python']],['build-system',['build-backend']]]){
  if(!sections.includes(section))continue;
  const body=lines.slice(lines.findIndex(x=>x.replace(/\s+#.*$/,'').trim()===`[${section}]`)+1).join('\n').split(/\n\s*\[/,1)[0];
  for(const key of keys){if(new RegExp(`^\\s*${key}\\s*=`, 'm').test(body)&&!Object.hasOwn(out,`${section}.${key}`))delete out[`${section}.${key}`];}
 }
 return out;
}
function pythonModulePath(rel){
 if(typeof rel!=='string'||!/^((?:[A-Za-z0-9_-]+\/)*)[A-Za-z0-9_-]+\.py$/.test(rel))return null;
 const noExt=rel.slice(0,-3).replace(/\/$/,''); if(noExt.endsWith('/__init__'))return noExt.slice(0,-9).replace(/\//g,'.');
 return noExt.replace(/\//g,'.');
}
// R9F-R1 hardening: strict bounded scalar parser. Unsupported or malformed
// target syntax yields no claim; it never falls back to a guessed value.
function boundedPyprojectStrict(content){
 const out={},lines=String(content).split(/\r?\n/),supported={project:new Set(['name','version','description','requires-python']),'build-system':new Set(['build-backend'])};
 const seenTables=new Set(),seenKeys=new Set(),invalidTables=new Set(),invalidKeys=new Set();let section='';
 const stripComment=line=>{let quote=null;for(let i=0;i<line.length;i++){const c=line[i];if(quote===null&&(c==='"'||c==="'")){quote=c;continue;}if(quote!==null){if(c===quote){quote=null;continue;}if(c==='\\'&&quote==="'")return null;if(c==='\\'&&quote==='"')i++;continue;}if(c==='#')return line.slice(0,i);}return quote===null?line:null;};
 const validRawChar=c=>{const n=c.codePointAt(0);return n===9||(n>=0x20&&n!==0x7f);};
 const decode=raw=>{if(raw.length<2||raw[0]!==raw.at(-1)||raw.startsWith("'''" )||raw.startsWith('"""'))return null;const q=raw[0],body=raw.slice(1,-1);if(q==="'"){if(body.includes('\\')||[...body].some(c=>!validRawChar(c)))return null;return body;}let value='';for(let i=0;i<body.length;i++){const c=body[i];if(c!=='\\'){if(!validRawChar(c))return null;value+=c;continue;}const n=body[++i];if(n==='u'||n==='U'){const count=n==='u'?4:8,hex=body.slice(i+1,i+1+count);if(!new RegExp(`^[0-9A-Fa-f]{${count}}$`).test(hex))return null;const cp=parseInt(hex,16);if(cp>0x10ffff||(cp>=0xd800&&cp<=0xdfff))return null;value+=String.fromCodePoint(cp);i+=count;continue;}const map={"\\":"\\",'"':'"',n:'\n',r:'\r',t:'\t'};if(!Object.hasOwn(map,n))return null;value+=map[n];}return value;};
 for(const raw of lines){const cleaned=stripComment(raw);if(cleaned===null)continue;const line=cleaned.trim();if(!line)continue;const header=/^\[([^\[\]]+)\]$/.exec(line);if(header){section=header[1].trim();if(!supported[section]){section='';continue;}if(seenTables.has(section))invalidTables.add(section);else seenTables.add(section);continue;}if(!supported[section])continue;const assign=/^([A-Za-z][A-Za-z0-9_-]*)\s*=\s*(.+)$/.exec(line);if(!assign)continue;const key=assign[1];if(!supported[section].has(key))continue;const idKey=`${section}.${key}`;if(seenKeys.has(idKey)){invalidKeys.add(idKey);continue;}seenKeys.add(idKey);const value=decode(assign[2].trim());if(value===null){invalidKeys.add(idKey);continue;}out[idKey]=value;}
 for(const key of invalidKeys)delete out[key];for(const table of invalidTables)for(const key of supported[table])delete out[`${table}.${key}`];return out;
}
function boundedPyprojectAuthority(content){
 const parsed=boundedPyprojectStrict(content);let invalid=false,section='',previous=new Set();
 const strip=line=>{let q=null;for(let i=0;i<line.length;i++){const c=line[i];if(q===null&&(c==='"'||c==="'")){q=c;continue;}if(q!==null){if(c===q)q=null;else if(c==='\\'&&q==="'")return null;else if(c==='\\')i++;continue;}if(c==='#')return line.slice(0,i);}return q===null?line:null;};
 for(const raw of String(content).split(/\r?\n/)){const cleaned=strip(raw);if(cleaned===null){invalid=true;continue;}const line=cleaned.trim();if(!line)continue;const header=/^\[([A-Za-z0-9_.-]+)\]$/.exec(line);if(header){section=header[1];previous=new Set();continue;}if(/^\[/.test(line)){invalid=true;continue;}if(!['project','build-system'].includes(section))continue;const m=/^([A-Za-z][A-Za-z0-9_-]*)\s*=\s*(.+)$/.exec(line);if(!m){invalid=true;continue;}const key=m[1],value=m[2].trim(),idKey=`${section}.${key}`;if(previous.has(idKey)){invalid=true;continue;}previous.add(idKey);if(['project.name','project.version','project.description','project.requires-python','build-system.build-backend'].includes(idKey)){if(!Object.hasOwn(parsed,idKey))invalid=true;}else if((value.startsWith('"')&&(!value.endsWith('"')||/\\(?!["\\nrtuU])/.test(value)))||(value.startsWith("'")&&(!value.endsWith("'")||value.slice(1,-1).includes('\\')))){invalid=true;}}
 parsed.__invalidDocument=invalid;return parsed;
}
function safeRelative(s){return typeof s==='string'&&s.length>0&&s.length<512&&!s.includes('\\')&&!s.includes(':')&&!path.isAbsolute(s)&&s.split('/').every(x=>x&&x!=='.'&&x!=='..');}
function readBounded(root,rel,budget){
 if(!safeRelative(rel))return {state:'UNAVAILABLE',reason:'UNSAFE_PATH'};
 let p;try{p=store.safe(root,path.join(root,rel));}catch(e){return {state:'UNAVAILABLE',reason:'LINK_OR_ROOT_ESCAPE'};}
 let stat;try{stat=fs.lstatSync(p);}catch(e){if(e.code==='ENOENT')return {state:'UNAVAILABLE',reason:'NOT_FOUND_AT_CAPTURE'};return {state:'INDETERMINATE',reason:e.code};}
 if(!stat.isFile())return {state:'UNAVAILABLE',reason:'NOT_REGULAR_FILE'};
 if(stat.size>LIMITS.fileBytes||budget.files>=LIMITS.files||budget.bytes+stat.size>LIMITS.bytes)return {state:'INDETERMINATE',reason:'ACQUISITION_LIMIT'};
 const fd=fs.openSync(p,'r');let b;try{const raw=Buffer.alloc(Math.min(LIMITS.fileBytes+1,LIMITS.bytes-budget.bytes+1));const n=fs.readSync(fd,raw,0,raw.length,0);b=raw.subarray(0,n);}finally{fs.closeSync(fd);}
 budget.files++;budget.bytes+=b.length;
 if(b.length>LIMITS.fileBytes||budget.bytes>LIMITS.bytes)return {state:'INDETERMINATE',reason:'ACQUISITION_LIMIT'};
  return physical.observeBytes(b,store.sha);
}
function structure(root){
 const dir=fs.opendirSync(root),entries=[];let truncated=false;
 try{let e;while((e=dir.readSync())){if(entries.length===LIMITS.entries){truncated=true;break;}entries.push({name:e.name,type:e.isSymbolicLink()?'LINK':e.isDirectory()?'DIRECTORY':e.isFile()?'FILE':'OTHER'});}}finally{dir.closeSync();}
 entries.sort((a,b)=>a.name<b.name?-1:a.name>b.name?1:0);
 const content=JSON.stringify({entries,truncated});return {state:'OBSERVED',content,contentSha256:store.sha(Buffer.from(content)),bytes:0};
}
function artifact(root,rel,dimension,authority,observation){return {artifactIdentity:id('artifact',[root,rel,observation.contentSha256??observation.reason]),path:rel,dimension,authority,...observation};}
function claimsFor(a,subject){
 if(a.state!=='OBSERVED')return [];
 const statements=[{key:'artifact',value:a.authority==='DOCUMENTARY_EVIDENCE_ONLY'?'Documentary content captured; statements not verified':a.authority==='STRUCTURAL_DECLARATION'?'Structural declaration captured; runtime not verified':'Physical bytes or bounded directory entries observed; behavior not verified'}];
  if(a.path==='package.json'){
   try{const p=JSON.parse(a.content);for(const k of ['name','version','main','workspaces','dependencies','devDependencies','scripts','bin'])if(Object.hasOwn(p,k))statements.push({key:k,value:p[k]});}catch{}
  }
  if(a.path==='pyproject.toml'){
   const parsed=boundedPyprojectAuthority(a.content);
   for(const k of ['project.name','project.version','project.description','project.requires-python','build-system.build-backend'])if(Object.hasOwn(parsed,k))statements.push({key:k,value:parsed[k],dimension:k==='project.description'?'projectMetadata':k.startsWith('build-system')||k.endsWith('requires-python')?'configuration':'projectMetadata',authority:k==='project.description'?'DOCUMENTARY_EVIDENCE_ONLY':'PHYSICAL_OBSERVATION',verification:k==='project.description'?'NOT_VERIFIED':'PHYSICALLY_OBSERVED'});
  }
  const modulePath=pythonModulePath(a.path);
  if(modulePath)statements.push({key:'modulePath',value:modulePath,dimension:'structure',authority:'PHYSICAL_OBSERVATION',verification:'PHYSICALLY_OBSERVED'});
  if(/^tests\/[^/]+(?:\/[^/]+)*\.(?:py|js|ts|tsx|jsx|mjs|cjs)$/.test(a.path))statements.push({key:'testDefinition',value:'TEST_DEFINITION_AVAILABLE',dimension:'tests',authority:'PHYSICAL_OBSERVATION',verification:'PHYSICALLY_OBSERVED'});
 if(a.authority==='DOCUMENTARY_EVIDENCE_ONLY'){
  // Only explicit documentary entrypoint statements are compared; arbitrary prose stays documentary.
  for(const line of a.content.split(/\r?\n/).slice(0,256)){const match=/^entrypoint:\s*([^\s]+)\s*$/i.exec(line);if(match&&safeRelative(match[1]))statements.push({key:'entrypoint',value:match[1]});}
 }
 const evidenceIdentity=id('evidence',[a.artifactIdentity,a.contentSha256]);
  return statements.map(s=>{const claimIdentity=id('claim',[subject,a.artifactIdentity,s]);return {claimIdentity,semanticDimension:s.dimension??a.dimension,statement:s,evidenceIdentities:[evidenceIdentity],artifactIdentities:[a.artifactIdentity],contentIdentities:[a.contentSha256],supportEdgeIdentity:id('support',[a.artifactIdentity,evidenceIdentity,claimIdentity]),scope:{subjectIdentity:subject,path:a.path},authority:s.authority??a.authority,verification:s.verification??((s.authority??a.authority)==='STRUCTURAL_DECLARATION'?'STRUCTURALLY_SUPPORTED':(s.authority??a.authority)==='PHYSICAL_OBSERVATION'?'PHYSICALLY_OBSERVED':'NOT_VERIFIED'),currentness:'CURRENT',currentnessBasis:'Supporting artifact identity at bounded refresh; assertion truth is separate',invalidationDependencies:[a.path],canonicalAuthority:false};});
}
function directoryCandidates(entries){
 const rank=e=>{const n=e.name.toLowerCase();if(n==='readme.md'||n==='package.json'||n==='pyproject.toml'||n==='go.mod'||n==='cargo.toml')return 0;if(/^test|tests?/.test(n))return 1;if(/^src|lib|cmd|internal/.test(n))return 2;if(/\.(js|ts|py|go|rs|java|md|json|yaml|yml)$/.test(n))return 3;return 9;};
 return entries.filter(e=>e.type==='FILE').sort((a,b)=>rank(a)-rank(b)||a.name.localeCompare(b.name)).slice(0,LIMITS.directoryFiles);
}
function readDirectoryBounded(root,rel,budget,depth=1){
 if(!safeRelative(rel))return {state:'UNAVAILABLE',reason:'ROOT_CONFINEMENT',directoriesExamined:0,entriesExamined:0,edgesGenerated:0,edgesTraversed:0,edgesBlocked:1,edgesDeferred:0,maxDepth:depth,stopReason:'ROOT_CONFINEMENT',files:[]};
 if(depth>LIMITS.directoryDepth)return {state:'UNAVAILABLE',reason:'DIRECTORY_DEPTH_LIMIT',directoriesExamined:0,entriesExamined:0,edgesGenerated:0,edgesTraversed:0,edgesBlocked:1,edgesDeferred:0,maxDepth:depth,stopReason:'DIRECTORY_DEPTH_LIMIT',files:[]};
 let p;try{p=store.safe(root,path.join(root,rel));}catch{return {state:'UNAVAILABLE',reason:'LINK_OR_ROOT_ESCAPE',directoriesExamined:0,entriesExamined:0,edgesGenerated:0,edgesTraversed:0,edgesBlocked:1,edgesDeferred:0,maxDepth:depth,stopReason:'ROOT_CONFINEMENT',files:[]};}
 let stat;try{stat=fs.lstatSync(p);}catch(e){return {state:'UNAVAILABLE',reason:e.code,directoriesExamined:0,entriesExamined:0,edgesGenerated:0,edgesTraversed:0,edgesBlocked:0,edgesDeferred:0,maxDepth:depth,stopReason:e.code,files:[]};}
 if(!stat.isDirectory()||stat.isSymbolicLink())return {state:'UNAVAILABLE',reason:'NOT_REGULAR_DIRECTORY',directoriesExamined:0,entriesExamined:0,edgesGenerated:0,edgesTraversed:0,edgesBlocked:1,edgesDeferred:0,maxDepth:depth,stopReason:'NOT_REGULAR_DIRECTORY',files:[]};
 const entries=[];let truncated=false;const dir=fs.opendirSync(p);try{let e;while((e=dir.readSync())){if(entries.length===LIMITS.entries){truncated=true;break;}entries.push({name:e.name,type:e.isSymbolicLink()?'LINK':e.isDirectory()?'DIRECTORY':e.isFile()?'FILE':'OTHER'});}}finally{dir.closeSync();}
 entries.sort((a,b)=>a.name.localeCompare(b.name));const selected=directoryCandidates(entries),files=[];for(const e of selected){if(budget.files>=LIMITS.files||budget.bytes>=LIMITS.bytes)break;const child=path.posix.join(rel,e.name),obs=readBounded(root,child,budget);files.push({path:child,observation:obs});}
 return {state:'OBSERVED',content:JSON.stringify({entries:entries.map(e=>({name:e.name,type:e.type})),truncated}),directoriesExamined:1,entriesExamined:entries.length,edgesGenerated:entries.filter(e=>e.type==='DIRECTORY'||e.type==='LINK').length,edgesTraversed:0,edgesBlocked:entries.filter(e=>e.type==='LINK').length,edgesDeferred:entries.filter(e=>e.type==='DIRECTORY').length,maxDepth:depth,stopReason:truncated?'ENTRY_BUDGET_EXHAUSTED':'DIRECTORY_BOUND',children:entries.map((e,ordinal)=>({path:path.posix.join(rel,e.name),type:e.type,ordinal,depth:depth+1,disposition:e.type==='LINK'?'BLOCKED':e.type==='DIRECTORY'?'DEFERRED':'CANDIDATE'})),files};
}
function cachePath(root,stage){return store.safe(root,path.join(store.paths(root).maatRoot,'progressive-acquisition-'+stage.toLowerCase()+'-r1.json'));}
function load(root,subject){
 let cached=null;
 for(const stage of ['T1','T2']){const p=cachePath(root,stage);if(!store.exists(p))continue;
  const st=fs.statSync(p);if(st.size>8388608)throw Error('PSA_RECEIPT_LIMIT');
  const parsed=JSON.parse(fs.readFileSync(p,'utf8')),x=parsed.data;
  if(!x||parsed.digest!==id('receipt',x)||x.root!==root||x.subjectIdentity!==subject||x.stage!==stage||x.kind!=='HITO_PROGRESSIVE_ACQUISITION_R1'||!Array.isArray(x.artifacts)||x.artifacts.length>64)throw Error('PSA_RECEIPT_BINDING');
  // Validate stored support against the bounded bytes; never admit serialized caller authority.
  for(const a of x.artifacts){if(a.path!=='.'&&!safeRelative(a.path))throw Error('PSA_UNSAFE_CACHE_PATH');const selected=[...T1,...T2].find(row=>row[0]===a.path);const expectedClass=selected?.[2]??'PHYSICAL_OBSERVATION';const expectedDimension=selected?.[1]??(a.path==='.'?'structure':'runtime');if(a.authority!==expectedClass||a.dimension!==expectedDimension)throw Error('PSA_AUTHORITY_ESCALATION');if(a.artifactIdentity!==id('artifact',[root,a.path,a.contentSha256??a.reason]))throw Error('PSA_ARTIFACT_BINDING');if(a.state==='OBSERVED'&&store.sha(Buffer.from(a.content))!==a.contentSha256)throw Error('PSA_CONTENT_BINDING');}
  const expected=x.artifacts.flatMap(a=>claimsFor(a,subject));
  if(JSON.stringify(expected)!==JSON.stringify(x.claims))throw Error('PSA_CLAIM_SUPPORT_BINDING');
  cached=x;
 }
 return cached;
}
function persist(root,x){const p=cachePath(root,x.stage);const fd=fs.openSync(p,'wx');try{fs.writeFileSync(fd,JSON.stringify({digest:id('receipt',x),data:x})+'\n');fs.fsyncSync(fd);}finally{fs.closeSync(fd);}}
function acquire(root,subject,stage,prior,upstreamNext){
 const started=performance.now();
 if(!['T1','T2'].includes(stage))throw Error('PSA_STAGE_REQUIRES_T1_OR_T2');
 const budget={files:0,bytes:0,directoriesExamined:0,entriesExamined:0,edgesGenerated:0,edgesTraversed:0,edgesBlocked:0,edgesDeferred:0,maxDepth:0,stopReason:'SELECTION_COMPLETE'},artifacts=prior?structuredClone(prior.artifacts):[],known=new Set(artifacts.map(a=>a.path));
 const selections=stage==='T1'?T1:[...T1,...T2];
 if(!known.has('.')){artifacts.push(artifact(root,'.','structure','PHYSICAL_OBSERVATION',structure(root)));known.add('.');}
 for(const [rel,dim,authority] of selections){if(known.has(rel))continue;known.add(rel);artifacts.push(artifact(root,rel,dim,authority,readBounded(root,rel,budget)));}
 if(stage==='T2'){
  const pkg=artifacts.find(a=>a.path==='package.json'&&a.state==='OBSERVED');let main;
  try{main=JSON.parse(pkg?.content).main;}catch{}
  if(safeRelative(main)&&!known.has(main)){known.add(main);artifacts.push(artifact(root,main,'runtime','PHYSICAL_OBSERVATION',readBounded(root,main,budget)));}
  const entrypoints=artifacts.flatMap(a=>a.state==='OBSERVED'?claimsFor(a,subject).filter(c=>c.statement.key==='entrypoint').map(c=>c.statement.value):[]);
  for(const rel of [...new Set(entrypoints)]){if(known.has(rel))continue;const dir=readDirectoryBounded(root,rel,budget,1);budget.directoriesExamined+=dir.directoriesExamined;budget.entriesExamined+=dir.entriesExamined;budget.edgesGenerated+=dir.edgesGenerated;budget.edgesTraversed+=dir.state==='OBSERVED'?1:0;budget.edgesBlocked+=dir.edgesBlocked;budget.edgesDeferred+=dir.edgesDeferred;budget.maxDepth=Math.max(budget.maxDepth,dir.maxDepth);budget.stopReason=dir.stopReason;known.add(rel);artifacts.push(artifact(root,rel,'structure','PHYSICAL_OBSERVATION',{state:dir.state,reason:dir.state==='OBSERVED'?undefined:dir.reason,content:dir.content,contentSha256:dir.state==='OBSERVED'?store.sha(Buffer.from(dir.content||'')):undefined,bytes:0,directoryAccounting:{directoriesExamined:dir.directoriesExamined,entriesExamined:dir.entriesExamined,edgesGenerated:dir.edgesGenerated,edgesTraversed:dir.edgesTraversed,edgesBlocked:dir.edgesBlocked,edgesDeferred:dir.edgesDeferred,maxDepth:dir.maxDepth,stopReason:dir.stopReason}}));for(const f of dir.files){if(known.has(f.path))continue;known.add(f.path);artifacts.push(artifact(root,f.path,'runtime','PHYSICAL_OBSERVATION',f.observation));}}
 }
 const claims=artifacts.flatMap(a=>claimsFor(a,subject)),gate=assessAcquisitionContradictions(claims,artifacts,upstreamNext);
 const cumulativeFiles=(prior?.cumulativeFiles??0)+budget.files,cumulativeBytes=(prior?.cumulativeBytes??0)+budget.bytes;
 const measurement={stage,elapsed_ms:performance.now()-started,cumulative_files_examined:cumulativeFiles,cumulative_bytes_examined:cumulativeBytes,semantic_dimensions_resolved:0,unknowns_remaining:DIMENSIONS.length,contradictions_discovered:gate.items.length,incorrect_claim_count:{state:'UNAVAILABLE',value:null,basis:'Independent review required'},human_intervention_count:{state:'UNAVAILABLE',value:null,basis:'No activity telemetry'},next_step_state:gate.nextStep?.state??'EXISTING_GOVERNED_NEXT',refresh_cost:{files:0,bytes:0},directoryAccounting:{directoriesExamined:budget.directoriesExamined,entriesExamined:budget.entriesExamined,edgesGenerated:budget.edgesGenerated,edgesTraversed:budget.edgesTraversed,edgesBlocked:budget.edgesBlocked,edgesDeferred:budget.edgesDeferred,maxDepth:budget.maxDepth,stopReason:budget.stopReason},changed_supporting_artifacts:[],stale_claim_count:0};
 return {kind:'HITO_PROGRESSIVE_ACQUISITION_R1',root,subjectIdentity:subject,stage,artifacts,claims,cumulativeFiles,cumulativeBytes,acquisitionCost:budget,stageMetrics:[...(prior?.stageMetrics??[]),measurement]};
}
function refresh(root,cached,reader=readBounded){
 const budget={files:0,bytes:0},changed=[],uncertain=[],observations=[],work=bounded.createWorkCounters();
 for(const a of cached.artifacts){bounded.recordWork(work,'ARTIFACT_REFRESH_CHECKS');const now=a.path==='.'&&reader===readBounded?structure(root):reader(root,a.path,budget);const physicalIdentity=physical.comparePhysicalIdentity({...a,path:a.path},{...now,path:now.path??a.path});observations.push({path:a.path,state:now.state,contentSha256:now.contentSha256??null,bytes:now.bytes??null,reason:now.reason??null,physicalIdentityState:physicalIdentity.state,physicalIdentityReason:physicalIdentity.reason});if(physicalIdentity.state==='CHANGED')changed.push(a.path);else if(physicalIdentity.state==='UNKNOWN')uncertain.push(a.path);}
 const changedSet=new Set(changed),uncertainSet=new Set(uncertain);
 const claims=cached.claims.map(c=>{let isChanged=false,isUncertain=false;for(const dependency of c.invalidationDependencies??[]){bounded.recordWork(work,'CLAIM_DEPENDENCY_CHECKS');if(changedSet.has(dependency))isChanged=true;if(uncertainSet.has(dependency))isUncertain=true;}return {...c,currentness:isChanged?'STALE':isUncertain?'UNKNOWN':'CURRENT'};});
 return {claims,changed,uncertain,observations,cost:budget,semanticClaimsRebuilt:0,reconstructionWork:{...work,limits:{...bounded.RECONSTRUCTION_WORK_LIMITS},totalLimit:bounded.MAX_TOTAL_RECONSTRUCTION_WORK,indexedDependencies:true},scope:'Only cached supporting paths and bounded top-level entries; no recursive scan. Receipt validation is separate from refresh.'};
}
function deepen(base,cache,fresh,elapsed){
 const gate=assessAcquisitionContradictions(fresh.claims,cache.artifacts,base.truth.nextStep??base.cli.next);
 const dimensions=Object.fromEntries(DIMENSIONS.map(d=>{const claims=fresh.claims.filter(c=>c.semanticDimension===d);const state=claims.some(c=>c.currentness==='STALE')?'STALE':claims.some(c=>c.currentness==='UNKNOWN')?'INDETERMINATE':claims.length?'PARTIALLY_OBSERVED':'UNAVAILABLE';return [d,{state,claimIdentities:claims.map(c=>c.claimIdentity),gap:claims.length?'Bounded evidence only; full dimension and behavioral verification remain unestablished':'No admitted supporting evidence in selected scope'}];}));
 const gaps=Object.entries(dimensions).map(([dimension,x])=>({dimension,state:x.state,reason:x.gap}));
 const truth={...base.truth,acquisitionStage:cache.stage,acquisitionState:'PARTIAL',evidenceClasses:['DOCUMENTARY_EVIDENCE_ONLY','STRUCTURAL_DECLARATION','PHYSICAL_OBSERVATION'],claims:fresh.claims,artifacts:cache.artifacts.map(({content,...a})=>a),coverage:{state:'PARTIAL',completeUnderstanding:false,dimensions},gaps,contradictions:gate,claimCurrentness:Object.fromEntries(fresh.claims.map(c=>[c.claimIdentity,c.currentness])),nextStep:gate.nextStep,authorityBoundary:{canonicalAuthority:false,agentInferenceIsHitoAuthority:false,verifiedResultAdmitted:false,governedCommitmentAdmitted:false},refresh:fresh};
 // Performance measurements are outside state identity and shared semantic projections.
 delete truth.refresh.claims;
 truth.semanticResultIdentity=id('psa-state',[base.truth.semanticResultIdentity,cache.stage,truth.claims,truth.contradictions,truth.coverage]);
 const mri={derived:true,canonical:false,sourceSemanticResultIdentity:truth.semanticResultIdentity,claims:truth.claims.map(c=>({claimIdentity:c.claimIdentity,authority:c.authority,verification:c.verification,currentness:c.currentness})),contradictions:gate,dimensions,unadmitted:['VERIFIED_RESULT','GOVERNED_COMMITMENT']};
 const metrics={stage:cache.stage,elapsed_ms:elapsed,cumulative_files_examined:cache.cumulativeFiles+fresh.cost.files,cumulative_bytes_examined:cache.cumulativeBytes+fresh.cost.bytes,semantic_dimensions_resolved:Object.values(dimensions).filter(x=>x.state==='VERIFIED'||x.state==='OBSERVED').length,unknowns_remaining:gaps.length,contradictions_discovered:gate.items.length,incorrect_claim_count:{state:'UNAVAILABLE',value:null,basis:'Requires independent adjudication'},human_intervention_count:{state:'UNAVAILABLE',value:null,basis:'No user-activity telemetry'},next_step_state:gate.nextStep?.state??'EXISTING_GOVERNED_NEXT',refresh_cost:fresh.cost,changed_supporting_artifacts:fresh.changed,stale_claim_count:truth.claims.filter(c=>c.currentness==='STALE').length};
 metrics.acquisitionStages=cache.stageMetrics;metrics.scope='Selected subject content reads across saved acquisition stages plus this bounded refresh; cache validation, base T0 receipt replay and module reads excluded and T0 instrumentation preserved separately. No fully resolved dimensions are asserted.';
 const truthRef=truth.semanticResultIdentity;
 const cli={...base.cli,truthRef,status:statusProjection(base,truth,truthRef),next:truth.nextStep,why:{truthRef,gaps,contradictions:gate},mri};
 const vscode={...base.vscode,truthRef,progressiveAcquisition:{truthRef,mri}};
 const agent={...base.agent,truthRef,progressiveAcquisition:{truthRef,mri,agentInferenceIsHitoAuthority:false}};
 delete cli.truth;delete vscode.truth;delete agent.truth;
 return {...base,truth,cli,vscode,agent,progressiveAcquisitionMetrics:metrics};
}
function statusProjection(base,truth,truthRef){const prior=base.cli?.status??{};return {truthRef,semanticResultIdentity:truth.semanticResultIdentity,subjectIdentity:truth.subjectIdentity,projectRoot:truth.projectRoot,purpose:prior.purpose??truth.unknowns?.declaredIntent??'UNKNOWN',answers:prior.answers,materialStateGroups:prior.materialStateGroups,materialStateCount:prior.materialStateCount,coverage:truth.coverage,freshness:truth.freshness,acquisitionState:truth.acquisitionState,contradictions:truth.contradictions,nextStep:truth.nextStep,executionAuthority:false};}
async function apply(base,command,options={}){
 const started=performance.now(),root=base.binding.activeRoot,subject=base.truth.subjectIdentity;
 let cache=load(root,subject);
 if(command==='intake'){
  const stage=options.stage??'T2';if(!['T1','T2'].includes(stage))throw Error('PSA_STAGE_REQUIRES_T1_OR_T2');
  if(!cache){cache=acquire(root,subject,'T1',null,base.truth.nextStep??base.cli.next);persist(root,cache);}
  if(stage==='T2'&&cache.stage==='T1'){cache=acquire(root,subject,'T2',cache,base.truth.nextStep??base.cli.next);persist(root,cache);}
 }
 if(!cache)return base;
 const fresh=refresh(root,cache),output=deepen(base,cache,fresh,performance.now()-started);
 output.payload=['init','intake'].includes(command)?output.cli.status:output.cli[command];return output;
}
module.exports={apply,acquire,refresh,LIMITS,DIMENSIONS,artifact,claimsFor,deepen,safeRelative,load,readBounded,readDirectoryBounded};
