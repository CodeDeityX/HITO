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
exports.HitoPanelManager = void 0;
const vscode = __importStar(require("vscode"));
const panel_content_1 = require("./panel-content");
class HitoPanelManager {
    panels = new Map();
    show(kind, state) {
        if (state.kind !== "READY") {
            void vscode.window.showWarningMessage(`HITO local payload unavailable. ${state.reason} No semantic status is asserted.`);
            return;
        }
        const title = kind === "MRI" ? "HITO Engineering MRI" : "HITO Map";
        let panel = this.panels.get(kind);
        if (panel === undefined) {
            panel = vscode.window.createWebviewPanel(`hito.${kind.toLowerCase()}`, title, vscode.ViewColumn.Beside, {
                enableScripts: false,
                retainContextWhenHidden: false,
            });
            const created = panel;
            this.panels.set(kind, panel);
            created.onDidDispose(() => this.panels.delete(kind));
        }
        else {
            panel.reveal(vscode.ViewColumn.Beside, true);
        }
        panel.webview.html = kind === "MRI"
            ? (0, panel_content_1.buildMriPanelHtml)(state.bridge.ide, panel.webview.cspSource)
            : (0, panel_content_1.buildMermaidPanelHtml)(state.bridge.ide, panel.webview.cspSource);
    }
    dispose() {
        for (const panel of this.panels.values())
            panel.dispose();
        this.panels.clear();
    }
}
exports.HitoPanelManager = HitoPanelManager;
