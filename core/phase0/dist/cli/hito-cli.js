"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HITO_C6_CLI_COMMANDS = void 0;
exports.runHitoC6CliProjection = runHitoC6CliProjection;
exports.runHitoC6CliFromProjectRoot = runHitoC6CliFromProjectRoot;
exports.parseHitoC6CliArguments = parseHitoC6CliArguments;
const g15_universal_protocol_projection_1 = require("../convergence/g15-universal-protocol-projection");
const runtime_1 = require("../convergence/runtime");
exports.HITO_C6_CLI_COMMANDS = ["status", "next", "why", "map", "mri", "history", "check"];
const REQUEST_KEYS = ["command", "mode", "format"];
function assertRequest(request) {
    if (request === null || typeof request !== "object")
        throw new Error("HITO C6 CLI requires a structured request");
    const unsupported = Object.keys(request).filter((key) => !REQUEST_KEYS.includes(key)).sort();
    if (unsupported.length > 0)
        throw new Error(`HITO C6 CLI rejects unsupported fields: ${unsupported.join(", ")}`);
    if (!exports.HITO_C6_CLI_COMMANDS.includes(request.command))
        throw new Error(`HITO C6 CLI rejects unsupported command: ${String(request.command)}`);
    const mode = request.mode ?? "GUIDED";
    const format = request.format ?? "TEXT";
    if (!g15_universal_protocol_projection_1.G15_PROJECTION_MODES.includes(mode))
        throw new Error(`HITO C6 CLI rejects unsupported mode: ${String(mode)}`);
    if (format !== "TEXT" && format !== "JSON")
        throw new Error(`HITO C6 CLI rejects unsupported format: ${String(format)}`);
    return { command: request.command, mode, format };
}
function payloadFor(envelope, request) {
    const truth = envelope.governedTruth;
    const view = (0, g15_universal_protocol_projection_1.selectG15Projection)(envelope, request.mode);
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
    if (request.command === "map")
        return truth.lifecycle;
    if (request.command === "mri")
        return truth.mri;
    if (request.command === "history")
        return truth.history;
    return truth.check;
}
function textOutput(data) {
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
function runHitoC6CliProjection(envelope, request) {
    const normalized = assertRequest(request);
    const view = (0, g15_universal_protocol_projection_1.selectG15Projection)(envelope, normalized.mode);
    const data = {
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
async function runHitoC6CliFromProjectRoot(projectRoot, compositionInput, request) {
    const snapshot = await (0, runtime_1.readHitoRuntimeFromProjectRoot)(projectRoot, compositionInput);
    if (snapshot.kind !== "HITO_1_0_C6_COMPOSITION_SNAPSHOT")
        throw new Error("HITO C6 CLI requires an exact C6 composition snapshot");
    return runHitoC6CliProjection(snapshot.g15, request);
}
/** Pure bounded argument parser. It intentionally has no process or execution entrypoint. */
function parseHitoC6CliArguments(argumentsAfterExecutable) {
    const args = [...argumentsAfterExecutable];
    if (args[0]?.toLowerCase() === "hito")
        args.shift();
    const command = args.shift()?.toLowerCase();
    if (!exports.HITO_C6_CLI_COMMANDS.includes(command)) {
        throw new Error(`HITO C6 CLI rejects unsupported command: ${command ?? "MISSING"}`);
    }
    let mode = "GUIDED";
    let format = "TEXT";
    while (args.length > 0) {
        const token = args.shift();
        if (token === "--json")
            format = "JSON";
        else if (token === "--text")
            format = "TEXT";
        else if (token === "--mode") {
            const value = args.shift()?.toUpperCase();
            if (!g15_universal_protocol_projection_1.G15_PROJECTION_MODES.includes(value))
                throw new Error(`HITO C6 CLI rejects unsupported mode: ${value ?? "MISSING"}`);
            mode = value;
        }
        else if (token.startsWith("--mode=")) {
            const value = token.slice("--mode=".length).toUpperCase();
            if (!g15_universal_protocol_projection_1.G15_PROJECTION_MODES.includes(value))
                throw new Error(`HITO C6 CLI rejects unsupported mode: ${value}`);
            mode = value;
        }
        else {
            throw new Error(`HITO C6 CLI rejects unsupported argument: ${token}`);
        }
    }
    return { command: command, mode, format };
}
