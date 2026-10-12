"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const hito_client_1 = require("./hito-client");
const hito_panel_1 = require("./panels/hito-panel");
const register_commands_1 = require("./commands/register-commands");
const hito_status_1 = require("./status/hito-status");
const hito_tree_1 = require("./tree/hito-tree");
const VIEW_SPECS = [
    ["hito.projectPulse", "PROJECT_PULSE"],
    ["hito.next", "NEXT"],
    ["hito.evidence", "EVIDENCE"],
    ["hito.history", "HISTORY"],
    ["hito.protected", "PROTECTED"],
    ["hito.runtime", "RUNTIME"],
    ["hito.agentContext", "AGENT_CONTEXT"],
];
function unavailable(reason) {
    return { kind: "UNAVAILABLE", reason, semanticStatusAsserted: false };
}
async function activate(context) {
    let state = unavailable("No local payload has been read yet.");
    const providers = VIEW_SPECS.map(([viewId, kind]) => {
        const provider = new hito_tree_1.HitoTreeProvider(kind, state);
        context.subscriptions.push(provider, vscode.window.registerTreeDataProvider(viewId, provider));
        return provider;
    });
    const status = new hito_status_1.HitoStatusBar();
    const panels = new hito_panel_1.HitoPanelManager();
    context.subscriptions.push(status, panels);
    const publish = (next) => {
        state = next;
        for (const provider of providers)
            provider.update(next);
        status.update(next);
    };
    const refresh = async (explicit) => {
        const folder = vscode.workspace.workspaceFolders?.[0];
        if (folder === undefined) {
            publish(unavailable("Open a local workspace to use HITO."));
            if (explicit)
                void vscode.window.showWarningMessage("HITO requires an open local workspace. No semantic status is asserted.");
            return;
        }
        const configuredPath = vscode.workspace.getConfiguration("hito", folder.uri).get("localPayloadPath", "").trim();
        if (configuredPath.length === 0) {
            publish(unavailable("Configure hito.localPayloadPath with a workspace-relative qualified bridge JSON path."));
            if (explicit)
                void vscode.window.showWarningMessage("Set hito.localPayloadPath to a workspace-relative qualified bridge JSON. No semantic status is asserted.");
            return;
        }
        try {
            const bridge = await (0, hito_client_1.readLocalHitoBridge)(folder.uri.fsPath, configuredPath);
            publish({ kind: "READY", bridge, sourceRelativePath: configuredPath });
            console.log(`[HITO P1] qualified local payload loaded: ${configuredPath}; semantic=${bridge.ide.source.semanticVerdictIdentity}`);
            if (explicit)
                void vscode.window.showInformationMessage(`HITO refreshed: ${bridge.ide.surfaces.projectPulse.value.status}`);
        }
        catch (error) {
            const detail = error instanceof Error ? error.message : String(error);
            publish(unavailable(detail));
            console.error(`[HITO P1] local payload rejected: ${detail}`);
            if (explicit)
                void vscode.window.showErrorMessage(detail);
        }
    };
    (0, register_commands_1.registerHitoCommands)(context, { getState: () => state, refresh, panels });
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration("hito.localPayloadPath"))
            void refresh(false);
    }));
    await refresh(false);
    console.log("[HITO P1] local VS Code wrapper activated; read-only host projection only");
}
function deactivate() { }
