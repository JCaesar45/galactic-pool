import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
const source = await readFile('netlify/functions/game.ts', 'utf8');
const result = spawnSync(process.execPath, ['--input-type=module', '--check'], { input: source, encoding: 'utf8' });
if (result.status !== 0) throw new Error(result.stderr);
for (const required of ["from '@netlify/blobs'", "consistency: 'strong'", 'onlyIfNew: true', 'onlyIfMatch: entry.etag']) if (!source.includes(required)) throw new Error(`Missing required function feature: ${required}`);
console.log('Netlify Function source check passed (Netlify bundles the TypeScript function during deploy).');
