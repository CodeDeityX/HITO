'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const live=require('../live/live-model.cjs');
const guided=require('../live/guided-model.cjs');
const overview=require('../live/project-overview.cjs');

const id='r2-state:r5c-fixture';
const facts=[
 {factIdentity:'qualified-fact:project',key:'projectIdentity',value:'fixture-project',authority:'STRUCTURAL_DECLARATION',verification:'STRUCTURALLY_SUPPORTED',sourcePath:'package.json'},
 {factIdentity:'qualified-fact:purpose',key:'documentaryPurpose',value:'Fixture documentary purpose.',authority:'DOCUMENTARY_EVIDENCE_ONLY',verification:'NOT_VERIFIED',sourcePath:'README.md'},
 {factIdentity:'qualified-fact:test',key:'testDefinitionObserved',value:'tests/example.test.js',authority:'PHYSICAL_OBSERVATION',verification:'PHYSICALLY_OBSERVED_NOT_EXECUTED',sourcePath:'tests/example.test.js'}
];
const truth={
 semanticResultIdentity:id,subjectIdentity:'fixture-project',projectRoot:'C:/fixture',semanticMode:'R2',acquisitionState:'PARTIAL',
 continuityMode:'CONTINUATION',continuityBasis:'UNAVAILABLE',qualifiedSemanticFacts:{schema:'HITO_QUALIFIED_SEMANTIC_FACTS_R1',facts,complete:true},
 coverage:{dimensions:{declaredIntent:{state:'UNKNOWN'},projectMetadata:{state:'PARTIALLY_OBSERVED'},runtime:{state:'UNKNOWN'},configuration:{state:'UNKNOWN'},workspace:{state:'UNKNOWN'},ownership:{state:'UNKNOWN'},behavior:{state:'UNKNOWN'},tests:{state:'PARTIALLY_OBSERVED'},evidence:{state:'UNKNOWN'},currentness:{state:'UNKNOWN'}}},
 unknowns:{declaredIntent:{state:'UNKNOWN'},runtime:{state:'UNKNOWN'}},freshness:{state:'UNKNOWN'},
 gaps:[{dimension:'declaredIntent',state:'UNAVAILABLE',reason:'No admitted supporting evidence in selected scope'}],
 nextStep:{state:'NO_JUSTIFIED_NEXT_STEP',executionAuthority:false,mutatingCommand:'UNKNOWN'},
 contradictions:{assessment:'INDETERMINATE',blocking:false,items:[]},authorityBoundary:{canonicalAuthority:false,executionAuthority:false},
 materialSemanticGains:'NOT_APPLICABLE',successfulDeepening:true,stopReason:'STOP_QUEUE_EXHAUSTED_NO_ADDITIONAL_ADMISSIBLE_EVIDENCE'
};
const x={
 truth,binding:{activeRoot:truth.projectRoot,selection:'EXPLICIT'},
 cli:{truthRef:id,status:{answers:{whereAmI:'fixture is at bounded status',whatAmITryingToDo:'No declared intent is available in this bounded snapshot.'},materialStateGroups:[],qualifiedSemanticFacts:{facts}},next:{state:'NO_JUSTIFIED_NEXT_STEP',executionAuthority:false},why:{}},
 vscode:{truthRef:id,bridge:{ide:{surfaces:{}}}},agent:{truthRef:id,context:{truthRef:id}}
};
const p=live.project(x);
const d=guided.derive(p);

assert.equal(p.semanticResultIdentity,id);
assert.equal(p.executionEnabled,false);
assert.equal(p.sections.PROJECT_PULSE['SEMANTIC STATE'],'PARTIAL');
assert.equal(p.sections.PROJECT_PULSE['QUALIFIED POSITIVE FACT COUNT'],facts.length);
assert.equal(p.sections.PROJECT_PULSE['FOUR COORDINATES'].WHAT,'PARTIALLY_ESTABLISHED');
assert.equal(p.sections.PROJECT_PULSE['FOUR COORDINATES'].HOW,'UNKNOWN');
assert.equal(p.sections.PROJECT_PULSE['FOUR COORDINATES'].RESULT,'PARTIALLY_ESTABLISHED');
assert.equal(p.sections.PROJECT_PULSE['FOUR COORDINATES'].CONTINUITY,'PARTIALLY_ESTABLISHED');
assert.equal(p.sections.ESTABLISHED_FACTS.COUNT,facts.length);
assert.equal(p.sections.ESTABLISHED_FACTS.FACTS[1].authority,'DOCUMENTARY_EVIDENCE_ONLY');
assert.equal(p.sections.ESTABLISHED_FACTS.FACTS[1].verification,'NOT_VERIFIED');
assert.equal(d.semanticState,'PARTIAL');
assert.equal(d.observation,'Partial semantic observation');
assert.equal(d.observationStatusBar,'PARTIAL OBSERVATION');
assert.equal(d.health,'NOT YET DETERMINED');
assert.equal(d.memory,'PARTIAL');
assert.equal(d.justified,false);
assert.equal(d.executionEnabled,false);
assert.equal(d.sections.find(row=>row[0]==='Current')[1],'Unknown');
assert.match(d.sections.find(row=>row[0]==='What should I do next?')[1],/does not yet have enough evidence/);

const html=guided.html('PROJECT_PULSE',p);
assert.match(html,/Observation status/);
assert.match(html,/Partial semantic observation/);
assert.match(html,/Bounded semantic coordinates/);
assert.match(html,/Partially established/);
assert.match(html,/Qualified positive facts/);
assert.match(html,/Documentary evidence only/);
assert.match(html,/Not verified/);
assert.match(html,/Project Health/);
assert.match(html,/Not determined yet/);
assert.match(html,/HITO cannot safely recommend an action yet/);
const overviewHtml=overview.html(p);
assert.match(overviewHtml,/HITO currently has a partial observation/);
assert.match(overviewHtml,/Bounded semantic coordinates/);
assert.match(overviewHtml,/Partially established/);
assert.match(overviewHtml,/No declared intent is available in this bounded snapshot/);
assert.match(overviewHtml,/HITO cannot safely recommend an action yet/);

const extensionSource=fs.readFileSync(path.join(__dirname,'..','live','live-extension.cjs'),'utf8');
assert.match(extensionSource,/derive\(projection\)\.observationStatusBar/);
assert.doesNotMatch(extensionSource,/derive\(projection\)\.health/);

process.stdout.write(JSON.stringify({status:'PASS',schema:'hito.r5c.semantic-projection-parity.v1',semanticResultIdentity:id,semanticState:d.semanticState,coordinates:d.coordinates,qualifiedFactCount:d.qualifiedFactCount,health:d.health,memory:d.memory,unknownPreserved:true,executionAuthority:false})+'\n');
