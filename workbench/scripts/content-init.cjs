'use strict';
const path=require('node:path'),os=require('node:os');const {initialize}=require('../src/content/client.cjs');
initialize(process.env.STUDIO_STATE_DIR||path.join(os.homedir(),'Library/Application Support/内容工作室')).then(result=>console.log(JSON.stringify({ok:true,tables:result}))).catch(error=>{console.error(error.message);process.exitCode=1;});
