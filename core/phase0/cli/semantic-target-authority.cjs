'use strict';
// Capability describes what an acquisition adapter can establish, not caller permission.
// The production byte reader always uses OFFLINE; stronger capabilities are ranking fixtures only.
const OFFLINE=Object.freeze({mode:'OFFLINE_READ_ONLY',maximumAdmissibleAuthority:Object.freeze(['DOCUMENTARY_EVIDENCE_ONLY','STRUCTURAL_DECLARATION','PHYSICAL_OBSERVATION']),establishableDimensions:Object.freeze(['continuity','projectMetadata','workspace','structure','architecture','status','runtime','configuration','evidence','declaredIntent','ownership','integration']),executionAuthority:false,mutatingCommand:null});
function align(edge,capability=OFFLINE){
 const potential=[...(edge.potentialSemanticDimensions??edge.targetSemanticDimensions)];
 const admissible=potential.filter(d=>capability.establishableDimensions.includes(d));
 return {potentialSemanticDimensions:potential,currentlyAdmissibleSemanticDimensions:admissible,activeAcquisitionMode:capability.mode,maximumAdmissibleAuthority:[...capability.maximumAdmissibleAuthority],semanticTargetEligibility:potential.map(d=>({dimension:d,eligible:admissible.includes(d),reason:admissible.includes(d)?'ADAPTER_CAN_ESTABLISH_BOUNDED_SUPPORT':'OUTSIDE_ACTIVE_ACQUISITION_CAPABILITY'}))};
}
module.exports={OFFLINE,align};
