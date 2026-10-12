'use strict';
// Presentation only over the same bounded live projection. No acquisition or authority owner.
const fs=require('node:fs'),path=require('node:path');
const css=fs.readFileSync(path.join(__dirname,'engineer-cockpit.css'),'utf8');
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const unavailable=v=>v===undefined||v===null||v===''||['UNAVAILABLE','UNKNOWN','NOT_ESTABLISHED','[display limit]','[detail beyond display depth]'].includes(v);
const value=v=>v===undefined||v===null?'NOT ESTABLISHED':typeof v==='object'?JSON.stringify(v,null,2):String(v);
const raw=v=>`<pre>${esc(value(v))}</pre>`;
function tone(v){return ['CURRENT','STRUCTURALLY_SUPPORTED','PHYSICALLY_OBSERVED'].includes(v)?'supported':['PARTIAL','PARTIALLY_OBSERVED','STALE','RECONCILIATION_REQUIRED'].includes(v)?'attention':['CONTRADICTION','CONFLICT','BLOCKED','FAIL'].includes(v)?'adverse':'neutral';}
const state=v=>`<span class="r5-state ${tone(v)}">${esc(value(v))}</span>`;
const rows=items=>`<dl class="r5-fields">${items.map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(value(v))}</dd></div>`).join('')}</dl>`;
const disclosure=(label,v)=>`<details><summary>${esc(label)}</summary>${raw(v)}</details>`;
const panel=(id,title,body,sub='Supplied observation · bounded')=>`<section class="r5-panel" id="r5-${id}" aria-labelledby="r5-${id}-title"><header><h2 id="r5-${id}-title">${esc(title)}</h2><small>${esc(sub)}</small></header>${body}</section>`;
function graph(mri){
 const nodes=mri?.nodes,edges=mri?.edges;
 if(!Array.isArray(nodes)||!Array.isArray(edges)||!nodes.length)return '<p class="r5-empty">Topology not established</p>';
 const valid=nodes.every(n=>n&&typeof n==='object'&&typeof n.nodeId==='string'&&typeof n.label==='string')&&new Set(nodes.map(n=>n.nodeId)).size===nodes.length;
 if(!valid||!edges.every(e=>e&&typeof e==='object'&&typeof e.edgeId==='string'&&nodes.some(n=>n.nodeId===e.sourceId)&&nodes.some(n=>n.nodeId===e.targetId)))return '<p class="r5-empty">Supplied topology is incomplete in this bounded projection. See exact MRI disclosure.</p>';
 // Fixed layout positions are visual only. Each node and edge maps directly to a supplied ID.
 const pos=new Map(nodes.map((n,i)=>[n.nodeId,{x:20+(i%2)*250,y:25+Math.floor(i/2)*95}]));
 const lines=edges.map(e=>{const a=pos.get(e.sourceId),b=pos.get(e.targetId);return `<g><title>${esc(e.edgeId+' · '+value(e.relationship)+' · '+value(e.status))}</title><line x1="${a.x+100}" y1="${a.y+28}" x2="${b.x+100}" y2="${b.y+28}"/></g>`;}).join('');
 const boxes=nodes.map(n=>{const a=pos.get(n.nodeId);return `<g><title>${esc(n.nodeId+' · '+n.label)}</title><rect x="${a.x}" y="${a.y}" width="205" height="55"/><text x="${a.x+8}" y="${a.y+22}">${esc(n.label.slice(0,24))}</text><text x="${a.x+8}" y="${a.y+42}">${esc(value(n.kind).slice(0,24))}</text></g>`;}).join('');
 return `<figure><svg class="r5-graph" viewBox="0 0 490 ${Math.ceil(nodes.length/2)*95+20}" role="img" aria-label="Supplied MRI relationships; visual layout is not semantic authority">${lines}${boxes}</svg><figcaption>Only supplied nodes and relationships. Labels may be shortened in the diagram; exact values below.</figcaption></figure>`;
}
function ledger(e){
 const claims=e?.CLAIMS;
 if(!Array.isArray(claims)||!claims.length)return '<p class="r5-empty">Evidence rows not established in this projection.</p>'+disclosure('Exact supplied evidence',e);
 return `<div class="r5-ledger">${claims.map(c=>{
  if(!c||typeof c!=='object')return `<p class="r5-omission">${esc(value(c))} · omitted evidence remains unresolved.</p>`;
  return `<article class="r5-evidence-row"><div><small>Source / scope</small><p>${esc(value(c.scope?.path??c.scope))}</p></div><div><small>Evidence class</small><p>${esc(value(c.authority))}</p></div><div><small>Verification / currentness</small><p>${state(c.verification)}<br>${state(c.currentness)}</p></div><details><summary>Identity / support</summary>${rows([['Claim identity',c.claimIdentity],['Evidence identities',c.evidenceIdentities],['Artifact identities',c.artifactIdentities],['Content identities',c.contentIdentities],['Support relation',c.supportEdgeIdentity],['Scope',c.scope],['Currentness basis',c.currentnessBasis],['Invalidation dependencies',c.invalidationDependencies]])}</details></article>`;
 }).join('')}</div><p class="r5-limit">Bounded evidence rows; this is not a complete ledger. Truncated or omitted values remain unresolved.</p>${disclosure('Forensic disclosure · exact supplied evidence',e)}`;
}
function body(p,legacy){
 const s=p?.sections??{},pulse=s.PROJECT_PULSE??{},n=s.NEXT??{},g=s.GUIDED_SOURCE??{},a=s.AGENT_CONTEXT??{},protect=s.PROTECTED??{},why=s.WHY??{},runtime=s.RUNTIME??{},history=s.HISTORY??{},mri=s.MRI?.['ENGINEERING MRI'];
 const justified=n.NEXT==='PHASE4_NEXT_SAFE_MUTATION'&&!unavailable(n.ACTION);
 const protectedValue=protect['PROTECTED SCOPE'];
 const protectedUnknown=unavailable(protectedValue)||(Array.isArray(protectedValue)&&!protectedValue.length)||(protectedValue&&typeof protectedValue==='object'&&!Object.keys(protectedValue).length);
 const protectedText=protectedUnknown?'PROTECTED SCOPE NOT ESTABLISHED':value(protectedValue);
 const project=p?.activeRoot?.split(/[\\/]/).filter(Boolean).at(-1)??'Project not established';
 const assessment=why.CONTRADICTIONS;
 const assessState=assessment&&typeof assessment==='object'?assessment.assessment:assessment;
 const nav=[['pulse','Pulse'],['mri','MRI / Topology'],['assessment','Assessment'],['evidence','Evidence'],['history','History'],['protected','Protected'],['runtime','Runtime'],['agent','Agent Context']];
 return `<div class="r5-engineer"><header class="r5-context"><div><small>HITO / ENGINEER</small><h2>${esc(project)}</h2><p>${state(pulse['SEMANTIC STATE'])}</p></div><div><small>Observation</small><details><summary>Identity / root context</summary>${rows([['Subject',p?.subjectIdentity],['Result',p?.semanticResultIdentity],['Root',p?.activeRoot],['Root selection',p?.rootSelection],['Parity',p?.parity]])}</details></div><div><small>Continuity basis</small><p>${esc(value(pulse['CONTINUITY BASIS']))}</p></div><div><small>Execution authority</small><p>Disabled in this interface</p><small>Display does not grant approval</small></div></header>
 <div class="r5-protection" id="r5-protected"><strong>${esc(protectedText)}</strong><span>This is not permission to change anything.</span>${disclosure('Exact authority boundary',protect)}</div>
 <div class="r5-layout"><nav class="r5-nav" aria-label="Engineer navigation"><small>WORKSPACE</small>${nav.map(([id,label])=>`<a href="#r5-${id}">${esc(label)}</a>`).join('')}<small>Bounded views<br>Unknown is not empty</small><a href="#r5-forensic">Forensic disclosure</a></nav><main class="r5-workspace">
 ${panel('pulse','Project Pulse',rows([['Project identity',p?.subjectIdentity],['Observation state',pulse['SEMANTIC STATE']],['Currentness',pulse['CURRENT / OBSERVED']],['Continuity',pulse.CONTINUITY],['Scope',g.freshness?.scope],['Stop / qualification',pulse['STOP / QUALIFICATION']]])+disclosure('Unknowns / coverage',g.unknowns)+disclosure('Exact Pulse',pulse))}
 ${panel('next','Next Safe Action',`<p class="r5-next-state">${esc(value(n.NEXT))}</p><p class="r5-action">${esc(justified?value(n.ACTION):'No justified next action is established.')}</p>${rows([['Next',n.NEXT],['Action',justified?n.ACTION:'NOT ESTABLISHED'],['Why',n.WHY],['Approval',n['APPROVAL STATUS']],['Execution authority','Disabled in this interface'],['Core execution authority',n['HITO EXECUTION AUTHORITY']],['Protected scope',protectedText],['Done when',n['DONE WHEN']]])}<p class="r5-limit">Read-only proposal. This surface cannot execute or approve changes.</p>`,'Proposal and authority are separate')}
 ${panel('mri','MRI / Topology',graph(mri)+disclosure('Architecture / runtime evidence',mri?.dimensions??g.coverage?.dimensions)+disclosure('Exact supplied MRI',s.MRI)+disclosure('Core diagram source / limits',s.MAP),'No inferred nodes or relationships')}
 ${panel('assessment','Existing Assessment',`<p>${state(assessState)}</p><p class="r5-limit">An existing assessment, not a new judgment engine. Empty disagreements do not establish their absence.</p>${disclosure('Supplied disagreements and boundary',assessment)}${disclosure('Unresolved evidence gaps',g.gaps)}`)}
 ${panel('agent','Agent Context',rows([['Subject',p?.subjectIdentity],['Current root',p?.activeRoot],['Current shared result',a['CURRENT SHARED TRUTH ID']],['Continuity basis',pulse['CONTINUITY BASIS']],['Scope',g.freshness?.scope],['Protected boundary',protectedText]])+disclosure('Base context / supplied identity',a['CORE AGENT CONTEXT (may reference base observation)'])+disclosure('Unknowns',g.unknowns)+disclosure('Exact bounded Agent Context',a)+'<p class="r5-limit">Base context can reference an earlier observation. No hidden reasoning or complete context is claimed; upstream omissions remain explicit.</p>')}
 ${panel('runtime','Runtime Context',rows([['Active root',p?.activeRoot],['Root selection',p?.rootSelection],['Runtime state',unavailable(runtime.RUNTIME)?'Runtime state not established.':runtime.RUNTIME],['Bounded freshness',g.freshness?.state],['Freshness scope',g.freshness?.scope]])+'<p class="r5-limit">A root is a location, not evidence of a running deployment.</p>')}
 ${panel('evidence','Evidence Ledger',ledger(s.EVIDENCE),'Supplied rows · documentary is not verified')}
 ${panel('history','History / Continuity',rows([['Continuity basis',history['CONTINUITY BASIS']]])+'<p class="r5-limit">No timeline is inferred from refresh operations.</p>'+disclosure('Supplied history / lineage',history.HISTORY))}
 ${panel('blockers','Current Blockers',`<h3>Established blockers</h3>${raw(why['BLOCKING CONTEXT'])}<h3>Unresolved evidence</h3>${disclosure('Supporting gaps — not established blockers',g.gaps)}<h3>Observation / acquisition limits</h3>${rows([['Stop reason',pulse['STOP / QUALIFICATION']],['Observed scope',g.freshness?.scope]])}`)}
 <section class="r5-panel r5-full" id="r5-forensic"><header><h2>Forensic Disclosure</h2><small>Exact supplied values · upstream bounds remain</small></header><p>Use the Forensic mode above for the preserved audit surface. These disclosures expose the same supplied values without additional character truncation.</p><details><summary>Raw result / MRI / Evidence / Agent Context / History</summary>${legacy}</details></section>
 </main></div></div>`;
}
function enhance(base,p){
 const begin=base.indexOf('<div class="mode engineer">'),end=base.indexOf('<div class="mode forensic">');
 if(begin<0||end<begin)throw Error('ENGINEER_RENDER_BOUNDARY_MISSING');
 const segment=base.slice(begin,end),inner=segment.slice('<div class="mode engineer">'.length).replace(/<\/div>\s*$/,'');
 return (base.slice(0,begin)+`<div class="mode engineer">${body(p,inner)}</div>\n `+base.slice(end)).replace('</head>',`<style>${css}</style></head>`);
}
module.exports={enhance,body,graph,ledger,tone,unavailable};
