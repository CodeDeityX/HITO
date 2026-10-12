'use strict';
const {createHitoFirstObservationIdePayload,createHitoIdeHostPayload}=require('../../dist/hosts/ide/hito-ide-host.js');
const {createHitoFirstObservationAgentContext,createHitoAgentContext}=require('../../dist/hosts/agent/hito-agent-context.js');
const {assertFirstObservationBridge,assertLocalBridgeDocument}=require('../../../vscode-hito/dist/extension/hito-client.js');
const {runHitoC6CliProjection}=require('../../dist/cli/hito-cli.js');
function story(truth,cli,bridge){
 const status=cli.status||{};
 const next=cli.next||truth.nextStep||null;
 const purposeState=status.purpose??status.currentClaim??null;
 const purposeIsEstablished=purposeState&&typeof purposeState==='string'&&!/^(UNKNOWN|UNAVAILABLE|NOT_ESTABLISHED|INDETERMINATE)$/i.test(purposeState);
 const driftBasis=truth.driftAssessment??truth.semanticDrift??null;
 const gapMap=Array.isArray(truth.gaps)?Object.fromEntries(truth.gaps.map(g=>[g.dimension,{state:g.state,reason:g.reason}])):(truth.gaps&&typeof truth.gaps==='object'?truth.gaps:{});
 const dimensionMap=truth.coverage?.dimensions??{};
 const legacyUnknowns=truth.unknowns??{};
 const materialKeys=['declaredIntent','canonicalAuthority','runtimeState','ownership','integration','conflictAssessment','comparativeHistory'];
 const currentUnknowns={};
 for(const key of materialKeys){const gapKey=key==='runtimeState'?'runtime':key;currentUnknowns[key]=gapMap[key]??gapMap[gapKey]??dimensionMap[key]??dimensionMap[gapKey]??legacyUnknowns[key]??'UNKNOWN';}
 const supportingRefresh=truth.refresh??null;
 const why=cli.why||{};
 const claims=Array.isArray(truth.claims)?truth.claims:[];
 const boundedKeys=['project.name','name','project.version','version','project.description','project.requires-python','build-system.build-backend','modulePath','testDefinition','main','workspaces','dependencies','devDependencies','scripts','bin'];
 const boundedClaims=claims.filter(c=>c?.statement?.key&&boundedKeys.includes(c.statement.key));
 const first=(...keys)=>boundedClaims.find(c=>keys.includes(c.statement.key));
 const semanticFacts=truth.qualifiedSemanticFacts?.facts??[];
 const qualifiedFacts=semanticFacts.length?semanticFacts.slice(0,96).map(f=>({key:f.key,value:f.value,authority:f.authority,verification:f.verification,currentness:'CURRENT_BOUNDED_SUPPORT',scope:{path:f.sourcePath},evidenceIdentities:[f.sourceArtifactIdentity],sourceContentIdentity:f.sourceContentIdentity,extractorIdentity:f.extractorIdentity,extractorVersion:f.extractorVersion,claimIdentity:f.factIdentity})):boundedClaims.map(c=>({key:c.statement.key,value:c.statement.value,authority:c.authority,verification:c.verification,currentness:c.currentness??'CURRENT',scope:c.scope??null,evidenceIdentities:c.evidenceIdentities??[],claimIdentity:c.claimIdentity}));
 const fact=(...keys)=>semanticFacts.find(f=>keys.includes(f.key))?.value;
 const orientation={package:first('project.name','name')?.statement.value??fact('projectIdentity')??null,version:first('project.version','version')?.statement.value??fact('projectVersion')??null,description:first('project.description')?.statement.value??fact('documentaryPurpose')??null,requiresPython:first('project.requires-python')?.statement.value??fact('runtimeRequirement','goRequirement','toolchainRequirement')??null,buildBackend:first('build-system.build-backend')?.statement.value??fact('build-system.build-backend','buildTarget')??null,modules:semanticFacts.length?semanticFacts.filter(f=>f.key==='observedModuleDirectory').slice(0,8).map(f=>f.value):boundedClaims.filter(c=>c.statement.key==='modulePath').slice(0,8).map(c=>c.statement.value),testDefinitions:semanticFacts.length?semanticFacts.filter(f=>f.key==='testDefinitionObserved').slice(0,8).map(f=>f.sourcePath):boundedClaims.filter(c=>c.statement.key==='testDefinition').slice(0,8).map(c=>c.scope?.path),additionalFactsAvailable:semanticFacts.length>8||boundedClaims.length>8,qualifiedFacts};
 return {
  project:{identity:truth.subjectIdentity,purpose:purposeState,authority:purposeIsEstablished?'DOCUMENTARY_ORIENTATION_ONLY':'NOT_ESTABLISHED'},
  projectOrientation:orientation,
  root:truth.projectRoot,
  whereWeAre:truth.continuityMode??truth.semanticMode??null,
  established:{semanticResultIdentity:truth.semanticResultIdentity,coverage:truth.coverage??null},
  documentary:{evidence:truth.provenance??[],authority:'DOCUMENTARY_ONLY'},
  physicallyObserved:{freshness:truth.freshness??null,baseFreshness:truth.freshness??null,supportingRefresh,observation:truth.observation??null,limitation:'WHOLE_PROJECT_CURRENTNESS_UNAVAILABLE_UNLESS_ESTABLISHED_BY_EXISTING_TRUTH'},
  unknown:currentUnknowns,
  blocker:truth.blockingConditions??why.blockingConditions??null,
  contradiction:truth.contradictions??null,
  drift:driftBasis??{state:'INDETERMINATE',reason:'NO_ACCEPTED_IDEA_HOW_RESULT_COMPARISON'},
  changed:Array.isArray(supportingRefresh?.changed)?supportingRefresh.changed:(truth.freshness?.changedFiles??null),
  next,
  why:next?.reason??why.explanation??null,
  doNotTouch:truth.protectedState??bridge?.governanceBoundary??null,
  doneWhen:why.doneWhen??null,
  mri:cli.mri??bridge?.ide?.mri??null,
  executionAuthority:false,
  semanticResultIdentity:truth.semanticResultIdentity,
 };
}
function project(state){
 if(state.result){
  const result=state.result;
  const bridge={kind:'HITO_FIRST_OBSERVATION_LOCAL_BRIDGE_R1',ide:createHitoFirstObservationIdePayload(result),agentContext:createHitoFirstObservationAgentContext(result)};
  assertFirstObservationBridge(bridge);
  const truth={subjectIdentity:result.subjectIdentity,projectRoot:state.root,continuityMode:state.continuityMode,semanticMode:result.mode,priorState:result.priorState,semanticResultIdentity:result.semanticResultIdentity,unknowns:result.dimensions,exclusions:state.exclusions,provenance:result.documentaryEvidence.map(e=>e.provenance),nextStep:result.nextStep,coverage:result.coverage,freshness:state.freshness,continuityBasis:state.continuityBasis};
  const pulse={truthRef:truth.semanticResultIdentity,subjectIdentity:truth.subjectIdentity,projectRoot:truth.projectRoot,continuityMode:truth.continuityMode,semanticMode:truth.semanticMode,semanticResultIdentity:truth.semanticResultIdentity,coverage:truth.coverage,freshness:truth.freshness,purpose:result.dimensions.declaredIntent,capabilities:null,owners:result.dimensions.ownership,contradictions:result.dimensions.conflictAssessment,protectedState:{state:'UNAVAILABLE',executionAuthority:false}};
  const why={nextStep:result.nextStep,evidence:truth.provenance,authority:result.boundary,unknowns:result.dimensions,contradictions:result.dimensions.conflictAssessment,doneWhen:null,blockingConditions:result.coverage.warning};
  const truthRef=truth.semanticResultIdentity;
  const cli={truthRef,status:pulse,next:result.nextStep,why:{...why,truthRef},mri:bridge.ide.mri};
  cli.story=story(truth,cli,bridge);
  return {truth,cli,vscode:{truthRef,bridge},agent:{truthRef,context:bridge.agentContext}};
 }
 const snapshot=state.snapshot;
 const bridge={kind:'HITO_P1_LOCAL_VSCODE_BRIDGE',ide:createHitoIdeHostPayload(snapshot),agentContext:createHitoAgentContext(snapshot)};
 assertLocalBridgeDocument(bridge);
 const g15=snapshot.c6.g15;
 const truth={subjectIdentity:state.subjectIdentity,projectRoot:state.root,continuityMode:'CONTINUATION',semanticMode:'COMPARATIVE',semanticResultIdentity:g15.semanticVerdictIdentity,host:bridge.ide.host,coverage:'EXISTING_G15_GOVERNED_TRUTH',provenance:state.provenance};
 const commands=Object.fromEntries(['status','next','why','mri'].map(command=>[command,runHitoC6CliProjection(g15,{command,format:'JSON'}).data.payload]));
 const truthRef=truth.semanticResultIdentity;
 const cli={truthRef,...commands,why:{...commands.why,truthRef}};
 cli.story=story(truth,cli,bridge);
 return {truth,cli,vscode:{truthRef,bridge},agent:{truthRef,context:bridge.agentContext}};
}
module.exports={project,story};
