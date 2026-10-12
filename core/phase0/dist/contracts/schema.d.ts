export interface SchemaValidationResult {
    valid: boolean;
    errors: Array<{
        instancePath: string;
        keyword: string;
        message: string;
        params: Record<string, unknown>;
    }>;
}
export declare function validateCanonicalSchema(value: unknown): SchemaValidationResult;
export declare function validateDerivedOutputSchema(value: unknown): SchemaValidationResult;
export declare function assertSchemaValid(value: unknown): void;
export declare function assertSchemaRejects(value: unknown): void;
export declare function assertDerivedOutputSchemaRejects(value: unknown): void;
