import { globby } from 'globby';
import { stringify } from 'yaml';
import { open, readFile, writeFile } from 'node:fs/promises';
import { ensureDir, readJson, copy } from 'fs-extra/esm';
import { join, dirname } from 'node:path';
import { shouldUpdate } from './utils.mjs';

import { __dirname, SRC_DIRS, DEST_DIRS } from './constants.mjs';
import { emptyDir } from 'fs-extra';

const dataFiles = await globby(join(SRC_DIRS.JSON_FILES, '**/*.json'));

const HEXO = join(__dirname, '../hexo');

await emptyDir(join(HEXO, 'source'));
await ensureDir(join(HEXO, 'source', '_posts'));
for (const dataFile of dataFiles) {
  const data = await readJson(dataFile);

  const { name } = data;
  console.log(name);
  if (
    !name ||
    name.startsWith('/blog') ||
    name.startsWith('/blog-1') ||
    name.startsWith('/post')
  )
    continue;

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
${data.content}`
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
${data.content}
   `
  );
  console.log(name, destFile);
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
