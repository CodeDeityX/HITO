'use strict';
// Module-declaration grammar is independent of the deliberately narrower call grammar.
// No evaluation, arbitrary package resolution, or interpretation of strings as code.
function scan(source){
 const tokens=[],unknowns=[];let i=0;
 while(i<source.length){const s=source.slice(i);let m;
  if((m=/^\s+/.exec(s))){i+=m[0].length;continue;}
  if(s.startsWith('//')){const n=source.indexOf('\n',i);i=n<0?source.length:n;continue;}
  if(s.startsWith('/*')){const n=source.indexOf('*/',i+2);if(n<0){unknowns.push({at:i,reason:'UNTERMINATED_COMMENT'});break;}i=n+2;continue;}
  if(s[0]==='"'||s[0]==="'"){const at=i,q=s[0];let raw='',escaped=false,closed=false;i++;while(i<source.length){const c=source[i++];if(c===q){closed=true;break;}if(c==='\n'||c==='\r')break;if(c==='\\'){escaped=true;raw+=c;if(i<source.length)raw+=source[i++];}else raw+=c;}if(!closed){unknowns.push({at,reason:'UNTERMINATED_STRING'});break;}tokens.push({kind:'string',v:raw,at,end:i,escaped});continue;}
  // Slash may begin a regexp and templates contain nested JS: stop rather than
  // misclassify their contents. Earlier complete declarations retain their evidence.
  if(s[0]==='`'||s[0]==='/'){unknowns.push({at:i,reason:s[0]==='`'?'UNSUPPORTED_TEMPLATE_SCAN_TAIL':'UNSUPPORTED_SLASH_SCAN_TAIL'});break;}
  if((m=/^[A-Za-z_$][\w$]*/.exec(s))){tokens.push({kind:'id',v:m[0],at:i,end:i+m[0].length});i+=m[0].length;continue;}
  tokens.push({kind:'punct',v:s[0],at:i,end:i+1});i++;
 }
 const declarations=[];let depth=[],lastDeclarationEnd=-1;
 for(let n=0;n<tokens.length;n++){
  const t=tokens[n];
  if(t.kind==='punct'&&'({['.includes(t.v)){depth.push(t.v);continue;}
  if(t.kind==='punct'&&')}]'.includes(t.v)){if(depth.pop()!==({')':'(',']':'[','}':'{'})[t.v]){unknowns.push({at:t.at,reason:'UNBALANCED_SOURCE'});break;}continue;}
  if(t.kind!=='id'||t.v!=='import')continue;
  if(tokens[n+1]?.v==='('||tokens[n+1]?.v==='.'){unknowns.push({at:t.at,reason:'DYNAMIC_IMPORT_OR_META_UNSUPPORTED'});continue;}
  if(depth.length){unknowns.push({at:t.at,reason:'NON_TOP_LEVEL_IMPORT_UNSUPPORTED'});continue;}
  const prev=tokens[n-1];
  if(prev&&n!==lastDeclarationEnd&&!(prev.kind==='punct'&&[';','}'].includes(prev.v))){unknowns.push({at:t.at,reason:'IMPORT_DECLARATION_BOUNDARY_UNSUPPORTED'});continue;}
  let j=n+1;const bindings=[];
  const take=v=>{const x=tokens[j++];if(!x||(v&&(x.v!==v||x.kind!==(/^[A-Za-z]/.test(v)?'id':'punct'))))throw Error('UNSUPPORTED_IMPORT_GRAMMAR');return x;};
  const identifier=()=>{const x=take();if(x.kind!=='id'||['type','typeof','from','as','default','import','export','await','yield','break','case','catch','class','const','continue','debugger','delete','do','else','enum','extends','false','finally','for','function','if','in','instanceof','let','new','null','return','super','switch','this','throw','true','try','var','void','while','with','implements','interface','package','private','protected','public','static'].includes(x.v))throw Error('TYPE_ONLY_OR_UNSUPPORTED_BINDING');return x.v;};
  function named(){take('{');if(tokens[j]?.v!=='}'){while(true){const imported=identifier();let local=imported;if(tokens[j]?.v==='as'){take('as');local=identifier();}bindings.push({kind:'NAMED',imported,local});if(tokens[j]?.v!==',')break;take(',');if(tokens[j]?.v==='}')break;}}take('}');}
  function namespace(){take('*');take('as');bindings.push({kind:'NAMESPACE',local:identifier()});}
  try{
   let spec;
   if(tokens[j]?.kind==='string'){spec=take();}
   else{
    if(tokens[j]?.v==='{')named();else if(tokens[j]?.v==='*')namespace();else{bindings.push({kind:'DEFAULT',imported:'default',local:identifier()});if(tokens[j]?.v===','){take(',');if(tokens[j]?.v==='{')named();else namespace();}}
    take('from');spec=take();if(spec.kind!=='string')throw Error('SPECIFIER_REQUIRED');
   }
   if(spec.escaped||!spec.v||/[\u0000-\u001f\\]/.test(spec.v))throw Error('ESCAPED_OR_INVALID_SPECIFIER_UNSUPPORTED');
   if(new Set(bindings.map(b=>b.local)).size!==bindings.length)throw Error('DUPLICATE_IMPORT_BINDING');
   const stoppedAt=unknowns.find(u=>Number.isInteger(u.at)&&u.at>=spec.end)?.at;
   if(!tokens[j]&&stoppedAt!==undefined&&!/[\r\n]/.test(source.slice(spec.end,stoppedAt)))throw Error('IMPORT_TERMINATOR_UNSUPPORTED');
   const next=tokens[j];if(next?.v==='with'||next?.v==='assert')throw Error('IMPORT_ATTRIBUTES_UNSUPPORTED');
   if(next?.v===';')j++;else if(next&&!/[\r\n]/.test(source.slice(spec.end,next.at)))throw Error('IMPORT_TERMINATOR_UNSUPPORTED');
   declarations.push({specifier:spec.v,at:t.at,end:spec.end,bindings,kind:bindings.length?'STATIC_IMPORT':'SIDE_EFFECT_IMPORT'});
   n=j-1;lastDeclarationEnd=j;
  }catch(e){unknowns.push({at:t.at,reason:e.message});}
 }
 if(tokens.some((t,i)=>t.kind==='id'&&t.v==='export'&&['{','*'].includes(tokens[i+1]?.v)))unknowns.push({reason:'EXPORT_LIST_OR_REEXPORT_UNSUPPORTED'});
 return {declarations,unknowns};
}
module.exports={scan};
