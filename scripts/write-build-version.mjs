import { mkdir, writeFile } from 'node:fs/promises';

const sha = String(process.env.GITHUB_SHA || process.env.BUILD_SHA || 'local').trim();
const output = new URL('../public/release-sha.txt', import.meta.url);

await mkdir(new URL('../public/', import.meta.url), { recursive: true });
await writeFile(output, `${sha}\n`, 'utf8');
console.log(`Build release SHA: ${sha}`);
