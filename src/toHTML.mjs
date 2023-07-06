import { parse } from 'node-html-parser';
import { globby } from 'globby';
import { readFile, writeFile } from 'node:fs/promises';
import { ensureDir, outputJson, emptyDir, readJson } from 'fs-extra/esm';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'url';
import { dir } from 'node:console';

const __dirname = dirname(fileURLToPath(import.meta.url));

const JSON_FILES = join(__dirname, '../json');
const DEST = join(__dirname, '../new');
const TEMPLATES = join(__dirname, 'templates');

export const resolveVars = (template, prefix, values) => {
  const rex = new RegExp(`{{\\s*${prefix}\\.(\\w+)\\s*}}`, 'g');
  return template.replaceAll(rex, (_, prop) => {
    if (prop in values) return values[prop] ?? '';
    console.error('??? resolving', prefix, 'var', prop);
    return '';
  });
};

const site = await readJson(join(TEMPLATES, 'site.json'), 'utf8');
site.updated = new Date().toISOString();

export const resolveSiteVars = (template) =>
  resolveVars(template, 'site', site);

const baseTemplate = resolveSiteVars(
  await readFile(join(TEMPLATES, 'base.tpl.html'), 'utf8')
);

const dataFiles = await globby(join(JSON_FILES, '**/*.json'));

for (const dataFile of dataFiles) {
  const htmlFile = dataFile.replace(JSON_FILES, DEST).replace('.json', '.html');
  const data = await readJson(dataFile);

  // console.log(dataFile, htmlFile);
  await ensureDir(dirname(htmlFile));
  await writeFile(htmlFile, resolveVars(baseTemplate, 'post', data));
}
