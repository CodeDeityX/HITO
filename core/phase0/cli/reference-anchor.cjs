'use strict';
// Finite anchor qualification only; no directory enumeration or content acquisition.
const fs=require('node:fs'),path=require('node:path'),{performance}=require('node:perf_hooks');
const inside=(root,p)=>{const r=path.relative(root,p);return r===''||(!path.isAbsolute(r)&&r!=='..'&&!r.startsWith('..'+path.sep));};
function qualify(root,source,raw,strong=false,context={}){
 const cost=context.cost??{references:0,candidates:0,metadataCalls:0};cost.references++;
 const out={rawReference:raw,referenceIntent:strong?'STRONG_FILESYSTEM_INTENT':'WEAK_REFERENCE_INTENT',anchorClassification:null,sourceDirectoryCandidate:null,projectRootCandidate:null,selectedAnchor:null,selectedTarget:null,selectionBasis:null,candidateChecks:[],status:null};
 const finish=(status,classification,basis)=>Object.assign(out,{status,anchorClassification:classification,selectionBasis:basis});
 if(typeof raw!=='string'||!raw||raw.length>1024||/[\x00-\x1f]/.test(raw))return finish('BLOCKED_INVALID_TARGET','INVALID_OR_ESCAPING_REFERENCE','INVALID_SYNTAX');
 let clean;try{clean=decodeURIComponent(raw.split('#')[0].split('?')[0]).replace(/\\/g,'/');}catch{return finish('BLOCKED_INVALID_TARGET','INVALID_OR_ESCAPING_REFERENCE','INVALID_ENCODING');}
 if(/^[a-z][a-z0-9+.-]*:/i.test(clean)||clean.startsWith('/')||path.isAbsolute(clean))return finish('DOCUMENTARY_EXTERNAL_REFERENCE_ONLY','EXTERNAL_REFERENCE','ABSOLUTE_OR_EXTERNAL_REFUSED');
 if(!clean||clean.includes(':')||/[\x00-\x1f]/.test(clean))return finish('BLOCKED_INVALID_TARGET','INVALID_OR_ESCAPING_REFERENCE','INVALID_DECODED_SYNTAX');
 const explicit=/^\.{1,2}\//.test(clean);if(explicit){strong=true;out.referenceIntent='STRONG_FILESYSTEM_INTENT';}
 const candidates=[];
 function candidate(anchor,base){const absolute=path.resolve(root,base,clean);if(!inside(root,absolute))return null;const relative=path.relative(root,absolute).split(path.sep).join('/');out[anchor==='SOURCE_DIRECTORY'?'sourceDirectoryCandidate':'projectRootCandidate']=relative;const previous=candidates.find(c=>c.absolute===absolute);if(previous){previous.anchors.push(anchor);}else candidates.push({absolute,relative,anchors:[anchor]});return relative;}
 if(explicit){if(candidate('SOURCE_DIRECTORY',path.posix.dirname(source))===null)return finish('BLOCKED_ROOT_ESCAPE','INVALID_OR_ESCAPING_REFERENCE','EXPLICIT_SOURCE_ESCAPE');}
 else {if(candidate('PROJECT_ROOT','')===null||candidate('SOURCE_DIRECTORY',path.posix.dirname(source))===null)return finish('BLOCKED_ROOT_ESCAPE','INVALID_OR_ESCAPING_REFERENCE','CANDIDATE_ESCAPE');}
 // Check only the exact candidate and its boundary components, never siblings or guessed targets.
 for(const c of candidates){
  const check={target:c.relative,anchors:c.anchors,state:null};out.candidateChecks.push(check);
  if(context.deadline!==undefined&&performance.now()>=context.deadline){check.state='NOT_CHECKED_TIME_BUDGET';continue;}
  cost.candidates++;
  let current=root,stat=null;
  try{
   for(const part of path.relative(root,c.absolute).split(path.sep).filter(Boolean)){
    if(context.deadline!==undefined&&performance.now()>=context.deadline){check.state='NOT_CHECKED_TIME_BUDGET';break;}
    current=path.join(current,part);cost.metadataCalls++;stat=fs.lstatSync(current);
    if(stat.isSymbolicLink()){check.state='BLOCKED_LINK_OR_ROOT_ESCAPE';break;}
    cost.metadataCalls++;if(!inside(root,fs.realpathSync.native(current))){check.state='BLOCKED_LINK_OR_ROOT_ESCAPE';break;}
   }
   if(!check.state)check.state=stat?.isFile()?'EXISTS_FILE':stat?.isDirectory()||c.absolute===root?'EXISTS_DIRECTORY':'UNSUPPORTED_TYPE';
  }catch(e){check.state=['ENOENT','ENOTDIR'].includes(e.code)?'MISSING':`METADATA_ERROR_${e.code??'UNKNOWN'}`;}
 }
 if(out.candidateChecks.some(c=>c.state==='BLOCKED_LINK_OR_ROOT_ESCAPE'))return finish('BLOCKED_LINK_OR_ROOT_ESCAPE','INVALID_OR_ESCAPING_REFERENCE','BOUNDARY_REFUSAL');
 if(out.candidateChecks.some(c=>c.state==='NOT_CHECKED_TIME_BUDGET'||c.state.startsWith('METADATA_ERROR_')))return finish('DEFERRED_ANCHOR_QUALIFICATION','AMBIGUOUS_LOCAL_ANCHOR','INCOMPLETE_METADATA_QUALIFICATION');
 const existing=out.candidateChecks.filter(c=>c.state.startsWith('EXISTS_'));
 if(existing.length===1){const c=existing[0];out.selectedTarget=c.target;out.selectedAnchor=explicit?'SOURCE_DIRECTORY':c.anchors.includes('PROJECT_ROOT')?'PROJECT_ROOT':'SOURCE_DIRECTORY';out.relative=c.target;out.absolute=path.join(root,c.target);return finish('IN_ROOT',explicit?'SOURCE_EXPLICIT_RELATIVE':out.selectedAnchor==='PROJECT_ROOT'?'PROJECT_ROOT_CANDIDATE':'SOURCE_DIRECTORY_CANDIDATE',explicit?'EXPLICIT_SOURCE_SYNTAX':c.anchors.length===2?'EQUIVALENT_ANCHORS_UNIQUE_TARGET':'ONLY_EXISTING_IN_ROOT_CANDIDATE');}
 if(existing.length>1)return finish('AMBIGUOUS_LOCAL_ANCHOR','AMBIGUOUS_LOCAL_ANCHOR','DISTINCT_EXISTING_CANDIDATES_REFUSED');
 if(strong)return finish('MISSING_REFERENCED_LOCAL_ARTIFACT',explicit?'SOURCE_EXPLICIT_RELATIVE':'AMBIGUOUS_LOCAL_ANCHOR','NO_EXISTING_PERMITTED_CANDIDATE');
 const subtype=/^v?\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/i.test(clean)?'SEMANTIC_VERSION':/^(?:\d{1,3}\.){3}\d{1,3}$/.test(clean)?'ADDRESS_LITERAL':clean.includes('/')?'SYMBOLIC_OR_RESOURCE_NAMESPACE':'DOTTED_OR_SYMBOLIC_LITERAL';
 out.namespaceKind=subtype;return finish('NON_FILESYSTEM_NAMESPACE','NON_FILESYSTEM_NAMESPACE','WEAK_INTENT_WITHOUT_EXISTING_LOCAL_TARGET');
}
module.exports={qualify};
