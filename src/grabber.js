const puppeteer = require('puppeteer-core');
const { outputFile } = require('fs-extra');
const { join } = require('path');

const base = 'https://roxanacabut.wixsite.com/';
const lista = {
  '/roxanacabut': false,
};

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
        const links = await page.$$eval('a[href*="roxanacabut"]', (anchors) =>
          anchors.map((a) => a.getAttribute('href'))
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
  await browser.close();
};
go();
