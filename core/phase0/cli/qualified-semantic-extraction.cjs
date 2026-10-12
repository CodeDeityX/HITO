'use strict';
// Deterministic projection over bytes already admitted by the existing R2 acquisition path.
// This module performs no I/O and grants no canonical, execution, intent, or next-step authority.
const crypto = require('node:crypto');

const EXTRACTOR = 'hito.qualified-semantic-extraction';
const VERSION = '1.0.0';
const LIMITS = Object.freeze({
  factsPerArtifact: 16, factBytes: 4096, documentaryExcerptBytes: 320,
  modules: 24, tests: 24, dependencies: 24, totalFacts: 96, totalBytes: 65536
});
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const clean = value => String(value).replace(/[\x00-\x1f\x7f-\x9f\u2028\u2029]/g, ' ').trim();
const bounded = (value, max) => {
  const s = clean(value);
  if (Buffer.byteLength(s, 'utf8') <= max) return s;
  return Buffer.from(s, 'utf8').subarray(0, max).toString('utf8').replace(/\uFFFD$/, '');
};
function makeFact(artifact, key, value, authority, verification, extractorVersion = VERSION) {
  const sourceArtifactIdentity = artifact.artifactIdentity;
  const sourceContentIdentity = artifact.contentSha256;
  if (!sourceArtifactIdentity || !sourceContentIdentity) return null;
  const fact = {
    key, value, authority, verification, sourceArtifactIdentity, sourceContentIdentity,
    sourcePath: artifact.path, extractorIdentity: EXTRACTOR, extractorVersion,
    canonicalAuthority: false, acceptedIntent: false, mutationAuthority: false, executionAuthority: false
  };
  fact.factIdentity = `qualified-fact:${sha(Buffer.from(JSON.stringify(fact)))}`;
  return fact;
}
function add(out, artifact, key, value, authority, verification) {
  if (out.length >= LIMITS.factsPerArtifact || out.length >= LIMITS.totalFacts) return;
  const fact = makeFact(artifact, key, value, authority, verification);
  if (fact && Buffer.byteLength(JSON.stringify(fact), 'utf8') <= LIMITS.factBytes) out.push(fact);
}
function parsePackageJson(text) {
  try {
    const p = JSON.parse(text), out = [];
    for (const key of ['name', 'version', 'description', 'engines', 'scripts', 'dependencies', 'devDependencies']) {
      if (Object.hasOwn(p, key)) out.push([key, p[key]]);
    }
    return out;
  } catch { return []; }
}
function parseSimpleToml(text) {
  const out = []; let section = '';
  for (const raw of text.split(/\r?\n/).slice(0, 256)) {
    const line = raw.trim();
    const header = /^\[([A-Za-z0-9_.-]+)\]$/.exec(line);
    if (header) { section = header[1]; continue; }
    const m = /^([A-Za-z][A-Za-z0-9_-]*)\s*=\s*(["'])([^"'\r\n]{1,256})\2\s*(?:#.*)?$/.exec(line);
    if (m && ['project', 'build-system'].includes(section) && ['name', 'version', 'description', 'requires-python', 'build-backend'].includes(m[1])) out.push([`${section}.${m[1]}`, m[3]]);
  }
  return out;
}
function parseCargoToml(text) {
  const out = []; let section = '';
  for (const raw of text.split(/\r?\n/).slice(0, 256)) {
    const line = raw.trim(), h = /^\[([A-Za-z0-9_.-]+)\]$/.exec(line);
    if (h) { section = h[1]; continue; }
    const m = /^([A-Za-z][A-Za-z0-9_-]*)\s*=\s*(["'])([^"'\r\n]{1,256})\2\s*(?:#.*)?$/.exec(line);
    if (m && section === 'package' && ['name', 'version', 'description', 'rust-version', 'edition'].includes(m[1])) out.push([`package.${m[1]}`, m[3]]);
  }
  return out;
}
function parseGoMod(text) {
  const out = []; let inRequireBlock = false;
  for (const raw of text.split(/\r?\n/).slice(0, 256)) {
    const line = raw.trim(); let m;
    if (inRequireBlock) {
      if (line === ')') { inRequireBlock = false; continue; }
      if ((m = /^([^\s]+)\s+([^\s]+)$/.exec(line))) out.push(['dependency', `${m[1]} ${m[2]}`]);
      continue;
    }
    if (/^require\s*\($/.test(line)) { inRequireBlock = true; continue; }
    if ((m = /^module\s+([^\s]+)$/.exec(line))) out.push(['modulePath', m[1]]);
    else if ((m = /^go\s+([0-9]+(?:\.[0-9]+){1,2})$/.exec(line))) out.push(['goRequirement', m[1]]);
    else if ((m = /^toolchain\s+(go[0-9]+(?:\.[0-9]+){1,2})$/.exec(line))) out.push(['toolchainRequirement', m[1]]);
    else if ((m = /^require\s+([^\s]+)\s+([^\s]+)$/.exec(line))) out.push(['dependency', `${m[1]} ${m[2]}`]);
  }
  return out;
}
function directoryObservation(artifact) {
  const accounting = artifact?.directoryAccounting;
  if (artifact?.authority !== 'PHYSICAL_OBSERVATION' || !accounting || accounting.directoriesExamined !== 1 ||
      !Number.isSafeInteger(accounting.entriesExamined) || accounting.entriesExamined < 0 || accounting.entriesExamined > 64) return null;
  const identity = String(artifact.path || '');
  // R2 persists root-confined identities (for example "src" or the root marker ".").
  // A typed R2 observation record, not path spelling, establishes directory kind.
  if (!identity || identity.endsWith('/') || (identity !== '.' && identity.split('/').some(part => !part || part === '.' || part === '..'))) return null;
  let document;
  try { document = JSON.parse(artifact.content); } catch { return null; }
  if (!document || typeof document !== 'object' || !Array.isArray(document.entries) || typeof document.truncated !== 'boolean' ||
      document.entries.length !== accounting.entriesExamined) return null;
  const names = new Set();
  for (const entry of document.entries) {
    if (!entry || typeof entry.name !== 'string' || !entry.name || entry.name === '.' || entry.name === '..' ||
        /[\\/\x00-\x1f\x7f]/.test(entry.name) || !['FILE','DIRECTORY','LINK','OTHER'].includes(entry.type) || names.has(entry.name)) return null;
    names.add(entry.name);
  }
  return { identity, entries: document.entries, partial: true };
}
function documentary(text, artifact, out) {
  const lines = text.split(/\r?\n/).slice(0, 48);
  const title = lines.find(line => /^#\s+\S/.test(line))?.replace(/^#+\s*/, '');
  const prose = lines.find(line => line.trim() && !/^\s*(#|[-*+`] |\d+\.)/.test(line));
  const excerpt = bounded(prose || title || '', LIMITS.documentaryExcerptBytes);
  if (excerpt) add(out, artifact, 'documentaryPurpose', excerpt, 'DOCUMENTARY_EVIDENCE_ONLY', 'NOT_VERIFIED');
  let count = 0;
  for (const line of lines) {
    const m = /^\s*[-*+]\s+(.{1,240})$/.exec(line);
    if (!m || count >= 3) continue;
    add(out, artifact, 'documentedCapabilityClaim', bounded(m[1], LIMITS.documentaryExcerptBytes), 'DOCUMENTARY_EVIDENCE_ONLY', 'NOT_VERIFIED'); count++;
  }
}
function extractArtifact(artifact) {
  if (!artifact || artifact.state !== 'OBSERVED' || typeof artifact.content !== 'string' || !artifact.artifactIdentity || !artifact.contentSha256) return [];
  if (sha(Buffer.from(artifact.content, 'utf8')) !== artifact.contentSha256) return [];
  const out = [], path = String(artifact.path || ''), text = artifact.content;
  if (/^(?:README|readme)(?:\.[^/]*)?$/.test(path.split('/').at(-1))) documentary(text, artifact, out);
  if (path === 'package.json') {
    for (const [key, value] of parsePackageJson(text)) {
      const authority = key === 'description' ? 'DOCUMENTARY_EVIDENCE_ONLY' : 'STRUCTURAL_DECLARATION';
      add(out, artifact, key === 'name' ? 'projectIdentity' : key === 'version' ? 'projectVersion' : key === 'description' ? 'documentaryPurpose' : key === 'engines' ? 'runtimeRequirement' : key === 'scripts' ? 'buildAndTestDeclarations' : key, value, authority, authority === 'STRUCTURAL_DECLARATION' ? 'STRUCTURALLY_SUPPORTED' : 'NOT_VERIFIED');
      if (['dependencies','devDependencies'].includes(key) && value && typeof value === 'object') for (const [name, version] of Object.entries(value).slice(0, LIMITS.dependencies)) add(out, artifact, 'dependencyDeclaration', `${name} ${String(version)}`, authority, 'DECLARED_NOT_AVAILABLE_OR_VERIFIED');
    }
  } else if (path === 'pyproject.toml') {
    for (const [key, value] of parseSimpleToml(text)) add(out, artifact, key, value, key === 'project.description' ? 'DOCUMENTARY_EVIDENCE_ONLY' : 'STRUCTURAL_DECLARATION', key === 'project.description' ? 'NOT_VERIFIED' : 'STRUCTURALLY_SUPPORTED');
  } else if (path === 'Cargo.toml') {
    for (const [key, value] of parseCargoToml(text)) add(out, artifact, key, value, key === 'package.description' ? 'DOCUMENTARY_EVIDENCE_ONLY' : 'STRUCTURAL_DECLARATION', key === 'package.description' ? 'NOT_VERIFIED' : 'STRUCTURALLY_SUPPORTED');
  } else if (path === 'go.mod') {
    for (const [key, value] of parseGoMod(text)) add(out, artifact, key, value, 'STRUCTURAL_DECLARATION', 'STRUCTURALLY_SUPPORTED');
  }
  if (/^(?:Makefile|GNUmakefile|Dockerfile|CMakeLists\.txt|[^/]+\.mk|build\.gradle(?:\.kts)?)$/.test(path)) {
    const declarations = [];
    for (const raw of text.split(/\r?\n/).slice(0, 256)) {
      let m;
      if ((m = /^([A-Za-z0-9_.-]{1,80}):(?:\s|$)/.exec(raw))) declarations.push(['buildTarget', m[1]]);
      else if ((m = /^\s*(FROM|WORKDIR|CMD|ENTRYPOINT)\s+(.{1,160})$/i.exec(raw))) declarations.push([`container.${m[1].toLowerCase()}`, bounded(m[2], 160)]);
    }
    for (const [key, value] of declarations.slice(0, 8)) add(out, artifact, key, value, 'STRUCTURAL_DECLARATION', 'STRUCTURALLY_SUPPORTED');
  }
  const base = path.split('/').at(-1);
  if (/^(?:tests?|spec)(?:\/|$)/i.test(path) || /(?:_test|\.test|\.spec)\.(?:go|py|js|jsx|ts|tsx|rs|java|c|cc|cpp|h|hpp)$/.test(base)) add(out, artifact, 'testDefinitionObserved', path, 'PHYSICAL_OBSERVATION', 'PHYSICALLY_OBSERVED_NOT_EXECUTED');
  const directory = directoryObservation(artifact);
  if (directory) {
    add(out, artifact, 'observedModuleDirectory', bounded(directory.identity, 160), 'PHYSICAL_OBSERVATION', 'PARTIAL_BOUNDED_OBSERVATION');
    for (const entry of directory.entries.filter(e => e.type === 'DIRECTORY').slice(0, LIMITS.modules - 1)) {
      add(out, artifact, 'observedModuleDirectory', bounded(`${directory.identity}/${entry.name}`, 160), 'PHYSICAL_OBSERVATION', 'PARTIAL_BOUNDED_OBSERVATION');
    }
  }
  return out.slice(0, LIMITS.factsPerArtifact);
}
function extract(artifacts) {
  if (!Array.isArray(artifacts)) return { schema: 'HITO_QUALIFIED_SEMANTIC_FACTS_R1', facts: [], limits: LIMITS, complete: true };
  const facts = []; let truncated = false;
  for (const artifact of artifacts) {
    const beforeArtifact = facts.length;
    const extracted = extractArtifact(artifact);
    if (extracted.length >= LIMITS.factsPerArtifact) truncated = true;
    for (const fact of extracted) {
      if (facts.length >= LIMITS.totalFacts) { truncated = true; break; }
      if (Buffer.byteLength(JSON.stringify(facts.concat(fact)), 'utf8') > LIMITS.totalBytes) { truncated = true; break; }
      facts.push(fact);
    }
    if (facts.length >= LIMITS.totalFacts) { if (artifacts.indexOf(artifact) < artifacts.length - 1 || extracted.length > facts.length - beforeArtifact) truncated = true; break; }
  }
  return { schema: 'HITO_QUALIFIED_SEMANTIC_FACTS_R1', extractorIdentity: EXTRACTOR, extractorVersion: VERSION, facts, limits: LIMITS, complete: !truncated };
}
function verify(facts, artifacts) {
  const byId = new Map((artifacts || []).map(a => [a.artifactIdentity, a]));
  return (facts || []).every(f => {
    const a = byId.get(f.sourceArtifactIdentity);
    return !!a && a.state === 'OBSERVED' && a.contentSha256 === f.sourceContentIdentity && sha(Buffer.from(a.content, 'utf8')) === f.sourceContentIdentity && extractArtifact(a).some(x => x.factIdentity === f.factIdentity);
  });
}
module.exports = { EXTRACTOR, VERSION, LIMITS, extract, extractArtifact, verify, parsePackageJson, parseSimpleToml, parseCargoToml, parseGoMod, directoryObservation };
