'use strict';
const path=require('node:path'),{execFile}=require('node:child_process');
function readCurrent(options){return new Promise((resolve,reject)=>{
 const child=execFile(process.execPath,[path.join(__dirname,'live-worker.cjs')],{windowsHide:true,timeout:60000,maxBuffer:1024*1024,env:{...process.env,ELECTRON_RUN_AS_NODE:'1',NODE_OPTIONS:'',NODE_PATH:''}},(err,out,stderr)=>{
  if(err)return reject(Error(stderr||err.message));
  try{const p=JSON.parse(out);if(p.kind!=='HITO_LIVE_VSCODE_PROJECTION_R1'||p.executionEnabled!==false||!p.semanticResultIdentity||!p.activeRoot||!p.sections)throw Error('MALFORMED_LIVE_PROJECTION');p.metrics.transportBytes=Buffer.byteLength(out);resolve(p);}catch(e){reject(e);}
 });child.stdin.on('error',()=>{});child.stdin.end(JSON.stringify(options));
});}
module.exports={readCurrent};
