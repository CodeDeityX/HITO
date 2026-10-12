import {
  G15_PROJECTION_MODES,
  selectG15Projection,
  type G15ProjectionMode,
  type G15UniversalProtocolProjectionEnvelope,
} from "../convergence/g15-universal-protocol-projection";
import {
  readHitoRuntimeFromProjectRoot,
  type HitoC6PersistedCompositionInput,
  type HitoC6CompositionSnapshot,
} from "../convergence/runtime";

export const HITO_C6_CLI_COMMANDS = ["status", "next", "why", "map", "mri", "history", "check"] as const;
export type HitoC6CliCommand = typeof HITO_C6_CLI_COMMANDS[number];
export type HitoC6CliFormat = "TEXT" | "JSON";

export interface HitoC6CliRequest {
  command: HitoC6CliCommand;
  mode?: G15ProjectionMode;
  format?: HitoC6CliFormat;
}

export interface HitoC6CliData {
  kind: "HITO_C6_READ_ONLY_CLI_PROJECTION";
  command: HitoC6CliCommand;
  mode: G15ProjectionMode;
  format: HitoC6CliFormat;
  semanticVerdictIdentity: string;
  sourceEnvelopeIdentity: string;
  sourceViewIdentity: string;
  trustedChrome: {
    origin: "TYPED_HITO_FIELDS_ONLY";
    label: "HITO BOUNDED STATUS";
    status: HitoC6CompositionSnapshot["g15"]["governedTruth"]["overallStatus"];
  };
  freshnessWatermarkId: string;
  payload: unknown;
  governanceBoundary: {
    readOnly: true;
    canonicalAuthority: false;
    ontologyAuthority: false;
    executionAuthority: false;
    mutatingCommandInvented: false;
  };
  zeroEffectCounters: {
    canonicalWriteCount: 0;
    governedTargetMutationCount: 0;
    targetExecutionCount: 0;
    providerModelCallCount: 0;
    networkCallCount: 0;
    gitMutationCount: 0;
  };
}

export interface HitoC6CliResult {
  data: HitoC6CliData;
  output: string;
}

const REQUEST_KEYS = ["command", "mode", "format"] as const;

function assertRequest(request: HitoC6CliRequest): Required<HitoC6CliRequest> {
  if (request === null || typeof request !== "object") throw new Error("HITO C6 CLI requires a structured request");
  const unsupported = Object.keys(request).filter((key) => !REQUEST_KEYS.includes(key as typeof REQUEST_KEYS[number])).sort();
  if (unsupported.length > 0) throw new Error(`HITO C6 CLI rejects unsupported fields: ${unsupported.join(", ")}`);
  if (!HITO_C6_CLI_COMMANDS.includes(request.command)) throw new Error(`HITO C6 CLI rejects unsupported command: ${String(request.command)}`);
  const mode = request.mode ?? "GUIDED";
  const format = request.format ?? "TEXT";
  if (!G15_PROJECTION_MODES.includes(mode)) throw new Error(`HITO C6 CLI rejects unsupported mode: ${String(mode)}`);
  if (format !== "TEXT" && format !== "JSON") throw new Error(`HITO C6 CLI rejects unsupported format: ${String(format)}`);
  return { command: request.command, mode, format };
}

function payloadFor(
  envelope: G15UniversalProtocolProjectionEnvelope,
  request: Required<HitoC6CliRequest>,
): unknown {
  const truth = envelope.governedTruth;
  const view = selectG15Projection(envelope, request.mode);
  if (request.command === "status") {
    return {
      currentClaim: view.currentClaim,
      answers: view.answers,
      materialStateGroups: view.materialStateGroups,
      materialStateCount: view.materialStateCount,
      hiddenMaterialStateCount: view.hiddenMaterialStateCount,
      warningsDropped: view.warningsDropped,
    };
  }
  if (request.command === "next") {
    return {
      nextStep: truth.nextStep,
      actionRoute: truth.actionRoute,
      explanation: view.answers.whatNext,
      executionAuthority: false,
      mutatingCommand: null,
    };
  }
  if (request.command === "why") {
    return {
      explanation: view.answers.why,
      materialStateGroups: view.materialStateGroups,
      materialStates: request.mode === "GUIDED" ? undefined : truth.materialStates,
      semanticVerdictIdentity: truth.semanticVerdictIdentity,
      newAuthorityCreated: false,
    };
  }
  if (request.command === "map") return truth.lifecycle;
  if (request.command === "mri") return truth.mri;
  if (request.command === "history") return truth.history;
  return truth.check;
}

function textOutput(data: HitoC6CliData): string {
  const lines = [
    `[${data.trustedChrome.label}: ${data.trustedChrome.status}]`,
    `command=${data.command}`,
    `mode=${data.mode}`,
    `semanticVerdictIdentity=${data.semanticVerdictIdentity}`,
    `freshnessWatermarkId=${data.freshnessWatermarkId}`,
    "authority=READ_ONLY_PROJECTION",
    "executionAuthority=false",
    "mutatingCommand=null",
    `payload=${JSON.stringify(data.payload)}`,
  ];
  return `${lines.join("\n")}\n`;
}

/** Selects and formats G15 output only; no semantic policy is reimplemented here. */
export function runHitoC6CliProjection(
  envelope: G15UniversalProtocolProjectionEnvelope,
  request: HitoC6CliRequest,
): HitoC6CliResult {
  const normalized = assertRequest(request);
  const view = selectG15Projection(envelope, normalized.mode);
  const data: HitoC6CliData = {
    kind: "HITO_C6_READ_ONLY_CLI_PROJECTION",
    command: normalized.command,
    mode: normalized.mode,
    format: normalized.format,
    semanticVerdictIdentity: envelope.semanticVerdictIdentity,
    sourceEnvelopeIdentity: envelope.envelopeId,
    sourceViewIdentity: view.projectionId,
    trustedChrome: view.trustedChrome,
    freshnessWatermarkId: envelope.governedTruth.freshnessWatermark.watermarkId,
    payload: payloadFor(envelope, normalized),
    governanceBoundary: {
      readOnly: true,
      canonicalAuthority: false,
      ontologyAuthority: false,
      executionAuthority: false,
      mutatingCommandInvented: false,
    },
    zeroEffectCounters: {
      canonicalWriteCount: 0,
      governedTargetMutationCount: 0,
      targetExecutionCount: 0,
      providerModelCallCount: 0,
      networkCallCount: 0,
      gitMutationCount: 0,
    },
  };
  return { data, output: normalized.format === "JSON" ? `${JSON.stringify(data)}\n` : textOutput(data) };
}

/**
 * Uses the existing validated persisted-root adapter, then projects the exact
 * same composed G15 envelope. Invalid project state fails closed upstream.
 */
export async function runHitoC6CliFromProjectRoot(
  projectRoot: string,
  compositionInput: HitoC6PersistedCompositionInput,
  request: HitoC6CliRequest,
): Promise<HitoC6CliResult> {
  const snapshot = await readHitoRuntimeFromProjectRoot(projectRoot, compositionInput);
  if (snapshot.kind !== "HITO_1_0_C6_COMPOSITION_SNAPSHOT") throw new Error("HITO C6 CLI requires an exact C6 composition snapshot");
  return runHitoC6CliProjection(snapshot.g15, request);
}

/** Pure bounded argument parser. It intentionally has no process or execution entrypoint. */
export function parseHitoC6CliArguments(argumentsAfterExecutable: readonly string[]): Required<HitoC6CliRequest> {
  const args = [...argumentsAfterExecutable];
  if (args[0]?.toLowerCase() === "hito") args.shift();
  const command = args.shift()?.toLowerCase();
  if (!HITO_C6_CLI_COMMANDS.includes(command as HitoC6CliCommand)) {
    throw new Error(`HITO C6 CLI rejects unsupported command: ${command ?? "MISSING"}`);
  }
  let mode: G15ProjectionMode = "GUIDED";
  let format: HitoC6CliFormat = "TEXT";
  while (args.length > 0) {
    const token = args.shift() as string;
    if (token === "--json") format = "JSON";
    else if (token === "--text") format = "TEXT";
    else if (token === "--mode") {
      const value = args.shift()?.toUpperCase();
      if (!G15_PROJECTION_MODES.includes(value as G15ProjectionMode)) throw new Error(`HITO C6 CLI rejects unsupported mode: ${value ?? "MISSING"}`);
      mode = value as G15ProjectionMode;
    } else if (token.startsWith("--mode=")) {
      const value = token.slice("--mode=".length).toUpperCase();
      if (!G15_PROJECTION_MODES.includes(value as G15ProjectionMode)) throw new Error(`HITO C6 CLI rejects unsupported mode: ${value}`);
      mode = value as G15ProjectionMode;
    } else {
      throw new Error(`HITO C6 CLI rejects unsupported argument: ${token}`);
    }
  }
  return { command: command as HitoC6CliCommand, mode, format };
}
