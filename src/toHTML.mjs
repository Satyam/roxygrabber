import { globby } from 'globby';
import { open, readFile, writeFile, stat } from 'node:fs/promises';
import { ensureDir, readJson, copy } from 'fs-extra/esm';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SRC_DIRS = {
  JSON_FILES: join(__dirname, '../json'),
  TEMPLATES: join(__dirname, 'templates'),
  STYLES: join(__dirname, 'styles'),
  IMAGES: join(__dirname, '../images'),
};

const destDir = join(__dirname, '../new');
const DEST_DIRS = {
  DEST: destDir,
  STYLES: join(destDir, 'assets/css'),
  IMAGES: join(destDir, 'assets/img'),
};

const lastMod = async (file) => {
  try {
    const fstat = await stat(file);
    return Math.floor(fstat.mtimeMs / 1000);
  } catch (err) {
    return 0;
  }
};

const shouldUpdate = async (dest, ...srcs) => {
  const destMod = await lastMod(dest);
  if (destMod === 0) return true;
  for (const src of srcs) {
    if (destMod < (await lastMod(src))) return true;
  }
  return false;
};

export const resolveVars = (template, prefix, values) => {
  const rex = new RegExp(`{{\\s*${prefix}\\.(\\w+)\\s*}}`, 'g');
  return template.replaceAll(rex, (_, prop) => {
    if (prop in values) return values[prop] ?? '';
    console.error('??? resolving', prefix, 'var', prop);
    return '';
  });
};

const site = await readJson(join(SRC_DIRS.TEMPLATES, 'site.json'), 'utf8');
site.updated = new Date().toISOString();

export const resolveSiteVars = (template) =>
  resolveVars(template, 'site', site);

const baseTemplate = resolveSiteVars(
  await readFile(join(SRC_DIRS.TEMPLATES, 'base.tpl.html'), 'utf8')
);

const dataFiles = await globby(join(SRC_DIRS.JSON_FILES, '**/*.json'));

for (const dataFile of dataFiles) {
  const htmlFile = dataFile
    .replace(SRC_DIRS.JSON_FILES, DEST_DIRS.DEST)
    .replace('.json', '.html');
  const data = await readJson(dataFile);

  // console.log(dataFile, htmlFile);
  await ensureDir(dirname(htmlFile));
  await writeFile(htmlFile, resolveVars(baseTemplate, 'post', data));
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
