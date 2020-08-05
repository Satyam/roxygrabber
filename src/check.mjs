import jsdom from 'jsdom';
import { readdir as readDir } from 'fs/promises';
import { join, sep, parse as parsePath, resolve } from 'path';

const pages = {};
const BASE = resolve(process.cwd(), './html');
const START = '';

const ensureEntry = (path, entryName, isDir) => {
  const { dir, name, ext } = parsePath(join(path, entryName));
  // console.log({ dir, name, ext });

  const parts = dir.length ? dir.split(sep) : [];
  if (isDir) parts.push(entryName);
  else {
    parts.push(
      (path === START && name === 'roxanacabut') ||
        (name === '.html' && ext === '')
        ? 'index'
        : name
    );
  }
  const folder = parts.reduce((p, part) => {
    if (!p[part]) p[part] = {};
    return p[part];
  }, pages);
  if (!isDir) folder.ext = name === '.html' && ext === '' ? name : ext;
  return folder;
};

const main = async (path, depth) => {
  // if (depth > 2) return;
  const files = await readDir(join(BASE, path), {
    withFileTypes: true,
  });
  return Promise.all(
    files.map((f) => {
      ensureEntry(path, f.name, f.isDirectory());
      if (f.isDirectory()) return main(join(path, f.name), depth + 1);
    })
  );
};

main(START, 0).then(() => console.log(JSON.stringify(pages, null, 2)));
