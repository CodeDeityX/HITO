import { createHash } from "node:crypto";
import { G15_PROJECTION_MODES, type G15ProjectionMode } from "../../convergence/g15-universal-protocol-projection";
import {
  readHitoRuntimeFromProjectRoot,
  type HitoC7CompositionSnapshot,
  type HitoC7PersistedCompositionInput,
} from "../../convergence/runtime";
import {
  HITO_PRE_C9_HOST_AUTHORITY,
  HITO_PRE_C9_HOST_PROTOCOL_VERSION,
  projectHitoHostProtocol,
  type HitoHostField,
  type HitoHostProtocolProjection,
} from "../shared/hito-host-protocol";
import {
  generateHitoMermaidMri,
  type HitoMermaidMriOptions,
  type HitoMermaidMriProjection,
} from "./hito-mermaid-mri";

export const HITO_PRE_C9_IDE_HOST_VERSION = "hito-pre-c9-ide-host-v1" as const;

export interface HitoIdeHostRequest {
  mode?: G15ProjectionMode;
  mermaid?: HitoMermaidMriOptions;
}

export type HitoIdeNavigationTarget =
  | "PROJECT_PULSE"
  | "NEXT"
  | "WHY"
  | "MRI"
  | "EVIDENCE"
  | "HISTORY"
  | "PROTECTED_AUTHORITY";

export interface HitoIdeNavigationRoute {
  routeId: string;
  kind: "REVEAL_HOST_SURFACE";
  target: HitoIdeNavigationTarget;
  mutatingCommand: null;
  semanticAuthority: false;
  executionAuthority: false;
}

export interface HitoIdeHostPayload {
  kind: "HITO_PRE_C9_HOST_NEUTRAL_IDE_PAYLOAD";
  version: typeof HITO_PRE_C9_IDE_HOST_VERSION;
  protocolVersion: typeof HITO_PRE_C9_HOST_PROTOCOL_VERSION;
  authority: typeof HITO_PRE_C9_HOST_AUTHORITY;
  payloadIdentity: string;
  mode: G15ProjectionMode;
  source: HitoHostProtocolProjection["source"];
  surfaces: {
    projectPulse: HitoHostProtocolProjection["projectPulse"];
    next: HitoHostProtocolProjection["next"];
    why: HitoHostProtocolProjection["why"];
    mri: HitoHostProtocolProjection["mri"];
    mermaid: HitoHostField<HitoMermaidMriProjection>;
    history: HitoHostProtocolProjection["history"];
    evidence: HitoHostProtocolProjection["evidence"];
    protectedAuthorities: HitoHostProtocolProjection["protectedAuthorities"];
    runtimeState: HitoHostProtocolProjection["runtimeState"];
    freshness: HitoHostProtocolProjection["freshness"];
    coverage: HitoHostProtocolProjection["coverage"];
    intentProvenance: HitoHostProtocolProjection["intentProvenance"];
  };
  ux: {
    whereAmI: string;
    whatAmITryingToDo: string;
    whatIsMissing: string;
    whatNext: string;
    why: string;
    whatIsSafeToChange: string;
    whatShouldINotTouch: string;
    whenIsThisDone: string;
  };
  navigationRoutes: readonly HitoIdeNavigationRoute[];
  hostCapabilities: {
    thinWrapperReady: true;
    hostSpecificOntology: false;
    presentationHostDependency: false;
    semanticRecomputationRequired: false;
  };
  governanceBoundary: HitoHostProtocolProjection["governanceBoundary"] & {
    navigationIsMutationAuthority: false;
    shellMutationCommandGenerated: false;
  };
  zeroEffectCounters: HitoHostProtocolProjection["zeroEffectCounters"];
}

const REQUEST_KEYS = ["mode", "mermaid"] as const;
const MERMAID_KEYS = ["maxMriNodes", "maxMriEdges"] as const;

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`HITO pre-C9 IDE host rejected input: ${message}`);
}

function normalizeRequest(request: HitoIdeHostRequest | undefined): Required<Pick<HitoIdeHostRequest, "mode">> & Pick<HitoIdeHostRequest, "mermaid"> {
  const value = request ?? {};
  invariant(value !== null && typeof value === "object" && !Array.isArray(value), "request must be structured");
  const unsupported = Object.keys(value).filter((key) => !REQUEST_KEYS.includes(key as typeof REQUEST_KEYS[number])).sort();
  invariant(unsupported.length === 0, `request rejects unsupported or precomputed authority fields: ${unsupported.join(", ")}`);
  const mode = value.mode ?? "GUIDED";
  invariant(G15_PROJECTION_MODES.includes(mode), `unsupported presentation mode ${String(mode)}`);
  if (value.mermaid !== undefined) {
    invariant(value.mermaid !== null && typeof value.mermaid === "object" && !Array.isArray(value.mermaid), "mermaid options must be structured");
    const mermaidUnsupported = Object.keys(value.mermaid).filter((key) => !MERMAID_KEYS.includes(key as typeof MERMAID_KEYS[number])).sort();
    invariant(mermaidUnsupported.length === 0, `mermaid options reject unsupported or precomputed authority fields: ${mermaidUnsupported.join(", ")}`);
  }
  return { mode, ...(value.mermaid === undefined ? {} : { mermaid: value.mermaid }) };
}

function navigationRoutes(): readonly HitoIdeNavigationRoute[] {
  return Object.freeze([
    "PROJECT_PULSE",
    "NEXT",
    "WHY",
    "MRI",
    "EVIDENCE",
    "HISTORY",
    "PROTECTED_AUTHORITY",
  ].map((target) => Object.freeze({
    routeId: `hito-host-reveal-${target.toLowerCase().replaceAll("_", "-")}`,
    kind: "REVEAL_HOST_SURFACE" as const,
    target: target as HitoIdeNavigationTarget,
    mutatingCommand: null,
    semanticAuthority: false as const,
    executionAuthority: false as const,
  })));
}

/** Pure host-neutral IDE projection over the exact same validated C7 snapshot. */
export function createHitoIdeHostPayload(
  snapshot: HitoC7CompositionSnapshot,
  request?: HitoIdeHostRequest,
): HitoIdeHostPayload {
  const normalized = normalizeRequest(request);
  const protocol = projectHitoHostProtocol(snapshot, normalized.mode);
  const mermaid = generateHitoMermaidMri(snapshot, normalized.mermaid);
  const payloadIdentity = `hito_pre_c9_ide_${createHash("sha256").update(Buffer.from([
    protocol.source.c7CompositionIdentity,
    protocol.source.semanticVerdictIdentity,
    protocol.source.g16AssessmentIdentity,
    protocol.mode,
    mermaid.diagramIdentity,
  ].join("\n"), "utf8")).digest("hex")}`;
  const result: HitoIdeHostPayload = {
    kind: "HITO_PRE_C9_HOST_NEUTRAL_IDE_PAYLOAD",
    version: HITO_PRE_C9_IDE_HOST_VERSION,
    protocolVersion: protocol.protocolVersion,
    authority: protocol.authority,
    payloadIdentity,
    mode: protocol.mode,
    source: protocol.source,
    surfaces: {
      projectPulse: protocol.projectPulse,
      next: protocol.next,
      why: protocol.why,
      mri: protocol.mri,
      mermaid: {
        value: mermaid,
        provenance: protocol.mri.provenance,
        semanticAuthority: false,
        executionAuthority: false,
      },
      history: protocol.history,
      evidence: protocol.evidence,
      protectedAuthorities: protocol.protectedAuthorities,
      runtimeState: protocol.runtimeState,
      freshness: protocol.freshness,
      coverage: protocol.coverage,
      intentProvenance: protocol.intentProvenance,
    },
    ux: protocol.uxAnswers,
    navigationRoutes: navigationRoutes(),
    hostCapabilities: {
      thinWrapperReady: true,
      hostSpecificOntology: false,
      presentationHostDependency: false,
      semanticRecomputationRequired: false,
    },
    governanceBoundary: {
      ...protocol.governanceBoundary,
      navigationIsMutationAuthority: false,
      shellMutationCommandGenerated: false,
    },
    zeroEffectCounters: protocol.zeroEffectCounters,
  };
  return Object.freeze(result);
}

/** Uses only the existing validated persisted-root reader before pure projection. */
export async function readHitoIdeHostFromProjectRoot(
  projectRoot: string,
  compositionInput: HitoC7PersistedCompositionInput,
  request?: HitoIdeHostRequest,
): Promise<HitoIdeHostPayload> {
  const snapshot = await readHitoRuntimeFromProjectRoot(projectRoot, compositionInput);
  invariant(snapshot.kind === "HITO_1_0_C7_COMPOSITION_SNAPSHOT", "persisted-root composition did not produce C7");
  return createHitoIdeHostPayload(snapshot, request);
}


import type { HitoFirstObservationResult } from "../../contracts/model";
import { projectHitoFirstObservationHost } from "../shared/hito-host-protocol";
import { generateHitoFirstObservationMermaid } from "./hito-mermaid-mri";

export function createHitoFirstObservationIdePayload(result: HitoFirstObservationResult) {
  return {
    kind: "HITO_FIRST_OBSERVATION_IDE_PAYLOAD" as const,
    version: "hito-first-observation-ide-r1" as const,
    host: projectHitoFirstObservationHost(result),
    mri: generateHitoFirstObservationMermaid(result),
  };
}
