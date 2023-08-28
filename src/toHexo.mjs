import { globby } from 'globby';
import { stringify } from 'yaml';
import { open, readFile, writeFile } from 'node:fs/promises';
import { ensureDir, readJson, copy } from 'fs-extra/esm';
import { join, dirname } from 'node:path';
import { shouldUpdate } from './utils.mjs';

import { __dirname, SRC_DIRS, DEST_DIRS } from './constants.mjs';
import { emptyDir } from 'fs-extra';
import { parse } from 'node-html-parser';
const dataFiles = await globby(join(SRC_DIRS.JSON_FILES, '**/*.json'));

const HEXO = join(__dirname, '../hexo');

const specs = {};

const invalidStyles = [
  'margin-left',
  'text-shadow',
  'font-family',
  'color',
  'letter-spacing',
  'line-height',
  'background-color',
];
function clean(content, name) {
  const data = parse(
    content
      .replaceAll('<span></span>', '')
      .replaceAll('<span></span>', '')
      .replaceAll('<p></p>', '')
  );

  for (const el of data.querySelectorAll('img')) {
    el.setAttribute(
      'src',
      el
        .getAttribute('src')
        .replace(/^\/assets\/img/, '/roxanacabut/assets/img')
    );
  }
  for (const el of data.querySelectorAll('[style]')) {
    const style = el
      .getAttribute('style')
      .replaceAll('\\n', ' ')
      .replaceAll(/\s+/g, ' ')
      .trim();
    const newStyle = [];
    style.split(';').forEach((spec) => {
      if (spec.trim() === '') return;
      const [prop, value] = spec.split(':').map((p) => p.trim());
      if (!invalidStyles.includes(prop)) {
        newStyle.push(`${prop}:${value}`);
      }
    });
    if (newStyle.length) {
      el.setAttribute('style', newStyle.join(';'));
    } else {
      el.removeAttribute('style');
    }
  }
  for (const el of data.querySelectorAll('span:empty')) {
    el.remove();
  }

  for (let changed = true; changed; ) {
    changed = false;
    for (const el of data.querySelectorAll('span')) {
      if (Object.keys(el.attributes).length === 0) {
        if (
          typeof el.firstChild.tagName === 'undefined' &&
          typeof el.firstChild.nextSibling === 'undefined'
        ) {
          el.replaceWith(el.innerText);
          changed = true;
        }
        if (
          el.firstChild.tagName === 'SPAN' &&
          el.firstChild.nextSibling === null
        ) {
          el.replaceWith(el.firstChild.outerHTML);
          changed = true;
        }
      }
    }
  }
  for (const el of data.querySelectorAll('[style]')) {
    const style = el
      .getAttribute('style')
      .replaceAll('\\n', ' ')
      .replaceAll(/\s+/g, ' ')
      .trim();
    style.split(';').forEach((spec) => {
      const [prop, value] = spec.split(':').map((p) => p.trim());
      if (!(prop in specs)) {
        specs[prop] = {};
      }
      if (!(value in specs[prop])) {
        specs[prop][value] = 1;
      } else {
        specs[prop][value] += 1;
      }
    });
  }
  return data.innerHTML;
}
await emptyDir(join(HEXO, 'source'));
await ensureDir(join(HEXO, 'source', '_posts'));
for (const dataFile of dataFiles) {
  const data = await readJson(dataFile);

  const { name, content } = data;
  if (!name || name.startsWith('/blog')) continue;

  const cleanedContent = clean(content, name);

  console.log(name);

  if (name.startsWith('/single-post')) {
    // "/single-post/2016/09/03/el-libro-del-desasosiego-extracto",
    const destFile =
      join(
        HEXO,
        'source',
        '_posts',
        name.replace('/single-post/', '').replaceAll('/', '-')
      ) + '.md';

    await writeFile(
      destFile,
      `---
${stringify({
  layout: 'post',
  title: data.title,
  date: data.published_time,
  updated: data.modified_time,
  tags: Object.values(data.tags),
  categories: Object.values(data.categories),
  author: data.author ?? 'Roxana Cabut',
  excerpt: data.description?.replaceAll('\n', ' '),
})}
---
${cleanedContent}`
    );

    continue;
  }
  const destFile = join(HEXO, 'source', name) + '.md';
  await writeFile(
    destFile,
    `---
${stringify({
  layout: 'page',
  title: data.title,
  date: data.published_time,
  updated: data.modified_time,
})}
---
${cleanedContent}
   `
  );
  // console.log(name, destFile);
}

// Copy images
const DEST_IMAGES = join(HEXO, 'source/assets/img');
await ensureDir(DEST_IMAGES);

const imgNames = await globby(`**/*.*`, {
  cwd: SRC_DIRS.IMAGES,
  deep: 5,
});

for (const img of imgNames) {
  const src = join(SRC_DIRS.IMAGES, img);
  const dest = join(DEST_IMAGES, img);
  if (await shouldUpdate(dest, src)) {
    console.log('updating image', img);
    await copy(src, dest, { preserveTimestamps: true });
  }
}
