'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process'),crypto=require('node:crypto');
const how=require('../phase0/cli/structural-how.cjs'),esm=require('../phase0/cli/esm-imports.cjs');
const persistence=require('../phase0/dist/contracts/persistence.js');
const core=path.resolve(__dirname,'..'),bin=path.join(core,'bin/hito.cjs'),controls=[];
const check=(id,f)=>{f();controls.push('R10OE1_'+id);};
async function main(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'neutral-esm-e1-'));
 const put=(p,s)=>fs.writeFileSync(path.join(root,p),s);
 const sources={
  'README.md':'# New synthetic ESM fixture\n',
  'package.json':JSON.stringify({name:'neutral-esm-e1',type:'module',main:'./module.js',exports:{'.':'./module.js','./tool':'./other.js'},bin:{neutral:'./default.js'}}),
  'module.js':'export const value = 1;\nexport const one = 1;\nexport const two = 2;\nexport default class Box { #value = 1; }\n',
  'other.js':'export default 2;\n',
  'default.js':"import value from './module.js';\nclass Unrelated { #state = []; }\n",
  'named.js':"import {value} from './module.js';\nconst unrelated = 1;\n",
  'namespace.js':"import * as value from './module.js';\nconst unrelated = 1;\n",
  'side.js':"import './module.js';\nconst unrelated = 1;\n",
  'external-default.js':"import test from 'synthetic-package';\nconst unrelated = [];\n",
  'external-named.js':"import {value} from 'synthetic-package';\nconst unrelated = [];\n",
  'multiline.js':"import {\n one,\n two\n} from './module.js';\n",
  'comments.js':"/* before */ import /* clause */ {value /* alias */ as renamed,} from /* source */ './module.js'; // after\n",
  'combined.js':"import value, {one as first} from './module.js';\n",
  'dynamic.js':"const module = await import('./module.js');\n",
  'reexport.js':"export {value} from './module.js';\n",
  'type-only.js':"import type {Value} from './module.js';\n",
  'string.js':'const example = "import x from \'./fake.js\'";\n',
  'comment.js':"// import x from './fake.js'\n/* import y from './fake.js'; */\n",
  'template.js':"const example = `import x from './fake.js'; ${'import y from nowhere'}`;\n",
  'unresolved.js':"import value from './missing.js';\n",
  'directory.js':"import value from './folder';\n",
  'duplicate.js':"import './module.js';\nimport './module.js';\n",
  'late.js':"const preceding = 1;\nimport value from './module.js';\n",
  'index.js':'export default 1;\n',
  'after-template.js':"const x = `import value from './fake.js';`;\nimport value from './module.js';\n",
  'regex.js':"const pattern = /import x from '.\/fake.js'/;\n",
  'semi-free.js':"import value from './module.js'\nimport 'synthetic-package'\n",
 };
 for(const [p,s]of Object.entries(sources))put(p,s);
 const invoke=(args,ok=true,target=root)=>{const r=cp.spawnSync(process.execPath,[bin,...args,'--root',target,'--json'],{encoding:'utf8',timeout:60000,maxBuffer:20000000});if(ok)assert.equal(r.status,0,r.stderr);else assert.notEqual(r.status,0);return JSON.parse(ok?r.stdout:r.stderr);};
 check('FRESH_SYNTHETIC_ROOT',()=>assert(!fs.existsSync(path.join(root,'.maat'))));
 invoke(['init']);invoke(['intake','--canonical']);invoke(['intake','--canonical']);
 const capsule=invoke(['story','--continuity-capsule']),g=capsule.coordinates.HOW.structuralGraph;
 const map=new Map(g.nodes.map(n=>[n.id,n]));
 const edges=p=>g.edges.filter(e=>e.relationship==='IMPORTS'&&map.get(e.sourceId).path===p);
 const local=p=>edges(p).filter(e=>map.get(e.targetId).kind==='MODULE'&&map.get(e.targetId).path==='module.js');
 check('CAPSULE_GRAPH_PATH',()=>assert(g&&capsule.structuralGraph===undefined&&capsule.HOW===undefined));
 check('PRODUCT_PATH_IMPORTS',()=>assert(local('default.js').length===1&&local('named.js').length===1));
 const canonical=(await persistence.readCanonicalRevisionValidated(root)).model;
 check('VALIDATED_CANONICAL_REOPEN',()=>assert.equal(g.canonicalModelHash,canonical.canonicalState.integrity.modelHash));
 for(const [id,p]of [['DEFAULT_IMPORT','default.js'],['NAMED_IMPORT','named.js'],['NAMESPACE_IMPORT','namespace.js'],['SIDE_EFFECT_IMPORT','side.js'],['MULTILINE_IMPORT','multiline.js'],['COMMENTS_WHITESPACE','comments.js'],['COMBINED_DEFAULT_NAMED','combined.js'],['IMPORT_AFTER_ORDINARY_BODY','late.js']])check(id,()=>assert.equal(local(p).length,1));
 for(const [id,p]of [['EXTERNAL_DEFAULT_IMPORT','external-default.js'],['EXTERNAL_NAMED_IMPORT','external-named.js']])check(id,()=>{assert.equal(edges(p).length,1);const n=map.get(edges(p)[0].targetId);assert.equal(n.kind,'EXTERNAL_DEPENDENCY');assert.equal(n.specifier,'synthetic-package');assert.equal(n.availability,'UNKNOWN');});
 check('SEMICOLON_FREE_IMPORTS',()=>assert.equal(edges('semi-free.js').length,2));
 check('TARGET_BODY_NOT_REQUIRED',()=>assert(g.unknowns.some(u=>u.path==='module.js')&&local('named.js').length===1));
 check('CALLER_BODY_NOT_REQUIRED',()=>assert(g.unknowns.some(u=>u.path==='default.js')&&local('default.js').length===1));
 check('DUPLICATE_IMPORT_DEDUPLICATION',()=>assert.equal(local('duplicate.js').length,1));
 const negativeFiles=['dynamic.js','reexport.js','type-only.js','string.js','comment.js','template.js','regex.js','unresolved.js','directory.js','after-template.js'];
 for(const p of negativeFiles)check('NEGATIVE_'+p.replaceAll(/[.-]/g,'_').toUpperCase(),()=>assert.equal(edges(p).length,0));
 check('DYNAMIC_EXPLICITLY_UNSUPPORTED',()=>assert(g.unknowns.some(u=>u.path==='dynamic.js'&&u.reason==='DYNAMIC_IMPORT_OR_META_UNSUPPORTED')));
 check('REEXPORT_EXPLICITLY_UNSUPPORTED',()=>assert(g.unknowns.some(u=>u.path==='reexport.js'&&u.reason==='EXPORT_LIST_OR_REEXPORT_UNSUPPORTED')));
 check('TYPE_ONLY_EXPLICITLY_UNSUPPORTED',()=>assert(g.unknowns.some(u=>u.path==='type-only.js'&&u.reason==='TYPE_ONLY_OR_UNSUPPORTED_BINDING')));
 check('UNRESOLVED_NO_INVENTED_TARGET',()=>assert(!g.nodes.some(n=>n.path==='missing.js')&&g.unknowns.some(u=>u.path==='unresolved.js'&&u.reason==='UNRESOLVED_STATIC_IMPORT')));
 check('NO_DIRECTORY_RESOLUTION',()=>assert(g.unknowns.some(u=>u.path==='directory.js'&&u.reason==='UNRESOLVED_STATIC_IMPORT')));
 check('NO_TEMPLATE_TAIL_GUESS',()=>assert(g.unknowns.some(u=>u.path==='after-template.js'&&u.reason==='UNSUPPORTED_TEMPLATE_SCAN_TAIL')));
 const pr=new Map(g.provenanceReferences.map(p=>[p.id,p]));
 check('CALLER_AND_TARGET_PROVENANCE',()=>{for(const p of ['default.js','named.js','namespace.js']){const refs=local(p)[0].provenance.map(id=>pr.get(id));assert(refs.some(r=>r.sourcePath===p)&&refs.some(r=>r.sourcePath==='module.js'));}});
 check('EXACT_CONTENT_BINDING',()=>assert(g.provenanceReferences.every(p=>p.sourceContentIdentity===crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p.sourcePath))).digest('hex'))));
 check('SOURCE_ONLY_NO_EXECUTION',()=>assert(g.edges.every(e=>e.epistemicClass==='SOURCE_OBSERVATION')&&g.authority.executionAuthority===false));
 const ep=(p,k)=>g.entrypoints.some(e=>e.kind===k&&map.get(e.nodeId).path===p);
 check('MAIN_LIBRARY_ENTRYPOINT',()=>assert(ep('module.js','LIBRARY_ENTRYPOINT')));
 check('EXPORT_LIBRARY_ENTRYPOINT',()=>assert(ep('other.js','LIBRARY_ENTRYPOINT')));
 check('BIN_CLI_ENTRYPOINT',()=>assert(ep('default.js','CLI_ENTRYPOINT')));
 check('DUPLICATE_ENTRYPOINT_DEDUPLICATION',()=>assert.equal(g.entrypoints.filter(e=>e.kind==='LIBRARY_ENTRYPOINT'&&map.get(e.nodeId).path==='module.js').length,1));
 check('NO_FILENAME_GUESSING',()=>assert(!g.entrypoints.some(e=>map.get(e.nodeId).path==='index.js')));
 check('NO_AUTHORITY_INFLATION',()=>assert(Object.values(g.authority).every(v=>v===false)&&capsule.coordinates.CONTINUITY.work.ACTIVE_OBJECTIVE.state==='UNKNOWN'));
 check('DETERMINISTIC_REOPEN',()=>assert.deepEqual(invoke(['story','--continuity-capsule']),capsule));
 check('WINDOWS_POSIX_NORMALIZATION',()=>assert.equal(how.normalize('src\\module.js'),how.normalize('./src/module.js')));
 const originalEdge=local('default.js')[0].id;
 put('default.js',sources['default.js']+'\n');
 check('CALLER_STALE_REJECTED',()=>assert.match(invoke(['story','--continuity-capsule'],false).error,/R10O_SOURCE_STALE/));
 invoke(['intake','--canonical']);const callerGraph=invoke(['story','--continuity-capsule']).coordinates.HOW.structuralGraph;
 check('CALLER_EDGE_RECOMPUTED',()=>assert(!callerGraph.edges.some(e=>e.id===originalEdge)));
 const callerMap=new Map(callerGraph.nodes.map(n=>[n.id,n])),callerEdge=callerGraph.edges.find(e=>e.relationship==='IMPORTS'&&callerMap.get(e.sourceId).path==='default.js').id;
 put('module.js',sources['module.js']+'\n');
 check('TARGET_STALE_REJECTED',()=>assert.match(invoke(['story','--continuity-capsule'],false).error,/R10O_SOURCE_STALE/));
 invoke(['intake','--canonical']);const targetGraph=invoke(['story','--continuity-capsule']).coordinates.HOW.structuralGraph;
 check('TARGET_EDGE_RECOMPUTED',()=>assert(!targetGraph.edges.some(e=>e.id===callerEdge)));
 // Independent fresh product root establishes absent declarations without source injection.
 const absent=fs.mkdtempSync(path.join(os.tmpdir(),'neutral-esm-no-entry-'));
 fs.writeFileSync(path.join(absent,'README.md'),'# No entrypoint authority\n');fs.writeFileSync(path.join(absent,'package.json'),'{"name":"neutral-absent","type":"module"}');fs.writeFileSync(path.join(absent,'index.js'),'export function library() { return 1; }\n');
 for(const args of [['init'],['intake','--canonical'],['intake','--canonical']])invoke(args,true,absent);
 const ag=invoke(['story','--continuity-capsule'],true,absent).coordinates.HOW.structuralGraph;
 check('ABSENT_DECLARATION_UNKNOWN',()=>assert(ag.entrypoints.length===0&&ag.entrypointState==='UNKNOWN'));
 check('MODULE_EXPORT_NOT_PACKAGE_ENTRY',()=>assert(ag.nodes.some(n=>n.path==='index.js'&&n.kind==='MODULE')&&!ag.entrypoints.length));
 fs.writeFileSync(path.join(absent,'package.json'),JSON.stringify({name:'neutral-absent',type:'module',exports:'./index.js'}));
 invoke(['intake','--canonical'],true,absent);
 const exported=invoke(['story','--continuity-capsule'],true,absent).coordinates.HOW.structuralGraph;
 check('EXPORT_STRING_PRODUCT_ENTRYPOINT',()=>assert(exported.entrypoints.some(e=>e.kind==='LIBRARY_ENTRYPOINT')));
 fs.writeFileSync(path.join(absent,'package.json'),JSON.stringify({name:'neutral-absent',type:'module',exports:{'.':{import:'./index.js',require:'./other.cjs'}}}));
 invoke(['intake','--canonical'],true,absent);
 const conditional=invoke(['story','--continuity-capsule'],true,absent).coordinates.HOW.structuralGraph;
 check('CONDITIONAL_EXPORT_UNKNOWN',()=>assert(!conditional.entrypoints.length&&conditional.unknowns.some(u=>u.reason==='CONDITIONAL_OR_PATTERN_EXPORT_UNSUPPORTED')));
 check('RESERVED_BINDING_REJECTED',()=>assert.equal(esm.scan("import for from './module.js';").declarations.length,0));
 const strictNegatives=["import type {T} from './module.js';","import {type T} from './module.js';","import value 'from' './module.js';","import value from './module.js' with {type:'json'};","import value from './module.js' assert {type:'json'};","import value from './mo\\dule.js';","const text = `import './fake.js';`;","const re = /import fake from 'fake'/;","const x = { import: 'fake' };","import('synthetic-package');"];
 check('ADVERSARIAL_DECLARATION_GRAMMAR',()=>{for(const s of strictNegatives)assert.equal(esm.scan(s).declarations.length,0,s);});
 check('INCOMPLETE_DECLARATION_BEFORE_LEXICAL_STOP',()=>{for(const tail of [' / expression',' `template`'])assert.equal(esm.scan("import value from './module.js'"+tail).declarations.length,0);});
 check('IMPORT_BEFORE_TEMPLATE_RETAINED',()=>assert.equal(esm.scan("import value from './module.js';\nconst t = `anything`; ").declarations.length,1));
 const contract=JSON.parse(fs.readFileSync(path.join(core,'phase0/contracts/canonical-integration-contract.json'))),gate=require('./canonical-integration-release-gate.cjs').evaluateCanonicalIntegration(core,contract);
 check('CANONICAL_INTEGRATION_GATE',()=>assert.equal(gate.pass,true,JSON.stringify(gate.failures)));
 check('PERMANENT_PRODUCT_GATE_WIRED',()=>assert(JSON.parse(fs.readFileSync(path.join(core,'package.json'))).scripts.test.includes('node tests/r10o-e1-tests.cjs')));
 console.log(JSON.stringify({status:'PASS',controls:controls.length,controlIds:controls,syntheticFixturesOnly:true,noFixtureInjection:true,packagedEntrypoint:bin,syntheticRoot:root,absentRoot:absent,capsuleStructuralGraphPath:'coordinates.HOW.structuralGraph',productImportEdges:g.edges.filter(e=>e.relationship==='IMPORTS').length,falseRelationshipRate:0,adversarialCases:negativeFiles.length+strictNegatives.length+3,gate}));
}
if(require.main===module)main().catch(e=>{console.error(e.stack);process.exitCode=1;});
module.exports={main};
