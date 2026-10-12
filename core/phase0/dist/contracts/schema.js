"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCanonicalSchema = validateCanonicalSchema;
exports.validateDerivedOutputSchema = validateDerivedOutputSchema;
exports.assertSchemaValid = assertSchemaValid;
exports.assertSchemaRejects = assertSchemaRejects;
exports.assertDerivedOutputSchemaRejects = assertDerivedOutputSchemaRejects;
const _2020_1 = __importDefault(require("ajv/dist/2020"));
const ajv_formats_1 = __importDefault(require("ajv-formats"));
const canonical_model_schema_json_1 = __importDefault(require("./canonical-model.schema.json"));
const ajv = new _2020_1.default({ allErrors: true, strict: true, allowUnionTypes: true });
(0, ajv_formats_1.default)(ajv);
const validateCanonical = ajv.compile(canonical_model_schema_json_1.default);
const validateDerivedOutput = ajv.compile({
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $defs: canonical_model_schema_json_1.default.$defs,
    $ref: "#/$defs/derivedOutput",
});
function normalizeError(error) {
    return {
        instancePath: error.instancePath,
        keyword: error.keyword,
        message: error.message ?? "schema validation error",
        params: error.params,
    };
}
function resultFor(validate, value) {
    const valid = validate(value) === true;
    return {
        valid,
        errors: valid ? [] : (validate.errors ?? []).map(normalizeError),
    };
}
function validateCanonicalSchema(value) {
    return resultFor(validateCanonical, value);
}
function validateDerivedOutputSchema(value) {
    return resultFor(validateDerivedOutput, value);
}
function assertSchemaValid(value) {
    const result = validateCanonicalSchema(value);
    if (!result.valid) {
        throw new Error(result.errors.map((error) => `${error.instancePath || "/"}: ${error.keyword} ${error.message}`).join("; "));
    }
}
function assertSchemaRejects(value) {
    if (validateCanonicalSchema(value).valid)
        throw new Error("expected canonical model to fail JSON Schema validation");
}
function assertDerivedOutputSchemaRejects(value) {
    if (validateDerivedOutputSchema(value).valid)
        throw new Error("expected derived output to fail JSON Schema validation");
}
