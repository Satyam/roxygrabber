import { globby } from 'globby';
import { open, readFile, writeFile, stat } from 'node:fs/promises';
import { ensureDir, readJson, copy } from 'fs-extra/esm';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const menues = [];

for (const file of await globby(join(__dirname, '../json/**/*.json'))) {
  const entry = await readJson(file);
  const m = entry.menu;

  // console.log(file);
  if (
    !menues.some(({ files, menu, items }) => {
      const keys = Object.keys(m);
      if (keys.length === items && keys.every((key) => menu[key] === m[key])) {
        files.push(file);
        return true;
      }
      return false;
    })
  )
    menues.push({
      files: [file],
      menu: m,
      items: Object.keys(m).length,
    });
}
console.dir(menues);
