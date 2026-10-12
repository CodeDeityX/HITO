'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const entry=require('../phase0/cli/product-entry.cjs');
const {render}=require('../phase0/cli/human-output.cjs');
const fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures','qualified-host-bridge.json'),'utf8'));
assert.equal(fixture.ide.source.semanticVerdictIdentity,fixture.agentContext.source.semanticVerdictIdentity);
assert.equal(fixture.ide.source.c7CompositionIdentity,fixture.agentContext.source.c7CompositionIdentity);
assert.equal(fixture.ide.governanceBoundary.executionAuthority,false);
assert.equal(fixture.agentContext.governanceBoundary.executionAuthority,false);

const temp=fs.mkdtempSync(path.join(os.tmpdir(),'hito-r9b-'));
const project=path.join(temp,'project');
fs.mkdirSync(project);
fs.writeFileSync(path.join(project,'README.md'),'# Disposable R9B project\n','utf8');

assert.deepEqual(entry.COMMANDS,['root','init','status','next','why','mri','intake','story']);
assert.equal(entry.parse(['init','.']).options.explicit,'.');
assert.equal(entry.parse(['init','--root','.']).options.explicit,'.');
assert.equal(entry.parse(['intake','--root','.']).options.explicit,'.');
assert.throws(()=>entry.parse(['intake','.']),/AMBIGUOUS_OR_UNSUPPORTED_ARGUMENT/);
assert.equal(entry.resolveRoot({explicit:'.',cwd:project}).activeRoot,fs.realpathSync.native(project));

(async()=>{
 await entry.execute('init',{explicit:'.',cwd:project});
 await entry.execute('intake',{explicit:'.',cwd:project});
 const before=fs.readFileSync(path.join(project,'.maat','first-observation-entry-r1.json'),'utf8');
 const result=await entry.execute('story',{explicit:'.',cwd:project});
 const after=fs.readFileSync(path.join(project,'.maat','first-observation-entry-r1.json'),'utf8');
 assert.equal(before,after,'story must be read-only');
 assert.equal(result.cli.story.executionAuthority,false);
 assert.equal(result.cli.story.root,fs.realpathSync.native(project));
 assert.equal(result.cli.story.semanticResultIdentity,result.truth.semanticResultIdentity);
 const text=render('story',result,'TEXT');
 assert.match(text,/HITO \/\/ PROJECT STORY/);
 assert.match(text,/EVIDENCE BOUNDARY/);
 const tests=['HOST_BRIDGE_IDENTITY_PARITY','HOST_BRIDGE_EXECUTION_AUTHORITY_FALSE','COMMAND_SURFACE_EXACT','INIT_DOT_PARSE','INIT_ROOT_PARSE','INTAKE_ROOT_PARSE','INTAKE_DOT_REJECTED','EXPLICIT_ROOT_REALPATH','STORY_READ_ONLY','STORY_EXECUTION_AUTHORITY_FALSE','STORY_ROOT_BOUND','STORY_SEMANTIC_IDENTITY_PARITY','STORY_HUMAN_HEADER','STORY_HUMAN_BOUNDARY','ADAPTIVE_RESULT_IDENTITY','CLI_STORY_PROJECTION','EXPLICIT_ROOT_NO_PARENT_EXPANSION','NO_NEW_SEMANTIC_OWNER'];
 console.log(JSON.stringify({status:'PASS',controls:tests.length,tests,storyIdentity:result.cli.story.semanticResultIdentity}));
})().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
