import jsdom from 'jsdom';
const { JSDOM } = jsdom;
import Q from 'better-queue';
import { readdir as readDir } from 'fs/promises';
import { join, sep, parse as parsePath, resolve } from 'path';
import pkg from 'fs-extra';
const { outputJson } = pkg;

const pages = {};
const hooks = {};
const BASE = resolve(process.cwd(), './html');
const START = '';

const singlePostRx =
  /single-post\/(?<year>\d+)\/(?<month>\d+)\/(?<day>\d+)\/(?<slug>.+)/;

const ensureEntry = (path, entryName, isDir) => {
  const { dir, name, ext } = parsePath(join(path, entryName));
  // console.log({ dir, name, ext });

  const parts = dir.length ? dir.split(sep) : [];
  if (isDir) parts.push(entryName);
  else {
    parts.push(
      (path === START && name === 'roxanacabut') ||
        (name === '.html' && ext === '')
        ? 'index'
        : name
    );
  }
  let fresh = false;
  const folder = parts.reduce((p, part) => {
    if (!p[part]) {
      p[part] = {};
      fresh = true;
    }
    return p[part];
  }, pages);
  if (fresh && !isDir) {
    folder.ext = name === '.html' && ext === '' ? name : ext;
    folder.name = join(path, entryName);
  }

  return folder;
};

const types = {
  '/post/': (doc, entry) => {
    const articles = doc.querySelectorAll('article');
    if (articles.length > 1) console.error('articles in post', articles.length);
    if (articles.length === 0) console.error('no article section', entry.name);
    articles.forEach((article, index) => {
      entry.articles = [];
      entry.articles[index] = article.querySelectorAll('p').textContent;
    });
    const titles = doc.querySelectorAll('[data-hook="post-title"]');
    if (titles.length > 1) console.error('titles in post', titles.length);
    if (titles.length === 0) console.error('no titles section', entry.name);
    entry.titles = [];
    titles.forEach((title, index) => {
      entry.titles[index] = [];
      entry.titles[index] = title.querySelectorAll('p').textContent;
    });
    const categories = doc.querySelectorAll(
      '[data-hook="category-label-list__item"]'
    );
    entry.categories = categories ?? categories.map((cat) => cat.textContent);

    const dates = doc.querySelectorAll('[data-hook="time-ago"]');
    if (dates.length > 1) console.error('dates in post', dates.length);
    if (dates.length === 0) {
      console.error('no dates section', entry.name);
    } else {
      entry.dates = Array.from(dates).map((date) => date.textContent);
    }
    // dataHooks.forEach((el) => {
    //   const h = el.getAttribute('data-hook');
    //   if (h.startsWith('post-')) {
    //     entry.hooks[h] = el.textContent;
    //   }
    // });
  },
  '???/blog/category/': (doc, entry) => {
    // const titles = doc.querySelectorAll('[data-hook="post-title"]')
    // const descr = doc.querySelectorAll('[data-hook="post-description"]')
    const containers = doc.querySelectorAll('[data-hook="post-list-item"]');
    if (containers.length) {
      containers.forEach((container) => {
        const titles = container.querySelectorAll('[data-hook="post-title"]');
        const descr = container.querySelectorAll(
          '[data-hook="post-description"]'
        );
        const author = container.querySelectorAll('[data-hook="user-name"]');
        const date = container.querySelectorAll('[data-hook="time-ago"]');
        console.log({ titles, descr, author, date });
      });
    }
  },
  '/single-post/': (doc, entry, dataHooks) => {
    const catSlugRx = /\/categories\/(.*)/;
    entry.categories = Array.from(
      doc.querySelectorAll('a.post-categories-list__link')
    ).reduce(
      (cats, a) => ({
        ...cats,
        [a.getAttribute('href').replace(catSlugRx, '$1')]: a.innerHTML,
      }),
      {}
    );
    entry.content = Array.from(
      doc.querySelectorAll('div.post-content__body :not(div)')
    ).map((el) => el.outerHTML);
  },
};

const analyze = async (entry) => {
  if (entry.name) {
    const dom = await JSDOM.fromFile(join(BASE, entry.name));
    const doc = dom.window.document;
    console.log('+', entry.name);
    // const links = doc.querySelectorAll('a[href*="roxanacabut"]');
    // links.forEach((link) => {
    //   console.log('-  ', link.getAttribute('href'));
    //   console.log('-- ', link.textContent);
    // });
    entry.title = doc.querySelector('title').innerHTML;
    entry.description = doc
      .querySelector('meta[name="description"]')
      ?.getAttribute('content');

    entry.og = Array.from(doc.querySelectorAll('meta[property^="og:"]')).reduce(
      (ogs, el) => ({
        ...ogs,
        [el.getAttribute('property').replace('og:', '')]:
          el.getAttribute('content'),
      }),
      {}
    );

    entry.hooks = Array.from(doc.querySelectorAll('[data-hook]')).reduce(
      (hks, el) => {
        const h = el.getAttribute('data-hook');
        if (h in hks) {
          if (!Array.isArray(hks[h])) hks[h] = [hks[h]];
          hks[h].push(el.textContent);
        } else {
          hks[h] = el.textContent;
        }
        return hks;
      },
      {}
    );
    const fn = Object.keys(types).find((type) => entry.name.includes(type));
    if (fn) types[fn](doc, entry);

    //   if (!(h in hooks)) hooks[h] = {};
    //   if (!(entry.name in hooks[h])) hooks[h][entry.name] = 0;
    //   hooks[h][entry.name]++;
    //   console.log('???', el.getAttribute('data-hook'));
    // }
    // } else {
    //   return Promise.all(
    //     Object.keys(entry).map(async (folder) => analyze(entry[folder]))
    //   );
  }
};

const main = async ({ path, depth }) => {
  // if (depth > 2) return;
  // console.log({ path, depth });
  const files = await readDir(join(BASE, path), {
    withFileTypes: true,
  });
  return Promise.all(
    files.map(async (f) => {
      const entry = ensureEntry(path, f.name, f.isDirectory());
      if (f.isDirectory()) {
        q.push({ path: join(path, f.name), depth: depth + 1 });
      } else return analyze(entry);
    })
  );
};

var q = new Q(function (args, cb) {
  main(args);
  cb(null);
});
q.push({ path: START, depth: 0 });
// q.on('drain', () => console.log('###', JSON.stringify(pages, null, 2)));
q.on(
  'drain',
  async () => await outputJson('./site1.json', pages, { spaces: '\t' })
);
