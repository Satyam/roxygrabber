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
  '/post/': (doc, entry, dataHooks) => {
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
    entry.categories = categories.map((cat) => cat.textContent);

    const dates = doc.querySelectorAll('[data-hook="time-ago"]');
    if (dates.length > 1) console.error('dates in post', dates.length);
    if (dates.length === 0) console.error('no dates section', entry.name);
    entry.dates = dates.map((date) => date.textContent);

    // dataHooks.forEach((el) => {
    //   const h = el.getAttribute('data-hook');
    //   if (h.startsWith('post-')) {
    //     entry.hooks[h] = el.textContent;
    //   }
    // });
  },
  '???/blog/category/': (doc, entry, dataHooks) => {
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
  roxana: (doc, entry, dataHooks) => {
    dataHooks.forEach((el) => {
      const h = el.getAttribute('data-hook');
      if (h in entry.hooks) {
        if (!Array.isArray(entry.hooks[h])) entry.hooks[h] = [entry.hooks[h]];
        entry.hooks[h].push(el.textContent);
      } else {
        entry.hooks[h] = el.textContent;
      }
    });
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

    const dataHooks = doc.querySelectorAll('[data-hook]');
    if (dataHooks.length) {
      entry.hooks = {};
      const fn = Object.keys(types).find((type) => entry.name.includes(type));
      if (fn) return types[fn](doc, entry, dataHooks);

      //   if (!(h in hooks)) hooks[h] = {};
      //   if (!(entry.name in hooks[h])) hooks[h][entry.name] = 0;
      //   hooks[h][entry.name]++;
      //   console.log('???', el.getAttribute('data-hook'));
    }
    const ogs = doc.querySelectorAll('meta[property^="og:"]');
    if (ogs.length) {
      entry.og = {};
      ogs.forEach((og) => {
        entry.og[
          og.getAttribute('property').replace('og:', '')
        ] = og.getAttribute('content');
        // console.log(
        //   '#  ',
        //   og.getAttribute('property'),
        //   og.getAttribute('content')
        // );
      });
    }
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
  async () => await outputJson('./site.json', pages, { spaces: '\t' })
);
