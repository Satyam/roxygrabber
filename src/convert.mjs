import { parse } from 'node-html-parser';
import { globby } from 'globby';
import { readFile, writeFile, access, rm } from 'node:fs/promises';
import { outputJson, emptyDir, copy } from 'fs-extra/esm';
import { join, basename } from 'node:path';

import { __dirname, SRC_DIRS } from './constants.mjs';

const OLD_SITE = /https:\/\/roxanacabut.wixsite.com\/roxanacabut/g;
const OLD_IMGS = /https:\/\/static.wixstatic.com\/media\/(.*?\.jpg).*/g;

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
  const els = doc.querySelectorAll(
    `${container} :not(div,wow-image , style, section)`
  );
  return els
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
    .filter(
      (s, index, a) =>
        !a.some((subS, subIndex) => index !== subIndex && subS.includes(s))
    )
    .join('\n')
    .replaceAll(OLD_SITE, '')
    .replaceAll(OLD_IMGS, '/assets/img/$1');
};

const getFullURL = (doc) =>
  doc
    .querySelector('link[rel="canonical"]')
    .getAttribute('href')
    .replaceAll(OLD_SITE, '');

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
  entry.tags = doc
    .querySelectorAll('#post-footer nav[aria-label="tags"] a')
    .reduce(
      (tags, a) => ({
        ...tags,
        [basename(a.getAttribute('href'))]: a.text,
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
    author: doc.querySelector('main a')?.text,
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
  tagsIndex.push(entry.title);
  // tagsIndex.push({
  //   tag: doc.querySelector('input').getAttribute('value'),
  //   name: entry.name,
  // });
};

const types = {
  '/index': regularPage,
  '/single-post': postType,
  // '/post': postType,
  '/blog/index': regularPage,
  // '/blog-1/index': regularPage,
  // '/blog/date': dateType,
  '/blog/archive': dateType,
  // '/blog/author': authorType,
  // '/blog/category': categoryType,
  '/blog/categories': categoryType,
  '/blog/tags': tagType,
  '/blog/page': regularPage,
  '/acompanamiento-creativo': regularPage,
  '/agenda': regularPage,
  '/conciencia': regularPage,
  '/contacto': regularPage,
  '/copia-de-conciencia-corporal': regularPage,
  '/escritos': regularPage,
  '/habia-una-vez': regularPage,
  '/libro-la-corazon': regularPage,
  '/mas-informacion': regularPage,
  '/pensar-y-sentir': regularPage,
  '/recordar-quienes-somos': regularPage,
  '/sesiones-individuales-de-masaje': regularPage,
  '/sistema-rio-abierto': regularPage,
  '/talleres-de-movimiento': regularPage,
  '/talleres-sobre-comunicacion': regularPage,
  '/trayectoria': regularPage,
};

const images = {};

await emptyDir(SRC_DIRS.JSON_FILES);
const files = await globby(join(__dirname, '../html/**/*.html'), { dot: true });
for (const file of files) {
  let name = file
    .replace(SRC_DIRS.HTML_FILES, '')
    .replace('.html', '')
    .replaceAll(/\-+/g, '-')
    .toLowerCase();

  if (['/blog/index'].includes(name)) continue;
  if (
    [
      '',
      '/blog',
      '/blog/categories/cuento',
      '/blog/categories/fragmentos-de-textos',
      '/blog/categories/frases',
      '/blog/categories/poemas',
      '/blog/tags/autoconocimiento',
      '/blog/tags/despertar',
    ].includes(name)
  ) {
    name += '/index';
  }
  console.log(name);
  const entry = { name };
  const doc = parse(await readFile(file));

  if (!doc.querySelector('head').innerHTML?.length) {
    console.error('---empty', name);
    continue;
  }
  // Common data
  entry.title = doc.querySelector('title').innerHTML.split('|')[0].trim();
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

// Various index.html files:

await outputJson(
  join(SRC_DIRS.JSON_FILES, 'blog/archive/index.json'),
  {
    title: 'Por Fechas',
    content: `<ul>${dateIndex
      .map(
        (date) => `<li><a href="${date}">${date.replace('/blog/date/', '')}</a>`
      )
      .join('\n')
      .replaceAll(OLD_SITE, '')}</ul>`,
  },
  {
    spaces: 2,
  }
);
await outputJson(
  join(SRC_DIRS.JSON_FILES, 'blog/author/index.json'),
  {
    title: 'Autores',
    content: `<ul>${dateIndex
      .map((date) => `<li><a href="${date.name}">${date.author}</a>`)
      .join('\n')
      .replaceAll(OLD_SITE, '')}</ul>`,
  },
  {
    spaces: 2,
  }
);

await outputJson(
  join(SRC_DIRS.JSON_FILES, 'blog/categories/index.json'),
  {
    title: 'Categorías',
    content: `<ul>${categoriesIndex
      .map((cat) => `<li><a href="${cat.name}">${cat.category}</li>`)
      .join('\n')
      .replaceAll(OLD_SITE, '')}</ul>`,
  },
  {
    spaces: 2,
  }
);
await outputJson(
  join(SRC_DIRS.JSON_FILES, 'blog/tags/index.json'),
  {
    title: 'Etiquetas',
    content: `<ul>${tagsIndex
      .map((tag) => `<li><a href="${tag.name}">${tag.tag}</li>`)
      .join('\n')
      .replaceAll(OLD_SITE, '')}</ul>`,
  },
  {
    spaces: 2,
  }
);

// Not needed for the time being.
// await outputJson(join(__dirname, 'images.json'), images, { spaces: 2 });
// await writeFile(
//   join(__dirname, 'images.html'),
//   Object.keys(images)
//     .map((imgSrc) => `<img src="${imgSrc.replace(/^(.*\.jpg).*/, '$1')}" />`)
//     .join('\n')
// );
