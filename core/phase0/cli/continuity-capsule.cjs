'use strict';
// Compact, deterministic projection over already validated canonical state and
// the existing R2 qualified facts. This module performs no I/O and owns no truth.
const crypto = require('node:crypto');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const UNKNOWN = Object.freeze({ state: 'UNKNOWN', value: null, provenanceReferences: [] });
const isMaterialUnknown = value => ['UNKNOWN','UNAVAILABLE','INDETERMINATE','STALE','CONFLICTED','NOT_OBSERVED','NOT_APPLICABLE'].includes(String(value ?? '').toUpperCase());
const MATERIAL_GAP_CATEGORIES = new Set(['UNKNOWN','INDETERMINATE','PROTECTED_AUTHORITY','STALE_OR_CAUSALLY_INAPPLICABLE_PROOF','DESYNCHRONIZED_TERRITORY','MISSING_PROOF','MISSING_OR_INSUFFICIENT_AUTHORITY','OBSERVATION_COVERAGE_LIMIT','NO_JUSTIFIED_NEXT_STEP']);

function provenanceRef(fact) {
  return { factIdentity: fact.factIdentity, sourceArtifactIdentity: fact.sourceArtifactIdentity,
    sourceContentIdentity: fact.sourceContentIdentity, sourcePath: fact.sourcePath,
    extractorIdentity: fact.extractorIdentity, extractorVersion: fact.extractorVersion };
}
function compactFact(fact, currentness) {
  const raw = JSON.stringify(fact.value);
  const structured = fact.value !== null && typeof fact.value === 'object';
  return { id: fact.factIdentity, key: fact.key, value: structured ? { kind:Array.isArray(fact.value)?'ARRAY':'OBJECT', keys:Array.isArray(fact.value)?undefined:Object.keys(fact.value).sort(), itemCount:Array.isArray(fact.value)?fact.value.length:undefined, sha256:sha(Buffer.from(raw)), bytes:Buffer.byteLength(raw,'utf8') } : fact.value,
    ...(structured ? { valueCompacted:true } : {}),
    epistemicClass: fact.authority, verification: fact.verification, currentness,
    provenance: provenanceRef(fact) };
}
function deriveStructuralHow(facts, currentness, model) {
  const established = facts.filter(f => ['observedModuleDirectory','modulePath','projectIdentity','runtimeRequirement',
    'goRequirement','toolchainRequirement','buildTarget','buildAndTestDeclarations','testDefinitionObserved',
    'dependencyDeclaration','build-system.build-backend','configurationLocation','entryPoint'].includes(f.key));
  const byKey = key => established.filter(f => f.key === key).map(f => compactFact(f, currentness));
  const runtimeHomes=(model.runtimeHomes??[]).slice(0,32).map(h=>({id:h.runtimeHomeId,capabilityId:h.capabilityId,kind:h.kind,locator:h.locator,entryPoints:h.entryPoints??[],status:h.status??null,epistemicClass:'CANONICAL_MODEL',provenance:canonicalReference('CANONICAL_RUNTIME_HOME',h,h.runtimeHomeId)}));
  const edgeRows=[...(model.edges??[]),...(model.interfaces??[])].filter(e=>['CALLS','DEPENDS_ON','CONSUMES','PRODUCES','PERSISTS','IMPLEMENTS','EXPOSES','OWNS','HOMES'].includes(e.relationship));
  const edgeMap=new Map(edgeRows.map((e,i)=>[e.edgeId??`${e.sourceId}:${e.relationship}:${e.targetId}:${i}`,e]));
  const canonicalEdges=[...edgeMap.values()].slice(0,64)
    .map(e=>({id:e.edgeId,sourceId:e.sourceId,targetId:e.targetId,relationship:e.relationship,status:e.status,epistemicClass:'CANONICAL_MODEL',provenance:canonicalReference('CANONICAL_RELATIONSHIP',e,e.edgeId)}));
  const modules = byKey('observedModuleDirectory').concat(byKey('modulePath'),runtimeHomes.filter(h=>h.kind==='MODULE'));
  const canonicalEntrypoints=runtimeHomes.flatMap(h=>h.entryPoints.map(path=>({path,runtimeHomeId:h.id,capabilityId:h.capabilityId,epistemicClass:'CANONICAL_MODEL',provenance:h.provenance})));
  const declarations = ['projectIdentity','runtimeRequirement','goRequirement','toolchainRequirement','buildTarget',
    'buildAndTestDeclarations','testDefinitionObserved','dependencyDeclaration','build-system.build-backend',
    'configurationLocation','entryPoint'].flatMap(byKey);
  return { state: modules.length || declarations.length || canonicalEdges.length ? 'PARTIAL' : 'UNKNOWN',
    entrypoints: byKey('entryPoint').concat(canonicalEntrypoints), modulesAndPackages: modules,
    relationships: canonicalEdges, relationshipState: canonicalEdges.length?'ESTABLISHED':'UNKNOWN', runtimeHomes: runtimeHomes.length?runtimeHomes:byKey('runtimeRequirement').concat(byKey('goRequirement'),byKey('toolchainRequirement')),
    tests: byKey('testDefinitionObserved'), buildDefinitions: byKey('buildTarget').concat(byKey('buildAndTestDeclarations'),byKey('build-system.build-backend')),
    configuration: byKey('configurationLocation'), dependencies: byKey('dependencyDeclaration').concat(canonicalEdges.filter(e=>e.relationship==='DEPENDS_ON')),
    topologyTruncated:{runtimeHomes:(model.runtimeHomes??[]).length>32,relationships:(model.edges??[]).length+(model.interfaces??[]).length>canonicalEdges.length},
    limitation: 'Only already-admitted bounded facts are projected; caller/callee and unobserved relationships are not inferred.' };
}
function established(value, references) {
  if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) return structuredClone(UNKNOWN);
  return { state: 'ESTABLISHED', value, provenanceReferences: references };
}
function canonicalReference(kind, row, id) {
  return { kind, identity:id, source:row?.provenance?.source ?? null,
    sourceRef:row?.provenance?.sourceRef ?? null, modelRevision:row?.provenance?.modelRevision ?? null };
}
function deriveContinuityCapsule({ canonicalModel, g15, truth, structuralGraph }) {
  if (!canonicalModel || !Number.isSafeInteger(canonicalModel.canonicalState?.modelRevision) ||
      !g15 || g15.kind !== 'HITO_G15_UNIVERSAL_PROTOCOL_PROJECTION_ENVELOPE' ||
      !truth || typeof truth.semanticResultIdentity !== 'string') throw Error('R10M_VALIDATED_CANONICAL_STATE_REQUIRED');
  const facts = [...(truth.qualifiedSemanticFacts?.facts ?? [])].filter(f => f && f.factIdentity && f.sourceArtifactIdentity && f.sourceContentIdentity)
    .sort((a,b) => a.factIdentity < b.factIdentity ? -1 : a.factIdentity > b.factIdentity ? 1 : 0);
  const model = canonicalModel;
  const revision = model.canonicalState.modelRevision;
  const acceptedIntents = (model.intent ?? []).filter(i => i.authorityProof && ['OWNER_CONFIRMATION','RECOVERED_AUTHORITY'].includes(i.authorityProof.kind));
  const decisions = (model.decisions ?? []).filter(d => Number.isSafeInteger(d.effectiveRevision) && d.effectiveRevision <= revision);
  const unfinished = (model.mutations ?? []).filter(m => ['PROPOSED','APPROVED'].includes(m.status));
  const selectedIntents=acceptedIntents.slice(0,32), selectedDecisions=decisions.slice(-32), selectedUnfinished=unfinished.slice(0,32);
  const freshness = truth.freshness?.state ?? g15.governedTruth?.freshnessWatermark?.state ?? 'UNKNOWN';
  const factCurrentness = ['CURRENT','UNCHANGED_BOUNDED_EVIDENCE','CAPTURED_BOUNDED_EVIDENCE'].includes(freshness)
    ? 'CURRENT_WITHIN_REPORTED_SCOPE' : freshness;
  const factReferences = facts.map(provenanceRef);
  const workReferences = [
    ...(model.runtimeHomes??[]).slice(0,32).map(h=>canonicalReference('CANONICAL_RUNTIME_HOME',h,h.runtimeHomeId)),
    ...[...(model.edges??[]),...(model.interfaces??[])].filter(e=>['CALLS','DEPENDS_ON','CONSUMES','PRODUCES','PERSISTS','IMPLEMENTS','EXPOSES','OWNS','HOMES'].includes(e.relationship)).slice(0,64).map(e=>canonicalReference('CANONICAL_RELATIONSHIP',e,e.edgeId)),
    ...selectedIntents.map(i=>canonicalReference('CANONICAL_INTENT',i,i.promiseId)),
    ...selectedDecisions.map(d=>canonicalReference('CANONICAL_DECISION',d,d.decisionId)),
    ...selectedUnfinished.map(m=>canonicalReference('CANONICAL_MUTATION',m,m.mutationId))
  ];
  const sortedReferences = [...factReferences,...workReferences].sort((a,b)=>{const x=String(a.identity??a.factIdentity),y=String(b.identity??b.factIdentity);return x<y?-1:x>y?1:0;});
  const referenceMap=new Map(sortedReferences.map(r=>[r.factIdentity??`${r.kind}:${r.identity}`,r]));
  const references=[...referenceMap.values()];
  const refIds = new Set(references.map(r => r.factIdentity ?? `${r.kind}:${r.identity}`));
  const governed = g15.governedTruth;
  const blockers = (governed.materialStates ?? []).filter(s => s.severity === 'BLOCKER' || s.severity === 'BLOCKING' || s.state === 'BLOCKED' || s.blocking === true);
  const workContinuity = {
    ACTIVE_OBJECTIVE: selectedIntents.length ? established({items:selectedIntents.map(i => ({ id: i.promiseId, statement: i.statement, authority: i.authority, authorityProof:i.authorityProof })),truncated:acceptedIntents.length>selectedIntents.length}, selectedIntents.map(i=>`CANONICAL_INTENT:${i.promiseId}`)) : structuredClone(UNKNOWN),
    ACCEPTED_DECISIONS: selectedDecisions.length ? established({items:selectedDecisions.map(d => ({ id: d.decisionId, context: d.context, selectedOutcome: d.selectedOutcome, rationale: d.rationale, effectiveRevision: d.effectiveRevision })),truncated:decisions.length>selectedDecisions.length}, selectedDecisions.map(d=>`CANONICAL_DECISION:${d.decisionId}`)) : structuredClone(UNKNOWN),
    UNFINISHED_WORK: selectedUnfinished.length ? established({items:selectedUnfinished.map(m => ({ id: m.mutationId, status: m.status, reason: m.reason, proposal: m.proposal })),truncated:unfinished.length>selectedUnfinished.length}, selectedUnfinished.map(m=>`CANONICAL_MUTATION:${m.mutationId}`)) : structuredClone(UNKNOWN),
    CURRENT_BLOCKERS: blockers.length ? established(blockers.slice(0,32).map(b => ({ id: b.stateId ?? b.identity ?? null, state: b.state ?? null, detail: b.detail ?? b.summary ?? null, provenance: b.provenance ?? null })), []) : structuredClone(UNKNOWN),
    NEXT_JUSTIFIED_ACTION: governed.nextStep ? established(governed.nextStep, []) : structuredClone(UNKNOWN)
  };
  if (workContinuity.NEXT_JUSTIFIED_ACTION.value?.state === 'NO_JUSTIFIED_NEXT_STEP') workContinuity.NEXT_JUSTIFIED_ACTION = established(workContinuity.NEXT_JUSTIFIED_ACTION.value, []);
  const capsule = {
    schema: 'HITO_R10M_CONTINUITY_CAPSULE_V1', kind: 'DERIVED_READ_ONLY_PROJECTION',
    projectIdentity: { projectId: model.project.projectId, name: model.project.name, rootIdentity: model.project.root },
    frozenRevision: { revision, modelIntegrityHash: model.canonicalState.integrity?.modelHash ?? null,
      historyHead: model.canonicalState.historyHead ?? null, evidenceHead: model.canonicalState.evidenceHead ?? null },
    semanticResultIdentity: truth.semanticResultIdentity,
    coordinates: { WHAT: { state:governed.intents.some(i=>i.recordKind==='CANONICAL_INTENT_RECORD')?'ESTABLISHED':'UNKNOWN', answer:g15.projections.GUIDED.answers.whatAmITryingToDo, intents:governed.intents.filter(i=>i.recordKind==='CANONICAL_INTENT_RECORD').slice(0,32), truncated:governed.intents.filter(i=>i.recordKind==='CANONICAL_INTENT_RECORD').length>32 },
      HOW: deriveStructuralHow(facts, factCurrentness,model),
      RESULT: { state:governed.overallStatus, semanticVerdictIdentity:governed.semanticVerdictIdentity, mriIdentity:governed.sourceAuthorities?.phase3MriIdentity ?? null, freshnessWatermark:governed.freshnessWatermark },
      CONTINUITY: { freshness, continuityMode: truth.continuityMode ?? 'UNKNOWN', work: workContinuity } },
    materialStates: governed.materialStates.slice(0,64).map(s=>({state:s.category??s.state??'UNKNOWN',category:s.category??s.state??'UNKNOWN',severity:s.severity??'UNKNOWN',scope:s.scope??null,detail:s.summary??s.detail??null,sourceAuthority:s.sourceAuthority??null,sourceIdentity:s.sourceIdentity??null,reasonCodes:s.reasonCodes??[],provenance:s.provenance??null})),
    qualifiedFacts: facts.map(f => compactFact(f, factCurrentness)),
    provenanceReferences: references,
    currentness: { state: freshness, watermark: governed.freshnessWatermark ?? null, scope: truth.freshness?.scope ?? 'UNKNOWN' },
    contradictions: governed.materialStates.filter(s => ['CONFLICT','CONTRADICTION','CONFLICTED','CONTRADICTED'].includes(s.category??s.state)).slice(0,64).map(s => ({ state:s.category??s.state, severity:s.severity??'UNKNOWN', detail:s.summary ?? s.detail ?? null, scope:s.scope??null,sourceAuthority:s.sourceAuthority??null,sourceIdentity:s.sourceIdentity??null,reasonCodes:s.reasonCodes??[] })),
    materialUnknowns: governed.materialStates.filter(s => MATERIAL_GAP_CATEGORIES.has(s.category??s.state) || isMaterialUnknown(s.epistemicClass)).slice(0,64).map(s => ({ state:s.category??s.state??'UNKNOWN', severity:s.severity??'UNKNOWN', detail:s.summary ?? s.detail ?? null, scope:s.scope ?? null,sourceAuthority:s.sourceAuthority??null,sourceIdentity:s.sourceIdentity??null,reasonCodes:s.reasonCodes??[] })),
    authority: { execution: governed.nextStep?.executionAuthority ?? false, nextAction: governed.nextStep ?? { state:'NO_JUSTIFIED_NEXT_STEP', executionAuthority:false }, canonicalAuthority:false, truthOwner:false },
    limitations: [...new Set([...(g15.limitations ?? []), ...(truth.limitations ?? [])])].sort().slice(0,32),
    metrics: { semanticFactCount: facts.length, provenanceReferenceCount: refIds.size,
      unknownCount: 0, capsuleBytes: 0, bytesPerSemanticFact: 0,
      capsuleBytesBasis:'UTF-8 bytes of deterministic JSON payload excluding metrics; includes terminating newline' }
  };
  if(structuralGraph){
    if(structuralGraph.canonicalModelHash!==model.canonicalState.integrity?.modelHash)throw Error('R10O_CANONICAL_GRAPH_MISMATCH');
    capsule.coordinates.HOW.structuralGraph=structuralGraph;
    const bytes=Buffer.byteLength(JSON.stringify(structuralGraph)+'\n');
    capsule.metrics.structuralHow={bytes,nodeCount:structuralGraph.nodes.length,edgeCount:structuralGraph.edges.length,provenanceReferenceCount:structuralGraph.provenanceReferences.length,bytesPerNode:structuralGraph.nodes.length?bytes/structuralGraph.nodes.length:null,bytesPerEdge:structuralGraph.edges.length?bytes/structuralGraph.edges.length:null};
  }
  capsule.metrics.unknownCount = capsule.materialUnknowns.length + Object.values(workContinuity).filter(v => v.state === 'UNKNOWN').length +
    Object.values(capsule.coordinates).filter(v => v === 'UNKNOWN' || v?.state === 'UNKNOWN').length + (capsule.coordinates.HOW.relationshipState==='UNKNOWN'?1:0);
  const {metrics:ignoredMetrics,...payload}=capsule;
  capsule.metrics.capsuleBytes=Buffer.byteLength(JSON.stringify(payload)+'\n','utf8');
  capsule.metrics.bytesPerSemanticFact=facts.length?Math.round((capsule.metrics.capsuleBytes/facts.length)*100)/100:null;
  return capsule;
}
function serialize(capsule) { return JSON.stringify(capsule) + '\n'; }
function digest(capsule) { return sha(Buffer.from(serialize(capsule), 'utf8')); }
module.exports = { deriveContinuityCapsule, deriveStructuralHow, serialize, digest };
