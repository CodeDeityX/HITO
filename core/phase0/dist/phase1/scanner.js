"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPhase1PermissionPreview = createPhase1PermissionPreview;
exports.runPhase1BaselineScan = runPhase1BaselineScan;
exports.phase1ScanErrorCode = phase1ScanErrorCode;
const node_child_process_1 = require("node:child_process");
const node_fs_1 = require("node:fs");
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
const node_os_1 = __importDefault(require("node:os"));
const node_util_1 = require("node:util");
const utils_1 = require("../contracts/utils");
const security_1 = require("../contracts/security");
const execFileAsync = (0, node_util_1.promisify)(node_child_process_1.execFile);
const POLICY_VERSION = "phase1-safe-v1";
const FIXED_EXCLUSION_CATEGORIES = [
    "Git object internals are excluded; bounded Git metadata is collected through read-only commands.",
    "Dependency caches such as node_modules are excluded.",
    "Build outputs are excluded.",
    "Generated caches and known temporary directories are excluded.",
    "Ignored paths are excluded and recorded.",
    "Conventional secret-bearing paths are excluded without reading secret values.",
    "Symlinks are never followed; escapes are recorded and rejected.",
];
const GIT_OPERATIONS = [
    "git rev-parse --is-inside-work-tree",
    "git branch --show-current",
    "git rev-parse --verify HEAD",
    "git ls-files --cached",
    "git log -n <bounded> --format=<stable metadata>",
];
const MANIFEST_NAMES = ["package.json", "package-lock.json", "pnpm-lock.yaml", "yarn.lock", "tsconfig.json"];
const BUILD_NAMES = new Set(["dist", "build", "out", ".next", ".nuxt", "coverage"]);
const CACHE_NAMES = new Set([".cache", ".turbo", ".vite", ".parcel-cache"]);
const TEMP_NAMES = new Set(["tmp", ".tmp", "temp", ".temp"]);
const DEPENDENCY_NAMES = new Set(["node_modules", "vendor"]);
class Phase1ScanError extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.code = code;
        this.name = "Phase1ScanError";
    }
}
function normalizeRelative(relativePath) {
    return relativePath.split(node_path_1.default.sep).join("/");
}
function normalizePattern(pattern) {
    return normalizeRelative(pattern.trim().replace(/^\/+/, "").replace(/\/+$/, ""));
}
function isManifestName(name) {
    return MANIFEST_NAMES.includes(name) || /^((vite|next|nuxt)\.config|tsconfig\..+)\.(json|[cm]?[jt]s)$/.test(name);
}
function classifyFile(relativePath) {
    const lower = relativePath.toLowerCase();
    if (node_path_1.default.posix.basename(lower) === "package.json" || MANIFEST_NAMES.includes(node_path_1.default.posix.basename(lower)))
        return "MANIFEST";
    if (lower.endsWith(".md") || lower.endsWith(".mdx") || lower.endsWith(".txt"))
        return "DOCUMENTATION";
    if (lower.endsWith(".json") || lower.endsWith(".yaml") || lower.endsWith(".yml") || lower.endsWith(".toml"))
        return "CONFIGURATION";
    if (lower.endsWith(".ts") || lower.endsWith(".tsx") || lower.endsWith(".js") || lower.endsWith(".jsx") || lower.endsWith(".mjs") || lower.endsWith(".cjs"))
        return "SOURCE";
    return "UNKNOWN";
}
function isSecretCandidate(relativePath) {
    const basename = node_path_1.default.posix.basename(relativePath).toLowerCase();
    if (basename === ".env" || basename.startsWith(".env.") || basename === "id_rsa")
        return true;
    if (basename.endsWith(".pem") || basename.endsWith(".key") || basename.endsWith(".p12") || basename.endsWith(".pfx"))
        return true;
    if (/(^|[-_.])(secret|secrets|credential|credentials|password|passwd|token|private)([-_.]|$)/.test(basename))
        return true;
    return relativePath.split("/").some((segment) => ["secrets", "credentials", "private"].includes(segment.toLowerCase()));
}
function globToRegExp(pattern) {
    let expression = "";
    for (const character of pattern) {
        if (character === "*")
            expression += ".*";
        else if (character === "?")
            expression += ".";
        else
            expression += character.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
    return new RegExp(`^${expression}$`);
}
function matchesIgnoreRule(relativePath, rule) {
    const normalized = normalizePattern(rule);
    if (!normalized || normalized.startsWith("#") || normalized.startsWith("!"))
        return false;
    if (normalized.endsWith("/**")) {
        const prefix = normalized.slice(0, -3);
        return relativePath === prefix || relativePath.startsWith(`${prefix}/`);
    }
    if (!normalized.includes("/")) {
        return relativePath.split("/").some((segment) => globToRegExp(normalized).test(segment));
    }
    return globToRegExp(normalized).test(relativePath);
}
function exclusionFor(relativePath, ignoreRules) {
    const segments = relativePath.split("/");
    const basename = segments[segments.length - 1] ?? "";
    if (segments.includes(".git"))
        return "GIT_INTERNALS";
    if (segments.some((segment) => DEPENDENCY_NAMES.has(segment)))
        return "DEPENDENCY_CACHE";
    if (segments.some((segment) => BUILD_NAMES.has(segment)))
        return "BUILD_OUTPUT";
    if (segments.some((segment) => CACHE_NAMES.has(segment)))
        return "GENERATED_CACHE";
    if (segments.some((segment) => TEMP_NAMES.has(segment)))
        return "TEMPORARY_DIRECTORY";
    if (isSecretCandidate(relativePath))
        return "SECRET_CANDIDATE";
    if (ignoreRules.some((rule) => matchesIgnoreRule(relativePath, rule)))
        return "IGNORED_PATH";
    if (basename === ".gitignore")
        return undefined;
    return undefined;
}
function stableScopeFingerprint(scope) {
    return (0, utils_1.sha256Text)((0, utils_1.canonicalize)({
        include: scope.include,
        exclude: scope.exclude,
        followSymlinks: scope.followSymlinks,
        executeCommands: scope.executeCommands,
        networkAccess: scope.networkAccess,
        phase: scope.phase,
        contentHashing: scope.contentHashing,
        ignoreRules: scope.ignoreRules,
        exclusionPolicyVersion: scope.exclusionPolicyVersion,
    }));
}
function stablePreviewFingerprint(preview) {
    return (0, utils_1.sha256Text)((0, utils_1.canonicalize)(preview));
}
async function readIgnoreRules(root) {
    try {
        const text = await promises_1.default.readFile(node_path_1.default.join(root, ".gitignore"), "utf8");
        return text.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length > 0 && !line.startsWith("#") && !line.startsWith("!"));
    }
    catch {
        return [];
    }
}
async function validateRoot(request) {
    if (!request.authorizedRoot)
        throw new Phase1ScanError("AUTHORIZED_ROOT_REQUIRED", "authorized project root must be explicitly bound");
    const resolved = (0, security_1.resolvePathWithinAuthorizedRoot)(request.authorizedRoot, request.requestedRoot);
    if (!resolved)
        throw new Phase1ScanError("ROOT_OUTSIDE_AUTHORIZED_ROOT", "requested project root is outside the authorized root");
    let stat;
    try {
        stat = await promises_1.default.lstat(resolved);
    }
    catch {
        throw new Phase1ScanError("ROOT_NOT_FOUND", "requested project root does not exist");
    }
    if (!stat.isDirectory())
        throw new Phase1ScanError("ROOT_NOT_DIRECTORY", "requested project root is not a directory");
    let realRoot;
    try {
        realRoot = await promises_1.default.realpath(resolved);
    }
    catch {
        throw new Phase1ScanError("ROOT_REALPATH_UNAVAILABLE", "requested project root realpath is unavailable");
    }
    try {
        await promises_1.default.access(realRoot, node_fs_1.constants.R_OK | node_fs_1.constants.X_OK);
    }
    catch {
        throw new Phase1ScanError("ROOT_PERMISSION_DENIED", "requested project root is not readable");
    }
    return { root: resolved, realRoot };
}
async function detectRepositoryType(root) {
    try {
        const gitPath = await promises_1.default.lstat(node_path_1.default.join(root, ".git"));
        if (!gitPath.isDirectory() && !gitPath.isFile())
            return "UNKNOWN";
        return "GIT";
    }
    catch {
        return "NON_GIT";
    }
}
async function rootManifestNames(root) {
    try {
        const entries = await promises_1.default.readdir(root, { withFileTypes: true });
        return entries.map((entry) => entry.name).filter(isManifestName).sort(utils_1.compareUnicodeCodePointKeys);
    }
    catch {
        return [];
    }
}
async function prepareScan(request) {
    const roots = await validateRoot(request);
    const repositoryType = await detectRepositoryType(roots.root);
    const ignoreRules = await readIgnoreRules(roots.root);
    const scope = {
        root: ".",
        include: ["all regular files under the selected root after policy exclusions"],
        exclude: [
            ".git/**",
            "node_modules/**",
            "vendor/**",
            "dist/**",
            "build/**",
            "out/**",
            ".next/**",
            ".nuxt/**",
            "coverage/**",
            ".cache/**",
            ".turbo/**",
            ".vite/**",
            ".parcel-cache/**",
            "tmp/**",
            ".tmp/**",
            "temp/**",
            ".temp/**",
            "secret-bearing conventional paths",
            "symlink targets and escapes",
            ...ignoreRules.map((rule) => `gitignore:${normalizePattern(rule)}`),
        ].sort(utils_1.compareUnicodeCodePointKeys),
        followSymlinks: false,
        executeCommands: false,
        networkAccess: false,
        phase: 1,
        contentHashing: request.contentHashing !== false,
        ignoreRules: [...ignoreRules].sort(utils_1.compareUnicodeCodePointKeys),
        exclusionPolicyVersion: POLICY_VERSION,
    };
    const scopeFingerprint = stableScopeFingerprint(scope);
    const basePreview = {
        repositoryType,
        readableCategories: ["filesystem metadata", "included file bytes when content hashing is enabled", "bounded Git metadata", "basic Node.js manifest metadata"].sort(utils_1.compareUnicodeCodePointKeys),
        excludedCategories: [...FIXED_EXCLUSION_CATEGORIES].sort(utils_1.compareUnicodeCodePointKeys),
        gitMetadataOperations: [...GIT_OPERATIONS],
        manifestFilesEligible: await rootManifestNames(roots.root),
        contentHashing: scope.contentHashing,
        arbitraryExecutionPermitted: false,
        networkAccess: false,
        targetWritePermitted: false,
        scope,
        scopeFingerprint,
    };
    const preview = {
        selectedRoot: roots.root,
        selectedRootRealpath: roots.realRoot,
        outputLocation: request.outputLocation,
        previewFingerprint: stablePreviewFingerprint(basePreview),
        ...basePreview,
    };
    return { root: roots.root, realRoot: roots.realRoot, repositoryType, preview, ignoreRules };
}
async function createPhase1PermissionPreview(request) {
    const prepared = await prepareScan(request);
    return {
        preview: prepared.preview,
        approvedScope: structuredClone(prepared.preview.scope),
        approvedScopeFingerprint: prepared.preview.scopeFingerprint,
    };
}
function recordExclusion(exclusions, relativePath, reason) {
    exclusions.push({ relativePath: normalizeRelative(relativePath), reason, policy: "DETERMINISTIC_PHASE1_EXCLUSION" });
}
function safeStableError(error) {
    if (error instanceof Error && error.name === "Phase1ScanError")
        return error.message;
    return "input could not be read deterministically";
}
async function snapshotTarget(root) {
    const entries = [];
    let uncertain = false;
    async function visit(current, relativeDirectory) {
        let directoryEntries;
        try {
            directoryEntries = await promises_1.default.readdir(current, { withFileTypes: true });
        }
        catch {
            uncertain = true;
            return;
        }
        directoryEntries.sort((left, right) => (0, utils_1.compareUnicodeCodePointKeys)(left.name, right.name));
        for (const directoryEntry of directoryEntries) {
            const relativePath = relativeDirectory ? `${relativeDirectory}/${directoryEntry.name}` : directoryEntry.name;
            const candidate = node_path_1.default.join(current, directoryEntry.name);
            try {
                const stats = await promises_1.default.lstat(candidate);
                const kind = stats.isDirectory() ? "DIRECTORY" : stats.isFile() ? "FILE" : stats.isSymbolicLink() ? "SYMLINK" : "SPECIAL";
                entries.push({ relativePath: normalizeRelative(relativePath), kind, size: stats.size, mode: stats.mode, mtimeMs: stats.mtimeMs });
                if (kind === "DIRECTORY")
                    await visit(candidate, relativePath);
            }
            catch {
                uncertain = true;
            }
        }
    }
    await visit(root, "");
    entries.sort((left, right) => (0, utils_1.compareUnicodeCodePointKeys)(left.relativePath, right.relativePath));
    return { entries, uncertain };
}
function snapshotFingerprint(snapshot) {
    return (0, utils_1.sha256Text)((0, utils_1.canonicalize)(snapshot.entries));
}
function safeGitEnvironment() {
    const nullConfig = process.platform === "win32" ? "NUL" : "/dev/null";
    const fixedPath = [node_path_1.default.dirname(process.execPath), "/usr/local/bin", "/usr/bin", "/bin"].join(node_path_1.default.delimiter);
    const safeHome = node_path_1.default.join(node_os_1.default.tmpdir(), "maat-phase1-no-user-home");
    return {
        PATH: fixedPath,
        HOME: safeHome,
        XDG_CONFIG_HOME: safeHome,
        GIT_CONFIG_NOSYSTEM: "1",
        GIT_CONFIG_SYSTEM: nullConfig,
        GIT_CONFIG_GLOBAL: nullConfig,
        GIT_ATTR_NOSYSTEM: "1",
        GIT_OPTIONAL_LOCKS: "0",
        GIT_TERMINAL_PROMPT: "0",
        GIT_PAGER: "cat",
        GIT_EDITOR: "true",
        GIT_SEQUENCE_EDITOR: "true",
        GIT_SSH_COMMAND: "false",
        GIT_EXTERNAL_DIFF: "false",
        LC_ALL: "C",
        LANG: "C",
    };
}
async function runGitCommand(root, args) {
    const result = await execFileAsync("git", ["--no-pager", "-c", "core.fsmonitor=false", "-C", root, ...args], {
        env: safeGitEnvironment(),
        timeout: 5000,
        maxBuffer: 1024 * 1024,
        windowsHide: true,
    });
    return String(result.stdout).trim();
}
function redactGitPath(relativePath) {
    return isSecretCandidate(relativePath) ? "[REDACTED_SECRET_PATH]" : normalizeRelative(relativePath);
}
async function collectGitMetadata(root, repositoryType, maxRecentCommits, failures, unknowns) {
    if (repositoryType === "NON_GIT") {
        unknowns.push({ code: "NON_GIT_REPOSITORY", message: "selected root is not a detectable Git repository" });
        return { available: false, repositoryType, trackedFiles: [], recentCommits: [], operations: [...GIT_OPERATIONS] };
    }
    if (repositoryType === "UNKNOWN") {
        unknowns.push({ code: "GIT_METADATA_UNAVAILABLE", message: "Git marker exists but repository type could not be established" });
        return { available: false, repositoryType, trackedFiles: [], recentCommits: [], operations: [...GIT_OPERATIONS] };
    }
    try {
        const inside = await runGitCommand(root, ["rev-parse", "--is-inside-work-tree"]);
        if (inside !== "true")
            throw new Error("not a work tree");
        const branch = await runGitCommand(root, ["branch", "--show-current"]);
        const head = await runGitCommand(root, ["rev-parse", "--verify", "HEAD"]).catch(() => "");
        const tracked = await runGitCommand(root, ["ls-files", "--cached"]);
        const log = await runGitCommand(root, ["log", "-n", String(Math.max(0, Math.min(maxRecentCommits, 20))), "--format=%H%x09%h%x09%an%x09%ad%x09%s", "--date=iso-strict"]).catch(() => "");
        unknowns.push({ code: "UNAVAILABLE_IN_SAFE_READ_ONLY_MODE", message: "worktree dirty/clean status is unavailable without unsafe worktree-processing commands" });
        const recentCommits = log.split("\n").filter(Boolean).map((line) => {
            const [hash = "", abbreviatedHash = "", author = "", date = "", ...subjectParts] = line.split("\t");
            return { hash, abbreviatedHash, author, date, subject: subjectParts.join("\t") };
        });
        return {
            available: true,
            repositoryType: "GIT",
            branch: branch || undefined,
            head: head || undefined,
            cleanStatus: "UNKNOWN",
            cleanStatusReason: "UNAVAILABLE_IN_SAFE_READ_ONLY_MODE",
            trackedFiles: tracked.split("\n").filter(Boolean).map(redactGitPath).sort(utils_1.compareUnicodeCodePointKeys),
            recentCommits,
            operations: [...GIT_OPERATIONS],
        };
    }
    catch {
        failures.push({ code: "GIT_METADATA_UNAVAILABLE", message: "bounded read-only Git metadata collection failed" });
        unknowns.push({ code: "GIT_METADATA_UNAVAILABLE", message: "Git metadata is indeterminate for this scan" });
        return { available: false, repositoryType, trackedFiles: [], recentCommits: [], operations: [...GIT_OPERATIONS] };
    }
}
function manifestFromPackage(relativePath, parsed) {
    const scripts = parsed.scripts && typeof parsed.scripts === "object" && !Array.isArray(parsed.scripts) ? parsed.scripts : {};
    const dependencies = parsed.dependencies && typeof parsed.dependencies === "object" && !Array.isArray(parsed.dependencies) ? parsed.dependencies : {};
    const devDependencies = parsed.devDependencies && typeof parsed.devDependencies === "object" && !Array.isArray(parsed.devDependencies) ? parsed.devDependencies : {};
    const signals = ["node-package-manifest"];
    if (typeof parsed.type === "string")
        signals.push(`module-type:${parsed.type}`);
    if (parsed.workspaces !== undefined)
        signals.push("workspaces");
    if (parsed.dependencies)
        signals.push("dependencies");
    if (parsed.devDependencies)
        signals.push("devDependencies");
    return {
        relativePath,
        manifestKind: "NODE_PACKAGE_JSON",
        valid: true,
        name: typeof parsed.name === "string" ? parsed.name : undefined,
        version: typeof parsed.version === "string" ? parsed.version : undefined,
        scriptNames: Object.keys(scripts).sort(utils_1.compareUnicodeCodePointKeys),
        scriptsObserved: true,
        scriptsExecuted: false,
        dependencyCount: Object.keys(dependencies).length,
        devDependencyCount: Object.keys(devDependencies).length,
        signals: signals.sort(utils_1.compareUnicodeCodePointKeys),
    };
}
function manifestObservationFor(relativePath) {
    const basename = node_path_1.default.posix.basename(relativePath);
    if (basename === "package.json")
        return undefined;
    if (basename === "package-lock.json" || basename === "pnpm-lock.yaml" || basename === "yarn.lock")
        return { relativePath, manifestKind: "LOCKFILE", scriptsObserved: true, scriptsExecuted: false };
    if (basename === "tsconfig.json" || basename.startsWith("tsconfig."))
        return { relativePath, manifestKind: "TYPESCRIPT_CONFIG", scriptsObserved: true, scriptsExecuted: false };
    if (/^(vite|next|nuxt)\.config\./.test(basename))
        return { relativePath, manifestKind: "FRONTEND_CONFIG_SIGNAL", scriptsObserved: true, scriptsExecuted: false, signals: [basename.split(".")[0]] };
    return undefined;
}
async function walkInventory(root, relativeDirectory, scope, ignoreRules, request, inventory, exclusions, failures, manifests) {
    let entries;
    try {
        entries = await promises_1.default.readdir(node_path_1.default.join(root, relativeDirectory), { withFileTypes: true });
    }
    catch {
        failures.push({ code: "UNREADABLE_INPUT", relativePath: relativeDirectory || ".", message: "directory could not be read" });
        return;
    }
    entries.sort((left, right) => (0, utils_1.compareUnicodeCodePointKeys)(left.name, right.name));
    for (const entry of entries) {
        const relativePath = normalizeRelative(relativeDirectory ? `${relativeDirectory}/${entry.name}` : entry.name);
        const absolutePath = node_path_1.default.join(root, relativePath);
        const within = (0, security_1.resolvePathWithinAuthorizedRoot)(root, absolutePath);
        if (!within) {
            recordExclusion(exclusions, relativePath, "SYMLINK_ESCAPES_ROOT");
            continue;
        }
        if (entry.isSymbolicLink()) {
            try {
                const real = await promises_1.default.realpath(absolutePath);
                if (!(0, security_1.resolvePathWithinAuthorizedRoot)(root, real))
                    recordExclusion(exclusions, relativePath, "SYMLINK_ESCAPES_ROOT");
                else
                    recordExclusion(exclusions, relativePath, "SYMLINK_NOT_FOLLOWED");
            }
            catch {
                recordExclusion(exclusions, relativePath, "SYMLINK_UNRESOLVED");
            }
            continue;
        }
        const exclusion = exclusionFor(relativePath, ignoreRules);
        if (exclusion) {
            recordExclusion(exclusions, relativePath, exclusion);
            continue;
        }
        if (entry.isDirectory()) {
            await walkInventory(root, relativePath, scope, ignoreRules, request, inventory, exclusions, failures, manifests);
            continue;
        }
        if (!entry.isFile()) {
            recordExclusion(exclusions, relativePath, "SPECIAL_FILE_NOT_READ");
            continue;
        }
        let stats;
        try {
            stats = await promises_1.default.stat(absolutePath);
        }
        catch {
            inventory.push({ relativePath, classification: "UNKNOWN", size: 0, mode: 0, included: false, uncertainty: "UNREADABLE", provenance: { source: "filesystem", sourceRef: relativePath, observationClass: "OBSERVED" } });
            failures.push({ code: "UNREADABLE_INPUT", relativePath, message: "file metadata could not be read" });
            continue;
        }
        let bytes;
        try {
            await request.onScanRead?.(relativePath);
            bytes = await promises_1.default.readFile(absolutePath);
        }
        catch {
            inventory.push({ relativePath, classification: "UNKNOWN", size: stats.size, mode: stats.mode, included: false, uncertainty: "UNREADABLE", provenance: { source: "filesystem", sourceRef: relativePath, observationClass: "OBSERVED" } });
            failures.push({ code: "UNREADABLE_INPUT", relativePath, message: "included file could not be read" });
            continue;
        }
        const entryResult = {
            relativePath,
            classification: classifyFile(relativePath),
            size: stats.size,
            mode: stats.mode,
            included: true,
            contentHash: scope.contentHashing ? (0, utils_1.sha256Bytes)(bytes) : undefined,
            provenance: { source: "filesystem", sourceRef: relativePath, observationClass: "OBSERVED" },
        };
        inventory.push(entryResult);
        if (node_path_1.default.posix.basename(relativePath) === "package.json") {
            try {
                const parsed = JSON.parse(bytes.toString("utf8"));
                if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
                    throw new Error("manifest root is not an object");
                manifests.push(manifestFromPackage(relativePath, parsed));
            }
            catch {
                manifests.push({ relativePath, manifestKind: "NODE_PACKAGE_JSON", valid: false, scriptsObserved: true, scriptsExecuted: false });
                failures.push({ code: "INVALID_MANIFEST", relativePath, message: "package manifest is invalid JSON and was not executed or trusted" });
            }
        }
        else {
            const observation = manifestObservationFor(relativePath);
            if (observation)
                manifests.push(observation);
        }
    }
}
function normalizeForFingerprint(result) {
    return {
        repositoryType: result.repositoryType,
        scope: result.scope,
        git: result.git,
        manifests: result.manifests,
        inventory: result.inventory,
        exclusions: result.exclusions,
        failures: result.failures,
        unknowns: result.unknowns,
    };
}
async function runPhase1BaselineScan(request) {
    const prepared = await prepareScan(request);
    if (request.approvedScopeFingerprint && request.approvedScopeFingerprint !== prepared.preview.scopeFingerprint) {
        throw new Phase1ScanError("SCOPE_APPROVAL_MISMATCH", "approved scan scope fingerprint does not match the deterministic preview");
    }
    if (request.approvedScope && (0, utils_1.canonicalize)(request.approvedScope) !== (0, utils_1.canonicalize)(prepared.preview.scope)) {
        throw new Phase1ScanError("SCOPE_APPROVAL_MISMATCH", "approved scan scope differs from the deterministic permission preview");
    }
    await request.onPermissionPreview?.(prepared.preview);
    const startedAt = new Date().toISOString();
    const before = await snapshotTarget(prepared.root);
    const inventory = [];
    const exclusions = [];
    const failures = [];
    const unknowns = [];
    const manifests = [];
    await walkInventory(prepared.root, "", prepared.preview.scope, prepared.ignoreRules, request, inventory, exclusions, failures, manifests);
    const git = await collectGitMetadata(prepared.root, prepared.repositoryType, request.maxRecentCommits ?? 5, failures, unknowns);
    const after = await snapshotTarget(prepared.root);
    if (before.uncertain || after.uncertain)
        failures.push({ code: "TARGET_SNAPSHOT_UNCERTAIN", message: "target write comparison is indeterminate because metadata could not be read" });
    const beforeFingerprint = snapshotFingerprint(before);
    const afterFingerprint = snapshotFingerprint(after);
    const targetWriteAudit = {
        targetMutated: beforeFingerprint !== afterFingerprint,
        beforeFingerprint,
        afterFingerprint,
        comparisonStatus: before.uncertain || after.uncertain ? "UNCERTAIN" : beforeFingerprint === afterFingerprint ? "UNCHANGED" : "CHANGED",
    };
    if (targetWriteAudit.targetMutated || targetWriteAudit.comparisonStatus === "CHANGED") {
        failures.push({ code: "TARGET_MUTATED_DURING_SCAN", message: "read-only invariant violated: attached target changed during scan" });
    }
    const normalized = normalizeForFingerprint({
        repositoryType: prepared.repositoryType,
        scope: prepared.preview.scope,
        git,
        manifests: manifests.sort((left, right) => (0, utils_1.compareUnicodeCodePointKeys)(left.relativePath, right.relativePath)),
        inventory: inventory.sort((left, right) => (0, utils_1.compareUnicodeCodePointKeys)(left.relativePath, right.relativePath)),
        exclusions: exclusions.sort((left, right) => (0, utils_1.compareUnicodeCodePointKeys)(left.relativePath, right.relativePath)),
        failures: failures.sort((left, right) => (0, utils_1.compareUnicodeCodePointKeys)(`${left.code}:${left.relativePath ?? ""}`, `${right.code}:${right.relativePath ?? ""}`)),
        unknowns: unknowns.sort((left, right) => (0, utils_1.compareUnicodeCodePointKeys)(`${left.code}:${left.relativePath ?? ""}`, `${right.code}:${right.relativePath ?? ""}`)),
    });
    const fingerprint = (0, utils_1.sha256Text)((0, utils_1.canonicalize)(normalized));
    const completedAt = new Date().toISOString();
    return {
        scanId: `scan_phase1_${fingerprint.slice(0, 24)}`,
        fingerprint,
        status: targetWriteAudit.targetMutated || targetWriteAudit.comparisonStatus === "CHANGED" ? "FAILED" : failures.length > 0 ? "INDETERMINATE" : "COMPLETED",
        selectedRoot: prepared.root,
        selectedRootRealpath: prepared.realRoot,
        repositoryType: prepared.repositoryType,
        startedAt,
        completedAt,
        scope: prepared.preview.scope,
        permissionPreview: prepared.preview,
        permissionAudit: {
            previewProducedBeforeScan: true,
            requestedScopes: ["READ_PROJECT", "READ_GIT_METADATA"],
            deniedScopes: ["WRITE_PROJECT", "COMMIT_OR_PUSH", "RUN_APPROVED_PROBE", "NETWORK_OUTBOUND", "READ_SECRET_CANDIDATE"],
            arbitraryExecution: false,
            networkAccess: false,
            targetRepositoryWrites: false,
        },
        git,
        manifests,
        inventory,
        exclusions,
        failures,
        unknowns,
        redaction: {
            policyVersion: POLICY_VERSION,
            secretCandidatePathsExcluded: exclusions.filter((exclusion) => exclusion.reason === "SECRET_CANDIDATE").length,
            secretContentsRead: false,
            secretValuesReturned: false,
            manifestScriptValuesReturned: false,
        },
        targetWriteAudit,
        adapterCoverageLimits: [
            "Phase 1 produces inventory and observations only; it does not reconstruct canonical capabilities or subsystems.",
            "JavaScript/TypeScript/Node.js support is limited to basic package-manifest and directly observable ecosystem signals.",
            "Runtime behavior, build status, test status, and semantic ownership are not inferred from this scan.",
        ],
    };
}
function phase1ScanErrorCode(error) {
    return error instanceof Phase1ScanError ? error.code : undefined;
}
