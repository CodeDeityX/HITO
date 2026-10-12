import type { PermissionScope } from "./model";
export interface SecurityPolicy {
    bindAddress: string;
    allowedOrigins: string[];
    sessionTtlMs: number;
    requireCsrfForStateChanges: boolean;
    authorizedRoot?: string;
}
export interface Session {
    sessionId: string;
    credential: string;
    csrfToken: string;
    scopes: PermissionScope[];
    createdAt: number;
    expiresAt: number;
    revoked: boolean;
}
export interface ApiRequest {
    origin: string;
    credential?: string;
    csrfToken?: string;
    scope: PermissionScope;
    stateChanging: boolean;
    requestedRoot: string;
}
export declare const DEFAULT_SECURITY_POLICY: SecurityPolicy;
export declare function isLoopbackAddress(address: string): boolean;
export declare function assertLoopbackOnly(policy: SecurityPolicy): void;
/**
 * Resolve a candidate beneath a bound root while checking the realpath of the
 * root and nearest existing candidate ancestor. This prevents an escaping
 * symlink from being hidden behind a nonexistent descendant. When a root does
 * not exist yet, lexical containment is the only deterministic fact available;
 * callers performing actual project access should bind an existing root.
 */
export declare function resolvePathWithinAuthorizedRoot(authorizedRoot: string, requestedPath: string): string | undefined;
export declare function isPathWithinAuthorizedRoot(authorizedRoot: string, requestedRoot: string): boolean;
export declare function assertRequestedRootWithinAuthorizedRoot(requestedRoot: string, authorizedRoot: string | undefined): void;
export declare function createSession(scopes: PermissionScope[], now?: number, policy?: SecurityPolicy): Session;
export declare function validateOrigin(origin: string | undefined, policy?: SecurityPolicy): void;
export declare function validateSession(session: Session | undefined, credential: string | undefined, now: number): void;
export declare function authorizeRequest(request: ApiRequest, session: Session | undefined, policy?: SecurityPolicy, now?: number): void;
export declare function revokeSession(session: Session): Session;
export declare function assertProjectContentIsData(instruction: string): void;
