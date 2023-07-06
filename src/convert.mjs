import { parse } from 'node-html-parser';
import { globby } from 'globby';
import { readFile, writeFile } from 'node:fs/promises';
import { ensureDir, outputJson, emptyDir } from 'fs-extra/esm';
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

const cleanImgEl = (img) => {
  Object.keys(img.attributes).forEach((attr) => {
    if (attr === 'src') {
      img.setAttribute(
        'src',
        img
          .getAttribute('src')
          .replace(
            /^https:\/\/static.wixstatic.com\/media\/(.*\.jpg).*/,
            '/assets/img/$1'
          )
      );
    } else {
      img.removeAttribute(attr);
    }
  });
};
const getContent = (doc, container) => {
  const els = doc.querySelectorAll(`${container} :not(div, wix-image, style)`);
  return els
    .filter((el) => !els.includes(el.parentNode))
    .map((el) => {
      el.querySelectorAll('[class]').forEach((el) =>
        el.removeAttribute('class')
      );
      if (el.tagName.toLowerCase() === 'img') cleanImgEl(el);
      el.querySelectorAll('img').forEach(cleanImgEl);

      return el
        .removeWhitespace()
        .removeAttribute('id')
        .removeAttribute('class')
        .outerHTML.replace('https://roxanacabut.wixsite.com/roxanacabut', '');
    });
};
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
  entry.content = getContent(doc, 'div.post-content__body');

  entry.author = getMeta(doc, 'article:author');
  entry.published_time = getMeta(doc, 'article:published_time');
  entry.modified_time = getMeta(doc, 'article:modified_time');

  entry.canonical = doc
    .querySelector('link[rel="canonical"]')
    .getAttribute('href');
};

const regularPage = (doc, entry) => {
  entry.content = getContent(doc, 'main');

  entry.ogSite_name = getMeta(doc, 'og:site_name');
  entry.ogType = getMeta(doc, 'og:type');
  entry.canonical = doc
    .querySelector('link[rel="canonical"]')
    .getAttribute('href');
};
const types = {
  'roxanacabut/single-post/': postType,
  'roxanacabut/post/': postType,
  'roxanacabut/acompanamiento-creativo': regularPage,
  'roxanacabut/agenda': regularPage,
  'roxanacabut/contacto': regularPage,
  'roxanacabut/escritos': regularPage,
  'roxanacabut/libro-la-corazon': regularPage,
  'roxanacabut/mas-informacion': regularPage,
  'roxanacabut/sessiones-individuales-de-masaje': regularPage,
  'roxanacabut/talleres-de-movimiento': regularPage,
  'roxanacabut/talleres-sobre-comunicacion': regularPage,
};

const images = {};

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

  doc.querySelectorAll('img').forEach((imgEl) => {
    const src = imgEl.getAttribute('src');
    // if (!images[src]) {
    //   images[src] = [];
    // }
    // images[src].push(imgEl.attributes);
    if (!images[src]) images[src] = 0;
    images[src]++;
  });

  entry.menu = doc.querySelectorAll('nav a').reduce(
    (menu, aEl) => ({
      ...menu,
      [aEl
        .getAttribute('href')
        ?.replace('https://roxanacabut.wixsite.com/roxanacabut', '')]:
        aEl.removeWhitespace().textContent,
    }),
    {}
  );
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

await outputJson(join(__dirname, 'images.json'), images, { spaces: 2 });
await writeFile(
  join(__dirname, 'images.html'),
  Object.keys(images)
    .map((imgSrc) => `<img src="${imgSrc.replace(/^(.*\.jpg).*/, '$1')}" />`)
    .join('\n')
);
