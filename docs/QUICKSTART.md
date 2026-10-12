# HITO Quick Start

## Requirements

For the first public release candidate:

- Windows is the primary qualified environment.
- Node.js 22+ is recommended for the complete packaging workflow.
- VS Code 1.90+ is required for the extension.

From the HITO repository root:

```powershell
npm install
npm test
```

Initialize an explicit project:

```powershell
node .\core\bin\hito.cjs init "C:\Projects\example"
```

Initial canonical admission:

```powershell
node .\core\bin\hito.cjs intake --canonical --root "C:\Projects\example"
```

Read current project state:

```powershell
node .\core\bin\hito.cjs status --root "C:\Projects\example"
node .\core\bin\hito.cjs next --root "C:\Projects\example"
node .\core\bin\hito.cjs why --root "C:\Projects\example"
node .\core\bin\hito.cjs mri --root "C:\Projects\example"
```

Package the VS Code release candidate:

```powershell
npm run package:vsix
```

Expected output:

```text
dist-release/hito-0.1.0-rc.1.vsix
```

The final public push is gated on a fresh install/regression, a real VS Code
human acceptance check, and replacement of the temporary glyph with the
canonical HITO Frog asset.
