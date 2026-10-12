'use strict';
// Additive bounded observational input to the existing Phase 4 Contradiction rail.
// Documentary disagreement is not canonical adjudication or resolution authority.
const {sha}=require('../contracts/product-entry-persistence.cjs');
function assessAcquisitionContradictions(claims,artifacts,upstreamNext){
 const items=[];
 const main=claims.find(c=>c.scope.path==='package.json'&&c.statement.key==='main'&&c.currentness==='CURRENT');
 for(const doc of claims.filter(c=>c.authority==='DOCUMENTARY_EVIDENCE_ONLY'&&c.statement.key==='entrypoint'&&c.currentness==='CURRENT')){
  if(main&&doc.statement.value!==main.statement.value){
   const physical=claims.find(c=>c.scope.path===main.statement.value&&c.authority==='PHYSICAL_OBSERVATION'&&c.currentness==='CURRENT');
   if(physical)items.push({contradictionId:'contradiction:'+sha(Buffer.from(JSON.stringify([doc.claimIdentity,main.claimIdentity,physical.claimIdentity]))),code:'EVIDENCE_CLAIM_MISMATCH',blocking:false,assessment:'DOCUMENTARY_PHYSICAL_DISAGREEMENT',support:[doc.claimIdentity,main.claimIdentity,physical.claimIdentity],summary:'Documentary entrypoint differs from the manifest entrypoint whose bytes were physically observed; runtime behavior remains unverified'});
  }
 }
 // Preserve the existing owner's blocking outcome, without inferring governance from prose.
 const dirty=claims.filter(c=>c.authority==='PHYSICAL_OBSERVATION'&&c.currentness==='STALE');
 if(dirty.length)items.push({contradictionId:'contradiction:'+sha(Buffer.from(JSON.stringify(dirty.map(c=>c.claimIdentity)))),code:'EVIDENCE_CLAIM_MISMATCH',blocking:true,assessment:'SUPPORT_IDENTITY_MISMATCH',support:dirty.map(c=>c.claimIdentity),summary:'Previously observed physical support changed; reconcile supporting evidence before continuation'});
 const blocking=dirty.length>0||upstreamNext?.state==='RECONCILIATION_REQUIRED'||upstreamNext?.state==='BLOCKED'||upstreamNext?.mutation==='RECONCILE';
 const nextStep=dirty.length?{state:'RECONCILIATION_REQUIRED',reason:'Changed physical support invalidates dependent claims',mutatingCommand:null,executionAuthority:false}:upstreamNext;
 return {owner:'EXISTING_CONTRADICTION_RAIL_PHASE4',assessment:items.length?'CONTRADICTION_OBSERVED':'INDETERMINATE',items,blocking:!!blocking,nextStep,resolutionPerformed:false,scope:'Explicit entrypoint documentary/manifest/physical comparison, dirty physical support and unchanged upstream blocking decision; no claim of contradiction absence'};
}
module.exports={assessAcquisitionContradictions};
