export declare const HITO_P1_BRIDGE_KIND: "HITO_P1_LOCAL_VSCODE_BRIDGE";
export declare const HITO_IDE_PAYLOAD_KIND: "HITO_PRE_C9_HOST_NEUTRAL_IDE_PAYLOAD";
export declare const HITO_AGENT_CONTEXT_KIND: "HITO_PRE_C9_HOST_NEUTRAL_AGENT_CONTEXT";
export declare const HITO_IDE_HOST_VERSION: "hito-pre-c9-ide-host-v1";
export declare const HITO_AGENT_CONTEXT_VERSION: "hito-pre-c9-agent-context-v1";
export declare const HITO_HOST_PROTOCOL_VERSION: "hito-pre-c9-host-protocol-v1";
export declare const HITO_HOST_AUTHORITY: "DERIVED / DETERMINISTIC / READ_ONLY / NON_CANONICAL / NONEXECUTING / HOST_PROJECTION_ONLY";
export declare const HITO_TRUSTED_STATUSES: readonly ["BOUNDED_CURRENT", "BOUNDED_ATTENTION", "GLOBALLY_BLOCKED", "GLOBALLY_INDETERMINATE"];
export type HitoTrustedStatus = typeof HITO_TRUSTED_STATUSES[number];
export type HitoPresentationMode = "GUIDED" | "ENGINEER" | "FORENSIC";
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | {
    [key: string]: JsonValue;
};
export interface HitoSourceIdentities {
    c7CompositionIdentity: string;
    c6CompositionIdentity: string;
    g15EnvelopeIdentity: string;
    semanticVerdictIdentity: string;
    g16AssessmentIdentity: string;
    phase3PulseIdentity: string;
    phase3MriIdentity: string;
    selectedViewIdentity: string;
}
export interface HitoHostField<T> {
    value: T;
    provenance: readonly JsonValue[];
    semanticAuthority: false;
    executionAuthority: false;
}
export interface HitoMaterialState {
    materialStateId: string;
    category: string;
    severity: string;
    summary: string;
    scope: JsonValue;
    [key: string]: JsonValue;
}
export interface HitoUxAnswers {
    whereAmI: string;
    whatAmITryingToDo: string;
    whatIsMissing: string;
    whatNext: string;
    why: string;
    whatIsSafeToChange: string;
    whatShouldINotTouch: string;
    whenIsThisDone: string;
}
export interface HitoGovernanceBoundary {
    hostNeutral: true;
    derivedOnly: true;
    readOnly: true;
    canonicalAuthority: false;
    ontologyAuthority: false;
    nextStepAuthority: false;
    realityJudgeAuthority: false;
    executionAuthority: false;
    browserDependency: false;
    modelProviderDependency: false;
    navigationIsMutationAuthority?: false;
    shellMutationCommandGenerated?: false;
    acceptsAgentProseAsIntent?: false;
    acceptsCallerVerdict?: false;
    acceptsCallerNextStep?: false;
    acceptsCallerProtectedScope?: false;
    createsCommitment?: false;
    createsExecutionAuthority?: false;
}
export interface HitoZeroEffectCounters {
    canonicalWrites: 0;
    hitoStateWrites: 0;
    targetMutations: 0;
    targetExecutions: 0;
    providerModelCalls: 0;
    unauthorizedNetworkCalls: 0;
    gitMutations: 0;
    hitoNamespaceCreations: 0;
    namespaceMigrations: 0;
}
export interface HitoMriProjection {
    nodes: JsonValue[];
    edges: JsonValue[];
    conflicts: JsonValue[];
    ambiguities: JsonValue[];
    [key: string]: JsonValue;
}
export interface HitoMermaidProjection {
    kind: "HITO_PRE_C9_DERIVED_MERMAID_MRI";
    version: "hito-pre-c9-mermaid-mri-v1";
    diagramIdentity: string;
    sourceMriIdentity: string;
    sourceSemanticVerdictIdentity: string;
    mermaid: string;
    completeness: JsonValue;
    governanceBoundary: {
        derivedOnly: true;
        canonicalAuthority: false;
        graphStoreCreated: false;
        historyStoreCreated: false;
        layoutSemanticInference: false;
        rawHtmlAllowed: false;
        executionAuthority: false;
    };
    [key: string]: JsonValue;
}
export interface HitoIdePayload {
    kind: typeof HITO_IDE_PAYLOAD_KIND;
    version: typeof HITO_IDE_HOST_VERSION;
    protocolVersion: typeof HITO_HOST_PROTOCOL_VERSION;
    authority: typeof HITO_HOST_AUTHORITY;
    payloadIdentity: string;
    mode: HitoPresentationMode;
    source: HitoSourceIdentities;
    surfaces: {
        projectPulse: HitoHostField<{
            phase3Pulse: JsonValue;
            status: HitoTrustedStatus;
            currentClaim: JsonValue;
            materialStateGroups: JsonValue[];
            materialStateCount: number;
            answers: HitoUxAnswers;
        }>;
        next: HitoHostField<{
            nextStep: JsonValue;
            actionRoute: JsonValue;
            explanation: string;
            mutatingCommand: null;
        }>;
        why: HitoHostField<{
            explanation: string;
            materialStateGroups: JsonValue[];
            materialStates: HitoMaterialState[];
            semanticVerdictIdentity: string;
        }>;
        mri: HitoHostField<HitoMriProjection>;
        mermaid: HitoHostField<HitoMermaidProjection>;
        history: HitoHostField<JsonValue>;
        evidence: HitoHostField<JsonValue>;
        protectedAuthorities: HitoHostField<HitoMaterialState[]>;
        runtimeState: HitoHostField<JsonValue>;
        freshness: HitoHostField<JsonValue>;
        coverage: HitoHostField<JsonValue>;
        intentProvenance: HitoHostField<JsonValue>;
    };
    ux: HitoUxAnswers;
    navigationRoutes: readonly JsonValue[];
    hostCapabilities: {
        thinWrapperReady: true;
        hostSpecificOntology: false;
        presentationHostDependency: false;
        semanticRecomputationRequired: false;
    };
    governanceBoundary: HitoGovernanceBoundary;
    zeroEffectCounters: HitoZeroEffectCounters;
}
export interface HitoAgentContext {
    kind: typeof HITO_AGENT_CONTEXT_KIND;
    version: typeof HITO_AGENT_CONTEXT_VERSION;
    protocolVersion: typeof HITO_HOST_PROTOCOL_VERSION;
    authority: typeof HITO_HOST_AUTHORITY;
    contextIdentity: string;
    mode: HitoPresentationMode;
    source: HitoSourceIdentities;
    project: HitoHostField<JsonValue>;
    reality: HitoHostField<JsonValue>;
    protocolRulesets: HitoHostField<JsonValue>;
    operationalMode: HitoHostField<JsonValue>;
    intent: HitoHostField<JsonValue>;
    currentObjective: HitoHostField<string>;
    exactNextSafeMutation: HitoHostField<JsonValue>;
    why: HitoHostField<JsonValue>;
    blockers: HitoHostField<HitoMaterialState[]>;
    contradictionsAndConflicts: HitoHostField<HitoMaterialState[]>;
    unknownOrIndeterminate: HitoHostField<HitoMaterialState[]>;
    protectedAuthorities: HitoHostField<HitoMaterialState[]>;
    evidence: HitoHostField<JsonValue>;
    freshness: HitoHostField<JsonValue>;
    coverage: HitoHostField<JsonValue>;
    runtimeAndTerritory: HitoHostField<JsonValue>;
    safeToChange: HitoHostField<string>;
    doneWhen: HitoHostField<string>;
    mutatingCommand: null;
    governanceBoundary: HitoGovernanceBoundary;
    zeroEffectCounters: HitoZeroEffectCounters;
}
export interface HitoLocalBridgeDocument {
    kind: typeof HITO_P1_BRIDGE_KIND;
    ide: HitoIdePayload;
    agentContext?: HitoAgentContext;
}
export type HitoWrapperState = {
    kind: "READY";
    bridge: HitoLocalBridgeDocument;
    sourceRelativePath: string;
} | {
    kind: "UNAVAILABLE";
    reason: string;
    semanticStatusAsserted: false;
};
/** Separate wire schema; no legacy version or identity field is redefined. */
export declare const HITO_FIRST_OBSERVATION_BRIDGE_KIND: "HITO_FIRST_OBSERVATION_LOCAL_BRIDGE_R1";
export interface HitoFirstObservationSemanticResult {
    kind: "HITO_FIRST_OBSERVATION_SEMANTIC_RESULT";
    version: "hito-first-observation-semantic-r1";
    mode: "FIRST_OBSERVATION";
    priorState: "NO_PRIOR_STATE_ADMITTED";
    subjectIdentity: string;
    semanticResultIdentity: string;
    documentaryEvidence: Array<{
        evidenceId: string;
        authorityClass: "DOCUMENTARY_EVIDENCE_ONLY";
        content: string;
        provenance: {
            subjectIdentity: string;
            sourcePath: string;
            contentSha256: string;
            capturedAt: string;
        };
    }>;
    dimensions: {
        declaredIntent: "UNAVAILABLE";
        canonicalAuthority: "UNAVAILABLE";
        runtimeState: "UNAVAILABLE";
        ownership: "UNAVAILABLE";
        integration: "UNAVAILABLE";
        conflictAssessment: "INDETERMINATE";
        comparativeHistory: "NOT_APPLICABLE";
    };
    coverage: {
        state: "PARTIAL";
        completeUnderstanding: false;
        warning: string;
    };
    nextStep: {
        state: "NO_JUSTIFIED_NEXT_STEP";
        executionAuthority: false;
        mutatingCommand: null;
    };
    boundary: {
        derivedOnly: true;
        canonicalAuthority: false;
        ontologyAuthority: false;
        executionAuthority: false;
    };
}
export interface HitoFirstObservationHostPayload {
    kind: "HITO_FIRST_OBSERVATION_HOST_PAYLOAD";
    version: "hito-first-observation-host-r1";
    mode: "FIRST_OBSERVATION";
    priorState: "NO_PRIOR_STATE_ADMITTED";
    semanticResult: HitoFirstObservationSemanticResult;
    source: {
        semanticResultIdentity: string;
        subjectIdentity: string;
    };
    boundary: HitoFirstObservationSemanticResult["boundary"];
}
export interface HitoFirstObservationMri {
    kind: "HITO_FIRST_OBSERVATION_DERIVED_MRI";
    version: "hito-first-observation-mri-r1";
    sourceSemanticResultIdentity: string;
    mermaid: string;
    dimensions: HitoFirstObservationSemanticResult["dimensions"];
    nodes: null;
    edges: null;
    conflicts: null;
    ownership: null;
    completeness: {
        state: "PARTIAL";
        completeUnderstanding: false;
        allKnownGapsIncluded: true;
    };
    boundary: {
        derivedOnly: true;
        canonicalAuthority: false;
        executionAuthority: false;
        layoutSemanticInference: false;
    };
}
export interface HitoFirstObservationBridge {
    kind: typeof HITO_FIRST_OBSERVATION_BRIDGE_KIND;
    ide: {
        kind: "HITO_FIRST_OBSERVATION_IDE_PAYLOAD";
        version: "hito-first-observation-ide-r1";
        host: HitoFirstObservationHostPayload;
        mri: HitoFirstObservationMri;
    };
    agentContext: {
        kind: "HITO_FIRST_OBSERVATION_AGENT_CONTEXT";
        version: "hito-first-observation-agent-r1";
        host: HitoFirstObservationHostPayload;
        mutatingCommand: null;
    };
}
