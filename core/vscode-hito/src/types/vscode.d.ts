declare module "vscode" {
  type Thenable<T> = PromiseLike<T>;
  export interface Disposable { dispose(): void; }
  export type Event<T> = (listener: (event: T) => unknown) => Disposable;

  export class EventEmitter<T> implements Disposable {
    readonly event: Event<T>;
    fire(data?: T): void;
    dispose(): void;
  }

  export enum TreeItemCollapsibleState { None = 0, Collapsed = 1, Expanded = 2 }
  export class ThemeIcon { constructor(id: string); }
  export class TreeItem {
    constructor(label: string, collapsibleState?: TreeItemCollapsibleState);
    id?: string;
    description?: string | undefined;
    tooltip?: string | undefined;
    contextValue?: string;
    iconPath?: ThemeIcon;
  }
  export interface TreeDataProvider<T> {
    readonly onDidChangeTreeData?: Event<T | undefined | null | void>;
    getTreeItem(element: T): TreeItem;
    getChildren(element?: T): readonly T[] | Thenable<readonly T[]>;
  }

  export interface Uri { readonly fsPath: string; }
  export interface WorkspaceFolder { readonly uri: Uri; readonly name: string; readonly index: number; }
  export interface WorkspaceConfiguration { get<T>(section: string, defaultValue: T): T; }
  export interface ConfigurationChangeEvent { affectsConfiguration(section: string, scope?: Uri): boolean; }

  export interface StatusBarItem extends Disposable {
    text: string;
    tooltip?: string;
    command?: string;
    show(): void;
  }
  export enum StatusBarAlignment { Left = 1, Right = 2 }
  export enum ViewColumn { Active = -1, Beside = -2, One = 1 }
  export interface Webview { html: string; readonly cspSource: string; }
  export interface WebviewPanel extends Disposable {
    readonly webview: Webview;
    readonly onDidDispose: Event<void>;
    reveal(viewColumn?: ViewColumn, preserveFocus?: boolean): void;
  }
  export interface ExtensionContext { readonly subscriptions: Disposable[]; }

  export namespace workspace {
    const workspaceFolders: readonly WorkspaceFolder[] | undefined;
    function getConfiguration(section?: string, scope?: Uri): WorkspaceConfiguration;
    function onDidChangeConfiguration(listener: (event: ConfigurationChangeEvent) => unknown): Disposable;
  }
  export namespace window {
    function registerTreeDataProvider<T>(viewId: string, provider: TreeDataProvider<T>): Disposable;
    function createStatusBarItem(alignment?: StatusBarAlignment, priority?: number): StatusBarItem;
    function showInformationMessage(message: string): Thenable<string | undefined>;
    function showWarningMessage(message: string): Thenable<string | undefined>;
    function showErrorMessage(message: string): Thenable<string | undefined>;
    function createWebviewPanel(viewType: string, title: string, showOptions: ViewColumn, options?: { enableScripts?: boolean; retainContextWhenHidden?: boolean }): WebviewPanel;
  }
  export namespace commands {
    function registerCommand(command: string, callback: (...args: unknown[]) => unknown): Disposable;
    function executeCommand<T = unknown>(command: string, ...rest: unknown[]): Thenable<T | undefined>;
  }
}
