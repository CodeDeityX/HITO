'use strict';

function dimensionState(truth, names) {
  const dimensions = truth?.coverage?.dimensions ?? truth?.unknowns ?? {};
  const rows = names.map(name => dimensions[name]).filter(Boolean);
  if (!rows.length) return 'UNKNOWN';
  const states = rows.map(row => typeof row === 'string' ? row : row.state ?? 'UNKNOWN');
  if (states.includes('CONFLICTED') || states.includes('CONTRADICTED')) return 'CONFLICTED';
  if (states.includes('STALE')) return 'STALE';
  if (states.some(state => ['UNKNOWN', 'INDETERMINATE', 'UNAVAILABLE', 'NOT_OBSERVED'].includes(state))) return 'UNKNOWN';
  return states.every(state => ['VERIFIED', 'OBSERVED', 'SUPPORTED'].includes(state)) ? 'SUPPORTED' : 'PARTIAL';
}

function deriveFourCoordinates(truth) {
  if (!truth || typeof truth.semanticResultIdentity !== 'string') throw Error('R2_COORDINATE_TRUTH_REQUIRED');
  const freshness = truth.freshness?.state ?? truth.continuityMode ?? 'UNKNOWN';
  const facts = truth.qualifiedSemanticFacts?.facts ?? [];
  const has = keys => facts.some(f => keys.includes(f.key));
  const coordinate = (names, keys) => {
    const state = dimensionState(truth, names);
    if (state === 'CONFLICTED' || state === 'STALE' || state === 'SUPPORTED') return state;
    return state === 'PARTIAL' || has(keys) ? 'PARTIALLY_ESTABLISHED' : 'UNKNOWN';
  };
  return {
    kind: 'HITO_DERIVED_FOUR_COORDINATE_PROJECTION_R1',
    canonical: false,
    semanticResultIdentity: truth.semanticResultIdentity,
    coordinates: {
      WHAT: { state: coordinate(['declaredIntent', 'projectMetadata'], ['documentaryPurpose','documentedCapabilityClaim','projectIdentity','projectVersion']), sourceDimensions: ['declaredIntent', 'projectMetadata'] },
      HOW: { state: coordinate(['runtime', 'configuration', 'workspace', 'ownership'], ['runtimeRequirement','buildTarget','goRequirement','toolchainRequirement','build-system.build-backend','observedModuleDirectory']), sourceDimensions: ['runtime', 'configuration', 'workspace', 'ownership'] },
      RESULT: { state: coordinate(['behavior', 'tests', 'evidence', 'currentness'], ['testDefinitionObserved','dependency','devDependencies','dependencies','documentedCapabilityClaim']), sourceDimensions: ['behavior', 'tests', 'evidence', 'currentness'] },
      CONTINUITY: { state: ['STALE', 'STALE_BOUNDED_EVIDENCE'].includes(freshness) ? 'STALE' : facts.length ? 'PARTIALLY_ESTABLISHED' : (['UNKNOWN','UNAVAILABLE','INDETERMINATE'].includes(freshness) ? 'UNKNOWN' : freshness), source: 'existing bounded continuity/freshness fields and admitted-fact presence' }
    },
    authority: { ownsTruth: false, executionAuthority: false, nextStepAuthority: false }
  };
}

module.exports = { deriveFourCoordinates, dimensionState };
