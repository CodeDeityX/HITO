'use strict';
const vscode=require('vscode'),{performance}=require('node:perf_hooks');
const {HitoTreeProvider}=require('../dist/extension/tree/hito-tree.js');
const model=require('./live-model.cjs'),client=require('./live-client.cjs');
const VIEWS=[['hito.projectPulse','PROJECT_PULSE'],['hito.next','NEXT'],['hito.evidence','EVIDENCE'],['hito.history','HISTORY'],['hito.protected','PROTECTED'],['hito.runtime','RUNTIME'],['hito.agentContext','AGENT_CONTEXT']];
const COMMANDS={overview:'OVERVIEW',status:'PROJECT_PULSE',guided:'GUIDED',engineer:'ENGINEER',forensic:'FORENSIC',takeover:'TAKEOVER',ask:'ASK',next:'NEXT',why:'WHY',mri:'MRI',map:'MAP',evidence:'EVIDENCE',history:'HISTORY',protected:'PROTECTED',agentContext:'AGENT_CONTEXT'};
function activate(context){
 const started=performance.now();let projection,reason='Use HITO: Refresh to read the selected project.',serial=0;
 const panels=new Map(),providers=[];const dummy={kind:'UNAVAILABLE',reason:'Live projection',semanticStatusAsserted:false};
 const status=vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left,40);status.text='HITO // Not known yet';status.command='hito.status';status.show();context.subscriptions.push(status);
 function overviewContext(){const roots=(vscode.workspace.workspaceFolders??[]).filter(f=>f.uri.scheme==='file').map(f=>f.uri.fsPath);const explicit=vscode.workspace.getConfiguration('hito').get('root','').trim();return {selectedRoot:explicit||(roots.length===1?roots[0]:undefined),cliPath:require('node:path').resolve(__dirname,'../core/bin/hito.cjs')};}
 function render(section){return section==='OVERVIEW'?require('./project-overview.cjs').html(projection,reason,overviewContext()):model.html(section,projection,reason);}
 function publish(){for(const p of providers)p.update(dummy);for(const [s,p]of panels)p.webview.html=render(s);status.text=projection?'HITO // '+require('./guided-model.cjs').derive(projection).observationStatusBar:'HITO // Not known yet';status.tooltip=projection?projection.activeRoot:reason;}
 for(const [id,section]of VIEWS){const p=new HitoTreeProvider(section,dummy,()=>model.nodes(section,projection,reason));providers.push(p);context.subscriptions.push(p,vscode.window.registerTreeDataProvider(id,p));}
 async function refresh(){const run=++serial,begin=performance.now();projection=undefined;reason='Reading accepted HITO core…';publish();
  try{if(vscode.workspace.isTrusted===false)throw Error('WORKSPACE_UNTRUSTED');const roots=(vscode.workspace.workspaceFolders??[]).map(f=>{if(f.uri.scheme!=='file')throw Error('LOCAL_FILE_WORKSPACE_REQUIRED');return f.uri.fsPath;});
   const config=vscode.workspace.getConfiguration('hito');const explicit=config.get('root','').trim(),composition=config.get('composition','').trim();
   if(!roots.length&&!explicit)throw Error('EXPLICIT_ROOT_REQUIRED');
   const options={cwd:roots[0]||explicit,workspaceRoots:roots};if(explicit)options.explicit=explicit;if(composition)options.composition=composition;
   const p=await client.readCurrent(options);if(run!==serial)return;p.metrics.timeToFirstProjectPulseMs=performance.now()-begin;projection=p;reason=undefined;publish();
  }catch(e){if(run!==serial)return;projection=undefined;reason=e.message;publish();}
 }
 function open(section){let panel=panels.get(section);if(!panel){panel=vscode.window.createWebviewPanel('hito.live.'+section,'HITO // '+section.replaceAll('_',' '),vscode.ViewColumn.One,{enableScripts:false,localResourceRoots:[],...(section==='OVERVIEW'?{enableCommandUris:[...require('./project-overview.cjs').ACTIONS]}:{})});panels.set(section,panel);context.subscriptions.push(panel,panel.onDidDispose(()=>panels.delete(section)));}else panel.reveal();panel.webview.html=render(section);}
 for(const [command,section]of Object.entries(COMMANDS))context.subscriptions.push(vscode.commands.registerCommand('hito.'+command,()=>open(section)));
 context.subscriptions.push(vscode.commands.registerCommand('hito.refresh',refresh));
 const invalidate=()=>{serial++;projection=undefined;reason='Root or configuration changed. Refresh required.';publish();};
 context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e=>{if(e.affectsConfiguration('hito'))invalidate();}),vscode.workspace.onDidChangeWorkspaceFolders(invalidate));
 publish();return {refresh,getProjection:()=>projection,getReason:()=>reason,activationMs:performance.now()-started};
}
module.exports={activate,deactivate(){},VIEWS,COMMANDS};
