import type { ScanScope } from "../contracts/scanner";
export type Phase1RepositoryType = "GIT" | "NON_GIT" | "UNKNOWN";
export type Phase1ScanStatus = "COMPLETED" | "INDETERMINATE" | "FAILED";
export type Phase1InventoryClassification = "SOURCE" | "MANIFEST" | "DOCUMENTATION" | "CONFIGURATION" | "UNKNOWN";
export interface Phase1ScanScope extends ScanScope {
    phase: 1;
    contentHashing: boolean;
    ignoreRules: string[];
    exclusionPolicyVersion: string;
}
export interface Phase1PermissionPreview {
    selectedRoot: string;
    selectedRootRealpath: string;
    repositoryType: Phase1RepositoryType;
    readableCategories: string[];
    excludedCategories: string[];
    gitMetadataOperations: string[];
    manifestFilesEligible: string[];
    contentHashing: boolean;
    outputLocation: string;
    arbitraryExecutionPermitted: false;
    networkAccess: false;
    targetWritePermitted: false;
    scope: Phase1ScanScope;
    scopeFingerprint: string;
    previewFingerprint: string;
}
export interface Phase1PermissionPreviewResult {
    preview: Phase1PermissionPreview;
    approvedScope: Phase1ScanScope;
    approvedScopeFingerprint: string;
}
export interface Phase1ScanRequest {
    requestedRoot: string;
    authorizedRoot: string;
    outputLocation: string;
    contentHashing?: boolean;
    maxRecentCommits?: number;
    approvedScope?: Phase1ScanScope;
    approvedScopeFingerprint?: string;
    onPermissionPreview?: (preview: Phase1PermissionPreview) => void | Promise<void>;
    onScanRead?: (relativePath: string) => void | Promise<void>;
}
export interface Phase1Exclusion {
    relativePath: string;
    reason: "GIT_INTERNALS" | "DEPENDENCY_CACHE" | "BUILD_OUTPUT" | "GENERATED_CACHE" | "TEMPORARY_DIRECTORY" | "IGNORED_PATH" | "SECRET_CANDIDATE" | "SYMLINK_ESCAPES_ROOT" | "SYMLINK_NOT_FOLLOWED" | "SYMLINK_UNRESOLVED" | "SPECIAL_FILE_NOT_READ";
    policy: "DETERMINISTIC_PHASE1_EXCLUSION";
}
export interface Phase1Failure {
    code: "GIT_METADATA_UNAVAILABLE" | "INVALID_MANIFEST" | "UNREADABLE_INPUT" | "SCOPE_APPROVAL_MISMATCH" | "TARGET_SNAPSHOT_UNCERTAIN" | "TARGET_MUTATED_DURING_SCAN";
    relativePath?: string;
    message: string;
}
export interface Phase1Unknown {
    code: "NON_GIT_REPOSITORY" | "UNREADABLE_INPUT" | "GIT_METADATA_UNAVAILABLE" | "TARGET_SNAPSHOT_UNCERTAIN" | "UNAVAILABLE_IN_SAFE_READ_ONLY_MODE";
    relativePath?: string;
    message: string;
}
export interface Phase1InventoryEntry {
    relativePath: string;
    classification: Phase1InventoryClassification;
    size: number;
    mode: number;
    included: boolean;
    contentHash?: string;
    uncertainty?: "UNREADABLE";
    provenance: {
        source: "filesystem";
        sourceRef: string;
        observationClass: "OBSERVED";
    };
}
export interface Phase1ManifestObservation {
    relativePath: string;
    manifestKind: "NODE_PACKAGE_JSON" | "LOCKFILE" | "TYPESCRIPT_CONFIG" | "FRONTEND_CONFIG_SIGNAL";
    valid?: boolean;
    name?: string;
    version?: string;
    scriptNames?: string[];
    scriptsObserved: true;
    scriptsExecuted: false;
    dependencyCount?: number;
    devDependencyCount?: number;
    signals?: string[];
}
export interface Phase1GitMetadata {
    available: boolean;
    repositoryType: Phase1RepositoryType;
    branch?: string;
    head?: string;
    cleanStatus?: "CLEAN" | "DIRTY" | "UNKNOWN";
    cleanStatusReason?: "UNAVAILABLE_IN_SAFE_READ_ONLY_MODE";
    trackedFiles: string[];
    recentCommits: Array<{
        hash: string;
        abbreviatedHash: string;
        author: string;
        date: string;
        subject: string;
    }>;
    operations: string[];
}
export interface Phase1TargetWriteAudit {
    targetMutated: boolean;
    beforeFingerprint: string;
    afterFingerprint: string;
    comparisonStatus: "UNCHANGED" | "CHANGED" | "UNCERTAIN";
}
export interface Phase1RedactionReport {
    policyVersion: "phase1-safe-v1";
    secretCandidatePathsExcluded: number;
    secretContentsRead: false;
    secretValuesReturned: false;
    manifestScriptValuesReturned: false;
}
export interface Phase1PermissionAudit {
    previewProducedBeforeScan: true;
    requestedScopes: ["READ_PROJECT", "READ_GIT_METADATA"];
    deniedScopes: ["WRITE_PROJECT", "COMMIT_OR_PUSH", "RUN_APPROVED_PROBE", "NETWORK_OUTBOUND", "READ_SECRET_CANDIDATE"];
    arbitraryExecution: false;
    networkAccess: false;
    targetRepositoryWrites: false;
}
export interface Phase1ScanResult {
    scanId: string;
    fingerprint: string;
    status: Phase1ScanStatus;
    selectedRoot: string;
    selectedRootRealpath: string;
    repositoryType: Phase1RepositoryType;
    startedAt: string;
    completedAt: string;
    scope: Phase1ScanScope;
    permissionPreview: Phase1PermissionPreview;
    permissionAudit: Phase1PermissionAudit;
    git: Phase1GitMetadata;
    manifests: Phase1ManifestObservation[];
    inventory: Phase1InventoryEntry[];
    exclusions: Phase1Exclusion[];
    failures: Phase1Failure[];
    unknowns: Phase1Unknown[];
    redaction: Phase1RedactionReport;
    targetWriteAudit: Phase1TargetWriteAudit;
    adapterCoverageLimits: string[];
}
export declare function createPhase1PermissionPreview(request: Phase1ScanRequest): Promise<Phase1PermissionPreviewResult>;
export declare function runPhase1BaselineScan(request: Phase1ScanRequest): Promise<Phase1ScanResult>;
export declare function phase1ScanErrorCode(error: unknown): string | undefined;
