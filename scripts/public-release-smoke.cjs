'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

function fail(message) {
  throw new Error(message);
}

function read(rel) {
  return fs.readFileSync(path.join(root, ...rel.split('/')), 'utf8');
}

const required = [
  'README.md',
  'LICENSE',
  'NOTICE',
  'AUTHORS.md',
  'CITATION.cff',
  'CONTRIBUTING.md',
  'GOVERNANCE.md',
  'SECURITY.md',
  'CODE_OF_CONDUCT.md',
  'TRADEMARKS.md',
  'ROADMAP.md',
  'THIRD_PARTY_NOTICES.md',
  'docs/QUICKSTART.md',
  'docs/ARCHITECTURE.md',
  'docs/LIMITATIONS.md',
  'docs/BRAND.md',
  'docs/RESEARCH.md',
  'docs/HUMAN_ACCEPTANCE.md',
  'core/bin/hito.cjs',
  'core/phase0/cli/product-entry.cjs',
  'live/live-extension.cjs',
  'media/hito.svg',
  'media/hito-frog-master.png',
  'media/hito-512.png',
  'media/hito-256.png',
  'media/hito-128.png',
  'media/hito-64.png',
  'media/hito-32.png',
  '.gitignore',
  '.vscodeignore'
];

for (const rel of required) {
  if (!fs.existsSync(path.join(root, ...rel.split('/')))) {
    fail('PUBLIC_REQUIRED_FILE_MISSING_' + rel);
  }
}

// A normal developer checkout is allowed to contain .git and node_modules.
// The release-source cleanliness rule belongs to the frozen source manifest
// and packaging gates, not to ordinary `npm test`.
const gitignore = read('.gitignore');
if (!/(^|\n)node_modules\/(\n|$)/.test(gitignore)) {
  fail('GITIGNORE_NODE_MODULES_RULE_MISSING');
}

if (fs.existsSync(path.join(root, 'core', 'tests', 'fixtures', 'r9d-viselect'))) {
  fail('OBSOLETE_R9D_VISELECT_FIXTURE_PRESENT');
}

const pkg = JSON.parse(read('package.json'));

if (pkg.name !== 'hito') fail('PUBLIC_PACKAGE_NAME');
if (pkg.displayName !== 'HITO') fail('PUBLIC_DISPLAY_NAME');
if (pkg.version !== '0.1.0') fail('PUBLIC_EXTENSION_VERSION');
if (pkg.publisher !== 'CodeDeityX') fail('PUBLIC_PUBLISHER');
if (pkg.license !== 'Apache-2.0') fail('PUBLIC_LICENSE');
if (pkg.icon !== 'media/hito-128.png') fail('PUBLIC_ICON');

if (
  pkg.repository?.url !==
  'https://github.com/CodeDeityX/HITO.git'
) {
  fail('PUBLIC_REPOSITORY');
}

if (pkg.dependencies?.ajv !== '8.17.1') {
  fail('AJV_VERSION');
}

if (pkg.dependencies?.['ajv-formats'] !== '3.0.1') {
  fail('AJV_FORMATS_VERSION');
}

if (pkg.devDependencies?.['@vscode/vsce'] !== '4.0.0') {
  fail('VSCE_VERSION');
}

process.stdout.write(
  JSON.stringify({
    status: 'PASS',
    schema: 'hito.public-release.static-smoke.v2',
    package: pkg.name,
    extensionVersion: pkg.version,
    publisher: pkg.publisher,
    license: pkg.license,
    workingTreeGitAllowed: true,
    workingTreeNodeModulesAllowed: true,
    obsoleteFixturePresent: false,
    hitoExecuted: false
  }) + '\n'
);
