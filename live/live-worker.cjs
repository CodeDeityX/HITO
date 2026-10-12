'use strict';
// Fixed, bundled core API. This worker can only request status; no caller command is accepted.
const path=require('node:path'),fs=require('node:fs'),{performance}=require('node:perf_hooks');
const {project}=require('./live-model.cjs');
async function readCurrent(options){
 if(Object.keys(options).some(k=>!['explicit','cwd','workspaceRoots','composition'].includes(k)))throw Error('UNSUPPORTED_LIVE_OPTION');
 const api=require('../core/phase0/cli/product-entry.cjs');
 const start=performance.now();let structuredBytes=0;
 const read=fs.readFileSync;
 fs.readFileSync=function(file,...args){const value=read.call(fs,file,...args);if(typeof file==='string'&&/\.jsonl?$/.test(file)&&!file.includes('node_modules'))structuredBytes+=Buffer.byteLength(value);return value;};
 let result;try{result=await api.execute('status',options);}finally{fs.readFileSync=read;}
 const projection=project(result);
 projection.metrics={apiAndProjectionMs:performance.now()-start,structuredPayloadBytesRead:structuredBytes,readBasis:'JSON/JSONL reads by accepted core after module loading; repeated reads counted; no full result serialization',fullForensicBytesTransferred:0};
 return projection;
}
if(require.main===module){let s='';process.stdin.setEncoding('utf8');process.stdin.on('data',v=>{s+=v;if(s.length>32768){process.stderr.write('OPTIONS_LIMIT');process.exit(1);}});process.stdin.on('end',async()=>{try{process.stdout.write(JSON.stringify(await readCurrent(JSON.parse(s))));}catch(e){process.stderr.write(String(e.message).slice(0,1200));process.exitCode=1;}});}
module.exports={readCurrent};
