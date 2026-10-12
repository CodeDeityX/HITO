"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPhase3LocalHost = createPhase3LocalHost;
const node_fs_1 = require("node:fs");
const promises_1 = require("node:fs/promises");
const node_http_1 = require("node:http");
const node_path_1 = require("node:path");
const contracts_1 = require("../contracts");
const projection_1 = require("./projection");
const LOCAL_ASSET_ROOT = (0, node_path_1.resolve)(__dirname, "local-assets");
const MIME_TYPES = {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".ico": "image/x-icon",
    ".jpeg": "image/jpeg",
    ".jpg": "image/jpeg",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".webp": "image/webp",
};
function writeJson(response, statusCode, value) {
    response.writeHead(statusCode, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "X-MAAT-Authority": "DERIVED_READ_ONLY",
    });
    response.end(`${JSON.stringify(value)}\n`);
}
function writeStaticError(response, statusCode, message) {
    response.writeHead(statusCode, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" });
    response.end(`${message}\n`);
}
function localError(error) {
    return { error: "CANONICAL_STATE_UNAVAILABLE", detail: error instanceof Error ? error.message : "unknown canonical read failure" };
}
async function fileInside(root, requestedPath) {
    const candidate = (0, node_path_1.resolve)(root, (0, node_path_1.normalize)(requestedPath.replace(/^\/+/, "")));
    const resolvedRoot = (0, node_path_1.resolve)(root);
    if (!(candidate === resolvedRoot || candidate.startsWith(`${resolvedRoot}${node_path_1.sep}`)))
        return undefined;
    return (0, promises_1.stat)(candidate).then((entry) => entry.isFile() ? candidate : undefined).catch(() => undefined);
}
async function streamFile(filePath, response) {
    const exists = await (0, promises_1.access)(filePath).then(() => true).catch(() => false);
    if (!exists) {
        writeStaticError(response, 404, "local static asset not found");
        return;
    }
    response.writeHead(200, {
        "Content-Type": MIME_TYPES[(0, node_path_1.extname)(filePath).toLowerCase()] ?? "application/octet-stream",
        "Cache-Control": "no-store",
    });
    (0, node_fs_1.createReadStream)(filePath).pipe(response);
}
async function serveUi(uiRoot, requestPath, response) {
    const cleanPath = requestPath === "/" ? "index.html" : requestPath.replace(/^\/+/, "");
    const direct = await fileInside(uiRoot, cleanPath);
    if (direct) {
        await streamFile(direct, response);
        return;
    }
    if (!(0, node_path_1.extname)(cleanPath)) {
        const index = await fileInside(uiRoot, "index.html");
        if (index) {
            await streamFile(index, response);
            return;
        }
        writeStaticError(response, 404, "local UI build not found");
        return;
    }
    writeStaticError(response, 404, "local static asset not found");
}
function createPhase3LocalHost(options) {
    const host = options.host ?? "127.0.0.1";
    const port = options.port ?? 4317;
    const handler = async (request, response) => {
        const url = new URL(request.url ?? "/", `http://${host}:${port}`);
        if (request.method !== "GET") {
            response.writeHead(405, { Allow: "GET", "Content-Type": "text/plain; charset=utf-8" });
            response.end("read-only local host\n");
            return;
        }
        if (url.pathname === "/api/health") {
            writeJson(response, 200, { status: "LOCAL_READ_ONLY", host, port, providerModelNetworkCalls: 0 });
            return;
        }
        if (url.pathname === "/api/snapshot") {
            try {
                const snapshot = await (0, contracts_1.readCanonicalRevisionValidated)(options.projectRoot);
                writeJson(response, 200, (0, projection_1.derivePhase3ProjectionBundle)(snapshot.model));
            }
            catch (error) {
                writeJson(response, 503, localError(error));
            }
            return;
        }
        if (url.pathname.startsWith("/_maat-assets/")) {
            const asset = await fileInside(LOCAL_ASSET_ROOT, url.pathname.slice("/_maat-assets/".length));
            if (!asset) {
                writeStaticError(response, 404, "local static asset not found");
                return;
            }
            await streamFile(asset, response);
            return;
        }
        if (options.uiRoot) {
            await serveUi(options.uiRoot, url.pathname, response);
            return;
        }
        writeJson(response, 404, { error: "LOCAL_UI_NOT_CONFIGURED", requested: (0, node_path_1.basename)(url.pathname) });
    };
    return {
        host,
        port,
        server: (0, node_http_1.createServer)((request, response) => { void handler(request, response); }),
    };
}
function readArgument(name) {
    const index = process.argv.indexOf(name);
    return index >= 0 ? process.argv[index + 1] : undefined;
}
async function main() {
    const projectRoot = readArgument("--project-root") ?? process.cwd();
    const uiRoot = readArgument("--ui-root");
    const port = Number(readArgument("--port") ?? "4317");
    if (!Number.isInteger(port) || port < 1024 || port > 65535)
        throw new Error("--port must be an integer between 1024 and 65535");
    const localHost = createPhase3LocalHost({ projectRoot, uiRoot, port });
    localHost.server.listen(localHost.port, localHost.host, () => {
        process.stdout.write(`MAAT Phase 3 local read-only host: http://${localHost.host}:${localHost.port}/\n`);
    });
}
if (require.main === module) {
    main().catch((error) => {
        process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
        process.exitCode = 1;
    });
}
