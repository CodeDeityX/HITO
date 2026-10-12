import { type HitoIdePayload, type HitoLocalBridgeDocument, type HitoTrustedStatus } from "./types/protocol";
export declare function assertLocalBridgeDocument(value: unknown): asserts value is HitoLocalBridgeDocument;
export declare function readLocalHitoBridge(workspaceRoot: string, configuredRelativePath: string): Promise<HitoLocalBridgeDocument>;
export declare function trustedStatus(value: HitoIdePayload): HitoTrustedStatus;
import { type HitoFirstObservationBridge } from "./types/protocol";
/** Additive reader rejects version/schema/authority drift without invoking semantic engines. */
export declare function assertFirstObservationBridge(value: unknown): asserts value is HitoFirstObservationBridge;
export declare function readFirstObservationHitoBridge(workspaceRoot: string, configuredRelativePath: string): Promise<HitoFirstObservationBridge>;
