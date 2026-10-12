'use strict';
// Projection only. The accepted result supplies all semantics; truncation is explicit.
const LIMIT={items:12,keys:16,depth:4,text:360,nodes:170};
const clean=v=>String(v).replace(/[\x00-\x1f\x7f-\x9f]/g,' ');
const text=v=>v===undefined?'UNAVAILABLE':v===null?'null':clean(v).slice(0,LIMIT.text)+(clean(v).length>LIMIT.text?' [truncated]':'');
function bounded(value,depth=0,budget={left:LIMIT.nodes}){
 if(--budget.left<0)return '[display limit]';
 if(value===undefined)return 'UNAVAILABLE';
 if(value===null||typeof value==='boolean'||typeof value==='number')return value;
 if(typeof value==='string')return text(value);
 if(depth>=LIMIT.depth)return '[detail beyond display depth]';
 if(Array.isArray(value)){const out=value.slice(0,LIMIT.items).map(v=>bounded(v,depth+1,budget));if(value.length>LIMIT.items)out.push(`[${value.length-LIMIT.items} more; display truncated]`);return out;}
 const out={};let n=0;for(const key in value){if(!Object.hasOwn(value,key))continue;if(++n>LIMIT.keys){out['[more]']='display truncated';break;}if(['truth','content','queueRankingSnapshots','discoveredEdges','traversedEdges','deferredEdges','referenceClassifications'].includes(key)){out[key]='[forensic detail withheld]';continue;}out[text(key)]=bounded(value[key],depth+1,budget);}return out;
}
// Stateless presentation facts from existing G15 classifications. Never bound the
// collection before checking existence. Missing/omitted classifications cannot prove absence.
function materialSynopsis(groups,completeSource=false){
 const categories=['UNKNOWN','INDETERMINATE','CONFLICT','CONTRADICTION','PROTECTED_AUTHORITY','STALE_OR_CAUSALLY_INAPPLICABLE_PROOF','DESYNCHRONIZED_TERRITORY','MISSING_PROOF','MISSING_OR_INSUFFICIENT_AUTHORITY','OBSERVATION_COVERAGE_LIMIT','NO_JUSTIFIED_NEXT_STEP'];
 let complete=completeSource&&Array.isArray(groups),blocker=false;const seen=new Set();
 for(const group of Array.isArray(groups)?groups:[]){
  if(!group||typeof group!=='object'||Array.isArray(group)){complete=false;continue;}
  if(!categories.includes(group.category)||!['BLOCKER','LIMIT','NOTICE'].includes(group.severity)||Object.hasOwn(group,'[more]'))complete=false;
  if(group.severity==='BLOCKER')blocker=true;
  if(categories.includes(group.category))seen.add(group.category);
 }
 const exists=value=>value?true:complete?false:null;
 return {sourceComplete:complete,blockerExists:exists(blocker),contradictionExists:exists(seen.has('CONTRADICTION')),conflictExists:exists(seen.has('CONFLICT')),suppliedCategories:categories.filter(c=>seen.has(c))};
}
function project(x){
 const t=x?.truth;
 if(!t||typeof t!=='object'||typeof t.semanticResultIdentity!=='string'||!t.semanticResultIdentity||typeof t.projectRoot!=='string'||typeof t.subjectIdentity!=='string')throw Error('MALFORMED_STRUCTURED_TRUTH');
 if(x.binding?.activeRoot!==t.projectRoot)throw Error('ROOT_TRUTH_BINDING_MISMATCH');
 // Host surfaces carry only a stable reference into the single canonical truth tree.
 if(x.vscode?.truthRef!==t.semanticResultIdentity||x.agent?.truthRef!==t.semanticResultIdentity||x.cli?.truthRef!==t.semanticResultIdentity)throw Error('STRUCTURED_SURFACE_PARITY_MISMATCH');
 const next=t.nextStep??x.cli.next?.nextStep??x.cli.next;
 const authority=next?.executionAuthority??x.cli.next?.executionAuthority??t.acquisitionCapability?.executionAuthority;
 const why=x.cli.why??{},mri=x.vscode.progressiveAcquisition?.mri??x.cli.mri;
 // Reuse the accepted core's derived four-coordinate projection. The live adapter
 // displays it; it does not own or re-derive semantic authority.
 const four=require('../core/phase0/cli/four-coordinate-projection.cjs').deriveFourCoordinates(t);
 const qualified=t.qualifiedSemanticFacts?.facts??x.cli.status?.qualifiedSemanticFacts?.facts??[];
 const facts=qualified.map(f=>({factIdentity:f.factIdentity,key:f.key,value:f.value,authority:f.authority,verification:f.verification,sourcePath:f.sourcePath}));
 const statusGroups=x.cli.status?.materialStateGroups;
 const sections={
  GUIDED_SOURCE:{unknowns:t.unknowns,coverage:t.coverage,gaps:t.gaps,freshness:t.freshness},
  PROJECT_PULSE:{PROJECT:t.subjectIdentity,ROOT:t.projectRoot,CONTINUITY:t.continuityMode,'CONTINUITY BASIS':t.continuityBasis,'SEMANTIC STATE':t.acquisitionState??t.semanticMode,'FOUR COORDINATES':Object.fromEntries(Object.entries(four.coordinates).map(([k,v])=>[k,v.state])),'QUALIFIED POSITIVE FACT COUNT':facts.length,'CURRENT / OBSERVED':t.freshness?.state??x.cli.status?.currentClaim?.freshnessState,'MATERIAL UNKNOWNS':t.coverage?.dimensions??t.unknowns,'LAST INTAKE MATERIAL GAINS':t.materialSemanticGains,'LAST INTAKE SUCCESSFUL DEEPENING':t.successfulDeepening,NEXT:next?.state??next,'HITO EXECUTION AUTHORITY':authority,'INTERFACE EXECUTION':'DISABLED','STOP / QUALIFICATION':t.stopReason??t.acquisitionStage??t.semanticMode},
  ESTABLISHED_FACTS:{COUNT:facts.length,FACTS:facts},
  NEXT:{NEXT:next?.state??next,ACTION:next?.projection?.plainLanguageAction,'ACTION ID':next?.nextSafeMutationIdentity,WHY:next?.reason??next?.projection?.reasonNextSafe,'HITO EXECUTION AUTHORITY':authority,'INTERFACE EXECUTION':'DISABLED','APPROVAL STATUS':next?.projection?.approvalExecutionStatus,'PROTECTED SCOPE':next?.projection?.unsafeZone,'DONE WHEN':next?.projection?.doneWhen??why.doneWhen},
  WHY:{'AUTHORITATIVE WHY':next?.reason??next?.projection?.reasonNextSafe??why.explanation,'SUPPORTING GAPS (context, not authoritative WHY)':t.gaps??why.gaps,'BLOCKING CONTEXT':why.blockingConditions,'CONTRADICTIONS':t.contradictions??why.contradictions},
  MRI:{'SOURCE SEMANTIC RESULT':mri?.sourceSemanticResultIdentity??t.semanticResultIdentity,'ENGINEERING MRI':mri},
  EVIDENCE:{CLASSES:t.evidenceClasses,'COVERAGE / QUALIFICATION':t.coverage,CLAIMS:t.claims,PROVENANCE:t.provenance,FRESHNESS:t.freshness,'AUTHORITY BOUNDARY':t.authorityBoundary},
  AGENT_CONTEXT:{'CURRENT SHARED TRUTH ID':t.semanticResultIdentity,'CORE AGENT CONTEXT (may reference base observation)':x.agent.context,'CURRENT ACQUISITION MRI':x.agent.progressiveAcquisition?.mri,'AGENT INFERENCE IS HITO AUTHORITY':x.agent.progressiveAcquisition?.agentInferenceIsHitoAuthority},
  HISTORY:{'CONTINUITY BASIS':t.continuityBasis,HISTORY:x.vscode.bridge?.ide?.surfaces?.history?.value},
  PROTECTED:{'PROTECTED SCOPE':next?.projection?.unsafeZone??x.vscode.bridge?.ide?.surfaces?.protectedAuthorities?.value,'AUTHORITY BOUNDARY':t.authorityBoundary,'INTERFACE EXECUTION':'DISABLED'},
  RUNTIME:{ROOT:t.projectRoot,'ROOT SELECTION':x.binding.selection,RUNTIME:x.vscode.bridge?.ide?.surfaces?.runtimeState?.value},
  MAP:{'CORE MERMAID':x.vscode.bridge?.ide?.surfaces?.mermaid?.value}
 };
 return {overviewSynopsis:Array.isArray(statusGroups)?materialSynopsis(statusGroups,true):undefined,overviewSource:bounded({answers:x.cli.status?.answers,materialStateGroups:statusGroups,qualifiedSemanticFacts:{facts},fourCoordinates:four.coordinates}),kind:'HITO_LIVE_VSCODE_PROJECTION_R1',semanticResultIdentity:t.semanticResultIdentity,truthRef:t.semanticResultIdentity,subjectIdentity:t.subjectIdentity,activeRoot:t.projectRoot,rootSelection:x.binding.selection,executionEnabled:false,parity:{cli:true,vscode:true,agent:true,basis:'All surfaces reference the one canonical semantic result identity'},sections:Object.fromEntries(Object.entries(sections).map(([k,v])=>[k,bounded(v)]))};
}
function nodes(section,p,reason){
 if(section==='PROJECT_PULSE'&&p)return require('./guided-model.cjs').nodes(p,reason);
 const row=(id,label,value)=>{const obj=value!==null&&typeof value==='object';return {id,label:text(label),description:obj?'':text(value),tooltip:obj?text(label):text(value),tone:/AUTHORITY|EXECUTION|PROTECTED/.test(label)?'PROTECTED':/UNKNOWN|UNAVAILABLE|INDETERMINATE|NOT_VERIFIED/.test(text(obj?'':value))?'ATTENTION':'NEUTRAL',children:obj?Object.entries(value).map(([k,v])=>row(id+'/'+k,k,v)):[]};};
 if(!p)return [row('unavailable','HITO UNAVAILABLE',reason??'Refresh to read current truth'),row('authority','INTERFACE EXECUTION','DISABLED')];
 return [row('root','ACTIVE ROOT',p.activeRoot),row('identity','SEMANTIC RESULT ID',p.semanticResultIdentity),...Object.entries(p.sections[section]??{STATE:'UNAVAILABLE'}).map(([k,v])=>row(section+'/'+k,k,v))];
}
const escape=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function html(section,p,reason){
 if(section==='ENGINEER')return require('./engineer-cockpit.cjs').enhance(require('./guided-model.cjs').html(section,p,reason),p);
 if(['PROJECT_PULSE','GUIDED','FORENSIC','TAKEOVER','ASK'].includes(section))return require('./guided-model.cjs').html(section,p,reason);
 const render=ns=>ns.map(n=>`<div class="row"><span>${escape(n.label)}</span><strong>${escape(n.description)}</strong></div>${n.children.length?`<div class="children">${render(n.children)}</div>`:''}`).join('');
 return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';"><style>body{background:var(--vscode-editor-background,#151819);color:var(--vscode-foreground,#c5c9c5);font:12px var(--vscode-editor-font-family,monospace);padding:18px;line-height:1.5}h1{font-size:16px;font-weight:500;letter-spacing:2px;border-bottom:1px solid #62665c;padding-bottom:12px}.row{display:grid;grid-template-columns:minmax(170px,30%) 1fr;gap:14px;border-bottom:1px solid var(--vscode-panel-border,#303634);padding:5px 0;overflow-wrap:anywhere}span{opacity:.75}strong{font-weight:400}.children{margin-left:16px;border-left:1px solid #424a43;padding-left:10px}p{color:var(--vscode-descriptionForeground)}</style></head><body><h1>HITO // ${escape(section.replaceAll('_',' '))}</h1><p>Read-only core projection · Execution disabled · Bounded display; omitted detail grants no authority</p>${render(nodes(section,p,reason))}</body></html>`;
}
module.exports={project,bounded,nodes,html,LIMIT,materialSynopsis};
