"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.escapeHtml = escapeHtml;
exports.buildMriPanelHtml = buildMriPanelHtml;
exports.buildMermaidPanelHtml = buildMermaidPanelHtml;
function escapeHtml(value) {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}
function json(value) {
    return JSON.stringify(value, null, 2);
}
function shell(title, body, cspSource) {
    const csp = `default-src 'none'; img-src ${cspSource} data:; style-src ${cspSource} 'unsafe-inline';`;
    return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${escapeHtml(csp)}"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title><style>
body{font-family:var(--vscode-font-family);color:var(--vscode-foreground);background:var(--vscode-editor-background);padding:20px;line-height:1.45}h1{font-size:1.35rem}h2{font-size:1rem;margin-top:24px;border-bottom:1px solid var(--vscode-panel-border);padding-bottom:6px}.boundary{border-left:4px solid var(--vscode-editorWarning-foreground);padding:8px 12px;background:var(--vscode-textBlockQuote-background)}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:var(--vscode-textCodeBlock-background);padding:12px;border:1px solid var(--vscode-panel-border)}code{font-family:var(--vscode-editor-font-family)}.identity{font-size:.85rem;color:var(--vscode-descriptionForeground)}
</style></head><body>${body}</body></html>`;
}
function buildMriPanelHtml(ide, cspSource) {
    const mri = ide.surfaces.mri.value;
    return shell("HITO Engineering MRI", `<h1>Engineering MRI</h1>
<p class="boundary">Derived, read-only, noncanonical projection. This VS Code wrapper does not infer missing edges, truth, or authority.</p>
<p class="identity">MRI identity: ${escapeHtml(ide.source.phase3MriIdentity)}<br>Semantic verdict identity: ${escapeHtml(ide.source.semanticVerdictIdentity)}</p>
<h2>Exact qualified MRI projection</h2><pre><code>${escapeHtml(json(mri))}</code></pre>`, cspSource);
}
function buildMermaidPanelHtml(ide, cspSource) {
    const mermaid = ide.surfaces.mermaid.value;
    return shell("HITO Map", `<h1>HITO Map</h1>
<p class="boundary">Exact deterministic Mermaid source from the qualified host. Scripts, raw HTML, remote rendering, and semantic layout inference are disabled.</p>
<p class="identity">Diagram identity: ${escapeHtml(mermaid.diagramIdentity)}<br>MRI identity: ${escapeHtml(mermaid.sourceMriIdentity)}</p>
<h2>Mermaid</h2><pre><code>${escapeHtml(mermaid.mermaid)}</code></pre>
<h2>Completeness</h2><pre><code>${escapeHtml(json(mermaid.completeness))}</code></pre>`, cspSource);
}
