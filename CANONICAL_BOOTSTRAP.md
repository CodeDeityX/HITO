# HITO Canonical Bootstrap

HITO separates initial observation from canonical continuity.

The public CLI entrypoint is:

```text
core/bin/hito.cjs
```

Initialize an explicit local project root:

```powershell
node .\core\bin\hito.cjs init "C:\path\to\project"
```

Initial canonical admission:

```powershell
node .\core\bin\hito.cjs intake --canonical --root "C:\path\to\project"
```

A later canonical intake should correspond to a genuine successor observation:

```powershell
node .\core\bin\hito.cjs intake --canonical --root "C:\path\to\project"
```

Read current governed state:

```powershell
node .\core\bin\hito.cjs status --root "C:\path\to\project"
node .\core\bin\hito.cjs next --root "C:\path\to\project"
node .\core\bin\hito.cjs why --root "C:\path\to\project"
node .\core\bin\hito.cjs mri --root "C:\path\to\project"
```

Continuity capsule:

```powershell
node .\core\bin\hito.cjs story --continuity-capsule --root "C:\path\to\project" --json
```

The accepted bootstrap is bounded. It does not claim complete structural
knowledge of arbitrary repositories.

The canonical persistence namespace remains `.maat/` in this release.
