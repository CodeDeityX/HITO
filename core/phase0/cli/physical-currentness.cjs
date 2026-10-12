'use strict';

// Shared physical identity contract. Text availability is intentionally not
// part of identity: unavailable projections can still bind the bytes observed.
const SHA256 = /^[0-9a-f]{64}$/i;

function normalizedPath(value) {
  if (typeof value !== 'string' || !value || value.includes(':') || value.startsWith('/') || value.startsWith('\\')) return null;
  const normalized = value.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/^\.\//, '');
  const parts = normalized.split('/');
  if (!normalized || parts.some(part => !part || part === '.' || part === '..')) return null;
  return normalized;
}

function physicalIdentity(observation) {
  const path = normalizedPath(observation?.path);
  const hash = observation?.contentSha256;
  const bytes = observation?.bytes;
  if (!path || typeof hash !== 'string' || !SHA256.test(hash) || !Number.isSafeInteger(bytes) || bytes < 0) return null;
  return { path, bytes, contentSha256: hash.toLowerCase() };
}

function comparePhysicalIdentity(prior, current) {
  if (prior?.currentness === 'STALE' || prior?.identityFreshness === 'STALE' || current?.identityFreshness === 'STALE') {
    return { state: 'UNKNOWN', reason: 'STALE_PRIOR_PHYSICAL_IDENTITY' };
  }
  const priorPath = normalizedPath(prior?.path);
  const currentPath = normalizedPath(current?.path);
  if (priorPath && currentPath && priorPath !== currentPath) {
    return { state: 'CHANGED', reason: 'PHYSICAL_PATH_IDENTITY_CHANGED' };
  }
  const before = physicalIdentity(prior);
  const after = physicalIdentity(current);
  if (!before || !after) return { state: 'UNKNOWN', reason: 'COMPARABLE_PHYSICAL_IDENTITY_UNAVAILABLE' };
  if (before.bytes !== after.bytes || before.contentSha256 !== after.contentSha256) {
    return { state: 'CHANGED', reason: 'PHYSICAL_BYTE_IDENTITY_CHANGED' };
  }
  return { state: 'UNCHANGED', reason: 'PHYSICAL_BYTE_IDENTITY_EQUAL' };
}

function observeBytes(value, sha) {
  if (typeof sha !== 'function') throw new TypeError('PHYSICAL_IDENTITY_SHA256_REQUIRED');
  const bytes = Buffer.from(value);
  const contentSha256 = sha(bytes);
  const content = bytes.toString('utf8');
  const identity = { contentSha256, bytes: bytes.length };
  if (bytes.includes(0) || !Buffer.from(content, 'utf8').equals(bytes)) {
    return { state: 'UNAVAILABLE', reason: 'NON_TEXT_OR_INVALID_UTF8', ...identity };
  }
  return { state: 'OBSERVED', content, ...identity };
}

module.exports = { normalizedPath, physicalIdentity, comparePhysicalIdentity, observeBytes };
