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
exports.HitoStatusBar = void 0;
const vscode = __importStar(require("vscode"));
class HitoStatusBar {
    item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 90);
    constructor() {
        this.item.command = "hito.status";
        this.item.show();
    }
    update(state) {
        if (state.kind === "UNAVAILABLE") {
            this.item.text = "$(circle-slash) HITO: LOCAL PAYLOAD UNAVAILABLE";
            this.item.tooltip = `${state.reason}\nNo semantic status asserted.`;
            return;
        }
        const status = state.bridge.ide.surfaces.projectPulse.value.status;
        this.item.text = `${status === "BOUNDED_CURRENT" ? "$(shield)" : "$(warning)"} HITO: ${status}`;
        this.item.tooltip = `Typed HITO bounded status\nSemantic verdict: ${state.bridge.ide.source.semanticVerdictIdentity}\nSource: ${state.sourceRelativePath}`;
    }
    dispose() { this.item.dispose(); }
}
exports.HitoStatusBar = HitoStatusBar;
