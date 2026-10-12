import * as vscode from "vscode";
import type { HitoWrapperState } from "../types/protocol";
export declare class HitoStatusBar implements vscode.Disposable {
    private readonly item;
    constructor();
    update(state: HitoWrapperState): void;
    dispose(): void;
}
