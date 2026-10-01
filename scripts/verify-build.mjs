import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=path.resolve('dist'),preview=process.env.TTJ_PREVIEW==='1';
const headers=await fs.readFile(path.join(root,'_headers'),'utf8');
assert(headers.includes('X-Frame-Options: '+(preview?'SAMEORIGIN':'DENY')),'Wrong frame policy for this build mode');
const archive=JSON.parse(await fs.readFile('content/archive.json','utf8'));
const exists=p=>fs.access(p).then(()=>true,()=>false);
for(const story of archive.stories){
 const expected=preview||(story.status==='published'&&!story.synthetic);
 assert.equal(await exists(path.join(root,'istorijos',story.slug,'index.html')),expected,`Visibility mismatch: ${story.slug}`);
}
async function walk(dir){const files=[];for(const ent of await fs.readdir(dir,{withFileTypes:true})){const file=path.join(dir,ent.name);files.push(...(ent.isDirectory()?await walk(file):[file]));}return files;}
const files=await walk(root);let links=0,bytes=0,maxBytes=0;
for(const file of files){const size=(await fs.stat(file)).size;bytes+=size;maxBytes=Math.max(maxBytes,size);if(!file.endsWith('.html'))continue;
 const html=await fs.readFile(file,'utf8');
 for(const [,url] of html.matchAll(/(?:href|src)="(\/[^"#?]*)/g)){
  if(url.startsWith('//'))continue;let target=path.join(root,decodeURIComponent(url));if(url.endsWith('/'))target=path.join(target,'index.html');
  // Astro's 404 redirect has a file target on Cloudflare.
  if(url==='/404/')target=path.join(root,'404.html');
  assert(await exists(target),`Broken local URL ${url} in ${path.relative(root,file)}`);links++;
 }
}
assert(files.length<20_000,'Cloudflare Pages Free file limit');assert(maxBytes<25*1024*1024,'Cloudflare Pages single-file limit');
console.log(JSON.stringify({pass:true,preview,htmlPages:files.filter(f=>f.endsWith('.html')).length,files:files.length,internalReferences:links,bytes,maxFileBytes:maxBytes},null,2));
