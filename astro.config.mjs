import { defineConfig } from 'astro/config';
export default defineConfig({server:{host:true,port:4173},devToolbar:{enabled:false},output:'static', trailingSlash:'always', vite:{server:{host:'0.0.0.0',allowedHosts:['terminal.local']}}});
