import * as vscode from "vscode";
import type { HitoWrapperState } from "../types/protocol";
import { HitoPanelManager } from "../panels/hito-panel";
export interface HitoCommandContext {
    getState(): HitoWrapperState;
    refresh(explicit: boolean): Promise<void>;
    panels: HitoPanelManager;
}
export declare function registerHitoCommands(context: vscode.ExtensionContext, commands: HitoCommandContext): void;
