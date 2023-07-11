import { globby } from 'globby';
import { open, readFile, writeFile } from 'node:fs/promises';
import { ensureDir, readJson, copy } from 'fs-extra/esm';
import { join, dirname } from 'node:path';

import { __dirname, SRC_DIRS, DEST_DIRS } from './constants.mjs';
import { shouldUpdate, resolveVars, prepareTemplate } from './utils.mjs';

const template = await prepareTemplate('main');

const dataFiles = await globby(join(SRC_DIRS.JSON_FILES, '**/*.json'));

for (const dataFile of dataFiles) {
  const htmlFile = dataFile
    .replace(SRC_DIRS.JSON_FILES, DEST_DIRS.DEST)
    .replace('.json', '.html');
  const data = await readJson(dataFile);

  // console.log(dataFile, htmlFile);
  await ensureDir(dirname(htmlFile));
  await writeFile(htmlFile, resolveVars(template, 'post', data));
}

// Copy and merge styles
await ensureDir(DEST_DIRS.STYLES);

const destCSS = join(DEST_DIRS.STYLES, 'style.css');
const srcCSS = [
  join(SRC_DIRS.STYLES, 'minima.css'),
  // join(__dirname, 'node_modules/highlight.js/styles/github.css'),
  join(SRC_DIRS.STYLES, 'custom.css'),
];

if (await shouldUpdate(destCSS, ...srcCSS)) {
  console.log('updating styles');
  const outStyle = await open(join(DEST_DIRS.STYLES, 'style.css'), 'w');
  for (const src of srcCSS) {
    await outStyle.writeFile(await readFile(src));
  }
  await outStyle.close();
}

// Copy images
await ensureDir(DEST_DIRS.IMAGES);

const imgNames = await globby(`**/*.*`, {
  cwd: SRC_DIRS.IMAGES,
  deep: 5,
});

for (const img of imgNames) {
  const src = join(SRC_DIRS.IMAGES, img);
  const dest = join(DEST_DIRS.IMAGES, img);
  if (await shouldUpdate(dest, src)) {
    console.log('updating image', img);
    await copy(src, dest, { preserveTimestamps: true });
  }
}
