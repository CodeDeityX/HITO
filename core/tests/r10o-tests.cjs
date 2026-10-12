'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process');
const how=require('../phase0/cli/structural-how.cjs');
const persistence=require('../phase0/dist/contracts/persistence.js');
const gate=require('./canonical-integration-release-gate.cjs');
const core=path.resolve(__dirname,'..'),bin=path.join(core,'bin/hito.cjs');
const controls=[];function check(id,f){f();controls.push('R10O_'+id);}
async function main(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'neutral-r10o-'));
 const put=(p,s)=>{const f=path.join(root,p);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,s);};
 const files={
  'README.md':'# Neutral structural probe\n\nStatic topology only.\n',
  'package.json':JSON.stringify({name:'neutral-structure',version:'0.0.1',type:'module',bin:{neutral:'src/main.mjs'},main:'src/parse.mjs',scripts:{test:'node tests/check.mjs',build:'node bin/build.mjs'},dependencies:{'neutral-library':'1.0.0','unused-dependency':'2.0.0'}}),
  'src/main.mjs':"import { parse as decode } from './parse.mjs';\nexport function run(input) { return decode(input); }\nrun('never execute this target');\n",
  'src/parse.mjs':"import { inspect } from './analyze.mjs';\nexport function parse(input) { return inspect(input); }\n",
  'src/analyze.mjs':"import { evaluate } from 'neutral-library';\nexport function inspect(input) { return evaluate(input); }\n",
  'src/store.mjs':"import { readFileSync, writeFileSync } from 'node:fs';\nexport function load(file) { return readFileSync(file); }\nexport function save(file, value) { writeFileSync(file, value); }\n",
  'src/execute.mjs':"import { execFileSync } from 'node:child_process';\nexport function execute(file) { return execFileSync(file); }\n",
  'tests/check.mjs':"import { parse } from '../src/parse.mjs';\nparse('test definition only');\n",
  'bin/build.mjs':"export function build(input) { return input; }\n",
  'tsconfig.json':'{"compilerOptions":{"strict":true}}',
  '.github/workflows/ci.yaml':'name: Static declaration\non: push\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - run: never-run-this\n'
 };
 for(const [p,s]of Object.entries(files))put(p,s);
 put('lib/binary.mjs',Buffer.from([0,255,0]));put('lib/unknown.mjs','const dynamic = unknown();');
 const invoke=(args,ok=true)=>{const r=cp.spawnSync(process.execPath,[bin,...args,'--root',root,'--json'],{encoding:'utf8',timeout:60000,maxBuffer:16000000});if(ok)assert.equal(r.status,0,r.stderr);else assert.notEqual(r.status,0);return JSON.parse(ok?r.stdout:r.stderr);};
 check('FRESH_NO_INJECTED_STATE',()=>assert(!fs.existsSync(path.join(root,'.maat'))));
 invoke(['init']);invoke(['intake','--canonical']);invoke(['intake','--canonical']);
 const model=(await persistence.readCanonicalRevisionValidated(root)).model;
 const capsule=invoke(['story','--continuity-capsule']),g=capsule.coordinates.HOW.structuralGraph;
 check('PACKAGED_NORMAL_BOOTSTRAP',()=>assert.equal(capsule.frozenRevision.revision,2));
 check('VALIDATED_CANONICAL_REOPEN',()=>assert.equal(g.canonicalModelHash,model.canonicalState.integrity.modelHash));
 check('CAPSULE_INTEGRATION',()=>assert(g.nodes.length>10&&g.edges.length>5));
 check('CLI_ENTRYPOINT',()=>assert(g.entrypoints.some(e=>e.kind==='CLI_ENTRYPOINT')));
 check('LIBRARY_ENTRYPOINT',()=>assert(g.entrypoints.some(e=>e.kind==='LIBRARY_ENTRYPOINT')));
 check('TEST_ENTRYPOINT',()=>assert(g.entrypoints.some(e=>e.kind==='TEST_ENTRYPOINT')));
 check('BUILD_ENTRYPOINT',()=>assert(g.entrypoints.some(e=>e.kind==='BUILD_ENTRYPOINT')));
 check('MODULE_EXTRACTION',()=>assert(g.nodes.some(n=>n.path==='src/parse.mjs'&&n.kind==='MODULE')));
 check('FUNCTION_EXTRACTION',()=>assert(g.nodes.some(n=>n.symbol==='inspect'&&n.kind==='FUNCTION')));
 const byId=new Map(g.nodes.map(n=>[n.id,n]));
 check('DIRECT_CALL_ALIAS_RESOLUTION',()=>assert(g.edges.some(e=>e.relationship==='CALLS'&&byId.get(e.sourceId).symbol==='run'&&byId.get(e.targetId).symbol==='parse')));
 check('IMPORT_RELATIONSHIP',()=>assert(g.edges.some(e=>e.relationship==='IMPORTS')));
 check('RUNTIME_HOMES',()=>assert(g.runtimeHomes.some(h=>h.role==='CLI_ENTRY')));
 check('PERSISTENCE_HOME_SUPPORTED_BY_API',()=>assert(g.runtimeHomes.some(h=>h.role==='PERSISTENCE_API_CALL_SITE')));
 check('EXECUTION_HOME_SUPPORTED_BY_API',()=>assert(g.runtimeHomes.some(h=>h.role==='EXECUTION_API_CALL_SITE')));
 check('CONFIGURATION_TOPOLOGY',()=>assert(g.nodes.some(n=>n.kind==='CONFIGURATION')));
 check('TEST_DEFINITION_ONLY',()=>assert(g.nodes.some(n=>n.kind==='TEST_DEFINITION'&&n.verification==='DECLARED_NOT_EXECUTED')));
 check('BUILD_DEFINITION_ONLY',()=>assert(g.nodes.some(n=>n.kind==='BUILD_DEFINITION'&&n.verification==='DECLARED_NOT_EXECUTED')));
 check('CI_DEFINITION_ONLY',()=>assert(g.nodes.some(n=>n.kind==='CI_DEFINITION'&&n.verification==='DEFINITION_ONLY_NOT_EXECUTED')));
 check('DEPENDENCIES_RELEVANCE_FILTER',()=>assert.deepEqual(g.nodes.filter(n=>n.kind==='DEPENDENCY').map(n=>n.symbol),['dependency:neutral-library']));
 const refs=new Map(g.provenanceReferences.map(p=>[p.id,p]));
 check('ALL_NODES_PROVENANCE_BOUND',()=>assert(g.nodes.every(n=>n.provenance.length&&n.provenance.every(r=>refs.has(r)))));
 check('ALL_EDGES_PROVENANCE_BOUND',()=>assert(g.edges.every(n=>n.provenance.length&&n.provenance.every(r=>refs.has(r)))));
 check('EXACT_CONTENT_IDENTITY',()=>assert(g.provenanceReferences.every(p=>p.sourceContentIdentity===require('../phase0/contracts/product-entry-persistence.cjs').sha(fs.readFileSync(path.join(root,p.sourcePath))))));
 check('CANONICAL_PAIRS_ONLY',()=>assert(g.provenanceReferences.every(p=>(model.capabilities??[]).some(c=>c.capabilityId===p.canonicalCapabilityId&&c.implementationRefs.includes('phase2-source:'+JSON.stringify({path:p.sourcePath,sha256:p.sourceContentIdentity}))))));
 check('NO_GRAPH_STORE',()=>assert(!fs.readdirSync(path.join(root,'.maat')).some(n=>/structural|r10o/i.test(n))));
 check('DETERMINISTIC_SERIALIZATION',()=>assert.equal(JSON.stringify(invoke(['story','--continuity-capsule'])),JSON.stringify(capsule)));
 check('DETERMINISTIC_INPUT_ORDER',()=>{const m=structuredClone(model);m.capabilities.reverse();assert.deepEqual(how.derive(root,m),g);});
 check('NO_EXECUTION_INFLATION',()=>assert(g.nodes.every(n=>n.epistemicClass==='SOURCE_OBSERVATION')&&g.edges.every(e=>e.epistemicClass==='SOURCE_OBSERVATION')));
 check('AUTHORITY_PRESERVATION',()=>assert(Object.values(g.authority).every(v=>v===false)&&capsule.authority.execution===false));
 check('WORK_UNKNOWN_PRESERVED',()=>{for(const k of ['ACTIVE_OBJECTIVE','ACCEPTED_DECISIONS','UNFINISHED_WORK','CURRENT_BLOCKERS'])assert.equal(capsule.coordinates.CONTINUITY.work[k].state,'UNKNOWN');});
 check('NO_NEXT_MUTATION',()=>assert.equal(capsule.authority.nextAction.state,'NO_JUSTIFIED_NEXT_STEP'));
 check('READ_PRESERVES_SOURCE',()=>{for(const [p,s]of Object.entries(files))assert.equal(fs.readFileSync(path.join(root,p),'utf8'),s);});
 check('CALLER_CHANGE_INVALIDATES',()=>{put('src/main.mjs',files['src/main.mjs']+'\n');assert.match(invoke(['story','--continuity-capsule'],false).error,/R10O_SOURCE_STALE/);put('src/main.mjs',files['src/main.mjs']);});
 check('CALLEE_CHANGE_INVALIDATES',()=>{put('src/parse.mjs',files['src/parse.mjs']+'\n');assert.throws(()=>how.derive(root,model),/R10O_SOURCE_STALE/);put('src/parse.mjs',files['src/parse.mjs']);});
 check('RENAMED_MODULE_INVALIDATES',()=>{fs.renameSync(path.join(root,'src/parse.mjs'),path.join(root,'src/renamed.mjs'));assert.throws(()=>how.derive(root,model),/STALE_OR_UNAVAILABLE/);fs.renameSync(path.join(root,'src/renamed.mjs'),path.join(root,'src/parse.mjs'));});
 check('CANONICAL_REQUIRED',()=>assert.throws(()=>how.derive(root,{}),/CANONICAL_REQUIRED/));
 check('PATH_NORMALIZATION',()=>assert.equal(how.normalize('./src//parse.mjs'),'src/parse.mjs'));
 check('WINDOWS_PATH_NORMALIZATION',()=>assert.equal(how.normalize('src\\parse.mjs'),'src/parse.mjs'));
 check('PATH_TRAVERSAL_REJECTED',()=>{for(const p of ['../outside','C:\\outside','/outside','\\\\server\\x'])assert.throws(()=>how.normalize(p));});
 check('CASE_COLLISION_REJECTED',()=>{const m=structuredClone(model),c=m.capabilities.find(c=>c.implementationRefs.some(r=>r.startsWith('phase2-source:')&&r.includes('src/main.mjs')));const ref=c.implementationRefs.find(r=>r.startsWith('phase2-source:')&&r.includes('src/main.mjs'));c.implementationRefs.push(ref.replace('src/main.mjs','src/MAIN.mjs'));m.configurationItems.push('src/MAIN.mjs');assert.throws(()=>how.derive(root,m),/DUPLICATE_PATH/);});
 check('FILE_COUNT_BOUND',()=>{for(let i=0;i<40;i++)put('lib/f'+i+'.mjs','');assert.throws(()=>how.discover(root),/FILE_COUNT_BOUND/);for(let i=0;i<40;i++)fs.unlinkSync(path.join(root,'lib/f'+i+'.mjs'));});
 check('PER_FILE_BYTE_BOUND',()=>{put('lib/large.mjs','x'.repeat(how.LIMITS.perFile+1));assert.throws(()=>how.discover(root),/FILE_BOUND/);fs.unlinkSync(path.join(root,'lib/large.mjs'));});
 check('TOTAL_BYTE_BOUND',()=>{for(let i=0;i<9;i++)put('lib/bytes'+i+'.mjs',' '.repeat(60000));assert.throws(()=>how.discover(root),/BYTE_BOUND/);for(let i=0;i<9;i++)fs.unlinkSync(path.join(root,'lib/bytes'+i+'.mjs'));});
 check('DIRECTORY_ENTRY_BOUND',()=>{for(let i=0;i<130;i++)put('lib/entry'+i+'.txt','');assert.throws(()=>how.discover(root),/DIRECTORY_BOUND/);for(let i=0;i<130;i++)fs.unlinkSync(path.join(root,'lib/entry'+i+'.txt'));});
 check('SYMLINK_DIRECTORY_REJECTED',()=>{const outside=fs.mkdtempSync(path.join(os.tmpdir(),'neutral-r10o-link-'));fs.renameSync(path.join(root,'lib'),path.join(root,'lib-original'));fs.symlinkSync(outside,path.join(root,'lib'),'junction');assert.throws(()=>how.discover(root),/LINK_OR_JUNCTION/);fs.unlinkSync(path.join(root,'lib'));fs.renameSync(path.join(root,'lib-original'),path.join(root,'lib'));});
 check('UNADMITTED_FILE_NOT_PROJECTED',()=>{put('lib/unadmitted.mjs','export function surprise(x) { return x; }');assert(!how.derive(root,model).nodes.some(n=>n.path==='lib/unadmitted.mjs'));fs.unlinkSync(path.join(root,'lib/unadmitted.mjs'));});
 check('EMPTY_RELATIONSHIPS_UNKNOWN',()=>{const m=structuredClone(model);m.capabilities=[];const empty=how.derive(root,m);assert.equal(empty.relationshipState,'UNKNOWN');assert.equal(empty.nodes.length,0);});
 const negatives=[
  ['COMMENT_ONLY','// parse(input);\n'],['STRING_ONLY',"'parse(input)';\n"],
  ['SHADOWED_PARAMETER',"import { parse } from './parse.mjs'; function run(parse) { return parse('x'); }"],
  ['DYNAMIC_MEMBER',"import { parse } from './parse.mjs'; function run(x) { return x.parse(x); }"],
  ['REASSIGNED_IMPORT',"import { parse } from './parse.mjs'; parse = other; parse('x');"],
  ['REGEX_LITERAL','/parse(x)/;'],['TEMPLATE_LITERAL','`parse(x)`;'],
  ['UNRESOLVED_IDENTIFIER',"function run(x) { return invented(x); }"],
  ['DUPLICATE_BINDING',"import { parse } from './parse.mjs'; function parse(x) { return x; }"],
  ['DYNAMIC_IMPORT',"import('./parse.mjs');"],['UNSUPPORTED_LANGUAGE','fn main() { parse(); }']
 ];
 let adversarial=0;
 for(const [label,src]of negatives){check('NEGATIVE_'+label,()=>{try{const p=how.parse(src);assert.equal(p.topCalls.length+p.funcs.flatMap(f=>f.calls).length,0);}catch(e){if(e.code==='ERR_ASSERTION')throw e;}adversarial++;});}
 put('src/main.mjs',files['src/main.mjs']+'\n');
 invoke(['intake','--canonical']);const updated=invoke(['story','--continuity-capsule']).coordinates.HOW.structuralGraph;
 check('BINARY_NON_TEXT_SAFETY',()=>assert(updated.unknowns.some(u=>u.reason==='BINARY_OR_INVALID_UTF8')));
 check('UNKNOWN_RELATIONSHIP_PRESERVATION',()=>assert(updated.unknowns.some(u=>u.path==='lib/unknown.mjs')&&!updated.edges.some(e=>updated.nodes.find(n=>n.id===e.sourceId)?.path==='lib/unknown.mjs')));
 check('CURRENTNESS_REOBSERVATION',()=>assert.equal(updated.modelRevision,3));
 const contract=JSON.parse(fs.readFileSync(path.join(core,'phase0/contracts/canonical-integration-contract.json'))),gateResult=gate.evaluateCanonicalIntegration(core,contract);
 check('INTEGRATION_GATE',()=>assert.equal(gateResult.pass,true,JSON.stringify(gateResult.failures)));
 check('SINGLE_TRUTH_OWNER',()=>assert.equal(gateResult.truthOwnerCount,1));
 check('METRICS_EXACT',()=>assert.equal(capsule.metrics.structuralHow.bytes,Buffer.byteLength(JSON.stringify(g)+'\n')));
 process.stdout.write(JSON.stringify({status:'PASS',controlIds:controls,controls:controls.length,syntheticFixturesOnly:true,packagedEntrypoint:bin,syntheticRoot:root,noFixtureInjection:true,testsExecutedInTarget:0,falseRelationshipRate:0,adversarialCases:adversarial,metrics:capsule.metrics.structuralHow,gate:gateResult})+'\n');
}
if(require.main===module)main().catch(e=>{console.error(e.stack);process.exitCode=1;});
module.exports={main};
