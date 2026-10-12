'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'); const os=require('node:os'); const path=require('node:path');
const r1=require('../phase0/cli/progressive-acquisition.cjs');
const host=require('../phase0/hosts/shared/product-entry-host.cjs');
const store=require('../phase0/contracts/product-entry-persistence.cjs');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'hito-r9f-'));
function observed(rel,content,dimension='projectMetadata',authority='STRUCTURAL_DECLARATION'){const b=Buffer.from(content);return r1.artifact(root,rel,dimension,authority,{state:'OBSERVED',content,contentSha256:store.sha(b),bytes:b.length});}
function claims(rel,content,dimension,authority){return r1.claimsFor(observed(rel,content,dimension,authority),'r9f-test-subject');}
const valid=`[project]\nname = 'demo-package'\nversion = '1.2.3'\ndescription = 'A bounded package'\nrequires-python = '>=3.10'\n\n[build-system]\nrequires = ['hatchling']\nbuild-backend = 'hatchling.build'\n`;
const py=claims('pyproject.toml',valid);
for(const key of ['project.name','project.version','project.description','project.requires-python','build-system.build-backend'])assert.ok(py.some(c=>c.statement.key===key),`missing ${key}`);
assert.equal(py.find(c=>c.statement.key==='project.description').authority,'DOCUMENTARY_EVIDENCE_ONLY');
assert.equal(claims('pyproject.toml',`[project]\nname = 'unterminated\n`).some(c=>c.statement.key.startsWith('project.')),false);
assert.equal(claims('pyproject.toml',`[project]\nname = ['ambiguous']\n`).some(c=>c.statement.key==='project.name'),false);
assert.equal(claims('pyproject.toml',`[project]\nname = 'first'\nname = 'second'\n`).some(c=>c.statement.key==='project.name'),false);
assert.equal(claims('pyproject.toml',`[project]\nname = 'first'\n[project]\nversion = '1'\n`).some(c=>c.statement.key.startsWith('project.')),false);
assert.equal(claims('pyproject.toml',`[project]\nname = 'a\\'b'\n`).some(c=>c.statement.key==='project.name'),false);
assert.equal(claims('pyproject.toml',`[project]\nname = "\\u0041"\n`).find(c=>c.statement.key==='project.name')?.statement.value,'A');
assert.equal(claims('pyproject.toml',`[project]\ndescription = "a#b"\n`).find(c=>c.statement.key==='project.description')?.statement.value,'a#b');
assert.equal(claims('pyproject.toml',`[project]\ndescription = """multi"""\n`).some(c=>c.statement.key==='project.description'),false);
assert.equal(claims('pyproject.toml',`[project]\nname = ['a']\n`).some(c=>c.statement.key==='project.name'),false);
assert.equal(claims('pyproject.toml',`[project]\nproject.name = "x"\n`).some(c=>c.statement.key==='project.name'),false);
for(const esc of ['\\uD800','\\uDFFF','\\U0000D800','\\U0000DFFF'])assert.equal(claims('pyproject.toml',`[project]\nname = "${esc}"\n`).some(c=>c.statement.key==='project.name'),false);
for(const code of [0,1,8,11,31,127])assert.equal(claims('pyproject.toml',`[project]\nname = "a${String.fromCodePoint(code)}b"\n`).some(c=>c.statement.key==='project.name'),false);
assert.equal(claims('requests_cache/__init__.py','x=1','runtime','PHYSICAL_OBSERVATION').some(c=>c.statement.value==='requests_cache'),true);
assert.equal(claims('requests_cache/models/base.py','x=1','runtime','PHYSICAL_OBSERVATION').some(c=>c.statement.value==='requests_cache.models.base'),true);
assert.equal(claims('tests/test_demo.py','def test_demo(): pass','runtime','PHYSICAL_OBSERVATION').some(c=>c.statement.key==='testDefinition'),true);
fs.mkdirSync(path.join(root,'unobserved'));fs.writeFileSync(path.join(root,'unobserved','elsewhere.py'),'x=1');
const noArtifact=claims('README.md','# no python bytes','architecture','DOCUMENTARY_EVIDENCE_ONLY');assert.equal(noArtifact.some(c=>c.statement.key==='modulePath'),false);
assert.equal(claims('package.json','{"name":"node-demo","version":"1.0.0"}').some(c=>c.statement.key==='name'),true);
const malformedAuthorityCases=[
 ['TOML_MALFORMED_UNKNOWN_VALUE_NO_STRUCTURAL_PROMOTION',`[project]\nname = 'ok'\nunknown = "unterminated`, 'project.name'],
 ['TOML_INVALID_BARE_LINE_NO_STRUCTURAL_PROMOTION',`[project]\nname = 'ok'\nTHIS IS NOT TOML`, 'project.name'],
 ['TOML_DUPLICATE_UNSUPPORTED_KEY_NO_STRUCTURAL_PROMOTION',`[project]\nname = 'ok'\nunknown = 'a'\nunknown = 'b'`, 'project.name'],
 ['TOML_BROKEN_UNSUPPORTED_TABLE_NO_STRUCTURAL_PROMOTION',`[project]\nname = 'ok'\n[broken`, 'project.name'],
 ['TOML_INVALID_ESCAPE_UNSUPPORTED_FIELD_NO_STRUCTURAL_PROMOTION',`[project]\nname = 'ok'\nunknown = "\\q"`, 'project.name']
];
for(const [id,content,key] of malformedAuthorityCases){const c=claims('pyproject.toml',content).find(x=>x.statement.key===key);assert.ok(c,id);assert.notEqual(c.authority,'STRUCTURAL_DECLARATION',id);assert.notEqual(c.verification,'STRUCTURALLY_SUPPORTED',id);}
const authorityCases=[
 ['PYPROJECT_NO_FULL_VALIDATOR_NO_STRUCTURAL_AUTHORITY',`[project]\nname = 'ok'\n[tool.x]\nvalue = [1,2,3]`, 'project.name'],
 ['PYPROJECT_INVALID_UNKNOWN_SECTION_NO_STRUCTURAL_PROMOTION',`[project]\nname = 'ok'\n[tool.x]\nTHIS IS NOT TOML`, 'project.name'],
 ['PYPROJECT_DUPLICATE_UNKNOWN_SECTION_KEY_NO_STRUCTURAL_PROMOTION',`[project]\nname = 'ok'\n[tool.x]\nfoo = 'a'\nfoo = 'b'`, 'project.name'],
 ['PYPROJECT_INVALID_TOP_LEVEL_LINE_NO_STRUCTURAL_PROMOTION',`THIS IS NOT TOML\n[project]\nname = 'ok'`, 'project.name'],
 ['PYPROJECT_MALFORMED_UNKNOWN_ARRAY_NO_STRUCTURAL_PROMOTION',`[project]\nname = 'ok'\n[tool.x]\nfoo = [1,,2]`, 'project.name'],
 ['PYPROJECT_VALID_COMPLEX_UNSUPPORTED_SECTION_STILL_BOUNDED_AUTHORITY',`[project]\nname = 'ok'\n[tool.x]\nfoo = [1,2,3]\nbar = {a=1}`, 'project.name']
];
for(const [id,content,key] of authorityCases){const c=claims('pyproject.toml',content).find(x=>x.statement.key===key);assert.equal(c.authority,'PHYSICAL_OBSERVATION',id);assert.equal(c.verification,'PHYSICALLY_OBSERVED',id);}
for(const key of ['project.name','project.version','project.requires-python','build-system.build-backend']){const c=py.find(x=>x.statement.key===key);assert.equal(c.authority,'PHYSICAL_OBSERVATION');assert.equal(c.verification,'PHYSICALLY_OBSERVED');}
assert.equal(py.find(c=>c.statement.key==='project.description').authority,'DOCUMENTARY_EVIDENCE_ONLY');assert.equal(py.find(c=>c.statement.key==='project.description').verification,'NOT_VERIFIED');
const many=Array.from({length:12},(_,i)=>({claimIdentity:`c${i}`,statement:{key:'modulePath',value:`pkg.m${i}`},scope:{path:`pkg/m${i}.py`}}));
const story=host.story({subjectIdentity:'r9f',claims:many,semanticResultIdentity:'id',coverage:{},provenance:[],nextStep:null},{});
assert.equal(story.projectOrientation.modules.length,8);assert.equal(story.projectOrientation.additionalFactsAvailable,true);
const tests=['PYPROJECT_FIELDS','DESCRIPTION_DOCUMENTARY_ONLY','MALFORMED_PYPROJECT_FAIL_CLOSED','UNSUPPORTED_TOML_FAIL_CLOSED','PYTHON_INIT_MODULE_PATH','PYTHON_NESTED_MODULE_PATH','OBSERVED_ONLY_MODULE_FACTS','TEST_DEFINITION_AVAILABLE','PACKAGE_JSON_PREDECESSOR','DISPLAY_TRUNCATION_DISCLOSES_MORE','TOML_DUPLICATE_KEY_FAIL_CLOSED','TOML_DUPLICATE_TABLE_FAIL_CLOSED','TOML_INVALID_LITERAL_ESCAPE_FAIL_CLOSED','TOML_UNICODE_ESCAPE_CORRECT','TOML_QUOTED_HASH_CORRECT','TOML_MULTILINE_FAIL_CLOSED','TOML_ARRAY_TARGET_FAIL_CLOSED','TOML_DOTTED_TARGET_FAIL_CLOSED','TOML_SURROGATE_ESCAPE_FAIL_CLOSED','TOML_RAW_CONTROL_CHAR_FAIL_CLOSED',...malformedAuthorityCases.map(x=>x[0]),...authorityCases.map(x=>x[0])];
console.log(JSON.stringify({status:'PASS',controls:tests.length,tests,projectOrientation:{package:py.find(c=>c.statement.key==='project.name').statement.value,version:py.find(c=>c.statement.key==='project.version').statement.value,description:py.find(c=>c.statement.key==='project.description').statement.value,requiresPython:py.find(c=>c.statement.key==='project.requires-python').statement.value,buildBackend:py.find(c=>c.statement.key==='build-system.build-backend').statement.value}}));
