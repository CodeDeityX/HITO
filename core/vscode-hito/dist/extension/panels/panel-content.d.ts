import type { HitoIdePayload } from "../types/protocol";
export declare function escapeHtml(value: string): string;
export declare function buildMriPanelHtml(ide: HitoIdePayload, cspSource: string): string;
export declare function buildMermaidPanelHtml(ide: HitoIdePayload, cspSource: string): string;
import type { HitoFirstObservationBridge } from "../types/protocol";
export declare function buildHitoFirstObservationPanelHtml(bridge: HitoFirstObservationBridge, cspSource: string): string;
