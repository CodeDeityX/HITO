'use strict';
// Read-only, bounded source observations subordinate to validated canonical pairs.
// Deliberately closed ESM grammar: unsupported syntax yields UNKNOWN, never guessed calls.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const store=require('../contracts/product-entry-persistence.cjs');
const esm=require('./esm-imports.cjs');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const LIMITS=Object.freeze({files:32,bytes:524288,perFile:65536,entries:128,directories:32,depth:4,nodes:160,edges:256});
const cmp=(a,b)=>a<b?-1:a>b?1:0;
function normalize(p){
 if(typeof p!=='string'||!p||p.includes('\0')||/^[\\/]|^[A-Za-z]:/.test(p))throw Error('R10O_PATH');
 const parts=p.replaceAll('\\','/').split('/');
 if(parts.includes('..'))throw Error('R10O_PATH');
 const n=parts.filter(x=>x&&x!=='.').join('/');if(!n||n.startsWith('.maat/'))throw Error('R10O_PATH');return n;
}
function bytes(root,p){const f=store.safe(root,path.join(root,...normalize(p).split('/')));const st=fs.lstatSync(f);if(!st.isFile()||st.size>LIMITS.perFile)throw Error('R10O_FILE_BOUND');const b=fs.readFileSync(f);if(b.length>LIMITS.perFile)throw Error('R10O_FILE_BOUND');return b;}
function text(b){if(b.includes(0))throw Error('R10O_BINARY');return new TextDecoder('utf-8',{fatal:true}).decode(b);}
// Bounded, deterministic directory metadata acquisition. No source execution.
function discover(root){
 const paths=new Set(['README.md','package.json','tsconfig.json']),seen=new Map(),visited=new Set();
 let total=0,directories=0,entries=0;
 const queue=[{dir:'',depth:0}];
 const rootReal=fs.realpathSync.native?fs.realpathSync.native(root):fs.realpathSync(root);
 while(queue.length){
  queue.sort((a,b)=>cmp(a.dir,b.dir)||a.depth-b.depth);
  const current=queue.shift(),dir=current.dir,depth=current.depth;
  if(depth>LIMITS.depth)throw Error('R10O_DEPTH_BOUND');
  const full=store.safe(root,dir?path.join(root,...dir.split('/')):root);
  if(!fs.existsSync(full))continue;
  const st=fs.lstatSync(full);
  if(st.isSymbolicLink())throw Error('R10O_LINK_OR_JUNCTION');
  if(!st.isDirectory())continue;
  const real=fs.realpathSync.native?fs.realpathSync.native(full):fs.realpathSync(full);
  const relReal=path.relative(rootReal,real);
  if(relReal.startsWith('..')||path.isAbsolute(relReal))throw Error('R10O_ROOT_ESCAPE');
  const key=process.platform==='win32'?real.toLowerCase():real;
  if(visited.has(key))throw Error('R10O_DIRECTORY_CYCLE');
  visited.add(key);
  directories++;
  if(directories>LIMITS.directories)throw Error('R10O_DIRECTORY_COUNT_BOUND');
  const names=[];
  const handle=fs.opendirSync(full);
  try{
   let e;
   while((e=handle.readSync())){
    names.push(e);entries++;
    if(entries>LIMITS.entries)throw Error('R10O_DIRECTORY_BOUND');
   }
  }finally{handle.closeSync();}
  for(const e of names.sort((a,b)=>cmp(a.name,b.name))){
   if(e.name==='.maat'||e.name==='.git'||e.name==='node_modules')continue;
   const relative=normalize((dir?dir+'/':'')+e.name);
   const child=store.safe(root,path.join(root,...relative.split('/')));
   const childStat=fs.lstatSync(child);
   if(childStat.isSymbolicLink())throw Error('R10O_LINK_OR_JUNCTION');
   if(childStat.isDirectory()){
    if(depth>=LIMITS.depth)throw Error('R10O_DEPTH_BOUND');
    queue.push({dir:relative,depth:depth+1});
    continue;
   }
   if(!childStat.isFile())continue;
   if(!(/\.(?:mjs|js|cjs|json|ya?ml)$/.test(e.name)))continue;
   paths.add(relative);
   if(paths.size>LIMITS.files)throw Error('R10O_FILE_COUNT_BOUND');
  }
 }
 for(const p of [...paths].sort(cmp)){
  if(seen.has(p.toLowerCase()))throw Error('R10O_DUPLICATE_PATH');
  seen.set(p.toLowerCase(),p);
  const f=store.safe(root,path.join(root,...p.split('/')));
  if(!fs.existsSync(f))continue;
  const b=bytes(root,p);total+=b.length;
  if(total>LIMITS.bytes)throw Error('R10O_BYTE_BOUND');
 }
 return [...paths].sort(cmp);
}
function lex(src){
 const out=[];let i=0;
 while(i<src.length){const rest=src.slice(i);let m;
  if((m=/^\s+/.exec(rest))){i+=m[0].length;continue;}
  if(rest.startsWith('//')){const end=src.indexOf('\n',i);i=end<0?src.length:end;continue;}
  if(rest.startsWith('/*')){const end=src.indexOf('*/',i+2);if(end<0)throw Error('COMMENT');i=end+2;continue;}
  if((m=/^(?:"(?:[^"\\\r\n]|\\["\\/bfnrt])*"|'(?:[^'\\\r\n]|\\['\\/bfnrt])*')/.exec(rest))){out.push({v:m[0].slice(1,-1),kind:'string',at:i});i+=m[0].length;continue;}
  if((m=/^[A-Za-z_$][\w$]*/.exec(rest))){out.push({v:m[0],kind:'id',at:i});i+=m[0].length;continue;}
  if((m=/^\d+(?:\.\d+)?/.exec(rest))){out.push({v:m[0],kind:'number',at:i});i+=m[0].length;continue;}
  if('{}();,.'.includes(src[i])){out.push({v:src[i],kind:'punct',at:i++});continue;}
  throw Error('UNSUPPORTED_TOKEN');
 }return out;
}
function parse(src){
 const ts=lex(src);let i=0;const imports=[],funcs=[],topCalls=[],names=new Set();
 const is=v=>ts[i]?.v===v;
 const take=v=>{const t=ts[i++];if(!t||v&&t.v!==v)throw Error('GRAMMAR');return t;};
 const id=()=>{const t=take();if(t.kind!=='id'||['eval','with','import','export','function','return','await','yield','this','super','new'].includes(t.v))throw Error('IDENTIFIER');return t;};
 const bind=n=>{if(names.has(n))throw Error('DUPLICATE_BINDING');names.add(n);};
 function expr(calls,scope){
  const t=take();if(t.kind==='string'||t.kind==='number')return;
  if(t.kind!=='id')throw Error('EXPRESSION');
  if(is('.'))throw Error('DYNAMIC_MEMBER');
  if(is('(')){take('(');if(scope.has(t.v))throw Error('SHADOWED_CALL');calls.push({name:t.v,at:t.at});if(!is(')')){expr(calls,scope);while(is(',')){take(',');expr(calls,scope);}}take(')');}
 }
 while(i<ts.length){
  if(is('import')){take('import');take('{');do{const original=id().v;let local=original;if(is('as')){take('as');local=id().v;}bind(local);imports.push({original,local});if(!is(','))break;take(',');}while(true);take('}');take('from');const spec=take();if(spec.kind!=='string'||spec.v.includes('\\'))throw Error('IMPORT');take(';');for(const x of imports)if(!x.spec){x.spec=spec.v;x.at=spec.at;}continue;}
  let exported=false;if(is('export')){take('export');exported=true;}
  if(is('function')){take('function');const n=id();bind(n.v);take('(');const params=new Set();if(!is(')')){do{const p=id().v;if(params.has(p))throw Error('PARAM');params.add(p);if(!is(','))break;take(',');}while(true);}take(')');take('{');const calls=[];while(!is('}')){if(!ts[i])throw Error('BODY');if(is('return'))take('return');expr(calls,params);take(';');}take('}');funcs.push({name:n.v,at:n.at,exported,calls});continue;}
  if(exported)throw Error('EXPORT');expr(topCalls,new Set());take(';');
 }
 // Reject unresolved calls for this closed module rather than guess lexical bindings.
 for(const c of [...topCalls,...funcs.flatMap(f=>f.calls)])if(!names.has(c.name))throw Error('UNRESOLVED_CALL');
 return {imports,funcs,topCalls};
}
function derive(root,model){
 if(!model?.canonicalState?.integrity?.modelHash)throw Error('R10O_CANONICAL_REQUIRED');
 const pairs=new Map(),unknowns=[];let total=0;
 for(const c of model.capabilities??[]){if(c.lifecycleStatus==='RETIRED')continue;for(const ref of c.implementationRefs??[]){if(!ref.startsWith('phase2-source:'))continue;const x=JSON.parse(ref.slice(14));const p=normalize(x.path);if(!/^[a-f0-9]{64}$/.test(x.sha256)||!model.configurationItems.includes(p))throw Error('R10O_CANONICAL_PAIR');const key=p.toLowerCase();if(pairs.has(key)){const old=pairs.get(key);if(old.path!==p||old.sha256!==x.sha256)throw Error('R10O_DUPLICATE_PATH');}else pairs.set(key,{path:p,sha256:x.sha256,capabilityId:c.capabilityId});}}
 if(pairs.size>LIMITS.files)throw Error('R10O_FILE_COUNT_BOUND');
 const sources=new Map();
 for(const x of [...pairs.values()].sort((a,b)=>cmp(a.path,b.path))){let b;try{b=bytes(root,x.path);}catch{throw Error('R10O_SOURCE_STALE_OR_UNAVAILABLE:'+x.path);}total+=b.length;if(total>LIMITS.bytes)throw Error('R10O_BYTE_BOUND');if(sha(b)!==x.sha256)throw Error('R10O_SOURCE_STALE:'+x.path);let src;try{src=text(b);}catch{unknowns.push({path:x.path,reason:'BINARY_OR_INVALID_UTF8'});continue;}sources.set(x.path,{...x,src});}
 const nodes=[],edges=[],references=[],refMap=new Map(),nodeMap=new Map();
 const provenance=(s,at=0)=>{const key=s.path+':'+at;if(refMap.has(key))return refMap.get(key);const r={id:'p'+references.length,sourcePath:s.path,sourceContentIdentity:s.sha256,sourceArtifactIdentity:'source:'+sha(s.path+'\0'+s.sha256),offset:at,line:s.src.slice(0,at).split('\n').length,canonicalCapabilityId:s.capabilityId,extractorIdentity:'hito.structural-how.closed-esm',extractorVersion:'2'};references.push(r);refMap.set(key,r.id);return r.id;};
 const node=(s,symbol,kind,at=0,extra={})=>{const id='n:'+sha(s.path+'\0'+s.sha256+'\0'+symbol).slice(0,24);if(!nodeMap.has(id)){const n={id,kind,path:s.path,symbol,provenance:[provenance(s,at)],epistemicClass:'SOURCE_OBSERVATION',currentness:'CURRENT_WITHIN_REPORTED_SCOPE',...extra};nodes.push(n);nodeMap.set(id,n);}return id;};
 const edge=(from,to,relationship,refs)=>{if(!from||!to)return;const key=from+relationship+to;if(edges.some(e=>e.key===key))return;edges.push({key,id:'e:'+sha(key).slice(0,24),sourceId:from,targetId:to,relationship,provenance:[...new Set(refs)].sort(cmp),epistemicClass:'SOURCE_OBSERVATION',currentness:'CURRENT_WITHIN_REPORTED_SCOPE'});};
 const modules=new Map(),parsed=new Map();
 for(const s of sources.values()){
  if(/\.(?:mjs|js|cjs)$/.test(s.path)){modules.set(s.path,node(s,'<module>','MODULE'));try{parsed.set(s.path,parse(s.src));}catch(e){unknowns.push({path:s.path,reason:'UNSUPPORTED_OR_AMBIGUOUS_SOURCE',detail:e.message});}}
  else if(/(?:^|\/)(?:package|tsconfig)\.json$/.test(s.path))node(s,'<configuration>','CONFIGURATION');
  else if(/^\.github\/workflows\/[^/]+\.ya?ml$/.test(s.path))node(s,'<ci-definition>','CI_DEFINITION',0,{verification:'DEFINITION_ONLY_NOT_EXECUTED'});
 }
 // Import declarations depend on module existence, not supported function bodies/exports.
 for(const [p,moduleId]of modules){const source=sources.get(p),observed=esm.scan(source.src);
  for(const unknown of observed.unknowns)unknowns.push({path:p,...unknown});
  for(const declaration of observed.declarations){const spec=declaration.specifier;let target;
   if(spec.startsWith('./')||spec.startsWith('../')){
    const resolved=path.posix.normalize(path.posix.join(path.posix.dirname(p),spec));
    if(!resolved.startsWith('../')&&!path.posix.isAbsolute(resolved)&&/\.(?:mjs|js|cjs)$/.test(resolved))target=modules.get(resolved);
   }else if(/^(?:node:)?(?:@[\w.-]+\/)?[\w.-]+(?:\/[\w.-]+)*$/.test(spec))target=node(source,'import:'+spec,'EXTERNAL_DEPENDENCY',declaration.at,{specifier:spec,availability:'UNKNOWN'});
   if(target)edge(moduleId,target,'IMPORTS',[provenance(source,declaration.at),...nodeMap.get(target).provenance]);
   else unknowns.push({path:p,reason:'UNRESOLVED_STATIC_IMPORT',specifier:spec});
  }
 }
 const symbols=new Map();
 for(const [p,ast]of parsed){const s=sources.get(p);for(const f of ast.funcs){const n=node(s,f.name,'FUNCTION',f.at,{exported:f.exported});symbols.set(p+'#'+f.name,n);}}
 for(const [p,ast]of parsed){const s=sources.get(p),bindings=new Map();
  for(const f of ast.funcs)bindings.set(f.name,symbols.get(p+'#'+f.name));
  for(const imp of ast.imports){let target;
   if(imp.spec.startsWith('./')||imp.spec.startsWith('../')){const q=path.posix.normalize(path.posix.join(path.posix.dirname(p),imp.spec));if(!q.startsWith('../')&&parsed.get(q)?.funcs.some(f=>f.exported&&f.name===imp.original))target=symbols.get(q+'#'+imp.original);}
   else if(/^(?:node:)?[\w@][\w@/.-]*$/.test(imp.spec)){target=node(s,imp.spec+'#'+imp.original,'EXTERNAL_SYMBOL',imp.at,{availability:'UNKNOWN'});}
   if(target){bindings.set(imp.local,target);edge(modules.get(p),target,'BINDS_IMPORT',[provenance(s,imp.at),...nodeMap.get(target).provenance]);}else unknowns.push({path:p,reason:'UNRESOLVED_FUNCTION_IMPORT_BINDING',specifier:imp.spec});
  }
  for(const f of [{name:null,calls:ast.topCalls},...ast.funcs])for(const call of f.calls){const target=bindings.get(call.name);if(!target){unknowns.push({path:p,reason:'UNRESOLVED_CALL',symbol:call.name});continue;}edge(f.name?symbols.get(p+'#'+f.name):modules.get(p),target,'CALLS',[provenance(s,call.at),...nodeMap.get(target).provenance]);}
 }
 const entrypoints=[],homes=[];
 const pkg=sources.get('package.json');
 if(pkg){let manifest;try{manifest=JSON.parse(pkg.src);}catch{unknowns.push({path:pkg.path,reason:'INVALID_MANIFEST'});}
  if(manifest&&typeof manifest==='object'&&!Array.isArray(manifest)){
   const config=nodes.find(n=>n.path==='package.json'&&n.kind==='CONFIGURATION').id;
   const addEntry=(value,kind)=>{if(typeof value!=='string')return;let p;try{p=normalize(value);}catch{return;}const target=modules.get(p);if(!target){unknowns.push({path:p,reason:'ENTRYPOINT_NOT_OBSERVED'});return;}const row={kind,nodeId:target,provenance:[provenance(pkg),...nodeMap.get(target).provenance],epistemicClass:'STRUCTURAL_DECLARATION',currentness:'CURRENT_WITHIN_REPORTED_SCOPE'};if(!entrypoints.some(e=>e.kind===row.kind&&e.nodeId===row.nodeId))entrypoints.push(row);homes.push({...row,role:kind==='CLI_ENTRYPOINT'?'CLI_ENTRY':kind==='LIBRARY_ENTRYPOINT'?'LIBRARY_ENTRY':'TEST_ENTRY'});edge(config,target,'CONFIGURES',row.provenance);};
   if(typeof manifest.bin==='string')addEntry(manifest.bin,'CLI_ENTRYPOINT');else if(manifest.bin&&typeof manifest.bin==='object')for(const k of Object.keys(manifest.bin).sort(cmp))addEntry(manifest.bin[k],'CLI_ENTRYPOINT');
   addEntry(manifest.main,'LIBRARY_ENTRYPOINT');
   if(typeof manifest.exports==='string')addEntry(manifest.exports,'LIBRARY_ENTRYPOINT');
   else if(manifest.exports&&typeof manifest.exports==='object'&&!Array.isArray(manifest.exports)){
    for(const key of Object.keys(manifest.exports).sort(cmp)){
     if((key==='.'||key.startsWith('./'))&&!key.includes('*')&&typeof manifest.exports[key]==='string')addEntry(manifest.exports[key],'LIBRARY_ENTRYPOINT');
     else unknowns.push({path:'package.json',reason:'CONDITIONAL_OR_PATTERN_EXPORT_UNSUPPORTED',key});
    }
   }

   for(const [name,cmd]of Object.entries(manifest.scripts??{}).sort(([a],[b])=>cmp(a,b))){if(typeof cmd!=='string'||!['test','build','start'].includes(name))continue;const n=node(pkg,'scripts.'+name,name==='test'?'TEST_DEFINITION':name==='build'?'BUILD_DEFINITION':'COMMAND_DEFINITION',0,{command:cmd.slice(0,200),verification:'DECLARED_NOT_EXECUTED'});edge(config,n,'CONFIGURES',[provenance(pkg)]);const m=/^node ([\w./-]+)$/.exec(cmd);if(m&&name==='test')addEntry(m[1],'TEST_ENTRYPOINT');if(m&&name==='build'){const p=normalize(m[1]);if(modules.has(p))entrypoints.push({kind:'BUILD_ENTRYPOINT',nodeId:modules.get(p),provenance:[provenance(pkg),...nodeMap.get(modules.get(p)).provenance],epistemicClass:'STRUCTURAL_DECLARATION',currentness:'CURRENT_WITHIN_REPORTED_SCOPE'});}}
   for(const name of Object.keys(manifest.dependencies??{}).sort(cmp)){if(!nodes.some(n=>(n.kind==='EXTERNAL_SYMBOL'&&n.symbol.startsWith(name+'#'))||(n.kind==='EXTERNAL_DEPENDENCY'&&(n.specifier===name||n.specifier.startsWith(name+'/')))))continue;const n=node(pkg,'dependency:'+name,'DEPENDENCY',0,{version:String(manifest.dependencies[name]).slice(0,100),availability:'UNKNOWN'});edge(config,n,'DEPENDS_ON',[provenance(pkg)]);}
   homes.push({role:'CONFIGURATION',nodeId:config,provenance:[provenance(pkg)],epistemicClass:'STRUCTURAL_DECLARATION',currentness:'CURRENT_WITHIN_REPORTED_SCOPE'});
  }
 }
 // Roles follow exact platform API semantics, never identifier naming.
 for(const e of edges.filter(e=>e.relationship==='CALLS')){const t=nodeMap.get(e.targetId);let role;if(/^node:fs#(?:readFileSync|writeFileSync)$/.test(t.symbol))role='PERSISTENCE_API_CALL_SITE';if(/^node:child_process#(?:execFileSync|spawnSync)$/.test(t.symbol))role='EXECUTION_API_CALL_SITE';if(role)homes.push({role,nodeId:e.sourceId,provenance:e.provenance,epistemicClass:'SOURCE_OBSERVATION',currentness:'CURRENT_WITHIN_REPORTED_SCOPE'});}
 if(nodes.length>LIMITS.nodes||edges.length>LIMITS.edges)throw Error('R10O_GRAPH_BOUND');
 nodes.sort((a,b)=>cmp(a.id,b.id));edges.sort((a,b)=>cmp(a.id,b.id));for(const e of edges)delete e.key;
 const graph={schema:'HITO_STRUCTURAL_HOW_V1',canonicalModelHash:model.canonicalState.integrity.modelHash,modelRevision:model.canonicalState.modelRevision,state:nodes.length?'PARTIAL':'UNKNOWN',relationshipState:edges.length?'ESTABLISHED_WITHIN_SUPPORTED_SCOPE':'UNKNOWN',nodes,edges,entrypointState:entrypoints.length?'DECLARED':'UNKNOWN',entrypoints:entrypoints.sort((a,b)=>cmp(JSON.stringify(a),JSON.stringify(b))),runtimeHomes:homes.sort((a,b)=>cmp(JSON.stringify(a),JSON.stringify(b))),provenanceReferences:references,unknowns:unknowns.sort((a,b)=>cmp(JSON.stringify(a),JSON.stringify(b))),limits:LIMITS,acquisition:{files:sources.size,bytes:total},authority:{canonicalAuthority:false,truthOwner:false,executionAuthority:false,mutationAuthority:false,intentAuthority:false,decisionAuthority:false,completionAuthority:false},limitations:['Static import declarations are scanned independently of the closed call grammar; ambiguous lexical tails, dynamic imports, reexports, type-only syntax and unresolved targets remain UNKNOWN.','CALLS denotes a syntactic call site, not reachable or successful execution.','CI and command definitions are not executions.','No inferred parsing/analysis ownership; no naming-based roles.','Only canonically admitted path/hash pairs; graph is derived on demand and is not persisted.']};
 return graph;
}
module.exports={derive,discover,normalize,parse,LIMITS};
