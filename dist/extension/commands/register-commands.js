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
exports.registerHitoCommands = registerHitoCommands;
const vscode = __importStar(require("vscode"));
function readyMessage(state, surface) {
    if (state.kind === "UNAVAILABLE")
        return `HITO local payload unavailable. ${state.reason} No semantic status is asserted.`;
    if (surface === "STATUS")
        return `HITO ${state.bridge.ide.surfaces.projectPulse.value.status}: ${state.bridge.ide.ux.whereAmI}`;
    if (surface === "NEXT")
        return state.bridge.ide.surfaces.next.value.explanation;
    return state.bridge.ide.surfaces.why.value.explanation;
}
function registerHitoCommands(context, commands) {
    const reveal = (viewId) => { void vscode.commands.executeCommand(`${viewId}.focus`); };
    const registrations = [
        ["hito.status", () => vscode.window.showInformationMessage(readyMessage(commands.getState(), "STATUS"))],
        ["hito.next", () => { reveal("hito.next"); return vscode.window.showInformationMessage(readyMessage(commands.getState(), "NEXT")); }],
        ["hito.why", () => vscode.window.showInformationMessage(readyMessage(commands.getState(), "WHY"))],
        ["hito.mri", () => commands.panels.show("MRI", commands.getState())],
        ["hito.map", () => commands.panels.show("MERMAID", commands.getState())],
        ["hito.evidence", () => reveal("hito.evidence")],
        ["hito.history", () => reveal("hito.history")],
        ["hito.protected", () => reveal("hito.protected")],
        ["hito.agentContext", () => reveal("hito.agentContext")],
        ["hito.refresh", () => commands.refresh(true)],
    ];
    for (const [id, callback] of registrations)
        context.subscriptions.push(vscode.commands.registerCommand(id, callback));
}
