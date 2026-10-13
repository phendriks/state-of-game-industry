import fs from 'node:fs/promises';

export function readArgument(name) {
  return process.argv
    .find((value) => value.startsWith(`--${name}=`))
    ?.slice(name.length + 3);
}

export async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

export async function readJsonLines(file) {
  return (await fs.readFile(file, 'utf8'))
    .split(/\r?\n/)
    .filter(Boolean)
    .map(JSON.parse);
}
