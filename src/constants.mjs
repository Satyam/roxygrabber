import { join, dirname } from 'node:path';
import { fileURLToPath } from 'url';
import { readJson } from 'fs-extra/esm';

export const __dirname = dirname(fileURLToPath(import.meta.url));

export const SRC_DIRS = {
  HTML_FILES: join(__dirname, '../html/roxanacabut'),
  JSON_FILES: join(__dirname, '../json'),
  TEMPLATES: join(__dirname, 'templates'),
  STYLES: join(__dirname, 'styles'),
  IMAGES: join(__dirname, '../images'),
};

const destDir = join(__dirname, '../new');
export const DEST_DIRS = {
  DEST: destDir,
  STYLES: join(destDir, 'assets/css'),
  IMAGES: join(destDir, 'assets/img'),
};

export const site = await readJson(
  join(SRC_DIRS.TEMPLATES, 'site.json'),
  'utf8'
);
site.updated = new Date().toISOString();
