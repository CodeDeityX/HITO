'use strict';
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const crypto=require('node:crypto');
const candidate=[path.resolve(__dirname,'../../../artifacts/hito-vscode-local-1.3.0-r9f.1-r7.vsix'),path.resolve(__dirname,'../../../hito-vscode-local-1.3.0-r9f.1-r7.vsix')].find(fs.existsSync);
function verify(receipt,candidatePath=candidate){if(!candidatePath||!fs.existsSync(candidatePath))return false;const sha=crypto.createHash('sha256').update(fs.readFileSync(candidatePath)).digest('hex').toUpperCase();return receipt?.executedAgainstExactCandidate===true&&receipt.candidateName===path.basename(candidatePath)&&String(receipt.candidateSha||'').toUpperCase()===sha;}
const receiptPath=path.resolve(__dirname,'../../../review/R9F_R7_DETACHED_PACKAGE_RECEIPT.json');
const receipt=fs.existsSync(receiptPath)?JSON.parse(fs.readFileSync(receiptPath,'utf8')):null;
if(receipt){assert.equal(verify(receipt),true,'DETACHED_RECEIPT_EXACT_CANDIDATE_PASS');assert.equal(verify({...receipt,candidateSha:'0'.repeat(64)}),false,'DETACHED_RECEIPT_WRONG_SHA_REJECTED');assert.equal(verify({...receipt,candidateName:'wrong.vsix'}),false,'DETACHED_RECEIPT_WRONG_FILENAME_REJECTED');assert.equal(verify({...receipt,executedAgainstExactCandidate:true,candidateSha:'0'.repeat(64)}),false,'DETACHED_RECEIPT_TRUE_BOOLEAN_CANNOT_OVERRIDE_SHA_MISMATCH');} else {assert.equal(verify(null),false,'DETACHED_RECEIPT_MISSING_CANDIDATE_UNAVAILABLE');}
assert.equal(verify(receipt,null),false,'DETACHED_RECEIPT_MISSING_CANDIDATE_UNAVAILABLE');
console.log(JSON.stringify({status:'PASS',controls:['DETACHED_RECEIPT_WRONG_SHA_REJECTED','DETACHED_RECEIPT_WRONG_FILENAME_REJECTED','DETACHED_RECEIPT_TRUE_BOOLEAN_CANNOT_OVERRIDE_SHA_MISMATCH','DETACHED_RECEIPT_MISSING_CANDIDATE_UNAVAILABLE','DETACHED_RECEIPT_EXACT_CANDIDATE_PASS']}));
