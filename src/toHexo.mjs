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
    name.startsWith('/single-post')
  )
    continue;

  if (name.startsWith('/post')) {
    // "/single-post/2016/09/03/el-libro-del-desasosiego-extracto",
    const destFile =
      join(
        HEXO,
        'source',
        '_posts',
        name.replace('/post/', '').replaceAll('/', '-')
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

writeFile(
  join(HEXO, '_config.landscape.yml'),
  stringify({
    menu: {
      Home: '/',
      'Mis propuestas': {
        'Sesiones Individuales': '/acompanamiento-creativo',
        'Sesiones Grupales: "Escuchándonos"': '/talleres-sobre-comunicacion',
        'Talleres de Movimiento Expresivo': '/talleres-de-movimiento',
        'Sesiones de Masaje': '/sesiones-individuales-de-masaje',
      },
      'Libro: "la corazón"': '/libro-la-corazon',
      Agenda: '/agenda',
      'Más información': {
        Trayectoria: '/mas-informacion',
        'Movimiento y conciencia corporal': '/copia-de-conciencia-corporal',
        'Sistema Río Abierto': '/sistema-rio-abierto',
      },
      Escritos: {
        'Recordar quiénes somos': '/recordar-quienes-somos',
        'Había una vez ...': '/habia-una-vez',
        'Pensar y sentir': '/pensar-y-sentir',
      },
      Contacto: '/contacto',
    },
    fancybox: false,
  })
);

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
