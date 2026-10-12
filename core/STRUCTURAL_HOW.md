# R10O-E1 structural HOW

The existing continuity capsule now includes `coordinates.HOW.structuralGraph`. No competing capsule or structural state store is created. Canonical model construction records exact admitted path/SHA-256 pairs in implementationRefs; the existing canonical persistence owner commits and validates these records. Product entry derives the graph from those pairs after validated canonical reopen. The capsule merely projects the result.

Use normal init, then two real intake --canonical admissions, then story --continuity-capsule. The original no-fabricated-predecessor rule is unchanged. Existing models without source pairs yield an empty/UNKNOWN structural graph until normal re-observation. Source changes or renames reject stale graph derivation; normal canonical re-observation earns replacement evidence. Canonical nodes, decisions, intent and authority are not inferred from this graph.

## E1 static import contract

Import declarations are now extracted independently from the whole-file call grammar. Supported declarations: default, named/aliased, namespace, side-effect, default-plus-named/namespace, multiline, comments and ordinary whitespace. Semicolon-free declarations need a line break or end of input. Supported local specifiers are exact admitted .js/.mjs/.cjs files after bounded POSIX lexical normalization; directory, extension fallback and arbitrary Node/package resolution are not attempted. Windows filesystem paths normalize separately; escaped/backslash JS specifiers are explicitly unsupported.

IMPORTS connects caller MODULE to target MODULE or explicit EXTERNAL_DEPENDENCY. Module imports do not require a supported function body or verification that an imported binding exists. Caller and local target content identities bind the edge. Older symbol-level evidence is distinguished as BINDS_IMPORT; CALLS retains its original closed grammar. Repeated identical caller/target import edges deduplicate deterministically.

Dynamic imports/import.meta, reexports, type-only declarations and import attributes remain unsupported. The lexical scanner stops at ambiguous slash/regexp or template tails, retains prior complete declarations, and reports the unscanned tail as unsupported. Thus imports after such a tail may remain UNKNOWN; this is not a complete ECMAScript parser. Comment and string contents never become source tokens. Import declaration boundaries are deliberately bounded; unsupported boundaries are recorded explicitly.

Package main/bin declarations and exports strings or flat literal subpath exports establish declared entrypoints only. Conditional/pattern exports are UNKNOWN. An exported function or index.js filename does not establish a library entrypoint. entrypointState is UNKNOWN when no admitted declaration establishes one. Main and exports declarations are represented as declarations, not a simulation of runtime precedence.

The only graph location remains coordinates.HOW.structuralGraph. The permanent r10o-e1-tests.cjs gate exercises these cases through normal fresh canonical bootstrap, validated reopen and capsule serialization.

## Retained call grammar

The source adapter supports a closed ESM subset: named imports with optional aliases, named (optionally exported) functions, simple parameters, literal/identifier arguments, direct calls and return statements. It validates the whole module against that grammar before admitting function/call relationships. Ambiguous bindings, assignment, dynamic member calls/imports, template/regex literals and other unsupported syntax yield UNKNOWN. Local calls resolve only to admitted exported definitions; both caller and callee hashes bind each cross-file edge. External imports are declarations with availability UNKNOWN. This is not a general JavaScript, TypeScript, Rust or Python parser.

package.json supplies declared CLI/library entrypoints, build/test commands and architecture-relevant imported dependencies. CI YAML is observed as a definition file; no jobs or success are inferred. Exact node:fs and node:child_process imports support persistence/execution API call-site roles. Parsing/analysis/service ownership is not guessed from module names. CALLS is a static call-site observation, not a reachability or execution claim.

## Bounds

Selection is nonrecursive metadata inspection of root, src, lib, bin, tests and .github/workflows. At most 128 entries per selected directory, 32 selected files, 64 KiB per file, 512 KiB aggregate, 160 nodes and 256 edges. Bounds fail closed. Unselected territory remains UNKNOWN. Paths reject absolute/escaping forms, case aliases and symlink/junction crossings. Binary and invalid UTF-8 files yield an explicit unknown; source bytes are never evaluated.

## Preservation and regression

The R2 rediscovery repair defers a same-identity route with an incompatible authority/dimension and avoids adding an incompatible directory-child route. Original validation remains strict. The old R9D holdout-named fixture reference is replaced by a newly authored neutral synthetic fixture without reading its source content; original control IDs/assertions are retained.

The permanent r10o-tests.cjs product gate exercises fresh synthetic files through normal packaged init/admission/reopen/capsule, without canonical fixture injection. The graph has no mutation, execution, intent, decision or completion authority. Full packaged regression and exact control-set reconciliation are recorded in the independent review bundle.

## Claim limits

No holdout reruns, cross-language coverage, real-world acquisition reduction, VS Code UI acceptance or independent review is claimed. Graph bytes and density are measured on the named synthetic product witness. HITO reads bounded admitted sources to derive a graph; this is engine acquisition, not a measured fresh-participant reacquisition experiment. Source TypeScript and distributed JavaScript are patched together; no TypeScript compiler build is claimed.
