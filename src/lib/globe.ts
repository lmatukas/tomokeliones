import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createCountryPicker} from './globe-picking.mjs';
import {sunVector,moonState} from './astronomy.mjs';
const radians=Math.PI/180;
const xyz=(lon:number,lat:number,r=1)=>new THREE.Vector3(r*Math.cos(lat*radians)*Math.sin(lon*radians),r*Math.sin(lat*radians),r*Math.cos(lat*radians)*Math.cos(lon*radians));
export async function mountGlobe(shell:HTMLElement){
 const stage=shell.querySelector<HTMLElement>('.globe-stage')!, status=shell.querySelector<HTMLElement>('.globe-status')!, tooltip=shell.querySelector<HTMLElement>('.globe-tooltip')!,pause=shell.querySelector<HTMLButtonElement>('[data-pause]')!,moonCaption=shell.querySelector<HTMLElement>('.moon-caption')!;
 const catalog=JSON.parse(shell.querySelector('[data-globe-data]')!.textContent!);const byCode=new Map(catalog.map(c=>[c.code,c]));
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');let running=!reduced.matches,visible=true,disposed=false,lastTime=0,hovered:any=null,focusMesh:THREE.Group|null=null,focusScale=1,frame=0,dirty=true;
 let geometryWorker:Worker|null=null;
 const scene=new THREE.Scene();const camera=new THREE.PerspectiveCamera(38,1,.1,100);camera.position.copy(xyz(22,24,3.25));scene.add(camera);
 const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});renderer.setClearColor(0x08151c,0);renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.domElement.tabIndex=0;renderer.domElement.setAttribute('aria-label','Gaublys. Rodyklėmis pasukite, pliusu ar minusu keiskite mastelį. Šalį pasirinkite pele arba naudokite paiešką.');stage.append(renderer.domElement);
 const controls=new OrbitControls(camera,renderer.domElement);controls.enablePan=false;controls.enableDamping=!reduced.matches;controls.dampingFactor=.08;controls.minDistance=1.7;controls.maxDistance=6.4;controls.rotateSpeed=.45;controls.zoomSpeed=.6;controls.autoRotate=running;controls.autoRotateSpeed=.23;
 controls.minPolarAngle=.05;controls.maxPolarAngle=Math.PI-.05;
 const updatePause=()=>{pause.textContent=running?'Pauzė Ⅱ':'Sukti ↻';pause.setAttribute('aria-label',running?'Sustabdyti sukimąsi':'Pradėti sukimąsi');pause.setAttribute('aria-pressed',String(!running));controls.autoRotate=running;};
 const stop=()=>{running=false;updatePause();};controls.addEventListener('start',stop);pause.addEventListener('click',()=>{running=!running;updatePause();});
 controls.addEventListener('change',()=>{dirty=true;});
 const resize=()=>{const {width,height}=stage.getBoundingClientRect();if(!width||!height)return;camera.aspect=width/height;camera.updateProjectionMatrix();renderer.setSize(width,height,false);dirty=true;};const ro=new ResizeObserver(resize);ro.observe(stage);resize();
 let earth:THREE.Mesh;let moon:THREE.Mesh|null=null;let moonLoading=false,moonRetryAfter=0;
 const loader=new THREE.TextureLoader();const timed=<T>(p:Promise<T>)=>new Promise<T>((resolve,reject)=>{const t=setTimeout(()=>reject(Error('Globe assets timed out')),15000);p.then(x=>{clearTimeout(t);resolve(x)},e=>{clearTimeout(t);reject(e)});});
 try{
  const [day,night,geo]=await timed(Promise.all([loader.loadAsync('/textures/earth-day.webp'),loader.loadAsync('/textures/earth-night.webp'),fetch('/geo/countries.geojson',{signal:AbortSignal.timeout(15000)}).then(r=>{if(!r.ok)throw Error('Geography failed');return r.json();})]));
  day.colorSpace=THREE.SRGBColorSpace;night.colorSpace=THREE.SRGBColorSpace;
  const material=new THREE.ShaderMaterial({uniforms:{dayMap:{value:day},nightMap:{value:night},sun:{value:new THREE.Vector3(...sunVector())}},vertexShader:`varying vec2 vUv; varying vec3 vN; void main(){vUv=uv;vN=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`uniform sampler2D dayMap;uniform sampler2D nightMap;uniform vec3 sun;varying vec2 vUv;varying vec3 vN;void main(){float light=dot(normalize(vN),sun);float day=smoothstep(-.14,.20,light);vec3 terrain=texture2D(dayMap,vUv).rgb;vec3 cities=texture2D(nightMap,vUv).rgb;vec3 color=terrain*(.055+day*(.40+.60*max(light,0.)))+cities*(1.-smoothstep(-.22,.10,light))*1.4;gl_FragColor=vec4(color,1.);#include <colorspace_fragment>\n}`.replace(';#include',';\n#include')});
  earth=new THREE.Mesh(new THREE.SphereGeometry(1,96,64),material);earth.rotation.y=-Math.PI/2;scene.add(earth);
  const atmosphere=new THREE.Mesh(new THREE.SphereGeometry(1.026,64,48),new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.BackSide,uniforms:{},vertexShader:`varying vec3 vNormal;varying vec3 vPosition;void main(){vNormal=normalize(normalMatrix*normal);vec4 p=modelViewMatrix*vec4(position,1.);vPosition=p.xyz;gl_Position=projectionMatrix*p;}`,fragmentShader:`varying vec3 vNormal;varying vec3 vPosition;void main(){float rim=pow(1.-abs(dot(normalize(vNormal),normalize(-vPosition))),3.);gl_FragColor=vec4(.20,.52,.72,rim*.46);}`}));scene.add(atmosphere);
  // Two batched outline layers, even when every country has been visited.
  // No visited fill: the terrain and night lights remain fully visible.
  const points:number[]=[],visitedPoints:number[]=[],ranges=new Map<string,{start:number,count:number}>();
  for(const f of geo.features){const start=points.length/3,c:any=byCode.get(f.properties.alpha2);const polys=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;for(const poly of polys)for(const ring of poly){for(let i=1;i<ring.length;i++){const a=xyz(...ring[i-1],1.003),b=xyz(...ring[i],1.003);points.push(a.x,a.y,a.z,b.x,b.y,b.z);if(c?.visited)visitedPoints.push(a.x,a.y,a.z,b.x,b.y,b.z);}}ranges.set(f.properties.alpha2,{start,count:points.length/3-start});}
  const borderPositions=new THREE.Float32BufferAttribute(points,3);
  const borderGeometry=new THREE.BufferGeometry();borderGeometry.setAttribute('position',borderPositions);scene.add(new THREE.LineSegments(borderGeometry,new THREE.LineBasicMaterial({color:0xb1c5bd,transparent:true,opacity:.29})));
  if(visitedPoints.length){const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(visitedPoints,3));const borders=new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color:0xcda773,transparent:true,opacity:.85,depthWrite:false}));borders.scale.setScalar(1.001);scene.add(borders);}
  // Hover outlines reuse the same vertices; only the visible draw range changes.
  const hoverGeometry=new THREE.BufferGeometry();hoverGeometry.setAttribute('position',borderPositions);hoverGeometry.setDrawRange(0,0);hoverGeometry.boundingSphere=new THREE.Sphere(new THREE.Vector3(),1.01);
  focusMesh=new THREE.Group();focusMesh.visible=false;focusMesh.add(new THREE.LineSegments(hoverGeometry,new THREE.LineBasicMaterial({color:0xe3be88,transparent:true,opacity:.95,depthWrite:false})));scene.add(focusMesh);
  const fillMaterial=new THREE.MeshBasicMaterial({color:0xd4ae7a,transparent:true,opacity:.18,depthWrite:false,side:THREE.DoubleSide});
  const fillCache=new Map<string,THREE.Group>(),failedFills=new Set<string>();let focusFill:THREE.Group|null=null,workerBusy=false,workerUnavailable=false,queuedFeature:any=null;
  const disposeFill=(group:THREE.Group)=>group.traverse((o:any)=>o.geometry?.dispose());
  function attachFill(code:string){const fill=fillCache.get(code);if(!fill||hovered?.properties.alpha2!==code)return;if(focusFill)focusMesh!.remove(focusFill);focusFill=fill;focusMesh!.add(fill);fillCache.delete(code);fillCache.set(code,fill);dirty=true;}
  function requestFill(feature:any){
   const code=feature.properties.alpha2;queuedFeature=feature;
   if(fillCache.has(code)){queuedFeature=null;attachFill(code);return;}
   if(workerBusy||workerUnavailable||failedFills.has(code))return;
   try{
    if(!geometryWorker){geometryWorker=new Worker(new URL('./globe-geometry.worker.ts',import.meta.url),{type:'module'});
     geometryWorker.onmessage=({data:{code,parts}})=>{if(disposed)return;workerBusy=false;
      if(parts){const group=new THREE.Group();for(const part of parts){const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(part.position,3));geometry.setIndex(new THREE.BufferAttribute(part.index,1));geometry.boundingSphere=new THREE.Sphere(new THREE.Vector3(),1.01);group.add(new THREE.Mesh(geometry,fillMaterial));}fillCache.set(code,group);attachFill(code);
       while(fillCache.size>6){const oldest=[...fillCache.keys()].find(key=>key!==hovered?.properties.alpha2)!;disposeFill(fillCache.get(oldest)!);fillCache.delete(oldest);}
      }else failedFills.add(code);
      if(queuedFeature)requestFill(queuedFeature);
     };
     geometryWorker.onerror=()=>{workerUnavailable=true;workerBusy=false;queuedFeature=null;geometryWorker?.terminate();geometryWorker=null;};
    }
    workerBusy=true;queuedFeature=null;geometryWorker.postMessage({feature});
   }catch{workerUnavailable=true;workerBusy=false;geometryWorker?.terminate();geometryWorker=null;}
  }
  // Public debug state is deliberately non-sensitive and helps QA distinguish a rendered globe from a poster.
  shell.dataset.ready='true';shell.dataset.renderer='webgl2';for(const b of shell.querySelectorAll<HTMLButtonElement>('.globe-controls button'))b.disabled=false;updatePause();
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2(),surface=new THREE.Sphere(new THREE.Vector3(),1),hitPoint=new THREE.Vector3();
  const findCountry=createCountryPicker(geo.features.filter(f=>byCode.has(f.properties.alpha2)));
  let press:{x:number,y:number}|null=null,pendingPointer:{clientX:number,clientY:number}|null=null;
  function picked(e:{clientX:number,clientY:number}){const rect=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);camera.updateMatrixWorld();raycaster.setFromCamera(pointer,camera);if(!raycaster.ray.intersectSphere(surface,hitPoint))return null;return findCountry([Math.atan2(hitPoint.x,hitPoint.z)/radians,Math.asin(THREE.MathUtils.clamp(hitPoint.y,-1,1))/radians]);}
  function clearHover(){tooltip.hidden=true;hovered=null;queuedFeature=null;pendingPointer=null;delete shell.dataset.hoverCountry;if(focusMesh)focusMesh.visible=false;if(focusFill){focusMesh!.remove(focusFill);focusFill=null;}dirty=true;}
  function updateHover(e:{clientX:number,clientY:number}){const f=picked(e);if(!f){clearHover();return;}const c:any=byCode.get(f.properties.alpha2);const rect=shell.getBoundingClientRect();if(f!==hovered){clearHover();hovered=f;focusScale=1;focusMesh!.scale.setScalar(1);focusMesh!.visible=true;const range=ranges.get(c.code)!;hoverGeometry.setDrawRange(range.start,range.count);requestFill(f);shell.dataset.hoverCountry=c.code;tooltip.textContent=c.name+(c.hasStories?' · atverti istorijas':'');}tooltip.style.left=Math.min(Math.max(85,e.clientX-rect.left),rect.width-85)+'px';tooltip.style.top=(e.clientY-rect.top-12)+'px';tooltip.hidden=false;}
  renderer.domElement.addEventListener('pointermove',e=>{if(e.buttons||e.pointerType==='touch')return;pendingPointer={clientX:e.clientX,clientY:e.clientY};});
  renderer.domElement.addEventListener('pointerleave',clearHover);controls.addEventListener('start',clearHover);
  renderer.domElement.addEventListener('pointerdown',e=>{press={x:e.clientX,y:e.clientY};});renderer.domElement.addEventListener('pointercancel',()=>{press=null;clearHover();});renderer.domElement.addEventListener('pointerup',e=>{const start=press;press=null;if(!start||Math.hypot(e.clientX-start.x,e.clientY-start.y)>7)return;const f=picked(e),c:any=f&&byCode.get(f.properties.alpha2);if(c)location.href=c.href;});
  const zoom=(factor:number)=>{stop();camera.position.multiplyScalar(factor);const len=THREE.MathUtils.clamp(camera.position.length(),controls.minDistance,controls.maxDistance);camera.position.setLength(len);controls.update();};
  shell.querySelector('[data-zoom-in]')!.addEventListener('click',()=>zoom(.80));shell.querySelector('[data-zoom-out]')!.addEventListener('click',()=>zoom(1.25));shell.querySelector('[data-home]')!.addEventListener('click',()=>{stop();camera.position.copy(xyz(22,24,3.25));controls.target.set(0,0,0);controls.update();});
  renderer.domElement.addEventListener('keydown',e=>{const spherical=new THREE.Spherical().setFromVector3(camera.position);if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-','='].includes(e.key)){e.preventDefault();stop();if(e.key==='ArrowLeft')spherical.theta-=.12;if(e.key==='ArrowRight')spherical.theta+=.12;if(e.key==='ArrowUp')spherical.phi-=.12;if(e.key==='ArrowDown')spherical.phi+=.12;spherical.makeSafe();camera.position.setFromSpherical(spherical);if(e.key==='+'||e.key==='=')zoom(.8);if(e.key==='-')zoom(1.25);controls.update();}});
  const touch=shell.querySelector<HTMLButtonElement>('.touch-enable')!;touch.addEventListener('click',()=>{const on=touch.getAttribute('aria-pressed')!=='true';touch.setAttribute('aria-pressed',String(on));touch.textContent=on?'Baigti valdyti':'Valdyti gaublį';shell.classList.toggle('touch-active',on);stop();});
  const io=new IntersectionObserver(([e])=>{visible=e.isIntersecting;lastTime=0;dirty=true;if(!visible)clearHover();});io.observe(shell);const media=()=>{if(reduced.matches)stop();controls.enableDamping=!reduced.matches;};reduced.addEventListener('change',media);
  async function showMoon(){if(moon||moonLoading||performance.now()<moonRetryAfter)return;moonLoading=true;try{const map=await loader.loadAsync('/textures/moon.webp');if(disposed){map.dispose();return;}map.colorSpace=THREE.SRGBColorSpace;const state=moonState();const z=2*state.fraction-1,x=Math.sqrt(Math.max(0,1-z*z))*(state.phase<.5?1:-1);const moonMaterial=new THREE.ShaderMaterial({uniforms:{map:{value:map},lightDirection:{value:new THREE.Vector3(x,0,z)}},vertexShader:`varying vec2 vUv;varying vec3 vN;void main(){vUv=uv;vN=normal;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`uniform sampler2D map;uniform vec3 lightDirection;varying vec2 vUv;varying vec3 vN;void main(){float light=max(dot(normalize(vN),lightDirection),0.);gl_FragColor=vec4(texture2D(map,vUv).rgb*(.025+light),1.);\n#include <colorspace_fragment>\n}`});moon=new THREE.Mesh(new THREE.SphereGeometry(.105,40,32),moonMaterial);moon.position.set(.38,.29,-1.8);camera.add(moon);moonCaption.querySelector('span')!.textContent=state.name+' · '+Math.round(state.fraction*100)+' % apšviesta';dirty=true;}catch{moonLoading=false;moonRetryAfter=performance.now()+30000;}}
  const updateAstronomy=()=>{material.uniforms.sun.value.set(...sunVector());const clock=shell.querySelector('[data-earth-clock]')!;clock.textContent=new Intl.DateTimeFormat('lt',{hour:'2-digit',minute:'2-digit',timeZone:'UTC'}).format(new Date())+' UTC';};const timer=setInterval(()=>{if(visible&&!document.hidden){updateAstronomy();dirty=true;}},60000);
  const frameDuration=1000/30;let previousFar:boolean|undefined,lastRenderedTime=0;
  function animate(time:number){
   if(disposed)return;frame=requestAnimationFrame(animate);
   if(!visible||document.hidden){lastTime=0;return;}
   const elapsed=lastTime?time-lastTime:frameDuration;
   if(elapsed+.01<frameDuration)return;
   const delta=lastTime?Math.min((time-lastRenderedTime)/1000,.1):frameDuration/1000;lastRenderedTime=time;
   // Carry the remainder, instead of falling to ~20fps when a frame is late.
   lastTime=time-(elapsed>=frameDuration?elapsed%frameDuration:0);
   controls.update(delta);
   // Coalesce pointer events; at most one geographic lookup per rendered tick.
   if(pendingPointer){const position=pendingPointer;pendingPointer=null;updateHover(position);}
   if(focusMesh?.visible){const next=reduced.matches||1.025-focusScale<.0001?1.025:focusScale+(1.025-focusScale)*.18;if(next!==focusScale){focusScale=next;focusMesh.scale.setScalar(next);dirty=true;}}
   const far=camera.position.length()>4.5;
   if(far!==previousFar){previousFar=far;shell.dataset.zoom=far?'far':'near';dirty=true;}
   if(far)showMoon();
   if(moon&&moon.visible!==far){moon.visible=far;dirty=true;}
   const captionHidden=!far||!moon;if(moonCaption.hidden!==captionHidden)moonCaption.hidden=captionHidden;
   // A paused, settled globe keeps its canvas without doing identical GPU work.
   if(dirty){renderer.render(scene,camera);dirty=false;}
  }
  const onVisibility=()=>{lastTime=0;dirty=true;if(document.hidden)clearHover();else updateAstronomy();};document.addEventListener('visibilitychange',onVisibility);
  frame=requestAnimationFrame(animate);
  const cleanup=()=>{if(disposed)return;disposed=true;cancelAnimationFrame(frame);clearInterval(timer);geometryWorker?.terminate();geometryWorker=null;queuedFeature=null;document.removeEventListener('visibilitychange',onVisibility);ro.disconnect();io.disconnect();reduced.removeEventListener('change',media);controls.dispose();if(focusFill)focusMesh!.remove(focusFill);for(const fill of fillCache.values())disposeFill(fill);fillCache.clear();fillMaterial.dispose();scene.traverse((o:any)=>{o.geometry?.dispose();if(o.material){const mats=Array.isArray(o.material)?o.material:[o.material];for(const m of mats){m.uniforms?.dayMap?.value.dispose();m.uniforms?.nightMap?.value.dispose();m.uniforms?.map?.value.dispose();m.dispose();}}});renderer.dispose();};
  renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();cleanup();shell.dataset.ready='false';shell.dataset.error='contextlost';status.innerHTML='<p>3D ryšys nutrūko.</p><a href="/salys/">Tęsti šalių sąraše →</a><button type="button">Bandyti dar kartą</button>';status.querySelector('button')!.addEventListener('click',()=>location.reload());for(const b of shell.querySelectorAll<HTMLButtonElement>('.globe-controls button'))b.disabled=true;});window.addEventListener('pagehide',cleanup,{once:true});
 }catch(e){disposed=true;geometryWorker?.terminate();ro.disconnect();controls.dispose();renderer.dispose();renderer.domElement.remove();throw e;}
}
