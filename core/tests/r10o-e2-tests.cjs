'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const cp=require('node:child_process');

const how=require('../phase0/cli/structural-how.cjs');

const core=path.resolve(__dirname,'..');
const bin=path.join(core,'bin/hito.cjs');

const controls=[];

function check(id,fn){
 fn();
 controls.push('R10OE2_'+id);
}

function put(root,p,s){
 const f=path.join(root,...p.split('/'));
 fs.mkdirSync(path.dirname(f),{recursive:true});
 fs.writeFileSync(f,s);
}

function invoke(root,args,ok=true){
 const r=cp.spawnSync(
  process.execPath,
  [bin,...args,'--root',root,'--json'],
  {
   encoding:'utf8',
   timeout:60000,
   maxBuffer:16000000
  }
 );
 if(ok)assert.equal(r.status,0,r.stderr);
 else assert.notEqual(r.status,0);
 return JSON.parse(ok?r.stdout:r.stderr);
}

async function main(){

 check('LEXER_HELPER_RETAINED',()=>{
  const parsed=how.parse("import { evaluate } from 'synthetic-package';\nexport function inspect(input) { return evaluate(input); }\n");
  assert.deepEqual(parsed.funcs.map(f=>f.name),['inspect']);
  assert.deepEqual(parsed.funcs[0].calls.map(c=>c.name),['evaluate']);
 });

 const root=fs.mkdtempSync(
  path.join(os.tmpdir(),'neutral-r10o-e2-')
 );

 put(root,'README.md',
  '# Generic bounded discovery fixture\n\n'+
  '[package](./package.json)\n'
 );

 put(root,'package.json',JSON.stringify({
  name:'neutral-r10o-e2',
  version:'1.0.0',
  type:'module',
  exports:'./src/index.js',
  scripts:{
   test:'this-command-must-never-run'
  }
 }));

 put(root,'src/index.js',
  "import {value} from './worker.js';\n"+
  "export function run(){ return value; }\n"
 );

 put(root,'src/worker.js',
  "export const value = 1;\n"
 );

 // Deliberately arbitrary directory names.
 put(root,'operations/runner.js',
  "import {performance} from 'node:perf_hooks';\n"+
  "import external from 'synthetic-external-package';\n"+
  "import {run} from '../src/index.js';\n"+
  "export function measure(){ return performance.now()+String(external)+String(run); }\n"
 );

 put(root,'operations/nested/deeper.js',
  "import {run} from '../../src/index.js';\n"+
  "export function deeper(){ return run; }\n"
 );

 const discovered=how.discover(root);

 check('ARBITRARY_TOP_LEVEL_DIRECTORY_DISCOVERED',
  ()=>assert(discovered.includes('operations/runner.js')));

 check('NESTED_MODULE_DISCOVERED',
  ()=>assert(discovered.includes('operations/nested/deeper.js')));

 check('DETERMINISTIC_DISCOVERY',
  ()=>assert.deepEqual(how.discover(root),discovered));

 check('NO_DIRECTORY_NAME_SPECIAL_CASE',
  ()=>assert(!how.discover.toString().includes("'tools'")&&!how.discover.toString().includes("'scripts'")));

 invoke(root,['init']);
 invoke(root,['intake','--canonical']);
 invoke(root,['intake','--canonical']);

 const capsule=
  invoke(root,['story','--continuity-capsule']);

 const g=
  capsule.coordinates.HOW.structuralGraph;

 const byId=
  new Map(g.nodes.map(n=>[n.id,n]));

 const imports=
  g.edges
   .filter(e=>e.relationship==='IMPORTS')
   .map(e=>[
    byId.get(e.sourceId),
    byId.get(e.targetId)
   ]);

 check('ARBITRARY_MODULE_PROJECTED',
  ()=>assert(g.nodes.some(
   n=>n.kind==='MODULE'&&n.path==='operations/runner.js'
  )));

 check('NESTED_MODULE_PROJECTED',
  ()=>assert(g.nodes.some(
   n=>n.kind==='MODULE'&&n.path==='operations/nested/deeper.js'
  )));

 check('NODE_IMPORT_FROM_DISCOVERED_MODULE',
  ()=>assert(imports.some(([s,t])=>
   s?.path==='operations/runner.js'&&
   t?.specifier==='node:perf_hooks'
  )));

 check('EXTERNAL_IMPORT_FROM_DISCOVERED_MODULE',
  ()=>assert(imports.some(([s,t])=>
   s?.path==='operations/runner.js'&&
   t?.specifier==='synthetic-external-package'
  )));

 check('LOCAL_IMPORT_FROM_DISCOVERED_MODULE',
  ()=>assert(imports.some(([s,t])=>
   s?.path==='operations/runner.js'&&
   t?.path==='src/index.js'
  )));

 check('NESTED_LOCAL_IMPORT',
  ()=>assert(imports.some(([s,t])=>
   s?.path==='operations/nested/deeper.js'&&
   t?.path==='src/index.js'
  )));

 check('ENTRYPOINT_PRESERVED',
  ()=>assert(g.entrypoints.some(e=>
   e.kind==='LIBRARY_ENTRYPOINT'&&
   byId.get(e.nodeId)?.path==='src/index.js'
  )));

 // R4-equivalent product-path target: three modules, seven static imports,
 // one declared entrypoint, with a valid module in an unrecognized directory.
 const r4Root=fs.mkdtempSync(path.join(os.tmpdir(),'neutral-r10o-r4-equivalent-'));
 put(r4Root,'README.md','# R4-equivalent generic module graph\n');
 put(r4Root,'package.json',JSON.stringify({name:'neutral-r10o-r4',version:'1.0.0',type:'module',exports:'./src/index.js'}));
 put(r4Root,'src/index.js',"import {work} from './core.js';\nimport {join} from 'node:path';\nexport function run(input) { return input; }\n");
 put(r4Root,'src/core.js',"import {run} from './index.js';\nimport {readFileSync} from 'node:fs';\nexport function work(input) { return input; }\n");
 put(r4Root,'unrecognized-area/runner.js',"import {run} from '../src/index.js';\nimport {join} from 'node:path';\nimport {launch} from 'synthetic-runner';\nexport function launchTask(input) { return input; }\n");
 invoke(r4Root,['init']);
 invoke(r4Root,['intake','--canonical']);
 invoke(r4Root,['intake','--canonical']);
 const r4Capsule=invoke(r4Root,['story','--continuity-capsule']);
 const r4Graph=r4Capsule.coordinates.HOW.structuralGraph;
 const r4ById=new Map(r4Graph.nodes.map(n=>[n.id,n]));
 check('R4_EXPECTED_SOURCE_MODULE_COUNT',()=>assert.equal(r4Graph.nodes.filter(n=>n.kind==='MODULE').length,3));
 check('R4_EXPECTED_STATIC_IMPORT_COUNT',()=>assert.equal(r4Graph.edges.filter(e=>e.relationship==='IMPORTS').length,7));
 check('R4_EXPECTED_DECLARED_ENTRYPOINT_COUNT',()=>assert.equal(r4Graph.entrypoints.length,1));
 check('R4_OUTSIDE_ALLOWLIST_RELATIONSHIPS_PROJECTED',()=>{
  const module=r4Graph.nodes.find(n=>n.kind==='MODULE'&&n.path==='unrecognized-area/runner.js');
  assert(module);
  assert(r4Graph.edges.some(e=>e.relationship==='IMPORTS'&&r4ById.get(e.sourceId)?.path===module.path&&r4ById.get(e.targetId)?.path==='src/index.js'));
  assert(r4Graph.edges.some(e=>e.relationship==='IMPORTS'&&r4ById.get(e.sourceId)?.path===module.path&&r4ById.get(e.targetId)?.specifier==='node:path'));
 });

 check('NO_AUTHORITY_INFLATION',
  ()=>assert(Object.values(g.authority).every(v=>v===false)));

 check('PROJECT_CODE_NOT_EXECUTED',
  ()=>assert.equal(
   capsule.authority.execution,
   false
  ));

 // File bound.
 const fileRoot=fs.mkdtempSync(
  path.join(os.tmpdir(),'neutral-r10o-e2-files-')
 );
 put(fileRoot,'package.json','{"name":"bound"}');
 for(let i=0;i<40;i++)
  put(fileRoot,`arbitrary/f${i}.js`,'');
 check('FILE_BOUND',
  ()=>assert.throws(
   ()=>how.discover(fileRoot),
   /R10O_FILE_COUNT_BOUND/
  ));

 // Per-file byte bound.
 const byteRoot=fs.mkdtempSync(path.join(os.tmpdir(),'neutral-r10o-e2-bytes-'));
 put(byteRoot,'package.json','{"name":"byte-bound"}');
 put(byteRoot,'arbitrary/huge.js','x'.repeat(65537));
 check('PER_FILE_BYTE_BOUND',()=>assert.throws(()=>how.discover(byteRoot),/R10O_FILE_BOUND/));

 // Global byte bound.
 const totalByteRoot=fs.mkdtempSync(path.join(os.tmpdir(),'neutral-r10o-e2-total-bytes-'));
 put(totalByteRoot,'package.json','{"name":"total-byte-bound"}');
 for(let i=0;i<9;i++) put(totalByteRoot,`payload/f${i}.js`,'x'.repeat(60000));
 check('TOTAL_BYTE_BOUND',()=>assert.throws(()=>how.discover(totalByteRoot),/R10O_BYTE_BOUND/));

 // Entry bound.
 const entryRoot=fs.mkdtempSync(path.join(os.tmpdir(),'neutral-r10o-e2-entries-'));
 put(entryRoot,'package.json','{"name":"entry-bound"}');
 for(let i=0;i<129;i++) fs.mkdirSync(path.join(entryRoot,`d${String(i).padStart(3,'0')}`));
 check('ENTRY_BOUND',()=>assert.throws(()=>how.discover(entryRoot),/R10O_DIRECTORY_BOUND/));

 // Directory bound: root + 32 children exceeds the 32-directory budget.
 const directoryRoot=fs.mkdtempSync(path.join(os.tmpdir(),'neutral-r10o-e2-directories-'));
 put(directoryRoot,'package.json','{"name":"directory-bound"}');
 for(let i=0;i<32;i++) fs.mkdirSync(path.join(directoryRoot,`d${String(i).padStart(2,'0')}`));
 check('DIRECTORY_BOUND',()=>assert.throws(()=>how.discover(directoryRoot),/R10O_DIRECTORY_COUNT_BOUND/));

 // Depth bound.
 const depthRoot=fs.mkdtempSync(path.join(os.tmpdir(),'neutral-r10o-e2-depth-'));
 put(depthRoot,'package.json','{"name":"depth-bound"}');
 put(depthRoot,'a/b/c/d/e/deep.js','export const deep=true;');
 check('DEPTH_BOUND',()=>assert.throws(()=>how.discover(depthRoot),/R10O_DEPTH_BOUND/));

 // Link / junction traversal must fail closed.
 const linkRoot=fs.mkdtempSync(path.join(os.tmpdir(),'neutral-r10o-e2-link-'));
 const linkTarget=fs.mkdtempSync(path.join(os.tmpdir(),'neutral-r10o-e2-link-target-'));
 put(linkRoot,'package.json','{"name":"link-bound"}');
 put(linkTarget,'outside.js','export const outside=true;');
 let linkCreated=false;
 try{
  fs.symlinkSync(linkTarget,path.join(linkRoot,'linked'),process.platform==='win32'?'junction':'dir');
  linkCreated=true;
 }catch(error){ if(process.platform!=='win32') throw error; }
 if(linkCreated){
  check('LINK_OR_JUNCTION_REJECTED',()=>assert.throws(()=>how.discover(linkRoot),/LINK_OR_JUNCTION_IN_STATE_PATH/));
 }else{
  controls.push('R10OE2_LINK_OR_JUNCTION_REJECTED_ENVIRONMENT_UNAVAILABLE');
 }

 check('ROOT_CONFINEMENT_PRESERVED',()=>{
  const text=how.discover.toString();
  assert(text.includes('store.safe'));
  assert(text.includes('R10O_ROOT_ESCAPE'));
 });

 const executionRoot=fs.mkdtempSync(path.join(os.tmpdir(),'neutral-r10o-e2-noexec-'));
 const marker=path.join(executionRoot,'EXECUTED.txt');
 put(executionRoot,'package.json','{"name":"noexec"}');
 put(executionRoot,'unknown/run.js',`require('node:fs').writeFileSync(${JSON.stringify(marker)},'BAD');\n`);
 how.discover(executionRoot);
 check('DISCOVERY_DOES_NOT_EXECUTE_SOURCE',()=>assert.equal(fs.existsSync(marker),false));
 check('DISCOVERY_PATHS_UNIQUE',()=>assert.equal(new Set(discovered).size,discovered.length));

 console.log(JSON.stringify({suite:'R10O-E2',status:'PASS',controls,controlCount:controls.length,discovered,r4Equivalent:{sourceModules:r4Graph.nodes.filter(n=>n.kind==='MODULE').length,staticImports:r4Graph.edges.filter(e=>e.relationship==='IMPORTS').length,declaredEntrypoints:r4Graph.entrypoints.length,arbitraryModuleProjected:r4Graph.nodes.some(n=>n.kind==='MODULE'&&n.path==='unrecognized-area/runner.js')}},null,2));
}

main().catch(error=>{
 console.error(error&&error.stack?error.stack:String(error));
 process.exitCode=1;
});
