import * as vscode from "vscode";
import type { HitoWrapperState } from "../types/protocol";
type PanelKind = "MRI" | "MERMAID";
export declare class HitoPanelManager implements vscode.Disposable {
    private readonly panels;
    show(kind: PanelKind, state: HitoWrapperState): void;
    dispose(): void;
}
export {};
