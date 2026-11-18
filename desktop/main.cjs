'use strict';
const { app, BrowserWindow, shell } = require('electron');
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const ROOT = path.resolve(__dirname, '..');
const MIME = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml'};
const REMOTE_STATUS = process.env.ARJWAN_CONTROL_STATUS_URL || '';
let server;
let port;

function send(res, status, object) {
  res.writeHead(status, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Access-Control-Allow-Origin':'http://127.0.0.1'});
  res.end(JSON.stringify(object));
}
async function offlineReport() {
  const { APPS, SERVICES, REPOS } = await import(pathToFileURL(path.join(ROOT,'shared','apps.js')).href);
  return {
    checkedAt: null, offline: true, cached: false,
    summary: {total: APPS.length,up:0,down:0,unpublished:0},
    apps: APPS.map(a=>({...a,status:'unknown',httpStatus:0})),
    services: SERVICES.map(s=>({...s,status:'unknown',httpStatus:0})),
    repos: REPOS.map(repo=>({repo,ok:false,offline:true}))
  };
}

async function localOnlineReport() {
  const { APPS, SERVICES, REPOS } = await import(pathToFileURL(path.join(ROOT,'shared','apps.js')).href);
  const probe=async (url) => {
    if(!url) return {ok:false,httpStatus:0,latencyMs:0};
    const start=Date.now();
    try {
      const result=await fetch(url,{signal:AbortSignal.timeout(7000),redirect:'follow'});
      return {ok:true,httpStatus:result.status,latencyMs:Date.now()-start};
    } catch { return {ok:false,httpStatus:0,latencyMs:Date.now()-start};}
  };
  const apps=await Promise.all(APPS.map(async a=>{
    const p=await probe(a.url);
    const status=!a.url?'unpublished':p.ok&&p.httpStatus<400?'up':p.ok&&[401,403].includes(p.httpStatus)?'up':'down';
    return {...a,...p,status};
  }));
  const services=await Promise.all(SERVICES.map(async svc=>{
    const p=await probe(svc.url);
    return {...svc,...p,status:p.ok&&svc.expect.includes(p.httpStatus)?'up':'down'};
  }));
  return {
    checkedAt:new Date().toISOString(), offline:false,cached:false,
    summary:{total:apps.length,up:apps.filter(a=>a.status==='up').length,down:apps.filter(a=>a.status==='down').length,unpublished:apps.filter(a=>a.status==='unpublished').length},
    apps,services,repos:REPOS.map(repo=>({repo,ok:false,offline:true}))
  };
}

async function currentReport() {
  const cachePath = path.join(app.getPath('userData'),'last-status.json');
  if (REMOTE_STATUS) {
    try {
      const url = new URL(REMOTE_STATUS);
      if (url.protocol !== 'https:') throw new Error('HTTPS required');
      const response = await fetch(url, {signal: AbortSignal.timeout(10000), headers:{Accept:'application/json'}});
      if (!response.ok) throw new Error('status '+response.status);
      const report = await response.json();
      if (!Array.isArray(report.apps) || !report.summary) throw new Error('invalid report');
      await fs.writeFile(cachePath,JSON.stringify(report),'utf8');
      return {...report,offline:false,cached:false};
    } catch(error) { console.warn('Remote status unavailable:',error.message); }
  }
  try {
    const report=await localOnlineReport();
    if(report.apps.some(a=>a.httpStatus>0)||report.services.some(s=>s.httpStatus>0)){
      await fs.writeFile(cachePath,JSON.stringify(report),'utf8');
      return report;
    }
  } catch(error) { console.warn('Local probes unavailable:',error.message); }
  try {
    const report=JSON.parse(await fs.readFile(cachePath,'utf8'));
    if (Array.isArray(report.apps) && report.summary) return {...report,offline:true,cached:true};
  } catch {}
  return offlineReport();
}
async function respond(req,res) {
  const requestUrl = new URL(req.url,'http://127.0.0.1');
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res,405,{error:'method_not_allowed'});
  if(requestUrl.pathname === '/api/status') return send(res,200,await currentReport());
  let decoded;
  try { decoded=decodeURIComponent(requestUrl.pathname); } catch {res.writeHead(400);res.end();return;}
  if (decoded.includes('\\') || decoded.includes('\0')) {res.writeHead(403);res.end();return;}
  const candidate=path.resolve(ROOT,'.'+(decoded==='/'?'/index.html':decoded));
  if (!candidate.startsWith(ROOT+path.sep) || candidate.split(path.sep).some(p=>p.startsWith('.github'))) {res.writeHead(403);res.end();return;}
  // Only static UI assets are exposed to localhost, not repository source or secrets.
  const allowed=candidate===path.join(ROOT,'index.html')||candidate.startsWith(path.join(ROOT,'assets')+path.sep);
  if(!allowed) {res.writeHead(404);res.end();return;}
  try {
    const data=await fs.readFile(candidate);
    res.writeHead(200,{'Content-Type':MIME[path.extname(candidate)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    res.end(req.method==='HEAD'?undefined:data);
  } catch {res.writeHead(404);res.end();}
}
async function start() {
  server=http.createServer((req,res)=>{respond(req,res).catch(()=>send(res,500,{error:'internal_error'}));});
  await new Promise((resolve,reject)=>server.once('error',reject).listen(0,'127.0.0.1',resolve));
  port=server.address().port;
  const win=new BrowserWindow({width:1280,height:820,minWidth:900,minHeight:600,backgroundColor:'#0b1020',autoHideMenuBar:true,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true}});
  win.webContents.setWindowOpenHandler(({url})=>{
    try {const u=new URL(url);if(u.protocol==='https:') shell.openExternal(url);}catch{}
    return {action:'deny'};
  });
  win.webContents.on('will-navigate',(event,url)=>{if(url!==`http://127.0.0.1:${port}/`) event.preventDefault();});
  await win.loadURL(`http://127.0.0.1:${port}/`);
}
app.whenReady().then(start).catch(err=>{console.error(err);app.quit();});
app.on('window-all-closed',()=>{server?.close();if(process.platform!=='darwin')app.quit();});
