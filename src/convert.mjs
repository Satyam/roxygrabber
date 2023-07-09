import { parse } from 'node-html-parser';
import { globby } from 'globby';
import { readFile, writeFile, access, rm } from 'node:fs/promises';
import { outputJson, emptyDir, copy } from 'fs-extra/esm';
import { join, basename } from 'node:path';

import { __dirname, SRC_DIRS } from './constants.mjs';

const OLD_SITE = /^https:\/\/roxanacabut.wixsite.com\/roxanacabut/;
const OLD_IMGS = /^https:\/\/static.wixstatic.com\/media\/(.*\.jpg).*/;

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
        img.getAttribute('src').replace(OLD_IMGS, '/assets/img/$1')
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
      el.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
      if (el.tagName.toLowerCase() === 'img') cleanImgEl(el);
      el.querySelectorAll('img').forEach(cleanImgEl);

      return el
        .removeWhitespace()
        .removeAttribute('id')
        .removeAttribute('class').outerHTML;
    })
    .join('\n')
    .replace(OLD_SITE, '');
};

const getFullURL = (doc) =>
  doc
    .querySelector('link[rel="canonical"]')
    .getAttribute('href')
    .replace(OLD_SITE, '');

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

  entry.content = getContent(doc, 'div.post-content__body');

  entry.author = getMeta(doc, 'article:author');
  entry.published_time = getMeta(doc, 'article:published_time');
  entry.modified_time = getMeta(doc, 'article:modified_time');
};

const regularPage = (doc, entry) => {
  entry.content = getContent(doc, 'main');
};

const dateIndex = [];
const dateType = (doc, entry) => {
  entry.content = getContent(doc, 'main article');
  dateIndex.push(entry.name);
};

const authorIndex = [];
const authorType = (doc, entry) => {
  entry.content = getContent(doc, 'main');
  authorIndex.push({
    name: entry.name,
    author: doc.querySelector('main a')?.innerHTML,
  });
};

const categoriesIndex = [];
const categoryType = (doc, entry) => {
  entry.content = getContent(doc, 'main article');
  categoriesIndex.push({ category: entry.title, name: entry.name });
};
const tagsIndex = [];
const tagType = (doc, entry) => {
  entry.content = getContent(doc, 'main article');
  tagsIndex.push({
    tag: doc.querySelector('input').getAttribute('value'),
    name: entry.name,
  });
};

const types = {
  '/index': regularPage,
  '/single-post': postType,
  '/post': postType,
  '/blog/index': regularPage,
  '/blog-1/index': regularPage,
  '/blog/date': dateType,
  '/blog/author': authorType,
  '/blog/category': categoryType,
  '/blog/tag': tagType,
  '/blog/page': regularPage,
  '/acompanamiento-creativo': regularPage,
  '/agenda': regularPage,
  '/contacto': regularPage,
  '/escritos': regularPage,
  '/libro-la-corazon': regularPage,
  '/mas-informacion': regularPage,
  '/sesiones-individuales-de-masaje': regularPage,
  '/talleres-de-movimiento': regularPage,
  '/talleres-sobre-comunicacion': regularPage,
};

const images = {};

// // fix the missing index.html

// if (await access(`${SRC_DIRS.HTML_FILES}.html`)) {
//   console.log(
//     'copy',
//     `${SRC_DIRS.HTML_FILES}.html`,
//     join(SRC_DIRS.HTML_FILES, 'index.html')
//   );
//   // await copy(
//   //   `${SRC_DIRS.HTML_FILES}.html`,
//   //   join(SRC_DIRS.HTML_FILES, 'index.html')
//   // );
//   console.log(
//     'copy',
//     join(SRC_DIRS.HTML_FILES, 'blog.html'),
//     join(SRC_DIRS.HTML_FILES, 'blog/index.html')
//   );
//   // await copy(
//   //   join(SRC_DIRS.HTML_FILES, 'blog.html'),
//   //   join(SRC_DIRS.HTML_FILES, 'blog/index.html')
//   // );
//   console.log(
//     'copy',
//     join(SRC_DIRS.HTML_FILES, 'blog-1.html'),
//     join(SRC_DIRS.HTML_FILES, 'blog-1/index.html')
//   );
//   // await copy(
//   //   join(SRC_DIRS.HTML_FILES, 'blog-1.html'),
//   //   join(SRC_DIRS.HTML_FILES, 'blog-1/index.html')
//   // );
//   console.log('rm', join(SRC_DIRS.HTML_FILES, 'blog-1/.html'));
//   // await rm(join(SRC_DIRS.HTML_FILES, 'blog-1/.html'));
// }

await emptyDir(SRC_DIRS.JSON_FILES);
const files = await globby(join(__dirname, '../html/**/*.html'), { dot: true });
for (const file of files) {
  if (file === join(SRC_DIRS.HTML_FILES, 'blog-1/.html')) continue;
  let name = file
    .replace(SRC_DIRS.HTML_FILES, '')
    .replace('.html', '')
    .replaceAll(/\-+/g, '-')
    .toLowerCase();

  if (name === '') name = '/index';
  if (name === '/blog') name = '/blog/index';
  if (name === '/blog-1') name = '/blog-1/index';
  if (name.startsWith('/blog-1/search')) continue;
  if (name.startsWith('/blog-1/categories')) continue;
  if (
    file === `${SRC_DIRS.HTML_FILES}.html` ||
    file === join(SRC_DIRS.HTML_FILES, 'blog.html') ||
    file === join(SRC_DIRS.HTML_FILES, 'blog-1.html') ||
    file === join(SRC_DIRS.HTML_FILES, 'blog-1/.html')
  ) {
    console.error(file, name);
  }
  console.log(name);
  const entry = { name };
  const doc = parse(await readFile(file));

  // Common data
  entry.title = doc.querySelector('title').innerHTML.split('|')[0];
  entry.description = doc
    .querySelector('meta[name="description"]')
    ?.getAttribute('content');
  entry.ogSite_name = getMeta(doc, 'og:site_name');
  entry.ogType = getMeta(doc, 'og:type');
  entry.fullURL = getFullURL(doc);

  doc.querySelectorAll('img').forEach((imgEl) => {
    const src = imgEl.getAttribute('src');
    // if (!images[src]) {
    //   images[src] = [];
    // }
    // images[src].push(imgEl.attributes);
    if (!images[src]) images[src] = 0;
    images[src]++;
  });

  // Not needed, for the time being
  // entry.menu = doc.querySelectorAll('nav a').reduce(
  //   (menu, aEl) => ({
  //     ...menu,
  //     [aEl.getAttribute('href')?.replace(OLD_SITE, '')]:
  //       aEl.removeWhitespace().textContent,
  //   }),
  //   {}
  // );
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
  if (fn) {
    types[fn](doc, entry);
    await outputJson(join(SRC_DIRS.JSON_FILES, entry.name) + '.json', entry, {
      spaces: 2,
    });
  } else console.log('-- no type', entry.name);
}

// Not needed for the time being.
// await outputJson(join(__dirname, 'images.json'), images, { spaces: 2 });
// await writeFile(
//   join(__dirname, 'images.html'),
//   Object.keys(images)
//     .map((imgSrc) => `<img src="${imgSrc.replace(/^(.*\.jpg).*/, '$1')}" />`)
//     .join('\n')
// );
