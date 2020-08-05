const puppeteer = require('puppeteer-core');
const { ensureFile, outputFile } = require('fs-extra');
const { join } = require('path');
const { getHeapCodeStatistics } = require('v8');

const base = 'https://roxanacabut.wixsite.com/';
const lista = {
  '/roxanacabut': false,
};
const postRx = /post\/(\d+)\/(\d+)\/(\d+)\/(.+)/;
const singlePostRx = /single-post\/(\d+)\/(\d+)\/(\d+)\/(.+)/;

const posts = {};
const singlePosts = {};
const splitSinglePosts = async (page, _, y, m, d, file) => {
  const title = await page.$$eval('h1', (items) => {
    debugger;
    return items.map((a) => a.innerText);
  });
  const article = await page.$$eval(
    'div[data-hook=post-description]',
    (items) => {
      debugger;
      return items.map((a) => a.innerText);
    }
  );
  const categories = await page.$$eval(
    'div[data-hook=category-label-list__item]',
    (items) => {
      debugger;
      return items.map((a) => a.innerText);
    }
  );
  if (!(y in posts)) posts[y] = {};
  if (!(m in posts[y])) posts[y][m] = {};
  if (!(d in posts[y][m])) posts[y][m][d] = {};
  if (!(file in posts[y][m][d]))
    posts[y][m][d][file] = {
      title,
      article,
      categories,
    };
};
const splitPost = async (page, _, y, m, d, file) => {
  const title = await page.$$eval('div[data-hook=post-title]', (items) => {
    debugger;
    return items.map((a) => a.innerText);
  });
  const article = await page.$$eval(
    'div[data-hook=post-description]',
    (items) => {
      debugger;
      return items.map((a) => a.innerText);
    }
  );
  const categories = await page.$$eval(
    'div[data-hook=category-label-list__item]',
    (items) => {
      debugger;
      return items.map((a) => a.innerText);
    }
  );
  if (!(y in posts)) posts[y] = {};
  if (!(m in posts[y])) posts[y][m] = {};
  if (!(d in posts[y][m])) posts[y][m][d] = {};
  if (!(file in posts[y][m][d]))
    posts[y][m][d][file] = {
      title,
      article,
      categories,
    };
};
// pptr.dev
// https://developer.mozilla.org/en-US/docs/Learn/CSS/Building_blocks/Selectors/Attribute_selectors

const go = async () => {
  const browser = await puppeteer.launch({
    product: 'chrome',
    executablePath: '/usr/bin/google-chrome',
    ignoreDefaultArgs: ['--disable-extensions'],
  });
  const page = await browser.newPage();
  let more = true;
  while (more) {
    more = false;

    for (const p in lista) {
      if (!lista[p]) {
        lista[p] = true;
        const url = new URL(p, base);
        console.log(url.href);
        await page.goto(url.href, { waitUntil: 'networkidle0' });
        // await page.screenshot({ path: 'example.png' });
        // const m = postRx.exec(p);
        // if (m) {
        //   splitPost(page, ...m);
        // }

        // const sp = singlePostRx.exec(p);
        // if (sp) {
        //   splitSinglePost(page, ...sp);
        // }

        // pdf generation
        // const path = join(__dirname, '../pdf', decodeURIComponent(p)) + '.pdf';
        // console.log(path);
        // await ensureFile(path);
        // await page.pdf({ path, format: 'A4' });

        // html generation
        await outputFile(
          join(__dirname, '../html', decodeURIComponent(p)) + '.html',
          await page.content()
        );
        const links = await page.$$eval(
          'a[href*="roxanacabut"]',
          // (anchors) =>
          //   console.log(anchors)
          // );
          (anchors) => anchors.map((a) => a.getAttribute('href'))
        );
        links.forEach((l) => {
          const u = new URL(l, base);
          const s = u.pathname;
          if (lista[s]) return;
          lista[s] = false;
          more = true;
        });
      }
    }
  }
  console.log(JSON.stringify(posts, null, 2));
  await browser.close();
};
go();
