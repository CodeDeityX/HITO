import { randomBytes } from "node:crypto";
import { existsSync, realpathSync } from "node:fs";
import path from "node:path";
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

export const DEFAULT_SECURITY_POLICY: SecurityPolicy = {
  bindAddress: "127.0.0.1",
  allowedOrigins: ["http://127.0.0.1:5173", "http://localhost:5173", "app://maat"],
  sessionTtlMs: 5 * 60 * 1000,
  requireCsrfForStateChanges: true,
};

export function isLoopbackAddress(address: string): boolean {
  return address === "127.0.0.1" || address === "::1" || address === "localhost";
}

export function assertLoopbackOnly(policy: SecurityPolicy): void {
  if (!isLoopbackAddress(policy.bindAddress)) throw new Error("local API must bind to loopback by default");
}

function pathImplementation(...values: string[]): typeof path | typeof path.win32 {
  return values.some((value) => /^[A-Za-z]:[\\/]/.test(value) || value.includes("\\") || value.startsWith("//")) ? path.win32 : path;
}

function normalizeForComparison(implementation: typeof path | typeof path.win32, value: string): string {
  const resolved = implementation.resolve(value);
  return implementation === path.win32 ? resolved.replaceAll("/", "\\").toLowerCase() : resolved;
}

function isWithin(implementation: typeof path | typeof path.win32, root: string, candidate: string): boolean {
  const relative = implementation.relative(root, candidate);
  return relative === "" || (relative !== ".." && !relative.startsWith(`..${implementation.sep}`) && !implementation.isAbsolute(relative));
}

function realpathIfExists(implementation: typeof path | typeof path.win32, value: string): string | undefined {
  if (!existsSync(value)) return undefined;
  const resolved = realpathSync.native(value);
  return implementation === path.win32 ? resolved.replaceAll("/", "\\") : resolved;
}

function nearestExistingAncestor(implementation: typeof path | typeof path.win32, candidate: string): string | undefined {
  let current = candidate;
  for (;;) {
    if (existsSync(current)) return current;
    const parent = implementation.dirname(current);
    if (parent === current) return undefined;
    current = parent;
  }
}

/**
 * Resolve a candidate beneath a bound root while checking the realpath of the
 * root and nearest existing candidate ancestor. This prevents an escaping
 * symlink from being hidden behind a nonexistent descendant. When a root does
 * not exist yet, lexical containment is the only deterministic fact available;
 * callers performing actual project access should bind an existing root.
 */
export function resolvePathWithinAuthorizedRoot(authorizedRoot: string, requestedPath: string): string | undefined {
  if (!authorizedRoot || !requestedPath) return undefined;
  const implementation = pathImplementation(authorizedRoot, requestedPath);
  const normalizedRoot = implementation.resolve(authorizedRoot);
  const normalizedCandidate = implementation.resolve(normalizedRoot, requestedPath);
  const realRoot = realpathIfExists(implementation, normalizedRoot);
  if (!realRoot) {
    const lexicalRoot = normalizeForComparison(implementation, normalizedRoot);
    const lexicalCandidate = normalizeForComparison(implementation, normalizedCandidate);
    return isWithin(implementation, lexicalRoot, lexicalCandidate) ? normalizedCandidate : undefined;
  }

  const comparableRoot = normalizeForComparison(implementation, realRoot);
  const existingAncestor = nearestExistingAncestor(implementation, normalizedCandidate);
  if (!existingAncestor) return undefined;
  const realAncestor = realpathIfExists(implementation, existingAncestor);
  if (!realAncestor) return undefined;
  const comparableAncestor = normalizeForComparison(implementation, realAncestor);
  if (!isWithin(implementation, comparableRoot, comparableAncestor)) return undefined;

  const realCandidate = realpathIfExists(implementation, normalizedCandidate);
  if (realCandidate && !isWithin(implementation, comparableRoot, normalizeForComparison(implementation, realCandidate))) return undefined;
  return normalizedCandidate;
}

export function isPathWithinAuthorizedRoot(authorizedRoot: string, requestedRoot: string): boolean {
  return resolvePathWithinAuthorizedRoot(authorizedRoot, requestedRoot) !== undefined;
}

export function assertRequestedRootWithinAuthorizedRoot(requestedRoot: string, authorizedRoot: string | undefined): void {
  if (!authorizedRoot) throw new Error("authorized project root must be explicitly bound");
  if (!resolvePathWithinAuthorizedRoot(authorizedRoot, requestedRoot)) throw new Error("requested project root is outside the authorized root");
}

export function createSession(scopes: PermissionScope[], now = 0, policy: SecurityPolicy = DEFAULT_SECURITY_POLICY): Session {
  assertLoopbackOnly(policy);
  if (scopes.includes("COMMIT_OR_PUSH") || scopes.includes("WRITE_PROJECT")) {
    throw new Error("Phase 0 cannot grant project-write or commit/push scopes");
  }
  return {
    sessionId: `session_${randomBytes(12).toString("hex")}`,
    credential: randomBytes(32).toString("hex"),
    csrfToken: randomBytes(24).toString("hex"),
    scopes: [...new Set(scopes)],
    createdAt: now,
    expiresAt: now + policy.sessionTtlMs,
    revoked: false,
  };
}

export function validateOrigin(origin: string | undefined, policy: SecurityPolicy = DEFAULT_SECURITY_POLICY): void {
  if (!origin || origin === "null" || !policy.allowedOrigins.includes(origin)) throw new Error("origin rejected by strict local API policy");
}

export function validateSession(session: Session | undefined, credential: string | undefined, now: number): void {
  if (!session || !credential || session.credential !== credential) throw new Error("authenticated session required");
  if (session.revoked) throw new Error("session revoked");
  if (now >= session.expiresAt) throw new Error("session expired");
}

export function authorizeRequest(request: ApiRequest, session: Session | undefined, policy: SecurityPolicy = DEFAULT_SECURITY_POLICY, now = 0): void {
  assertLoopbackOnly(policy);
  validateOrigin(request.origin, policy);
  validateSession(session, request.credential, now);
  if (!session?.scopes.includes(request.scope)) throw new Error(`permission scope denied: ${request.scope}`);
  if (request.stateChanging && policy.requireCsrfForStateChanges && request.csrfToken !== session.csrfToken) {
    throw new Error("CSRF protection rejected state-changing request");
  }
  assertRequestedRootWithinAuthorizedRoot(request.requestedRoot, policy.authorizedRoot);
}

export function revokeSession(session: Session): Session {
  return { ...session, revoked: true };
}

export function assertProjectContentIsData(instruction: string): void {
  const normalized = instruction.toLowerCase();
  if (normalized.includes("grant permission") || normalized.includes("change daemon policy") || normalized.includes("run privileged")) {
    throw new Error("repository content cannot grant permissions or alter daemon policy");
  }
}
