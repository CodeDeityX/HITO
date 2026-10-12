import * as vscode from "vscode";
import type { HitoWrapperState } from "../types/protocol";
import { type HitoTreeNodeSpec, type HitoTreeViewKind } from "./tree-model";
declare class HitoTreeItem extends vscode.TreeItem {
    readonly spec: HitoTreeNodeSpec;
    constructor(spec: HitoTreeNodeSpec);
}
export declare class HitoTreeProvider implements vscode.TreeDataProvider<HitoTreeItem>, vscode.Disposable {
    private readonly view;
    private state;
    private readonly projector?;
    private readonly emitter;
    readonly onDidChangeTreeData: vscode.Event<void | HitoTreeItem | null | undefined>;
    constructor(view: HitoTreeViewKind, state: HitoWrapperState, projector?: (() => HitoTreeNodeSpec[]) | undefined);
    update(state: HitoWrapperState): void;
    getTreeItem(element: HitoTreeItem): vscode.TreeItem;
    getChildren(element?: HitoTreeItem): HitoTreeItem[];
    dispose(): void;
}
export {};
