import fs from 'node:fs/promises';

// The responsive review stand embeds this same site. Production keeps DENY.
if(process.env.TTJ_PREVIEW==='1'){
 const path='dist/_headers';
 const headers=await fs.readFile(path,'utf8');
 if(!headers.includes('X-Frame-Options: DENY'))throw Error('Unexpected frame policy');
 await fs.writeFile(path,headers.replace('X-Frame-Options: DENY','X-Frame-Options: SAMEORIGIN'));
}
