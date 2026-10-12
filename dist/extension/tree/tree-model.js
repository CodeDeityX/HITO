"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildHitoTree = buildHitoTree;
function scalarDescription(value) {
    if (value === null)
        return "null";
    if (typeof value === "string")
        return value;
    if (typeof value === "number" || typeof value === "boolean")
        return String(value);
    return "";
}
function toneForMaterial(value) {
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
        const category = value.category;
        if (category === "PROTECTED_AUTHORITY")
            return "PROTECTED";
        if (category === "UNKNOWN" || category === "INDETERMINATE" || category === "CONFLICT" || category === "CONTRADICTION" || category === "DESYNCHRONIZED_TERRITORY")
            return "ATTENTION";
    }
    return "NEUTRAL";
}
function jsonNode(id, label, value) {
    if (value === null || typeof value !== "object") {
        return {
            id,
            label,
            description: scalarDescription(value),
            tooltip: scalarDescription(value),
            tone: "NEUTRAL",
            children: [],
        };
    }
    if (Array.isArray(value)) {
        return {
            id,
            label,
            description: `${value.length} item(s)`,
            tone: "NEUTRAL",
            children: value.map((entry, index) => jsonNode(`${id}/${index}`, `[${index}]`, entry)),
        };
    }
    const keys = Object.keys(value).sort((left, right) => left < right ? -1 : left > right ? 1 : 0);
    return {
        id,
        label,
        description: `${keys.length} field(s)`,
        tone: toneForMaterial(value),
        children: keys.map((key) => jsonNode(`${id}/${key}`, key, value[key])),
    };
}
function asJson(value) {
    return value;
}
function unavailable(reason) {
    return [{
            id: "hito/unavailable",
            label: "Local HITO payload unavailable",
            description: "No semantic status asserted",
            tooltip: reason,
            tone: "UNAVAILABLE",
            children: [{
                    id: "hito/unavailable/reason",
                    label: "Connection detail",
                    description: reason,
                    tooltip: reason,
                    tone: "NEUTRAL",
                    children: [],
                }],
        }];
}
function identityNodes(ide) {
    return jsonNode("hito/source", "Exact source identities", asJson(ide.source));
}
function pulse(ide) {
    const status = ide.surfaces.projectPulse.value.status;
    return [
        {
            id: "hito/pulse/status",
            label: "HITO BOUNDED STATUS",
            description: status,
            tooltip: `Typed status from ${ide.source.semanticVerdictIdentity}`,
            tone: status === "BOUNDED_CURRENT" ? "TRUSTED_STATUS" : "ATTENTION",
            children: [],
        },
        jsonNode("hito/pulse/answers", "Project Pulse", asJson(ide.ux)),
        jsonNode("hito/pulse/current-claim", "Current claim", ide.surfaces.projectPulse.value.currentClaim),
        jsonNode("hito/pulse/material-groups", "Material state groups", asJson(ide.surfaces.projectPulse.value.materialStateGroups)),
        jsonNode("hito/pulse/material-states", "All material states", asJson(ide.surfaces.why.value.materialStates)),
        identityNodes(ide),
    ];
}
function next(ide) {
    return [
        {
            id: "hito/next/explanation",
            label: "WHAT NEXT",
            description: ide.surfaces.next.value.explanation,
            tooltip: ide.surfaces.next.value.explanation,
            tone: "TRUSTED_STATUS",
            children: [],
        },
        jsonNode("hito/next/step", "Exact Next Safe Mutation", ide.surfaces.next.value.nextStep),
        jsonNode("hito/next/route", "Action route (not authority)", ide.surfaces.next.value.actionRoute),
        jsonNode("hito/next/provenance", "Provenance", asJson(ide.surfaces.next.provenance)),
        {
            id: "hito/next/execution",
            label: "Execution authority",
            description: "false; mutating command = null",
            tone: "PROTECTED",
            children: [],
        },
    ];
}
function evidence(ide) {
    return [
        jsonNode("hito/evidence/classes", "Evidence", ide.surfaces.evidence.value),
        jsonNode("hito/evidence/freshness", "Freshness", ide.surfaces.freshness.value),
        jsonNode("hito/evidence/coverage", "Coverage", ide.surfaces.coverage.value),
    ];
}
function history(ide) {
    return [jsonNode("hito/history", "Semantic history", ide.surfaces.history.value)];
}
function protectedView(ide) {
    return [
        {
            id: "hito/protected/do-not-touch",
            label: "DO NOT TOUCH",
            description: ide.ux.whatShouldINotTouch,
            tooltip: ide.ux.whatShouldINotTouch,
            tone: "PROTECTED",
            children: [],
        },
        jsonNode("hito/protected/authorities", "Protected authorities", asJson(ide.surfaces.protectedAuthorities.value)),
        jsonNode("hito/protected/provenance", "Provenance", asJson(ide.surfaces.protectedAuthorities.provenance)),
    ];
}
function runtime(ide) {
    return [
        jsonNode("hito/runtime/state", "Runtime / operational state", ide.surfaces.runtimeState.value),
        jsonNode("hito/runtime/intent", "Intent provenance", ide.surfaces.intentProvenance.value),
        jsonNode("hito/runtime/effects", "Zero-effect counters", asJson(ide.zeroEffectCounters)),
    ];
}
function agent(state) {
    if (state.bridge.agentContext === undefined) {
        return [{
                id: "hito/agent/not-provided",
                label: "Agent Context not provided",
                description: "No agent authority inferred",
                tone: "UNAVAILABLE",
                children: [],
            }];
    }
    return [jsonNode("hito/agent/context", "Exact read-only Agent Context", asJson(state.bridge.agentContext))];
}
function buildHitoTree(view, state) {
    if (state.kind === "UNAVAILABLE")
        return unavailable(state.reason);
    const ide = state.bridge.ide;
    if (view === "PROJECT_PULSE")
        return pulse(ide);
    if (view === "NEXT")
        return next(ide);
    if (view === "EVIDENCE")
        return evidence(ide);
    if (view === "HISTORY")
        return history(ide);
    if (view === "PROTECTED")
        return protectedView(ide);
    if (view === "RUNTIME")
        return runtime(ide);
    return agent(state);
}
