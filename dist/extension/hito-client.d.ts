import { type HitoIdePayload, type HitoLocalBridgeDocument, type HitoTrustedStatus } from "./types/protocol";
export declare function assertLocalBridgeDocument(value: unknown): asserts value is HitoLocalBridgeDocument;
export declare function readLocalHitoBridge(workspaceRoot: string, configuredRelativePath: string): Promise<HitoLocalBridgeDocument>;
export declare function trustedStatus(value: HitoIdePayload): HitoTrustedStatus;
