import { type G15ProjectionMode, type G15UniversalProtocolProjectionEnvelope } from "../convergence/g15-universal-protocol-projection";
import { type HitoC6PersistedCompositionInput, type HitoC6CompositionSnapshot } from "../convergence/runtime";
export declare const HITO_C6_CLI_COMMANDS: readonly ["status", "next", "why", "map", "mri", "history", "check"];
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
/** Selects and formats G15 output only; no semantic policy is reimplemented here. */
export declare function runHitoC6CliProjection(envelope: G15UniversalProtocolProjectionEnvelope, request: HitoC6CliRequest): HitoC6CliResult;
/**
 * Uses the existing validated persisted-root adapter, then projects the exact
 * same composed G15 envelope. Invalid project state fails closed upstream.
 */
export declare function runHitoC6CliFromProjectRoot(projectRoot: string, compositionInput: HitoC6PersistedCompositionInput, request: HitoC6CliRequest): Promise<HitoC6CliResult>;
/** Pure bounded argument parser. It intentionally has no process or execution entrypoint. */
export declare function parseHitoC6CliArguments(argumentsAfterExecutable: readonly string[]): Required<HitoC6CliRequest>;
