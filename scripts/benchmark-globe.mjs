import fs from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
import {geoContains} from 'd3-geo';
import {createCountryPicker} from '../src/lib/globe-picking.mjs';

const geo=JSON.parse(await fs.readFile('public/geo/countries.geojson','utf8'));
const catalog=JSON.parse(await fs.readFile('content/countries.json','utf8')).countries;
const codes=new Set(catalog.map(c=>c.iso_alpha2));
const features=geo.features.filter(f=>codes.has(f.properties.alpha2));
const before=point=>features.find(f=>geoContains(f,point))??null;
const after=createCountryPicker(features);
const points=Array.from({length:300},(_,i)=>i<150
  ? [-12+(i%25)*2.3,36+Math.floor(i/25)*5]
  : [-179+((i*137)%358),-85+((i*47)%170)]);
for(const fn of [before,after])for(const point of points.slice(0,20))fn(point);
function measure(fn){const start=performance.now();const result=points.map(fn);return {ms:performance.now()-start,result};}
const baseline=measure(before),indexed=measure(after);
if(!baseline.result.every((f,i)=>f===indexed.result[i]))throw Error('Country results changed');
console.log(JSON.stringify({scope:'Node CPU geographic lookup only; not browser FPS',node:process.version,samples:points.length,baselineMs:+baseline.ms.toFixed(2),indexedMs:+indexed.ms.toFixed(2),speedup:+(baseline.ms/indexed.ms).toFixed(2),identicalCountries:true},null,2));
