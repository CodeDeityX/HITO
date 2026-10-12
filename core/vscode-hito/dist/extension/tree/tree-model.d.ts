import type { HitoWrapperState } from "../types/protocol";
export type HitoTreeTone = "TRUSTED_STATUS" | "ATTENTION" | "PROTECTED" | "NEUTRAL" | "UNAVAILABLE";
export interface HitoTreeNodeSpec {
    id: string;
    label: string;
    description?: string;
    tooltip?: string;
    tone: HitoTreeTone;
    children: HitoTreeNodeSpec[];
}
export type HitoTreeViewKind = "PROJECT_PULSE" | "NEXT" | "EVIDENCE" | "HISTORY" | "PROTECTED" | "RUNTIME" | "AGENT_CONTEXT";
export declare function buildHitoTree(view: HitoTreeViewKind, state: HitoWrapperState): HitoTreeNodeSpec[];
import type { HitoFirstObservationBridge } from "../types/protocol";
export declare function buildHitoFirstObservationTree(bridge: HitoFirstObservationBridge): HitoTreeNodeSpec[];
