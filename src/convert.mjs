import { parse } from 'node-html-parser';
import { globby } from 'globby';
import { readFile, writeFile } from 'node:fs/promises';
import { ensureDir, outputJson } from 'fs-extra/esm';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const HOME = join(__dirname, '../html/');
const DEST_JSON = join(__dirname, '../json');
const DEST = join(__dirname, '../new');

export const sortDescending = (a, b) => {
  if (a < b) return 1;
  if (a > b) return -1;
  return 0;
};

const getMeta = (doc, property) =>
  doc.querySelector(`meta[property="${property}"]`)?.getAttribute('content');

const postType = (doc, entry) => {
  const catSlugRx = /\/categories(\/.*)/;

  // entry.author = doc
  //   .querySelector('meta[property="article:author"]')
  //   ?.getAttribute('content');
  entry.categories = doc
    .querySelectorAll('a.post-categories-list__link')
    .reduce(
      (cats, a) => ({
        ...cats,
        [basename(a.getAttribute('href'))]: a.innerHTML,
      }),
      {}
    );
  entry.tags = doc.querySelectorAll('a.blog-link-hashtag-color').reduce(
    (tags, a) => ({
      ...tags,
      [basename(a.getAttribute('href'))]: a.innerHTML,
    }),
    {}
  );

  entry.ogSite_name = getMeta(doc, 'og:site_name');
  entry.ogType = getMeta(doc, 'og:type');
  entry.content = doc
    .querySelectorAll('div.post-content__body :not(div)')
    .map((el) => el.removeAttribute('id').removeAttribute('class').outerHTML); //`<${el.tagName}>${el.innerHTML}</${el.tagName}>`);

  entry.author = getMeta(doc, 'article:author');
  entry.published_time = getMeta(doc, 'article:published_time');
  entry.modified_time = getMeta(doc, 'article:modified_time');

  entry.canonical = doc
    .querySelector('link[rel="canonical"]')
    .getAttribute('href');
};

const types = {
  'roxanacabut/single-post/': postType,
  'roxanacabut/post/': postType,
};
const files = await globby(join(__dirname, '../html/**/*.html'));
for (const file of files) {
  const name = file.replace(HOME, '').replace('.html', '').toLowerCase();
  console.log(name);
  const entry = { name };
  const doc = parse(await readFile(file));
  entry.title = doc.querySelector('title').innerHTML;
  entry.description = doc
    .querySelector('meta[name="description"]')
    ?.getAttribute('content');
  // entry.og = doc.querySelectorAll('meta[property^="og:"]').reduce(
  //   (ogs, el) => ({
  //     ...ogs,
  //     [el.getAttribute('property').replace('og:', '')]:
  //       el.getAttribute('content'),
  //   }),
  //   {}
  // );

  // entry.hooks = doc.querySelectorAll('[data-hook]').reduce((hks, el) => {
  //   const h = el.getAttribute('data-hook');
  //   if (h in hks) {
  //     if (!Array.isArray(hks[h])) hks[h] = [hks[h]];
  //     hks[h].push(el.textContent);
  //   } else {
  //     hks[h] = el.textContent;
  //   }
  //   return hks;
  // }, {});

  const fn = Object.keys(types)
    .sort(sortDescending)
    .find((type) => entry.name.startsWith(type));
  if (fn) types[fn](doc, entry);

  await outputJson(join(DEST_JSON, entry.name) + '.json', entry, { spaces: 2 });
}
