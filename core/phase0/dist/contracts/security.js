"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_SECURITY_POLICY = void 0;
exports.isLoopbackAddress = isLoopbackAddress;
exports.assertLoopbackOnly = assertLoopbackOnly;
exports.resolvePathWithinAuthorizedRoot = resolvePathWithinAuthorizedRoot;
exports.isPathWithinAuthorizedRoot = isPathWithinAuthorizedRoot;
exports.assertRequestedRootWithinAuthorizedRoot = assertRequestedRootWithinAuthorizedRoot;
exports.createSession = createSession;
exports.validateOrigin = validateOrigin;
exports.validateSession = validateSession;
exports.authorizeRequest = authorizeRequest;
exports.revokeSession = revokeSession;
exports.assertProjectContentIsData = assertProjectContentIsData;
const node_crypto_1 = require("node:crypto");
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
exports.DEFAULT_SECURITY_POLICY = {
    bindAddress: "127.0.0.1",
    allowedOrigins: ["http://127.0.0.1:5173", "http://localhost:5173", "app://maat"],
    sessionTtlMs: 5 * 60 * 1000,
    requireCsrfForStateChanges: true,
};
function isLoopbackAddress(address) {
    return address === "127.0.0.1" || address === "::1" || address === "localhost";
}
function assertLoopbackOnly(policy) {
    if (!isLoopbackAddress(policy.bindAddress))
        throw new Error("local API must bind to loopback by default");
}
function pathImplementation(...values) {
    return values.some((value) => /^[A-Za-z]:[\\/]/.test(value) || value.includes("\\") || value.startsWith("//")) ? node_path_1.default.win32 : node_path_1.default;
}
function normalizeForComparison(implementation, value) {
    const resolved = implementation.resolve(value);
    return implementation === node_path_1.default.win32 ? resolved.replaceAll("/", "\\").toLowerCase() : resolved;
}
function isWithin(implementation, root, candidate) {
    const relative = implementation.relative(root, candidate);
    return relative === "" || (relative !== ".." && !relative.startsWith(`..${implementation.sep}`) && !implementation.isAbsolute(relative));
}
function realpathIfExists(implementation, value) {
    if (!(0, node_fs_1.existsSync)(value))
        return undefined;
    const resolved = node_fs_1.realpathSync.native(value);
    return implementation === node_path_1.default.win32 ? resolved.replaceAll("/", "\\") : resolved;
}
function nearestExistingAncestor(implementation, candidate) {
    let current = candidate;
    for (;;) {
        if ((0, node_fs_1.existsSync)(current))
            return current;
        const parent = implementation.dirname(current);
        if (parent === current)
            return undefined;
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
function resolvePathWithinAuthorizedRoot(authorizedRoot, requestedPath) {
    if (!authorizedRoot || !requestedPath)
        return undefined;
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
    if (!existingAncestor)
        return undefined;
    const realAncestor = realpathIfExists(implementation, existingAncestor);
    if (!realAncestor)
        return undefined;
    const comparableAncestor = normalizeForComparison(implementation, realAncestor);
    if (!isWithin(implementation, comparableRoot, comparableAncestor))
        return undefined;
    const realCandidate = realpathIfExists(implementation, normalizedCandidate);
    if (realCandidate && !isWithin(implementation, comparableRoot, normalizeForComparison(implementation, realCandidate)))
        return undefined;
    return normalizedCandidate;
}
function isPathWithinAuthorizedRoot(authorizedRoot, requestedRoot) {
    return resolvePathWithinAuthorizedRoot(authorizedRoot, requestedRoot) !== undefined;
}
function assertRequestedRootWithinAuthorizedRoot(requestedRoot, authorizedRoot) {
    if (!authorizedRoot)
        throw new Error("authorized project root must be explicitly bound");
    if (!resolvePathWithinAuthorizedRoot(authorizedRoot, requestedRoot))
        throw new Error("requested project root is outside the authorized root");
}
function createSession(scopes, now = 0, policy = exports.DEFAULT_SECURITY_POLICY) {
    assertLoopbackOnly(policy);
    if (scopes.includes("COMMIT_OR_PUSH") || scopes.includes("WRITE_PROJECT")) {
        throw new Error("Phase 0 cannot grant project-write or commit/push scopes");
    }
    return {
        sessionId: `session_${(0, node_crypto_1.randomBytes)(12).toString("hex")}`,
        credential: (0, node_crypto_1.randomBytes)(32).toString("hex"),
        csrfToken: (0, node_crypto_1.randomBytes)(24).toString("hex"),
        scopes: [...new Set(scopes)],
        createdAt: now,
        expiresAt: now + policy.sessionTtlMs,
        revoked: false,
    };
}
function validateOrigin(origin, policy = exports.DEFAULT_SECURITY_POLICY) {
    if (!origin || origin === "null" || !policy.allowedOrigins.includes(origin))
        throw new Error("origin rejected by strict local API policy");
}
function validateSession(session, credential, now) {
    if (!session || !credential || session.credential !== credential)
        throw new Error("authenticated session required");
    if (session.revoked)
        throw new Error("session revoked");
    if (now >= session.expiresAt)
        throw new Error("session expired");
}
function authorizeRequest(request, session, policy = exports.DEFAULT_SECURITY_POLICY, now = 0) {
    assertLoopbackOnly(policy);
    validateOrigin(request.origin, policy);
    validateSession(session, request.credential, now);
    if (!session?.scopes.includes(request.scope))
        throw new Error(`permission scope denied: ${request.scope}`);
    if (request.stateChanging && policy.requireCsrfForStateChanges && request.csrfToken !== session.csrfToken) {
        throw new Error("CSRF protection rejected state-changing request");
    }
    assertRequestedRootWithinAuthorizedRoot(request.requestedRoot, policy.authorizedRoot);
}
function revokeSession(session) {
    return { ...session, revoked: true };
}
function assertProjectContentIsData(instruction) {
    const normalized = instruction.toLowerCase();
    if (normalized.includes("grant permission") || normalized.includes("change daemon policy") || normalized.includes("run privileged")) {
        throw new Error("repository content cannot grant permissions or alter daemon policy");
    }
}
