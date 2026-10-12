#!/usr/bin/env node
'use strict';
// Offline candidate launcher; no install, network access, or target execution.
const path=require('node:path'),Module=require('node:module');
if(process.env.HITO_DEPENDENCY_ROOT){process.env.NODE_PATH=process.env.HITO_DEPENDENCY_ROOT;Module._initPaths();}
const {execute,parse}=require('../phase0/cli/product-entry.cjs');
const {render}=require('../phase0/cli/human-output.cjs');
Promise.resolve().then(()=>{const {command,options,format}=parse(process.argv.slice(2));return execute(command,options).then(x=>process.stdout.write(render(command,x,format)));}).catch(e=>{process.stderr.write(JSON.stringify({status:'FAIL_CLOSED',error:e.message})+'\n');process.exitCode=1;});
