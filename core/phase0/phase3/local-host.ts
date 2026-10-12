import { createReadStream } from "node:fs";
import { access, stat } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { basename, extname, normalize, resolve, sep } from "node:path";
import { readCanonicalRevisionValidated } from "../contracts";
import { derivePhase3ProjectionBundle } from "./projection";

export interface LocalHostOptions {
  projectRoot: string;
  uiRoot?: string;
  port?: number;
  host?: "127.0.0.1";
}

const LOCAL_ASSET_ROOT = resolve(__dirname, "local-assets");
const MIME_TYPES: Record<string, string> = {
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

function writeJson(response: ServerResponse, statusCode: number, value: unknown): void {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-MAAT-Authority": "DERIVED_READ_ONLY",
  });
  response.end(`${JSON.stringify(value)}\n`);
}

function writeStaticError(response: ServerResponse, statusCode: number, message: string): void {
  response.writeHead(statusCode, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" });
  response.end(`${message}\n`);
}

function localError(error: unknown): { error: "CANONICAL_STATE_UNAVAILABLE"; detail: string } {
  return { error: "CANONICAL_STATE_UNAVAILABLE", detail: error instanceof Error ? error.message : "unknown canonical read failure" };
}

async function fileInside(root: string, requestedPath: string): Promise<string | undefined> {
  const candidate = resolve(root, normalize(requestedPath.replace(/^\/+/, "")));
  const resolvedRoot = resolve(root);
  if (!(candidate === resolvedRoot || candidate.startsWith(`${resolvedRoot}${sep}`))) return undefined;
  return stat(candidate).then((entry) => entry.isFile() ? candidate : undefined).catch(() => undefined);
}

async function streamFile(filePath: string, response: ServerResponse): Promise<void> {
  const exists = await access(filePath).then(() => true).catch(() => false);
  if (!exists) {
    writeStaticError(response, 404, "local static asset not found");
    return;
  }
  response.writeHead(200, {
    "Content-Type": MIME_TYPES[extname(filePath).toLowerCase()] ?? "application/octet-stream",
    "Cache-Control": "no-store",
  });
  createReadStream(filePath).pipe(response);
}

async function serveUi(uiRoot: string, requestPath: string, response: ServerResponse): Promise<void> {
  const cleanPath = requestPath === "/" ? "index.html" : requestPath.replace(/^\/+/, "");
  const direct = await fileInside(uiRoot, cleanPath);
  if (direct) {
    await streamFile(direct, response);
    return;
  }
  if (!extname(cleanPath)) {
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

export function createPhase3LocalHost(options: LocalHostOptions) {
  const host = options.host ?? "127.0.0.1";
  const port = options.port ?? 4317;
  const handler = async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
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
        const snapshot = await readCanonicalRevisionValidated(options.projectRoot);
        writeJson(response, 200, derivePhase3ProjectionBundle(snapshot.model));
      } catch (error) {
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
    writeJson(response, 404, { error: "LOCAL_UI_NOT_CONFIGURED", requested: basename(url.pathname) });
  };
  return {
    host,
    port,
    server: createServer((request, response) => { void handler(request, response); }),
  };
}

function readArgument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main(): Promise<void> {
  const projectRoot = readArgument("--project-root") ?? process.cwd();
  const uiRoot = readArgument("--ui-root");
  const port = Number(readArgument("--port") ?? "4317");
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("--port must be an integer between 1024 and 65535");
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
