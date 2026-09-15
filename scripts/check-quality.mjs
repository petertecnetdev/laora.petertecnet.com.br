import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const roots = ['src', 'scripts'];
const extensions = new Set(['.js', '.jsx', '.mjs', '.css']);
const failures = [];

async function walk(directory) {
  const entries = await readdir(directory);
  for (const entry of entries) {
    const file = path.join(directory, entry);
    const info = await stat(file);
    if (info.isDirectory()) await walk(file);
    else if (extensions.has(path.extname(file))) await check(file);
  }
}

async function check(file) {
  const content = await readFile(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, index) => {
    if (/[ \t]+$/.test(line)) failures.push(`${file}:${index + 1}: whitespace no fim da linha`);
    if (line.includes('\t')) failures.push(`${file}:${index + 1}: tab encontrado; use espaços`);
  });
  if (content.includes('<<<<<<<') || content.includes('=======') || content.includes('>>>>>>>')) {
    failures.push(`${file}: marcador de conflito Git encontrado`);
  }
}

for (const root of roots) await walk(root);

if (failures.length) {
  console.error(`Quality gate falhou com ${failures.length} problema(s):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Quality gate aprovado: arquivos fonte sem conflitos, tabs ou trailing whitespace.');
