import fs from 'node:fs';
const data=JSON.parse(fs.readFileSync('content/archive.json'));const catalog=JSON.parse(fs.readFileSync('content/countries.json'));const countries=new Set(catalog.countries.map(c=>c.country_id));
if(countries.size!==195)throw Error('Expected unique 195-country catalogue');
const ids=new Set(),slugs=new Set(),assets=new Map(data.assets.map(a=>[a.id,a]));
for(const s of data.stories){if(ids.has(s.id)||slugs.has(s.slug))throw Error('Duplicate story');ids.add(s.id);slugs.add(s.slug);for(const id of s.countryIds)if(!countries.has(id))throw Error('Unknown country');for(const g of s.gallery){if(!assets.has(g.assetId)||!g.alt.trim())throw Error('Broken gallery');for(const v of assets.get(g.assetId).variants)if(!fs.existsSync('public/'+v.src))throw Error('Missing image');}if(s.status==='published'&&(!s.approvedBy||s.synthetic))throw Error('Unapproved or synthetic publication');}
console.log(`Validated ${countries.size} countries, ${data.stories.length} stories, ${assets.size} assets. Preview=${process.env.TTJ_PREVIEW==='1'}`);
