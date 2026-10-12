import type { HitoIdePayload } from "../types/protocol";
export declare function escapeHtml(value: string): string;
export declare function buildMriPanelHtml(ide: HitoIdePayload, cspSource: string): string;
export declare function buildMermaidPanelHtml(ide: HitoIdePayload, cspSource: string): string;
