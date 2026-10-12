'use strict';
// Persistence adapter owns transport receipts only. G15 remains semantic owner.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {persistencePaths}=require('../dist/contracts/persistence.js');
const {assertHitoFirstObservationResult}=require('../dist/convergence/g15-universal-protocol-projection.js');
const {observeHitoFirst}=require('../dist/convergence/g16-installability-migration-recovery.js');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const inside=(root,p)=>{const rel=path.relative(root,p);return rel===''||(!path.isAbsolute(rel)&&rel!=='..'&&!rel.startsWith('..'+path.sep));};
function exists(p){try{fs.lstatSync(p);return true;}catch(e){if(e.code==='ENOENT')return false;throw e;}}
function safe(root,p){
 if(!inside(root,p))throw Error('ROOT_ESCAPE');
 let current=root;
 for(const part of path.relative(root,p).split(path.sep).filter(Boolean)){
  current=path.join(current,part);
  if(exists(current)){
   const stat=fs.lstatSync(current);
   if(stat.isSymbolicLink()||!inside(root,fs.realpathSync.native(current)))throw Error('LINK_OR_JUNCTION_IN_STATE_PATH');
  }
 }
 return p;
}
function paths(root){const owner=persistencePaths(root);for(const p of Object.values(owner))safe(root,p);return {...owner,receipt:safe(root,path.join(owner.maatRoot,'first-observation-entry-r1.json'))};}
function identity(root){return 'hito_project_'+sha(Buffer.from(root));}
function read(root){
 const p=paths(root);if(!exists(p.receipt))return null;
 const bytes=fs.readFileSync(p.receipt);if(bytes.length>1500000)throw Error('RECEIPT_LIMIT');
 const receipt=JSON.parse(bytes.toString('utf8'));
 if(Object.keys(receipt).sort().join('|')!==['kind','root','request','exclusions','acquisition'].sort().join('|')||receipt.kind!=='HITO_LOCAL_FIRST_OBSERVATION_RECEIPT_R1'||receipt.root!==root||receipt.request.subjectIdentity!==identity(root))throw Error('RECEIPT_ROOT_OR_SCHEMA_MISMATCH');
 if(!Array.isArray(receipt.exclusions)||!receipt.acquisition||receipt.acquisition.scope!=='EXPLICIT_ROOT_README_ONLY')throw Error('RECEIPT_ACQUISITION_SCHEMA');
 const observed=observeHitoFirst(receipt.request);assertHitoFirstObservationResult(observed.result);
 return {receipt,observed,bytes:bytes.length};
}
function create(root,receipt){
 const p=paths(root);if(exists(p.maatRoot))throw Error('EXISTING_STATE_REQUIRES_REOPEN_OR_COMPARATIVE_INPUT');
 // Exclusive directory creation serializes concurrent init. Incomplete state fails closed.
 fs.mkdirSync(p.maatRoot);
 const tmp=safe(root,path.join(p.maatRoot,'first-observation-entry-r1.json.stage'));
 const fd=fs.openSync(tmp,'wx');try{fs.writeFileSync(fd,JSON.stringify(receipt,null,2)+'\n');fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
 if(exists(p.receipt))throw Error('REFUSE_OVERWRITE');
 fs.renameSync(tmp,p.receipt);
 // File flush + same-directory rename; no claim of power-loss directory durability on Windows.
 return p.receipt;
}
module.exports={sha,inside,exists,safe,paths,identity,read,create};
