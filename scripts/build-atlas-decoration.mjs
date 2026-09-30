// Decorative background only. Globe and route geography always use the original dataset.
import fs from 'node:fs/promises';
import {geoNaturalEarth1,geoPath,geoGraticule10} from 'd3-geo';
const geo=JSON.parse(await fs.readFile('public/geo/countries.geojson','utf8'));
const projection=geoNaturalEarth1().fitExtent([[10,10],[990,510]],{type:'Sphere'});
const distance=(p,a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1];const t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);};
function simplify(points){if(points.length<3)return points;let max=.7,index=0;for(let i=1;i<points.length-1;i++){const d=distance(points[i],points[0],points.at(-1));if(d>max){max=d;index=i;}}return index?[...simplify(points.slice(0,index+1)).slice(0,-1),...simplify(points.slice(index))]:[points[0],points.at(-1)];}
const rings=[];let current=[];
const ctx={moveTo(x,y){current=[[x,y]];},lineTo(x,y){current.push([x,y]);},closePath(){if(current.length<3)return;const area=Math.abs(current.reduce((n,p,i)=>{const q=current[(i+1)%current.length];return n+p[0]*q[1]-q[0]*p[1];},0))/2;if(area<1.5)return;const ring=simplify([...current,current[0]]);if(ring.length>3)rings.push(ring);}};
geoPath(projection).context(ctx)(geo);
const land=rings.map(r=>'M'+r.map(p=>p.map(n=>n.toFixed(1)).join(',')).join('L')+'Z').join('');
const draw=geoPath(projection).digits(1);
const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 520"><g fill="none" stroke="#8e7648" stroke-width=".6" opacity=".4"><path d="${draw(geoGraticule10())}"/><path d="${draw({type:'Sphere'})}"/></g><path fill="#b69a62" fill-opacity=".22" stroke="#8e7648" stroke-width=".65" d="${land}"/></svg>`;
await fs.writeFile('public/brand/atlas-map.svg',svg);
console.log(`Decorative map: ${Buffer.byteLength(svg)} bytes, ${rings.length} rings.`);
