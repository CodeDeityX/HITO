'use strict';
// Presentation only. Never writes, prunes, or re-derives the structured result.
const scalar=v=>v===null?'UNKNOWN':v===undefined?'UNAVAILABLE':typeof v==='object'?undefined:String(v);
function text(v){const s=scalar(v)??scalar(v?.state)??'UNAVAILABLE';return s.replace(/[\x00-\x1f\x7f-\x9f\u2028\u2029]/g,' ').slice(0,320)+(s.length>320?' [more: --json]':'');}
function brief(v){if(!Array.isArray(v))return text(v);return v.slice(0,5).map(text).join('; ')+(v.length>5?`; +${v.length-5} more (--json)`:'');}
function human(command,x){
 const t=x.truth??{},p=x.cli?.[command]??x.payload??{},next=t.nextStep??x.cli?.next?.nextStep??x.cli?.next;
 const lines=[`HITO | ${command==='next'?'NEXT':command==='why'?'WHY':command==='mri'?'ENGINEERING MRI':'PROJECT PULSE'}`];
 const add=(k,v)=>lines.push(`${k}: ${brief(v)}`);
 const four=require('./four-coordinate-projection.cjs').deriveFourCoordinates(t);
 add('FOUR COORDINATES',Object.entries(four.coordinates).map(([key,value])=>`${key}=${value.state}`).join('; '));
 const qualified=t.qualifiedSemanticFacts?.facts??p.qualifiedSemanticFacts?.facts??[];
 if(['status','mri'].includes(command)){
  add('QUALIFIED POSITIVE FACTS',qualified.length);
  for(const f of qualified.slice(0,8))add('  '+text(f.key),`${text(typeof f.value==='object'?JSON.stringify(f.value):f.value)} [${text(f.authority)}; ${text(f.verification)}; ${text(f.sourcePath)}]`);
  if(qualified.length>8)add('  More qualified facts',`${qualified.length-8}; --json`);
 }
 const list=(label,obj,limit=16)=>{if(obj===undefined||obj===null){add(label,'UNAVAILABLE');return;}const entries=Object.entries(obj);add(label,`${entries.length} fields`);for(const [k,v]of entries.slice(0,limit))add('  '+text(k),v);if(entries.length>limit)add('  More',`${entries.length-limit} fields; --json`);};
 const reasoning=()=>{
  const w=x.cli?.why??{};
  add('WHY',next?.reason??next?.reasonCodes??w.explanation??w.blockingConditions??t.coverage?.warning??'UNAVAILABLE');
  if(t.contradictions){add('CONTRADICTIONS',t.contradictions.assessment??t.contradictions.state??'UNAVAILABLE');add('BLOCKING',t.contradictions.blocking);for(const item of (t.contradictions.items??[]).slice(0,3))add('  Supporting reason',item.summary);}
  const gaps=t.gaps??w.gaps;
  if(Array.isArray(gaps)){add('SUPPORTING GAPS',gaps.length);for(const g of gaps.slice(0,5))add('  '+text(g.dimension),`${text(g.state)}; ${text(g.reason)}`);}
  const evidence=w.evidence??t.provenance;
  if(Array.isArray(evidence)){add('EVIDENCE REFERENCES',evidence.length);for(const e of evidence.slice(0,3))add('  Source',e.sourcePath);}
 };
 const nextLines=()=>{
  add('NEXT',next?.state??next);
  if(next?.nextSafeMutationIdentity)add('ACTION ID',next.nextSafeMutationIdentity);
  if(next?.projection){const a=next.projection;add('JUSTIFIED ACTION',a.plainLanguageAction);add('ACTION REASON',a.reasonNextSafe);add('APPROVAL / EXECUTION STATUS',a.approvalExecutionStatus);if(a.unsafeZone)add('UNSAFE ZONE',a.unsafeZone);}
  add('EXECUTION AUTHORITY',next?.executionAuthority??x.cli?.next?.executionAuthority??t.acquisitionCapability?.executionAuthority);
  if(next&&Object.hasOwn(next,'mutatingCommand'))add('MUTATING COMMAND',next.mutatingCommand);
 };
 if(command==='story'){
  const s=x.cli?.story??x.payload??{};
  lines[0]='HITO // PROJECT STORY';
  add('PROJECT',s.project?.identity??x.truth?.subjectIdentity);
  add('PURPOSE',s.project?.purpose??'UNKNOWN / NOT ESTABLISHED');
  const orientation=s.projectOrientation;
  if(orientation){
   add('PROJECT ORIENTATION',`package=${text(orientation.package)}; version=${text(orientation.version)}`);
   add('PACKAGE DESCRIPTION',orientation.description??'UNAVAILABLE (DOCUMENTARY / DECLARED)');
   add('OBSERVED MODULES',Array.isArray(orientation.modules)?orientation.modules.join(', ')||'UNAVAILABLE':'UNAVAILABLE');
   add('DECLARED RUNTIME REQUIREMENT',orientation.requiresPython??'UNAVAILABLE');
   add('DECLARED BUILD BACKEND',orientation.buildBackend??'UNAVAILABLE');
   add('TEST DEFINITIONS',Array.isArray(orientation.testDefinitions)?orientation.testDefinitions.join(', ')||'UNAVAILABLE':'UNAVAILABLE');
   if(orientation.additionalFactsAvailable)add('ORIENTATION DETAIL','additional bounded facts available');
   if(Array.isArray(orientation.qualifiedFacts)){
    const visible=orientation.qualifiedFacts.slice(0,8).map(f=>`${f.key}=${typeof f.value==='string'?f.value:JSON.stringify(f.value)} [${f.authority}/${f.verification}]`);
    if(visible.length)add('QUALIFIED OBSERVATIONS',visible.join('; '));
   }
  }
  add('ROOT',s.root??x.binding?.activeRoot);
  add('WHERE ARE WE?',s.whereWeAre);
  const established=s.established??{};
  add('ESTABLISHED',`semantic result identity=${text(established.semanticResultIdentity)}; coverage=${text(established.coverage)}`);
  const documentary=s.documentary??{};
  add('DOCUMENTARY',`evidence count=${Array.isArray(documentary.evidence)?documentary.evidence.length:'UNKNOWN'}; authority=${text(documentary.authority)}; sources=${Array.isArray(documentary.evidence)?documentary.evidence.slice(0,5).map(e=>text(e.sourcePath??e)).join(', '):'UNKNOWN'}`);
  const physical=s.physicallyObserved??{};
  const base=physical.baseFreshness??physical.freshness;
  const refresh=physical.supportingRefresh;
  const refreshState=refresh?.changed?.length?'CHANGED':refresh?.uncertain?.length?'UNCERTAIN':refresh?'UNCHANGED_BOUNDED_SUPPORTING_EVIDENCE':'UNAVAILABLE';
  add('PHYSICALLY OBSERVED',`Base README evidence: ${text(base?.state??base)}; Supporting evidence: ${refreshState}; Changed paths: ${Array.isArray(refresh?.changed)&&refresh.changed.length?refresh.changed.join(', '):'NONE'}; Whole-project currentness: NOT ESTABLISHED`);
  if(Array.isArray(refresh?.observations))add('PHYSICAL IDENTITY',refresh.observations.map(o=>`${text(o.path)}=${text(o.physicalIdentityState)}`).join('; ')||'UNAVAILABLE');
  const unknown=s.unknown;
  if(Array.isArray(unknown))add('UNKNOWN',unknown.slice(0,8).map(g=>`${text(g.dimension??g.key)}: ${text(g.state??g.reason)}`).join('; ')+(unknown.length>8?`; +${unknown.length-8} more (--json)`:''));
  else if(unknown&&typeof unknown==='object')add('UNKNOWN',Object.entries(unknown).slice(0,8).map(([k,v])=>`${k}: ${text(v?.state??v)}`).join('; '));
  else add('UNKNOWN',unknown??'UNKNOWN');
  add('BLOCKER',s.blocker??'UNKNOWN');
  const contradiction=s.contradiction??{};
  add('CONTRADICTION',`assessment=${text(contradiction.assessment??contradiction.state)}; blocking=${text(contradiction.blocking)}`);
  add('DRIFT',s.drift??'INDETERMINATE');
  add('WHAT CHANGED',Array.isArray(s.changed)?(s.changed.length?s.changed.join(', '):'NONE'):s.changed??'UNKNOWN');
  add('NEXT',s.next);
  add('WHY',s.why??'UNKNOWN');
  add('DO NOT TOUCH',s.doNotTouch??'UNKNOWN');
  add('DONE WHEN',s.doneWhen??'UNKNOWN / NOT ESTABLISHED');
  const mri=s.mri??{};
  add('MRI ESTABLISHES',`derived/noncanonical=true; source=${text(mri.sourceSemanticResultIdentity??mri.sourceIdentity)}; bounded claim count=${text(Array.isArray(mri.claims)?mri.claims.length:mri.claimCount)}`);
  add('EXECUTION AUTHORITY',false);
  add('SEMANTIC RESULT ID',s.semanticResultIdentity??x.truth?.semanticResultIdentity);
  lines.push('EVIDENCE BOUNDARY: presentation over existing HITO truth; no new authority or project writes');
 } else if(command==='next'){nextLines();reasoning();}
 else if(command==='why'){nextLines();reasoning();}
 else{
  add('PROJECT',t.subjectIdentity??x.projectIdentity);add('ROOT',t.projectRoot??x.binding?.activeRoot??x.activeRoot);
  add('CONTINUITY',t.continuityMode);add('CONTINUITY BASIS',t.continuityBasis);
  add('SEMANTIC STATE',t.acquisitionState??t.semanticMode);add('COVERAGE',t.coverage);
  add('CURRENT / OBSERVED',t.freshness?.state??p.currentClaim?.freshnessState);if(t.evidenceClasses)add('EVIDENCE CLASSES',t.evidenceClasses);
  if(p.answers){add('ORIENTATION',p.answers.whereAmI);add('DECLARED INTENT',p.answers.whatAmITryingToDo);add('MISSING',p.answers.whatIsMissing);}
  if(Array.isArray(p.materialStateGroups)){add('MATERIAL STATES',p.materialStateCount);for(const g of p.materialStateGroups.slice(0,5))add('  '+text(g.category),`${text(g.severity)}; ${text(g.headline)}`);if(p.materialStateGroups.length>5)add('  More',`${p.materialStateGroups.length-5} groups; --json`);}
  else list('MATERIAL UNKNOWNS / COVERAGE',t.coverage?.dimensions??t.unknowns);
  add('MATERIAL GAINS FROM THIS INTAKE',command==='intake'?t.materialSemanticGains??'UNAVAILABLE':'NOT_APPLICABLE (read projection)');
  if(t.successfulDeepening!==undefined)add('LAST INTAKE SUCCESSFUL DEEPENING',t.successfulDeepening);
  nextLines();reasoning();add('STOP / QUALIFICATION',t.stopReason??t.acquisitionStage??t.semanticMode);
  const cost=t.costLedger;if(cost){add('ACQUISITION COST files examined',cost.totalIntakeCost?.filesExamined);add('ACQUISITION COST bytes examined',cost.totalIntakeCost?.bytesExamined);const a=cost.adaptiveTraversalCost??{};add('EDGES attempted / observed / blocked / deferred',`${text(a.edgesAttempted)} / ${text(a.edgesObserved)} / ${text(a.edgesBlocked)} / ${text(a.edgesDeferred)}`);const q=cost.anchorQualificationCost;if(q)add('METADATA references / candidates / calls',`${text(q.references)} / ${text(q.candidates)} / ${text(q.metadataCalls)}`);}
  else{const measured=m=>m?.state==='MEASURED'?m.value:m?.state;add('FILES before useful truth',measured(x.instrumentation?.files_examined_before_useful_truth));add('BYTES before useful truth',measured(x.instrumentation?.bytes_examined_before_useful_truth));}
  if(command==='mri'){add('MRI SOURCE',p.sourceSemanticResultIdentity);add('MRI CLAIM COUNT',p.claims?.length);add('MRI', 'Structured detail: repeat this command with --json');}
 }
 add('SEMANTIC RESULT ID',t.semanticResultIdentity);
 lines.push('FOLLOW UP: hito status | hito next | hito why | hito mri', 'FULL STRUCTURED RESULT: repeat command with --json');
 // Bound only display strings, retaining every selected field label and an explicit disclosure marker.
 const perLine=Math.floor(14336/lines.length)-1;
 return lines.map(line=>{if(Buffer.byteLength(line)<=perLine)return line;let value=line;while(Buffer.byteLength(value)>perLine-19)value=value.slice(0,-1);return value+' [more: --json]';}).join('\n')+'\n';
}
function render(command,result,format='TEXT'){
 if(command==='root')return format==='JSON'?JSON.stringify(result)+'\n':`${text(result.activeRoot)}\nPROJECT: ${text(result.projectIdentity)}\n`;
 if(result?.bootstrap&&!result.truth)return format==='JSON'?JSON.stringify(result)+'\n':`HITO | ${result.bootstrap.state}\n${result.bootstrap.next??''}\n`;
 if(result?.continuityCapsule&&result.continuityCapsuleOnly){
  if(format==='JSON')return require('./continuity-capsule.cjs').serialize(result.continuityCapsule);
  const c=result.continuityCapsule;
  return [`HITO | COMPACT CONTINUITY`,`PROJECT: ${c.projectIdentity.name} (${c.projectIdentity.projectId})`,`REVISION: ${c.frozenRevision.revision}`,
   `WHAT: ${c.coordinates.WHAT??'UNKNOWN'}`,`HOW: ${c.coordinates.HOW.state} (${c.coordinates.HOW.modulesAndPackages.length} module/package facts)`,
   `RESULT: ${c.coordinates.RESULT?.overallStatus??'UNKNOWN'}`,`CONTINUITY: ${c.coordinates.CONTINUITY.freshness}`,
   `QUALIFIED FACTS: ${c.metrics.semanticFactCount}`,`PROVENANCE REFERENCES: ${c.metrics.provenanceReferenceCount}`,
   `MATERIAL UNKNOWNS: ${c.metrics.unknownCount}`,`CAPSULE BYTES: ${c.metrics.capsuleBytes}`,
   `AUTHORITY: derived/read-only; no execution authority`,`STRUCTURED CAPSULE: --json`].join('\n')+'\n';
 }
 return format==='JSON'?require('./bounded-projection.cjs').serializeMachineProjection(result):human(command,result);
}
module.exports={render};
