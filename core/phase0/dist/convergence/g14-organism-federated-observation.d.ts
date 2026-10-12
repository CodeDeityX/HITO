import { type CanonicalModel } from "../contracts";
import { type G8EngineeringRealityProjection } from "./g8-engineering-reality";
import { type G9TransitionCompletionAssessment } from "./g9-transition-completion";
import { type G10SemanticHistoryDiffProjection } from "./g10-semantic-history-diff";
import { type G11SemanticConflictDetectionResult } from "./g11-semantic-conflict-detection";
import { type G12SemanticBranchMergeAssessment } from "./g12-semantic-branch-merge";
import { type G13ProofCarryingReleaseAssessment } from "./g13-proof-carrying-release";
export declare const G14_ORGANISM_FEDERATED_OBSERVATION_RULESET_VERSION: "hito-organism-identity-federated-observation-v1-repair1";
export declare const G14_ORGANISM_FEDERATED_OBSERVATION_AUTHORITY: "DERIVED / DETERMINISTIC / PROVENANCE_BOUND / READ_ONLY / NON_CANONICAL / NONEXECUTING";
export declare const G14_CONTRACT_SHA256: "1689fad7044639a2576eaef121221bb7299bbbc0a07d49c4aa809ef7f4656899";
export declare const G14_MODEL_SHA256: "4eb24f8741ca942778b4c4dcbfc7c927134cc342b579693b3a61f7aa95eae4dc";
export declare const G14_CASES_SHA256: "2ec3cea8a607225a040928f42fec23a2536cb4b7e6f813812585f1c9aad85097";
export declare const G14_TRACEABILITY_SHA256: "a1281f0647d35485c3da386cf1219d40f914eb522d2572ceabdf2d920bb482da";
export declare const G14_CONTINUITY_SHA256: "6ae85c8dd884a3c7ca1dd9dbceead42c36a7ef8acbf7fac91472772c5fabf67c";
export declare const G14_MANIFEST_SHA256: "28e8ff3940e69430804b4eeac8fcfc5a5faf71b2414f58a697aef4c3a935eccb";
export type G14TerritoryRelation = "ALIGNED" | "DESYNCHRONIZED" | "INDETERMINATE" | "NOT_APPLICABLE";
export type G14Applicability = "REQUIRED" | "NOT_APPLICABLE";
export type G14AuthorityState = "CURRENT" | "STALE" | "UNAVAILABLE" | "UNAUTHENTICATED" | "INVALID" | "UNKNOWN";
export type G14AuthorityBasis = "EXPLICIT_GOVERNED_AUTHORITY" | "REPOSITORY_TEXT" | "AGENT_PROSE" | "UNBOUND";
export type G14CoverageState = "BOUND_COMPLETE" | "PARTIAL" | "UNOBSERVED" | "UNKNOWN";
export type G14FactApplicability = "APPLIES" | "DOES_NOT_APPLY" | "UNKNOWN";
export type G14WallClockFreshness = "FRESH" | "STALE" | "UNKNOWN";
export type G14PhysicalOccurrence = "OBSERVED" | "NOT_OBSERVED" | "UNKNOWN";
export type G14SemanticLegitimacy = "AUTHORIZED" | "UNAUTHORIZED" | "UNKNOWN";
export type G14TerritorySubjectClass = "CANONICAL_MEMBER" | "EXPLICITLY_ADMITTED_MEMBER" | "RUNTIME_REALIZATION" | "EXTERNAL_DEPENDENCY" | "EXTERNAL_TERRITORY";
export type G14MembershipState = "CANONICAL_MEMBER" | "EXPLICITLY_ADMITTED_MEMBER" | "ADMITTED_RUNTIME_REALIZATION" | "EXTERNAL_BOUNDARY" | "INDETERMINATE";
export type G14RealizationBindingState = "BOUND" | "UNBOUND" | "INDETERMINATE";
export type G14RuntimeObservedState = "RUNNING" | "STOPPED" | "UNKNOWN";
export type G14RolloutApplicability = "REQUIRED" | "NOT_REQUIRED";
export type G14RolloutState = "ACCEPTED" | "EXPIRED" | "UNAUTHORIZED" | "UNAVAILABLE" | "UNKNOWN";
export type G14DynamicIndirectionState = "RESOLVED" | "UNRESOLVED" | "NOT_APPLICABLE";
export interface G14ObserverAuthority {
    authorityId: string;
    state: G14AuthorityState;
    basis: G14AuthorityBasis;
}
export interface G14MembershipAdmission {
    authorityId: string;
    state: G14AuthorityState;
    basis: G14AuthorityBasis;
    projectId: string;
    territoryEntityId: string;
    sourceModelRevision: number;
    boundSemanticRealityIdentity: string;
}
export interface G14TerritorySubject {
    territoryEntityId: string;
    class: G14TerritorySubjectClass;
    membershipAdmission?: G14MembershipAdmission;
}
export interface G14BoundedObserverClaimFact {
    factId: string;
    projectId: string;
    subjectId: string;
    claimKey: string;
    scopeIdentity: string;
    environmentIdentity: string;
    targetIdentity: string;
    variantIdentity: string;
    observerId: string;
    authority: G14ObserverAuthority;
    coverage: G14CoverageState;
    applicability: G14FactApplicability;
    observedMeaningIdentity: string;
    sourceBytesIdentity: string;
    sourceModelRevision: number;
    targetRevisionIdentity: string;
    causalPositionIdentity: string;
    wallClockFreshness: G14WallClockFreshness;
    physicalOccurrence: G14PhysicalOccurrence;
    semanticLegitimacy: G14SemanticLegitimacy;
}
export interface G14RuntimeInstanceObservation {
    instanceId: string;
    projectId: string;
    capabilityId: string;
    runtimeHomeId: string;
    environmentIdentity: string;
    targetIdentity: string;
    variantIdentity: string;
    generationIdentity: string;
    observedState: G14RuntimeObservedState;
    authority: G14ObserverAuthority;
    sourceModelRevision: number;
    targetRevisionIdentity: string;
    causalPositionIdentity: string;
    semanticLegitimacy: G14SemanticLegitimacy;
}
export interface G14RolloutEnvelope {
    rolloutId: string;
    state: G14RolloutState;
    projectId: string;
    subjectId: string;
    scopeIdentity: string;
    environmentIdentity: string;
    targetIdentity: string;
    variantIdentities: string[];
    allowedGenerationIdentities: string[];
    authority: G14ObserverAuthority;
    sourceModelRevision: number;
    targetRevisionIdentity: string;
    causalPositionIdentity: string;
}
export interface G14DynamicIndirection {
    indirectionId: string;
    projectId: string;
    subjectId: string;
    scopeIdentity: string;
    environmentIdentity: string;
    targetIdentity: string;
    variantIdentity: string;
    state: G14DynamicIndirectionState;
}
export interface G14FederatedObservationRequest {
    projectId: string;
    subjectId: string;
    claimKey: string;
    scopeIdentity: string;
    environmentIdentity: string;
    targetIdentity: string;
    requiredVariantIdentities: string[];
    applicability: G14Applicability;
    expectedMeaningIdentity?: string;
    currentTargetRevisionIdentity: string;
    currentCausalPositionIdentity: string;
    causalBinding: "REQUIRED" | "NOT_REQUIRED";
    territorySubject: G14TerritorySubject;
    runtimeRealizationApplicability: G14RolloutApplicability;
    observations: G14BoundedObserverClaimFact[];
    runtimeRealizations: G14RuntimeInstanceObservation[];
    rolloutApplicability: G14RolloutApplicability;
    rolloutEnvelope?: G14RolloutEnvelope;
    dynamicIndirections: G14DynamicIndirection[];
}
export interface G14OrganismFederatedObservationInput {
    model: CanonicalModel;
    g8Successor: G8EngineeringRealityProjection;
    g9?: G9TransitionCompletionAssessment;
    g10: G10SemanticHistoryDiffProjection;
    g11?: G11SemanticConflictDetectionResult;
    g12: G12SemanticBranchMergeAssessment;
    g13?: G13ProofCarryingReleaseAssessment;
    request: G14FederatedObservationRequest;
}
export interface G14OrganismIdentityProjection {
    organismIdentityId: string;
    projectionId: string;
    projectId: string;
    subjectId: string;
    persistentSubjectIdentity: string;
    capabilityId: string | null;
    persistentCapabilityIdentity: string | null;
    runtimeHomeId: string | null;
    persistentRuntimeHomeIdentity: string | null;
    canonicalModelRevision: number;
    ephemeralInstanceIdsExcludedFromPersistentIdentity: true;
    canonicalAuthority: false;
}
export interface G14RuntimeRealizationProjection {
    instanceId: string;
    runtimeInstanceIdentity: string;
    realizationBindingId: string;
    persistentCapabilityIdentity: string;
    persistentRuntimeHomeIdentity: string;
    generationIdentity: string;
    variantIdentity: string;
    bindingState: G14RealizationBindingState;
    active: boolean;
    authorityApplicable: boolean;
    semanticLegitimacy: G14SemanticLegitimacy;
    reasonCodes: string[];
}
export interface G14ObservationFactProjection {
    factId: string;
    normalizedClaimKey: string;
    variantIdentity: string;
    observedMeaningIdentity: string;
    observerId: string;
    authorityApplicable: boolean;
    coverage: G14CoverageState;
    semanticLegitimacy: G14SemanticLegitimacy;
    reasonCodes: string[];
}
export interface G14VariantObservationAssessment {
    variantIdentity: string;
    conflictAssessmentId: string;
    conflictAssessment: G11SemanticConflictDetectionResult["conflictAssessment"];
    authoritativeFactIds: string[];
    matchingFactIds: string[];
    divergentFactIds: string[];
    coverageState: G14CoverageState;
    state: "ALIGNED" | "DESYNCHRONIZED" | "INDETERMINATE";
    reasonCodes: string[];
}
export interface G14ZeroEffectCounters {
    canonicalWriteCount: 0;
    governedTargetMutationCount: 0;
    targetExecutionCount: 0;
    mergeExecutionCount: 0;
    deploymentExecutionCount: 0;
    providerModelCallCount: 0;
    unauthorizedNetworkCallCount: 0;
    namespaceMigrationCount: 0;
}
export interface G14OrganismFederatedObservationProjection {
    kind: "HITO_G14_ORGANISM_IDENTITY_FEDERATED_OBSERVATION_PROJECTION";
    rulesetVersion: typeof G14_ORGANISM_FEDERATED_OBSERVATION_RULESET_VERSION;
    authority: typeof G14_ORGANISM_FEDERATED_OBSERVATION_AUTHORITY;
    projectionId: string;
    territoryRelation: G14TerritoryRelation;
    normalizedBoundedClaimKey: string;
    organismIdentity: G14OrganismIdentityProjection;
    territoryMembership: {
        territoryEntityId: string;
        declaredClass: G14TerritorySubjectClass;
        membershipState: G14MembershipState;
        organismMember: boolean;
        realizationOnly: boolean;
        externalBoundary: boolean;
        admissionAuthorityId: string | null;
    };
    observations: G14ObservationFactProjection[];
    ignoredUnrelatedFactIds: string[];
    variants: G14VariantObservationAssessment[];
    observationCoverage: {
        requiredVariantIdentities: string[];
        establishedVariantIdentities: string[];
        unobservedVariantIdentities: string[];
        state: G14CoverageState;
        boundedClaimOnly: true;
        fullTerritoryClaimed: false;
        configurationSpaceExhaustiveRequired: false;
    };
    runtimeRealizations: G14RuntimeRealizationProjection[];
    rollout: {
        applicability: G14RolloutApplicability;
        state: G14RolloutState | "NOT_REQUIRED" | "MISSING";
        mixedGenerations: boolean;
        activeGenerationIdentities: string[];
        acceptedEnvelope: boolean;
        envelopeId: string | null;
    };
    dynamicUncertainty: {
        relevantUnresolvedIndirectionIds: string[];
        fabricatedEdgeCount: 0;
        completeIsolationClaimed: false;
    };
    sources: {
        canonicalModelRevision: number;
        canonicalModelIntegrityHash: string;
        semanticRealityIdentity: string;
        g9AssessmentId: string | null;
        g10ProjectionId: string;
        g11AssessmentId: string | null;
        g12AssessmentId: string;
        g13AssessmentId: string | null;
    };
    reasonCodes: string[];
    governanceBoundary: {
        derivedOnly: true;
        canonicalAuthority: false;
        physicalOccurrenceProvesSemanticLegitimacy: false;
        semanticLegitimacyGranted: false;
        observationOnly: true;
        targetExecuted: false;
        universalFederation: false;
        cloudControlPlaneAuthority: false;
    };
    zeroEffectCounters: G14ZeroEffectCounters;
    truthBoundary: string;
    limitations: string[];
}
/**
 * Derives bounded organism identity, observer composition, runtime realization, and territory relation.
 * It never writes canonical state, executes a target, calls a provider, or claims unobserved territory.
 */
export declare function deriveG14OrganismFederatedObservation(input: G14OrganismFederatedObservationInput): G14OrganismFederatedObservationProjection;
