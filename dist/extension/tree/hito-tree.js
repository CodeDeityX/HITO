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
exports.HitoTreeProvider = void 0;
const vscode = __importStar(require("vscode"));
const tree_model_1 = require("./tree-model");
class HitoTreeItem extends vscode.TreeItem {
    spec;
    constructor(spec) {
        super(spec.label, spec.children.length > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None);
        this.spec = spec;
        this.id = spec.id;
        this.description = spec.description;
        this.tooltip = spec.tooltip;
        this.contextValue = `hito.${spec.tone.toLowerCase()}`;
        this.iconPath = new vscode.ThemeIcon(spec.tone === "TRUSTED_STATUS" ? "shield" :
            spec.tone === "ATTENTION" ? "warning" :
                spec.tone === "PROTECTED" ? "lock" :
                    spec.tone === "UNAVAILABLE" ? "circle-slash" : "terminal");
    }
}
class HitoTreeProvider {
    view;
    state;
    projector;
    emitter = new vscode.EventEmitter();
    onDidChangeTreeData = this.emitter.event;
    constructor(view, state, projector) {
        this.view = view;
        this.state = state;
        this.projector = projector;
    }
    update(state) {
        this.state = state;
        this.emitter.fire();
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        const specs = element === undefined ? (this.projector ? this.projector() : (0, tree_model_1.buildHitoTree)(this.view, this.state)) : element.spec.children;
        return specs.map((spec) => new HitoTreeItem(spec));
    }
    dispose() {
        this.emitter.dispose();
    }
}
exports.HitoTreeProvider = HitoTreeProvider;
