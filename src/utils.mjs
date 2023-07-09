import { parse as htmlParse } from 'node-html-parser';
import { site, SRC_DIRS } from './constants.mjs';
import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

export const lastMod = async (file) => {
  try {
    const fstat = await stat(file);
    return Math.floor(fstat.mtimeMs / 1000);
  } catch (err) {
    return 0;
  }
};

export const shouldUpdate = async (dest, ...srcs) => {
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

export const resolveSiteVars = (template) =>
  resolveVars(template, 'site', site);

export const readSrcFile = (base, file) => readFile(join(base, file), 'utf8');

const baseTemplate = resolveSiteVars(
  await readSrcFile(SRC_DIRS.TEMPLATES, 'base.tpl.html')
);

export const prepareTemplate = async (tpl) => {
  const template = await readSrcFile(SRC_DIRS.TEMPLATES, `${tpl}.tpl.html`);
  const values = {};
  htmlParse(template)
    .querySelectorAll('template')
    .forEach((t) => (values[t.id] = t.innerHTML));
  return resolveSiteVars(resolveVars(baseTemplate, 'template', values));
};
