import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
export const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const json = value => JSON.stringify(value, null, 2)+'\n';
const equal = (a,b) => JSON.stringify(a)===JSON.stringify(b);
export async function readJson(file,fallback) { try { return JSON.parse(await fs.readFile(file,'utf8')); } catch(e) { if(e.code==='ENOENT'&&fallback!==undefined)return fallback; throw e; } }
async function atomic(file, data) { await fs.mkdir(path.dirname(file),{recursive:true}); const temp=file+'.tmp'; await fs.writeFile(temp,data);await fs.rename(temp,file); }
export function mergeFields(base,current,incoming,entity,conflicts) {
  if(!current)return incoming;
  const out={...current};
  for(const [field,value] of Object.entries(incoming)) {
    if(equal(current[field],value))continue;
    if(base && equal(current[field],base[field]))out[field]=value;
    else if(base && equal(value,base[field]))continue;
    else conflicts.push({entity,field,kept:current[field],incoming:value});
  }
  return out;
}
function validate(p) {
 if(p.schemaVersion!==1 || !['synthetic_demo','approved_public'].includes(p.visibility))throw Error('Package must be synthetic_demo or explicitly approved_public. Never put private drafts in this public repository.');
 if(p.visibility==='approved_public' && !p.approvedBy)throw Error('Public-content approval is required.');
 if(!Array.isArray(p.assets)||p.assets.length>100||!Array.isArray(p.stories)||p.stories.length>20)throw Error('Batch limit: 100 assets, 20 stories.');
 const ids=new Set();for(const a of p.assets){if(!a.id||ids.has(a.id)||!a.sourceKey||!a.file)throw Error('Missing/duplicate asset identity.');ids.add(a.id);}
 const storyIds=new Set(),slugs=new Set();
 for(const s of p.stories){
  if(!s.id||storyIds.has(s.id)||!s.slug||!/^[-a-z0-9]+$/.test(s.slug)||slugs.has(s.slug))throw Error('Invalid/duplicate story identity or slug.');storyIds.add(s.id);slugs.add(s.slug);
  if(!s.countryIds?.length||!s.title||!Array.isArray(s.paragraphs))throw Error('Story country, title and paragraphs required.');
  if((s.gallery||[]).length>100)throw Error('Gallery limit 100.');
  if(new Set((s.gallery||[]).map(x=>x.assetId)).size!==(s.gallery||[]).length)throw Error('Duplicate gallery item.');
  for(const item of s.gallery||[])if(!ids.has(item.assetId)||typeof item.alt!=='string'||!item.alt.trim())throw Error('Unresolved gallery asset or meaningful alt missing.');
  for(const r of s.routes||[]){if(r.stops.length>100)throw Error('Route limit 100.'); const points=new Set();for(const stop of r.stops){if(points.has(stop.id)||!stop.id||!stop.name||!Number.isFinite(stop.lon)||!Number.isFinite(stop.lat)||Math.abs(stop.lon)>180||Math.abs(stop.lat)>90)throw Error('Invalid route stop.');points.add(stop.id);}}
 }
 if(p.visibility==='synthetic_demo'&&p.stories.some(s=>!s.synthetic))throw Error('Every demo story must be marked synthetic.');
}
export async function importPackage(packageFile,{root=process.cwd(), stopAfter=Infinity}={}) {
 root=path.resolve(root); packageFile=path.resolve(packageFile); const pkg=await readJson(packageFile);validate(pkg);
 const catalog=await readJson(path.join(root,'content/countries.json')); const countryIds=new Set(catalog.countries.map(x=>x.country_id));
 for(const s of pkg.stories)for(const id of s.countryIds)if(!countryIds.has(id))throw Error('Unknown country '+id);
 const work=path.join(root,'.work');await fs.mkdir(work,{recursive:true});const lock=path.join(work,'import.lock');
 let handle; try{handle=await fs.open(lock,'wx');await handle.writeFile(String(process.pid));}catch(e){throw Error('Another import owns the lock. Verify its PID before removing a stale lock.');}
 try {
 const stateFile=path.join(work,'import-state.json'); const contentFile=path.join(root,'content/archive.json');
 const initial=await fs.readFile(contentFile).catch(e=>{if(e.code==='ENOENT')return Buffer.from('');throw e;});
 const content=initial.length?JSON.parse(initial):{schemaVersion:1,assets:[],trips:[],stories:[],visits:[]};
 const state=await readJson(stateFile,{schemaVersion:1,sources:{},baseStories:{},baseTrips:{}});
 const report={processed:0,reused:0,conflicts:[],complete:false}; const assets=new Map(content.assets.map(a=>[a.id,a]));
 const packageRoot=await fs.realpath(path.dirname(packageFile));
 for(const a of pkg.assets) {
  const source=await fs.realpath(path.resolve(packageRoot,a.file));
  if(source!==packageRoot&&!source.startsWith(packageRoot+path.sep))throw Error('Asset path escapes package folder.');
  const bytes=await fs.readFile(source); if(bytes.length>32*1024*1024)throw Error('Asset exceeds 32 MiB: '+a.id);
  const digest=hash(bytes), key=hash(a.sourceKey); const old=state.sources[key];
  if(old&&old.asset.id!==a.id)throw Error('Source identity changed; resolve explicitly.');
  let asset;
  if(old?.digest===digest && (await Promise.all(old.asset.variants.map(v=>fs.access(path.join(root,'public',v.src)).then(()=>true,()=>false)))).every(Boolean)) {
   asset=old.asset;report.reused++;
  } else {
   const svg=/^\s*<svg[\s>]/i.test(bytes.toString('utf8',0,250));
   if(svg&&(!a.trustedSyntheticSvg||pkg.visibility!=='synthetic_demo'||/<(?:script|image|foreignObject|use)\b|(?:href|url\s*\(|onload)/i.test(bytes.toString())))throw Error('SVG is allowed only for inspected, self-contained synthetic cards.');
   const meta=await sharp(bytes,{limitInputPixels:50_000_000}).metadata();
   if(!['jpeg','png','webp','svg'].includes(meta.format))throw Error('Unsupported image format; convert to JPEG, PNG or WebP first.');
   const variants=[];
   for(const width of [480,960,1600]){
    const rel=`media/${digest.slice(0,24)}-${width}.webp`;const dest=path.join(root,'public',rel);await fs.mkdir(path.dirname(dest),{recursive:true});
    const result=await sharp(bytes,{limitInputPixels:50_000_000}).rotate().resize({width,withoutEnlargement:true}).toColourspace('srgb').webp({quality:82}).toBuffer({resolveWithObject:true});
    await atomic(dest,result.data);variants.push({width:result.info.width,height:result.info.height,src:rel,bytes:result.data.length});
   }
   asset={id:a.id,sha256:digest,synthetic:pkg.visibility==='synthetic_demo',variants};
   state.sources[key]={digest,asset};await atomic(stateFile,json(state));report.processed++;
  }
  // Different source IDs with equal bytes reuse derivative URLs without conflating editorial identity.
  assets.set(a.id,asset);
  if(report.processed+report.reused>=stopAfter){await atomic(path.join(work,'last-import.json'),json(report));return report;}
 }
 const stories=new Map(content.stories.map(s=>[s.id,s])); const trips=new Map(content.trips.map(t=>[t.id,t]));
 for(const t of pkg.trips||[]){const merged=mergeFields(state.baseTrips[t.id],trips.get(t.id),t,t.id,report.conflicts);trips.set(t.id,merged);}
 for(const s of pkg.stories){const safe={...s,status:'draft',publishedAt:null};const merged=mergeFields(state.baseStories[s.id],stories.get(s.id),safe,s.id,report.conflicts);stories.set(s.id,merged);}
 // Protect against hand edits during a long image conversion batch.
 const latest=await fs.readFile(contentFile).catch(e=>{if(e.code==='ENOENT')return Buffer.from('');throw e;});if(hash(initial)!==hash(latest))throw Error('Content changed during import; retry so edits can be merged.');
 const next={...content,assets:[...assets.values()],trips:[...trips.values()],stories:[...stories.values()]};
 await atomic(contentFile,json(next));
 // Do not advance a conflicted baseline: the same conflict remains visible on retry.
 for(const s of pkg.stories)if(!report.conflicts.some(c=>c.entity===s.id))state.baseStories[s.id]={...s,status:'draft',publishedAt:null};
 for(const t of pkg.trips||[])if(!report.conflicts.some(c=>c.entity===t.id))state.baseTrips[t.id]=t;
 await atomic(stateFile,json(state));report.complete=report.conflicts.length===0;report.assetCount=next.assets.length;report.storyCount=next.stories.length;
 await atomic(path.join(work,'last-import.json'),json(report));return report;
 } finally {await handle.close();await fs.unlink(lock);}
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try {const report=await importPackage(process.argv[2],{stopAfter:Number(process.env.TTJ_STOP_AFTER)||Infinity});console.log(JSON.stringify(report,null,2));if(report.conflicts.length)process.exitCode=2;}
 catch(e){console.error(e.message);process.exitCode=1;}
}
