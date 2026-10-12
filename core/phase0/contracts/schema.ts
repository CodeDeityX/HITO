import Ajv2020, { type ErrorObject, type ValidateFunction } from "ajv/dist/2020";
import addFormats from "ajv-formats";
import schema from "./canonical-model.schema.json";

export interface SchemaValidationResult {
  valid: boolean;
  errors: Array<{ instancePath: string; keyword: string; message: string; params: Record<string, unknown> }>;
}

const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true });
addFormats(ajv);
const validateCanonical = ajv.compile(schema);
const validateDerivedOutput = ajv.compile({
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $defs: schema.$defs,
  $ref: "#/$defs/derivedOutput",
});

function normalizeError(error: ErrorObject): { instancePath: string; keyword: string; message: string; params: Record<string, unknown> } {
  return {
    instancePath: error.instancePath,
    keyword: error.keyword,
    message: error.message ?? "schema validation error",
    params: error.params as Record<string, unknown>,
  };
}

function resultFor(validate: ValidateFunction<unknown>, value: unknown): SchemaValidationResult {
  const valid = validate(value) === true;
  return {
    valid,
    errors: valid ? [] : (validate.errors ?? []).map(normalizeError),
  };
}

export function validateCanonicalSchema(value: unknown): SchemaValidationResult {
  return resultFor(validateCanonical, value);
}

export function validateDerivedOutputSchema(value: unknown): SchemaValidationResult {
  return resultFor(validateDerivedOutput, value);
}

export function assertSchemaValid(value: unknown): void {
  const result = validateCanonicalSchema(value);
  if (!result.valid) {
    throw new Error(result.errors.map((error) => `${error.instancePath || "/"}: ${error.keyword} ${error.message}`).join("; "));
  }
}

export function assertSchemaRejects(value: unknown): void {
  if (validateCanonicalSchema(value).valid) throw new Error("expected canonical model to fail JSON Schema validation");
}

export function assertDerivedOutputSchemaRejects(value: unknown): void {
  if (validateDerivedOutputSchema(value).valid) throw new Error("expected derived output to fail JSON Schema validation");
}
