# Third-Party Notices

The Git source tree does not vendor `node_modules`.

The reproducible public release dependency lock was generated during the
R4 fresh-install qualification and is committed as `package-lock.json`.

Packaged runtime dependencies verified in R4 include:

| Package | Version | License |
| --- | ---: | --- |
| ajv | 8.17.1 | MIT |
| ajv-formats | 3.0.1 | MIT |
| fast-deep-equal | 3.1.3 | MIT |
| fast-uri | 3.1.8 | BSD-3-Clause |
| json-schema-traverse | 1.0.0 | MIT |
| require-from-string | 2.0.2 | MIT |

`@vscode/vsce` 4.0.0 is an MIT-licensed development and packaging dependency.
It is recorded in the lockfile but is not part of HITO runtime authority.

The R4-qualified VSIX preserved the applicable runtime dependency license
files, including the licenses for `ajv`, `ajv-formats`, `fast-deep-equal`,
`fast-uri`, `json-schema-traverse`, and `require-from-string`.

The complete dependency graph for a particular checkout is governed by the
committed `package-lock.json` and the original license terms of each package.
