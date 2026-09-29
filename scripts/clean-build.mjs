import fs from 'node:fs/promises';
// Astro can preserve output from a previous mode. Always rebuild this generated directory.
await fs.rm(new URL('../dist/',import.meta.url),{recursive:true,force:true});
