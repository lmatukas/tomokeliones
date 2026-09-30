import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {Worker} from 'node:worker_threads';
import {once} from 'node:events';
import {pathToFileURL} from 'node:url';
import {geoContains} from 'd3-geo';
import {createCountryPicker} from '../src/lib/globe-picking.mjs';

const geo = JSON.parse(await fs.readFile('public/geo/countries.geojson', 'utf8'));
const catalog = JSON.parse(await fs.readFile('content/countries.json', 'utf8')).countries;
const codes = new Set(catalog.map(c => c.iso_alpha2));
const features = geo.features.filter(f => codes.has(f.properties.alpha2));
const pick = createCountryPicker(features);
const original = point => features.find(f => geoContains(f, point)) ?? null;

test('Indexed picking agrees with original polygons worldwide, including date line and holes', () => {
  const points = [];
  for(let lat = -90; lat <= 90; lat += 5) for(let lon = -180; lon <= 180; lon += 5) points.push([lon, lat]);
  points.push([179.99,-16.5],[-179.99,-16.5],[179.99,66],[-179.99,66],[27.5,-29.5],[25.28,54.69],[0,0]);
  for(const c of catalog) if(c.label_point) points.push(c.label_point);
  // Close to actual ring vertices, where spherical bounds must not prune land.
  for(const f of features){const polygons=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;for(const poly of polygons){const [lon,lat]=poly[0][0];points.push([lon,lat],[lon+.00001,lat+.00001],[lon-.00001,lat-.00001]);}}
  for(const point of points) assert.equal(pick(point)?.properties.alpha2, original(point)?.properties.alpha2, `different country at ${point}`);
});

test('Indexed picker preserves Crimea in Ukraine and Lithuania as Lithuania', () => {
  for(const point of [[34.1,44.95],[33.52,44.6],[35.38,45.03]]) assert.equal(pick(point)?.properties.alpha2,'UA');
  assert.equal(pick([25.28,54.69])?.properties.alpha2,'LT');
});

test('Worker preserves original raised polygon vertices and triangles', {timeout: 30000}, async () => {
  const entry = process.env.TTJ_WORKER_ENTRY
    ? pathToFileURL(process.env.TTJ_WORKER_ENTRY).href
    : new URL('../src/lib/globe-geometry.worker.ts', import.meta.url).href;
  const worker = new Worker(new URL('./fixtures/globe-worker-runner.mjs', import.meta.url), {workerData: {url: entry}});
  try {
    assert.equal((await once(worker, 'message'))[0].ready, true);
    // Dependency's browser-global lookup is also needed in this numeric test.
    globalThis.window = globalThis;
    const {default: ConicPolygonGeometry} = await import('three-conic-polygon-geometry');
    for(const code of ['LT','RU','UA']){
      const feature = features.find(f => f.properties.alpha2 === code);
      const response = once(worker, 'message');
      worker.postMessage({feature});
      const [result] = await response;
      assert.equal(result.code, code);
      const polygons = feature.geometry.type==='Polygon'?[feature.geometry.coordinates]:feature.geometry.coordinates;
      assert.equal(result.parts.length, polygons.length);
      for(let i=0;i<polygons.length;i++){
        const expected = new ConicPolygonGeometry(polygons[i],1.004,1.008,false,true,true,4);
        assert.deepEqual(result.parts[i].position,expected.getAttribute('position').array);
        assert.deepEqual(result.parts[i].index,expected.index.array);
        expected.dispose();
      }
    }
    const response = once(worker,'message');
    worker.postMessage({feature:{properties:{alpha2:'INVALID'},geometry:{type:'Polygon',coordinates:null}}});
    assert.deepEqual((await response)[0],{code:'INVALID',parts:null});
  } finally {await worker.terminate();}
});
